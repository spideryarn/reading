# Tool URL State Management

## Goal

Implement URL-based state management for document tools to enable:
- Shareable links to specific tool states (e.g., glossary with highlighted term, search with query)
- Browser history navigation (back/forward) for tool interactions
- Bookmarkable document views with tool configurations
- Type-safe URL parameter handling with nuqs library

## Context

Currently, Spideryarn Reading tools maintain state only in memory. Users cannot share specific views or return to previous tool states via browser history. We need URL state management that:
- Makes tool states shareable without requiring full architectural changes
- Works with existing tool implementations
- Provides human-readable URLs without base64 encoding
- Handles both simple (tab selection) and complex (search parameters) states

## References

- `docs/reference/CROSS_PANE_COMMUNICATION.md` - Current state management via DocumentCommunicationContext
- `docs/reference/UNIFIED_LEFT_PANE.md` - Tab system that will sync with URL state
- `components/unified-left-pane.tsx` - Main pane implementation
- `lib/contexts/document-communication-context.tsx` - Central state management to enhance
- `planning/250614b_unified_tool_registry_architecture.md` - Future tool architecture (optional dependency)
- `planning/250614c_llm_tool_function_calling.md` - LLM integration (uses URL state)

## Principles & Key Decisions

1. **Human-readable URLs** - No base64 encoding; important parameters on the left
2. **Progressive enhancement** - Add URL state to existing tools without breaking changes
3. **Use nuqs library** - Type-safe URL state management for Next.js App Router
4. **Push vs Replace history** - Push for significant navigation, replace for UI state changes
5. **Performance** - Debounce search (300ms), throttle scroll (1000ms)
6. **Backwards compatibility** - Support existing bookmarks and migrate gracefully

## Stages & Actions

### Stage: Preparation and sync
- [x] Run `./scripts/sync-worktrees.ts` to pull latest changes from main
- [x] Review current tool implementations to understand state patterns

### Stage: Install and setup nuqs
- [x] Install nuqs library: `npm install nuqs`
- [x] Create `lib/tools/url-state-types.ts` with URL parameter types
  - [x] Define tab enum values
  - [x] Define parameter types for each tool
  - [x] Create type-safe parsers
- [x] Configure nuqs in app layout if needed

### Stage: Create URL state utilities
- [x] Create `lib/tools/url-state.ts` for URL management
  - [x] URL to state parsing utilities
  - [x] State to URL generation helpers
  - [x] History management utilities (push vs replace logic)
  - [x] Legacy URL migration adapter
- [x] Create `lib/tools/hooks/use-tool-url-state.ts` hook
  - [x] Integrate with nuqs parsers
  - [x] Bidirectional state sync with DocumentCommunicationContext
  - [x] Debouncing logic for search/typing
  - [x] Throttling logic for scroll position
- [x] Write tests for URL state utilities
- [x] Run tests

### Stage: Enhance DocumentCommunicationContext
- [x] Update `lib/contexts/document-communication-context.tsx`
  - [x] Add URL state synchronization
  - [x] Maintain backwards compatibility
  - [x] Connect activeTab to URL parameter
  - [x] Add methods for tool-specific state updates
- [x] Update context tests
- [x] Run all tests

### Stage: Simple implementation - Tab state
- [x] Add basic tab parameter to document pages
  - [x] Update document page component to read URL state
  - [x] Sync activeTab with URL ?tab= parameter
  - [ ] **Integration Issue**: Find where VerticalIconNav handles tab clicks
  - [ ] Connect tab click handlers to URL state updates
  - [ ] Test tab switching updates URL
  - [ ] Test browser back/forward navigation
- [ ] Implement push vs replace logic for tab changes
- [ ] Test with all existing tabs

### Stage: Tool state - Glossary
- [ ] Add glossary-specific URL parameters
  - [ ] Add ?term= parameter for highlighted term
  - [ ] Update GlossaryPanel to read from URL state
  - [ ] Sync term selection with URL
- [ ] Test glossary URL state
  - [ ] Share link with specific term
  - [ ] Browser navigation preserves term
  - [ ] Clear term updates URL

### Stage: Complex state - Search
- [ ] Add search-specific URL parameters
  - [ ] Add ?q= for search query
  - [ ] Add ?type= for search type (text/semantic)
  - [ ] Add ?case= for case sensitivity
  - [ ] Implement 300ms debouncing for query updates
- [ ] Update search implementation in unified-left-pane.tsx
  - [ ] Read initial state from URL
  - [ ] Update URL on search changes
  - [ ] Handle empty query state
- [ ] Test search URL state thoroughly

### Stage: Additional tool states
- [ ] Add summary parameters (?level=brief|moderate|detailed)
- [ ] Add chat state (?conversation=id)
- [ ] Add highlights state (?highlight=criteria)
- [ ] Test each tool's URL integration

### Stage: History management refinement
- [ ] Implement push vs replace decision matrix
  - [ ] Tab changes: push
  - [ ] Search submit: push
  - [ ] Search typing: replace
  - [ ] UI preferences: replace
- [ ] Add tests for history behavior
- [ ] Test user flows with back/forward

### Stage: Migration and edge cases
- [ ] Create legacy URL adapter
  - [ ] Handle old bookmark formats
  - [ ] Log deprecation warnings
  - [ ] Redirect to new format
- [ ] Handle URL length limits
  - [ ] Implement parameter truncation for very long values
  - [ ] Consider localStorage for overflow state
- [ ] Test edge cases
  - [ ] Invalid parameters
  - [ ] Missing document
  - [ ] Conflicting states

### Stage: Documentation
- [ ] Create `docs/reference/ARCHITECTURE_URL_STATE.md` , as per `WRITE_EVERGREEN_DOC.md`
  - [ ] Document URL parameter schema
  - [ ] Provide examples for each tool
  - [ ] History management guidelines
  - [ ] Migration guide for bookmarks
  - [ ] **Add nuqs v2 note**: Document that no provider is needed for Next.js App Router
  - [ ] **Add search pattern**: Document the submitted flag pattern and rationale
- [ ] Update existing tool documentation with URL examples

### Stage: Testing and validation
- [ ] Use subagent for comprehensive testing
  - [ ] Test all tools with URL state
  - [ ] Cross-browser testing
  - [ ] Mobile browser testing
  - [ ] Share links between sessions
- [ ] Performance testing
  - [ ] Measure impact of URL updates
  - [ ] Verify debouncing works correctly
  - [ ] Check for memory leaks

### Stage: Research and refinement
- [ ] Research URL state best practices (use subagent)
  - [ ] How do other Next.js apps handle complex URL state?
  - [ ] Find cleaner patterns for search submission handling
  - [ ] Research browser history UX patterns and user expectations
- [ ] Refine search submission pattern if better approach found
- [ ] Clean up TypeScript 'any' types in URL state code

### Stage: Final review
- [ ] Code review with focus on:
  - [ ] Type safety
  - [ ] Performance impact
  - [ ] User experience
  - [ ] Edge case handling
- [ ] Update planning doc with outcomes
- [ ] Git commit following guidelines

## Implementation Examples

### nuqs Hook Example

```typescript
import { useQueryStates, parseAsString, parseAsStringEnum } from 'nuqs'

const tabValues = ['original', 'ai-generated', 'summary', 'chat', 'glossary', 'search', 'highlights'] as const
const levelValues = ['brief', 'moderate', 'detailed'] as const
const searchTypes = ['text', 'semantic'] as const

export function useDocumentToolState() {
  const [state, setState] = useQueryStates({
    tab: parseAsStringEnum(tabValues).withDefault('original'),
    term: parseAsString,
    q: parseAsString,
    type: parseAsStringEnum(searchTypes).withDefault('text'),
    case: parseAsBoolean.withDefault(false),
    level: parseAsStringEnum(levelValues),
    highlight: parseAsString,
  })

  // Debounced update for search
  const debouncedSetSearch = useMemo(
    () => debounce((q: string) => setState({ q }), 300),
    [setState]
  )

  // Throttled update for scroll
  const throttledSetScroll = useMemo(
    () => throttle((pos: string) => setState({ scroll: pos }), 1000),
    [setState]
  )

  return {
    state,
    setState,
    setSearch: debouncedSetSearch,
    setScroll: throttledSetScroll,
  }
}
```

### URL State Examples

#### Simple States
```
/documents/my-doc?tab=summary
/documents/my-doc?tab=glossary&term=quantum
/documents/my-doc?tab=search&q=consciousness
```

#### Complex States
```
/documents/my-doc?tab=search&q=blockchain&type=semantic&case=true
/documents/my-doc?tab=summary&level=detailed
/documents/my-doc?tab=highlights&highlight=technical+terms
```

### Push vs Replace Decision Matrix

| Action | History Strategy | Rationale |
|--------|-----------------|-----------|
| Tab change | Push | Users expect Back to return to previous tab |
| Search submit | Push | Completed searches are navigation points |
| Search typing | Replace | Don't pollute history with every keystroke |
| Scroll position | Replace | Transient UI state |
| Summary level | Replace | UI preference, not navigation |
| Open glossary term | Push | Specific content navigation |
| Toggle pane | Replace | UI layout preference |

### History Management Implementation

```typescript
function updateToolState(
  changes: Record<string, any>, 
  options?: { push?: boolean }
) {
  const shouldPush = options?.push ?? shouldPushForChange(changes)
  
  if (shouldPush) {
    router.push(createURL(changes))
  } else {
    router.replace(createURL(changes), { scroll: false })
  }
}

function shouldPushForChange(changes: Record<string, any>): boolean {
  // Tab changes always push
  if ('tab' in changes) return true
  
  // Search submission (has query and user pressed enter)
  if ('q' in changes && changes.submitted) return true
  
  // Specific navigation (glossary term, etc)
  if ('term' in changes) return true
  
  // Everything else replaces
  return false
}
```

## Success Criteria

1. Users can share links to specific tool states
2. Browser back/forward navigation works intuitively
3. URLs remain human-readable and concise
4. No performance degradation from URL updates
5. Existing bookmarks continue to work
6. Implementation requires minimal changes to existing tools

## Risks & Mitigations

1. **URL length limits** - Implement parameter truncation and consider localStorage for overflow
2. **Performance impact** - Use debouncing/throttling and measure impact
3. **Browser compatibility** - Test across browsers, especially mobile
4. **State conflicts** - Define clear precedence rules for conflicting parameters
5. **Migration issues** - Provide adapter for old URL formats

## Future Considerations

- This URL state system will integrate seamlessly with the unified tool registry (see `planning/250614b_unified_tool_registry_architecture.md`)
- LLM function calling can read/write URL state for tool invocation (see `planning/250614c_llm_tool_function_calling.md`)
- Consider server-side state storage for very complex states
- Analytics can track which URL parameters are most used

## Related Documents

- `planning/250614b_unified_tool_registry_architecture.md` - Tool architecture that can leverage URL state
- `planning/250614c_llm_tool_function_calling.md` - LLM integration that uses URL state
- Original unified planning doc (to be deleted): `planning/250613c_unified_tool_architecture_url_state_llm_integration.md`

## Appendix: Implementation Surprises & Issues

### Major Issues
None identified - all surprises were minor and resolved during implementation.

### Minor Issues & Observations

1. **nuqs v2 Provider Not Required** (Resolved)
   - Expected to need NuqsProvider wrapper in layout
   - v2 works directly with Next.js App Router
   - Simplified implementation but should be documented

2. **Search Query History Complexity** (Needs refinement)
   - `shouldPushHistory` requires special handling for search submission
   - Current solution uses a `submitted` flag that gets stripped
   - Works but feels hacky - may need cleaner approach later

3. **Tab Click Handler Location** (Integration pending)
   - Tab switching handled in VerticalIconNav, not unified-left-pane
   - Requires tracing through component hierarchy
   - More complex integration than initially anticipated

4. **TypeScript 'any' Types in Tests** (Technical debt)
   - Multiple instances of `any` types in URL state code
   - Works but reduces type safety
   - Should be cleaned up for better maintainability

### Documentation Needs

1. **nuqs v2 Integration Pattern**
   - Document that no provider is needed for Next.js App Router
   - Add to TOOL_URL_STATE.md when created

2. **Search Submission Pattern**
   - Document the submitted flag pattern for search
   - Explain push vs replace decision logic clearly

### Research Opportunities

1. **URL State Best Practices**
   - Research how other Next.js apps handle complex URL state
   - Look for cleaner patterns for search submission handling

2. **Browser History UX Patterns**
   - Research user expectations for back/forward with tool states
   - Validate our push/replace decisions against common patterns