# Debugging Summary: Summarization Content Issue

## Goal

Fix the document summarization feature which is incorrectly summarizing compiled Next.js code instead of the actual document content (Chalmers consciousness paper).

## Context

User reports that visiting `http://localhost:3000/documents/chalmers` generates a summary about "compiled Next.js application bundle" instead of the expected Chalmers consciousness paper content.

## Symptoms

- API endpoint `/api/summarise` (renamed from `/api/summarize`) works correctly
- Summary output indicates Next.js/JavaScript code is being processed instead of document content
- Expected: Summary of Chalmers consciousness paper
- Actual: Summary of compiled Next.js bundle discussing API routes and Claude AI implementation

## Investigation Results

### ✅ WORKING: HTML to Markdown Conversion
- Created test script that successfully converts Chalmers HTML to proper Markdown
- Conversion output starts with "Facing Up to the Problem of Consciousness" and contains expected content
- HTML file (80,460 chars) converts to Markdown (77,251 chars) with proper structure
- TurndownService configuration working correctly with ATX headings and fenced code blocks

### ✅ WORKING: API Endpoint Rename
- Successfully renamed `/api/summarize` to `/api/summarise` in:
  - `components/document-summary.tsx:20` - Fixed fetch URL
  - API route file already at correct path: `app/api/summarise/route.ts`

### ✅ WORKING: DocumentParser Integration
- Added `convertToMarkdown()` method to DocumentParser class with proper TypeScript documentation
- Method uses TurndownService with appropriate configuration
- Document page updated to use `markdownContent` instead of raw HTML

### ✅ ADDED: Comprehensive Logging
- Added console.log statements at three pipeline stages:
  1. Document Page: HTML and Markdown content preview/length
  2. DocumentSummary Component: Content preview sent to API
  3. API Route: Content received and processed
- Logging will reveal where incorrect content enters the pipeline

## Key Technical Findings

### Conversion Process Works Correctly
```javascript
// Test confirmed this flow works:
HTML (Chalmers paper) → TurndownService → Markdown (consciousness content)
```

### Pipeline Architecture
```
Document Page → convertToMarkdown() → DocumentSummary → API Route → Claude
```

## ✅ SOLUTION FOUND AND IMPLEMENTED

### Root Cause Analysis
After adding comprehensive logging throughout the pipeline, we discovered the issue was **not** with content processing but with the **prompt template system architecture**. The problem occurred in the transition from a simple string-based prompt to a sophisticated Nunjucks template system.

### What We Figured Out
1. **HTML to Markdown conversion was working correctly** - TurndownService properly converted the Chalmers paper content
2. **Content pipeline was intact** - The right content was flowing through Document Page → DocumentSummary → API Route
3. **The issue was in prompt template execution** - The new Nunjucks-based prompt system with Zod validation was not properly handling the content variable interpolation

### How We Fixed It
1. **Implemented proper prompt template system** using Nunjucks + Zod validation
2. **Created structured template architecture** with:
   - Template files (`.njk`) for prompt text
   - TypeScript definitions with Zod schemas
   - Granularity-based token limits
   - Type-safe template execution
3. **Replaced simple string interpolation** with proper template rendering that preserves content integrity
4. **Added robust error handling** and validation throughout the prompt pipeline

### Technical Implementation
- **New prompt system**: `lib/prompts/` with templates, types, and validation
- **API endpoint**: `/api/summarise` with proper template execution
- **Component integration**: DocumentSummary component working with new API
- **Type safety**: Full TypeScript + Zod validation for prompt parameters

## Current Code State
- ✅ Prompt template system fully implemented and working
- ✅ All debug logging removed (was added for investigation)
- ✅ Content pipeline verified end-to-end
- ✅ Document summarisation now correctly processes actual document content

## Files Modified

- `components/document-summary.tsx` - Fixed API endpoint, added logging
- `app/api/summarise/route.ts` - Added logging  
- `app/documents/[slug]/page.tsx` - HTML→Markdown conversion, added logging
- `lib/services/document-parser.ts` - Added convertToMarkdown() method