# CODING_GUIDELINES.md - Code Quality Standards for Spideryarn Reading

This document defines code quality standards and patterns to maintain consistency and prevent common issues across the Spideryarn Reading codebase.

## See also

- `docs/CODING_PRINCIPLES.md` - High-level development principles and philosophy
- `docs/ARCHITECTURE.md` - System architecture and technical decisions
- `docs/TESTING.md` - Testing approach and patterns
- `docs/GIT_COMMITS.md` - Git workflow and commit guidelines
- `.eslintrc.json` and `tsconfig.json` - Linting and TypeScript configuration

## Code Quality Checks

Before committing code, always run these commands to ensure quality:

```bash
npm run lint    # Check for ESLint issues
npm run build   # Check for TypeScript compilation errors
npm test        # Run test suite
```

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

## Appendix: Future Considerations

### Error Boundaries
- React error boundary components for graceful failures
- Sentry/error tracking integration

### State Management
- When to adopt Zustand/Redux for complex state
- Optimistic UI update patterns

### Performance
- Web Vitals monitoring
- React Server Components optimization
- Bundle splitting strategies

### Accessibility
- ARIA patterns for custom components
- Keyboard navigation testing
- Screen reader compatibility

### Security (Post-MVP)
- Input sanitization
- Rate limiting
- CSP headers

These topics will be addressed as the project matures beyond prototype phase.