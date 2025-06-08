# Assistant-UI Integration Guide

## Overview

This document provides comprehensive technical guidance for integrating the @assistant-ui/react library into the Spideryarn Reading application to create a chatbot interface within the Tools pane. This guide includes detailed code examples, best practices, common pitfalls, and Next.js-specific integration patterns.

> This document supports the implementation plan outlined in [planning/250527a_chatbot_interface_assistant_ui.md](/planning/250527a_chatbot_interface_assistant_ui.md).

**Related Documentation:**
- [LLM_PROMPT_TEMPLATES.md](LLM_PROMPT_TEMPLATES.md) - **Required reading** for implementing any LLM functionality
- [ARCHITECTURE.md](ARCHITECTURE.md) - Overall system design decisions and framework choices  
- [DATABASE_OVERVIEW.md](DATABASE_OVERVIEW.md) - Database architecture and schema for persistence features
- [AI_SUMMARISE.md](AI_SUMMARISE.md) and [AI_GLOSSARY.md](AI_GLOSSARY.md) - Examples of AI feature implementation patterns
- [TESTING.md](TESTING.md) - Testing approach for Jest with React Testing Library
- [SHADCN_UI_REFERENCE.md](SHADCN_UI_REFERENCE.md) - UI component library integration patterns
- [UI_INTERFACE.md](UI_INTERFACE.md) - Multi-pane layout and tabbed navigation architecture
- [SITE_ORGANISATION.md](SITE_ORGANISATION.md) - Application routes and component hierarchy

**Planning and Decision Context:**
- [planning/250527a_chatbot_interface_assistant_ui.md](../planning/250527a_chatbot_interface_assistant_ui.md) - Original implementation plan and decision context
- [planning/250605a_chat_database_integration.md](../planning/250605a_chat_database_integration.md) - Database persistence implementation planning
- [planning/250602a_database_integration_completion.md](../planning/250602a_database_integration_completion.md) - Overall database integration progress

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

## Advanced Features of assistant-ui

### Current Capabilities

assistant-ui/react offers several advanced features that enhance the chat experience beyond basic message exchange:

#### 1. **Rich Message Components**
- **Tool/Function Calling UI**: Automatic UI for displaying when the AI uses tools or functions, with proper formatting and status indicators
- **Streaming Components**: Built-in support for streaming responses with loading states, partial message display, and smooth animations
- **Code Highlighting**: Syntax highlighting for code blocks with language detection
- **Markdown Rendering**: Full markdown support with tables, lists, links, and custom components
- **File Attachments**: Support for uploading images and files within messages

#### 2. **Advanced Interaction Patterns**
- **Message Branching**: Users can edit previous messages, creating alternate conversation branches to explore different paths
- **Message Regeneration**: "Regenerate response" functionality to get alternative AI responses
- **Stop Generation**: Ability to interrupt streaming responses mid-generation
- **Copy/Share Messages**: Built-in buttons for copying message content or sharing conversations
- **Message Ratings**: Thumbs up/down feedback collection on AI responses

#### 3. **Composer Enhancements**
- **Suggested Prompts**: Display context-aware suggested questions or prompts
- **Auto-resize Textarea**: Input field that grows with content for better UX
- **Keyboard Shortcuts**: Configurable shortcuts like Ctrl+Enter to send
- **Voice Input**: Speech-to-text integration capabilities
- **Smart Paste Handling**: Special handling for pasted images, code, or rich content

#### 4. **Thread Management**
- **Multiple Threads**: Support for multiple conversation threads per context
- **Thread Persistence**: Built-in adapter system (ThreadHistoryAdapter) for saving/loading conversations
- **Thread Forking**: Create new threads from any point in a conversation
- **Thread Sharing**: Export or share conversation links

#### 5. **Runtime Flexibility**
- **Multiple Model Support**: Switch between different AI models mid-conversation
- **Custom Tool Integration**: Define custom functions/tools the AI can use with automatic UI
- **Streaming Function Calls**: Real-time display of tool usage during generation
- **Error Recovery**: Automatic retry mechanisms and graceful error handling

### Future Potential Features

The assistant-ui architecture enables several powerful features that could be valuable for Spideryarn Reading:

#### 1. **Document-Aware Features**
- **Inline Citations**: AI responses that link back to specific document sections
- **Visual References**: Highlighting relevant document passages during chat
- **Context Switching**: Seamlessly switch document context within a conversation
- **Multi-Document Chat**: Discuss multiple documents in one thread

#### 2. **Collaborative Features**
- **Real-time Collaboration**: Multiple users in the same chat session
- **Comment Threads**: Inline comments on specific messages
- **User Presence**: See who else is viewing the conversation
- **Shared Annotations**: Collaborative highlighting and notes

#### 3. **Advanced Analysis Tools**
- **Comparison Views**: Side-by-side comparison of different AI interpretations
- **Inline Editing**: Edit and refine AI-generated summaries
- **Visualization Generation**: Create charts or diagrams from document data
- **Export Formats**: Save conversations in various formats (PDF, Markdown, etc.)

#### 4. **Learning and Personalization**
- **Conversation Memory**: AI remembers previous discussions about documents
- **User Preferences**: Personalized response styles and focus areas
- **Learning Feedback**: Train the AI on document-specific terminology
- **Custom Prompts**: Save and reuse effective prompts

### Why Keep assistant-ui

Given Spideryarn Reading's document analysis focus, assistant-ui's advanced features provide significant value:

1. **Message Branching** is perfect for exploring different interpretations of complex texts
2. **Tool Integration** could enable features like "summarize this section" or "find contradictions"
3. **Rich Rendering** supports displaying formatted quotes, references, and document excerpts
4. **Thread Persistence** (once debugged) enables continuing analysis across sessions
5. **Streaming UI** provides immediate feedback for long document analyses

These features align well with the goal of helping users "digest written non-fiction material better" by enabling exploratory, iterative conversations about document content.

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

## Database Persistence Patterns ⚠️

The Spideryarn Reading application implements comprehensive conversation persistence using Supabase PostgreSQL with the assistant-ui library's **ThreadHistoryAdapter** system for seamless conversation restoration.

### Overview

- **Approach**: ThreadHistoryAdapter-based persistence with assistant-ui managing UI state  
- **Thread Model**: One thread per document with automatic thread creation
- **History Loading**: Uses `ThreadHistoryAdapter.load()` to restore conversations on runtime initialization
- **Error Handling**: Fail-fast approach with detailed error reporting
- **Current Status**: ⚠️ Under development - experiencing loading state issues

### Database Schema

The persistence system uses two main tables:

```sql
-- Chat threads (one per document)
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  model_id UUID NOT NULL REFERENCES models(id),
  title TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages within threads
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  ai_call_id UUID REFERENCES ai_calls(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Core Implementation: usePersistentChat Hook with ThreadHistoryAdapter

The `usePersistentChat` hook uses assistant-ui's built-in ThreadHistoryAdapter system for proper persistence integration:

```typescript
// src/lib/hooks/usePersistentChat.ts
import { useLocalRuntime, type ThreadMessageLike } from "@assistant-ui/react";

export function usePersistentChat({ 
  documentId, 
  documentContext 
}: UsePersistentChatProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Synchronous service initialization (critical for adapter timing)
  const chatService = useMemo(() => new ChatService(createClient()), []);

  // ThreadHistoryAdapter - assistant-ui's official persistence mechanism
  const historyAdapter: ThreadHistoryAdapter = useMemo(() => ({
    // Called once when runtime initializes - loads existing conversation
    async load() {
      if (!chatService) return { messages: [] };

      try {
        const existingId = await findOrCreateThread();
        if (existingId) {
          setThreadId(existingId);
          const history = await loadConversationHistory(existingId);
          setIsLoaded(true); // Mark as loaded
          return { messages: history };
        }
        setIsLoaded(true);
        return { messages: [] };
      } catch (err) {
        console.error('[Persistent Chat] History load error:', err);
        setError('Failed to load chat history');
        setIsLoaded(true);
        return { messages: [] };
      }
    },

    // Called automatically by runtime when new messages are added
    async append(message) {
      if (!chatService || !threadId) return;

      const getText = (msg: ThreadMessageLike) => {
        if (Array.isArray(msg.content)) {
          return (msg.content as any).find((p: any) => p.type === 'text')?.text || '';
        }
        return (msg.content as any) || '';
      };

      await chatService.addMessage({
        threadId,
        role: message.role as 'user' | 'assistant',
        content: getText(message),
      });
    },
  }), [chatService, threadId, findOrCreateThread, loadConversationHistory]);

  // Create runtime with history adapter
  const runtime = useLocalRuntime(chatModelAdapter, {
    adapters: { history: historyAdapter as any }
  });

  return { runtime, isLoaded, threadId, error };
}
```

### Known Issues ⚠️

**Current Problem**: The chat interface hangs on "Loading conversation..." indefinitely after implementing ThreadHistoryAdapter.

**Root Cause**: The `isLoaded` state is set inside the `historyAdapter.load()` method, but the loading state in the UI never resolves properly.

**Suspected Issues**:
1. **Timing Race Condition**: `historyAdapter.load()` may be called before `chatService` is ready
2. **Async State Management**: Setting `isLoaded` inside the adapter may not trigger UI updates properly  
3. **Runtime Lifecycle**: assistant-ui may have specific expectations about when adapters complete
4. **Service Initialization**: Even with synchronous service creation, there may be Supabase connection delays

### Key Persistence Features

#### 1. Automatic Thread Management

- **Thread Discovery**: Finds existing threads for the current document on mount
- **Lazy Creation**: Creates new threads server-side on first message
- **Title Generation**: Auto-generates thread titles from first user message (50 char limit)
- **Model Tracking**: Associates threads with specific AI models for usage analytics

#### 2. Conversation History Restoration

```typescript
// Convert database messages to ThreadMessageLike format
const threadMessages: ThreadMessageLike[] = history.map(msg => ({
  id: msg.id,
  role: msg.role as 'user' | 'assistant',
  content: msg.content.find(part => part.type === 'text')?.text || '',
  createdAt: msg.createdAt
}));

setInitialMessages(threadMessages);
```

#### 3. Thread Isolation by Document

- Each document maintains its own conversation thread
- Switching documents resets chat state and loads the appropriate thread
- Clean separation prevents context bleeding between documents

```typescript
// Reset on document change
useEffect(() => {
  setInitialMessages([]);
  setMessagesLoaded(false);
  setThreadId(null);
}, [documentId]);
```

#### 4. Server-Side Thread Creation

The API route handles thread creation when no `threadId` is provided:

```typescript
// app/api/chat/route.ts
let finalThreadId = threadId;
if (!threadId && messages.length === 1 && messages[0].role === 'user' && documentId) {
  const title = userMessage.length > 50 
    ? userMessage.substring(0, 47) + '...'
    : userMessage;
  
  const newThread = await chatService.createThread({
    documentId,
    modelId: modelUuid,
    title,
    userId: '00000000-0000-0000-0000-000000000001' // Mock system user
  });
  
  finalThreadId = newThread.id;
}
```

### Database Services

#### ChatService Methods

```typescript
// lib/services/database/chat.ts
class ChatService {
  // Find existing thread for document
  async listThreadsByDocument(documentId: string, limit = 10): Promise<ChatThread[]>
  
  // Create new conversation thread
  async createThread(options: CreateThreadOptions): Promise<ChatThread>
  
  // Add message to thread
  async addMessage(options: AddMessageOptions): Promise<ChatMessage>
  
  // Load conversation history
  async getThreadMessages(threadId: string): Promise<ChatMessage[]>
}
```

#### AI Call Tracking Integration

```typescript
// Tracks LLM usage for analytics
const aiCall = await aiCallService.create({
  provider: modelConfig.provider,
  modelId: modelConfig.modelId,
  promptTokens: result.usage?.promptTokens || null,
  completionTokens: result.usage?.completionTokens || null,
  totalTokens: result.usage?.totalTokens || null,
  requestData: {
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    documentContext: documentContext?.substring(0, 1000) + '...',
    threadId: finalThreadId
  },
  responseData: { response }
});
```

### Implementation Best Practices

#### 1. Fail-Fast Error Handling

Following our coding principles, the system fails immediately with clear error messages rather than falling back to degraded modes:

```typescript
// No silent fallbacks - surface errors clearly
if (!chatService || !currentModelId) {
  throw new Error('Chat persistence services not initialized');
}
```

#### 2. Comprehensive Logging

```typescript
console.log('[Persistent Chat] Loaded conversation history:', {
  threadId: existingThreadId,
  messageCount: threadMessages.length
});
```

#### 3. Type Safety

Full TypeScript integration with proper interfaces for all persistence operations:

```typescript
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
```

### Usage in Components

Replace the basic `useChatRuntime` with `usePersistentChat`:

```typescript
// components/assistant-chat.tsx
import { usePersistentChat } from '@/src/lib/hooks/usePersistentChat';

export function AssistantChat({ documentId }: { documentId: string }) {
  const documentContext = getDocumentContext();
  const { runtime, isLoaded, threadId, error } = usePersistentChat({ 
    documentId, 
    documentContext 
  });

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!isLoaded) {
    return <div>Loading conversation...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {threadId && (
        <div className="text-xs text-muted-foreground p-2 border-b">
          ✓ Conversation saved • Thread: {threadId.slice(0, 8)}
        </div>
      )}
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}
```

### Testing Strategy

Comprehensive test coverage includes:

- **Hook testing**: `src/lib/hooks/__tests__/usePersistentChat.test.ts`
- **Component testing**: `components/__tests__/assistant-chat.test.tsx` 
- **API testing**: `app/api/__tests__/chat-persistence.test.ts`
- **Database integration**: Service-level tests for ChatService and AiCallService

### Performance Considerations

- **Lazy Loading**: Messages only loaded when chat tab is accessed
- **One Thread Per Document**: Prevents conversation bloat
- **Background Persistence**: UI remains responsive during database operations
- **Efficient Queries**: Optimized database queries with proper indexing

### Migration and Backwards Compatibility

The persistence system is designed to be additive:
- Existing chat functionality continues to work without persistence
- New conversations automatically gain persistence capabilities
- Graceful degradation if database is unavailable

## Current Implementation Status

As of database persistence completion, the Spideryarn Reading application has successfully integrated assistant-ui with comprehensive conversation persistence capabilities:

### Implemented Components ✓

1. **`components/assistant-chat.tsx`** - Main chat component using assistant-ui primitives
   - Uses `ThreadPrimitive`, `ComposerPrimitive`, and `MessagePrimitive`
   - Custom `UserMessage` and `AssistantMessage` components with Phosphor icons
   - Thread suggestions for empty state with common document questions
   - **NEW**: Integrated with `usePersistentChat` hook for database persistence
   - **NEW**: Shows persistence indicators and thread IDs in UI

2. **`src/lib/hooks/usePersistentChat.ts`** ✓ - Advanced persistence hook extending useLocalRuntime
   - Uses `initialMessages` option for conversation history restoration
   - Transparent background persistence with database synchronization
   - Automatic thread discovery and creation
   - Document-specific conversation isolation
   - Comprehensive error handling with fail-fast approach

3. **`app/api/chat/route.ts`** ✓ - Enhanced API route with thread management
   - Server-side thread creation for first messages
   - AI call tracking integration for usage analytics
   - Enhanced error reporting with structured validation
   - Thread ID management and response tracking

4. **Database Services** ✓ - Complete persistence layer
   - `lib/services/database/chat.ts` - ChatService for thread and message management
   - `lib/services/database/ai-calls.ts` - AI call tracking and model management
   - Supabase integration with proper error handling

5. **`components/simple-chat.tsx`** ⚠️ - Legacy implementation (deprecated)
   - Basic chat UI without assistant-ui for comparison
   - Should be removed in favor of persistent chat implementation

### Key Implementation Decisions ✓

1. **Runtime Approach**: Using `useLocalRuntime` with `initialMessages` for conversation restoration
2. **Persistence Strategy**: Transparent background persistence with assistant-ui managing UI state
3. **Thread Model**: One thread per document with automatic creation and discovery
4. **Error Handling**: Fail-fast approach with detailed error reporting and validation
5. **Document Context**: Automatically passed with each message (10k character limit)
6. **Testing**: Comprehensive test coverage for hooks, components, and API routes

### Integration Points ✓

- **API Route**: `/api/chat` with full LLM integration (Claude Sonnet 4/Gemini 2.0 Flash)
- **Database**: Supabase PostgreSQL with `chat_threads` and `chat_messages` tables
- **Tab System**: Chat integrated as second tab in Tools pane with persistence indicators
- **Document Context**: Extracted via `getDocumentContext()` with thread isolation
- **Styling**: Consistent with existing Tailwind design system and shadcn/ui components
- **State Management**: Uses `usePersistentChat` hook with database synchronization
- **Authentication**: Integrated with user authentication for conversation ownership
- **Testing**: Unit tests in multiple locations covering full persistence flow

### Persistence Features ✓

- **Conversation Restoration**: Full chat history loaded on page refresh
- **Thread Management**: Automatic thread creation and discovery per document
- **Database Storage**: PostgreSQL storage with proper indexing and relationships
- **Error Recovery**: Graceful handling of database failures with detailed logging
- **Performance**: Lazy loading and efficient queries for optimal user experience
- **Analytics**: AI call tracking for usage monitoring and cost analysis

### Current Status Summary

The chat persistence implementation is **partially complete** with **active debugging required**:

- ✅ **Database Schema**: Complete with proper relationships and constraints
- ✅ **API Integration**: Full thread management and AI call tracking  
- ⚠️ **ThreadHistoryAdapter**: Implemented but causing loading state hangs
- ⚠️ **UI Loading States**: Infinite "Loading conversation..." spinner issue
- ✅ **Error Handling**: Comprehensive validation and error reporting
- ✅ **Testing**: Unit and integration tests covering full persistence flow
- ✅ **Documentation**: Complete implementation guide with known issues documented

### Debugging Approaches Attempted

1. **Initial Implementation**: Used `initialMessages` prop with timing-based loading
   - **Issue**: React hooks order violations due to conditional runtime creation
   
2. **Manual Message Appending**: Used `runtime.append()` to add loaded messages  
   - **Issue**: Messages didn't persist or display correctly on refresh
   
3. **ThreadHistoryAdapter (Current)**: Implemented assistant-ui's official persistence pattern
   - **Issue**: UI hangs on "Loading conversation..." indefinitely
   - **Root Cause**: `isLoaded` state management inside async adapter methods

### Recommended Next Steps

1. **Investigate ThreadHistoryAdapter Lifecycle**: Research how assistant-ui expects adapters to signal completion
2. **Separate Loading State Management**: Move `isLoaded` state outside of adapter methods
3. **Add Adapter Debugging**: Log adapter method calls and completion timing
4. **Consider Alternative Approaches**: Conditional component rendering or external state management
5. **Consult Library Documentation**: Review assistant-ui docs for async loading patterns

### Future Enhancements 📋

Potential improvements for future iterations:
- Multi-thread support per document for conversation branching
- Conversation export/import functionality
- Advanced search across conversation history
- Conversation sharing and collaboration features
- Performance optimizations for very long conversations

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


