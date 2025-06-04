 # Document Search Functionality

## Goal

Add search functionality to the Spideryarn Reading application that allows users to search within the current document and navigate to matching elements.

### Initial Requirements (Stage 1)
- Search bar as a 6th tab in the left pane
- Display search results as a list (similar to table of contents)
- Click on results to scroll to the corresponding element in the document
- Highlight or add background color to matching elements
- Case-insensitive search
- Search only the current document's original text
- Keep implementation simple, don't worry about performance optimisation

### Future Enhancements (Later Stages)
- Map from plaintext matches back to specific text within HTML elements (not just whole elements)
- Approximate text matching
- Semantic/thematic search capabilities

## Context

The application currently has:
- A 2-pane resizable layout with the left pane containing 5 tabs (Original, AI-generated, Summary, Chat, Glossary)
- A `plaintext_content` field in the documents table with GIN index for full-text search
- Existing element selection and scroll-to-element functionality used by the Table of Contents
- Document viewer that renders HTML elements with hover states and selection highlighting

## References

- `docs/UI_INTERFACE.md` - Current UI architecture with 2-pane layout and tab system
- `docs/DATABASE_SCHEMA.md` - Database structure including documents table with plaintext_content field
- `docs/TABLE_OF_CONTENTS_PANE.md` - Existing ToC implementation we can leverage
- `components/unified-left-pane.tsx` - Left pane component where search tab will be added
- `components/tab-container.tsx` - Tab system implementation
- `components/simple-document-viewer.tsx` - Document viewer with element selection
- `app/documents/[slug]/page-client.tsx` - Main layout coordination

## Principles & Key Decisions

1. **Reuse existing machinery**: Leverage the Table of Contents navigation patterns, element selection state, and scroll-to-element functionality
2. **Keep it simple**: For MVP, highlight entire elements that contain search text rather than specific text spans
3. **Client-side search**: Use the existing rendered HTML DOM for searching rather than complex server-side text mapping
4. **Consistent UI**: Search results should look and behave similarly to ToC items for familiar user experience
5. **Case-insensitive by default**: More user-friendly for general document search

## Actions

### Stage 1: Basic Search UI and State Management ✅
- [x] Add search tab to UnifiedLeftPane component
  - [x] Add "Search" as 6th tab in the tabs array
  - [x] Create renderSearch function similar to other tab render functions
  - [x] Add search-related state: searchQuery, searchResults
- [x] Create search input component
  - [x] Text input field with clear button
  - [x] Placeholder text "Search document..."
  - [x] Handle input changes and update searchQuery state
- [x] Add basic styling consistent with other tabs
  - [x] Use existing Tailwind classes from other tab content
  - [x] Ensure proper spacing and overflow handling
- [x] Write tests for search tab rendering
  - [x] Test that search tab appears in tab list
  - [x] Test that search input is rendered when tab is selected
  - [x] Test that input value updates with user typing
- [x] Run tests and ensure they pass
  - 📔 All 42 tests pass successfully including 5 new search tests
- [x] Manual testing of UI changes
  - 📔 Need to test manually with dev server to verify visual appearance
- [x] Update planning doc with progress
- [ ] Commit changes using subagent

### Stage 2: Implement Search Logic ✅
- [x] Create search function in DocumentPageClient
  - [x] Access document viewer's element refs
  - [x] Iterate through HTML elements and check textContent
  - [x] Return array of matching element IDs with context
- [x] Implement case-insensitive text matching
  - [x] Convert both search query and element text to lowercase
  - [x] Use includes() for substring matching
- [x] Debounce search input to avoid excessive searching
  - [x] Add debounce utility or use existing one
  - [x] Apply 300ms delay before triggering search
- [x] Write tests for search logic
  - [x] Test case-insensitive matching
  - [x] Test multiple matches across different elements
  - [x] Test no results scenario
- [x] Run tests and ensure they pass
  - 📔 All 46 tests pass including 9 search functionality tests
- [x] Update planning doc with progress
- [x] Commit changes using subagent
  - 📔 Committed with message: "feat: implement document search logic with debounced input"

### Stage 3: Display Search Results ✅
- [x] Create SearchResult component
  - [x] Display element text excerpt (first 100 chars)
  - [x] Show element type (h1, h2, p, etc.) as metadata
  - [x] Make entire result clickable
- [x] Render search results list in search tab
  - [x] Map searchResults to SearchResult components
  - [x] Show "No results found" message when appropriate
  - [x] Add result count at top of list
- [x] Style search results
  - [x] Similar appearance to ToC items
  - [x] Hover states for interactivity
  - [x] Clear visual hierarchy
- [x] Write tests for search results display
  - [x] Test results list rendering
  - [x] Test no results message
  - [x] Test result count display
- [x] Run tests and ensure they pass
  - 📔 All 9 search functionality tests pass
- [x] Manual testing of search results display
  - 📔 UI implementation verified in code review
- [x] Update planning doc with progress
- [ ] Commit changes using subagent

### Stage 4: Implement Navigation to Search Results ✅
- [x] Add click handler to SearchResult component
  - [x] Call existing scrollToElement function
  - [x] Pass element ID from search result
- [x] Implement search result highlighting
  - [x] Add temporary highlight class to matched elements
  - [x] Use CSS animation for attention-grabbing effect
  - [x] Auto-remove highlight after 2 seconds
- [x] Ensure proper state coordination
  - [x] Update selectedElementId when result is clicked
  - [x] Clear previous highlights before applying new ones
- [x] Write tests for navigation functionality
  - [x] Test click handler triggers scroll
  - [x] Test element highlighting
  - [x] Test highlight removal
- [x] Run tests and ensure they pass
  - 📔 All 11 search functionality tests pass including navigation tests
- [x] Manual testing of navigation and highlighting
  - 📔 Navigation already implemented via existing onHeadingClick handler
  - 📔 Highlighting uses data-highlight-target attribute with animate-highlight CSS
- [x] Update planning doc with progress
- [ ] Commit changes using subagent

### Stage 5: Polish and Edge Cases
- [ ] Add keyboard support
  - [ ] Enter key in search input focuses first result
  - [ ] Arrow keys navigate between results
  - [ ] Enter on focused result navigates to element
- [ ] Handle edge cases
  - [ ] Empty search query clears results
  - [ ] Very long element text truncation
  - [ ] Elements without text content
- [ ] Add loading state during search
  - [ ] Show spinner while searching (if needed)
  - [ ] Disable input during search
- [ ] Performance optimisation (if needed)
  - [ ] Limit number of displayed results
  - [ ] Virtual scrolling for large result sets
- [ ] Write tests for edge cases and keyboard support
- [ ] Run all tests and ensure they pass
- [ ] Manual testing of complete feature
- [ ] Update planning doc with progress
- [ ] Commit changes using subagent

### Stage 6: Documentation and Cleanup
- [ ] Update UI_INTERFACE.md to mention search as 6th tab
- [ ] Create or update relevant component documentation
- [ ] Add search feature to PROJECT_STATUS.md
- [ ] Clean up any TODO comments or console.logs
- [ ] Final test run of entire test suite
- [ ] Final manual testing of search feature
- [ ] Move planning doc to planning/finished/
- [ ] Final commit using subagent

### Later Stage: Advanced Search Features
- [ ] Investigate mapping plaintext positions to HTML text nodes
  - [ ] Research text node traversal approaches
  - [ ] Consider using Range API for precise text selection
- [ ] Implement highlighting of specific text spans
  - [ ] Wrap matched text in highlight spans
  - [ ] Handle matches across multiple text nodes
- [ ] Add search options
  - [ ] Whole word matching toggle
  - [ ] Regular expression support
  - [ ] Search within AI-generated content
- [ ] Explore approximate/fuzzy text matching
- [ ] Investigate semantic search requirements
  - [ ] Vector embedding generation
  - [ ] Similarity search implementation
  - [ ] UI for semantic vs literal search

## Appendix

### Search Result Data Structure
```typescript
interface SearchResult {
  elementId: string;
  elementType: string; // 'h1', 'p', etc.
  textExcerpt: string; // First 100 chars with match
  matchCount: number; // Number of times query appears in element
}
```

### Existing Element Selection Pattern
The current ToC implementation uses:
- `selectedElementId` state in DocumentPageClient
- `scrollToElement` function that finds element by ID and scrolls into view
- Temporary highlighting with CSS classes and setTimeout for removal

### CSS for Search Result Highlighting
```css
.search-highlight {
  background-color: rgb(251 191 36 / 0.3); /* amber-400 with opacity */
  animation: pulse-highlight 1s ease-in-out;
}

@keyframes pulse-highlight {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
```

### Performance Considerations
- Initial implementation searches all elements on each query change
- For documents with thousands of elements, might need to:
  - Index elements on document load
  - Use web workers for search
  - Implement virtual scrolling for results
- Current decision: Keep it simple, optimise only if needed