# Vercel AI SDK Reference

A comprehensive guide to the Vercel AI SDK library and its integration within the Spideryarn Reading codebase, focusing on the features and patterns most relevant to our use cases.

## See also

### Internal Documentation and Code
- `lib/services/llm-provider.ts` - Our multi-provider abstraction layer implementation using AI SDK Core
- `app/api/chat/route.ts` - Chat API endpoint using `generateText` for document analysis
- `components/assistant-chat.tsx` - React chat UI component using @assistant-ui/react library
- `src/lib/hooks/useChatRuntime.ts` - Custom hook bridging AI SDK with @assistant-ui/react
- `docs/reference/AI_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Integration guide for @assistant-ui/react library
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Prompt template system using Zod validation
- `lib/config.ts` - AI model configuration and provider settings

### Official Vercel AI SDK Documentation
- [Vercel AI SDK Documentation](https://ai-sdk.dev/) - Official documentation homepage
- [AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core) - Core text generation functions
- [AI SDK UI](https://ai-sdk.dev/docs/ai-sdk-ui) - React hooks and UI integration
- [AI SDK Providers](https://ai-sdk.dev/providers/ai-sdk-providers) - Multi-provider support
- [Foundations: Streaming](https://ai-sdk.dev/docs/foundations/streaming) - Streaming concepts and implementation
- [Foundations: Providers and Models](https://ai-sdk.dev/docs/foundations/providers-and-models) - Provider abstraction architecture
- [Foundations: Tools](https://ai-sdk.dev/docs/foundations/tools) - Tool calling and function execution

### Specific API References
- [generateText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) - Complete API documentation
- [streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - Streaming text generation API
- [generateObject Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object) - Structured data generation API
- [streamObject Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-object) - Streaming structured data API
- [useChat Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - React chat hook documentation
- [useCompletion Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion) - Text completion hook
- [useAssistant Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-assistant) - Assistant API integration hook

### Provider-Specific Documentation
- [Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) - Claude model integration
- [Google Generative AI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) - Gemini model integration
- [Google Vertex AI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex) - Vertex AI integration
- [Community Providers](https://ai-sdk.dev/providers/community-providers) - Third-party and self-hosted providers

### Vercel Blog Posts and Updates
- [AI SDK 4.0 Release](https://vercel.com/blog/ai-sdk-4-0) - Major version update announcement
- [AI SDK 4.2 Release](https://vercel.com/blog/ai-sdk-4-2) - Recent features and provider updates
- [AI SDK 3.4 Release](https://vercel.com/blog/ai-sdk-3-4) - Historical context and evolution

### External Integration Libraries
- [@assistant-ui/react Documentation](https://www.assistant-ui.com/) - Chat UI library we currently use
- [Zod Documentation](https://zod.dev/) - Schema validation library for structured data

## Principles and Key Decisions

### Current Usage Patterns ✓
- **Non-streaming text generation**: Use `generateText` for document analysis tasks (summarisation, glossary extraction, heading generation)
- **Multi-provider abstraction**: Support both Anthropic Claude and Google Gemini models through unified interface
- **Type-safe prompts**: Integrate with Zod schemas for input validation and structured data handling
- **Chat API integration**: Bridge AI SDK with @assistant-ui/react for chat interface

### Future Considerations 📋
- **Streaming adoption**: Consider `streamText` for real-time chat responses to improve user experience
- **Tool calling**: Evaluate function calling capabilities for advanced document analysis features
- **Structured data**: Explore `generateObject`/`streamObject` for consistent API responses

## AI SDK Core: Text Generation

### generateText Function

The primary function for non-interactive text generation, ideal for document analysis and content creation.

**Source**: [AI SDK Core: generateText](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)

#### Basic Usage
```typescript
import { generateText } from 'ai'
import { getModel } from '@/lib/services/llm-provider'

const model = getModel('claude-3-5-haiku') // or 'gemini-1.5-flash'

const result = await generateText({
  model,
  prompt: 'Analyse this document and extract key themes...',
  maxTokens: 1000,
  temperature: 0, // Deterministic for document analysis
})

console.log(result.text) // Generated response
```

#### Advanced Features
```typescript
const result = await generateText({
  model,
  system: 'You are a document analysis assistant.',
  prompt: documentContent,
  maxTokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
  temperature: 0,
})

// Access metadata
console.log(result.finishReason) // 'stop', 'length', 'content-filter'
console.log(result.usage) // Token usage statistics
```

#### When to Use
- **Document analysis**: Summarisation, glossary extraction, heading generation
- **Batch processing**: Non-interactive content generation
- **Deterministic outputs**: When consistency is important (temperature: 0)
- **Simple workflows**: Single request-response patterns

### streamText Function

Enables real-time streaming of generated text, improving perceived performance for interactive applications.

**Sources**: 
- [AI SDK Core: streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [Foundations: Streaming](https://ai-sdk.dev/docs/foundations/streaming)

#### Basic Usage
```typescript
import { streamText } from 'ai'

const result = await streamText({
  model,
  prompt: 'Write a detailed analysis...',
})

// Stream individual chunks
for await (const textPart of result.textStream) {
  process.stdout.write(textPart)
}

// Or get complete response
const fullText = await result.text
```

#### Framework Integration
```typescript
// Next.js API Route
export async function POST(request: NextRequest) {
  const result = await streamText({
    model,
    messages: conversation,
  })
  
  return result.toDataStreamResponse()
}
```

#### When to Use
- **Interactive chat**: Real-time user conversations
- **Long responses**: Break up long waits with incremental updates
- **Dynamic UIs**: Update interface as content generates
- **Better UX**: Reduce perceived latency for users

### Response Helpers

The AI SDK provides convenient helpers for different frameworks:

```typescript
// Data stream (supports tool calls, structured data)
return result.toDataStreamResponse()

// Simple text stream
return result.toTextStreamResponse()

// Manual streaming
const stream = result.fullStream
for await (const chunk of stream) {
  // Handle each chunk type
}
```

## Multi-Provider Support

### Provider Abstraction Layer

The AI SDK standardises interactions across different LLM providers through a unified interface.

**Source**: [Foundations: Providers and Models](https://ai-sdk.dev/docs/foundations/providers-and-models)

#### Our Implementation
```typescript
// lib/services/llm-provider.ts
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

const providers = {
  anthropic: () => anthropic, // Claude models
  google: () => google,       // Gemini models
}

export function getModel(providerTierKey = 'claude-3-5-haiku') {
  const config = getModelConfig(providerTierKey)
  const provider = providers[config.provider]()
  return provider(config.modelId)
}
```

#### Provider Switching
Changing providers requires only model configuration updates:

```typescript
// Switch from Claude to Gemini
const claudeModel = getModel('claude-3-5-haiku')
const geminiModel = getModel('gemini-1.5-flash')

// Same API for both
const result = await generateText({ model: claudeModel, prompt })
const result2 = await generateText({ model: geminiModel, prompt })
```

### Supported Providers

#### Anthropic (Primary) ✓
- **Models**: Claude 3.5 Sonnet, Claude 3.5 Haiku
- **Features**: Reasoning support, image input, tool calling
- **Use cases**: Document analysis, summarisation, chat

#### Google (Secondary) ✓  
- **Models**: Gemini 1.5 Flash, Gemini 1.5 Pro
- **Features**: Multi-modal, fast inference, cost-effective
- **Use cases**: Development, testing, high-volume processing

#### Configuration Management
```typescript
// lib/config.ts
export const AI_CONFIG = {
  DEFAULT_MODEL: 'claude-3-5-haiku' as ProviderTierKey,
  DEFAULT_MAX_TOKENS: 4000,
  MODELS: {
    'claude-3-5-haiku': {
      provider: 'anthropic',
      modelId: 'claude-3-5-haiku-20241022',
      contextWindow: 200000,
      outputTokens: 8192,
    },
    'gemini-1.5-flash': {
      provider: 'google', 
      modelId: 'gemini-1.5-flash-latest',
      contextWindow: 1000000,
      outputTokens: 8192,
    },
  }
}
```

## Structured Data Generation

### generateObject Function

Constrains model outputs to specific schemas using Zod, JSON Schema, or Valibot.

#### Basic Usage
```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

const schema = z.object({
  title: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
})

const result = await generateObject({
  model,
  schema,
  prompt: 'Extract metadata from this document...',
})

// Type-safe access
console.log(result.object.title) // string
console.log(result.object.keywords) // string[]
```

#### Output Modes
```typescript
// Object mode (default)
const objectResult = await generateObject({
  model,
  schema: documentSchema,
  mode: 'object', // Single structured object
})

// Array mode  
const arrayResult = await generateObject({
  model,
  schema: itemSchema,
  mode: 'array', // Array of objects
})

// Enum mode
const enumResult = await generateObject({
  model,
  schema: z.enum(['positive', 'negative', 'neutral']),
  mode: 'enum', // Classification tasks
})
```

### streamObject Function

Real-time streaming of structured data as it's generated.

```typescript
const result = await streamObject({
  model,
  schema,
  prompt: 'Generate article metadata...',
})

// Stream partial objects
for await (const partialObject of result.partialObjectStream) {
  console.log(partialObject) // Incrementally built object
}

// Stream array elements  
for await (const element of result.elementStream) {
  console.log(element) // Complete array elements as available
}
```

#### Integration with Our Use Cases
```typescript
// Potential glossary extraction
const glossarySchema = z.object({
  terms: z.array(z.object({
    term: z.string(),
    definition: z.string(),
    context: z.string(),
  }))
})

// Could replace current string-based extraction
const glossary = await generateObject({
  model,
  schema: glossarySchema,
  prompt: glossaryPrompt,
})
```

## Tool Calling and Function Execution

### Tool Definition

Tools enable models to perform specific tasks beyond text generation.

#### Basic Tool Structure
```typescript
import { tool } from 'ai'
import { z } from 'zod'

const searchTool = tool({
  description: 'Search within document content',
  parameters: z.object({
    query: z.string().describe('Search query'),
    section: z.string().optional().describe('Specific section to search'),
  }),
  execute: async ({ query, section }) => {
    // Implementation
    return {
      results: await searchDocument(query, section),
      totalMatches: results.length,
    }
  },
})
```

#### Integration with Text Generation
```typescript
const result = await generateText({
  model,
  tools: { search: searchTool },
  toolChoice: 'auto', // Model decides when to use tools
  maxSteps: 3, // Allow multi-step tool usage
  messages: conversation,
})

// Access tool calls
if (result.toolCalls) {
  result.toolCalls.forEach(call => {
    console.log(`Called ${call.toolName}:`, call.args)
    console.log('Result:', call.result)
  })
}
```

### Tool Execution Patterns

#### Auto Mode (Recommended)
```typescript
const result = await generateText({
  model,
  tools: { search: searchTool, analyse: analyseTool },
  toolChoice: 'auto', // Model decides when appropriate
})
```

#### Required Mode
```typescript
const result = await generateText({
  model,
  tools: { extract: extractionTool },
  toolChoice: 'required', // Must use a tool
})
```

#### Specific Tool
```typescript
const result = await generateText({
  model,
  tools: { summarise: summaryTool },
  toolChoice: { type: 'tool', toolName: 'summarise' },
})
```

### Potential Applications for Spideryarn

#### Document Navigation Tool 🚧
```typescript
const navigationTool = tool({
  description: 'Navigate to specific document sections',
  parameters: z.object({
    sectionId: z.string(),
    action: z.enum(['scroll', 'highlight', 'summarise']),
  }),
  execute: async ({ sectionId, action }) => {
    // Integrate with our document viewer
    return await handleNavigation(sectionId, action)
  },
})
```

#### Content Analysis Tool 🚧
```typescript
const analysisTool = tool({
  description: 'Perform detailed analysis on document sections',
  parameters: z.object({
    content: z.string(),
    analysisType: z.enum(['summarise', 'extract-terms', 'find-themes']),
  }),
  execute: async ({ content, analysisType }) => {
    // Reuse our existing analysis functions
    switch (analysisType) {
      case 'summarise': return await generateSummary(content)
      case 'extract-terms': return await extractGlossary(content)
      case 'find-themes': return await identifyThemes(content)
    }
  },
})
```

## React Integration Patterns

### AI SDK UI Overview

The AI SDK provides React hooks for building interactive AI applications, though we currently use @assistant-ui/react for our chat interface.

#### Core Hooks Available

```typescript
// Built-in hooks (not currently used in our codebase)
import { useChat, useCompletion, useAssistant } from 'ai/react'

// Our current approach
import { useChatRuntime } from '@/src/lib/hooks/useChatRuntime'
```

### useChat Hook (Alternative Approach)

If we were to migrate from @assistant-ui/react, the built-in `useChat` would provide:

```typescript
const {
  messages,        // Chat history
  input,          // Current input value
  handleInputChange, // Input change handler
  handleSubmit,   // Form submission
  isLoading,      // Loading state
  error,          // Error state
} = useChat({
  api: '/api/chat',
  initialMessages: [],
  onFinish: (message) => {
    console.log('Message completed:', message)
  },
  onError: (error) => {
    console.error('Chat error:', error)
  },
})
```

#### Basic Chat UI
```typescript
function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()
  
  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
```

### Our Current Integration: @assistant-ui/react Bridge

We use a custom hook that bridges AI SDK with @assistant-ui/react:

```typescript
// src/lib/hooks/useChatRuntime.ts
export function useChatRuntime({ documentContext }) {
  const chatModelAdapter: ChatModelAdapter = {
    run: useCallback(async ({ messages, abortSignal }) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: conversationHistory,
          documentContext,
        }),
        signal: abortSignal,
      })
      
      const data = await res.json()
      return { content: [{ type: "text", text: data.response }] }
    }, [documentContext])
  }
  
  return useLocalRuntime(chatModelAdapter)
}
```

This approach provides:
- **Consistent UI**: @assistant-ui/react components with our design system
- **Flexible backend**: AI SDK Core for provider abstraction
- **Type safety**: Structured interfaces for chat data
- **Error handling**: Comprehensive error management and user feedback

### Performance Optimisations

#### Throttling Updates
```typescript
const { messages } = useChat({
  experimental_throttle: 100, // Throttle renders to every 100ms
})
```

#### Streaming Control
```typescript
const { setMessages } = useChat()

// Manual message control for complex UIs
setMessages(prevMessages => [
  ...prevMessages,
  { role: 'assistant', content: 'Custom message...' }
])
```

## Error Handling and Best Practices

### Error Categories

Our implementation handles several error types:

#### API Configuration Errors
```typescript
// API key missing or invalid
if (error.message.includes('API key') || error.message.includes('401')) {
  return NextResponse.json({
    error: 'API configuration error',
    details: 'The Anthropic API key is missing or invalid.',
    code: 'API_KEY_ERROR'
  }, { status: 500 })
}
```

#### Rate Limiting
```typescript
if (error.message.includes('rate limit') || error.message.includes('429')) {
  return NextResponse.json({
    error: 'Rate limit exceeded',
    details: 'Too many requests. Please wait before trying again.',
    code: 'RATE_LIMIT_ERROR'
  }, { status: 429 })
}
```

#### Network Errors
```typescript
if (error.message.includes('fetch') || error.message.includes('network')) {
  return NextResponse.json({
    error: 'Network error',
    details: 'Failed to connect to AI service.',
    code: 'NETWORK_ERROR'
  }, { status: 503 })
}
```

### Best Practices

#### Temperature Configuration
```typescript
// Deterministic for document analysis
const result = await generateText({
  model,
  temperature: 0, // Consistent outputs for analysis tasks
})

// Creative for content generation  
const result = await generateText({
  model,
  temperature: 0.7, // More variation for creative tasks
})
```

#### Token Management
```typescript
const result = await generateText({
  model,
  maxTokens: AI_CONFIG.DEFAULT_MAX_TOKENS, // 4000 tokens
  prompt: longDocumentContent,
})

// Check if truncated
if (result.finishReason === 'length') {
  console.warn('Response truncated due to token limit')
}
```

#### Prompt Engineering
```typescript
const systemPrompt = `You are an AI assistant helping users understand documents.

DOCUMENT CONTEXT:
${documentContext}

INSTRUCTIONS:
1. Base responses on the document content provided
2. Reference specific document sections when applicable
3. Acknowledge limitations when document lacks information
4. Keep responses concise but comprehensive`

const result = await generateText({
  model,
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationHistory
  ]
})
```

## Current Implementation Status

### Implemented Features ✓

- **Multi-provider support**: Anthropic Claude and Google Gemini models
- **Non-streaming text generation**: `generateText` for document analysis
- **Type-safe configuration**: Provider and model configuration management  
- **Error handling**: Comprehensive error categorisation and user feedback
- **Chat integration**: Bridge between AI SDK Core and @assistant-ui/react
- **Prompt templates**: Zod-validated prompt system with Nunjucks templates

### In Progress 🚧

- **Streaming migration**: Evaluating `streamText` for real-time chat responses
- **Performance optimisation**: Considering throttled updates and backpressure handling

### Planned Features 📋

- **Tool calling**: Document navigation and analysis tools
- **Structured extraction**: `generateObject` for consistent API responses  
- **Enhanced providers**: Support for additional model providers
- **Advanced streaming**: Real-time updates with progress indicators

### Architecture Considerations

#### Current: Non-Streaming API
```typescript
// app/api/chat/route.ts - Current implementation
const result = await generateText({
  model,
  messages: aiMessages,
  maxTokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
  temperature: 0,
})

return NextResponse.json({ response: result.text })
```

#### Future: Streaming API
```typescript
// Potential migration to streaming
const result = await streamText({
  model,
  messages: aiMessages,
})

return result.toDataStreamResponse()
```

## Troubleshooting

### Common Issues

#### Provider Initialisation
```bash
# Missing API keys
Error: ANTHROPIC_API_KEY environment variable is required

# Solution: Add to .env.local
ANTHROPIC_API_KEY=your_key_here
```

#### Model Configuration
```typescript
// Unknown model error
Error: Unknown provider: invalid-provider

// Solution: Check lib/config.ts for valid provider keys
const validModels = Object.keys(AI_CONFIG.MODELS)
```

#### Token Limits
```typescript
// Response truncation
if (result.finishReason === 'length') {
  // Reduce input length or increase maxTokens
  console.warn('Increase maxTokens or reduce prompt length')
}
```

#### Streaming Backpressure
```typescript
// For future streaming implementation
const result = await streamText({ model, prompt })

// Ensure stream consumption to prevent hanging
for await (const chunk of result.textStream) {
  // Must process each chunk for completion
  process(chunk)
}
```

### Debug Logging

Our implementation includes comprehensive logging:

```typescript
// Request logging
console.log('[Chat API] Processing conversation:', {
  messageCount: messages.length,
  documentContextLength: documentContext?.length || 0,
})

// Response logging  
console.log('[Chat API] Response generated:', {
  responseLength: response.length,
  finishReason: result.finishReason,
  usage: result.usage,
})

// Error logging
console.error('[Chat API] Error occurred:', {
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
})
```

## Migration Considerations

### From Non-Streaming to Streaming

#### Benefits of Migration
- **Improved UX**: Real-time response updates
- **Reduced wait times**: Incremental content display
- **Better perceived performance**: Users see immediate progress

#### Implementation Changes Required
```typescript
// Current: Single response
const result = await generateText({ model, messages })
return NextResponse.json({ response: result.text })

// Streaming: Continuous updates  
const result = await streamText({ model, messages })
return result.toDataStreamResponse()
```

#### Frontend Adaptations
- Update @assistant-ui/react integration for streaming
- Handle partial message updates
- Implement proper error handling for stream interruptions

### Tool Integration Roadmap

#### Phase 1: Document Navigation 📋
- Implement tools for section scrolling and highlighting
- Integrate with existing document viewer state management

#### Phase 2: Analysis Tools 📋  
- Create tools that wrap existing analysis functions
- Enable multi-step document processing workflows

#### Phase 3: Structured Responses 📋
- Migrate to `generateObject` for consistent API responses
- Implement type-safe data extraction and validation

## Appendix

### Model Capabilities Comparison

| Provider | Model | Context Window | Output Tokens | Speed | Cost | Best For |
|----------|-------|----------------|---------------|-------|------|----------|
| Anthropic | Claude 3.5 Haiku | 200K | 8K | Fast | Low | Development, quick analysis |
| Anthropic | Claude 3.5 Sonnet | 200K | 8K | Medium | Medium | Complex analysis, reasoning |
| Google | Gemini 1.5 Flash | 1M | 8K | Very Fast | Very Low | High-volume processing |
| Google | Gemini 1.5 Pro | 2M | 8K | Medium | Medium | Large document analysis |

### API Reference Quick Links

- [generateText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)  
- [generateObject Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object)
- [Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)

### Environment Variables Reference

```bash
# Required for Anthropic models
ANTHROPIC_API_KEY=your_anthropic_key

# Required for Google models  
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key

# Optional model override (defaults to claude-3-5-haiku)
LLM_MODEL=gemini-1.5-flash

# Optional server configuration
PORT=3000
```