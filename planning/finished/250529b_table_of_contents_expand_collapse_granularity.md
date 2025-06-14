# ToC Expand/Collapse and Granularity Control

**Progress**: All implementation stages completed (30/05/2025)
- Stage 1: HeadingTree component created and integrated ✓
- Stage 2: Expand/collapse functionality with persistent state ✓
- Stage 3: Granularity slider with hidden counts ✓
- Stage 4: Documentation and final testing ✓

## Goal, context

Improve the Table of Contents functionality with expand/collapse controls and granularity filtering to provide better navigation control for hierarchical document structures.

Currently, the ToC shows all headings in a flat hierarchical display. Users need the ability to:
1. Expand/collapse individual heading sections to hide/show their children in the ToC display (doesn't affect document pane)
2. Control overall granularity with a slider to show only top N levels
3. See visual indicators when content is hidden

The ToC has two tabs (Original and AI-generated) that currently use duplicate rendering logic. This needs to be abstracted into a shared component first.

## References

- `docs/TABLE_OF_CONTENTS_PANE.md` - Current ToC architecture and features documentation
- `components/table-of-contents.tsx` - Main ToC component with duplicated rendering logic in `renderOriginalTab()` and `renderAiGeneratedTab()`
- `components/tab-container.tsx` - Shared tabbed interface component used by ToC
- `docs/STYLING_OVERVIEW.md` - UI patterns including expand/collapse button styling (up/down arrows used in Summary tab)
- Screenshot showing current ToC interface with hierarchical heading display

## Principles, key decisions

- **Shared abstraction required**: Original and AI-generated tabs must use the same expand/collapse component to avoid code duplication
- **Independent state per tab**: Expand/collapse and granularity state should be separate between Original and AI-generated tabs
- **Slider placement**: Granularity slider placed *within* each tab, not above the tabs
- **State lifting**: Expand/collapse state lifted to TableOfContents to survive tab switches
- **Tree structure**: Use hierarchical tree data structure instead of flat array for simpler expand/collapse logic
- **Memory-only storage**: State stored in component memory only, not persisted to database or localStorage (future enhancement)
- **Simple granularity default**: Default to level 3, or fewer if document has fewer levels
- **Hidden content indication**: Show count format like "Section A (+5 hidden)" when count > 0, cap at "99+"
- **ToC pane only**: Expand/collapse affects only ToC display, never the document pane content

## Actions

### Stage 1: Create Shared HeadingTree Component ✓ COMPLETED
- [x] Build tree data structure utilities
  - [x] Create `HeadingNode` interface extending `Heading` with `children: HeadingNode[]`
  - [x] Create `buildHeadingTree(headings: Heading[]): HeadingNode[]` utility to convert flat array to tree
  - [x] Use `useMemo` to build tree only when headings change
- [x] Extract shared heading rendering logic into new `HeadingTree` component
  - [x] Component should accept props: `headings: Heading[]`, `themeColors`, `onHeadingClick`, `getTooltipContent`, `handleTooltipShow`
  - [x] Build tree structure internally from flat headings array
  - [x] Move all tooltip, indentation, and click handling logic to this component
  - [x] Support both blue (Original) and green (AI-generated) themes via props
- [x] Refactor `table-of-contents.tsx` to use `HeadingTree` component in both tabs
  - [x] Replace `renderOriginalTab()` with `<HeadingTree>` using blue theme colors
  - [x] Replace `renderAiGeneratedTab()` with `<HeadingTree>` using green theme colors
  - [x] Verify tooltips, clicking, and all existing functionality still works
- [x] Use subagent to run browser tests with Playwright MCP
- [x] Git commit: "refactor: extract shared HeadingTree component with tree structure"

### Stage 2: Add Expand/Collapse Functionality ✓ COMPLETED
- [x] Lift expand/collapse state to `TableOfContents` component
  - [x] Add `collapsedStates: Record<'original' | 'ai-generated', Set<string>>` to track per-tab state
  - [x] Pass collapsed state and toggle function as props to `HeadingTree`
  - [x] Clear AI-generated collapsed state when new headings are generated
- [x] Add expand/collapse UI controls in `HeadingTree`
  - [x] Add chevron buttons next to non-leaf nodes using real `<button>` elements
  - [x] Use Phosphor icons: CaretDown (expanded) / CaretRight (collapsed)
  - [x] Don't show expand/collapse controls for leaf nodes
  - [x] Render only visible nodes based on expanded state (skip rendering collapsed children)
- [x] Write unit tests
  - [x] Test tree building with example structure (H1:a -> H2:a_a, H2:a_b -> H3:a_b_a -> H4:a_b_a_a, H2:a_c)
  - [x] Test expand/collapse toggling
  - [x] Test that state persists when switching tabs
- [x] Use subagent to test in browser with Playwright MCP
- [x] Git commit: "feat: add expand/collapse controls with lifted state management"

### Stage 3: Add Granularity Slider Control ✓ COMPLETED
- [x] Add per-tab granularity state to `TableOfContents`
  - [x] Add `granularityLevels: Record<'original' | 'ai-generated', number>` state
  - [x] Calculate maximum heading depth from current headings
  - [x] Set default granularity to `Math.min(3, maxDepth)`
- [x] Create granularity slider UI within each tab
  - [x] Add slider component inside `HeadingTree` (receives granularity as prop)
  - [x] Range from 1 to maximum depth found in document
  - [x] Show current level label (e.g., "Showing levels 1-3")
- [x] Implement granularity filtering with hidden counts
  - [x] Filter nodes where `level > granularityLevel` but keep for counting
  - [x] Calculate hidden descendant count for each visible node
  - [x] Show "+N hidden" badge only when count > 0, cap at "99+"
  - [x] Ensure tooltips don't trigger for hidden headings
- [x] Write unit tests in subagent
  - [x] Test granularity filtering at different levels
  - [x] Test hidden count calculation including edge cases
  - [x] Test that "+0 hidden" is suppressed
  - [x] Test "99+" capping for deep structures
- [x] Use subagent to test granularity controls in browser
- [x] Update this planning doc with progress
- [x] Git commit: "feat: add per-tab granularity slider with hidden counts"

### Stage 4: Documentation and Final Testing ✓ COMPLETED
- [x] Update `docs/TABLE_OF_CONTENTS_PANE.md` with new features
  - [x] Document HeadingTree component and tree structure
  - [x] Document expand/collapse functionality with lifted state
  - [x] Document per-tab granularity control and hidden indicators
  - [x] Note that state is memory-only (not persisted)
- [x] Use subagent to run full test suite
- [x] Use subagent for final browser testing with Playwright MCP
- [x] Rename this doc to `250529b_table_of_contents_expand_collapse_granularity.md`
- [x] Git commit

### Future enhancements stage:
- [ ] Animation transitions for expand/collapse actions
  - See `planning/250530a_shadcn_ui_adoption.md` - "Future Stage: Animations for Expand/Collapse"
  - Will use shadcn/ui Collapsible component for smooth height animations
  - Zero custom animation code required

## Appendix

### Example ToC Hierarchy for Testing
```
H1: `a`
  H2: `a_a`
  H2: `a_b`
    H3: `a_b_a`
      H4: `a_b_a_a`
  H2: `a_c`
```

This structure should be used verbatim in unit tests to verify expand/collapse behavior:
- `a_a` and `a_c` are leaf nodes (no expand/collapse controls)
- `a_b` and `a_b_a` should show expand/collapse controls
- Collapsing `a_b` should hide `a_b_a` and `a_b_a_a`
- Granularity level 2 should hide `a_b_a` and `a_b_a_a`, with indicator showing "+2 hidden" on `a_b`

### User Requirements Summary
- Individual heading expand/collapse (separate state per tab)
- Granularity slider defaulting to level 3 or document max
- Hidden content count indicators ("Section A (+5 hidden)")
- Memory-only state management (no persistence yet)
- ToC pane display only (document pane unaffected)
- Real-time scroll tracking deferred to future enhancement

## Appendix - critique from another AI (o3)

Below is a (non-blocking) review of the staged plan together with a few ideas you might want to consider before you start coding.

1. Component structure & state-lifetime
   • A `HeadingList` that lives inside each tab will unmount every time the user switches tabs (the current `TabContainer` renders only the active tab’s content).  
     – If expand/collapse state is stored inside `HeadingList` you will lose it on every tab switch.  
     – Either (a) keep all tab panes mounted but hidden, or (b) lift the state one level up (e.g. a `useReducer` in `TableOfContents` keyed by tab id).  
   • The same point applies to tooltip caching, loading state, etc. Make sure they live at a level that is not destroyed on tab changes.

2. Flat array vs. tree model
   • Today headings are a flat list with just a `level` number.  As soon as you need
     – “hide children of collapsed parent”  
     – “(+N hidden)” counts  
     – granularity filtering  
     traversing by level becomes brittle and O(n²)ish.
   • Consider normalising once into a simple tree (parent/children arrays) in a `useMemo` hook:
     ```ts
     interface HeadingNode extends Heading {
       children: HeadingNode[]
     }
     ```
     The tree makes:
     – expand/collapse UI trivial (just skip rendering `children` if collapsed)  
     – hidden-count = `descendantCount(node) - visibleDescendantCount(node)`  
     – granularity filter = prune nodes where `level > sliderValue` (still keeps counts).

3. Independent vs. shared slider state
   • Placing the granularity slider above the tabs means it applies to **both** Original and AI lists. That feels right, but be explicit in the UX copy (“Applies to both views”) to avoid surprise.  
   • If users might want different granularities per view you’d need separate state per tab—easy if you adopt the per-tab state map mentioned earlier.

4. Data refresh
   • When AI headings are regenerated the list object identity changes; clear the corresponding `expandedHeadings` set so you don’t try to expand ids that no longer exist.  
   • Likewise for Original tab if the document is mutated.

5. Hidden-count edge cases
   • If a user collapses a node and then changes the granularity slider so that all its descendants are filtered out anyway, you might show “(+0 hidden)”.  Consider suppressing the badge when the count is 0.  
   • Very deep documents can make the badge a large number; maybe cap it at “99+”.

6. Accessibility & semantics
   • Use real `<button>` elements for the chevron toggles with `aria-expanded`, `aria-controls`, and keyboard support (`Space`, `Enter`, arrow keys) even though full keyboard navigation is deferred.  
   • Don’t forget `role="tree"`, `role="treeitem"` to make screen-reader hierarchy clear.

7. Performance / UX polish
   • For long docs (>1 000 headings) consider windowing (e.g. `react-virtualized`) during initial render; you can add this later, but keep it in mind when choosing a tree vs. flat representation.  
   • A small collapse/expand animation (tailwind `transition-[height]` or CSS `max-height`) gives a nicer feel with minimal work.

8. Testing strategy
   • Unit tests will cover the helper utilities. For the React behaviour, a few RTL tests around toggling and slider movement are usually enough; Cypress/Playwright E2E for the integrated ToC pane can catch regressions.  
   • Add one test that switches tabs back and forth to confirm state persistence, as this is easy to break.

9. Naming & cohesion
   • The new component might be better called `HeadingTree` or `TocList`—`HeadingList` suggests a flat list.  
   • If you refactor tooltip logic into the shared component, call it something like `HeadingItem` inside `HeadingTree` to keep responsibilities narrow.

10. Future persistence
    • You note “memory-only” state; leave the door open by shaping expand/collapse + granularity state like:
      ```ts
      interface TocViewState {
        expandedIds: string[]
        granularity: number
      }
      ```
      so saving to localStorage/Supabase later is a one-liner.

Potential road-blocks
• Duplicated heading text → duplicate generated ids (`heading-…`). The existing code may already suffer from this; the collapse map relies on ids being unique.  A UUID-v5 of `(documentId, headingPath)` when parsing headings would fix this once.
• The tooltip hover generates LL M requests even for headings hidden by granularity.  Wrap the `<Tooltip.Provider>` inside the visibility condition to avoid useless API calls.

Overall the staged plan looks solid; incorporating the points above should help avoid surprises and give you a smoother implementation path.
