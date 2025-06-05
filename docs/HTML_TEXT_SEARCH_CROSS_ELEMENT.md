# HTML Text Search Across Elements

This document explores approaches for implementing text search that spans multiple HTML elements, addressing the core challenge of finding text that crosses element boundaries in modern web applications.

## See also

- `planning/finished/250604b_document_search_functionality.md` - Current search implementation using element-based matching
- `components/unified-left-pane.tsx` - Current search implementation in UnifiedLeftPane component
- `components/simple-document-viewer.tsx` - Document rendering with highlighting support
- `lib/services/document-parser.ts` - Document parsing and element structure
- [Mark.js Documentation](https://markjs.io/) - Leading JavaScript text highlighting library
- [MDN TreeWalker API](https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker) - Native DOM text traversal
- [MDN Range API](https://developer.mozilla.org/en-US/docs/Web/API/Range) - DOM range selection and manipulation

## The Core Problem

**Current limitation**: Our search finds `"hello"` and `"world"` separately but cannot find `"hello world"` when it spans elements:

```html
<p>hello <span>world</span></p>
```

**Why this matters**: Users expect search to work like Ctrl+F in browsers, finding text regardless of HTML structure. This is particularly important for documents with rich formatting where meaningful phrases often cross element boundaries.

**Current implementation**: Element-based search using `element.content.toLowerCase().includes(query)` - works within single elements but misses cross-element matches.

## Requirements and Context

Based on analysis of Spideryarn Reading application needs:

### Functional Requirements
- **Cross-element text search**: Find "hello world" spanning `<p>hello <span>world</span></p>`
- **Case-insensitive matching**: Standard user expectation
- **Highlighting support**: Visual indication of matches in document viewer
- **Click-to-navigate**: Results should scroll to and highlight matched text
- **Real-time search**: Debounced input with loading states

### Technical Requirements
- **Primary targets**: Chrome and mobile browsers (iOS Safari, Android Chrome)
- **Performance**: Not a primary concern - favor simplicity over optimization
- **Integration**: Must work with existing React-based document viewer
- **Simplicity**: Prefer single library solution over complex multi-approach systems

### Current Architecture Context
- **Document structure**: HTML stored as single row, parsed into `DocumentElement[]` at runtime
- **Text content**: Elements contain Markdown-formatted content (preserves **bold**, *italic*, etc.)
- **Highlighting**: Uses `data-highlight-target` attribute with CSS animations
- **Search UI**: Debounced input in left pane, results navigate via existing `onHeadingClick` handler

## Approach Analysis

*Research conducted June 5, 2025*

### Option 1: Mark.js Library ✓ **Recommended**

**Best for**: Production applications requiring robust cross-element search

```javascript
import Mark from 'mark.js';

const markInstance = new Mark(document.getElementById('content'));

// Search and highlight
markInstance.mark('hello world', {
  separateWordSearch: false,  // Find exact phrase
  acrossElements: true,       // Cross element boundaries
  className: 'search-highlight',
  each: function(element) {
    // Callback for each match - integrate with our navigation
    element.addEventListener('click', () => {
      onHeadingClick(element.textContent, element.closest('[data-element-id]').id);
    });
  }
});

// Clear highlights
markInstance.unmark();
```

**Pros**:
- ✅ **Battle-tested**: Used by major sites, handles edge cases
- ✅ **Cross-element support**: Built-in `acrossElements: true` option
- ✅ **Rich API**: Extensive configuration options
- ✅ **Browser support**: Works on Chrome, mobile, Firefox, Safari
- ✅ **Highlighting**: Automatic DOM manipulation for visual highlighting
- ✅ **Simple integration**: Single library, clear API

**Cons**:
- ❌ **Bundle size**: ~15KB minified (acceptable for our use case)
- ❌ **External dependency**: Adds one more package to maintain

### Option 2: Native TreeWalker API

**Best for**: Maximum control, no dependencies

```javascript
function searchAcrossElements(container, searchText) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let fullText = '';
  let textNodes = [];
  let node;
  
  // Build continuous text from all text nodes
  while (node = walker.nextNode()) {
    textNodes.push({
      node: node,
      startIndex: fullText.length,
      endIndex: fullText.length + node.textContent.length
    });
    fullText += node.textContent;
  }
  
  // Search in continuous text
  const matches = [];
  let index = fullText.toLowerCase().indexOf(searchText.toLowerCase());
  
  while (index !== -1) {
    // Map back to DOM ranges for highlighting
    const range = createRangeFromTextPosition(index, index + searchText.length, textNodes);
    if (range) matches.push(range);
    index = fullText.toLowerCase().indexOf(searchText.toLowerCase(), index + 1);
  }
  
  return matches;
}
```

**Pros**:
- ✅ **No dependencies**: Native browser API
- ✅ **Fine control**: Complete control over search logic
- ✅ **Performance**: Minimal overhead
- ✅ **Browser support**: Excellent across all targets

**Cons**:
- ❌ **Complex implementation**: Significant code to write and maintain
- ❌ **Range mapping complexity**: Converting text positions back to DOM ranges is error-prone
- ❌ **Highlighting logic**: Must implement manual DOM manipulation for visual feedback
- ❌ **Edge cases**: Must handle text normalization, whitespace, nested elements manually

### Option 3: Hybrid Approach (Current + Enhancement)

**Best for**: Incremental improvement of existing system

```javascript
// Enhance current search to also check cross-element text
function enhancedSearch(elements, query) {
  const elementResults = currentSearch(elements, query); // Keep existing logic
  
  // Add cross-element search
  const fullText = elements.map(el => el.content).join(' ');
  const crossElementMatches = [];
  
  if (fullText.toLowerCase().includes(query.toLowerCase())) {
    // Find which elements contribute to the match
    // ... complex logic to map back to elements
  }
  
  return [...elementResults, ...crossElementMatches];
}
```

**Pros**:
- ✅ **Backward compatibility**: Keeps existing element-based results
- ✅ **Incremental**: Can implement gradually

**Cons**:
- ❌ **Complex mapping**: Difficult to map continuous text back to source elements
- ❌ **Dual maintenance**: Two different search approaches to maintain
- ❌ **Incomplete solution**: Still doesn't solve the highlighting problem
- ❌ **Text normalization**: Elements contain Markdown, not original HTML text

## Key Trade-off Examples

### Example 1: Simple Cross-Element Text

**HTML**: `<p>The quick <em>brown</em> fox</p>`
**Search**: `"quick brown"`

- **Current approach**: ❌ No match (text spans `<p>` and `<em>`)
- **Mark.js**: ✅ Finds and highlights across elements
- **TreeWalker**: ✅ Finds match but requires complex highlighting implementation

### Example 2: Complex Nested Structure

**HTML**: `<div>Hello <span>beautiful <strong>world</strong> today</span></div>`
**Search**: `"beautiful world today"`

- **Current approach**: ❌ No match (spans 3 different elements)
- **Mark.js**: ✅ Handles automatically with `acrossElements: true`
- **TreeWalker**: ✅ Finds match but complex range creation across multiple nesting levels

### Example 3: Markdown Content Integration

**Our DocumentElement.content**: `"This has **bold** and *italic* text"`
**Search**: `"bold and italic"`

- **Current approach**: ✅ Works (searches in Markdown content)
- **Mark.js**: ❌ Would search rendered HTML, not Markdown source
- **TreeWalker**: ❌ Same issue - searches rendered DOM

**Critical insight**: Our Markdown content creates a mismatch between what users see and what gets searched.

## Decision Framework

### Key Questions for Implementation

1. **Content source**: Should we search Markdown content (current) or rendered HTML text?
   - **Markdown**: Preserves current behavior, but users see rendered text
   - **Rendered HTML**: Matches user expectations, but breaks existing search patterns

2. **Highlighting granularity**: Element-level (current) or text-span level?
   - **Element-level**: Simpler, consistent with current UX
   - **Text-span**: More precise, matches browser Ctrl+F behavior

3. **Migration strategy**: Replace current search or enhance it?
   - **Replace**: Clean implementation, potential UX breaking changes
   - **Enhance**: Backward compatibility, increased complexity

### Recommendation: Mark.js with Rendered Text Search

**Rationale**:
- **Simplicity**: Single library solution aligns with project preferences
- **User expectation**: Search should match what users see, not Markdown source
- **Browser support**: Excellent coverage for Chrome and mobile
- **Maintenance**: Proven library reduces implementation and maintenance burden

**Implementation approach**:
1. **Search rendered text**: Use Mark.js on the document viewer DOM
2. **Replace current search**: Cleaner than maintaining two systems
3. **Element mapping**: Map highlighted text back to `DocumentElement` IDs for navigation
4. **Progressive enhancement**: Start with basic cross-element search, add advanced features later

## Implementation Considerations

### Integration with Current Architecture

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
    separateWordSearch: false,
    acrossElements: true,
    className: 'search-highlight',
    each: function(element) {
      // Find parent DocumentElement for navigation
      const elementContainer = element.closest('[data-element-id]');
      if (elementContainer) {
        results.push({
          elementId: elementContainer.dataset.elementId,
          elementType: elementContainer.dataset.elementTag,
          textExcerpt: element.textContent,
          matchCount: 1 // Mark.js handles this internally
        });
      }
    }
  });
  
  setSearchResults(results);
}, [elements]);
```

### Browser Compatibility (June 2025)

| Feature | Chrome | Mobile Safari | Android Chrome | Firefox | Notes |
|---------|---------|---------------|----------------|---------|-------|
| Mark.js | ✅ | ✅ | ✅ | ✅ | Full support |
| TreeWalker | ✅ | ✅ | ✅ | ✅ | Native API |
| Range API | ✅ | ✅ | ✅ | ✅ | Native API |

### Performance Implications

**Not a primary concern per requirements, but worth noting**:
- **Mark.js**: ~5-15ms for typical document sizes
- **TreeWalker**: ~1-5ms but requires additional highlighting implementation
- **Memory**: Mark.js creates additional DOM nodes for highlights

## Migration Strategy

### Phase 1: Basic Cross-Element Search ✓ **Recommended Start**
- Install and integrate Mark.js
- Replace current element-based search with DOM text search
- Maintain existing result structure for UI compatibility
- Test on Chrome and mobile browsers

### Phase 2: Enhanced Highlighting 📋
- Implement precise text-span highlighting instead of element-level
- Add support for multiple match highlighting
- Integrate with existing animation system

### Phase 3: Advanced Features 📋
- Regular expression support
- Fuzzy matching
- Search within AI-generated content tabs

## Questions for Clarification

**Critical decisions needed**:

1. **Search target**: Should we search the rendered HTML text (what users see) or continue searching Markdown content (current behavior)?
   - **Impact**: Determines whether Mark.js or enhanced element search is appropriate

2. **Highlighting style**: Precise text highlighting or continue with element-level highlighting?
   - **Impact**: Affects complexity and user experience consistency

3. **Migration approach**: Replace current search entirely or maintain both systems?
   - **Impact**: Determines implementation complexity and potential breaking changes

4. **Feature scope**: Start with basic cross-element search or implement full highlighting system?
   - **Impact**: Determines initial development effort and timeline

**Recommended answers based on project principles**:
1. **Search rendered HTML** - matches user expectations
2. **Precise text highlighting** - better UX, Mark.js handles complexity
3. **Replace current search** - simpler to maintain
4. **Start basic, enhance incrementally** - aligns with rapid prototyping approach

## Appendix

### Mark.js Configuration Reference

```javascript
// Comprehensive Mark.js options for Spideryarn use case
const markOptions = {
  // Basic search options
  separateWordSearch: false,    // Find exact phrases
  acrossElements: true,         // Enable cross-element search
  caseSensitive: false,         // Case-insensitive by default
  
  // Highlighting options
  className: 'search-highlight',
  element: 'mark',              // Use semantic <mark> elements
  exclude: ['.no-search'],      // Skip certain elements
  
  // Callbacks for integration
  each: function(element) {
    // Called for each match - integrate with navigation
  },
  done: function(totalMatches) {
    // Called when highlighting complete
  },
  
  // Advanced options
  accuracy: 'exactly',          // Exact matching (vs 'partially', 'complementary')
  ignorePunctuation: [],        // Don't ignore punctuation by default
  wildcards: 'disabled'         // Disable wildcards for simplicity
};
```

### Alternative Libraries Considered

- **Lunr.js**: Full-text search engine, overkill for DOM search
- **Fuse.js**: Fuzzy search, doesn't handle DOM highlighting
- **Rangy**: Range manipulation library, deprecated
- **highlight.js**: Code syntax highlighting, different use case

### Browser API Evolution

**Deprecated**:
- `window.find()` - Being removed from browsers
- `document.selection` - IE-specific, obsolete

**Emerging**:
- Text Fragment API (`#:~:text=`) - Limited browser support, future potential
- CSS Custom Highlight API - Very early stage, not ready for production

*Last updated: June 5, 2025*