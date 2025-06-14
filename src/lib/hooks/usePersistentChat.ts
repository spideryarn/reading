'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  useLocalRuntime, 
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { createClient } from '@/lib/supabase/client';
import { ChatService } from '@/lib/services/database/chat';

interface UsePersistentChatProps {
  documentId: string;
  documentContext: string;
}

interface UsePersistentChatReturn {
  runtime: ReturnType<typeof useLocalRuntime>;
  isLoaded: boolean;
  threadId: string | null;
  error: string | null;
  isRefreshing: boolean;
  refreshMessages: () => Promise<void>;
}

export function usePersistentChat({ 
  documentId, 
  documentContext 
}: UsePersistentChatProps): UsePersistentChatReturn {
  // Start with isLoaded = true to avoid hanging loading state
  const [isLoaded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const chatService = useMemo(() => new ChatService(createClient()), []);

  // Load messages from database and update state
  const loadMessages = useCallback(async (): Promise<void> => {
    if (!documentId || !chatService) {
      setMessages([]);
      setThreadId(null);
      return;
    }

    try {
      // Look for existing thread for this document
      const existingThreads = await chatService.listThreadsByDocument(documentId, 1);
      
      if (existingThreads.length > 0) {
        const thread = existingThreads[0];
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
        console.log('[Persistent Chat] Loaded conversation:', {
          threadId: thread.id,
          messageCount: threadMessages.length
        });
      } else {
        // No existing thread
        setThreadId(null);
        setMessages([]);
        console.log('[Persistent Chat] No existing thread found for document:', documentId);
      }
    } catch (err) {
      console.error('[Persistent Chat] Error loading messages:', err);
      setError(`Failed to load chat history: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setMessages([]);
      setThreadId(null);
    }
  }, [chatService, documentId]);

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

  // Save message to database (fire and forget)
  const saveMessage = useCallback(async (
    threadId: string, 
    role: 'user' | 'assistant', 
    content: string,
    aiCallId?: string
  ): Promise<void> => {
    if (!chatService || !threadId) return;

    try {
      await chatService.addMessage({
        threadId,
        role,
        content,
        aiCallId
      });
      
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

  // Create chat model adapter with simplified persistence
  const chatModelAdapter: ChatModelAdapter = {
    run: useCallback(async ({ messages, abortSignal }) => {
      console.log('[Persistent Chat] Processing message:', {
        messageCount: messages.length,
        threadId,
        documentId
      });

      // Convert assistant-ui messages to API format
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: Array.isArray(msg.content)
          ? (msg.content.find((part: unknown) => (part as { type: string }).type === 'text') as { text: string })?.text ?? ''
          : (msg.content as string) || ''
      }));

      // Make API call
      const requestPayload = {
        messages: conversationHistory,
        documentContext,
        ...(threadId ? { threadId } : {}),
        documentId
      };
      
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: abortSignal,
        });

        if (!res.ok) {
          const errorData = await res.json();
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Error: ${errorData.error || 'Unknown error'}\n\nPlease try again.`
              }
            ]
          };
        }

        const data = await res.json();
        const response = data.response;
        const returnedThreadId = data.threadId;
        
        // Update thread ID if server created a new one
        if (returnedThreadId && !threadId) {
          setThreadId(returnedThreadId);
          console.log('[Persistent Chat] Thread created:', returnedThreadId);
        }
        
        // Save user and assistant messages (sequential to avoid race condition)
        if (returnedThreadId || threadId) {
          const currentThreadId = returnedThreadId || threadId;
          const userMessage = conversationHistory[conversationHistory.length - 1];
          
          // Save user message first, then assistant response sequentially
          await saveMessage(currentThreadId, 'user', userMessage.content);
          await saveMessage(currentThreadId, 'assistant', response, data.aiCallId);
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
    }, [documentContext, threadId, documentId, saveMessage]),
  };

  // Load messages on mount and when documentId changes
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
  }, [documentId, loadMessages]);

  // Initialize runtime with messages from state
  const runtime = useLocalRuntime(chatModelAdapter, {
    initialMessages: messages
  });

  return {
    runtime,
    isLoaded,
    threadId,
    error,
    isRefreshing,
    refreshMessages
  };
}