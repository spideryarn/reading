# Cross-Pane Communication Refactor

## Goal

Implement proper cross-pane communication for document position synchronization across tabs in the unified left pane. Currently using ad-hoc DOM events, but need a more structured approach to maintain document position state across tab switches.

### Specific Requirements
- When user clicks search result → scrolls document → switches to ToC tab, the ToC should be scrolled to match current document position
- State persists during page session but can reset on page reload
- User interactions happen every few seconds (moderate frequency)
- Support for ToC clicks, search results, glossary terms, and chat references

## Context

The Spideryarn Reading app has a 2-pane layout with a unified left pane containing multiple tabs (Original ToC, AI ToC, Summary, Chat, Glossary, Search). Currently using custom DOM events for communication between panes, but this doesn't support the shared state requirement for document position synchronization.

## References

- `docs/CROSS_PANE_COMMUNICATION.md` - Deep dive analysis of communication patterns with recommendations
- `components/unified-left-pane.tsx` - Current implementation with DOM event listeners
- `components/resizable-document-layout.tsx` - Event dispatching from document clicks
- `docs/CODING_PRINCIPLES.md` - Emphasis on simplicity and debugging ease
- `docs/ARCHITECTURE.md` - Overall application architecture

## Principles, Key Decisions

- **Simplicity first**: Choose patterns that are easy to understand and debug
- **Moderate frequency**: User interactions every few seconds (not performance-critical)
- **Shared state requirement**: Need persistent document position across tab switches
- **React patterns preferred**: Use built-in React features where possible
- **Gradual migration**: Keep existing events working during transition

### Decision: React Context over Zustand
Based on the moderate frequency of updates (every few seconds), React Context is the recommended approach:
- No performance concerns at this frequency
- No external dependencies
- Pure React patterns
- Simpler than state management libraries

## Actions

### Stage: Set up React Context infrastructure
- [x] Create `lib/context/document-communication-context.tsx` with:
  - [x] DocumentPosition interface (elementId, scrollOffset, timestamp)
  - [x] DocumentCommunicationState interface
  - [x] DocumentCommunicationActions interface
  - [x] Context provider component with proper TypeScript types
  - [x] useDocumentCommunication hook

### Stage: Add provider to layout
- [x] Wrap ResizableDocumentLayout children with DocumentCommunicationProvider
- [x] Ensure provider is at correct level to cover both panes
- [x] Test that context is accessible in both UnifiedLeftPane and document pane - Added console logs to verify

### Stage: Implement document position tracking
- [x] Update document pane clicks to set currentPosition in context
- [x] Add scroll position detection when user manually scrolls - Detects current heading with 150ms debounce
- [x] Ensure position updates include timestamp for debugging

### Stage: Implement ToC synchronization
- [x] In table-of-contents-tabs components:
  - [x] Use useDocumentCommunication to read currentPosition
  - [x] Add useEffect to sync ToC scroll when tab becomes active
  - [x] Handle case where position elementId doesn't exist in current ToC
- [x] Add highlighting for current heading in ToC:
  - [x] CSS highlight already implemented (bg-yellow-100 with 2s fade)
  - [x] ToC components already apply highlight based on currentPosition
  - [x] Highlight updates when document position changes
  - [ ] Test highlight persists when switching between Original/AI-generated tabs
- [ ] Test clicking document → switching to ToC tab → verify sync and highlight

### Stage: Migrate search results
- [x] Update search results to use context scrollToElement action
- [ ] Remove custom event dispatching for search clicks (keeping old system during migration)
- [ ] Test search → document scroll → ToC sync flow

### Stage: Migrate glossary clicks
- [x] Update glossary entity clicks to use context
- [x] Ensure glossary maintains its current scroll-to functionality via scrollToElement
- [ ] Test glossary → document → ToC sync

### Stage: Add debugging support
- [x] Add console logging in development for all position changes - Already implemented with [DocumentComm] prefix
- [ ] Create debug panel (if in dev mode) showing current position state (optional enhancement)
- [x] Document debugging approach in code comments - Logging uses NODE_ENV check

### Stage: Test edge cases
- [ ] Test rapid clicks (ensure state updates correctly)
- [ ] Test switching between multiple tabs quickly
- [ ] Test with documents that have no headings
- [ ] Test with very long documents
- [ ] Run existing tests to ensure no regressions

### Stage: Clean up old event system
- [ ] Remove custom DOM event listeners from UnifiedLeftPane
- [ ] Remove event dispatching from ResizableDocumentLayout
- [ ] Update any remaining components using old pattern
- [ ] Clean up any related types/interfaces

### Stage: Documentation and commit
- [ ] Update inline code comments explaining the pattern
- [ ] Update `docs/CROSS_PANE_COMMUNICATION.md` with implementation notes
- [ ] Create concise migration guide for future similar refactors
- [ ] Use subagent to commit with appropriate message
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` to summarize completion

### Stage: Final review
- [ ] Manual testing of all communication flows
- [ ] Performance check (should be negligible impact)
- [ ] Code review for any missed cleanup
- [ ] Move this planning doc to `planning/finished/`

## Appendix

### Current Event Flow
```typescript
// Current pattern (to be replaced)
// Document click → CustomEvent('doc-heading-click') → UnifiedLeftPane listener → ToC scroll
```

### New Context Flow
```typescript
// New pattern
// Document click → setCurrentPosition() → context state update → ToC useEffect → ToC scroll
```

### Migration Strategy Notes
- Keep both patterns working during migration
- Migrate one communication type at a time
- Test each migration before moving to next
- Can roll back individual migrations if issues arise

### Alternative Considered: Zustand
- Would provide better performance optimization
- Selective subscriptions prevent unnecessary re-renders
- But overkill for moderate frequency updates
- Adds external dependency
- Decision: Stick with React Context for simplicity