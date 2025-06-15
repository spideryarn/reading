'use client';

// Assistant chat component with URL state persistence
// See docs/reference/ARCHITECTURE_URL_STATE.md for URL state management

import { 
  ThreadPrimitive, 
  ComposerPrimitive, 
  MessagePrimitive,
  AssistantRuntimeProvider, 
  // useLocalRuntime, // No longer used directly
  // type ChatModelAdapter // No longer used directly
} from "@assistant-ui/react";
import { User, Robot, PaperPlaneTilt, CircleNotch, ArrowClockwise } from '@phosphor-icons/react';
import { usePersistentChat } from '@/src/lib/hooks/usePersistentChat';
import { Button } from '@/components/ui/button'
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { useChatUrlState } from '@/lib/tools/hooks/use-tool-url-state';
import { useEffect } from 'react';

interface AssistantChatProps {
  documentId: string;
  documentContext: string;
}

// User message component
const UserMessage = () => (
  <MessagePrimitive.Root className="flex justify-end px-4 py-2">
    <div className="flex items-end gap-2 max-w-[80%]">
      <div className="bg-blue-500 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
        <div className="prose prose-sm max-w-none prose-p:text-white prose-p:leading-relaxed prose-p:mb-4 prose-p:last:mb-0 prose-strong:text-white prose-li:mb-1 prose-ul:space-y-1 prose-ol:space-y-1 [&>*]:mb-3 [&>*:last-child]:mb-0">
          <MessagePrimitive.Content />
        </div>
      </div>
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm mb-1">
        <User size={12} weight="bold" className="text-white" />
      </div>
    </div>
  </MessagePrimitive.Root>
);

// Assistant message component with loading state
const AssistantMessage = () => (
  <MessagePrimitive.Root className="flex justify-start px-4 py-2">
    <div className="flex items-end gap-2 max-w-[85%]">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center shadow-sm mb-1">
        <Robot size={12} weight="bold" className="text-white" />
      </div>
      <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
        <MessagePrimitive.If hasContent={false}>
          <div className="flex items-center gap-2 text-gray-500">
            <CircleNotch 
              size={16} 
              className="animate-spin" 
              weight="bold"
            />
            <span className="text-sm font-medium">Thinking...</span>
          </div>
        </MessagePrimitive.If>
        <MessagePrimitive.If hasContent>
          <div className="prose prose-sm max-w-none prose-p:text-gray-800 prose-p:leading-relaxed prose-p:mb-4 prose-p:last:mb-0 prose-headings:text-gray-900 prose-code:text-gray-700 prose-code:bg-white prose-code:px-2 prose-code:py-1 prose-code:rounded prose-strong:text-gray-900 prose-li:mb-1 prose-ul:space-y-1 prose-ol:space-y-1 [&>*]:mb-3 [&>*:last-child]:mb-0">
            {/* Use @assistant-ui/react-markdown for full markdown support in AI responses */}
            <MessagePrimitive.Content components={{ Text: MarkdownTextPrimitive }} />
          </div>
        </MessagePrimitive.If>
      </div>
    </div>
  </MessagePrimitive.Root>
);

// Composer component with loading states
const Composer = () => {
  return (
    <ComposerPrimitive.Root className="flex items-end gap-3 p-4 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
      <ComposerPrimitive.Input 
        className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all"
        placeholder="Ask about this document..."
        rows={1}
      />
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <Button variant="default" size="icon" className="h-[44px] w-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm">
            <PaperPlaneTilt size={18} weight="bold" />
          </Button>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <Button variant="secondary" size="icon" className="h-[44px] w-[44px] rounded-xl">
            <CircleNotch size={18} weight="bold" className="animate-spin" />
          </Button>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  );
};

// Thread suggestions for empty state
const ThreadSuggestions = () => {
  const suggestions = [
    "What is this document about?",
    "Summarise the main points",
    "Explain key concepts",
    "Find important quotes"
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Robot size={24} weight="bold" className="text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Ask me anything</h3>
        <p className="text-gray-600 text-sm max-w-sm">I can help you understand this document, summarise content, or answer specific questions.</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {suggestions.map((prompt, i) => (
          <ThreadPrimitive.Suggestion
            key={i}
            prompt={prompt}
            method="replace"
            autoSend
            asChild
          >
            <Button variant="outline" size="sm" className="rounded-full text-xs px-3 py-2 hover:bg-blue-50 hover:border-blue-300 transition-colors">
              {prompt}
            </Button>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
};

// Main thread component
function Thread() {
  return (
    <ThreadPrimitive.Root className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50/30">
      <ThreadPrimitive.Viewport className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <ThreadPrimitive.Empty>
          <ThreadSuggestions />
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages 
          components={{
            UserMessage,
            AssistantMessage
            // Note: Each component must be a React component function, not an object
            // Avoid object spreading here as it can create invalid React elements
          }}
        />
      </ThreadPrimitive.Viewport>
      <div className="flex-shrink-0 border-t border-gray-100">
        <Composer />
      </div>
    </ThreadPrimitive.Root>
  );
}

export function AssistantChat({ documentId, documentContext }: AssistantChatProps) {
  const { conversationId, setConversation } = useChatUrlState();
  
  const { runtime, isLoaded, threadId, error, isRefreshing, refreshMessages } = usePersistentChat({ 
    documentId, 
    documentContext,
    conversationId
  });
  
  // Sync threadId to URL when it changes
  useEffect(() => {
    if (threadId && threadId !== conversationId) {
      setConversation(threadId);
    }
  }, [threadId, conversationId, setConversation]);

  // Show loading state while initializing
  if (!isLoaded) {
    return (
      <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <CircleNotch size={24} className="animate-spin text-blue-600" weight="bold" />
            <p className="text-sm text-gray-600">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if persistence failed
  if (error) {
    return (
      <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <Robot size={24} weight="bold" className="text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Chat Unavailable</h3>
            <p className="text-sm text-gray-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Chat header with persistence status and refresh */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
        <div className="text-xs text-blue-700">
          {threadId ? (
            <>
              <span className="font-medium">✓ Conversation saved</span>
              <span className="text-blue-600 ml-2">Thread: {threadId.slice(-8)}</span>
            </>
          ) : (
            <span className="text-blue-600">Ready to chat</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshMessages}
          disabled={isRefreshing}
          className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
        >
          <ArrowClockwise 
            size={12} 
            weight="bold" 
            className={isRefreshing ? "animate-spin" : ""} 
          />
          <span className="ml-1 text-xs">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </span>
        </Button>
      </div>
      
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}