# CODING_GUIDELINES.md - Code Quality Standards for Spideryarn Reading

This document defines code quality standards and patterns to maintain consistency and prevent common issues across the Spideryarn Reading codebase.

## See also

- `docs/reference/CODING_PRINCIPLES.md` - High-level development principles and philosophy
- `docs/reference/ARCHITECTURE_DECISIONS.md` - System architecture and technical decisions
- `docs/reference/TESTING_OVERVIEW.md` - Testing approach and patterns
- `docs/instructions/DO_GIT_COMMITS.md` - Git workflow and commit guidelines
- `docs/reference/VERCEL_AI_SDK_REFERENCE.md` - Vercel AI SDK patterns and multi-provider support
- `docs/reference/AI_CHATBOT_ASSISTANT_UI_INTEGRATION.md` - Chat UI implementation with @assistant-ui/react
- `docs/reference/TOOL_SEARCH_TEXT.md` - Document search functionality using HTML text extraction
- `.eslintrc.json` and `tsconfig.json` - Linting and TypeScript configuration

## Code Quality Checks

Before committing code, always run these commands to ensure quality:

```bash
npm run lint    # Check for ESLint issues
npm run build   # Check for TypeScript compilation errors
npm test        # Run test suite
```

## Database Operations Safety

**CRITICAL**: Never run ANY database commands without explicit user permission:

```bash
# DESTRUCTIVE COMMANDS - require explicit user permission:
npm run db:reset     # Deletes all local database data
npx supabase db reset # Deletes all local database data
npx supabase db push # Applies migrations to database
npx supabase migration new # Creates new migration files

# SAFE READ-ONLY COMMANDS - can be run as needed:
npm run db:types     # Only regenerates TypeScript types
npx supabase status  # Read-only status check
```

⚠️ **ALWAYS ERR ON THE SIDE OF CAUTION**: When working with databases, production systems, or any operations that could affect data or functionality, always ask for explicit user permission first. If unsure whether something requires permission, ask!

## Import Standards

### Import Hygiene
- Remove unused imports immediately - they increase bundle size unnecessarily
- Use ES6 imports consistently throughout the codebase
- Never use CommonJS `require()` syntax except where absolutely necessary (e.g., dynamic imports)

### Import Organization
Group imports in this order, with blank lines between groups:
```typescript
// 1. React and core libraries
import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { Dialog } from '@radix-ui/react-dialog'
import { Info } from '@phosphor-icons/react'

// 3. Local utilities and services
import { cn } from '@/lib/utils'
import { llmProvider } from '@/lib/services/llm-provider'

// 4. Local components
import { Button } from '@/components/ui/button'
import { DocumentViewer } from '@/components/document-viewer'

// 5. Types (if separate from their modules)
import type { Document, Mutation } from '@/lib/types'
```

### ES6 Module Syntax
```typescript
// ❌ Bad - CommonJS
const fs = require('fs')
const { parse } = require('path')

// ✅ Good - ES6
import fs from 'fs'
import { parse } from 'path'
```

## TypeScript Best Practices

### Avoid `any` Types
Use specific types instead of `any` to maintain type safety:

```typescript
// ❌ Bad
function processElement(element: any) {
  return element.innerHTML
}

// ✅ Good
function processElement(element: Element) {
  return element.innerHTML
}

// ✅ Good - union types for flexibility
interface Metadata {
  [key: string]: string | number | boolean | undefined
}

// ✅ Good - type assertions when necessary
const windowWithDebugger = window as Window & { debugger?: MutationDebugger }
```

### Exception: Test Mocks
In test files, `any` types are sometimes necessary for mocking:
```typescript
// Acceptable in tests
const mockFunction = jest.fn() as any
const mockAdapter = { run: jest.fn() } as any
```

### Interface Definitions
Define clear interfaces for complex objects:
```typescript
// ✅ Good
interface WindowWithDebugger extends Window {
  mutationDebugger?: MutationDebugger
}

interface MockRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
}
```

## React Patterns

### Hook Dependencies
Always include all dependencies in React hooks or use `useCallback` for stable references:

```typescript
// ❌ Bad - missing dependency
useEffect(() => {
  generateSummary(content)
}, []) // Missing 'content' dependency

// ✅ Good - with dependency
useEffect(() => {
  generateSummary(content)
}, [content, generateSummary])

// ✅ Good - stable reference with useCallback
const generateSummary = useCallback(async () => {
  // Function implementation
}, [content])

useEffect(() => {
  generateSummary()
}, [generateSummary])
```

### Component Props
Use TypeScript interfaces for component props:
```typescript
// ✅ Good
interface DocumentViewerProps {
  document: Document
  className?: string
  onScroll?: (position: number) => void
}

export function DocumentViewer({ document, className, onScroll }: DocumentViewerProps) {
  // Component implementation
}
```

### Phosphor Icons SSR
Use correct imports based on component type:
```typescript
// Server components - SSR imports
import { Warning } from "@phosphor-icons/react/dist/ssr/Warning"
import { Info } from "@phosphor-icons/react/dist/ssr/Info"

// Client components - standard imports
'use client'
import { Warning, Info } from "@phosphor-icons/react"
```

### AI Integration
- Use Vercel AI SDK Core (`generateText`, `streamText`) for LLM calls
- Follow multi-provider pattern in `lib/services/llm-provider.ts`
- See `docs/reference/VERCEL_AI_SDK_REFERENCE.md` for detailed patterns

### Chat UI
- Use @assistant-ui/react primitives for chat interfaces
- Follow implementation patterns in `components/assistant-chat.tsx`
- See `docs/reference/AI_CHATBOT_ASSISTANT_UI_INTEGRATION.md` for integration guide

## Client/Server Components

Use `'use client'` directive for components with:
- React hooks (useState, useEffect, etc.)
- Event handlers
- Browser-only APIs

```typescript
// Client component
'use client'
import { useState } from 'react'

// Server component (default - no directive)
import { headers } from 'next/headers'
```

## API Route Patterns

### Structure
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
        { status: 400 }
      )
    }
    
    // Process valid data
    console.log('[API Name] Processing:', result.data)
    
  } catch (error) {
    console.error('[API Name] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Type-First Development

### Zod Schemas
Define validation schemas for all API inputs/outputs:
```typescript
export const requestSchema = z.object({
  content: z.string().min(1),
  options: z.object({
    temperature: z.number().optional(),
  })
})

type RequestData = z.infer<typeof requestSchema>
```

### Strict TypeScript
- Define explicit return types for complex functions
- Use discriminated unions for variants
- Prefer `type` for unions, `interface` for objects

## Component Patterns

### File Structure
```typescript
'use client' // If needed

import React from 'react'
// Other imports...

interface ComponentProps {
  isLoading?: boolean  // Boolean prefix: is/has/should
  onSubmit?: () => void  // Callback prefix: on
  children: React.ReactNode
}

export function ComponentName({ isLoading, onSubmit, children }: ComponentProps) {
  // Component logic
}
```

### Hooks
- Always prefix with `use`
- Return objects with clear property names
- Include cleanup in useEffect

```typescript
export function useFeatureName(): {
  data: Data | null
  isLoading: boolean
  error: Error | null
} {
  // Hook implementation
}
```

## File Naming

- Components: `kebab-case.tsx`
- Hooks: `camelCase.ts` (useElementVisibility.ts)
- Types: `kebab-case.ts`
- Tests: `component-name.test.tsx`

## Import Paths

Always use absolute imports with `@/` prefix:
```typescript
// ❌ Bad
import { Button } from '../../../components/ui/button'

// ✅ Good
import { Button } from '@/components/ui/button'
```

## Testing Patterns

### Structure
```typescript
describe('ComponentName', () => {
  it('should handle specific behavior', () => {
    // Test implementation
  })
})
```

### Mock Next.js Components
```typescript
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => 
    <a href={href} {...props}>{children}</a>
}))
```

## Logging Patterns

```typescript
// API/Service logs with context
console.log('[ComponentName] Action:', { data, timestamp: new Date().toISOString() })
console.error('[ComponentName] Error:', error)

// Remove debug logs before committing
// console.log('DEBUG:', temporaryValue)  // ❌ Don't commit
```

## Async Patterns

Always use async/await over promises:
```typescript
// ❌ Bad
fetch('/api/data').then(res => res.json()).then(data => ...)

// ✅ Good
const response = await fetch('/api/data')
const data = await response.json()
```

Use early returns to reduce nesting:
```typescript
if (!data) {
  return null  // Early return
}

if (error) {
  return <ErrorComponent error={error} />
}

// Main logic here
```

## ESLint Disable Comments

Only use with specific reason:
```typescript
// eslint-disable-next-line @next/next/no-img-element -- Mock component for testing
```

## Common Anti-Patterns

- Dead code and unused imports
- Debug console.logs in production code
- TODO comments (use planning docs instead)
- Magic numbers (use named constants)
- Relative imports beyond siblings
- Promise chains instead of async/await

## Tailwind CSS v4 Considerations

We use Tailwind CSS v4 beta, which has breaking changes from v3:

### Typography/Prose Classes
```css
/* ❌ v3 syntax - causes errors */
@import "@tailwindcss/typography";

/* Current implementation - using plugin directive */
@plugin "@tailwindcss/typography";
```

### Key Differences from v3
- Plugin system uses `@plugin` directive instead of JavaScript config
- CSS-first configuration with `@theme` directives
- Some v3 plugins need updates for v4 compatibility

### Current Setup
- PostCSS via `@tailwindcss/postcss` v4
- Typography plugin: `@plugin "@tailwindcss/typography"`
- Theme customization in `app/globals.css`

## Web Search Notes

**Last updated: 31/05/2025**

### Next.js 15 & React 19 (Searched 31/05/2025)
- App Router requires React 19 RC (not 18)
- Use Server Components by default
- Enable `bundlePagesRouterDependencies` for optimization
- Sources: augustinfotech.com/blogs/nextjs-best-practices-in-2025, nextjs.org/blog/next-15

### Tailwind CSS v4 Beta (Searched 31/05/2025)
- 100x faster with Vite plugin
- Native CSS features: cascade layers, container queries
- Most projects ship <10kB CSS
- Source: tailwindcss.com/blog/tailwindcss-v4-beta

### Vercel AI SDK (Searched 31/05/2025)
- Use streaming-first for chat UIs
- Set proper headers: `x-vercel-ai-data-stream: v1`
- Edge Runtime recommended for performance
- Sources: ai-sdk.dev, vercel.com/blog/introducing-the-vercel-ai-sdk

### Supabase Security (Searched 31/05/2025)
- Always enable Row Level Security (RLS)
- Use `supabase-ssr` for cookie-based auth
- Never expose service role key client-side
- Source: supabase.com/docs/guides/auth/server-side/nextjs

## URL Slugification

### Library Choice: `slug`

Use the `slug` library for all URL-friendly slug generation throughout the application:

```typescript
import slug from 'slug'
import { generateSlug, findDocumentBySlug } from '@/lib/utils/slug'

// ❌ Bad - manual implementation
const badSlug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

// ✅ Good - use utility functions
const goodSlug = generateSlug(title)
const document = findDocumentBySlug(documents, targetSlug)
```

### Why `slug` Library?

1. **Active maintenance** - Updated regularly (as of 2024)
2. **Native TypeScript support** - No need for separate type packages
3. **Unicode handling** - Properly handles international characters
4. **Small bundle size** - Lightweight and performant
5. **Robust edge cases** - Handles special characters, spacing, etc.

### Usage Patterns

```typescript
// Document URL generation
const documentSlug = generateSlug(document.title)
const url = `/documents/${documentSlug}`

// Slug-to-document mapping
const foundDoc = findDocumentBySlug(allDocuments, urlSlug)
```

### Utility Functions

All slug-related operations should use these centralized functions:

- `generateSlug(text)` - Convert text to URL-friendly slug
- `findDocumentBySlug(documents, slug)` - Find document by matching title to slug

**Location**: `@/lib/utils/slug.ts`

This ensures consistent slug generation across document listing, routing, and API endpoints.

## Utility Functions

### HTML Text Extraction

For extracting clean text from HTML content, use the centralised `extractCleanText()` utility:

```typescript
import { extractCleanText } from '@/lib/utils/html-text-extraction'

// ❌ Bad - regex-based HTML stripping
const badText = htmlContent.replace(/<[^>]*>/g, '')

// ✅ Good - DOM-based extraction
const goodText = extractCleanText(htmlContent)
```

#### Why Use DOM Parsing?

1. **Security** - Avoids regex vulnerabilities with malformed HTML
2. **Accuracy** - Properly handles nested tags and special characters
3. **Filtering** - Automatically removes script/style content
4. **Edge cases** - Handles self-closing tags, comments, CDATA sections
5. **Normalisation** - Consistent whitespace handling

#### Usage Examples

```typescript
// Simple HTML
const html = '<p>The <strong>important</strong> text</p>'
const text = extractCleanText(html) // "The important text"

// Complex HTML with scripts
const complex = `
  <div>
    <h1>Title</h1>
    <script>alert('ignored')</script>
    <p>Paragraph</p>
  </div>
`
const clean = extractCleanText(complex) // "Title Paragraph"

// Search functionality
const searchableText = extractCleanText(element.content)
const matches = searchableText.toLowerCase().includes(query.toLowerCase())
```

#### Implementation Details

- **Browser**: Uses native DOMParser for robust HTML parsing
- **Server**: Falls back to enhanced regex (avoids jsdom bundle issues)
- **Error handling**: Graceful fallback for malformed HTML
- **Performance**: Early return for non-HTML strings

**Location**: `@/lib/utils/html-text-extraction.ts`

This utility ensures consistent, secure text extraction across document search, previews, and AI processing.

## Appendix: Future Considerations

### Performance
- React Server Components optimization
- Web Vitals monitoring  
- Virtual scrolling for long documents

### Accessibility
- ARIA patterns for custom components
- Keyboard navigation testing

### Security (Post-MVP)
- Input sanitization
- Rate limiting
- CSP headers

These topics will be addressed as the project matures beyond prototype phase.