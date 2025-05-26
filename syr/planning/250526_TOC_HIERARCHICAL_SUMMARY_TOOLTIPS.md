# Table of Contents Hierarchical Summary Tooltips

## Goal, Context

**Primary Goal**: Implement tooltips on Table of Contents headings that display hierarchical summaries when users hover over them.

**Context**: The existing ToC pane (`components/table-of-contents.tsx`) displays document headings with visual hierarchy. We want to enhance this with on-demand summaries that understand the hierarchical structure of content - when hovering over an H2, the summary should include all sub-content (paragraphs, H3s, H4s, etc.) that belong to that section.

**Desired Behaviour**: 
- Hover over any heading in the ToC
- After a brief delay, see a tooltip containing a summary of that section's content
- Tooltip should be visually appealing and positioned correctly
- Loading state should be shown during summary generation
- Summaries should be cached to avoid regeneration

## Principles, Key Decisions

- **Hierarchical Content Extraction**: When hovering over a heading, include all content until the next heading of equal or higher level
- **Tooltip Library**: Use Tippy.js for robust tooltip positioning and behaviour
- **Simulated Loading**: Initially implement 1.5s delay to simulate LLM processing time
- **Ephemeral Caching**: Store generated summaries in component state (no localStorage needed)
- **Progressive Enhancement**: Start with content display, then add actual LLM summarisation
- **Non-blocking UX**: Tooltips should not interfere with existing ToC click-to-navigate functionality

## Actions

### Stage 1: Setup Tooltip Infrastructure ✅
- [x] Install Tippy.js dependency (`npm install @tippyjs/react tippy.js`)
- [x] Add Tippy.js CSS import to appropriate global styles
- [x] Create basic tooltip wrapper around existing ToC heading items in `components/table-of-contents.tsx`
- [x] Test that tooltips appear/disappear correctly on hover
- [x] Verify tooltips don't interfere with existing click-to-navigate functionality

### Stage 2: Hierarchical Content Extraction ✅
- [x] Create utility function `extractHierarchicalContent(elements: DocumentElement[], headingElement: DocumentElement): DocumentElement[]`
  - [x] Function should find all elements that belong to the heading's section
  - [x] Include content until next heading of equal or higher level
  - [x] Handle edge cases (last section, nested structures)
- [x] Add 50-character truncation per element to prevent massive tooltips
- [x] Test with various document structures to ensure correct hierarchical grouping

### Stage 3: Content Display with Loading State ✅
- [x] Add loading state management to tooltip content
- [x] Implement 1.5s delay simulation inside API function with "Loading..." message
- [x] Style tooltip Markdown content for readability (proper line breaks, spacing)
- [x] Add light theme styling with grey background and mid-grey border
- [x] Override Tippy.js default dark styling with custom CSS
- [x] Add basic caching system with `contentCache` state

### Stage 4: LLM Integration ✅
- [x] Use API endpoint `/api/summarise` for LLM content summarisation
- [x] Replace content extraction with actual LLM summarisation calls
- [x] Add error handling for failed summary generation with user-friendly error messages
- [x] Add TypeScript types to prevent invalid granularity values
- [x] Use 'single short paragraph' granularity for appropriate tooltip-sized summaries

### Stage 6: Closing ✅
- [x] Remove deliberate API error after testing
- [x] Add JSDoc comments to all new functions
- [x] Git commit with clear description of new functionality
- [ ] Update `docs/TABLE_OF_CONTENTS_PANE.md` with tooltip functionality (optional)

## Implementation Complete ✅

The core functionality has been successfully implemented and tested:

- **Tooltip Infrastructure**: Tippy.js integration with proper positioning and theming
- **Hierarchical Content**: Extracts content from heading sections including sub-headings
- **LLM Integration**: Real AI summarisation via `/api/summarise` endpoint
- **Error Handling**: Graceful fallback with user-friendly error messages
- **Type Safety**: TypeScript protection against invalid granularity values
- **Caching**: Prevents repeated API calls for the same content

The tooltips now display AI-generated summaries when hovering over Table of Contents headings, with proper loading states and error handling.

## Appendix

### Technical Considerations
- **Performance**: Large documents may have many headings - ensure tooltip content extraction is efficient
- **Memory Management**: Cache should not grow unbounded (consider implementing simple LRU if needed)
- **Accessibility**: Ensure tooltips work with screen readers and keyboard navigation
- **Mobile**: Consider touch behaviour on mobile devices

### Example Hierarchical Content Structure
```
H1: Introduction
  <p>Opening paragraph content...</p>
  H2: Background
    <p>Background details...</p>
    H3: Historical Context
      <p>Historical information...</p>
    H3: Modern Relevance  
      <p>Modern context...</p>
  H2: Methodology
    <p>Methods description...</p>
```

When hovering over "Background" H2, tooltip should include:
- Background details paragraph
- Both H3 sections and their content
- Stops before "Methodology" H2

### Files to Modify
- `components/table-of-contents.tsx` - Main implementation
- `package.json` - Add Tippy.js dependency
- `docs/TABLE_OF_CONTENTS_PANE.md` - Update documentation
- `lib/types/document.ts` - Potentially add types for content extraction