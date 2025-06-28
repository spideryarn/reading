# Assistant-UI Integration Guide

## Overview

This document provides comprehensive technical guidance for integrating the @assistant-ui/react library into the Spideryarn Reading application to create a chatbot interface within the Tools pane. This guide includes detailed code examples, best practices, common pitfalls, and Next.js-specific integration patterns.

**⚠️ Authentication Requirement**: Chat functionality requires user authentication. Users must be logged in to use the chat feature. This ensures proper data isolation through Row Level Security (RLS) policies that tie chat threads to the authenticated user.

> This document supports the implementation plan outlined in [planning/250527a_chatbot_interface_assistant_ui.md](/planning/250527a_chatbot_interface_assistant_ui.md).

**Related Documentation:**
- [LLM_PROMPT_TEMPLATES.md](LLM_PROMPT_TEMPLATES.md) - **Required reading** for implementing any LLM functionality
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Overall system design decisions and framework choices  
- [DATABASE_OVERVIEW.md](DATABASE_OVERVIEW.md) - Database architecture and schema for persistence features
- [TOOL_SUMMARISE.md](TOOL_SUMMARISE.md) and [TOOL_GLOSSARY.md](TOOL_GLOSSARY.md) - Examples of AI feature implementation patterns
- [TESTING_OVERVIEW.md](TESTING_OVERVIEW.md) - Testing approach for Jest with React Testing Library
- [DESIGN_SHADCN_UI_REFERENCE.md](DESIGN_SHADCN_UI_REFERENCE.md) - UI component library integration patterns
- [UI_INTERFACE.md](UI_INTERFACE.md) - Multi-pane layout and tabbed navigation architecture
- [SITE_ORGANISATION_WEBSITE_STRUCTURE.md](SITE_ORGANISATION_WEBSITE_STRUCTURE.md) - Application routes and component hierarchy

**Planning and Decision Context:**
- [planning/250527a_chatbot_interface_assistant_ui.md](../planning/250527a_chatbot_interface_assistant_ui.md) - Original implementation plan and decision context
- [planning/250605a_chat_database_integration.md](../planning/250605a_chat_database_integration.md) - Database persistence implementation planning
- [planning/250602a_database_integration_completion.md](../planning/250602a_database_integration_completion.md) - Overall database integration progress
- [planning/250616a_implement_multi_chat_threads.md](../planning/250616a_implement_multi_chat_threads.md) - Multi-chat thread feature proposal for enhanced conversation management
- [planning/250627b_voice_input_for_chatbot.md](../planning/250627b_voice_input_for_chatbot.md) - Voice input feature integration planning

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

### 4. Voice Input Integration ✅

The chatbot interface includes integrated voice input functionality using OpenAI Whisper for speech-to-text transcription.

```jsx
import { SpeechToTextInput } from '@/components/speech/SpeechToTextInput';

const ComposerWithVoiceInput = () => {
  const handleVoiceTranscription = (text: string) => {
    // Use ThreadPrimitive.Suggestion to auto-send transcribed text
    // This leverages the existing chat machinery for consistency
  };

  return (
    <ComposerPrimitive.Root className="flex items-center gap-2 p-4 border-t">
      <ComposerPrimitive.Input 
        rows={1} 
        autoFocus 
        placeholder="Ask about this document..." 
        className="flex-1 resize-none rounded-lg border p-2" 
      />
      
      {/* Voice input button next to send button */}
      <SpeechToTextInput
        onTranscription={handleVoiceTranscription}
        disabled={isProcessing}
        className="flex-shrink-0"
      />
      
      <ComposerAction />
    </ComposerPrimitive.Root>
  );
};
```

**Voice Input Features**:
- **Microphone button** positioned next to send button
- **Two recording modes**: Click to start/stop or hold to record
- **Visual feedback** during recording (red state) and processing
- **Authentication required** (disabled for anonymous users)
- **Auto-send transcription** using existing chat flow
- **Error handling** for permissions, network, and API failures
- **Browser compatibility** with graceful degradation

**Implementation Notes**:
- Uses `ThreadPrimitive.Suggestion` with `autoSend` for seamless integration
- Voice transcription follows the same path as typed input
- No changes to core chat logic required
- Reusable components support future voice features

See `docs/reference/TOOL_VOICE_INPUT_SPEECH_TO_TEXT.md` for complete voice input documentation.

### 5. Runtime Providers
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

## Database Persistence ✅

The Spideryarn Reading application implements conversation persistence using Supabase PostgreSQL with a direct state management approach that works reliably with assistant-ui.

### Current Implementation Approach

- **Strategy**: Direct state management using `initialMessages` prop
- **Thread Model**: One or more threads per document with URL-addressable conversations
- **History Loading**: Database messages loaded and converted to `ThreadMessageLike` format
- **Runtime Management**: Uses `runtimeKey` to force remounts when data changes
- **Status**: ✅ **Working and stable**

### Database Schema

The persistence system uses two main tables:

```sql
-- Chat threads (multiple per document supported)
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  model_string TEXT NOT NULL, -- Direct model string storage
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

### Core Implementation: usePersistentChat Hook

The `usePersistentChat` hook uses direct state management for reliable persistence:

```typescript
// src/lib/hooks/usePersistentChat.ts
export function usePersistentChat({ 
  documentId, 
  documentContext,
  conversationId 
}: UsePersistentChatProps) {
  // Start with isLoaded = true to avoid hanging loading state
  const [isLoaded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [runtimeKey, setRuntimeKey] = useState(0);
  const chatService = useMemo(() => new ChatService(createClient()), []);

  // Load messages from database and update state
  const loadMessages = useCallback(async () => {
    // Load thread based on conversationId (from URL) or most recent for document
    const thread = conversationId 
      ? await chatService.getThread(conversationId)
      : (await chatService.listThreadsByDocument(documentId, 1))[0];
    
    if (thread) {
      setThreadId(thread.id);
      const dbMessages = await chatService.getThreadMessages(thread.id);
      
      // Convert to ThreadMessageLike format
      const threadMessages: ThreadMessageLike[] = dbMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: [{ type: 'text' as const, text: msg.content }],
        createdAt: new Date(msg.created_at)
      }));

      setMessages(threadMessages);
      setRuntimeKey((k) => k + 1); // Force runtime remount
    }
  }, [chatService, documentId, conversationId]);

  // Chat model adapter with database persistence
  const chatModelAdapter: ChatModelAdapter = {
    run: async ({ messages, abortSignal }) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          documentContext,
          ...(threadId ? { threadId } : {}),
          documentId
        }),
        signal: abortSignal,
      });

      const data = await response.json();
      
      // Update thread ID if server created a new one
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }
      
      // Save messages to database (fire and forget)
      if (data.threadId || threadId) {
        const currentThreadId = data.threadId || threadId;
        await saveMessage(currentThreadId, 'user', userMessage.content);
        await saveMessage(currentThreadId, 'assistant', data.response, data.aiCallId);
      }
      
      return {
        content: [{ type: "text" as const, text: data.response }]
      };
    }
  };

  return {
    chatModelAdapter,
    initialMessages: messages,
    isLoaded,
    threadId,
    error,
    isRefreshing,
    refreshMessages: loadMessages,
    runtimeKey,
  };
}
```

### Key Features

#### 1. Direct State Management
- Uses `initialMessages` prop to seed the runtime with conversation history
- `runtimeKey` forces runtime remounts when data changes
- No complex adapter patterns - simple and reliable

#### 2. URL State Integration
- Conversations are URL-addressable via `conversationId` parameter
- Automatic URL updates when new threads are created
- Specific conversations can be bookmarked and shared

#### 3. Thread Management
- Multiple conversations per document supported
- Automatic thread creation on first message
- Thread titles auto-generated from first user message

#### 4. Database Services

```typescript
// lib/services/database/chat.ts
class ChatService {
  async listThreadsByDocument(documentId: string): Promise<ChatThread[]>
  async getThread(threadId: string): Promise<ChatThread | null>
  async createThread(options: CreateThreadOptions): Promise<ChatThread>
  async addMessage(options: AddMessageOptions): Promise<ChatMessage>
  async getThreadMessages(threadId: string): Promise<ChatMessage[]>
}
```

### Component Integration

```typescript
// components/assistant-chat.tsx
export function AssistantChat({ documentId, documentContext }: AssistantChatProps) {
  const { conversationId, setConversation } = useChatUrlState();
  
  const { chatModelAdapter, initialMessages, isLoaded, threadId, error, isRefreshing, refreshMessages, runtimeKey } =
    usePersistentChat({ documentId, documentContext, conversationId });
  
  // Sync threadId to URL when it changes
  useEffect(() => {
    if (threadId && threadId !== conversationId) {
      setConversation(threadId);
    }
  }, [threadId, conversationId, setConversation]);

  return (
    <div className="h-full flex flex-col">
      {/* Chat header with persistence status and refresh */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
        <div className="text-xs text-blue-700">
          {threadId ? (
            <>✓ Conversation saved • Thread: {threadId.slice(-8)}</>
          ) : (
            <span>Ready to chat</span>
          )}
        </div>
        <Button onClick={refreshMessages} disabled={isRefreshing}>
          <ArrowClockwise className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      
      <ChatRuntime key={runtimeKey} adapter={chatModelAdapter} initialMessages={initialMessages} />
    </div>
  );
}
```

## Current Implementation Status

**Status**: ✅ **Complete and Fully Operational**

The Spideryarn Reading application has successfully integrated assistant-ui with reliable conversation persistence using a direct state management approach.

### Implemented Components ✅

1. **`components/assistant-chat.tsx`** - Main chat component using assistant-ui primitives
   - Beautiful chat interface with message bubbles and loading states
   - Custom `UserMessage` and `AssistantMessage` components with Phosphor icons
   - Thread suggestions for empty state with document-specific prompts
   - Integrated with `usePersistentChat` hook for database persistence
   - Persistence status indicators and refresh functionality in header
   - URL state integration for shareable conversation links

2. **`src/lib/hooks/usePersistentChat.ts`** ✅ - Production-ready persistence hook
   - Direct state management using `initialMessages` and `runtimeKey`
   - URL-based conversation loading via `conversationId` parameter
   - Automatic thread discovery and creation
   - Document-specific conversation isolation
   - Comprehensive error handling with fail-fast approach
   - Background message persistence with fire-and-forget strategy

3. **`app/api/chat/route.ts`** ✅ - Enhanced API route with full thread management
   - Server-side thread creation for first messages
   - AI call tracking integration for usage analytics
   - Model string integration (post-model management simplification)
   - Thread ID management and response tracking

4. **Database Services** ✅ - Complete persistence layer
   - `lib/services/database/chat.ts` - ChatService for thread and message management
   - Full CRUD operations with proper error handling
   - Model string storage (no more UUID foreign key lookups)
   - Supabase integration with Row Level Security

### Key Architecture Decisions ✅

1. **Direct State Management**: Abandoned ThreadHistoryAdapter for reliable `initialMessages` approach
2. **URL State Integration**: Conversations are URL-addressable and shareable
3. **Multiple Threads Per Document**: Supports multiple conversations per document
4. **Runtime Key Strategy**: Forces runtime remounts when conversation data changes
5. **Fire-and-Forget Persistence**: UI remains responsive during database operations
6. **Model String Storage**: Direct model string storage eliminates database lookup overhead

### Current Features ✅

- **Conversation Restoration**: Full chat history loaded on page refresh
- **URL Addressability**: Specific conversations can be bookmarked and shared
- **Thread Management**: Multiple conversations per document with automatic creation
- **Real-time Persistence**: Messages save to database automatically
- **Error Recovery**: Graceful handling of database failures with clear error messages
- **Refresh Functionality**: Manual refresh button to reload conversation from database
- **Performance**: Lazy loading and efficient queries
- **Analytics**: Full AI call tracking for usage monitoring

### Future Enhancements 📋

Potential improvements for future iterations:
- **Clear Button**: Add clear chat functionality for starting fresh conversations
- **Conversation Export**: Export chat history in various formats (PDF, Markdown, etc.)
- **Advanced Search**: Search across conversation history within and across documents  
- **Conversation Sharing**: Share specific conversations with collaboration features
- **Performance Optimizations**: Virtual scrolling for very long conversations
- **Voice Input**: Speech-to-text integration for voice messages
- **Thread Forking**: Create new conversation branches from any point

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
- **Hook**: `src/lib/hooks/usePersistentChat.ts` - Persistence management
- **API Route**: `app/api/chat/route.ts` - Backend integration point
- **Database Service**: `lib/services/database/chat.ts` - Thread and message management

## Tips for Next.js Integration

1. **Use App Router**: Assistant-ui works best with Next.js App Router for streaming support
2. **API Routes**: Place chat endpoints in `app/api/chat/route.ts` for proper streaming
3. **Client Components**: Mark chat components with `'use client'` directive
4. **Environment Variables**: Store API keys in `.env.local` and access via `process.env`
5. **Error Boundaries**: Wrap chat components in error boundaries for graceful degradation
6. **Loading States**: Implement proper loading indicators during message processing
7. **Accessibility**: Test with screen readers as assistant-ui has built-in ARIA support


