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

## Remaining Hypotheses

1. **Runtime Content Substitution**: Something at runtime is replacing the correct content with compiled JS
2. **Caching Issue**: Next.js dev server serving stale/wrong content
3. **Error Handling**: An error somewhere causing fallback to default/cached content
4. **Build Asset Confusion**: Somehow serving build artifacts instead of source content

## Next Actions Required

### IMMEDIATE: Browser-Based Debugging
- [ ] Start `npm run dev` and visit `http://localhost:3000/documents/chalmers`
- [ ] Check browser console for logging output from all three pipeline stages
- [ ] Check Network tab for actual HTTP request body to `/api/summarise`
- [ ] Verify what content is being sent vs received

### IF LOGGING SHOWS CORRECT CONTENT:
- [ ] Issue is in Claude API processing or response handling
- [ ] Check API response vs what gets displayed

### IF LOGGING SHOWS WRONG CONTENT:
- [ ] Trace back to find where JS content enters the pipeline
- [ ] Check for build/compilation artifacts interfering
- [ ] Verify file reading and parsing logic

## Current Code State

- All conversion logic appears correct
- Logging instrumentation in place
- API endpoint properly renamed
- Ready for runtime debugging to identify where pipeline breaks

## Files Modified

- `components/document-summary.tsx` - Fixed API endpoint, added logging
- `app/api/summarise/route.ts` - Added logging  
- `app/documents/[slug]/page.tsx` - HTML→Markdown conversion, added logging
- `lib/services/document-parser.ts` - Added convertToMarkdown() method