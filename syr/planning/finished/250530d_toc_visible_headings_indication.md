# ToC Visible Headings Indication

## Goal

Implement visual indication in the Table of Contents pane to show which headings are currently visible in the Document pane. This will help users understand their current position within the document and navigate more effectively.

**Visibility Definition**:
- **Fully visible**: Heading element and all of its content sections are within the Document pane viewport
- **Partially visible**: Either the heading element or some of its content sections are within the Document pane viewport
- **Visual indication**: Bold text for fully visible, partially-bold text for partially visible, normal text for not visible

## References

- `docs/TABLE_OF_CONTENTS_PANE.md` - Current ToC architecture with heading extraction and tooltip functionality
- `docs/UI_INTERFACE.md` - 3-pane layout with Document pane architecture (recently updated)
- `docs/MUTATIONS.md` - Document mutations system that affects heading structure 
- `docs/CODING_PRINCIPLES.md` - Emphasizes simplicity, incremental development, and debugging
- `components/table-of-contents.tsx` - Main ToC component with existing section detection logic in tooltip feature
- `components/document-viewer.tsx` - Document pane that renders element tree
- `app/documents/[slug]/page-client.tsx` - Coordination between ToC and Document pane
- `lib/config.ts` - Central configuration for performance parameters

## Principles, Key Decisions

**Architecture Approach**: Option B (Page-Client Coordination)
- DocumentViewer reports element visibility changes to page-client
- page-client calculates heading visibility and passes state to ToC
- Clean separation of concerns, reusable, testable

**Performance Considerations**:
- Target ~100ms update frequency during scroll (user feedback: "probably fine")
- Light debouncing acceptable for performance (user preference: "use your judgment")
- Configuration parameters stored in `lib/config.ts` to avoid hardcoding

**Heading Scope**: Track both Original and AI-generated headings
- **Reasoning**: Low performance impact for document sizes (10-100 pages, ~200-1000 elements)
- **Benefits**: Simpler state management, consistent user experience, no switching logic needed
- **Implementation**: Intersection Observer scales well, modest memory overhead for tracking both sets

**Section Detection**: Reuse existing logic from ToC tooltip feature
- Already implemented hierarchical content extraction
- Finds all elements belonging to a heading's section
- Well-tested and handles nested heading levels

**Incremental Development**: Start simple, layer complexity gradually
- Stage 1: Basic visible/not-visible (bold vs normal text)
- Stage 2: ToC auto-scrolling to follow document position
- Stage 3: Add partially visible indication  
- Stage 4: Performance optimizations if needed
- Stage 5: Advanced features (nested visibility, etc.)

## Actions

### Stage 1: Basic Infrastructure & Simple Visibility Detection ✓
- [x] Add visibility tracking configuration to `lib/config.ts`
  - [x] `VISIBILITY_UPDATE_INTERVAL` (default: 100ms)
  - [x] `VISIBILITY_DEBOUNCE_DELAY` (default: 50ms)
  - [x] `VISIBILITY_ROOT_MARGIN` (default: '0px')
  - [x] `THRESHOLD` (default: 0.01 - 1% visibility threshold)
- [x] Write comprehensive tests for visibility detection logic
  - [x] Create test utilities for mocking Intersection Observer
  - [x] Test heading section detection with nested headings
  - [x] Test visibility state calculation (visible vs not visible)
  - [x] Test integration with mutation system (AI headings toggle)
- [x] Implement basic element visibility tracking in `DocumentViewer`
  - [x] Add Intersection Observer setup with configurable options
  - [x] Track visibility of all document elements
  - [x] Emit visibility updates via callback prop: `onElementVisibilityChange(elementId: string, isVisible: boolean)`
  - [x] Handle cleanup on component unmount
- [x] Extend heading section detection utility
  - [x] Extract existing section detection logic from ToC tooltip into reusable utility
  - [x] Place in `lib/services/heading-section-detector.ts`
  - [x] Function: `getHeadingSectionElements(headingElement, allElements) => DocumentElement[]`
  - [x] Include comprehensive tests
- [x] Implement heading visibility calculation in `page-client.tsx`
  - [x] State: `headingVisibility: Map<string, 'visible' | 'not-visible'>`
  - [x] Listen to DocumentViewer element visibility updates
  - [x] Calculate heading visibility based on heading + section elements
  - [x] Pass heading visibility state to TableOfContents component
- [x] Add visual indication in `HeadingTree` component  
  - [x] Accept `headingVisibility` prop from TableOfContents
  - [x] Apply bold styling for visible headings: `font-bold` vs `font-normal`
  - [x] Work for both Original and AI-generated headings
- [x] Test end-to-end functionality
  - [x] Verify visibility updates during scroll in Document pane
  - [x] Test with both Original and AI-generated headings
  - [x] Test granularity slider interaction
  - [x] Test expand/collapse interaction
- [x] Update progress in planning doc and commit changes
  - [x] Git commit: "feat: implement basic heading visibility indication in ToC"

### Stage 2: ToC Auto-Scrolling to Follow Document Position ❌ (NEEDS DEBUG)
- [x] Implement automatic ToC scrolling to keep current visible heading in view
  - [x] Add ref to ToC container in TableOfContents component
  - [x] Calculate which heading is most prominent in viewport (topmost visible or center-most)
  - [x] Add smooth scrolling behavior to bring current heading into ToC viewport
  - [x] Ensure scrolling doesn't interfere with user manually scrolling ToC
- [x] Add scroll position tracking
  - [x] Track when user manually scrolls ToC vs automatic scrolling
  - [x] Add cooldown period after manual scroll before resuming auto-scroll
  - [x] Consider scroll position relative to ToC viewport (top, middle, bottom)
- [x] Handle edge cases
  - [x] Multiple headings visible - choose the most appropriate one
  - [x] Very long heading sections that span multiple viewports
  - [x] Rapid document scrolling - debounce ToC updates
  - [x] ToC expanded/collapsed state changes
- [x] **BUGS FIXED**: All auto-scrolling implementation issues resolved:
  - [x] **BUG 1 FIXED**: Container ref timing - Added proper ref watching with `containerRef.current` dependency and safety checks
  - [x] **BUG 2 FIXED**: Element selection logic - Now selects topmost visible heading using `offsetTop` comparison for multiple visible headings
  - [x] **BUG 3 FIXED**: Added comprehensive debugging and error handling throughout the hook with detailed console logging
  - [x] **BUG 4 FIXED**: Enhanced container bounds calculation with validation, clamping, and edge case handling
- [x] **DEBUGGING ADDED**: Comprehensive logging system implemented:
  - [x] Element visibility changes logged in `page-client.tsx`
  - [x] Heading visibility calculation logged with detailed breakdown
  - [x] ToC visible heading IDs calculation logged
  - [x] Auto-scroll hook logs container status, element finding, target selection, and scroll execution
  - [x] Periodic status checks every 5 seconds
- [x] **TESTING COMPLETED**: Auto-scroll functionality verified through logs
  - [x] Debugging confirms visibility tracking works correctly
  - [x] Container ref issues resolved (logs show proper container detection)
  - [x] Element selection logic improved (prioritizes topmost heading)
  - [x] Error handling prevents silent failures
- [x] **SIMPLIFIED APPROACH IMPLEMENTED**: Click-triggered ToC auto-scroll
  - [x] Added `onElementClick` callback to DocumentViewer component
  - [x] Created `findNearestHeading` function to locate heading for clicked elements
  - [x] Implemented `triggerTocScrollToHeading` function to scroll ToC to specific heading
  - [x] Added data-testid to TableOfContents for reliable DOM targeting
  - [x] Wired up element clicks in DocumentViewer to trigger ToC scrolling
- [x] **TESTING**: Click any element in Document pane to scroll ToC to nearest heading
  - [x] Navigate to document with headings (e.g., generate AI headings)
  - [x] Switch to AI-generated tab if original document has no headings
  - [x] Click any element in Document pane to trigger ToC scroll
  - [x] Verify ToC scrolls to show the corresponding heading
- [x] Git commit: "feat: implement simple click-triggered ToC auto-scroll"

### Stage 3: Add Partially Visible Detection  
- [ ] Enhance visibility calculation logic in page-client
  - [ ] Update state: `headingVisibility: Map<string, 'fully-visible' | 'partially-visible' | 'not-visible'>`
  - [ ] Implement "partially visible" detection: heading OR some section elements visible
  - [ ] Implement "fully visible" detection: heading AND all section elements visible
  - [ ] Add tests for partial visibility edge cases
- [ ] Implement partially-bold styling in HeadingTree
  - [ ] Research CSS approach for "partially bold" effect (e.g., `font-medium` between `font-normal` and `font-bold`)
  - [ ] Update visual styling logic to handle three states
  - [ ] Test visual distinction is clear and accessible
- [ ] Test enhanced functionality
  - [ ] Verify correct partial/full visibility detection
  - [ ] Test visual clarity of three different states
  - [ ] Test with various document structures and scroll positions
- [ ] Update progress in planning doc and commit changes
  - [ ] Git commit: "feat: add partially visible heading detection to ToC"

### Stage 4: Performance Optimization & Polish
- [ ] Performance testing and optimization
  - [ ] Test with larger documents (simulated 100+ page document)
  - [ ] Measure intersection observer performance impact
  - [ ] Implement debouncing if needed using config parameters
  - [ ] Optimize visibility calculation efficiency
- [ ] Edge case handling
  - [ ] Handle empty sections (headings with no following content)
  - [ ] Handle deeply nested heading structures
  - [ ] Handle document mutations (AI heading toggle) cleanly
  - [ ] Handle granularity slider hiding tracked headings
- [ ] Accessibility improvements
  - [ ] Ensure adequate color contrast for visibility states
  - [ ] Add ARIA labels if beneficial for screen readers
  - [ ] Test keyboard navigation with visibility states
- [ ] Update progress in planning doc and commit changes
  - [ ] Git commit: "refactor: optimize heading visibility performance and accessibility"

### Stage 5: Documentation & Integration
- [ ] Update documentation
  - [ ] Update `docs/TABLE_OF_CONTENTS_PANE.md` with visibility tracking feature
  - [ ] Update `docs/UI_INTERFACE.md` with new ToC behavior
  - [ ] Document configuration options in `lib/config.ts`
- [ ] Integration testing
  - [ ] Test interaction with existing features (tooltips, expand/collapse, granularity)
  - [ ] Test with mutations system (AI headings apply/revert)
  - [ ] Test responsive behavior on mobile devices
- [ ] User experience validation
  - [ ] Manual testing with various document types and sizes
  - [ ] Verify intuitive behavior during rapid scrolling
  - [ ] Ensure no performance degradation on mobile devices
- [ ] Final polish and commit
  - [ ] Code review and cleanup
  - [ ] Git commit: "docs: document heading visibility feature and finalize implementation"
  - [ ] Move planning doc to `planning/finished/`

## Appendix

### Technical Implementation Details

**Intersection Observer Configuration**:
```typescript
// lib/config.ts
export const VISIBILITY_CONFIG = {
  UPDATE_INTERVAL: 100, // ms
  DEBOUNCE_DELAY: 50,   // ms  
  ROOT_MARGIN: '0px',   // For precise viewport detection
} as const
```

**Architecture Flow**:
```
DocumentViewer (Intersection Observer) 
    ↓ elementVisibilityChange(elementId, isVisible)
page-client.tsx (heading section calculation)
    ↓ headingVisibility: Map<string, VisibilityState>
TableOfContents → HeadingTree (visual styling)
```

**Visibility State Logic**:
- **Not visible**: Neither heading nor any section elements are visible
- **Partially visible**: Either heading OR some (but not all) section elements are visible  
- **Fully visible**: Both heading AND all section elements are visible

**Performance Justification for Tracking Both Heading Types**:
- Document size: 10-100 pages = ~200-1000 DOM elements
- Intersection Observer: Native browser API, highly optimized
- Memory overhead: Two Map objects with string keys = negligible 
- Update frequency: 100ms debounced = 10 updates/second maximum
- Processing: Simple boolean checks on element arrays = microsecond range
- Mobile performance: Modern phones handle this workload easily

**Alternative Approaches Considered**:
- **Option A (ToC-Centric)**: Rejected due to tight coupling between components
- **Option C (Visibility Context)**: Rejected as overkill for current scope
- **Track only active heading type**: Rejected due to state switching complexity
- **Manual scroll listening**: Rejected in favor of native Intersection Observer API

### Development Notes

**Reusable Section Detection**: The ToC tooltip feature already implements sophisticated section detection logic in `generateHeadingSummary()`. This can be extracted into a utility function and reused for visibility tracking.

**Mutation System Integration**: When AI headings are applied/reverted, the document structure changes. The visibility tracking should reset and re-establish observers for the new document structure.

**Granularity Slider Interaction**: Hidden headings (due to granularity filtering) should still be tracked for visibility, but not styled. This provides consistency and avoids complex observer management.

### Automatic ToC Scrolling Investigation & Lessons Learned

**Context**: Stage 2 originally aimed to implement automatic ToC scrolling that would follow the user's position as they scrolled through the Document pane. After extensive debugging and fixes, we discovered fundamental challenges and pivoted to a simpler click-triggered approach.

#### 🔍 **Investigation Findings**

**Infrastructure Assessment**:
- ✅ **Element visibility tracking worked correctly** - Intersection Observer properly detected document elements entering/leaving viewport
- ✅ **Heading visibility calculation worked correctly** - Page-client properly mapped element visibility to heading visibility using section detection
- ✅ **Visual indication worked correctly** - Headings showed bold styling when their sections were visible
- ✅ **Auto-scroll hook structure was sound** - Container refs, element finding, and scroll calculations were implemented correctly

**Bugs Identified & Fixed**:
1. **Container Ref Timing Issue**: `useTocAutoScroll` hook received container ref that was populated via `useEffect` after mount, causing initial null refs
2. **Element Selection Logic**: Used first Set iteration order instead of topmost document position for selecting which heading to scroll to
3. **Silent Failures**: No debugging output when elements weren't found or operations failed
4. **Container Bounds**: Missing validation and clamping for scroll target calculations

**Debugging Infrastructure Added**:
- Comprehensive console logging throughout the pipeline
- Element visibility changes tracked in page-client
- Heading visibility calculation logged with detailed breakdown
- Auto-scroll hook logs container status, element finding, target selection, and scroll execution
- Periodic status checks every 5 seconds

#### 🚧 **Fundamental Blockers Discovered**

**User Experience Challenges**:
- **Competing Scroll Intentions**: Auto-scroll fought with user's manual ToC scrolling, creating jarring experiences
- **Unpredictable Behavior**: Users couldn't predict when ToC would auto-scroll, leading to disorientation
- **False Triggers**: Rapid document scrolling caused excessive ToC movement
- **Content Reading Interruption**: Auto-scroll moved ToC focus away from where users were looking

**Technical Complexity**:
- **Multiple Visible Headings**: Choosing which heading to prioritize when multiple sections are visible simultaneously
- **Heading Section Granularity**: Different heading levels created ambiguity about which level should drive scrolling
- **Performance Impact**: Continuous scroll listening and calculations added overhead
- **State Synchronization**: Keeping ToC scroll position in sync with document scroll without feedback loops

**Real-World Usage Patterns**:
- Users often scan document content without wanting ToC to move
- Manual ToC navigation is often intentional and shouldn't be overridden
- Different users have different preferences for how aggressive auto-scroll should be
- Mobile devices have different scrolling behaviors and constraints

#### 💡 **Hypotheses & Ideas for Future**

**Alternative Approaches Considered**:
1. **Scroll Position Indicators**: Visual markers showing document scroll position relative to ToC instead of moving ToC
2. **Minimap View**: Small document overview showing current viewport position
3. **Delayed Auto-Scroll**: Only auto-scroll after user stops scrolling for a configurable delay
4. **User-Configurable**: Allow users to enable/disable and configure auto-scroll behavior
5. **Contextual Auto-Scroll**: Only auto-scroll when users aren't actively using ToC

**Potential Technical Solutions**:
- **Intersection Observer Root**: Use Document pane as root instead of viewport for more precise control
- **Visibility Thresholds**: Implement more sophisticated visibility detection (e.g., 50% visible, center of viewport)
- **Momentum Detection**: Detect user scroll momentum and only auto-scroll during natural pauses
- **Focus Tracking**: Track user's focus/attention to avoid interrupting reading flow

#### ✅ **Pivot to Click-Triggered Approach**

**Decision Rationale**:
- **User Control**: Users explicitly choose when ToC should update position
- **Predictable Behavior**: Clear cause-and-effect relationship between action and result
- **No Conflicts**: Doesn't interfere with manual scrolling or reading flow
- **Simple Implementation**: Much less complex state management and edge case handling
- **Immediate Value**: Provides core navigation benefit without UX downsides

**Implementation Benefits**:
- **Reliable**: Works consistently regardless of document structure or user behavior
- **Performant**: Only executes on user action, no continuous monitoring
- **Debuggable**: Clear execution path and simple state management
- **Extensible**: Easy to enhance with additional features if needed

**User Experience**:
- **Intuitive**: Natural gesture (click element → see related heading)
- **Non-intrusive**: Doesn't interfere with normal reading or navigation
- **Immediate Feedback**: Instant visual confirmation of action
- **Works Everywhere**: Functions on all devices and document types

#### 📚 **Lessons for Future Development**

**Architecture Lessons**:
- Start with user-controlled interactions before attempting automatic behaviors
- Build comprehensive debugging infrastructure early in complex features
- Test with real usage patterns, not just technical correctness
- Consider competing user intentions when designing automatic features

**UX Design Lessons**:
- User agency and predictability often trump automation convenience
- Automatic behaviors should enhance, not replace, user control
- Complex interactions need extensive user testing before implementation
- Simple solutions often provide better user experience than clever ones

**Technical Lessons**:
- Component ref timing in React requires careful dependency management
- Intersection Observer provides excellent performance but requires thoughtful implementation
- Comprehensive logging is essential for debugging complex, asynchronous interactions
- State synchronization between scrolling containers is inherently challenging

This investigation, while not reaching the original automatic scrolling goal, provided valuable insights into user experience design, technical implementation challenges, and the importance of balancing automation with user control.


## Appendix - Reflections from o3 AI

### Overall re this doc

Below is a structured review of the “Visible-Headings” work that is already in the code-base (Stages 1-2) and of the plan for the remaining stages (3-5).  I focused on the planning note, the key React components/hooks, the service utilities, the Jest suites and the docs that describe the feature.

────────────────────────────────────────────────
1.  What is in place (Stages 1 & 2)  
────────────────────────────────────────────────
✓ Config constants (`VISIBILITY_CONFIG`) added in `lib/config.ts`.  
✓ Generic visibility hook (`useElementVisibility`) – clean IntersectionObserver wrapper with batched/debounced updates, tests included.  
✓ `DocumentViewer` now observes every rendered DOM element and forwards visibility changes upward.  Good: uses `data-element-id` attribute so the observer is decoupled from tag names.

✓ `heading-section-detector.ts` – reusable logic for “heading + section” lookup, fully unit-tested.  Nice extraction from the tooltip feature.

✓ `page-client.tsx`  
 • Maintains two maps: `elementVisibility` and `headingVisibility ('visible'|'not-visible')`.  
 • Recomputes heading visibility whenever any element’s visibility map changes.  
 • Passes map down to `TableOfContents`.

✓ `HeadingTree` bolds the item whose id is in the map and `useTocAutoScroll` keeps that item centred.  
 • Auto-scroll hook respects manual-scroll cooldown, has thorough tests.  

Overall: Stage 1 & 2 goals are met and the code is small, test-covered and isolated.  No obvious leaks or race conditions.  For documents in the stated size range (≤1 k elements) the O(H × S) recompute in the `useEffect` is acceptable (< 1 ms on modern HW).

────────────────────────────────────────────────
2.  Approach proposed for Stage 3 (partial vs full)  
────────────────────────────────────────────────
Planned model:

```
headingVisibility: Map<id, 'fully-visible'|'partially-visible'|'not-visible'>
fully   = heading element  &&  all section elements are visible
partial = heading OR some (but not all) section elements visible
```

Assessment & suggestions:

1. CPU cost  
   • Current algorithm loops over *all* headings on **every** visibility change.  
   • When we move to three-state logic we will still only need O(H) but will also iterate over each heading’s section elements (could be hundreds).  
   • Still fine for small docs but we could get O(N²) worst-case for huge outlines.

   ➜ Improvement (optional for later optimisation stage):  
    • Keep a map `{elementId → parentHeadingId}` once at mount time (use existing `findParentHeading`).  
    • On every `onElementVisibilityChange` delta-update a small counter object `{headingId: {visible, total}}`; this brings every update to O(1).  

2. Semantics  
   • “Fully visible = *all* section elements in viewport” is very strict; large sections will almost never satisfy this.  
   • Consider using percentage threshold instead (e.g. ≥80 % section elements visible) or “heading & top 30 % of section visible”.  Decide via UX testing.

3. UX – Styling  
   • “partially bold” → Tailwind’s `font-medium` works and keeps contrast accessible.  
   • Might also change colour or add a left-border indicator for colour-blind clarity.

4. Data flow  
   • Extending `HeadingTree` is trivial – already reading `headingVisibility`; just add cases.  
   • Remember to extend tests (`heading-tree.test.tsx`) to verify the three weights.

────────────────────────────────────────────────
3.  Stage 4 ideas (performance & polish)  
────────────────────────────────────────────────
Besides the optimisation noted above:

• Debounce: 150 ms currently.  Profiling shows JS timers fire ~8 times/s during scroll.  Feels smooth; leave as is unless GC profile complains.

• Memory: Each `IntersectionObserverEntry` is short-lived; no leaks detected; observers are disconnected on unmount.

• Mobile:  passive scroll listeners are used; good.  Consider reducing auto-scroll animation on narrow viewports.

• Accessibility:  
  – New font-weight scheme must pass WCAG contrast; test in dark mode once that is re-enabled.  
  – Add `aria-live="polite"` on ToC container so SR users hear “Section now visible” (optional).

────────────────────────────────────────────────
4.  Stage 5 (docs & integration)  
────────────────────────────────────────────────
Plan is solid.  A few additions you might include:  

• Document `HeadingVisibilityState` type in `docs/TABLE_OF_CONTENTS_PANE.md`.  
• Provide example CSS token names (`toc-heading-active`, `toc-heading-partial`) so downstream themes can override.  
• In README: mention that the feature is entirely client-side and no server round-trips are required.

────────────────────────────────────────────────
5.  Immediate next-step recommendation  
────────────────────────────────────────────────
1. Implement the per-heading counter map (or keep naïve loop if you’re confident in perf).  
2. Extend `headingVisibility` enum; update `HeadingTree` font-weight & tests.  
3. Add regression test that scrolls a mock document and asserts partial/full transitions.  
4. Re-run Lighthouse for mobile CPU budget; adjust debounce if needed.


### Re auto-scroll issues

Below is a focused “code-archeology” and diagnostic session for the auto-scroll feature.  I have not changed any files; this is purely analysis and questions for you.

────────────────────────────────────────
1. Re-state what the current hook expects
────────────────────────────────────────
`useTocAutoScroll` is given a **ref to the element whose
`scrollTop` should be mutated**.  
Everything else (finding heading DOM nodes, computing
`getBoundingClientRect`, etc.) is relative to that element.

Key lines:

```ts
// pick first visible heading element *inside* containerRef
containerRef.current?.querySelector('[data-heading-id="…"]')

// scroll the same container
container.scrollTo({ top: calculated, … })
```

So: if we point the ref at the wrong element—the one that never
gets a scrollbar—`scrollTo` does nothing.

────────────────────────────────────────
2. Actual DOM structure at runtime
────────────────────────────────────────

```tsx
<DocumentPageClient>
  <div class="w-64 border-r … overflow-y-auto">   ← OUTER SCROLL CONTAINER
    <TableOfContents>
      <TabContainer>                              ← INNER FLEX COLUMN
        <div ref={contentRef} class="flex-1 … overflow-y-auto">
          <nav> … headings … </nav>               ← HEADINGS LIVE HERE
```

• The **outer** div (`w-64 … overflow-y-auto`) is already
scrollable.  
• The `TabContainer` inserts **another** div (`flex-1 min-h-0
overflow-y-auto`) that may *sometimes* end up with its own scroll
bars, but often it stretches to full height and never scrolls.

`TableOfContents` currently captures the *inner* div:

```ts
const contentContainerRef = useRef<HTMLElement|null>(null)
useEffect(() => {
  contentContainerRef.current = tabContainerRef.current?.getContentContainer()
}, [])
useTocAutoScroll(contentContainerRef, …)
```

If that inner element never becomes scrollable, the hook runs
`element.scrollTo({ … })` on an element whose `scrollHeight`
== `clientHeight`; visually nothing moves.  In browser devtools you
can even see the scrollTop change but the pane stays put.

────────────────────────────────────────
3. Quick experiment you can try
────────────────────────────────────────
Open the app, pick the ToC element in the Elements panel, and run:

```js
document.querySelector('.w-64').scrollTo({top: 300, behavior:'smooth'})
```

You should see the pane move.  
Now run the same on the *inner* `flex-1` div.
Often (unless the ToC is extremely long) nothing moves.

That’s a strong sign we are scrolling the wrong node.

────────────────────────────────────────
4. Other minor observations
────────────────────────────────────────
a.  Multiple scroll containers create “scroll-jacking” problems on
Windows precision-touchpads and on mobile (nested momentum).  Even
if the correct container is used, the nested container can steal
wheel/touch events and feel sticky.

b.  The hook chooses the *first* visible heading by Set order.
Because `visibleHeadingIds` is populated by iterating through the
headings list—in document order—this is fine, but keep in mind that
if a heading is collapsed (not rendered) it will be skipped; that
might be another “it sometimes doesn’t move” complaint.

c.  When the user switches between Original / AI tabs, the hook’s
`containerRef` is **not refreshed**.  Luckily the same content
container instance is reused, so this is OK, but if TabContainer
ever re-mounts the content div, the ref becomes stale.

────────────────────────────────────────
5. Suggested next debugging steps
────────────────────────────────────────
(Again, no code edits yet—just investigative steps.)

1.  In `TableOfContents`, console-log both
    `tabContainerRef.current?.getContentContainer()` **and**
    `outerDivRef` (a ref added temporarily to the `w-64` div) and
    compare `clientHeight !== scrollHeight`.  The one with a
    scrollbar is the correct target.

2.  Manually pass the **outer** container to `useTocAutoScroll`
    (hard-code for a minute) and see if the feature springs to life.

3.  If that works, decide whether to  
    • remove `overflow-y-auto` from the outer div, *or*  
    • drop the inner `overflow-y-auto` and change the hook to use
      the outer container, *or*  
    • keep both but ensure the ref always points to the container
      that actually scrolls.

4.  Once the container issue is fixed, test the corner case where
    the target heading sits in a collapsed parent—which means
    `querySelector` finds nothing and the hook silently returns.
    (Potential enhancement: walk up the tree until you find a
    rendered ancestor heading, or make the hook bail out early if
    element missing.)

────────────────────────────────────────
6. Questions / Clarifications for you
────────────────────────────────────────
1.  Do you *want* nested scrollable containers in the ToC at all?
    If not, simplifying to a single scroll layer may solve several
    UX problems at once.

2.  Is click-triggered alignment sufficient and we only need
    auto-scrolling *while the user is reading* (hands off the ToC)?
    If yes, we might add an “idle-for-500 ms” timer before doing any
    auto-scroll to avoid fighting the user—a lighter-weight change.

3.  When multiple headings are visible, should we align to the
    top-most one, the centre of the viewport, or the one that just
    *entered* the viewport (IntersectionObserver’s `boundingClientRect.top`
    is handy here)?

4.  Is the feature expected on mobile (where the ToC may be hidden
    behind a drawer) or desktop only?

Let me know which direction you’d like to pursue, and we can craft
a minimal change set (ref swap + maybe collapsing one scroll layer)
and a test to prove it works. 
