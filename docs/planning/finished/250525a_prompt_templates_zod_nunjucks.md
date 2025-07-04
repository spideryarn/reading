# Prompt Template System Design

This is a docs/planning/decision doc.

see `LLM_PROMPT_TEMPLATES.md` for the final word on how this ended up.


## Decision (2025-01-25)

We've decided to use a hybrid approach combining Nunjucks templates with Zod validation. This gives us the separation of prompts from code (like Jinja in Python) while maintaining TypeScript's type safety. Prompts live in `.njk` files, schemas and rendering logic live in adjacent `.ts` files, and Zod validates all inputs before rendering.

---

# Original Planning Document

## Overview

This document outlines different approaches for managing LLM prompt templates in the Spideryarn Reading project.


## Quick Comparison: Jinja vs TypeScript

If you're coming from Python/Jinja, here's what changes:

| Jinja | TypeScript |
|-------|------------|
| `{{ variable }}` | `${variable}` |
| `{% if condition %}...{% endif %}` | `${condition ? 'true case' : 'false case'}` |
| Runtime validation | Compile-time + runtime with Zod |
| `.jinja` files | `.ts` files (or `.md` with hybrid) |
| No type checking | Full TypeScript types |

## Approach Comparison

### 1. TypeScript-Native with Zod (Recommended)

**Pros:**
- Full TypeScript type safety at compile time
- Runtime validation with excellent error messages
- Prompts are code - easy to version, review, and refactor
- IDE autocompletion for template variables
- No template compilation overhead
- Can colocate related logic with prompts

**Cons:**
- Prompts mixed with code (less separation)
- Requires learning Zod (though it's fairly intuitive)

**Simple Example:**
```typescript
const summaryPrompt = createPromptTemplate({
  schema: z.object({
    content: z.string().min(1),
    style: z.enum(['brief', 'detailed']).default('brief')
  }),
  template: ({ content, style }) => `Summarize this ${style === 'brief' ? 'concisely' : 'in detail'}: ${content}`
})
```

**Full Example with Zod:**
```typescript
import { z } from 'zod'
import { createPromptTemplate } from '../types'

// Step 1: Define what variables your prompt needs
const schema = z.object({
  input_text: z.string().min(1, 'Input text cannot be empty'),
  max_length: z.number().optional().default(100),
  tone: z.enum(['formal', 'casual']).optional().default('formal')
})

// Step 2: Create the prompt template
export const summaryPrompt = createPromptTemplate({
  name: 'text-summary',
  description: 'Summarizes text with configurable tone',
  schema: schema,
  
  // Step 3: Write your prompt (this replaces your .jinja file)
  template: ({ input_text, max_length, tone }) => 
`Please summarise the following text in a ${tone} tone, keeping it under ${max_length} words:

<text>
${input_text}
</text>`,
  
  modelConfig: {
    temperature: 0,
    maxTokens: 500
  }
})

// Step 4: Use it with full type safety
const result = await executePrompt(anthropic, summaryPrompt, {
  input_text: "Your long text here...",
  tone: "casual"  // TypeScript knows this must be 'formal' or 'casual'
  // max_length is optional, defaults to 100
})
```

**What Zod Does:**
- **Validates** input at runtime (throws clear errors if invalid)
- **Provides TypeScript types** (IDE autocompletion)
- **Sets defaults** for optional fields
- **Ensures required fields** are present

**Validation Examples:**
```typescript
// ✅ Valid
{ input_text: "Hello world", tone: "formal" }

// ❌ Invalid - will throw error
{ input_text: "", tone: "formal" }  // Empty string fails min(1)
{ input_text: "Hello" }             // Missing required 'tone'
{ input_text: "Hello", tone: "friendly" }  // Invalid enum value
```

### 2. Nunjucks Templates (Similar to your Python/Jinja approach)

**Pros:**
- Clear separation of prompts from code
- Familiar if coming from Python/Jinja
- Non-developers can edit templates
- Supports complex template logic (loops, conditionals)

**Cons:**
- Runtime template compilation
- Less TypeScript integration
- Need to maintain separate schema definitions
- Potential runtime errors from template syntax

**Example:**
```nunjucks
{# two-sentence-summary.njk #}
Please provide exactly 2 sentences that summarize the main thesis of:

{{ content }}

{% if includeContext %}
Consider this context: {{ context }}
{% endif %}
```

### 3. Hybrid Approach (Prompts in Separate Files)

You can keep prompts in separate files while still using Zod for validation:

**File: `prompts/summary.prompt.md`**
```markdown
Please summarise the following text in a {{tone}} tone:

<text>
{{input_text}}
</text>

Keep the summary under {{max_length}} words.
```

**File: `prompts/summary.ts`**
```typescript
import { z } from 'zod'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createPromptTemplate } from '../types'

// Load prompt from file
const promptText = readFileSync(
  join(__dirname, 'summary.prompt.md'), 
  'utf-8'
)

// Still get full validation
const schema = z.object({
  input_text: z.string().min(1),
  tone: z.enum(['formal', 'casual']),
  max_length: z.number().default(100)
})

export const summaryPrompt = createPromptTemplate({
  name: 'summary',
  schema: schema,
  
  // Simple variable replacement
  template: (vars) => {
    let prompt = promptText
    Object.entries(vars).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    })
    return prompt
  }
})
```

**Pros of Hybrid:**
- Prompts in separate files (easier to review/edit)
- Still get Zod validation and TypeScript types
- Non-developers can edit `.prompt.md` files

**Cons:**
- More complex setup
- Simple string replacement (no conditionals like Jinja)
- Need to handle file loading

## Recommendation

I recommend the **TypeScript-native approach with Zod** because:

1. **Type Safety**: You get compile-time checking of prompt variables
2. **Refactoring**: IDEs can help refactor across prompts
3. **Testing**: Easier to unit test prompt generation
4. **Performance**: No runtime template compilation
5. **Debugging**: Stack traces point directly to prompt code

However, if you have non-technical team members who need to edit prompts, or if you want to A/B test prompt variations without code changes, the Nunjucks approach might be better.

## Migration Example

To migrate your existing function:

```typescript
// Before
export async function generateTwoSentenceSummary(content: string): Promise<string> {
  const prompt = `Please provide exactly 2 sentences...${content}`
  // ... anthropic call
}

// After
import { twoSentenceSummaryPrompt } from '@/lib/prompts/templates/summarize'
import { executePrompt } from '@/lib/prompts/types'

export async function generateTwoSentenceSummary(content: string): Promise<string> {
  return executePrompt(anthropic, twoSentenceSummaryPrompt, { content })
}
```

## Common Zod Patterns for Prompts

```typescript
// Required vs Optional
z.string()                    // Required
z.string().optional()         // Optional (can be undefined)
z.string().default("value")   // Optional with default

// String constraints
z.string().min(1)             // Non-empty
z.string().max(1000)          // Length limit
z.string().url()              // Must be valid URL
z.string().email()            // Must be valid email

// Numbers
z.number().int()              // Integer only
z.number().positive()         // > 0
z.number().min(0).max(100)    // Range

// Enums (for multiple choice)
z.enum(['option1', 'option2'])
z.union([z.literal('yes'), z.literal('no')])

// Arrays
z.array(z.string())           // Array of strings
z.array(z.string()).min(1)    // Non-empty array

// Complex objects
z.object({
  user: z.object({
    name: z.string(),
    preferences: z.array(z.string())
  }),
  settings: z.record(z.boolean())  // Object with boolean values
})
```

## Real-World Example: Document Summary Prompt

```typescript
// For hierarchical document summaries
const hierarchicalSummarySchema = z.object({
  // The text to summarize
  content: z.string().min(10, "Content too short to summarize"),
  
  // Parent section's summary for context
  parentSummary: z.string().optional(),
  
  // Nesting level (0 = top level)
  level: z.number().int().min(0).max(5),
  
  // Target audience
  audience: z.enum(['expert', 'student', 'general']).default('general'),
  
  // Length constraints
  minSentences: z.number().int().min(1).default(2),
  maxSentences: z.number().int().min(1).default(5),
  
  // What to emphasize
  focus: z.enum(['main-points', 'technical-details', 'implications']).optional(),
  
  // Previous summaries at same level (for consistency)
  siblingContext: z.array(z.string()).optional()
})

// The prompt template
export const hierarchicalSummaryPrompt = createPromptTemplate({
  name: 'hierarchical-summary',
  schema: hierarchicalSummarySchema,
  
  template: ({ content, parentSummary, level, audience, minSentences, maxSentences, focus, siblingContext }) => {
    const contextSection = parentSummary 
      ? `\nContext from parent section: ${parentSummary}\n` 
      : ''
    
    const audienceGuidance = {
      expert: 'using technical terminology where appropriate',
      student: 'explaining technical concepts clearly',
      general: 'using accessible language'
    }
    
    const focusGuidance = focus ? {
      'main-points': 'Focus on the key arguments and conclusions.',
      'technical-details': 'Emphasize technical details and methodology.',
      'implications': 'Highlight the implications and significance.'
    }[focus] : ''
    
    return `You are summarizing a level ${level} section of a document for a ${audience} audience.
${contextSection}
Please summarize the following content in ${minSentences}-${maxSentences} sentences, ${audienceGuidance[audience]}.
${focusGuidance}

<content>
${content}
</content>

${siblingContext?.length ? `\nFor consistency, here are summaries of sibling sections:\n${siblingContext.join('\n')}` : ''}`
  }
})
```

## Next Steps

1. Install zod: `npm install zod`
2. Choose your approach:
   - **Pure TypeScript**: Best for type safety and refactoring
   - **Hybrid**: Best if you want prompts in separate files
   - **Nunjucks**: Best for complex template logic
3. Create base types in `/lib/prompts/types.ts`
4. Migrate existing prompts to new system
5. Set up testing for prompt validation