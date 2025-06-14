# Document Text Search

The text search feature provides intelligent full-text search with context-aware snippet extraction, enhanced highlighting, and rich tooltips across document elements using Mark.js for cross-element search capabilities.

## See also

- `lib/utils/search-context-extraction.ts` - Context extraction utilities for generating meaningful search snippets
- `lib/utils/__tests__/search-context-extraction.test.ts` - Comprehensive test suite for context extraction functions
- `planning/250605a_cross_element_text_search_implementation.md` - Implementation planning and progress tracking
- `planning/finished/250604b_document_search_functionality.md` - Initial element-based search implementation
- `docs/reference/CODING_GUIDELINES.md#html-text-extraction` - HTML text extraction utility documentation
- `docs/reference/TOOL_HIGHLIGHT.md` - semantic highlighting system for AI-powered highlighting (complementary to text search)
- `docs/reference/STYLING_OVERLAPPING_TEXT_HIGHLIGHTS.md` - Comprehensive guide for implementing overlapping text highlighting with Mark.js limitations and CSS Custom Highlight API solutions
- `lib/utils/html-text-extraction.ts` - HTML text extraction implementation
- `components/unified-left-pane.tsx` - Search UI, Mark.js integration, and HighlightedSearchText component
- `components/simple-document-viewer.tsx` - Document rendering with highlighting support
- `app/api/semantic-search/route.ts` - Semantic search API endpoint for AI-powered document analysis
- [Mark.js Documentation](https://markjs.io/) - JavaScript text highlighting library used for search

## Key decisions

- **Context-aware snippets**: Show 30-50 characters around each match, not paragraph starts, for better relevance
- **Multiple snippet grouping**: Show separate visually grouped snippets for elements with multiple matches
- **Safe highlighting**: Use React-based highlighting without dangerouslySetInnerHTML for security
- **Rich tooltips**: Show expanded context (500 chars) with intelligent word boundary truncation
- **Visual styling**: Use Spideryarn orange theme (#DB8A45) for consistent match highlighting
- **Cross-element search**: Mark.js integration enables searching across HTML element boundaries
- **Real-time feedback**: Debounced search (300ms) with loading states for better UX

## Overview

The search functionality allows users to find text within documents with intelligent context extraction and enhanced result presentation. It provides:

- **Context-aware snippets**: 30-50 character snippets around each match using `extractAllMatchContexts()`
- **Multiple snippet display**: Separate grouped snippets for elements with multiple matches
- **Cross-element search**: Finds phrases that span inline elements (e.g., `<em>`, `<strong>`, `<span>`)
- **Rich tooltips**: Expanded 500-character context with `generateTooltipContent()` 
- **Safe React highlighting**: `HighlightedSearchText` component without dangerouslySetInnerHTML
- **Real-time results**: Debounced search with loading states and match count badges
- **Visual consistency**: Spideryarn orange highlighting theme throughout interface
- **Navigation**: Click results to scroll to and highlight the containing element
- **Case sensitivity**: Optional case-sensitive matching via advanced options
- **Pinned input**: Search box stays visible when scrolling through results

## Context extraction system

The search feature uses dedicated context extraction utilities to generate meaningful snippets around search matches:

### Core functions

**`extractMatchContext(text, query, matchIndex, contextChars, caseSensitive)`**
- Extracts contextual text around a single search match
- Intelligent word boundary handling to avoid cutting words mid-way
- Ellipsis placement (`...`) when truncating from start or end
- Default context length: 50 characters before and after match

**`extractAllMatchContexts(text, query, contextChars, caseSensitive)`**
- Finds all match positions using `findAllMatchPositions()`
- Generates context snippets for each match position
- Returns array of context objects with `{ text, matchIndex }` structure

**`generateTooltipContent(fullText, query, maxLength, caseSensitive)`**
- Creates expanded context for tooltips (default: 500 characters)
- Centers truncation around the first match in the text
- Intelligent word boundary respect for clean truncation
- Handles cases where no match is found gracefully

### Context extraction examples

```typescript
// Basic context extraction around a match
const context = extractMatchContext(
  "This is a fundamental principle in document analysis",
  "fundamental", 
  10, // match position
  30  // context chars
)
// Returns: "...is a fundamental principle in..."

// Multiple contexts for repeated terms
const contexts = extractAllMatchContexts(
  "The cat sat on the mat. The cat was happy.",
  "cat",
  15 // context chars
)
// Returns: [
//   { text: "The cat sat on...", matchIndex: 4 },
//   { text: "...mat. The cat was happy.", matchIndex: 28 }
// ]

// Tooltip content with larger context
const tooltip = generateTooltipContent(
  "Very long paragraph with fundamental concepts...",
  "fundamental",
  200 // max length
)
// Returns: intelligently truncated text centered around "fundamental"
```

## Implementation

### Technology Stack

- **Mark.js**: JavaScript library for text highlighting and cross-element search
- **React**: UI components with hooks for state management and safe highlighting
- **TypeScript**: Type-safe implementation with comprehensive context extraction utilities
- **Tailwind CSS**: Styling for search UI with Spideryarn orange theme
- **Radix UI Tooltips**: Rich tooltip components for expanded context display
- **HTML Text Extraction**: DOM-based utility for clean text extraction from HTML content

### Architecture

```
User Input → Debounced Search (300ms) → Mark.js DOM Search → Context Extraction → React Rendering
```

1. **Search Input** (UnifiedLeftPane)
   - Debounced input (300ms) to avoid excessive searches
   - Auto-focus when Search tab is clicked
   - Clear button to reset search
   - Pinned to top of search results pane

2. **Mark.js Integration**
   - Initialized on component mount
   - Targets the `document-viewer` container
   - Configured with `acrossElements: true` for cross-element search
   - Uses `.search-highlight` CSS class for DOM highlighting

3. **Context-Aware Search Results**
   - Maps Mark.js highlights back to DocumentElement IDs
   - Extracts context snippets using `extractAllMatchContexts()`
   - Multiple snippet grouping for elements with multiple matches
   - Rich tooltips with `generateTooltipContent()` for expanded context
   - Click handlers navigate via existing `onHeadingClick` system
   - Loading states and "no results" messaging

4. **HighlightedSearchText Component**
   - Safe React-based text highlighting without dangerouslySetInnerHTML
   - Case-sensitive and case-insensitive search support
   - Spideryarn orange highlighting: `text-spideryarn-orange bg-orange-50 font-medium`
   - Used in both search result snippets and tooltip content

5. **Advanced Options**
   - Collapsible section below search input
   - Case sensitivity toggle (default: false)
   - Designed for future expansion (regex, whole word, semantic search, etc.)

### Key Code Components

```typescript
// Context extraction utilities
import { extractAllMatchContexts, generateTooltipContent } from '@/lib/utils/search-context-extraction'
import { extractCleanText } from '@/lib/utils/html-text-extraction'

// HighlightedSearchText component for safe React highlighting
function HighlightedSearchText({ 
  text, 
  query, 
  caseSensitive = false 
}: { 
  text: string
  query: string
  caseSensitive?: boolean 
}) {
  if (!query.trim()) {
    return <span>{text}</span>
  }
  
  // Split text by search query, preserving case sensitivity
  const searchText = caseSensitive ? text : text.toLowerCase()
  const searchQuery = caseSensitive ? query : query.toLowerCase()
  
  const parts = []
  let lastIndex = 0
  let matchIndex = searchText.indexOf(searchQuery)
  
  while (matchIndex !== -1) {
    // Add text before the match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex))
    }
    
    // Add the highlighted match
    parts.push(
      <span key={matchIndex} className="text-spideryarn-orange bg-orange-50 font-medium">
        {text.substring(matchIndex, matchIndex + query.length)}
      </span>
    )
    
    lastIndex = matchIndex + query.length
    matchIndex = searchText.indexOf(searchQuery, lastIndex)
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  
  return <span>{parts}</span>
}

// Mark.js initialization and search execution
const markInstanceRef = useRef<Mark | null>(null)

useEffect(() => {
  const container = document.getElementById('document-viewer')
  if (container) {
    markInstanceRef.current = new Mark(container)
  }
  
  return () => {
    // Clean up highlights on unmount
    if (markInstanceRef.current) {
      markInstanceRef.current.unmark()
    }
  }
}, [])

// Enhanced search execution with context extraction
markInstanceRef.current.mark(query, {
  separateWordSearch: false,    // Find exact phrases
  acrossElements: true,         // Enable cross-element search
  className: 'search-highlight',
  caseSensitive: caseSensitive, // Apply case sensitivity option
  each: function(element) {
    // Find parent DocumentElement for navigation
    const elementContainer = element.closest('[data-element-id]')
    if (elementContainer) {
      const elementId = elementContainer.getAttribute('data-element-id') || ''
      
      // Extract clean content for context generation
      const docElement = elements.find(el => el.id === elementId)
      if (docElement) {
        const cleanContent = extractCleanText(docElement.content || '')
        
        // Create context-aware snippets for all matches in this element
        const contexts = extractAllMatchContexts(cleanContent, query, 50, caseSensitive)
        
        if (contexts.length > 0) {
          results.push({
            elementId,
            elementType: elementContainer.getAttribute('data-element-tag') || '',
            matchCount: 1, // Will be updated after all matches found
            contexts,
            fullText: cleanContent // Store full text for tooltips
          })
        }
      }
    }
  }
})

// Search result rendering with tooltips
{result.contexts.map((context, index) => (
  <Tooltip key={index}>
    <TooltipTrigger asChild>
      <div className="pl-3 border-l-2 border-orange-200 bg-orange-50 py-2 px-3 rounded-r cursor-help hover:bg-orange-100 transition-colors duration-150">
        <HighlightedSearchText 
          text={context.text} 
          query={searchQuery} 
          caseSensitive={caseSensitive} 
        />
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <div className="text-xs text-gray-700 leading-relaxed">
        <HighlightedSearchText 
          text={generateTooltipContent(result.fullText, searchQuery, 500, caseSensitive)} 
          query={searchQuery} 
          caseSensitive={caseSensitive} 
        />
      </div>
    </TooltipContent>
  </Tooltip>
))}
```

### HTML Text Extraction

The search functionality uses a centralised `extractCleanText()` utility for consistent text extraction from HTML content:

- **DOM-based parsing** for security and accuracy (no regex vulnerabilities)
- **Automatic filtering** of script and style tags
- **Proper handling** of nested tags and special characters
- **Server/browser compatibility** with appropriate fallbacks

This ensures search results display clean, readable text excerpts without HTML artifacts.

## Limitations

### Cross-Block Element Limitation

Mark.js's `acrossElements: true` option only works for **inline elements within the same block container**. It will find:
- ✅ `<p>hello <em>world</em></p>` 
- ✅ `<p>hello <strong>world</strong></p>`
- ✅ `<h1>hello <span>world</span></h1>`

But will NOT find text spanning across:
- ❌ `<p>hello</p><p>world</p>` (separate paragraphs)
- ❌ `<h1>hello</h1><p>world</p>` (different block elements)

This aligns with browser Ctrl+F behavior, so it meets user expectations.

## Visual styling

### DOM highlighting (Mark.js)

```css
/* Search highlighting in document DOM */
.search-highlight {
  background-color: #FED7AA; /* Orange background */
  color: #DB8A45;           /* Spideryarn orange text */
  font-weight: 500;         /* Medium weight */
}
```

### React component highlighting

The `HighlightedSearchText` component uses inline Tailwind classes for consistent theming:

```typescript
// Highlighted search matches in React components
<span className="text-spideryarn-orange bg-orange-50 font-medium">
  {matchText}
</span>
```

### Search result styling

```css
/* Search result snippet containers */
.pl-3.border-l-2.border-orange-200.bg-orange-50 {
  /* Orange left border and background */
  border-left: 2px solid #FED7AA;
  background-color: #FFF7ED;
}

/* Hover state for search results */
.hover\:bg-orange-100:hover {
  background-color: #FFEDD5;
  transition: background-color 150ms;
}
```

### Spideryarn orange theme consistency

- **Primary orange**: `#DB8A45` - Used for text highlighting and accent colours
- **Light orange**: `#FED7AA` - Used for borders and secondary highlights  
- **Lightest orange**: `#FFF7ED` and `#FFEDD5` - Used for backgrounds and hover states

## Testing

### Unit Tests
- `lib/utils/__tests__/search-context-extraction.test.ts` - Comprehensive context extraction utility tests
- `components/__tests__/unified-left-pane.test.tsx` - Basic search functionality
- `components/__tests__/unified-left-pane-enhancements.test.tsx` - UI enhancements (auto-focus, pinning, case sensitivity)
- `components/__tests__/mark-js-playground.test.tsx` - Mark.js integration tests
- `components/__tests__/mark-js-document-integration.test.tsx` - Document structure integration

### Context extraction testing patterns

```typescript
// Test context extraction around matches
expect(extractMatchContext(text, 'fundamental', 63, 30))
  .toContain('fundamental')
  .toContain('...')

// Test multiple match handling
expect(extractAllMatchContexts(text, 'cat', 15))
  .toHaveLength(3)
  .toEqual([
    { text: "The cat sat on...", matchIndex: 4 },
    // ... additional matches
  ])

// Test tooltip content generation
expect(generateTooltipContent(longText, 'fundamental', 100))
  .toContain('fundamental')
  .toBeLessThan(120) // Length check
```

### Testing guidelines

- **Context boundary testing**: Verify word boundary respect and ellipsis placement
- **Edge case handling**: Test empty inputs, missing matches, very short/long text
- **Case sensitivity validation**: Ensure proper handling of case-sensitive searches
- **Unicode support**: Test with special characters, accents, and multi-byte characters
- **Performance testing**: Validate performance with large documents and many matches

### Manual Testing
1. Navigate to any document
2. Click the "Search" tab
3. Type a search query - results appear in real-time
4. Click a result to navigate to that element
5. Toggle case sensitivity in advanced options
6. Verify highlighting appears on matched text

## Current features

✅ **Context-aware snippets**: Intelligent context extraction around matches using dedicated utilities
✅ **Multiple snippet grouping**: Separate snippets for elements with multiple matches  
✅ **Safe React highlighting**: `HighlightedSearchText` component without dangerouslySetInnerHTML
✅ **Rich tooltips**: Expanded context (500 chars) with intelligent truncation
✅ **Cross-element search**: Mark.js integration for comprehensive document search
✅ **Visual consistency**: Spideryarn orange theme throughout search interface
✅ **Real-time feedback**: Debounced search with loading states and match count badges
✅ **Case sensitivity**: Configurable case-sensitive and case-insensitive search
✅ **Element navigation**: Click search results to navigate to document position

## Limitations

- Context extraction limited to plain text (no HTML structure preservation in snippets)
- No fuzzy matching or typo tolerance for text search
- DOM highlighting may not persist across dynamic content updates
- Tooltip content truncation may cut important context in very dense text
- Search limited to visible document content (no search across document metadata)

## Future enhancements

The advanced options section is designed to accommodate future search features:
- **Search result persistence**: Maintain search highlights when navigating between documents
- **Advanced snippet styling**: Preserve some HTML formatting in context snippets  
- **Search within search**: Filter existing results by additional terms
- **Export search results**: Save search results for later reference
- **Search performance monitoring**: Track search performance and optimize slow queries
- **Fuzzy matching**: Add tolerance for typos and similar terms
- **Search history**: Remember recent searches for quick re-execution
- **Whole word matching**: Exact word boundary matching
- **Regular expression support**: Advanced pattern matching
- **Multiple highlight colours**: Different colours for different search terms

## Troubleshooting

### Common issues

- **Missing highlights**: Check Mark.js initialization and DOM element availability
- **Incorrect snippets**: Verify text extraction and element parsing pipeline  
- **Tooltip positioning**: Ensure Radix UI Tooltip CSS is properly imported
- **Performance issues**: Monitor context extraction performance with very long documents
- **Memory leaks**: Ensure proper cleanup of Mark.js instances on component unmount

### Debug helpers

```typescript
// Check Mark.js instance
console.log('Mark.js instance:', markInstanceRef.current)

// Verify context extraction
console.log('Extracted contexts:', extractAllMatchContexts(text, query, 50))

// Monitor search performance  
console.time('search-performance')
performSearch(query)
console.timeEnd('search-performance')
```

## Browser Support

Tested and working on:
- ✅ Chrome (desktop)
- ✅ Safari (iOS)
- ✅ Chrome (Android)
- ✅ Firefox
- ✅ Edge

Mark.js provides excellent cross-browser compatibility for all target browsers.