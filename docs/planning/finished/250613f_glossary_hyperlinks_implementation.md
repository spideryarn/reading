# Glossary Hyperlinks Implementation

## Goal, context

Implement hyperlinks in the document pane text for all exact-match locations that match glossary entity names/aliases. When clicked, these links should switch to the glossary tab and scroll to the relevant entry. When hovered, they should show the entity's brief explanation as a tooltip.

This builds on top of the existing glossary feature which extracts entities using LLM analysis and displays them in a dedicated pane.

## References

- `docs/reference/TOOL_GLOSSARY.md` - Current glossary feature documentation
- `docs/reference/TOOL_SEARCH_TEXT.md` - Text search implementation using Mark.js, provides patterns for highlighting text
- `docs/reference/DESIGN_TOOLTIPS.md` - Tooltip styling patterns using shadcn/ui
- `components/unified-left-pane.tsx` - Contains glossary display logic and entity click handlers
- `components/simple-document-viewer.tsx` - Document rendering component where highlights will be applied
- `lib/utils/search-context-extraction.ts` - Context extraction utilities that could be reused

## Principles, key decisions

Based on user requirements:

1. **Highlight all occurrences** - Not just first occurrence, all exact matches should be highlighted
2. **Keep it simple** - Don't worry about performance optimisation initially
3. **Always visible** - Glossary highlights should remain visible even when glossary tab is not active (unless this adds significant complexity)
4. **Visual design** - Implement multiple styles (dotted underline, icon indicator, combined) to evaluate what works best
5. **Click behaviour** - Clicking a glossary term should switch to glossary tab AND scroll to the entry
6. **Tooltip content** - Show brief explanation on hover (can be implemented in later stage)
7. **Overlap handling** - Use CSS layering/opacity to handle overlaps with search and semantic highlights
8. **Update on glossary load** - Highlights should appear/update when glossary is loaded or reloaded

## Stages & actions

### ✅ Stage: Sync latest changes and prepare
- [x] Run `./scripts/sync-worktrees.ts` in a subagent to pull latest from main
- [x] Review existing Mark.js usage in search functionality
- [x] Check current glossary entity structure and click handlers

### ✅ Stage: Implement basic glossary highlighting with Mark.js
- [x] Add glossary highlighting state to `SimpleDocumentViewer` props
- [x] Create Mark.js instance for glossary highlights (separate from search)
- [x] Extract all entity names and aliases from glossary entities
- [x] Apply highlights using Mark.js with `highlight-glossary` class
- [x] Ensure highlights are applied after document renders
- [x] Test with sample glossary data to verify basic highlighting works

### ✅ Stage: Implement multiple visual styles
- [x] Add CSS for dotted underline style
  ```css
  .highlight-glossary-dotted {
    border-bottom: 1px dotted #6B7280;
    cursor: help;
  }
  ```
- [x] Add CSS for icon indicator style
  ```css
  .highlight-glossary-icon::after {
    content: "📖";
    font-size: 0.75em;
    vertical-align: super;
  }
  ```
- [x] Add CSS for combined style (background + underline)
  ```css
  .highlight-glossary-combined {
    background-color: rgba(99, 102, 241, 0.1);
    border-bottom: 1px dotted #6366F1;
  }
  ```
- [x] Create a way to switch between styles (temporary dropdown or props)
- [x] Test all three styles with real document content
  - 📔 Added floating radio button controls for live style switching
  - 📔 All styles compile and render correctly

### Stage: Handle overlapping highlights
- [ ] Implement highlight priority order: glossary → semantic → search
- [ ] Use `exclude: ['mark']` option in Mark.js to prevent nested marks
- [ ] Add CSS for visual layering with different opacities
- [ ] Add overlap detection and apply additional CSS classes for overlapped elements
- [ ] Test with documents that have overlapping search, semantic, and glossary highlights
- [ ] Document the overlap handling approach for future reference

### Stage: Implement click handlers
- [ ] Add click event listeners to glossary mark elements
- [ ] Extract entity identifier from clicked element
- [ ] Use DocumentCommunicationContext to:
  - Switch to glossary tab
  - Scroll to the specific entity in glossary pane
- [ ] Ensure click handlers don't interfere with text selection
- [ ] Test click navigation with multiple glossary entities

### Stage: Make highlights persist across tab switches
- [ ] Move glossary highlight logic to parent component if needed
- [ ] Ensure highlights remain when switching between ToC, Search, Glossary tabs
- [ ] Handle cleanup when document changes
- [ ] Test persistence behavior thoroughly

### Stage: Add basic tooltips (optional for now)
- [ ] Integrate shadcn/ui tooltip components
- [ ] Map glossary marks to their entity data
- [ ] Show entity name on hover initially
- [ ] Test tooltip positioning and behavior
- [ ] Note: Brief explanation tooltips to be added in later iteration

### Stage: Integration testing and refinement
- [ ] Test with real documents containing many glossary terms
- [ ] Check performance with 50+ entities
- [ ] Verify highlights update when glossary is reloaded
- [ ] Test interaction between all three highlight types
- [ ] Use Puppeteer MCP in subagent to visually verify implementation
- [ ] Fix any edge cases or bugs discovered

### ✅ Stage: User review and style selection
- [x] Present all three visual styles to user
- [x] Get feedback on which style works best
- [x] Remove unused styles based on user preference
- [x] Document the chosen approach in code comments
  - 📔 **User Decision**: Selected dotted underline + icon indicator combination
  - 📔 **Removed**: Combined background style and all style switching UI
  - 📔 **Final Style**: Gray dotted underline with 📖 icon suffix for all glossary terms
- [x] Fix highlight persistence issue after entity click navigation
  - 📔 **Issue**: Glossary highlights were disappearing during tab switches due to React re-renders
  - 📔 **Root Cause**: `elements` dependency in useEffect caused highlights to clear on every re-render
  - 📔 **Solution**: Removed `elements` dependency from glossary highlighting useEffect (SimpleDocumentViewer:169)
  - 📔 **Verified**: Puppeteer testing confirms highlights now persist during tab switches ✅

### Stage: Documentation and cleanup
- [ ] Update `docs/reference/TOOL_GLOSSARY.md` with hyperlink functionality
- [ ] Add JSDoc comments to new functions
- [ ] Write unit tests for highlight application logic
- [ ] Update `docs/reference/CODING_GUIDELINES.md` if new patterns introduced
- [ ] Git commit with descriptive message

### Stage: Future enhancement preparation
- [ ] Document approach for adding brief explanation tooltips
- [ ] Note any performance optimisations that could be added later
- [ ] List any discovered limitations or edge cases
- [ ] Move planning doc to `docs/planning/finished/`

## Appendix

### Mark.js Configuration for Glossary

Based on search implementation, glossary highlighting will use:
```javascript
markInstance.mark(glossaryTerms, {
  className: 'highlight-glossary',
  separateWordSearch: false,  // Match exact phrases
  acrossElements: true,       // Handle terms split across HTML elements
  caseSensitive: false,       // Case-insensitive matching
  exclude: ['mark'],          // Don't highlight within existing marks
  each: function(element) {
    // Add click handler
    element.addEventListener('click', handleGlossaryClick)
    // Store entity reference for tooltip/click handling
    element.setAttribute('data-glossary-entity', entityName)
  }
})
```

### Overlap Handling Approach

Following research on overlapping highlights:
1. Short-term: Use Mark.js with unique classes and CSS opacity/layering
2. Apply highlights in priority order (lowest to highest visual importance)
3. Use CSS mix-blend-mode for visual overlap indication
4. Long-term: Consider CSS Custom Highlight API when browser support improves

### Entity Data Structure

From current implementation:
```typescript
interface Entity {
  name: string
  ontology: 'person' | 'place' | 'date' | 'theme' | 'event' | 
           'reference' | 'object' | 'organization' | 'concept' | 
           'definition' | 'other'
  aliases: string[]
  brief_explanation: string
  long_explanation?: string
}
```

### Visual Design Rationale

- **Dotted underline**: Academic, unobtrusive, doesn't interfere with readability
- **Icon indicator**: Clear visual marker but might clutter dense text
- **Combined approach**: Best visibility but might be too prominent

User will evaluate and choose preferred style after seeing them in context.