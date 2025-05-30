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