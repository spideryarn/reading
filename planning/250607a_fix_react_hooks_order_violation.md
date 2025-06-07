# Fix React Hooks Order Violation in AI-Generated Headings Tab

## Goal

Fix the React hooks order violation error that occurs when clicking on the "AI-generated" tab in the unified left pane. The error message indicates:

```
React has detected a change in the order of Hooks called by AIGeneratedHeadingsTab. This will lead to bugs and errors if not fixed.
```

## Context

The Spideryarn Reading application has a unified left pane with 6 tabs (Original, AI-generated, Summary, Chat, Glossary, Search). When switching to the AI-generated tab, React detects that hooks are being called in a different order, which violates React's rules and can lead to unpredictable behavior.

## References

- `components/unified-left-pane.tsx` - Parent component that renders all tabs
- `components/table-of-contents-tabs.tsx` - Contains `AIGeneratedHeadingsTab` component (lines 480-1033)
- `components/tab-container.tsx` - Generic tab container component
- `components/resizable-document-layout.tsx` - Parent of UnifiedLeftPane, handles callbacks
- `docs/CODING_PRINCIPLES.md` - Emphasizes simplicity and robustness over performance
- `docs/UNIFIED_LEFT_PANE.md` - Architecture documentation for the left pane

## Requirements

From user conversation:
1. **State persistence across tab switches** - When switching between tabs, component state should be preserved
2. **State persistence when collapsing/expanding pane** - Collapsing the left pane shouldn't lose state
3. **Database loading on page reload** - Keep current behavior (load from database on page refresh)
4. **Slight delay on first tab open is acceptable** - Performance isn't the primary concern
5. **Consistency across all tabs** - Use the same approach for all tabs unless there's a good reason not to
6. **Prioritize simplicity, debuggability, and robustness over performance**

## Root Cause Analysis

The hooks order violation is caused by the tab content being recreated on every render of `UnifiedLeftPane`:

```tsx
const tabs: Tab[] = [
  {
    id: 'ai-generated',
    label: 'AI-generated',
    content: renderAIGeneratedTab(), // ❌ Creates new component instance every render
    ...
  },
  ...
]
```

This pattern causes:
- `AIGeneratedHeadingsTab` to be completely recreated on each parent render
- React to see it as a "new" component with different hook execution
- Loss of all component state on parent re-renders

## Alternative Solutions Considered

### 1. Lazy Loading Approach
Render tabs only when active:
```tsx
content: activeTab === 'ai-generated' ? renderAIGeneratedTab() : null
```
- ✅ Pros: Better performance, only renders active tab
- ❌ Cons: Would lose state when switching tabs, adds complexity

### 2. Component Instance Caching
Store component instances in state:
```tsx
const [tabComponents] = useState(() => ({ ... }))
```
- ❌ Cons: Props change over time, so this wouldn't work

### 3. Memoization Approach (Recommended)
Use `useMemo` to create stable component references:
```tsx
const aiGeneratedTabContent = useMemo(
  () => <AIGeneratedHeadingsTab {...props} />,
  [/* dependencies */]
)
```
- ✅ Pros: Simple, maintains state, fixes hooks issue
- ✅ Pros: Aligns with user's priority of simplicity over performance
- ⚠️ Cons: All tabs render even when hidden (acceptable trade-off)

## Chosen Solution

The memoization approach using `useMemo` is recommended because:
1. It's the simplest fix that meets all requirements
2. State persistence comes "for free" (components stay mounted)
3. No architectural changes needed
4. Easy to understand and debug
5. Performance cost is acceptable for 6 tabs with text content
6. Parent callbacks are already properly memoized with `useCallback`

## Actions

### Stage: Fix React hooks order violation

- [ ] Implement memoized tab content for all tabs in `UnifiedLeftPane`
  - [ ] Add `useMemo` for Original tab content
  - [ ] Add `useMemo` for AI-generated tab content
  - [ ] Add `useMemo` for Summary tab content
  - [ ] Add `useMemo` for Chat tab content
  - [ ] Add `useMemo` for Glossary tab content
  - [ ] Add `useMemo` for Search tab content
  - [ ] Update tabs array to use memoized content references
  - [ ] Ensure all dependencies are properly included in `useMemo` arrays

- [ ] Test the fix
  - [ ] Verify hooks order error is resolved
  - [ ] Test state persistence when switching tabs
  - [ ] Test state persistence when collapsing/expanding pane
  - [ ] Verify database loading still works on page refresh
  - [ ] Check that all tabs still function correctly

- [ ] Review and optimize
  - [ ] Check if `documentContext` in parent should be memoized (minor optimization)
  - [ ] Run existing tests to ensure no regressions
  - [ ] Update planning doc with progress

- [ ] Finalize
  - [ ] Create git commit following `docs/GIT_COMMITS.md`
  - [ ] Move this doc to `planning/finished/`

## Appendix

### Conversation Transcript

**User's initial problem:**
"When I click on AI-generated headings: React has detected a change in the order of Hooks called by AIGeneratedHeadingsTab. This will lead to bugs and errors if not fixed."

**Analysis revealed:**
- The `AIGeneratedHeadingsTab` component has 16 hooks (useState, useRef) and 3 useEffect hooks
- All hooks are called consistently at the top of the component
- The issue is caused by the parent component recreating the child component on every render

**User's requirements when asked about solution preferences:**
- State should persist when switching tabs
- State should persist when collapsing/expanding the left-hand pane
- Database loading on page reload should remain unchanged
- Slight delay on first tab open is acceptable
- Same approach should be used across all tabs for consistency
- Priority: simplicity & debuggability & robustness > performance

### Technical Details

The `UnifiedLeftPane` component currently creates tab content inline:
```tsx
// Current problematic pattern
const tabs: Tab[] = [
  {
    id: 'original',
    label: 'Original',
    content: renderOriginalTab(), // Called every render
  },
  // ... other tabs
]
```

The parent component (`ResizableDocumentLayout`) already properly memoizes callbacks:
- `handleHeadingClick` - wrapped in `useCallback` with `[]` dependencies
- `handleScrollToEntity` - wrapped in `useCallback` with `[elements, onElementSelect]`
- `handleToggleCollapse` - wrapped in `useCallback` with `[]`

This means the memoization approach will work effectively without needing to worry about unstable callback references.

### Document Size Considerations

User indicated documents are typically 10k words, rarely 100k words. This is well within browser capabilities for rendering multiple tabs simultaneously.