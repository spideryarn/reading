'use client';

import { 
  ThreadPrimitive, 
  ComposerPrimitive, 
  MessagePrimitive,
  AssistantRuntimeProvider, 
  useLocalRuntime 
} from "@assistant-ui/react";
import { User, Robot, PaperPlaneTilt } from '@phosphor-icons/react';

interface AssistantChatProps {
  documentContext: string;
}

// User message component
const UserMessage = () => (
  <MessagePrimitive.Root className="flex gap-3 px-4 py-3">
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
      <User size={14} weight="bold" className="text-white" />
    </div>
    <div className="flex-1">
      <MessagePrimitive.Content className="prose prose-sm max-w-none" />
    </div>
  </MessagePrimitive.Root>
);

// Assistant message component
const AssistantMessage = () => (
  <MessagePrimitive.Root className="flex gap-3 px-4 py-3 bg-gray-50">
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
      <Robot size={14} weight="bold" className="text-white" />
    </div>
    <div className="flex-1">
      <MessagePrimitive.Content className="prose prose-sm max-w-none" />
    </div>
  </MessagePrimitive.Root>
);

// Composer component
const Composer = () => (
  <ComposerPrimitive.Root className="flex items-center gap-2 p-4 border-t border-gray-200">
    <ComposerPrimitive.Input 
      className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      placeholder="Ask about this document..."
      rows={1}
    />
    <ComposerPrimitive.Send asChild>
      <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
        <PaperPlaneTilt size={16} weight="bold" />
      </button>
    </ComposerPrimitive.Send>
  </ComposerPrimitive.Root>
);

// Thread suggestions for empty state
const ThreadSuggestions = () => {
  const suggestions = [
    "What is this document about?",
    "Summarise the main points",
    "Explain key concepts",
    "Find important quotes"
  ];

  return (
    <div className="p-6 space-y-4">
      <p className="text-gray-600 text-center">Ask me about this document:</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map((prompt, i) => (
          <ThreadPrimitive.Suggestion
            key={i}
            prompt={prompt}
            method="replace"
            autoSend
            asChild
          >
            <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors">
              {prompt}
            </button>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
};

// Main thread component
function Thread() {
  return (
    <ThreadPrimitive.Root className="h-full flex flex-col">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <ThreadPrimitive.Empty>
          <ThreadSuggestions />
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages 
          components={{
            UserMessage,
            AssistantMessage
          }}
        />
      </ThreadPrimitive.Viewport>
      <Composer />
    </ThreadPrimitive.Root>
  );
}

export function AssistantChat({ documentContext }: AssistantChatProps) {
  const runtime = useLocalRuntime({
    initialMessages: [],
    onNew: async (message) => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.content,
            documentContext: documentContext
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Add assistant response to thread
        runtime.append({
          role: "assistant",
          content: data.response
        });
        
      } catch (error) {
        console.error('Chat API error:', error);
        
        // Add error message to thread
        runtime.append({
          role: "assistant", 
          content: "Sorry, I encountered an error processing your request. Please try again."
        });
      }
    }
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}