# LLM Prompt Templates Guide

This guide explains how to create new AI/LLM calls using our Nunjucks + Zod template system.

## ⚠️ Standard Implementation Pattern

**All new LLM functionality MUST use this template system.** This is not optional - it's the architectural standard for AI integration in Spideryarn Reading.

See also:
- [CHATBOT_ASSISTANT_UI_INTEGRATION.md](CHATBOT_ASSISTANT_UI_INTEGRATION.md) - For chat interface implementations
- [ARCHITECTURE.md](ARCHITECTURE.md) - Overall system architecture decisions
- [AI_SUMMARISE.md](AI_SUMMARISE.md) and [AI_GLOSSARY.md](AI_GLOSSARY.md) - Examples of template system usage

## Overview

We use a hybrid approach:
- **Nunjucks** (.njk files) for prompt templates - familiar syntax like Jinja
- **Zod** for runtime validation and TypeScript type safety
- Templates and schemas live side-by-side for easy maintenance

## Creating a New Prompt

### 1. Create the Nunjucks Template

Create a new `.njk` file in `/lib/prompts/templates/`:

```nunjucks
{# /lib/prompts/templates/my-feature.njk #}
Please analyze the following {{ contentType }}:

{{ content }}

{% if includeExamples %}
Consider these examples: {{ examples }}
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
    // model: usually omitted to use global default from AI_CONFIG
    maxTokens: 1024,                       // optional, defaults to AI_CONFIG.DEFAULT_MAX_TOKENS
    temperature: 0,                        // optional, defaults to AI_CONFIG.DEFAULT_TEMPERATURE
  }
)
```

### 3. Use in API Route

Most prompt execution happens directly in API routes. Create `/app/api/my-feature/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { executePrompt } from '@/lib/prompts/types'
import { myFeaturePrompt } from '@/lib/prompts/templates/my-feature'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // executePrompt handles Zod validation and template rendering
    const result = await executePrompt(anthropic, myFeaturePrompt, {
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

## Model Configuration

AI model settings are centralised in `/lib/config.ts` (see [ARCHITECTURE.md](ARCHITECTURE.md) for rationale):

```typescript
// Override with LLM_MODEL environment variable for development/testing
// Example: LLM_MODEL=claude-3-haiku-20240307 npm run dev (faster & cheaper for dev)
export const AI_CONFIG = {
  DEFAULT_MODEL: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
  DEFAULT_TEMPERATURE: 0,
  DEFAULT_MAX_TOKENS: 1024,
} as const
```

### Development vs Production Models

- **Production default**: `claude-sonnet-4-20250514` (smart, high-quality)
- **Development option**: Set `LLM_MODEL=claude-3-haiku-20240307` in `.env.local` (faster, ~20x cheaper)
- **Override for testing**: `LLM_MODEL=claude-sonnet-4-20250514 npm run dev` when you need smart AI

Templates use these defaults unless overridden in the `modelConfig` parameter. Most templates should omit model specification to use the global default.

**This centralised approach ensures:**
- Consistent AI behaviour across all features
- Easy model upgrades when new versions are released
- Clear cost and performance management
- Simplified testing and debugging

## Benefits of This Approach

1. **Type Safety**: Full TypeScript types from Zod schema
2. **Validation**: Runtime validation with clear error messages
3. **Separation**: Prompts separate from code for easy editing
4. **Familiar Syntax**: Nunjucks is very similar to Jinja
5. **IDE Support**: Autocomplete for all prompt variables

## Common Patterns

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
Additional context: {{ context }}
{% endif %}
```

### Array Handling
```nunjucks
{% for item in items %}
- {{ item }}
{% endfor %}
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

## Integration with Other Systems

### Chat Interface Integration
For interactive chat functionality, this template system integrates seamlessly with assistant-ui components. See [CHATBOT_ASSISTANT_UI_INTEGRATION.md](CHATBOT_ASSISTANT_UI_INTEGRATION.md) for detailed implementation patterns.

### Existing Features
Current implementations using this system:
- **Summarisation**: `/api/summarise` (see [AI_SUMMARISE.md](AI_SUMMARISE.md))
- **Glossary Generation**: `/api/glossary` (see [AI_GLOSSARY.md](AI_GLOSSARY.md))
- **Heading Generation**: `/api/headings` 
- **Chat Interface**: `/api/chat` (see [CHATBOT_ASSISTANT_UI_INTEGRATION.md](CHATBOT_ASSISTANT_UI_INTEGRATION.md))

All new AI features should follow the same pattern established by these implementations.