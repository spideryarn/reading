# Cross-Element Text Search Implementation

## Goal

Implement text search functionality that spans multiple HTML elements, enabling users to find phrases like "hello world" even when they cross element boundaries (e.g., `<p>hello <span>world</span></p>`). This addresses the core limitation of our current element-based search approach.

The enhanced search should:
- Find text that spans multiple DOM elements using cross-element search algorithms
- Provide precise text highlighting (not just element-level highlighting)
- Maintain existing UI patterns for search results and navigation
- Work reliably on Chrome and mobile browsers (primary targets)
- Integrate seamlessly with the current React-based document viewer architecture

## References

- `docs/HTML_TEXT_SEARCH_CROSS_ELEMENT.md` - Comprehensive analysis of approaches and technical trade-offs
- `planning/finished/250604b_document_search_functionality.md` - Current element-based search implementation
- `components/unified-left-pane.tsx` - Current search UI and logic implementation
- `components/simple-document-viewer.tsx` - Document rendering with highlighting support via data-highlight-target
- `components/resizable-document-layout.tsx` - Element highlighting coordination and scroll navigation
- [Mark.js Documentation](https://markjs.io/) - Recommended library for cross-element text search and highlighting

## Principles & Key Decisions

Based on analysis in `docs/HTML_TEXT_SEARCH_CROSS_ELEMENT.md` and project preference for simplicity:

1. **Single library approach**: Use Mark.js as the primary solution rather than hybrid approaches or multiple libraries
2. **Search rendered HTML text**: Search what users actually see in the document viewer, not Markdown source content
3. **Precise text highlighting**: Move from element-level highlighting to text-span highlighting for better user experience
4. **Replace current search**: Clean implementation over maintaining dual systems
5. **Progressive enhancement**: Start with basic cross-element search, add advanced features incrementally
6. **Chrome + mobile focus**: Optimize for primary browser targets, other browsers are nice-to-have
7. **Performance is secondary**: Favor simplicity and functionality over performance optimization

## Actions

### Stage: Research Validation & Library Integration
- [x] Install Mark.js library and verify basic functionality
  - [x] Add `mark.js` to package.json dependencies
  - [x] Create simple test implementation in a playground component
  - [x] Verify cross-element search works with `acrossElements: true` option
  - [ ] Test on Chrome desktop and mobile Safari/Chrome (manual testing needed - created test page at /test-markjs)
  - [x] Confirm highlighting works with our existing CSS classes
- [x] Validate integration approach with current architecture
  - [x] Test Mark.js integration with React components and re-renders
  - [x] Verify DOM element targeting works with our `data-element-id` attributes
  - [x] Ensure no conflicts with existing highlight animations (`data-highlight-target`)
  - [x] Test search performance on typical document sizes (like Chalmers paper)
- [x] Write initial integration tests
  - [x] Create test for basic cross-element search functionality
  - [x] Test that search results can be mapped back to DocumentElement IDs
  - [x] Verify highlight clearing works correctly
- [x] Update planning doc with validation results
- [ ] Commit research validation using subagent

### Stage: Core Cross-Element Search Implementation
- [ ] Replace current search logic in UnifiedLeftPane
  - [ ] Import and initialize Mark.js instance in UnifiedLeftPane component
  - [ ] Replace `performSearch` function to use DOM-based search instead of element.content search
  - [ ] Implement text highlighting using Mark.js with appropriate CSS classes
  - [ ] Map highlighted text back to DocumentElement IDs for navigation compatibility
  - [ ] Maintain existing search result data structure for UI compatibility
- [ ] Update search result navigation
  - [ ] Ensure `onHeadingClick` handler works with new search results
  - [ ] Coordinate between Mark.js highlighting and existing `data-highlight-target` system
  - [ ] Test scroll-to-element functionality with precise text highlights
- [ ] Handle edge cases
  - [ ] Empty queries (clear highlights properly)
  - [ ] Whitespace-only queries (prevent unnecessary processing)
  - [ ] No results found (clear previous highlights)
  - [ ] Multiple matches within single elements
  - [ ] Rapid typing scenarios (debouncing with highlight clearing)
- [ ] Write comprehensive tests
  - [ ] Test cross-element search finds phrases spanning elements
  - [ ] Test that single-element searches still work
  - [ ] Test highlighting appears and clears correctly
  - [ ] Test navigation from search results works
  - [ ] Test edge cases (empty queries, no results, etc.)
  - [ ] Test search performance on mobile browsers
- [ ] Manual testing with dev server
  - [ ] Test with example documents (Chalmers paper, Rhizome text)
  - [ ] Verify search works across different element types (h1, p, span, em, strong)
  - [ ] Test on Chrome desktop and mobile Safari/Chrome
  - [ ] Verify no regressions in existing search functionality
- [ ] Update planning doc with implementation progress
- [ ] Commit core implementation using subagent

### Stage: UI Enhancement & Polish
- [ ] Enhance search result display
  - [ ] Update result excerpts to show highlighted text context
  - [ ] Consider showing number of matches per element (if multiple)
  - [ ] Improve visual feedback for active highlights
  - [ ] Ensure result click behavior is intuitive with new highlighting
- [ ] Improve highlighting visual design
  - [ ] Coordinate Mark.js highlight styles with existing CSS theme
  - [ ] Ensure highlights are visible and accessible
  - [ ] Test highlight visibility on mobile devices
  - [ ] Consider animation timing with existing highlight system
- [ ] Add search options (if needed)
  - [ ] Case-sensitive search toggle (optional enhancement)
  - [ ] Whole word matching option (optional enhancement)
- [ ] Write additional tests for UI enhancements
  - [ ] Test visual highlighting styles
  - [ ] Test result display with multiple matches
  - [ ] Test accessibility of highlights
- [ ] Update planning doc with enhancement progress
- [ ] Commit UI enhancements using subagent

### Stage: Integration Testing & Documentation
- [ ] Run full test suite
  - [ ] Verify all existing tests still pass
  - [ ] Run new cross-element search tests
  - [ ] Test search functionality across all document types
  - [ ] Performance testing on larger documents
- [ ] Update documentation
  - [ ] Update `docs/UI_INTERFACE.md` to reflect new cross-element search capabilities
  - [ ] Update `docs/PROJECT_STATUS.md` to include enhanced search features
  - [ ] Add technical implementation notes to relevant docs
- [ ] Browser compatibility testing
  - [ ] Test thoroughly on Chrome desktop
  - [ ] Test on mobile Safari (iOS)
  - [ ] Test on mobile Chrome (Android)
  - [ ] Verify Firefox and Edge work (nice-to-have)
- [ ] Manual QA testing
  - [ ] Test complete search workflow end-to-end
  - [ ] Verify no regressions in other application features
  - [ ] Test search with various text formatting (bold, italic, links)
  - [ ] Test search with AI-generated content (headings, summaries)
- [ ] Update planning doc with testing results
- [ ] Commit final implementation using subagent

### Stage: Cleanup & Documentation Update
- [ ] Clean up code
  - [ ] Remove any old element-based search code that's no longer needed
  - [ ] Clean up console.log statements or debugging code
  - [ ] Ensure TypeScript types are correct for new search implementation
  - [ ] Update comments and documentation strings in code
- [ ] Final documentation updates
  - [ ] Update `docs/HTML_TEXT_SEARCH_CROSS_ELEMENT.md` with implementation notes
  - [ ] Add implementation examples and patterns to relevant docs
  - [ ] Update any references to old search behavior in documentation
- [ ] Final testing
  - [ ] Run complete test suite one more time
  - [ ] Manual verification that all features work as expected
  - [ ] Verify no breaking changes to existing functionality
- [ ] Update planning doc to mark completion
- [ ] Move planning doc to `planning/finished/` and commit

## Appendix

### Technical Implementation Notes

Based on `docs/HTML_TEXT_SEARCH_CROSS_ELEMENT.md` analysis, the recommended Mark.js integration approach:

```javascript
// Enhanced search function for UnifiedLeftPane
const performCrossElementSearch = useCallback((query) => {
  // Get document viewer container
  const container = document.getElementById('document-viewer');
  if (!container) return;
  
  // Clear previous highlights
  markInstance.unmark();
  
  const results = [];
  
  // Use Mark.js for cross-element search
  markInstance.mark(query, {
    separateWordSearch: false,    // Find exact phrases
    acrossElements: true,         // Enable cross-element search
    className: 'search-highlight',
    each: function(element) {
      // Find parent DocumentElement for navigation
      const elementContainer = element.closest('[data-element-id]');
      if (elementContainer) {
        results.push({
          elementId: elementContainer.dataset.elementId,
          elementType: elementContainer.dataset.elementTag,
          textExcerpt: element.textContent,
          matchCount: 1
        });
      }
    }
  });
  
  setSearchResults(results);
}, []);
```

### Current Search Limitations Being Addressed

1. **Cross-element text**: Cannot find "hello world" in `<p>hello <span>world</span></p>`
2. **Precise highlighting**: Currently highlights entire elements, not specific text spans
3. **Text source mismatch**: Searches Markdown content but users see rendered HTML

### Mark.js Configuration Options

Key options for Spideryarn use case:
- `acrossElements: true` - Enable cross-element search
- `separateWordSearch: false` - Search for exact phrases
- `caseSensitive: false` - Case-insensitive by default
- `className: 'search-highlight'` - Custom CSS class for styling
- `element: 'mark'` - Use semantic `<mark>` elements
- `each: function(element)` - Callback for each match (integration point)

### Browser Support Requirements

Primary targets:
- ✅ Chrome desktop (latest)
- ✅ Mobile Safari (iOS)
- ✅ Mobile Chrome (Android)

Nice-to-have:
- Firefox (latest)
- Edge (latest)

### Alternative Approaches Considered & Rejected

1. **TreeWalker API**: Too complex to implement and maintain, requires manual highlighting logic
2. **Hybrid approach**: Maintaining both element-based and cross-element search adds complexity
3. **Text Fragment API**: Too early-stage, limited browser support
4. **Custom text mapping**: Significant development effort, Mark.js provides proven solution

### Risk Mitigation

**Library dependency risk**: Mark.js is well-maintained, widely used, and has stable API
**Performance risk**: Not a concern per requirements, but Mark.js is optimized for typical use cases
**Integration risk**: Addressed in Stage 1 with validation testing
**Browser compatibility risk**: Mark.js has excellent support for target browsers

### Stage 1 Validation Results

**Key Findings from Testing**:

1. **Library Installation**: Successfully installed Mark.js v8.11.1 with no conflicts
2. **Cross-Element Search Limitation Discovered**: The `acrossElements: true` option only works for inline elements within the same block container (e.g., `<em>`, `<strong>`, `<span>` within a `<p>`). It does NOT work for text spanning across different block-level elements like separate `<p>` tags
3. **React Integration**: Works seamlessly with React re-renders, properly clearing old highlights when search terms change
4. **DOM Mapping**: Successfully maps highlights back to parent elements with `data-element-id` attributes
5. **Performance**: Excellent - search across 50 paragraphs completes in under 100ms
6. **Compatibility**: No conflicts with existing `data-highlight-target` navigation highlights
7. **Edge Cases**: Handles empty queries, whitespace normalization correctly

**Important Architecture Consideration**: Given the cross-block limitation, the search will find matches within individual elements, but won't highlight phrases that truly span across paragraph boundaries. This aligns with how browser Ctrl+F works, so it meets user expectations.

**Test Coverage**: Created comprehensive test suites:
- `components/__tests__/mark-js-playground.test.tsx` - Basic Mark.js functionality tests
- `components/__tests__/mark-js-document-integration.test.tsx` - Integration with our document structure

All tests passing ✓