'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { 
  type ChatModelAdapter,
  type ThreadMessageLike,
  type TextContentPart,
  type ThreadUserContentPart,
  type ThreadAssistantContentPart
} from "@assistant-ui/react";
import { createClient } from '@/lib/supabase/client';
import { ChatService } from '@/lib/services/database/chat';

interface UsePersistentChatProps {
  documentId: string;
  documentContext: string;
  conversationId?: string;
  onThreadDeleted?: () => void;
}

interface UsePersistentChatReturn {
  chatModelAdapter: ChatModelAdapter;
  initialMessages: ThreadMessageLike[];
  isLoaded: boolean;
  threadId: string | null;
  error: string | null;
  isRefreshing: boolean;
  refreshMessages: () => Promise<void>;
  deleteThread: () => Promise<void>;
  runtimeKey: number;
}

export function usePersistentChat({ 
  documentId, 
  documentContext,
  conversationId,
  onThreadDeleted
}: UsePersistentChatProps): UsePersistentChatReturn {
  // Start with isLoaded = true to avoid hanging loading state
  const [isLoaded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [runtimeKey, setRuntimeKey] = useState(0);
  const chatService = useMemo(() => new ChatService(createClient()), []);
  // Keep a mutable ref in sync with threadId so the adapter can access the latest value
  const threadIdRef = useRef<string | null>(null);

  // Sync the ref whenever threadId changes
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  // Load messages from database and update state
  const loadMessages = useCallback(async (): Promise<void> => {
    if (!documentId || !chatService) {
      setMessages([]);
      setThreadId(null);
      return;
    }

    try {
      let thread = null;
      
      // If a specific conversation ID is provided from URL, try to load it
      if (conversationId) {
        try {
          const specificThread = await chatService.getThread(conversationId);
          // Verify the thread belongs to this document
          if (specificThread && specificThread.document_id === documentId) {
            thread = specificThread;
            console.log('[Persistent Chat] Loaded specific conversation from URL:', conversationId);
          } else {
            console.log('[Persistent Chat] Conversation ID from URL not found or doesn\'t match document');
          }
        } catch (err) {
          console.log('[Persistent Chat] Failed to load specific conversation:', err);
        }
      }
      
      // If no specific thread loaded, look for the most recent thread for this document
      if (!thread) {
        const existingThreads = await chatService.listThreadsByDocument(documentId, 1);
        if (existingThreads.length > 0) {
          thread = existingThreads[0];
          console.log('[Persistent Chat] Loaded most recent conversation for document');
        }
      }
      
      if (thread) {
        setThreadId(thread.id);
        
        // Load conversation history
        const dbMessages = await chatService.getThreadMessages(thread.id);
        
        // Convert database messages to ThreadMessageLike format
        const threadMessages: ThreadMessageLike[] = dbMessages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: [{ type: 'text' as const, text: msg.content }],
          createdAt: new Date(msg.created_at)
        }));

        setMessages(threadMessages);
        setRuntimeKey((k) => k + 1);
        console.log('[Persistent Chat] Loaded conversation:', {
          threadId: thread.id,
          messageCount: threadMessages.length
        });
      } else {
        // No existing thread
        setThreadId(null);
        setMessages([]);
        setRuntimeKey((k) => k + 1);
        console.log('[Persistent Chat] No existing thread found for document:', documentId);
      }
    } catch (err) {
      console.error('[Persistent Chat] Error loading messages:', err);
      setError(`Failed to load chat history: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setMessages([]);
      setThreadId(null);
      setRuntimeKey((k) => k + 1);
    }
  }, [chatService, documentId, conversationId]);

  // Refresh messages from database
  const refreshMessages = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    setError(null);
    try {
      await loadMessages();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMessages]);

  // Delete current thread and reset to fresh chat
  const deleteThread = useCallback(async (): Promise<void> => {
    if (!threadId || !chatService) return;
    
    try {
      await chatService.deleteThread(threadId);
      console.log('[Persistent Chat] Thread deleted:', threadId);
      
      // Reset state to fresh chat
      setThreadId(null);
      setMessages([]);
      setError(null);
      setRuntimeKey((k) => k + 1);
      
      // Notify parent component to clear URL state
      onThreadDeleted?.();
      
    } catch (err) {
      console.error('[Persistent Chat] Error deleting thread:', err);
      setError(`Failed to delete conversation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [chatService, threadId, onThreadDeleted]);

  // Save message to database (fire and forget)
  const saveMessage = useCallback(async (
    threadId: string, 
    role: 'user' | 'assistant', 
    content: string,
    aiCallId?: string
  ): Promise<void> => {
    if (!chatService || !threadId) return;

    try {
      // Build message payload, omitting aiCallId if undefined to satisfy exactOptionalPropertyTypes
      const messagePayload = aiCallId 
        ? { threadId, role, content, aiCallId } 
        : { threadId, role, content };
      await chatService.addMessage(messagePayload);
      
      console.log('[Persistent Chat] Message saved:', {
        threadId,
        role,
        contentLength: content.length
      });
    } catch (err) {
      console.error('[Persistent Chat] Error saving message:', err);
      // Fire and forget - don't break conversation flow
    }
  }, [chatService]);

  // Create chat model adapter. We memoise the object so its identity remains
  // stable across renders, preventing the runtime from being recreated and
  // clearing in-memory messages after each state update.
  const chatModelAdapter: ChatModelAdapter = useMemo(() => ({
    run: async ({ messages, abortSignal }) => {
      const currentThreadId = threadIdRef.current;

      console.log('[Persistent Chat] Processing message:', {
        messageCount: messages.length,
        threadId: currentThreadId,
        documentId
      });

      // Convert assistant-ui messages to API format
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: Array.isArray(msg.content)
          ? (msg.content.find((part: ThreadUserContentPart | ThreadAssistantContentPart): part is TextContentPart => 
              part.type === 'text'
            ) as TextContentPart)?.text ?? ''
          : (msg.content as unknown as string) || ''
      })).filter(item => item.content.trim().length > 0);

      // Make API call
      const requestPayload = {
        messages: conversationHistory,
        documentContext,
        ...(currentThreadId ? { threadId: currentThreadId } : {}),
        documentId
      };
      
      try {
        // Retrieve Supabase access token and include it in Authorization header
        const authHeaders: Record<string, string> = {}
        try {
          const supabaseBrowser = createClient()
          const { data: { session } } = await supabaseBrowser.auth.getSession()
          if (session?.access_token) {
            authHeaders['Authorization'] = `Bearer ${session.access_token}`
          }
        } catch (_err) {
          // Ignore if session retrieval fails; server will return 401
        }

        const res = await fetch('/api/tools/chat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            action: 'execute',
            parameters: requestPayload,
            metadata: {
              correlationId: crypto.randomUUID(),
              source: 'direct',
              timestamp: new Date().toISOString()
            }
          }),
          signal: abortSignal,
          credentials: 'include'
        });

        if (!res.ok) {
          const errorData = await res.json();
          const detail = errorData.detail || errorData.message || errorData.error || 'Unknown error';
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Error: ${detail}\n\nPlease try again.`
              }
            ]
          };
        }

        const data = await res.json();
        const response = data.response;
        const returnedThreadId = data.threadId as string | undefined;
        
        // Update thread ID if server created a new one
        if (returnedThreadId && !threadIdRef.current) {
          setThreadId(returnedThreadId);
          threadIdRef.current = returnedThreadId;
          console.log('[Persistent Chat] Thread created:', returnedThreadId);
        }
        
        // Save user and assistant messages (sequential to avoid race condition)
        if (returnedThreadId || currentThreadId) {
          const effectiveThreadId = returnedThreadId || currentThreadId!;
          const userMessage = conversationHistory[conversationHistory.length - 1];
          
          if (userMessage) {
            // Save user message first, then assistant response sequentially
            await saveMessage(effectiveThreadId, 'user', userMessage.content);
          }
          await saveMessage(effectiveThreadId, 'assistant', response, data.aiCallId);
        }
        
        return {
          content: [
            {
              type: "text" as const,
              text: response,
            },
          ],
        };
      } catch (error) {
        console.error('[Persistent Chat] Network error:', error);
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your connection and try again.`
            }
          ]
        };
      }
    }
  }), [documentContext, documentId, saveMessage]);

  // Load messages on mount and when documentId or conversationId changes
  useEffect(() => {
    if (!documentId) {
      setMessages([]);
      setThreadId(null);
      setError(null);
      return;
    }
    
    // Reset state when documentId changes
    setMessages([]);
    setThreadId(null);
    setError(null);
    
    // Load messages for this document
    loadMessages();
  }, [documentId, conversationId, loadMessages]);

  return {
    chatModelAdapter,
    initialMessages: messages,
    isLoaded,
    threadId,
    error,
    isRefreshing,
    refreshMessages,
    deleteThread,
    runtimeKey,
  };
}