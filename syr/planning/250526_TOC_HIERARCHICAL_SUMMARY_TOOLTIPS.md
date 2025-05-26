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

### Stage 1: Setup Tooltip Infrastructure
- [ ] Install Tippy.js dependency (`npm install @tippyjs/react tippy.js`)
- [ ] Add Tippy.js CSS import to appropriate global styles
- [ ] Create basic tooltip wrapper around existing ToC heading items in `components/table-of-contents.tsx`
- [ ] Test that tooltips appear/disappear correctly on hover
- [ ] Verify tooltips don't interfere with existing click-to-navigate functionality

### Stage 2: Hierarchical Content Extraction
- [ ] Create utility function `extractHierarchicalContent(elements: DocumentElement[], headingElement: DocumentElement): DocumentElement[]`
  - [ ] Function should find all elements that belong to the heading's section
  - [ ] Include content until next heading of equal or higher level
  - [ ] Handle edge cases (last section, nested structures)
- [ ] Add unit tests for content extraction logic
- [ ] Test with various document structures to ensure correct hierarchical grouping

### Stage 3: Content Display with Loading State
- [ ] Add loading state management to tooltip content
- [ ] Implement 1.5s delay simulation inside API function with "Loading..." message
- [ ] Test tooltip content display with various section sizes

### Stage 4: Basic Caching System
- [ ] Add state to `components/table-of-contents.tsx` for caching: `const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())`
- [ ] Implement cache key generation based on heading text + position
- [ ] Check cache before triggering loading delay
- [ ] Store results in cache after content generation
- [ ] Test cache behaviour (hits/misses, memory usage)

### Stage 5: Visual Polish and UX Improvements
- [ ] Style tooltips with consistent design system
- [ ] Implement appropriate tooltip positioning (avoid viewport edges)
- [ ] Add subtle hover delay before showing tooltip (prevent accidental triggers)
- [ ] Ensure tooltips work well with keyboard navigation
- [ ] Test responsiveness on different screen sizes

### Stage 6: LLM Integration Preparation
- [ ] Create placeholder for actual LLM summarisation
- [ ] Design API contract for summary generation
- [ ] Update caching to handle both content and summaries
- [ ] Add error handling for failed summary generation
- [ ] Document integration points for future LLM implementation

### Stage 7: Documentation and Testing
- [ ] Update `docs/TABLE_OF_CONTENTS_PANE.md` with tooltip functionality
- [ ] Add JSDoc comments to all new functions
- [ ] Write comprehensive tests for edge cases
- [ ] Test with real document content of various sizes
- [ ] Verify performance with large documents

### Stage 8: Integration and Cleanup
- [ ] Run full test suite to ensure no regressions
- [ ] Test complete user flow: ToC navigation + tooltips + element selection
- [ ] Review code for optimisation opportunities
- [ ] Update any relevant documentation
- [ ] Git commit with clear description of new functionality

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