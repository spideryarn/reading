# Simple Glossary Search Implementation

## Goal, Context

Add simple text search functionality to the glossary tab to help users quickly find specific entities. This addresses the immediate need to filter glossary entries by name/aliases, and lays the groundwork for a future "add to glossary" feature where users can search for terms that don't exist yet.

The current glossary displays all entities in a single scrollable list. As documents get longer and glossaries grow larger, users need a way to quickly locate specific entities without scrolling through the entire list.

Key requirements:
- **Simple**: Exact text matching on entity names and aliases only
- **Real-time**: Filter as user types (debounced for performance)
- **Client-side**: No API calls, filter existing loaded entities
- **Clear UX**: Show filtered results with badge indicating subset view
- **Inside existing tab**: Add search input to top of Glossary tab

## References

- `components/unified-left-pane.tsx` - Contains `GlossaryDisplay` component that needs modification
- `docs/reference/AI_GLOSSARY.md` - Documents current glossary implementation and entity structure
- Existing search tab implementation - Reference for debounced input patterns (but not Mark.js highlighting)
- `Entity` interface in glossary route - Shows name/aliases structure for filtering

## Principles, Key Decisions

**Keep it Simple**: User explicitly wants to avoid over-engineering this. No fuzzy search, no complex search infrastructure, no Mark.js integration. Just basic React state and array filtering.

**Client-side Only**: Filter existing entities in memory rather than API calls. This is fast and doesn't require backend changes.

**Exact Text Matching**: Case-insensitive string includes, not fuzzy matching or complex search algorithms.

**Search Scope**: Only search entity `name` and `aliases` fields, not explanations or other metadata.

**UX Pattern**: Filter results in place (don't show all with highlights), with clear indication that results are filtered.

**Debouncing**: Reuse debouncing pattern for performance, but don't need the complex Mark.js machinery from text search.

## Stages & Actions

### Preparatory
- [ ] Run `./scripts/sync-worktrees.ts` to pull latest changes from main

### Stage: Basic Search Input and State Management
- [ ] Add search input component to top of GlossaryDisplay
  - [ ] Use controlled input with React state
  - [ ] Add placeholder text like "Search glossary..."
  - [ ] Position above the entities list with appropriate spacing
- [ ] Implement search state management
  - [ ] Add `searchTerm` state to GlossaryDisplay component
  - [ ] Add debounced search to avoid excessive filtering (reuse existing debounce utility)
  - [ ] Clear search when tab changes or glossary reloads

### Stage: Filtering Logic
- [ ] Implement client-side filtering function
  - [ ] Create `filterEntities` function that searches entity.name and entity.aliases
  - [ ] Use case-insensitive string.includes() for exact matching
  - [ ] Return filtered array of entities
- [ ] Apply filtering to entity display
  - [ ] Filter entities before rendering in the map function
  - [ ] Maintain existing entity card rendering logic

### Stage: Filtered Results UX
- [ ] Add "showing subset" indicator
  - [ ] Display badge/message when search is active showing "X of Y results"
  - [ ] Style consistently with existing design patterns
  - [ ] Hide when search is empty (show all entities)
- [ ] Add clear search functionality
  - [ ] Add X button or escape key to clear search
  - [ ] Return to showing all entities
- [ ] Handle edge cases
  - [ ] "No matches found" state with helpful message
  - [ ] Preserve search term when entities reload (unless explicitly cleared)

### Stage: Testing and Polish
- [ ] Write automated tests for search functionality
  - [ ] Test filtering logic with various search terms
  - [ ] Test edge cases (empty search, no matches, special characters)
  - [ ] Test debouncing behavior
- [ ] Manual testing in browser
  - [ ] Test search with real glossary data
  - [ ] Verify performance with larger entity lists
  - [ ] Check accessibility (keyboard navigation, screen readers)
- [ ] Code review and cleanup
  - [ ] Ensure code follows existing patterns in unified-left-pane.tsx
  - [ ] Add appropriate TypeScript types
  - [ ] Remove any unused imports or code

### Stage: Documentation and Completion
- [ ] Update docs/reference/AI_GLOSSARY.md to document search functionality
- [ ] Update planning doc with progress and any discoveries
- [ ] Follow instructions in `docs/DEBRIEF_PROGRESS.md` for summary
- [ ] Commit changes following `docs/GIT_COMMITS.md` (use subagent)
- [ ] Move planning doc to `planning/finished/` and commit

# Appendix

## Entity Structure for Search
```typescript
interface Entity {
  name: string        // Primary search target
  aliases: string[]   // Secondary search targets
  ontology: string    // Not searched
  brief_explanation: string  // Not searched (for this simple version)
  // ... other fields not relevant for search
}
```

## Search Algorithm Pseudocode
```typescript
function filterEntities(entities: Entity[], searchTerm: string): Entity[] {
  if (!searchTerm.trim()) return entities;
  
  const term = searchTerm.toLowerCase();
  return entities.filter(entity => 
    entity.name.toLowerCase().includes(term) ||
    entity.aliases.some(alias => alias.toLowerCase().includes(term))
  );
}
```

## Rejected Alternatives

**Mark.js Integration**: Considered highlighting matches within entity cards, but user correctly identified this as unnecessary complexity for simple filtering use case.

**Fuzzy Search**: Considered Fuse.js or similar for typo tolerance, but exact matching keeps implementation simple and requirements clear.

**Dedicated Search Tab**: Considered adding to existing search tab, but keeping it in glossary tab maintains context and avoids interface crowding.

**API-based Search**: Considered server-side search for future extensibility, but client-side filtering is faster and simpler for current needs.

## Implementation Notes

The existing `unified-left-pane.tsx` already has patterns for:
- Loading states and error handling
- Tab-specific state management  
- Entity card rendering with consistent styling
- Responsive design patterns

This search feature should integrate naturally with these existing patterns rather than introducing new architectural concepts.