'use client';

import { useCallback } from 'react';
import { 
  useLocalRuntime, 
  type ChatModelAdapter 
} from "@assistant-ui/react";

interface UseChatRuntimeProps {
  documentContext: string;
}

export function useChatRuntime({ documentContext }: UseChatRuntimeProps) {
  const chatModelAdapter: ChatModelAdapter = {
    run: useCallback(async ({ messages, abortSignal, context }) => {
      const lastUserMessage = messages.at(-1);
      const messageText = lastUserMessage?.content?.find(part => part.type === 'text')?.text || '';

      // Log message being sent
      console.log('[Chat Runtime] Sending message:', {
        messageLength: messageText.length,
        documentContextLength: documentContext?.length || 0,
        timestamp: new Date().toISOString()
      });

      let res;
      try {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            documentContext,
          }),
          signal: abortSignal,
        });
      } catch (error) {
        console.error('[Chat Runtime] Network Error:', {
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
          
          // Enhanced client-side logging
          console.error('[Chat Runtime] API Error:', {
            status: res.status,
            error: errorMessage,
            details: errorDetails,
            code: errorCode,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.error('[Chat Runtime] Failed to parse error response:', e);
        }
        
        // Return user-friendly error message with details
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
      
      // Log successful response
      console.log('[Chat Runtime] Response received:', {
        responseLength: data.response?.length || 0,
        timestamp: data.timestamp || new Date().toISOString()
      });
      
      return {
        content: [
          {
            type: "text" as const,
            text: data.response,
          },
        ],
      };
    }, [documentContext]),
  };

  const runtime = useLocalRuntime(chatModelAdapter);

  return runtime;
} 