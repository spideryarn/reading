# Assistant-UI Integration Guide

## Overview

This document provides technical guidance for integrating the assistant-ui React library into the Spideryarn Reading application to create a chatbot interface within the Tools pane.

## Library Overview

- **Name**: assistant-ui
- **GitHub**: https://github.com/assistant-ui/assistant-ui
- **Documentation**: https://www.assistant-ui.com/docs/getting-started
- **NPM Package**: @assistant-ui/react
- **Monthly Downloads**: >100k
- **Description**: TypeScript/React library for AI chat with primitive, customizable components

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

```bash
# For existing Next.js project
npx assistant-ui@latest init

# Or install manually
npm install @assistant-ui/react
```

## Core Components

### 1. Thread
Main conversation container that manages message flow and state.

### 2. ThreadList
Handles multiple conversation threads (for future multi-conversation support).

### 3. Composer
Input interface for user messages with built-in submission handling.

### 4. AssistantRuntimeProvider
Context provider that manages the chat runtime and AI integration.

## Basic Implementation Pattern

```typescript
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

const ChatInterface = () => {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
};
```

## API Route Setup

For our Claude Sonnet 4 integration:

```typescript
// app/api/chat/route.ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: anthropic("claude-3-5-sonnet-20241022"), // Update to Sonnet 4 when available
    messages,
    temperature: 0, // Match our config
  });
  
  return result.toDataStreamResponse();
}
```

## Integration with Current Architecture

### Styling Approach
- **Tailwind CSS**: assistant-ui components are designed to work well with Tailwind
- **Custom Styling**: Can override default styles using Tailwind classes
- **Phosphor Icons**: Compatible with our existing icon system

### State Management
- **Runtime Context**: Uses React Context for chat state management
- **Document Context**: Can inject current document content into conversation
- **Tab Integration**: Will work within our existing tab container system

### TypeScript Integration
- **Type Safety**: Full TypeScript support with proper type definitions
- **Custom Types**: Can extend interfaces for our specific document context needs

## Implementation Stages for Spideryarn

### Stage 1: Basic Chat Setup
1. Install assistant-ui dependencies
2. Create basic chat API route with mock responses
3. Set up Thread component in Tools pane
4. Test basic message exchange

### Stage 2: Document Context Integration
1. Inject current document content into initial system message
2. Configure chat to understand document structure
3. Test document-aware responses

### Stage 3: Advanced Features
1. Add conversation clearing functionality
2. Implement message editing with thread branching
3. Add web search toggle capability
4. Integrate with actual Claude Sonnet 4 API

## Performance Considerations

- **Bundle Size**: assistant-ui is optimized for tree-shaking
- **Streaming**: Built-in support for streaming responses reduces perceived latency
- **Memory Management**: Efficient message history handling

## Customization Options

### Theme Integration
- Compatible with our brand colours (Spideryarn Red, Black, Warm Grey)
- Can customize message bubbles, input styling, and spacing
- Supports dark/light mode if needed in future

### Component Overrides
- Can replace default components with custom implementations
- Maintains accessibility while allowing full visual control
- Easy to integrate with existing design system

## Future Roadmap Alignment

assistant-ui's 2025 Q1 roadmap includes:
- **Chat Persistence**: Will support our future conversation storage needs
- **React 19 Support**: Keeps us compatible with latest React versions
- **Performance Improvements**: Continued optimization for production use

## Migration Path

1. **Phase 1**: Mock API integration for UI testing
2. **Phase 2**: Real Claude API integration with document context
3. **Phase 3**: Advanced features and conversation persistence
4. **Phase 4**: Multi-conversation support when ThreadList is needed

This phased approach allows for incremental testing and validation at each stage.