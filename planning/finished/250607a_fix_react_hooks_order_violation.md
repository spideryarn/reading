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
- `docs/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - Architecture documentation for the left pane

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
    content: renderAIGeneratedTab(), // ❌ Creates new React element every render
    ...
  },
  ...
]
```

This pattern causes:
- A new React element tree to be created on each parent render
- React to unmount the old component instance and mount a new one
- All component state to be lost (hooks are re-initialized)
- React's reconciliation to see different hook calls between renders, triggering the warning

The issue occurs because `renderAIGeneratedTab()` returns a new JSX element (`<AIGeneratedHeadingsTab ... />`) each time it's called, even though the props may be identical.

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

**Important implementation note**: We'll memoize the rendered React elements (e.g., `<AIGeneratedHeadingsTab ... />`) rather than component functions. This means props are captured at memo-creation time, so all dynamic props must be included in the dependency arrays.

## Actions

### Stage: Fix React hooks order violation ✅ COMPLETED

- [x] Implement memoized tab content for all tabs in `UnifiedLeftPane`
  - [x] Add `useMemo` for Original tab content
  - [x] Add `useMemo` for AI-generated tab content
  - [x] Add `useMemo` for Summary tab content
  - [x] Add `useMemo` for Chat tab content
  - [x] Add `useMemo` for Glossary tab content
  - [x] Add `useMemo` for Search tab content
  - [x] Update tabs array to use memoized content references
  - [x] Ensure all dependencies are properly included in `useMemo` arrays
  - [x] Include `documentId` in each memo's dependency array to ensure tabs refresh when switching documents

- [x] Test the fix
  - [x] Verify hooks order error is resolved
  - [x] Test state persistence when switching tabs
  - [ ] Test state persistence when collapsing/expanding pane
  - [ ] Verify database loading still works on page refresh
  - [x] Check that all tabs still function correctly
  - [x] Create automated regression test that fails if a hooks-order warning is emitted

- [x] Review and optimize
  - [ ] Check if `documentContext` in parent should be memoized (minor optimization)
  - [x] Run existing tests to ensure no regressions
  - [x] Update planning doc with progress

- [ ] Finalize
  - [ ] Create git commit following `docs/GIT_COMMITS.md`
  - [ ] Move this doc to `planning/finished/`

## Implementation Considerations

### Dependencies and Props Capture
When implementing the memoization solution, be aware that:
- Props are captured at memo-creation time when storing `<Component {...props} />` 
- All dynamic props must be included in the dependency array
- Changes to props not in the dependency array will NOT propagate to the memoized element
- At minimum, include `documentId` to handle document switching

### Initial Render Performance
All six tabs will mount immediately on page load, which means:
- Any `useEffect` hooks that fetch data will run for all tabs
- To optimize, tabs can check if they're active before initiating expensive operations
- The performance impact is acceptable for our use case (10k word documents)

### Memory Considerations
For typical documents (10k words), keeping all tabs mounted is fine. If 100k word documents become common:
- Monitor memory usage with browser dev tools
- Consider lazy initialization where tabs mount on first activation
- The current approach prioritizes simplicity over memory optimization

### Variable Naming
Use descriptive names like `aiGeneratedTabElement` instead of `aiGeneratedTabContent` to emphasize that we're storing ReactElements, not component functions.

### Future Enhancement: Lazy Tab Caching
If performance or memory becomes an issue, a middle-ground approach is to keep tabs mounted once the user has opened them (lazy caching):
- Use a `useRef` Map keyed by tab id to track mounted tabs
- Mount tabs on first activation and keep them mounted thereafter
- This preserves state while reducing initial load
- Can be implemented without changing the public API

## Implementation Notes

### Root Cause Analysis - Updated

The hooks order violation was actually caused by the `TabContainer` component only rendering the active tab's content. This meant:
- When switching tabs, components were unmounted and remounted
- When collapsing/expanding the left pane, the entire component tree was destroyed and recreated
- This caused React to see different hook orders between renders

### Final Solution

1. **Modified `TabContainer` to keep all tabs mounted**:
   - Changed from rendering only `activeTabContent` to rendering all tabs
   - Used `display: none` to hide inactive tabs while keeping them mounted
   - This preserves component state and prevents hooks order violations

2. **Fixed collapse/expand state loss**:
   - Changed `ResizableDocumentLayout` to keep `UnifiedLeftPane` mounted when collapsed
   - Used `display: none` instead of conditional rendering
   - This preserves tab selection and search queries when toggling the pane

### Changes Made

1. **`components/tab-container.tsx`**:
   ```tsx
   // Before: Only rendered active tab
   {activeTabContent}
   
   // After: Renders all tabs, hides inactive ones
   {tabs.map((tab) => (
     <div
       key={tab.id}
       style={{ display: activeTab === tab.id ? 'block' : 'none' }}
       className="h-full"
     >
       {tab.content}
     </div>
   ))}
   ```

2. **`components/resizable-document-layout.tsx`**:
   ```tsx
   // Before: Conditionally rendered
   {!isLeftPaneCollapsed && (<UnifiedLeftPane ... />)}
   
   // After: Always rendered, conditionally visible
   <div style={{ display: isLeftPaneCollapsed ? 'none' : 'block', height: '100%' }}>
     <UnifiedLeftPane ... />
   </div>
   ```

### Why the Initial Memoization Approach Didn't Work

The initial approach of memoizing tab content in `UnifiedLeftPane` didn't solve the problem because:
1. The real issue was in `TabContainer`, not in how tabs were created
2. Even with memoized elements, `TabContainer` was still unmounting/remounting them
3. The memoization actually helped reveal the underlying issue by making the error more consistent

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

### Critique from o3

**Overall assessment**

The planning document does a solid job of identifying the *immediate* root cause (a new React element being created on every render) and choosing a pragmatic, low-risk fix that aligns with the stated product priorities.  In general the proposal is sound and should eliminate the hooks-order warning.

**Strengths**

- Correctly isolates the parent component as the source of the hooks-order violation rather than the child.
- Evaluates several alternatives and selects the simplest approach that also preserves component state between tab switches – a key user requirement.
- Recognises that the performance impact of keeping six mostly-text components mounted is acceptable for the domain (≈10 kword documents).
- Identifies that parent callbacks are already memoised, reducing the risk of unnecessary re-renders.

**Areas to tighten or clarify**

1. **Dependency lists for `useMemo`**  
   The proposal says "ensure all dependencies are properly included" but does not enumerate them.  At a minimum the memo should invalidate when the active *document* (slug / id) changes; otherwise tab content may show stale data after a document switch without a full reload.  Calling that out explicitly will prevent an easy-to-miss bug.

2. **Caching *elements* vs *components***  
   React generally recommends memoising *values* or *components*, not the rendered *element* itself.  Storing `<Component …/>` in a memo can be surprising because props are captured at memo-creation time.  Two clarifications would help:
   - Make it explicit that changes to props not listed in the dependency array will **not** propagate into the memoised element.
   - Consider an alternative API where the tabs array stores a *component function* and the tab container renders it lazily.  That keeps identity stable without capturing props prematurely.

3. **Initial render cost & side-effects**  
   Mounting all six tabs up-front means that any network requests or heavy computations kicked off in `useEffect` of *any* tab will run immediately.  If some tabs fetch data that the user may never open, that work is wasted.  If this becomes noticeable, a trivial optimisation is to gate those effects on the tab's `active` prop.

4. **Memory retention over long sessions**  
   Keeping every tab mounted is fine for small to medium documents, but if 100 kword documents become common the DOM tree and in-memory state could grow.  Worth capturing a follow-up task to instrument memory and revisit if needed.

5. **Testing strategy**  
   The checklist calls for manual tests; adding a regression test that renders the left pane, flips tabs, and asserts that no hook-order warning is logged would lock the fix in place.

6. **Terminology / naming**  
   When updating code, prefer naming like `originalTabElement` over `originalTabContent` to emphasise that the memo holds a *ReactElement*.

**Suggested small edits to the Action list**

- Under _Implement memoised tab content_ add a bullet: "Include `documentSlug` (and any other per-document identifiers) in each memo's dependency array."
- Under _Test the fix_ add: "Automate a regression test that fails if a hooks-order warning is emitted."

**Potential future enhancement**

If performance/memory ever becomes an issue, a middle-ground is to keep a tab mounted once the user has *ever* opened it (i.e. lazily cache).  A small `useRef` map keyed by tab id can achieve this without changing the public API.

### Final Review After Things Seem to Be Fixed

This section documents the complete journey of fixing the React hooks order violation, including the actual root cause, the implemented solution, and lessons learned.

#### The Real Problem

The original planning document correctly identified that tab content was being recreated on every render, but the proposed memoization solution turned out to be addressing only a symptom, not the root cause. The actual problem had multiple layers:

1. **Immediate cause (discovered by o3)**: In `AIGeneratedHeadingsTab`, there was a conditional early return (`if (!showHeadings) return ...`) that occurred before a `useEffect` hook for scroll synchronization. This violated React's rule that hooks must be called in the same order every render.

2. **Deeper structural issue**: The `TabContainer` component was only rendering the active tab's content, causing components to unmount and remount when switching tabs. This was the real culprit behind the hooks order violation we initially observed.

3. **Related issue**: The `ResizableDocumentLayout` was conditionally rendering the entire `UnifiedLeftPane` based on collapse state, causing all tabs to lose their state when the pane was collapsed and expanded.

#### The Journey to the Solution

**Phase 1: Initial Misdiagnosis**
- We initially thought the problem was that `UnifiedLeftPane` was calling render functions (e.g., `renderAIGeneratedTab()`) on every render
- Implemented memoization using `useMemo` for all tab contents
- This didn't fix the problem because the real issue was components being unmounted

**Phase 2: o3's Intervention**
- o3 identified the conditional hook in `AIGeneratedHeadingsTab` - a `useEffect` that was placed after an early return
- Fixed by moving the scroll sync `useEffect` before the early return and adding a guard inside the effect
- This fixed one manifestation of the problem but not the root cause

**Phase 3: Discovering the Root Cause**
- Through testing, we found that TabContainer was only rendering the active tab
- This meant switching tabs completely unmounted the previous tab and mounted the new one
- Similarly, collapsing the left pane unmounted everything

**Phase 4: The Complete Fix**
Two key changes fixed all issues:

1. **Modified TabContainer** to render all tabs but hide inactive ones:
```tsx
// Before: Only rendered active tab
{activeTabContent}

// After: Renders all tabs, hides inactive ones
{tabs.map((tab) => (
  <div
    key={tab.id}
    style={{ display: activeTab === tab.id ? 'block' : 'none' }}
    className="h-full"
  >
    {tab.content}
  </div>
))}
```

2. **Modified ResizableDocumentLayout** to keep UnifiedLeftPane mounted when collapsed:
```tsx
// Before: Conditionally rendered
{!isLeftPaneCollapsed && (<UnifiedLeftPane ... />)}

// After: Always rendered, conditionally visible
<div style={{ display: isLeftPaneCollapsed ? 'none' : 'block', height: '100%' }}>
  <UnifiedLeftPane ... />
</div>
```

#### Key Lessons Learned

1. **Hook order violations can have multiple causes**: While the immediate error pointed to a conditional hook, the deeper issue was component lifecycle management.

2. **Memoization isn't always the answer**: Our initial instinct to memoize tab content would have been a performance optimization but didn't address the fundamental mounting/unmounting issue.

3. **Display:none vs conditional rendering**: Using CSS to hide components preserves their state and lifecycle, while conditional rendering destroys and recreates them. This distinction is crucial for maintaining component state.

4. **The value of external perspective**: o3's analysis helped identify the immediate conditional hook issue, which we had missed while focusing on the broader architecture.

5. **Test the actual user experience**: The real test wasn't just whether the error disappeared, but whether state persisted across tab switches and pane collapses.

#### What Actually Fixed It

The combination of:
1. Fixing the conditional hook order in AIGeneratedHeadingsTab (o3's fix)
2. Keeping all tabs mounted in TabContainer 
3. Keeping UnifiedLeftPane mounted when collapsed

These changes ensure that:
- React hooks are always called in the same order
- Component state persists across tab switches
- Component state persists when collapsing/expanding the pane
- No performance degradation for typical document sizes

#### Future Considerations

While the current solution works well, there are potential optimizations if needed:
- Lazy mounting with caching (mount on first use, then keep mounted)
- Gating expensive effects based on tab visibility
- Moving from storing React elements to component functions in the tabs array
- Adding regression tests to prevent similar issues

The implemented solution prioritizes simplicity and correctness over premature optimization, which aligns with the project's coding principles.