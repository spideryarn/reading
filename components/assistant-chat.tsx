'use client';

// Assistant chat component with URL state persistence
// See docs/reference/ARCHITECTURE_URL_STATE.md for URL state management

import { 
  ThreadPrimitive, 
  ComposerPrimitive, 
  MessagePrimitive,
  AssistantRuntimeProvider, 
  useExternalStoreRuntime,
  useMessage,
} from "@assistant-ui/react";
import { User, Robot, PaperPlaneTilt, CircleNotch, Trash } from '@phosphor-icons/react';
import { useChatStore } from '@/src/lib/hooks/useChatStore';
import { Button } from '@/components/ui/button'
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { useChatUrlState } from '@/lib/tools/hooks/use-tool-url-state';
import React, { useEffect, useCallback, useRef, useContext, useState } from 'react';
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover';
import dynamic from 'next/dynamic';
import type { Tables } from '@/lib/types/database-auto-generated';

type ChatMessageDb = Tables<'chat_messages'>;


// Dynamically import the voice recorder with SSR disabled to avoid
// `Worker is not defined` errors during the Node.js render phase.
// See docs/reference/WEB_WORKERS_BEST_PRACTICES.md for background.
const VoiceInputRecorderLazy = dynamic(async () => {
  const mod = await import('@/components/speech/voice-input-recorder');
  return mod.VoiceInputRecorder;
}, { ssr: false });

interface AssistantChatProps {
  documentId: string;
  documentContext: string;
}

const ChatStoreContext = React.createContext<ReturnType<typeof useChatStore> | null>(null);

// SHARED HELPER -------------------------------------------------------------
// A single helper that all message-sending entry points (typed composer, voice
// input, etc.) should use.  This keeps the contract in one place so future
// changes (analytics hooks, throttling, etc.) only need updating here.
function sendUserMessage(
  chatStore: ReturnType<typeof useChatStore> | null,
  content: string,
): Promise<void> {
  if (!chatStore) return Promise.resolve(); // Should never happen but guards tests
  const trimmed = content.trim();
  if (!trimmed) return Promise.resolve();
  return chatStore.sendMessage(trimmed);
}

// User message component with pending/failed styling
const UserMessage = () => {
  const msg = useMessage();
  const chatStore = useContext(ChatStoreContext);

  const customMeta = (msg?.metadata && typeof msg.metadata === 'object' ? (msg.metadata as Record<string, unknown>) : {}) as Record<string, unknown>;
  const customFlags = (customMeta.custom && typeof customMeta.custom === 'object' ? (customMeta.custom as Record<string, unknown>) : {}) as Record<string, unknown>;
  const isPending = !!customFlags.pending;
  const isFailed = !!customFlags.failed;

  // Extract text content (first text part)
  const textContent = Array.isArray(msg.content) && msg.content.length > 0 && msg.content[0].type === 'text'
    ? msg.content[0].text
    : '';

  const bubbleClasses = isPending || isFailed
    ? 'bg-gray-200 text-gray-700'
    : 'bg-blue-500 text-white';

  return (
    <MessagePrimitive.Root className="flex justify-end px-4 py-2">
      <div className="flex items-end gap-2 max-w-[80%]">
        <div className={`${bubbleClasses} px-4 py-3 rounded-2xl rounded-br-md shadow-sm`}>          
          <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:mb-4 prose-p:last:mb-0 prose-li:mb-1 prose-ul:space-y-1 prose-ol:space-y-1 [&>*]:mb-3 [&>*:last-child]:mb-0">
            <MessagePrimitive.Content />
          </div>
          {isPending && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <CircleNotch size={12} className="animate-spin" weight="bold" />
              <span>Sending…</span>
            </div>
          )}
          {isFailed && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
              <button
                type="button"
                onClick={() => sendUserMessage(chatStore, textContent)}
                className="underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm mb-1">
          <User size={12} weight="bold" className="text-white" />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

// Assistant message component with loading state
const AssistantMessage = () => (
  <MessagePrimitive.Root className="flex justify-start px-4 py-2">
    <div className="flex items-end gap-2 max-w-[85%]">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center shadow-sm mb-1">
        <Robot size={12} weight="bold" className="text-white" />
      </div>
      <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
        <MessagePrimitive.If hasContent={false}>
          <div className="flex items-center gap-2 text-blue-600">
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

// Composer component with loading states and voice input
const Composer = () => {
  const chatStore = useContext(ChatStoreContext);

  // Remember last transcript to avoid accidental duplicates (e.g. micro reclick)
  const lastTranscribedRef = useRef<string | null>(null);

  // Fire when transcription arrives from voice recorder
  const handleVoiceTranscription = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // De-duplicate identical consecutive transcripts
      if (trimmed === lastTranscribedRef.current) return;

      lastTranscribedRef.current = trimmed;

      // Send through shared helper (bypasses runtime since external store runtimes
      // do not expose onNew).
      sendUserMessage(chatStore, trimmed);
    },
    [chatStore],
  );

  // Handle voice input errors
  const handleVoiceError = useCallback((error: string) => {
    console.error('Voice input error:', error);
    // Use the global error notification system for user-friendly error feedback
    import('@/lib/tools/executor/error-ui').then(({ showGenericError }) => {
      const voiceError = new Error(error);
      const voiceErrorWithSource = Object.assign(voiceError, { source: 'voice-input' });
      showGenericError(voiceErrorWithSource);
    });
  }, []);

  return (
    <ComposerPrimitive.Root className="flex items-end gap-3 p-4 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
      <ComposerPrimitive.Input 
        className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder="Ask about this document..."
        rows={1}
        disabled={false} // Will be controlled by ThreadPrimitive.If running state
      />
      <ThreadPrimitive.If running={false}>
        <VoiceInputRecorderLazy 
          onTranscription={handleVoiceTranscription}
          onError={handleVoiceError}
          className="flex-shrink-0"
        />
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


// Runtime wrapper using external store pattern
function ChatRuntime({ chatStore }: { chatStore: ReturnType<typeof useChatStore> }) {
  const runtime = useExternalStoreRuntime({
    messages: chatStore.messages,
    isRunning: chatStore.isLoading,
    onNew: async (message) => {
      // Extract text content from assistant-ui message format
      const content = Array.isArray(message.content)
        ? message.content.find(part => part.type === 'text')?.text || ''
        : String(message.content || '');
      
      await sendUserMessage(chatStore, content);
    },
    convertMessage: (msg: ChatMessageDb) => {
      // Determine if this is a local pending or failed placeholder using the `extra` JSONB field
      const extra = (msg.extra && typeof msg.extra === 'object' && !Array.isArray(msg.extra))
        ? (msg.extra as Record<string, unknown>)
        : {}

      // Map to assistant-ui message shape
      const base = {
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: [{ type: 'text' as const, text: msg.content }],
        createdAt: new Date(msg.created_at || new Date().toISOString()),
        metadata: { custom: extra } as const
      }

      // assistant-ui restricts `status` to assistant messages; we rely on metadata flags instead
      return base
    }
  });
  
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

export function AssistantChat({ documentId, documentContext }: AssistantChatProps) {
  const { conversationId, setConversation } = useChatUrlState();
  
  const [autoloadExisting, setAutoloadExisting] = useState(true);

  // Handle thread deletion by clearing URL state
  const handleThreadDeleted = useCallback(() => {
    setConversation(null);
  }, [setConversation]);
  
  // Build props for useChatStore, omitting conversationId when undefined to satisfy exactOptionalPropertyTypes
  const chatStoreProps = conversationId
    ? { documentId, documentContext, conversationId, onThreadDeleted: handleThreadDeleted, autoloadExisting }
    : { documentId, documentContext, onThreadDeleted: handleThreadDeleted, autoloadExisting };

  const chatStore = useChatStore(chatStoreProps);
  const { threadId, error, isLoading } = chatStore;
  
  // Sync threadId to URL when it changes
  useEffect(() => {
    if (threadId && threadId !== conversationId) {
      setConversation(threadId);
    }
  }, [threadId, conversationId, setConversation]);

  // Show loading state while initializing (only for initial load)

  // Show error state if persistence failed
  if (error) {
    // Handle known invalid thread errors (not found or belongs to another document)
    const isInvalidThread = /thread not found|does not belong to this document/i.test(error);
    
    return (
      <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <Robot size={24} weight="bold" className="text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              {isInvalidThread ? 'Conversation Not Found' : 'Chat Unavailable'}
            </h3>
            <p className="text-sm text-gray-600">
              {isInvalidThread
                ? 'This conversation has been deleted or is no longer available.'
                : error}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (isInvalidThread) {
                  // Clear local state, disable autoload, and remove conversation parameter via URL state helper
                  setAutoloadExisting(false);
                  chatStore.clearMessages();
                  setConversation(null);
                } else {
                  window.location.reload();
                }
              }}
              className="mt-2"
            >
              {isInvalidThread ? 'Start New Conversation' : 'Reload Page'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Chat header with persistence status and actions */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
        <div className="text-xs text-blue-700 flex items-center gap-2">
          {isLoading ? (
            <>
              <CircleNotch size={12} className="animate-spin" weight="bold" />
              <span className="font-medium">Processing...</span>
            </>
          ) : threadId ? (
            <>
              <span className="font-medium">✓ Conversation saved</span>
              <span className="text-blue-600 ml-2">Thread: {threadId.slice(-8)}</span>
            </>
          ) : (
            <span className="text-blue-600">Ready to chat</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {threadId && (
            <TooltipOrPopover
              content="Delete this conversation and start fresh"
              side="bottom"
              sideOffset={4}
              showIndicator={false}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={chatStore.deleteThread}
                disabled={isLoading}
                className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash size={12} weight="bold" />
              </Button>
            </TooltipOrPopover>
          )}
        </div>
      </div>
      
      <ChatStoreContext.Provider value={chatStore}>
        <ChatRuntime chatStore={chatStore} />
      </ChatStoreContext.Provider>
    </div>
  );
}