# Enhanced Search Result Snippets Implementation

## Goal

Transform search result snippets from paragraph-start excerpts to contextual, highlighted snippets that show actual match locations. Current search shows "Although a remarkable number of phenomena..." when user searched for "fundamental" which appears later in the paragraph. Users cannot see their actual matches in snippets.

### Desired Behavior

1. **Context-aware snippets**: Show 30-50 characters around each match, not paragraph start
2. **Multiple match handling**: Create separate snippet for each match in same paragraph, visually grouped
3. **Match highlighting**: Highlight search terms within snippets using safe HTML rendering
4. **Rich tooltips**: Show expanded context (200-300 chars) on hover over snippets
5. **Document position indicators**: Show heading context and document progress for each result
6. **Preserved navigation**: Clicking snippets continues to scroll to element in document pane

## References

- `components/unified-left-pane.tsx` - Current search implementation with Mark.js integration
- `lib/utils/html-text-extraction.ts` - DOM-based text extraction utility (just implemented)
- `components/highlight-management.tsx` - Semantic highlighting patterns for visual consistency
- `docs/reference/CODING_PRINCIPLES.md` - Rapid prototyping principles, start simple and layer complexity
- `docs/reference/STYLING.md` - Phosphor icons, tooltip patterns, Spideryarn orange theme
- `docs/reference/KEYBOARD_SHORTCUTS.md` - Future Cmd+F integration patterns
- `planning/250613c_html_document_storage_and_security_implementation.md` - HTML sanitization approaches
- Radix Tooltip components in codebase - Established tooltip patterns with Tippy.js overrides in `app/globals.css`

## Principles & Key Decisions

1. **Visual grouping**: Use indent/nesting to group multiple snippets from same paragraph
2. **No limits**: Show all matches regardless of count (ignore performance initially) 
3. **Simple highlighting**: Start with safe React component approach, avoid `dangerouslySetInnerHTML`
4. **Consistent styling**: Follow semantic highlighting visual patterns (confidence-based intensity)
5. **Incremental complexity**: Start with context extraction, add highlighting, then tooltips and position indicators
6. **Preserve existing**: Keep current Mark.js DOM highlighting and element navigation working
7. **Separate from highlights**: Keep text search separate from semantic highlights navigation machinery

## Stages & Actions

### Stage: Improve Snippet Context Extraction
- [ ] Create `extractMatchContext()` utility function in `lib/utils/search-context-extraction.ts`
  - Accept `(text: string, query: string, matchIndex: number, contextChars: number) => string`
  - Extract context around match position with smart word boundary handling
  - Handle edge cases (match at start/end of text, multiple overlapping contexts)
  - Include comprehensive unit tests for various scenarios
- [ ] Update text search excerpt generation in `unified-left-pane.tsx` (around line 451)
  - Replace current paragraph-start extraction with context-aware extraction
  - Use Mark.js `each` callback to capture actual match positions within elements
  - Store match positions for context extraction
- [ ] Test context extraction with existing documents to ensure matches are visible in snippets
  - Use subagent with Playwright to verify search for "fundamental" now shows relevant context
  - Verify snippets contain the actual search terms

### Stage: Implement Multiple Snippets per Element
- [ ] Modify `SearchResult` interface to support multiple contexts per element
  - Add `contexts: Array<{text: string, matchIndex: number}>` field
  - Keep backward compatibility with existing `textExcerpt` field
- [ ] Update Mark.js search implementation to collect all match positions per element
  - Extend `elementMatchCounts` to track position arrays, not just counts
  - Generate multiple context snippets for elements with multiple matches
- [ ] Enhance search results UI rendering in `renderSearchTab()`
  - Group multiple snippets under parent element result
  - Use visual indentation (left border + padding) for grouped snippets
  - Show element type and total match count at parent level
  - Display individual match contexts with click navigation to specific positions

### Stage: Add Match Highlighting in Snippets
- [ ] Create `HighlightedText` component for safe match highlighting
  - Use React component approach with string splitting and styling
  - Apply Spideryarn orange theme (`text-spideryarn-orange bg-orange-50`) for highlights
  - Handle case-sensitive/insensitive highlighting based on search options
- [ ] Integrate highlighted text rendering into search result snippets
  - Replace plain text snippet display with `HighlightedText` component
  - Pass search query and case sensitivity settings to component
  - Ensure highlighting works with context-extracted snippets
- [ ] Test highlighting with various search terms and case sensitivity options

### Stage: Rich Context Tooltips
- [ ] Install and configure Radix Tooltip primitive (if not already available)
  - Follow existing Tippy.js override patterns in `app/globals.css`
  - Configure with 200ms delay and proper accessibility support
- [ ] Create `SearchResultTooltip` component
  - Show expanded context (200-300 characters around match)
  - Use clean typography and proper text formatting
  - Include document position indicator (heading name + progress percentage)
  - Follow Radix Tooltip accessibility patterns
- [ ] Integrate tooltips into search result snippet rendering
  - Wrap each snippet in tooltip trigger
  - Generate expanded context using same `extractMatchContext()` utility with larger range
  - Add document position calculation using element position and total document length

### Stage: Document Position Indicators
- [ ] Create `calculateDocumentPosition()` utility function
  - Accept element position and total elements count
  - Return percentage through document and nearest heading context
  - Find closest preceding heading element in elements array
- [ ] Add position indicators to search result UI
  - Show progress bar or percentage in search result header
  - Display heading context (e.g., "Under: Introduction > Key Concepts")
  - Use subtle styling with gray text and small font size
- [ ] Enhance tooltip content with richer position information
  - Include heading hierarchy path
  - Show approximate page/section information

### Stage: Update Documentation and Testing
- [ ] Create comprehensive test suite for new functionality
  - Unit tests for context extraction utility
  - Integration tests for multiple snippet generation
  - UI tests for highlighting and tooltip behavior
  - Accessibility tests for keyboard navigation and screen readers
- [ ] Update `docs/reference/TOOL_SEARCH_TEXT.md` with new snippet functionality
  - Document context extraction patterns
  - Explain multiple snippet grouping approach
  - Add highlighting and tooltip implementation details
- [ ] Add search snippet patterns to `docs/reference/CODING_GUIDELINES.md`
  - Document safe highlighting practices
  - Include context extraction best practices

### Stage: Polish and Refinements
- [ ] Add visual polish to search results
  - Smooth hover transitions for tooltips
  - Improved visual hierarchy with better spacing
  - Loading states during context generation
  - Empty state improvements when no matches found
- [ ] Performance optimizations
  - Debounce context extraction for rapid typing
  - Cache extracted contexts for repeated searches
  - Optimize match position calculation for large documents
- [ ] User experience improvements
  - Keyboard navigation between search results
  - Better focus management and accessibility
  - Visual feedback for active/selected results

### Stage: Future Integration Points
- [ ] Research Cmd+F hijacking implementation approach
  - Study browser focus management and event preventDefault patterns
  - Consider opt-in setting for custom search behavior
  - Plan integration with existing keyboard shortcut system
- [ ] Design prev/next navigation architecture
  - Keep separate from semantic highlights navigation
  - Plan for future integration with highlight management tab
  - Consider shared navigation state management if beneficial

## Appendix

### Technical Implementation Notes

**Context Extraction Algorithm:**
```typescript
function extractMatchContext(text: string, query: string, matchIndex: number, contextChars: number = 50): string {
  const start = Math.max(0, matchIndex - contextChars)
  const end = Math.min(text.length, matchIndex + query.length + contextChars)
  let context = text.substring(start, end)
  
  // Add ellipsis if truncated
  if (start > 0) context = '...' + context
  if (end < text.length) context = context + '...'
  
  return context.trim()
}
```

**Visual Grouping Pattern:**
```tsx
// Parent result
<div className="border border-gray-200 rounded-lg">
  <div className="p-3 bg-gray-50">
    <span className="text-xs font-medium text-gray-500">{elementType}</span>
    <span className="text-xs text-gray-500 ml-2">{totalMatches} matches</span>
  </div>
  
  {/* Multiple snippets */}
  {contexts.map((context, i) => (
    <div key={i} className="p-3 border-l-2 border-orange-200 ml-4 bg-orange-50">
      <HighlightedText text={context.text} query={query} />
    </div>
  ))}
</div>
```

**Existing Patterns to Follow:**
- Mark.js DOM highlighting: Preserve existing `markInstanceRef.current.mark()` functionality
- Semantic highlighting CSS: Follow confidence-based visual intensity patterns
- Tooltip implementation: Use established Radix Tooltip.Provider patterns
- Text extraction: Build on `extractCleanText()` utility for consistent processing
- Search state management: Extend existing `searchResults` and `performSearch` patterns

### Security Considerations

**Safe Highlighting Implementation:**
- Use React component string splitting instead of `dangerouslySetInnerHTML`
- Escape user input in search queries to prevent XSS
- Follow existing HTML sanitization patterns from security implementation planning

**Performance Considerations:**
- Context extraction is O(n) per match - acceptable for prototype phase
- Multiple snippets may increase DOM complexity - monitor with large result sets
- Tooltip generation adds computational overhead - consider lazy loading