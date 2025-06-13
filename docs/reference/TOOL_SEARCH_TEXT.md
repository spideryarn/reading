# Document Text Search

This document describes the text search functionality in Spideryarn Reading, including the implementation of cross-element search using Mark.js.

## See also

- `planning/250605a_cross_element_text_search_implementation.md` - Implementation planning and progress tracking
- `planning/finished/250604b_document_search_functionality.md` - Initial element-based search implementation
- `docs/reference/CODING_GUIDELINES.md#html-text-extraction` - HTML text extraction utility documentation
- `docs/reference/TOOL_HIGHLIGHT.md` - semantic highlighting system for AI-powered highlighting (complementary to text search)
- `lib/utils/html-text-extraction.ts` - HTML text extraction implementation
- `components/unified-left-pane.tsx` - Search UI and Mark.js integration
- `components/simple-document-viewer.tsx` - Document rendering with highlighting support
- [Mark.js Documentation](https://markjs.io/) - JavaScript text highlighting library used for search

## Overview

The search functionality allows users to find text within documents, even when that text spans multiple HTML elements. It provides:

- **Cross-element search**: Finds phrases that span inline elements (e.g., `<em>`, `<strong>`, `<span>`)
- **Real-time results**: Debounced search with loading states
- **Visual highlighting**: Yellow background on matched text using CSS
- **Navigation**: Click results to scroll to and highlight the containing element
- **Case sensitivity**: Optional case-sensitive matching via advanced options
- **Pinned input**: Search box stays visible when scrolling through results

## Implementation

### Technology Stack

- **Mark.js**: JavaScript library for text highlighting and cross-element search
- **React**: UI components with hooks for state management
- **TypeScript**: Type-safe implementation
- **Tailwind CSS**: Styling for search UI and highlights
- **HTML Text Extraction**: DOM-based utility for clean text extraction from HTML content

### Architecture

1. **Search Input** (UnifiedLeftPane)
   - Debounced input (300ms) to avoid excessive searches
   - Auto-focus when Search tab is clicked
   - Clear button to reset search
   - Pinned to top of search results pane

2. **Mark.js Integration**
   - Initialized on component mount
   - Targets the `document-viewer` container
   - Configured with `acrossElements: true` for cross-element search
   - Uses `.search-highlight` CSS class for visual feedback

3. **Search Results**
   - Maps Mark.js highlights back to DocumentElement IDs
   - Shows element type and text excerpt
   - Click handlers navigate via existing `onHeadingClick` system
   - Loading states and "no results" messaging

4. **Advanced Options**
   - Collapsible section below search input
   - Case sensitivity toggle (default: false)
   - Designed for future expansion (regex, whole word, etc.)

### Key Code Components

```typescript
// HTML text extraction for search results
import { extractCleanText } from '@/lib/utils/html-text-extraction'

// Extract clean text from HTML content for searching
const cleanContent = extractCleanText(element.content)
const textExcerpt = cleanContent.substring(0, 100) + '...'

// Mark.js initialization
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

// Search execution
markInstanceRef.current.mark(query, {
  separateWordSearch: false,    // Find exact phrases
  acrossElements: true,         // Enable cross-element search
  className: 'search-highlight',
  caseSensitive: caseSensitive, // Apply case sensitivity option
  each: function(element) {
    // Map to parent DocumentElement for navigation
    const elementContainer = element.closest('[data-element-id]')
    if (elementContainer) {
      results.push({
        elementId: elementContainer.dataset.elementId,
        elementType: elementContainer.dataset.elementTag,
        textExcerpt: element.textContent,
        matchCount: 1
      })
    }
  }
})
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

## CSS Styling

```css
/* Search highlighting */
.search-highlight {
    background-color: #ffeb3b;
    font-weight: bold;
    padding: 2px 0;
}
```

## Testing

### Unit Tests
- `components/__tests__/unified-left-pane.test.tsx` - Basic search functionality
- `components/__tests__/unified-left-pane-enhancements.test.tsx` - UI enhancements (auto-focus, pinning, case sensitivity)
- `components/__tests__/mark-js-playground.test.tsx` - Mark.js integration tests
- `components/__tests__/mark-js-document-integration.test.tsx` - Document structure integration

### Manual Testing
1. Navigate to any document
2. Click the "Search" tab
3. Type a search query - results appear in real-time
4. Click a result to navigate to that element
5. Toggle case sensitivity in advanced options
6. Verify highlighting appears on matched text

## Future Enhancements

The advanced options section is designed to accommodate future search features:
- Whole word matching
- Regular expression support
- Search within AI-generated content
- Fuzzy/approximate matching
- Multiple highlight colors for different search terms

## Browser Support

Tested and working on:
- ✅ Chrome (desktop)
- ✅ Safari (iOS)
- ✅ Chrome (Android)
- ✅ Firefox
- ✅ Edge

Mark.js provides excellent cross-browser compatibility for all target browsers.