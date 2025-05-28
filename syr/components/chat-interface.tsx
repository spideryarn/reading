import { AssistantRuntimeProvider, Thread, ThreadWelcome, ThreadMessages, ThreadViewport, Composer, ThreadActions } from "@assistant-ui/react";
import { useLocalRuntime } from "@assistant-ui/react";
import { useState, useCallback } from "react";

interface ChatInterfaceProps {
  documentContext?: string;
}

export function ChatInterface({ documentContext }: ChatInterfaceProps) {
  // Create a local runtime for handling chat interactions
  const runtime = useLocalRuntime({
    async *run({ messages }) {
      // Get the last message (user's latest input)
      const lastMessage = messages[messages.length - 1];
      
      try {
        // Call our existing mock API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: lastMessage.content[0]?.text || '',
            documentContext: documentContext
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to get response');
        }
        
        const data = await response.json();
        
        // Yield the response text (assistant-ui expects a generator)
        yield {
          type: "text" as const,
          text: data.response
        };
        
      } catch (error) {
        // Handle errors by yielding an error message
        yield {
          type: "text" as const,
          text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
  });

  return (
    <div className="flex flex-col h-full">
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex-1 overflow-hidden">
          <Thread className="h-full flex flex-col">
            <ThreadViewport className="flex-1 overflow-y-auto p-4">
              <ThreadWelcome>
                <div className="text-center text-gray-600 mb-4">
                  <p className="text-sm">
                    Welcome! I can help you analyze and understand this document.
                  </p>
                  {documentContext && (
                    <p className="text-xs text-gray-500 mt-2">
                      Document context loaded ({Math.round(documentContext.length / 1000)}k characters)
                    </p>
                  )}
                </div>
              </ThreadWelcome>
              <ThreadMessages />
            </ThreadViewport>
            
            <div className="border-t border-gray-200 p-4">
              <Composer
                placeholder="Ask me about this document..."
                className="flex gap-2"
              />
            </div>
          </Thread>
        </div>
      </AssistantRuntimeProvider>
    </div>
  );
}