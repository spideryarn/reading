'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  useLocalRuntime, 
  type ChatModelAdapter,
  type Message
} from "@assistant-ui/react";
import { createClient } from '@/lib/supabase/client';
import { ChatService } from '@/lib/services/database/chat';
import { AiCallService } from '@/lib/services/database/ai-calls';
import { getModelConfig } from '@/lib/config';

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

// Mock system user ID (from database migration)
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

// Thread title generation utility
function generateThreadTitle(firstUserMessage: string): string {
  const maxLength = 50;
  const cleaned = firstUserMessage.trim();
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  // Find natural break point
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 20 
    ? truncated.slice(0, lastSpace) + '...'
    : truncated + '...';
}

export function usePersistentChat({ 
  documentId, 
  documentContext 
}: UsePersistentChatProps): UsePersistentChatReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [aiCallService, setAiCallService] = useState<AiCallService | null>(null);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);

  // Initialize database services
  useEffect(() => {
    const initServices = async () => {
      try {
        const supabase = createClient();
        const chatSvc = new ChatService(supabase);
        const aiCallSvc = new AiCallService(supabase);
        
        setChatService(chatSvc);
        setAiCallService(aiCallSvc);
        
        // Get current model configuration and lookup model UUID
        const modelConfig = getModelConfig();
        try {
          const modelUuid = await aiCallSvc.getModelUuidByProviderAndId(
            modelConfig.provider, 
            modelConfig.modelId
          );
          setCurrentModelId(modelUuid);
        } catch (err) {
          console.warn('[Persistent Chat] Model lookup failed, will skip thread creation:', err);
          setCurrentModelId(null);
        }
        
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
      const isFirstMessage = conversationHistory.length === 1 && latestUserMessage?.role === 'user';

      let currentThreadId = threadId;

      // Create thread if this is the first message and we have a valid model ID
      if (!currentThreadId && isFirstMessage && chatService && currentModelId) {
        try {
          const title = generateThreadTitle(latestUserMessage.content);
          const newThread = await chatService.createThread({
            documentId,
            modelId: currentModelId,
            title,
            userId: SYSTEM_USER_ID
          });
          
          currentThreadId = newThread.id;
          setThreadId(currentThreadId);
          
          console.log('[Persistent Chat] Created new thread:', {
            threadId: currentThreadId,
            title,
            documentId
          });
        } catch (err) {
          console.error('[Persistent Chat] Failed to create thread:', err);
          setError(`Failed to create chat thread: ${err instanceof Error ? err.message : 'Unknown error'}`);
          // Continue without persistence for this message
        }
      }

      // Save user message to database if we have a thread
      if (currentThreadId && latestUserMessage?.role === 'user') {
        await saveMessage(currentThreadId, 'user', latestUserMessage.content);
      }

      // Make API call (same as original implementation)
      let res;
      try {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: conversationHistory,
            documentContext,
            threadId: currentThreadId // Pass thread ID to API
          }),
          signal: abortSignal,
        });
      } catch (error) {
        console.error('[Persistent Chat] Network Error:', {
          error: error instanceof Error ? error.message : 'Unknown network error',
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
          errorDetails = errorData.details || '';
          errorCode = errorData.code || errorCode;
          
          console.error('[Persistent Chat] API Error:', {
            status: res.status,
            error: errorMessage,
            details: errorDetails,
            code: errorCode,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.error('[Persistent Chat] Failed to parse error response:', e);
        }
        
        const fullError = errorDetails 
          ? `${errorMessage}\n\n${errorDetails}`
          : errorMessage;
        
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Error: ${fullError}\n\nPlease try again or contact support if the issue persists.`
            }
          ]
        };
      }

      const data = await res.json();
      const response = data.response;
      const aiCallId = data.aiCallId;
      
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
    }, [documentContext, threadId, chatService, currentModelId, saveMessage]),
  };

  const runtime = useLocalRuntime(chatModelAdapter);

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
          
          // Populate runtime with historical messages
          if (history.length > 0) {
            // Note: assistant-ui doesn't expose direct message setting
            // For now, we'll let the conversation start fresh and rely on
            // the database for persistence across sessions
            console.log('[Persistent Chat] Historical messages found but not loaded into UI yet');
          }
        }

        setIsLoaded(true);
      } catch (err) {
        console.error('[Persistent Chat] Initialization error:', err);
        setError(`Failed to initialize chat: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoaded(true); // Still mark as loaded to show error state
      }
    };

    initConversation();
  }, [chatService, findOrCreateThread, loadConversationHistory]);

  return {
    runtime,
    isLoaded,
    threadId,
    error
  };
}