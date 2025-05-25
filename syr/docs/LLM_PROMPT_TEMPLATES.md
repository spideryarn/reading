# LLM Prompt Templates Guide

This guide explains how to create new AI/LLM calls using our Nunjucks + Zod template system.

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
import { loadPromptTemplate } from '../types'
import { join } from 'path'

// Define what variables your prompt needs
const myFeatureSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  contentType: z.enum(['text', 'code', 'data']),
  outputFormat: z.enum(['json', 'markdown', 'plain']).default('markdown'),
  includeExamples: z.boolean().optional().default(false),
  examples: z.string().optional()
})

// Load the template with validation
export const myFeaturePrompt = loadPromptTemplate(
  join(__dirname, 'my-feature.njk'),
  myFeatureSchema,
  {
    model: 'claude-3-5-sonnet-20241022',  // optional, defaults to this
    maxTokens: 1024,                       // optional, defaults to 1024
    temperature: 0,                        // optional, defaults to 0
  }
)
```

### 3. Create the Service Function

Add to `/lib/services/anthropic.ts` or create a new service file:

```typescript
// /lib/services/my-feature.ts
import Anthropic from '@anthropic-ai/sdk'
import { executePrompt } from '@/lib/prompts/types'
import { myFeaturePrompt } from '@/lib/prompts/templates/my-feature'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function analyzeContent(
  content: string, 
  contentType: 'text' | 'code' | 'data',
  options?: {
    outputFormat?: 'json' | 'markdown' | 'plain'
    includeExamples?: boolean
    examples?: string
  }
): Promise<string> {
  return executePrompt(anthropic, myFeaturePrompt, {
    content,
    contentType,
    ...options
  })
}
```

### 4. Create the API Route

Create `/app/api/my-feature/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { analyzeContent } from '@/lib/services/my-feature'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // The service function handles validation via Zod
    const result = await analyzeContent(
      body.content,
      body.contentType,
      {
        outputFormat: body.outputFormat,
        includeExamples: body.includeExamples,
        examples: body.examples
      }
    )
    
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