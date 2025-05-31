# Assistant-UI Integration Guide

## Overview

This document provides comprehensive technical guidance for integrating the @assistant-ui/react library into the Spideryarn Reading application to create a chatbot interface within the Tools pane. This guide includes detailed code examples, best practices, common pitfalls, and Next.js-specific integration patterns.

> This document supports the implementation plan outlined in [planning/250527a_chatbot_interface_assistant_ui.md](/planning/250527a_chatbot_interface_assistant_ui.md).

**Related Documentation:**
- [LLM_PROMPT_TEMPLATES.md](LLM_PROMPT_TEMPLATES.md) - **Required reading** for implementing any LLM functionality
- [ARCHITECTURE.md](ARCHITECTURE.md) - Overall system design decisions and framework choices
- [AI_SUMMARISE.md](AI_SUMMARISE.md) and [AI_GLOSSARY.md](AI_GLOSSARY.md) - Examples of AI feature implementation patterns
- [TESTING.md](TESTING.md) - Testing approach for Jest with React Testing Library
- [SHADCN_UI_REFERENCE.md](SHADCN_UI_REFERENCE.md) - UI component library integration patterns
- [UI_INTERFACE.md](UI_INTERFACE.md) - Multi-pane layout and tabbed navigation architecture
- [SITE_ORGANISATION.md](SITE_ORGANISATION.md) - Application routes and component hierarchy

## Library Overview

- **Name**: assistant-ui
- **GitHub**: https://github.com/assistant-ui/assistant-ui
- **Official Documentation**: https://www.assistant-ui.com/docs/
- **NPM Package**: @assistant-ui/react
- **Monthly Downloads**: >100k
- **Description**: Open source TypeScript/React library for building AI chat interfaces with composable, customizable primitive components

## Key Features

### Component Architecture
- **Composable Primitives**: Instead of monolithic chat components, provides building blocks inspired by Radix UI and shadcn/ui
- **Full Customization**: Complete control over styling and layout while handling complex chat interactions
- **TypeScript First**: Built with TypeScript for strong type safety

### Chat Functionality
- **Auto-scrolling**: Automatic scroll management for chat messages
- **Accessibility**: Built-in ARIA support and keyboard navigation
- **Real-time Updates**: Handles streaming responses and live message updates
- **Message Editing**: Support for editing previous messages with conversation branching
- **Thread Management**: Multiple conversation thread support

### AI Provider Support
- **Wide Model Support**: OpenAI, Anthropic, Mistral, Perplexity, AWS Bedrock, Azure, Google Gemini, Hugging Face, Fireworks, Cohere, Replicate, Ollama
- **Vercel AI SDK**: First-class integration with AI SDK
- **LangGraph**: Direct integration with LangGraph and LangGraph Cloud
- **Custom APIs**: Ability to integrate with custom streaming backends

## Installation

### Quick Start (Recommended)
```bash
# For new projects
npx assistant-ui create

# For existing Next.js projects
npx assistant-ui init
```

### Manual Installation
```bash
npm install \
  @assistant-ui/react \
  @assistant-ui/react-markdown \
  @assistant-ui/styles \
  @radix-ui/react-tooltip \
  @radix-ui/react-slot \
  lucide-react \
  remark-gfm \
  class-variance-authority \
  clsx
```

## Core Components and Primitives

### 1. ThreadPrimitive
The main conversation container that provides viewport, messages, and composer structure.

```jsx
import { ThreadPrimitive } from "@assistant-ui/react";

const Thread = () => (
  <ThreadPrimitive.Root>
    <ThreadPrimitive.Viewport>
      <ThreadPrimitive.Empty>
        <p>No messages yet. Start a conversation!</p>
      </ThreadPrimitive.Empty>
      <ThreadPrimitive.Messages components={{
        UserMessage,
        AssistantMessage,
        EditComposer
      }} />
    </ThreadPrimitive.Viewport>
    <Composer />
  </ThreadPrimitive.Root>
);
```

### 2. ComposerPrimitive
Provides input field and action buttons for message composition.

```jsx
import { ComposerPrimitive } from "@assistant-ui/react";

const Composer = () => {
  return (
    <ComposerPrimitive.Root className="flex items-center gap-2 p-4 border-t">
      <ComposerPrimitive.Input 
        rows={1} 
        autoFocus 
        placeholder="Ask about this document..." 
        className="flex-1 resize-none rounded-lg border p-2" 
      />
      <ComposerAction />
    </ComposerPrimitive.Root>
  );
};

const ComposerAction = () => {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <button className="p-2 rounded-lg bg-primary text-white">
            <SendHorizontalIcon className="w-4 h-4" />
          </button>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <button className="p-2 rounded-lg bg-destructive text-white">
            <CircleStopIcon className="w-4 h-4" />
          </button>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
};
```

### 3. MessagePrimitive
Handles both user and assistant messages with content, branch picker, and action bar.

```jsx
import { MessagePrimitive } from "@assistant-ui/react";

const UserMessage = () => (
  <MessagePrimitive.Root className="flex gap-3 p-4">
    <div className="flex-shrink-0">
      <UserIcon className="w-6 h-6" />
    </div>
    <div className="flex-1">
      <MessagePrimitive.Content className="prose prose-sm max-w-none" />
      <MessageActions />
    </div>
  </MessagePrimitive.Root>
);

const AssistantMessage = () => (
  <MessagePrimitive.Root className="flex gap-3 p-4 bg-muted/50">
    <div className="flex-shrink-0">
      <BotIcon className="w-6 h-6" />
    </div>
    <div className="flex-1">
      <MessagePrimitive.Content className="prose prose-sm max-w-none" />
      <MessageActions />
    </div>
  </MessagePrimitive.Root>
);

const MessageActions = () => (
  <ActionBarPrimitive.Root className="flex gap-1 mt-2">
    <ActionBarPrimitive.Copy asChild>
      <button className="p-1 rounded hover:bg-muted">
        <CopyIcon className="w-4 h-4" />
      </button>
    </ActionBarPrimitive.Copy>
    <ActionBarPrimitive.Reload asChild>
      <button className="p-1 rounded hover:bg-muted">
        <RefreshIcon className="w-4 h-4" />
      </button>
    </ActionBarPrimitive.Reload>
    <ActionBarPrimitive.Edit asChild>
      <button className="p-1 rounded hover:bg-muted">
        <EditIcon className="w-4 h-4" />
      </button>
    </ActionBarPrimitive.Edit>
  </ActionBarPrimitive.Root>
);
```

### 4. Runtime Providers
Two main approaches for managing chat state and backend integration.

## Runtime Configuration and API Integration

### LocalRuntime (Recommended for Most Cases)
Use when assistant-ui manages the chat history state. Provides built-in support for thread management, message editing, reloading, and branch switching.

**IMPORTANT**: When using `useLocalRuntime`, you must provide a `ChatModelAdapter` with a `run` function. Without this, the runtime will throw a bind error when trying to send messages.

```typescript
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";

const ChatInterface = () => {
  // CRITICAL: Define the chat model adapter
  const chatModelAdapter: ChatModelAdapter = {
    run: async ({ messages, abortSignal }) => {
      const lastMessage = messages.at(-1);
      const messageText = lastMessage?.content?.find(part => part.type === 'text')?.text || '';
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageText,
          documentContext: getDocumentContext()
        }),
        signal: abortSignal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return {
        content: [
          {
            type: "text" as const,
            text: data.response,
          },
        ],
      };
    }
  };

  // Pass the adapter to useLocalRuntime
  const runtime = useLocalRuntime(chatModelAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
};
```

**Alternative**: Use a generator function for streaming support:

```typescript
const runtime = useLocalRuntime({
  async *run({ messages }) {
    const lastMessage = messages[messages.length - 1];
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: lastMessage.content[0]?.text || '',
        documentContext: documentContext
      }),
    });
    
    const data = await response.json();
    
    // Yield the response text (assistant-ui expects a generator)
    yield {
      type: "text" as const,
      text: data.response
    };
  },
});
```

### ExternalStoreRuntime (For Full State Control)
Use when you need complete control over the frontend message state.

```typescript
import { useExternalStoreRuntime } from "@assistant-ui/react";

const ChatWithExternalStore = () => {
  // Your own state management
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    convertMessage: (msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      // Custom message transformations
    }),
    onNew: async (message) => {
      setIsRunning(true);
      try {
        // Your custom message handling
        const response = await processMessage(message);
        setMessages(prev => [...prev, response]);
      } finally {
        setIsRunning(false);
      }
    },
    onEdit: async (messageId, newContent) => {
      // Handle message editing
    },
    onReload: async (messageId) => {
      // Handle message regeneration
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
};
```

## Next.js API Route Setup

### Basic Claude Integration

**IMPORTANT**: All LLM implementations must use our standardised prompt template system. See [LLM_PROMPT_TEMPLATES.md](LLM_PROMPT_TEMPLATES.md) for complete implementation guidance.

```typescript
// app/api/chat/route.ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from '@/lib/supabase/server';
import { AI_CONFIG } from '@/lib/config';

export async function POST(req: Request) {
  const { messages, context } = await req.json();
  
  // PREFERRED APPROACH: Use the prompt template system
  // See LLM_PROMPT_TEMPLATES.md for complete implementation details
  
  // Example using template system (recommended):
  /*
  import { executePrompt } from '@/lib/prompts/types';
  import { chatPrompt } from '@/lib/prompts/templates/chat';
  
  const result = await executePrompt(anthropic, chatPrompt, {
    messages: messages,
    documentContext: getDocumentContext(context),
    selectedText: context?.selectedText
  });
  
  // Template definitions in lib/prompts/templates/chat.njk and chat.ts
  // Configuration via lib/config.ts for AI_CONFIG settings
  */
  
  // Legacy direct implementation (for reference only):
  let documentContext = '';
  if (context?.documentId) {
    const supabase = createClient();
    const { data: document } = await supabase
      .from('documents')
      .select('title, summary')
      .eq('id', context.documentId)
      .single();
    
    documentContext = document ? 
      `Document: ${document.title}\nSummary: ${document.summary}\n\n` : '';
  }
  
  if (context?.selectedText) {
    documentContext += `Selected text: "${context.selectedText}"\n\n`;
  }
  
  const result = streamText({
    model: anthropic(AI_CONFIG.DEFAULT_MODEL),
    messages: [
      {
        role: 'system',
        content: `You are an AI assistant helping users understand documents. 
        ${documentContext}
        Provide helpful, concise responses based on the document content.`
      },
      ...messages
    ],
    temperature: AI_CONFIG.DEFAULT_TEMPERATURE,
    maxTokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
  });
  
  return result.toDataStreamResponse();
}
```

### Advanced Streaming with Progress
```typescript
// app/api/chat/route.ts
import { experimental_StreamData } from 'ai';
import { AI_CONFIG } from '@/lib/config';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const data = new experimental_StreamData();
  
  const result = streamText({
    model: anthropic(AI_CONFIG.DEFAULT_MODEL),
    messages,
    temperature: AI_CONFIG.DEFAULT_TEMPERATURE,
    onFinish: async ({ text, usage }) => {
      // Log usage for analytics
      await logUsage({ 
        tokens: usage.totalTokens,
        model: AI_CONFIG.DEFAULT_MODEL,
        timestamp: new Date()
      });
      
      // Send additional data
      data.append({
        tokens: usage.totalTokens,
        finished: true
      });
      data.close();
    },
  });
  
  return result.toDataStreamResponse({ data });
}
```

## Advanced Features and Patterns

### Message Editing with Branch Management
```jsx
const EditableThread = () => {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Viewport>
        <ThreadPrimitive.Messages 
          components={{ 
            UserMessage: EditableUserMessage,
            EditComposer: MessageEditComposer,
          }} 
        />
      </ThreadPrimitive.Viewport>
      <Composer />
    </ThreadPrimitive.Root>
  );
};

const EditableUserMessage = () => {
  return (
    <MessagePrimitive.Root>
      <MessagePrimitive.If editing={false}>
        <MessagePrimitive.Content />
        <ActionBarPrimitive.Root>
          <ActionBarPrimitive.Edit />
        </ActionBarPrimitive.Root>
      </MessagePrimitive.If>
      <MessagePrimitive.If editing>
        <MessageEditComposer />
      </MessagePrimitive.If>
      <BranchPicker />
    </MessagePrimitive.Root>
  );
};

const MessageEditComposer = () => {
  return (
    <ComposerPrimitive.Root>
      <ComposerPrimitive.Input />
      <ComposerPrimitive.Send>Save</ComposerPrimitive.Send>
      <ComposerPrimitive.Cancel>Cancel</ComposerPrimitive.Cancel>
    </ComposerPrimitive.Root>
  );
};

const BranchPicker = () => {
  return (
    <BranchPickerPrimitive.Root className="flex items-center gap-2">
      <BranchPickerPrimitive.Previous />
      <span className="text-sm">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next />
    </BranchPickerPrimitive.Root>
  );
};
```

### Attachments Support
```jsx
const ComposerWithAttachments = () => {
  return (
    <ComposerPrimitive.Root>
      <ComposerPrimitive.Attachments>
        <ComposerAttachment />
      </ComposerPrimitive.Attachments>
      
      <div className="flex items-center gap-2">
        <ComposerPrimitive.AddAttachment asChild>
          <button className="p-2">
            <PaperclipIcon />
          </button>
        </ComposerPrimitive.AddAttachment>
        
        <ComposerPrimitive.Input className="flex-1" />
        <ComposerPrimitive.Send />
      </div>
    </ComposerPrimitive.Root>
  );
};

const ComposerAttachment = () => {
  return (
    <ComposerPrimitive.Attachment className="flex items-center gap-2 p-2 border rounded">
      <ComposerPrimitive.AttachmentName />
      <ComposerPrimitive.AttachmentRemove asChild>
        <button className="p-1">
          <XIcon className="w-4 h-4" />
        </button>
      </ComposerPrimitive.AttachmentRemove>
    </ComposerPrimitive.Attachment>
  );
};
```

### Thread Suggestions
```jsx
const ThreadWithSuggestions = () => {
  const suggestions = [
    "Summarise this document",
    "What are the key points?",
    "Explain the main concepts",
    "Find contradictions or unclear points"
  ];

  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Viewport>
        <ThreadPrimitive.Empty>
          <div className="p-4 space-y-2">
            <p>Ask me about this document:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((prompt, i) => (
                <ThreadPrimitive.Suggestion
                  key={i}
                  prompt={prompt}
                  method="replace"
                  autoSend
                  asChild
                >
                  <button className="px-3 py-1 text-sm border rounded-lg hover:bg-muted">
                    {prompt}
                  </button>
                </ThreadPrimitive.Suggestion>
              ))}
            </div>
          </div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages />
      </ThreadPrimitive.Viewport>
      <Composer />
    </ThreadPrimitive.Root>
  );
};
```

### Custom Message Content with Markdown

**Note on Markdown Strategy**: Spideryarn uses two separate markdown rendering approaches:
- **Chat messages**: `@assistant-ui/react-markdown` for full markdown support (code blocks, tables, lists, etc.)
- **Document elements**: Custom `MarkdownRenderer` for lightweight basic formatting (bold, italic, inline code)

This dual approach optimizes for the different content complexity and security requirements of each context.

```jsx
import { MarkdownText } from "@assistant-ui/react-markdown";

const CustomAssistantMessage = () => {
  return (
    <MessagePrimitive.Root>
      <MessagePrimitive.Content 
        components={{
          Text: ({ text }) => (
            <MarkdownText 
              text={text} 
              className="prose prose-sm max-w-none"
            />
          ),
          // Support for custom content types
          Fallback: ({ part }) => {
            if (part.type === 'document-reference') {
              return (
                <DocumentReference 
                  id={part.documentId} 
                  title={part.title} 
                />
              );
            }
            return null;
          }
        }}
      />
    </MessagePrimitive.Root>
  );
};
```

## Integration with Current Architecture

### Styling Best Practices
```css
/* globals.css - Assistant UI theme variables */
.assistant-ui-thread {
  --aui-primary: hsl(var(--primary));
  --aui-primary-foreground: hsl(var(--primary-foreground));
  --aui-muted: hsl(var(--muted));
  --aui-muted-foreground: hsl(var(--muted-foreground));
}

/* Custom component styles */
.aui-composer-root {
  @apply flex items-end gap-2 p-4 border-t bg-background;
}

.aui-composer-input {
  @apply flex-1 min-h-[40px] max-h-[200px] resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring;
}

.aui-message-root {
  @apply flex gap-3 px-4 py-3 transition-colors hover:bg-muted/30;
}

.aui-message-content {
  @apply prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:my-0;
}
```

### State Management Integration
```typescript
// contexts/ChatContext.tsx
import { createContext, useContext } from 'react';
import { useLocalRuntime } from '@assistant-ui/react';

interface ChatContextValue {
  runtime: ReturnType<typeof useLocalRuntime>;
  documentId: string | null;
  selectedText: string | null;
  setSelectedText: (text: string | null) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export const ChatProvider = ({ children, documentId }) => {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  
  const runtime = useLocalRuntime({
    initialMessages: [],
    onNew: async (message) => {
      // Include document context in API calls
      const context = {
        documentId,
        selectedText,
      };
      
      // Process message with context
      await processMessage(message, context);
    },
  });
  
  return (
    <ChatContext.Provider value={{
      runtime,
      documentId,
      selectedText,
      setSelectedText,
    }}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
```

### TypeScript Types
```typescript
// types/chat.ts
import type { Message } from '@assistant-ui/react';

export interface DocumentContext {
  documentId: string;
  title: string;
  selectedText?: string;
  selectedElementId?: string;
}

export interface ChatMessage extends Message {
  context?: DocumentContext;
  metadata?: {
    tokens?: number;
    processingTime?: number;
  };
}

export interface ChatRuntime {
  messages: ChatMessage[];
  isRunning: boolean;
  error: Error | null;
  sendMessage: (content: string, context?: DocumentContext) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  clearMessages: () => void;
}
```

## Common Pitfalls and Solutions

### 1. Hydration Mismatches in Next.js
**Problem**: SSR/CSR mismatches when using dynamic content.
**Solution**: 
```jsx
// Wrap dynamic components with ClientOnly
import dynamic from 'next/dynamic';

const ChatInterface = dynamic(
  () => import('./ChatInterface'),
  { 
    ssr: false,
    loading: () => <div>Loading chat...</div>
  }
);
```

### 2. Streaming Response Handling
**Problem**: Incomplete streaming or connection drops.
**Solution**:
```typescript
// Implement proper error handling and reconnection
const runtime = useLocalRuntime({
  onNew: async (message) => {
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }),
          signal: AbortSignal.timeout(30000), // 30s timeout
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        // Process stream
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
      }
    }
  },
});
```

### 3. Memory Leaks with Large Conversations
**Problem**: Performance degradation with long chat histories.
**Solution**:
```typescript
// Implement message pagination or truncation
const MAX_MESSAGES = 100;

const runtime = useLocalRuntime({
  maxMessages: MAX_MESSAGES,
  onMessagesChange: (messages) => {
    if (messages.length > MAX_MESSAGES) {
      // Archive old messages to database
      archiveMessages(messages.slice(0, -MAX_MESSAGES));
    }
  },
});
```

### 4. Style Conflicts
**Problem**: Tailwind classes conflicting with assistant-ui defaults.
**Solution**:
```jsx
// Use cn utility for conditional classes
import { cn } from '@/lib/utils';

<MessagePrimitive.Root 
  className={cn(
    "aui-message-root", // Base assistant-ui class
    "custom-message",   // Your custom class
    isHighlighted && "bg-yellow-50" // Conditional styling
  )}
/>
```

### 5. Context Loss on Route Changes
**Problem**: Chat state lost when navigating between pages.
**Solution**:
```typescript
// Persist chat state in sessionStorage or database
const usePersistentChat = () => {
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('chat-messages');
    return saved ? JSON.parse(saved) : [];
  });
  
  useEffect(() => {
    sessionStorage.setItem('chat-messages', JSON.stringify(messages));
  }, [messages]);
  
  return { messages, setMessages };
};
```

## Performance Optimizations

### 1. Lazy Loading Components
```typescript
const Thread = lazy(() => import('./Thread'));
const Composer = lazy(() => import('./Composer'));

export const Chat = () => (
  <Suspense fallback={<ChatSkeleton />}>
    <Thread />
    <Composer />
  </Suspense>
);
```

### 2. Memoizing Message Components
```jsx
import { memo } from 'react';

const Message = memo(({ message }) => {
  return (
    <MessagePrimitive.Root>
      <MessagePrimitive.Content />
    </MessagePrimitive.Root>
  );
}, (prevProps, nextProps) => {
  // Only re-render if message content changes
  return prevProps.message.content === nextProps.message.content;
});
```

### 3. Virtual Scrolling for Long Conversations
```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualThread = ({ messages }) => {
  const parentRef = useRef();
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <Message message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Current Implementation Status

As of Stage 4 completion, the Spideryarn Reading application has successfully integrated assistant-ui with the following components:

### Implemented Components

1. **`components/assistant-chat.tsx`** - Main chat component using assistant-ui primitives
   - Uses `ThreadPrimitive`, `ComposerPrimitive`, and `MessagePrimitive`
   - Custom `UserMessage` and `AssistantMessage` components with Phosphor icons
   - Thread suggestions for empty state with common document questions
   - Integrated with `useChatRuntime` hook for state management

2. **`src/lib/hooks/useChatRuntime.ts`** - Custom hook for chat runtime management
   - Encapsulates the `useLocalRuntime` configuration
   - Handles API communication with proper error handling
   - Supports abort signals for request cancellation
   - Returns typed content following assistant-ui's expected format

3. **`components/simple-chat.tsx`** - Temporary implementation for testing
   - Basic chat UI without assistant-ui for comparison
   - Will be removed once assistant-ui integration is finalized

### Key Implementation Decisions

1. **Runtime Approach**: Using `useLocalRuntime` instead of `useExternalStoreRuntime` for simpler state management
2. **Component Architecture**: Primitive components approach for maximum customization
3. **Error Handling**: Graceful error messages returned as assistant responses
4. **Document Context**: Automatically passed with each message (10k character limit)
5. **Testing**: Unit tests created for `useChatRuntime` hook with comprehensive coverage

### Integration Points

- **API Route**: `/api/chat` (currently fake implementation, ready for LLM integration)
- **Tab System**: Chat integrated as second tab in Tools pane (after Glossary) - see `components/tab-container.tsx`
- **Document Context**: Extracted via `getDocumentContext()` in `components/document-viewer.tsx`
- **Styling**: Consistent with existing Tailwind design system and shadcn/ui components
- **State Management**: Uses `components/assistant-chat.tsx` and `src/lib/hooks/useChatRuntime.ts`
- **Testing**: Unit tests in `src/lib/hooks/__tests__/useChatRuntime.test.ts`

### Next Steps

See [planning/250527a_chatbot_interface_assistant_ui.md](/planning/250527a_chatbot_interface_assistant_ui.md) for:
- Stage 5: Enhanced document context formatting
- Stage 6: Real LLM integration
- Stage 7+: Advanced features and persistence

## Useful Resources

### External Documentation
- **Official Documentation**: https://www.assistant-ui.com/docs/
- **GitHub Repository**: https://github.com/assistant-ui/assistant-ui
- **Examples**: https://github.com/assistant-ui/assistant-ui/tree/main/examples
- **API Reference**: https://www.assistant-ui.com/docs/api-reference/overview
- **Discord Community**: Available through their GitHub page
- **npm Package**: https://www.npmjs.com/package/@assistant-ui/react

### Internal Code References
- **Implementation**: `components/assistant-chat.tsx` - Main chat component
- **Hook**: `src/lib/hooks/useChatRuntime.ts` - Runtime management
- **API Route**: `app/api/chat/route.ts` - Backend integration point
- **Tests**: `src/lib/hooks/__tests__/useChatRuntime.test.ts` - Runtime testing
- **Legacy Component**: `components/simple-chat.tsx` - Temporary comparison implementation

## Tips for Next.js Integration

1. **Use App Router**: Assistant-ui works best with Next.js App Router for streaming support
2. **API Routes**: Place chat endpoints in `app/api/chat/route.ts` for proper streaming
3. **Client Components**: Mark chat components with `'use client'` directive
4. **Environment Variables**: Store API keys in `.env.local` and access via `process.env`
5. **Error Boundaries**: Wrap chat components in error boundaries for graceful degradation
6. **Loading States**: Implement proper loading indicators during message processing
7. **Accessibility**: Test with screen readers as assistant-ui has built-in ARIA support


