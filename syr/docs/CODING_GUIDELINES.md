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

## Component Testing

### Mocking Next.js Components
When testing components that use Next.js features:
```typescript
// Mock Next.js Link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: LinkProps & { children: React.ReactNode }) {
    return <a href={href as string} {...props}>{children}</a>
  }
})

// Mock Next.js Image with ESLint disable
jest.mock('next/image', () => {
  return function MockImage({ alt, ...props }: ImageProps) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  }
})
```

### Type-Safe Test Helpers
Convert test helpers to TypeScript for better type safety:
```typescript
// ✅ Good - TypeScript test helper
interface MockRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
}

export function createMockRequest(options: MockRequestOptions = {}) {
  return new Request('http://localhost:3000/api/test', {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}
```

## ESLint Disable Comments

Use ESLint disable comments sparingly and only when truly necessary:
```typescript
// ✅ Good - specific disable with explanation
// eslint-disable-next-line @next/next/no-img-element -- Mock component for testing
<img src="..." alt="..." />

// ❌ Bad - disabling entire file or broad rules
/* eslint-disable */
```

## Common Patterns to Avoid

1. **Dead Code**: Remove unused functions, variables, and imports immediately
2. **Console Logs**: Remove debugging console.log statements before committing (except intentional logging)
3. **TODO Comments**: Create issues or planning docs instead of leaving TODOs in code
4. **Magic Numbers**: Use named constants for repeated values
5. **Inline Styles**: Use Tailwind classes or CSS modules instead

## Performance Considerations

### Bundle Size
- Remove unused imports and dead code
- Use dynamic imports for large libraries used in specific routes
- Check bundle analyzer output periodically

### React Optimization
- Use `useCallback` and `useMemo` for expensive computations
- Avoid creating new objects/arrays in render unless necessary
- Use React.memo for pure components with expensive renders

## Tailwind CSS v4 Considerations

We use Tailwind CSS v4 beta, which has breaking changes from v3:

### Typography/Prose Classes
```css
/* ❌ v3 syntax - causes errors */
@import "@tailwindcss/typography";

/* ✅ v4 alternatives */
@plugin "@tailwindcss/typography";  // Option 1: Plugin directive
.prose { /* styles */ }              // Option 2: Manual CSS (we use this)
```

### Library Selection
- Verify v4 compatibility before adding Tailwind plugins
- Many v3 plugins don't work with v4's new architecture
- Manual CSS often more reliable than incompatible plugins

### Current Implementation
- Manual prose styles in `app/globals.css:287-473`
- CSS-first config with `@theme` directives
- PostCSS via `@tailwindcss/postcss` v4

## Appendix: Possible other ideas that maybe should be part of our coding guidelines - needs further discussion

### Error Handling Patterns
- Standardised error boundary components
- Consistent error message formatting
- Logging strategy for production vs development

### API Response Patterns
- Standardised response format across all API routes
- Consistent error response structure
- Rate limiting implementation

### State Management
- When to use React Context vs props
- Patterns for complex form state
- Optimistic UI updates

### Documentation in Code
- JSDoc standards for public APIs
- When to add inline comments
- Component documentation requirements

### Accessibility Standards
- ARIA label requirements
- Keyboard navigation patterns
- Screen reader testing approach

### Performance Monitoring
- Web Vitals tracking
- Performance budgets
- Lighthouse CI integration

### Security Practices
- Input validation patterns
- CSRF protection
- Content Security Policy headers

### Database Query Patterns
- Query optimization guidelines
- Connection pooling best practices
- Migration testing requirements

These topics may warrant their own documentation or inclusion in existing docs as the project matures.