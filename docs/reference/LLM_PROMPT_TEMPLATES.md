# LLM Prompt Templates Guide

This guide explains our two approaches for LLM integration in Spideryarn Reading, clarifying when to use each pattern.

## 🎯 Two LLM Usage Patterns

We use **different approaches** for different types of LLM interactions:

### 1. **Single-Use Prompts**: Nunjucks + Zod Template System ✅
- **For**: Document analysis, summarisation, glossary extraction, heading generation
- **Also includes**: Chat system prompts (the initial system message)
- **Pattern**: One request → one response, predictable input/output
- **Implementation**: `executePrompt()` with Nunjucks templates and Zod validation

### 2. **Multi-Turn Chat**: Vercel AI SDK + @assistant-ui/react ✅  
- **For**: Interactive conversations, multi-turn document discussions
- **Pattern**: Ongoing conversation state, streaming responses, message history
- **Implementation**: Direct Vercel AI SDK calls with @assistant-ui/react for UI

## ⚠️ Standard Implementation Pattern

**All new single-use LLM functionality MUST use the Nunjucks + Zod template system.** This is not optional - it's the architectural standard for predictable AI operations in Spideryarn Reading.

See also:
- [CHATBOT_ASSISTANT_UI_INTEGRATION.md](CHATBOT_ASSISTANT_UI_INTEGRATION.md) - For chat interface implementations
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Overall system architecture decisions
- [TOOL_SUMMARISE.md](TOOL_SUMMARISE.md) and [TOOL_GLOSSARY.md](TOOL_GLOSSARY.md) - Examples of template system usage
- [LLM_TRACKING_TOKEN_USAGE_LOGGING.md](LLM_TRACKING_TOKEN_USAGE_LOGGING.md) - Comprehensive guide for token usage tracking and cost management

## Overview

We use a hybrid approach:
- **Nunjucks** (.njk files) for prompt templates - familiar syntax like Jinja
- **Zod** for runtime validation and TypeScript type safety
- Templates and schemas live side-by-side for easy maintenance

## Understanding the Two Patterns

### Pattern 1: Single-Use Prompts (Nunjucks Template System)

**Use this for**: Document analysis, content generation, one-off AI operations

**Examples in codebase**:
- Summarisation (`/api/summarise`)
- Glossary extraction (`/api/glossary`) 
- Heading generation (`/api/headings`)
- Chat system prompt (initial system message only)

**How it works**:
```typescript
// Uses executePrompt() with template validation
const result = await executePrompt(myFeaturePrompt, {
  content: documentContent,
  analysisType: 'summary'
})
```

### Pattern 2: Multi-Turn Chat (Direct Vercel AI SDK)

**Use this for**: Interactive conversations, ongoing dialogue, stateful interactions

**Examples in codebase**:
- Chat conversations (`/api/chat`)
- Multi-turn document Q&A
- Conversation persistence and threading

**How it works**:
```typescript
// Direct generateText() call with message history
const result = await generateText({
  model: getModel(),
  messages: conversationHistory, // Array of user/assistant messages
  maxTokens: config.maxOutputTokens
})
```

**Key distinction**: The chat system prompt (first message) uses a Nunjucks template, but the conversation flow itself uses direct Vercel AI SDK calls to handle message history, persistence, and real-time interactions.

## Creating a New Single-Use Prompt

### 1. Create the Nunjucks Template

Create a new `.njk` file in `/lib/prompts/templates/`:

```nunjucks
{# /lib/prompts/templates/my-feature.njk #}
Please analyze the following {{ contentType }}:

<document>
{{ content }}
</document>

{% if includeExamples %}
Consider these examples:
<examples>
{{ examples }}
</examples>
{% endif %}

Provide your analysis in {{ outputFormat }} format.
```

### 2. Create the TypeScript Schema

Create a `.ts` file next to your template:

```typescript
// /lib/prompts/templates/my-feature.ts
import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '@/lib/prompts/types'

// Define what variables your prompt needs
const myFeatureSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  contentType: z.enum(['text', 'code', 'data']),
  outputFormat: z.enum(['json', 'markdown', 'plain']).default('markdown'),
  includeExamples: z.boolean().optional().default(false),
  examples: z.string().optional()
})

// Load the template with validation
export const myFeaturePrompt = loadPromptTemplateFromCaller(
  'my-feature.njk',
  myFeatureSchema,
  {
    // model: determined by getModelForAICall() from environment
    maxTokens: 1024,                       // optional, defaults to model's maxOutputTokens
    temperature: 0,                        // optional, defaults to AI_CONFIG.DEFAULT_TEMPERATURE
  }
)
```

### 3. Use in API Route

Most prompt execution happens directly in API routes. Create `/app/api/my-feature/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { executePrompt } from '@/lib/prompts/types'
import { myFeaturePrompt } from '@/lib/prompts/templates/my-feature'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // executePrompt handles Zod validation, template rendering, and multi-provider support
    const result = await executePrompt(myFeaturePrompt, {
      content: body.content,
      contentType: body.contentType,
      outputFormat: body.outputFormat,
      includeExamples: body.includeExamples,
      examples: body.examples
    })
    
    return NextResponse.json({ result })
  } catch (error) {
    // Zod validation errors have helpful messages
    if (error instanceof Error && 'errors' in error) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error in my-feature API:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
```

## Token Usage Tracking

The prompt template system supports comprehensive token usage tracking through enhanced execution functions. See `docs/reference/LLM_TRACKING_TOKEN_USAGE_LOGGING.md` for complete documentation on token tracking, cost calculation, and usage analytics.

### Quick Reference

```typescript
// Standard function (backward compatible)
const text = await executePrompt(myPrompt, data)

// Enhanced function with usage tracking
const result = await executePromptWithUsage(myPrompt, data)
// Returns: { text: string, usage: PromptUsage, finishReason: string }

// For multimodal prompts (PDFs, images)
const result = await executeMultimodalPromptWithUsage(myPrompt, data)
```

## Model Configuration

AI model settings use a **model string** system with configuration centralised in `/lib/config/models.ts` (see [LLM_MODEL_CONFIGURATION.md](LLM_MODEL_CONFIGURATION.md) for details):

```typescript
// Model string format: provider:model:version[:thinking]
// Examples: 'anthropic:claude-3-5-haiku:20241022', 'google:gemini-2.0-flash:latest'

export const AI_CONFIG = {
  DEFAULT_TEMPERATURE: 0,
  DEFAULT_MAX_TOKENS: 1024,
} as const

// Get model configuration from environment
import { getModelForAICall } from '@/lib/config'
const { modelString, config } = getModelForAICall()
```

**Environment Variable Support:**
- **Tier keys**: `LLM_MODEL=anthropic-cheap` (backwards compatible)
- **Model strings**: `LLM_MODEL=anthropic:claude-3-5-haiku:20241022` (recommended)

### Multi-Provider Support

The system automatically handles multiple LLM providers:

- **Anthropic Claude**: `anthropic-cheap`, `anthropic-balanced`, `anthropic-expensive`
- **Google Gemini**: `google-cheap`, `google-balanced`, `google-expensive`

Set your preferred model using the `LLM_MODEL` environment variable:
```bash
LLM_MODEL=google-cheap npm run dev        # Fast and cost-effective for development
LLM_MODEL=anthropic-balanced npm run build  # Proven reliability for production
```

### Development vs Production Models

- **Development default**: `google-cheap` (Gemini 2.5 Flash - fast, large context window, cost-effective)
- **Production option**: `anthropic-balanced` (Claude Sonnet 4 - proven reliability and quality)
- **High-end option**: `anthropic-expensive` (Claude Opus 4 - maximum capability)

Templates use these defaults unless overridden in the `modelConfig` parameter:

```typescript
export const myFeaturePrompt = loadPromptTemplateFromCaller(
  'my-feature.njk',
  myFeatureSchema,
  {
    model: 'anthropic-balanced',  // Override global default for this template
    maxTokens: 1024,
    temperature: 0,
  }
)
```

**For detailed model comparison, see [docs/reference/LLM_MODEL_CONFIGURATION.md](LLM_MODEL_CONFIGURATION.md)**

**This centralised approach ensures:**
- Consistent AI behaviour across all features
- Easy provider/model switching via environment variables
- Clear cost and performance management
- Simplified testing and debugging
- Seamless switching between Claude and Gemini models

## Benefits of This Approach

1. **Type Safety**: Full TypeScript types from Zod schema
2. **Validation**: Runtime validation with clear error messages
3. **Multi-Provider Support**: Automatic handling of Claude and Gemini models
4. **Separation**: Prompts separate from code for easy editing
5. **Familiar Syntax**: Nunjucks is very similar to Jinja
6. **IDE Support**: Autocomplete for all prompt variables
7. **Cost Management**: Easy switching between cheap/balanced/expensive tiers

## Common Patterns

### XML-Style Delimiters for Input Documents

**Best Practice**: Use XML-style delimiters to clearly separate different parts of your prompts, especially for input documents and structured data. This helps LLMs better understand boundaries between instructions and content.

```nunjucks
Analyse the document below and extract key themes:

<document>
{{ documentContent }}
</document>

{% if additionalContext %}
<context>
{{ additionalContext }}
</context>
{% endif %}

Please provide your analysis in the following format:
<output_format>
- Theme 1: Description
- Theme 2: Description
</output_format>
```

Common delimiter patterns:
- `<document>...</document>` for main input documents
- `<context>...</context>` for additional context
- `<examples>...</examples>` for example content
- `<constraints>...</constraints>` for specific requirements
- `<output_format>...</output_format>` for expected output structure

### Optional Variables with Defaults
```typescript
const schema = z.object({
  tone: z.enum(['formal', 'casual']).default('formal'),
  maxLength: z.number().optional().default(100)
})
```

### Conditional Sections in Templates
```nunjucks
{% if context %}
<additional_context>
{{ context }}
</additional_context>
{% endif %}
```

### Array Handling
```nunjucks
<items>
{% for item in items %}
  <item>{{ item }}</item>
{% endfor %}
</items>
```

### Complex Validation
```typescript
const schema = z.object({
  content: z.string().min(10).max(10000),
  language: z.enum(['en', 'es', 'fr']),
  options: z.object({
    detailed: z.boolean(),
    technical: z.boolean()
  }).optional()
})
```

## Testing Your Prompts

```typescript
// Test the schema validation
const validInput = { content: "Test", contentType: "text" }
const result = myFeatureSchema.parse(validInput) // Should succeed

// Test with invalid input
const invalidInput = { content: "" }
myFeatureSchema.parse(invalidInput) // Will throw ZodError
```

## File Organization

```
/lib/prompts/
├── types.ts                          # Core types and utilities
└── templates/
    ├── two-sentence-summary.njk      # Template file
    ├── two-sentence-summary.ts       # Schema and loader
    ├── my-feature.njk               # Another template
    └── my-feature.ts                # Its schema
```

Keep templates and their schemas together for easy maintenance.

## Best Practices for Prompt Design

### Use XML Delimiters Consistently

When creating new prompts or updating existing ones, consistently use XML-style delimiters to improve LLM comprehension:

1. **Wrap all input documents** in `<document>` tags
2. **Use semantic tag names** that describe the content (e.g., `<requirements>`, `<constraints>`, `<examples>`)
3. **Be consistent** across all prompts in the codebase
4. **Consider nesting** for complex structures:
   ```nunjucks
   <analysis_request>
     <document>{{ content }}</document>
     <requirements>
       <format>{{ outputFormat }}</format>
       <length>{{ maxLength }}</length>
     </requirements>
   </analysis_request>
   ```

### Existing Templates to Update

Several existing templates in `/lib/prompts/templates/` could benefit from adding XML delimiters:
- `glossary.njk` - wrap document content
- `headings.njk` - wrap input document
- `summarise.njk` - wrap document content
- `semantic-search.njk` - wrap query and documents

This is an ongoing improvement - update templates as you work with them.

## Integration with Other Systems

### Chat Interface Integration

**Important**: Chat has a hybrid approach:

1. **System Prompt**: Uses Nunjucks template system (`chat-system.njk`) for the initial system message with document context
2. **Conversation Flow**: Uses direct Vercel AI SDK calls for multi-turn interactions, message history, and persistence

See [CHATBOT_ASSISTANT_UI_INTEGRATION.md](CHATBOT_ASSISTANT_UI_INTEGRATION.md) for complete chat implementation patterns.

### Existing Features

**Single-Use Prompts** (Nunjucks Template System):
- **Summarisation**: `/api/summarise` (see [TOOL_SUMMARISE.md](TOOL_SUMMARISE.md))
- **Glossary Generation**: `/api/glossary` (see [TOOL_GLOSSARY.md](TOOL_GLOSSARY.md))
- **Heading Generation**: `/api/headings`
- **Chat System Prompt**: `chat-system.njk` (initial message only)

**Multi-Turn Chat** (Direct Vercel AI SDK):
- **Chat Conversations**: `/api/chat` conversation flow (see [CHATBOT_ASSISTANT_UI_INTEGRATION.md](CHATBOT_ASSISTANT_UI_INTEGRATION.md))
- **Persistence**: Thread management and message history
- **Real-time Interactions**: @assistant-ui/react integration

All new **single-use AI features** should use the Nunjucks + Zod template system. **Interactive chat features** should follow the pattern established in `/api/chat` and `usePersistentChat`.