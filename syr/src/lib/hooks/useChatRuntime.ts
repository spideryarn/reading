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

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          documentContext,
        }),
        signal: abortSignal,
      });

      if (!res.ok) {
        let errorMessage = `HTTP error ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Ignore if error response is not JSON or empty
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `Sorry, an error occurred: ${errorMessage}`
            }
          ]
        };
      }

      const data = await res.json();
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