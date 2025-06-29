'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChatService } from '@/lib/services/database/chat';
import type { ChatThread, ChatMessage } from '@/lib/types/database';
import type { ChatStore, SendMessageRequest, ChatApiResponse } from '@/lib/types/chat-api';

interface UseChatStoreProps {
  documentId: string;
  documentContext: string;
  conversationId?: string;
  onThreadDeleted?: () => void;
}

interface UseChatStoreReturn extends ChatStore {
  threadId: string | null;
  error: string | null;
  deleteThread: () => Promise<void>;
  refreshFromDatabase: () => Promise<void>;
}

/**
 * Database-first chat store that eliminates dual-state management
 * 
 * This hook replaces usePersistentChat with a single source of truth approach:
 * - All messages come from database
 * - API calls return complete thread + message state
 * - No optimistic updates, loading states provide feedback
 * - Designed for use with useExternalStoreRuntime
 */
export function useChatStore({ 
  documentId, 
  documentContext,
  conversationId,
  onThreadDeleted
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
      console.error('[Chat Store] Error loading thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to load thread');
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
    if (!content.trim()) {
      throw new Error('Message content cannot be empty');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get auth token for API call
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }
      
      // Prepare request for atomic database-first API
      const requestPayload: SendMessageRequest = {
        content,
        documentContext,
        documentId,
        ...(threadId ? { threadId } : {})
      };
      
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
            messages: [{ role: 'user' as const, content }],
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
        const errorData = await response.json();
        const detail = errorData.detail || errorData.message || errorData.error || 'Unknown error';
        throw new Error(detail);
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
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err; // Re-throw for caller handling
    } finally {
      setIsLoading(false);
    }
  }, [documentContext, documentId, threadId, deduplicateMessages]);

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
      // No active thread, try to load most recent for document
      try {
        const threads = await chatService.current.getThreadsForDocument(documentId);
        if (threads.length > 0) {
          await loadThread(threads[0].id);
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
  }, [threadId, documentId, loadThread, clearMessages]);

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
    
    // Otherwise, try to load most recent thread for document
    const loadMostRecent = async () => {
      try {
        const threads = await chatService.current.getThreadsForDocument(documentId);
        if (threads.length > 0) {
          await loadThread(threads[0].id);
        } else {
          clearMessages();
        }
      } catch (err) {
        console.error('[Chat Store] Error loading initial thread:', err);
        clearMessages();
      }
    };
    
    loadMostRecent();
  }, [documentId, conversationId, loadThread, clearMessages]);

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