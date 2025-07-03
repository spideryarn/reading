'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChatService } from '@/lib/services/database/chat';
import { validateUserMessage } from '@/lib/utils/chat-validation';
import { CHAT_VALIDATION_CONFIG } from '@/lib/config';
import type { Tables } from '@/lib/types/database-auto-generated';
import type { ChatStore, SendMessageRequest, ChatApiResponse } from '@/lib/types/chat-api';

interface UseChatStoreProps {
  documentId: string;
  documentContext: string;
  conversationId?: string;
  onThreadDeleted?: () => void;
  autoloadExisting?: boolean; // default true – when false, skip loading most recent thread on mount
}

interface UseChatStoreReturn extends ChatStore {
  threadId: string | null;
  error: string | null;
  deleteThread: () => Promise<void>;
  refreshFromDatabase: () => Promise<void>;
}

type ChatThread = Tables<'chat_threads'>;
type ChatMessage = Tables<'chat_messages'>;

/**
 * Database-first chat store with single source of truth approach:
 * - All messages come from database
 * - API calls return complete thread + message state
 * - No optimistic updates, loading states provide feedback
 * - Designed for use with useExternalStoreRuntime
 */
export function useChatStore({ 
  documentId, 
  documentContext,
  conversationId,
  onThreadDeleted,
  autoloadExisting = true
}: UseChatStoreProps): UseChatStoreReturn {
  
  // Core state - matches ChatStore interface
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Additional state for compatibility
  const [threadId, setThreadId] = useState<string | null>(null);
  
  const chatService = useRef(new ChatService(createClient()));

  /**
   * Deduplicate messages based on database IDs
   */
  const deduplicateMessages = useCallback((newMessages: ChatMessage[]): ChatMessage[] => {
    const seen = new Set<string>();
    return newMessages.filter(msg => {
      if (seen.has(msg.id)) {
        console.warn('[Chat Store] Duplicate message filtered:', msg.id);
        return false;
      }
      seen.add(msg.id);
      return true;
    });
  }, []);

  /**
   * Load thread and messages from database
   */
  const loadThread = useCallback(async (targetThreadId: string): Promise<void> => {
    if (!targetThreadId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const threadData = await chatService.current.getThread(targetThreadId);
      if (!threadData) {
        throw new Error('Thread not found');
      }
      
      // Verify thread belongs to current document
      if (threadData.document_id !== documentId) {
        throw new Error('Thread does not belong to this document');
      }
      
      const messagesData = await chatService.current.getMessages(targetThreadId);
      
      // Deduplicate messages based on database IDs (safety measure)
      const uniqueMessages = deduplicateMessages(messagesData);
      
      setThread(threadData);
      setMessages(uniqueMessages);
      setThreadId(targetThreadId);
      
      console.log('[Chat Store] Loaded thread:', {
        threadId: targetThreadId,
        messageCount: uniqueMessages.length,
        duplicatesFiltered: messagesData.length - uniqueMessages.length
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load thread';
      
      // Only log unexpected errors - known user-facing errors are handled separately
      if (!/(thread not found|does not belong to this document)/i.test(errorMessage)) {
        console.error('[Chat Store] Error loading thread:', err);
      }
      
      setError(errorMessage);
      setThread(null);
      setMessages([]);
      setThreadId(null);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, deduplicateMessages]);

  /**
   * Send message using database-first atomic API
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    // Enhanced content validation per o3 AI recommendations
    const validation = validateUserMessage(content)
    if (!validation.valid) {
      throw new Error(validation.error!)
    }
    const trimmedContent = validation.trimmedContent!
    
    // 1. Insert local pending placeholder so the user sees their message immediately
    const tempId = `pending-${crypto.randomUUID()}`
    const pendingMessage: ChatMessage = {
      id: tempId,
      thread_id: threadId ?? 'pending',
      sequence_number: -1,
      content: trimmedContent,
      role: 'user',
      created_at: new Date().toISOString(),
      ai_call_id: null,
      extra: { pending: true } as unknown as ChatMessage['extra']
    }
    setMessages(prev => [...prev, pendingMessage])

    setIsLoading(true)
    setError(null)

    try {
      // Get auth token for API call
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }
      
      // Build conversation history to send to server.
      // 1. Take existing persisted messages excluding local placeholders (pending/failed)
      const completedHistory = messages.filter(m => {
        const extra = (m.extra && typeof m.extra === 'object' && !Array.isArray(m.extra))
          ? (m.extra as Record<string, unknown>)
          : {}
        return !extra.pending && !extra.failed
      }).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      // 2. Respect MAX_CONVERSATION_LENGTH unless it is 0 (unlimited)
      let trimmedHistory = completedHistory
      if (CHAT_VALIDATION_CONFIG.MAX_CONVERSATION_LENGTH > 0) {
        trimmedHistory = completedHistory.slice(-CHAT_VALIDATION_CONFIG.MAX_CONVERSATION_LENGTH)
      }

      // 3. Append the new user message
      const payloadMessages = [...trimmedHistory, { role: 'user' as const, content: trimmedContent }]

      // Prepare request payload for atomic database-first API (no redundant content field)
      const requestPayload: SendMessageRequest = {
        documentContext,
        documentId,
        ...(threadId ? { threadId } : {})
      }

      // Call the atomic API endpoint with feature flag
      const response = await fetch('/api/tools/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'execute',
          parameters: {
            ...requestPayload,
            messages: payloadMessages,
            // Feature flag for database-first implementation
            databaseFirst: true,
            atomic: true
          },
          metadata: {
            correlationId: crypto.randomUUID(),
            source: 'direct',
            timestamp: new Date().toISOString()
          }
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        let detail = 'Unknown error'
        if (contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            detail = errorData?.detail || errorData?.message || errorData?.error || detail
          } catch {
            // fall through – we'll use default detail
          }
        } else {
          try {
            const text = await response.text()
            // Strip HTML tags if this is an error page
            const plain = text.replace(/<[^>]*>/g, '').trim()
            if (plain) {
              detail = plain.slice(0, 300)
            }
          } catch {
            // ignore
          }
        }

        const correlationId = response.headers.get('x-spideryarn-correlation-id')
        if (correlationId) {
          detail = `${detail} (id ${correlationId})`
        }

        throw new Error(detail)
      }

      const data: ChatApiResponse = await response.json();
      
      if (!data.thread || !data.messages) {
        throw new Error('Invalid response format from server');
      }
      
      // Update state with authoritative database data (single source of truth)
      // Deduplicate messages as safety measure
      const uniqueMessages = deduplicateMessages(data.messages);
      
      setThread(data.thread);
      setMessages(uniqueMessages);
      setThreadId(data.thread.id);
      
      console.log('[Chat Store] Message sent successfully:', {
        threadId: data.thread.id,
        messageCount: uniqueMessages.length,
        duplicatesFiltered: data.messages.length - uniqueMessages.length,
        newMessage: content.slice(0, 50) + '...'
      });
      
    } catch (err) {
      console.error('[Chat Store] Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)

      // Mark the pending message as failed so UI can offer retry
      setMessages(prev => prev.map(m => {
        if (m.id !== tempId) return m
        const baseExtra = (m.extra && typeof m.extra === 'object' && !Array.isArray(m.extra))
          ? (m.extra as Record<string, unknown>)
          : {}
        return {
          ...m,
          extra: {
            ...baseExtra,
            pending: false,
            failed: true,
            error: errorMessage
          } as ChatMessage['extra']
        } as ChatMessage
      }))
      throw err; // Re-throw for caller handling
    } finally {
      setIsLoading(false);
    }
  }, [documentContext, documentId, threadId, deduplicateMessages, messages]);

  /**
   * Create new thread (will be called automatically by sendMessage if needed)
   */
  const createThread = useCallback(async (docId: string, title: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newThread = await chatService.current.createThread({
        documentId: docId,
        title,
        userId: '', // Will be set by server from auth context
        modelString: 'anthropic:claude-3-5-sonnet-20241022' // Default model
      });
      
      setThread(newThread);
      setMessages([]);
      setThreadId(newThread.id);
      
      console.log('[Chat Store] Thread created:', newThread.id);
      
    } catch (err) {
      console.error('[Chat Store] Error creating thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to create thread');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear messages and reset to empty state
   */
  const clearMessages = useCallback((): void => {
    setMessages([]);
    setThread(null);
    setThreadId(null);
    setError(null);
    
    console.log('[Chat Store] Messages cleared');
  }, []);

  /**
   * Refresh from database (equivalent to refreshMessages)
   */
  const refreshFromDatabase = useCallback(async (): Promise<void> => {
    if (!threadId) {
      if (!autoloadExisting) {
        clearMessages();
        return;
      }
      // No active thread, try to load most recent for document
      try {
        const threads = await chatService.current.getThreadsForDocument(documentId);
        const mostRecentThread = threads[0];
        if (mostRecentThread) {
          await loadThread(mostRecentThread.id);
        } else {
          clearMessages();
        }
      } catch (err) {
        console.error('[Chat Store] Error refreshing:', err);
        setError(err instanceof Error ? err.message : 'Failed to refresh');
      }
      return;
    }
    
    await loadThread(threadId);
  }, [threadId, documentId, loadThread, clearMessages, autoloadExisting]);

  /**
   * Delete current thread
   */
  const deleteThread = useCallback(async (): Promise<void> => {
    if (!threadId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await chatService.current.deleteThread(threadId);
      
      // Reset state
      clearMessages();
      onThreadDeleted?.();
      
      console.log('[Chat Store] Thread deleted:', threadId);
      
    } catch (err) {
      console.error('[Chat Store] Error deleting thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete thread');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [threadId, clearMessages, onThreadDeleted]);

  /**
   * Initialize store on mount
   */
  useEffect(() => {
    if (!documentId) {
      clearMessages();
      return;
    }
    
    // If specific conversation ID provided, load it
    if (conversationId) {
      loadThread(conversationId);
      return;
    }
    
    if (!autoloadExisting) {
      clearMessages();
      return;
    }

    // Otherwise, try to load most recent thread for document
    const loadMostRecent = async () => {
      try {
        const threads = await chatService.current.getThreadsForDocument(documentId);
        const mostRecentThread = threads[0];
        if (mostRecentThread) {
          await loadThread(mostRecentThread.id);
        } else {
          clearMessages();
        }
      } catch (err) {
        console.error('[Chat Store] Error loading initial thread:', err);
        clearMessages();
      }
    };
    loadMostRecent();
  }, [documentId, conversationId, loadThread, clearMessages, autoloadExisting]);

  return {
    // ChatStore interface
    messages,
    thread,
    isLoading,
    error,
    sendMessage,
    loadThread,
    createThread,
    clearMessages,
    refreshFromDatabase,
    
    // Additional compatibility fields
    threadId,
    deleteThread
  };
}