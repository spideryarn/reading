'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  useLocalRuntime, 
  type ChatModelAdapter,
  type Message,
  type ThreadMessageLike
} from "@assistant-ui/react";
import { createClient } from '@/lib/supabase/client';
import { ChatService } from '@/lib/services/database/chat';
import { AiCallService } from '@/lib/services/database/ai-calls';

interface UsePersistentChatProps {
  documentId: string;
  documentContext: string;
}

interface UsePersistentChatReturn {
  runtime: ReturnType<typeof useLocalRuntime>;
  isLoaded: boolean;
  threadId: string | null;
  error: string | null;
}


export function usePersistentChat({ 
  documentId, 
  documentContext 
}: UsePersistentChatProps): UsePersistentChatReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [, setAiCallService] = useState<AiCallService | null>(null);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<ThreadMessageLike[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  // Initialize database services
  useEffect(() => {
    const initServices = async () => {
      try {
        const supabase = createClient();
        const chatSvc = new ChatService(supabase);
        const aiCallSvc = new AiCallService(supabase);
        
        setChatService(chatSvc);
        setAiCallService(aiCallSvc);
        
        // For persistence, we'll let the server-side API handle model configuration
        // and thread creation. Client just needs to know chat service is ready.
        setCurrentModelId('client-ready');
        
      } catch (err) {
        console.error('[Persistent Chat] Failed to initialize services:', err);
        setError('Failed to initialize chat persistence');
      }
    };

    initServices();
  }, []);

  // Find or create thread for this document
  const findOrCreateThread = useCallback(async (): Promise<string | null> => {
    if (!chatService || !currentModelId) return null;

    try {
      // Look for existing thread for this document
      const existingThreads = await chatService.listThreadsByDocument(documentId, 1);
      
      if (existingThreads.length > 0) {
        console.log('[Persistent Chat] Found existing thread:', existingThreads[0].id);
        return existingThreads[0].id;
      }
      
      // No existing thread - will create one when first message is sent
      console.log('[Persistent Chat] No existing thread found for document:', documentId);
      return null;
      
    } catch (err) {
      console.error('[Persistent Chat] Error finding thread:', err);
      setError(`Failed to find chat thread: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    }
  }, [chatService, documentId, currentModelId]);

  // Load conversation history from database
  const loadConversationHistory = useCallback(async (threadId: string): Promise<Message[]> => {
    if (!chatService) return [];

    try {
      const messages = await chatService.getThreadMessages(threadId);
      
      // Convert database messages to assistant-ui format
      const assistantMessages: Message[] = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: [
          {
            type: 'text' as const,
            text: msg.content
          }
        ],
        createdAt: new Date(msg.created_at)
      }));

      console.log('[Persistent Chat] Loaded conversation history:', {
        threadId,
        messageCount: assistantMessages.length
      });

      return assistantMessages;
    } catch (err) {
      console.error('[Persistent Chat] Error loading conversation:', err);
      setError(`Failed to load conversation: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return [];
    }
  }, [chatService]);

  // Save message to database
  const saveMessage = useCallback(async (
    threadId: string, 
    role: 'user' | 'assistant', 
    content: string,
    aiCallId?: string
  ): Promise<void> => {
    if (!chatService) return;

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
      // Don't set error state here - this would break the conversation flow
      // The error is logged but the UI continues working
    }
  }, [chatService]);

  // Create chat model adapter with persistence
  const chatModelAdapter: ChatModelAdapter = {
    run: useCallback(async ({ messages, abortSignal }) => {
      console.log('[Persistent Chat] Processing message with persistence:', {
        messageCount: messages.length,
        threadId,
        documentId
      });

      // Convert assistant-ui messages to API format
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content.find(part => part.type === 'text')?.text || ''
      }));

      // Get the latest user message
      const latestUserMessage = conversationHistory[conversationHistory.length - 1];

      let currentThreadId = threadId;

      // Thread creation will be handled server-side by the API route
      // We'll get the thread ID back from the API response

      // Save user message to database if we have a thread
      if (currentThreadId && latestUserMessage?.role === 'user') {
        await saveMessage(currentThreadId, 'user', latestUserMessage.content);
      }

      // Make API call with comprehensive request logging
      const requestPayload = {
        messages: conversationHistory,
        documentContext,
        ...(currentThreadId ? { threadId: currentThreadId } : {}), // Only include threadId if it's not null
        documentId // Pass document ID for thread creation
      };
      
      console.log('[Persistent Chat] Making API request:', {
        url: '/api/chat',
        payload: {
          messageCount: requestPayload.messages.length,
          documentContextLength: requestPayload.documentContext?.length || 0,
          threadId: requestPayload.threadId || 'none',
          documentId: requestPayload.documentId || 'none'
        },
        timestamp: new Date().toISOString()
      });
      
      let res;
      try {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: abortSignal,
        });
      } catch (error) {
        console.error('[Persistent Chat] Network Error:', {
          error: error instanceof Error ? error.message : 'Unknown network error',
          requestPayload: {
            messageCount: requestPayload.messages.length,
            documentContextLength: requestPayload.documentContext?.length || 0,
            threadId: requestPayload.threadId || 'none',
            documentId: requestPayload.documentId || 'none'
          },
          timestamp: new Date().toISOString()
        });
        
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Error: Network connection failed\n\nPlease check your internet connection and try again.`
            }
          ]
        };
      }

      if (!res.ok) {
        let errorMessage = `HTTP error ${res.status}`;
        let errorDetails = '';
        let errorCode = 'UNKNOWN_ERROR';
        
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
          errorCode = errorData.code || errorCode;
          
          // Handle detailed error formatting
          if (errorData.details) {
            if (typeof errorData.details === 'string') {
              errorDetails = errorData.details;
            } else if (errorData.details.issues) {
              // Validation errors with structured issues
              errorDetails = `Validation failed:\n${errorData.details.issues.map((issue: {path?: string; message: string; received?: unknown}) => 
                `• ${issue.path || 'root'}: ${issue.message}${issue.received ? ` (received: ${JSON.stringify(issue.received)})` : ''}`
              ).join('\n')}`;
            } else {
              // Other structured error details
              errorDetails = JSON.stringify(errorData.details, null, 2);
            }
          }
          
          console.error('[Persistent Chat] API Error:', {
            status: res.status,
            error: errorMessage,
            details: errorData.details,
            code: errorCode,
            requestBody: {
              messages: conversationHistory,
              documentContext: documentContext?.substring(0, 100) + '...',
              threadId: currentThreadId,
              documentId
            },
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.error('[Persistent Chat] Failed to parse error response:', e);
          errorDetails = 'Unable to parse error details from server';
        }
        
        const fullError = errorDetails 
          ? `${errorMessage}\n\n${errorDetails}`
          : errorMessage;
        
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Error: ${fullError}\n\nError Code: ${errorCode}\nPlease try again or contact support if the issue persists.`
            }
          ]
        };
      }

      const data = await res.json();
      const response = data.response;
      const aiCallId = data.aiCallId;
      const returnedThreadId = data.threadId; // Thread ID from server
      
      // Update thread ID if server created a new one
      if (returnedThreadId && !currentThreadId) {
        currentThreadId = returnedThreadId;
        setThreadId(currentThreadId);
        console.log('[Persistent Chat] Thread created by server:', currentThreadId);
      }
      
      // Save assistant response to database if we have a thread
      if (currentThreadId && response) {
        await saveMessage(currentThreadId, 'assistant', response, aiCallId);
      }
      
      console.log('[Persistent Chat] Response generated and saved:', {
        responseLength: response?.length || 0,
        threadId: currentThreadId,
        timestamp: data.timestamp || new Date().toISOString()
      });
      
      return {
        content: [
          {
            type: "text" as const,
            text: response,
          },
        ],
      };
    }, [documentContext, threadId, documentId, saveMessage]),
  };

  const runtime = useLocalRuntime(chatModelAdapter, { 
    initialMessages: messagesLoaded ? initialMessages : undefined 
  });

  // Load conversation history on mount
  useEffect(() => {
    const initConversation = async () => {
      if (!chatService) return;

      try {
        setError(null);
        
        // Find existing thread
        const existingThreadId = await findOrCreateThread();
        setThreadId(existingThreadId);

        // Load conversation history if thread exists
        if (existingThreadId) {
          const history = await loadConversationHistory(existingThreadId);
          
          // Convert to ThreadMessageLike format for initialMessages
          if (history.length > 0) {
            const threadMessages: ThreadMessageLike[] = history.map(msg => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content.find(part => part.type === 'text')?.text || '',
              createdAt: msg.createdAt
            }));
            
            setInitialMessages(threadMessages);
            console.log('[Persistent Chat] Loaded conversation history:', {
              threadId: existingThreadId,
              messageCount: threadMessages.length
            });
          }
        }
        
        setMessagesLoaded(true); // Mark messages as loaded (even if empty)

        setIsLoaded(true);
      } catch (err) {
        console.error('[Persistent Chat] Initialization error:', err);
        setError(`Failed to initialize chat: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoaded(true); // Still mark as loaded to show error state
      }
    };

    initConversation();
  }, [chatService, findOrCreateThread, loadConversationHistory]);
  
  // Reset initial messages when documentId changes
  useEffect(() => {
    setInitialMessages([]);
    setMessagesLoaded(false);
    setThreadId(null);
  }, [documentId]);

  return {
    runtime,
    isLoaded,
    threadId,
    error
  };
}