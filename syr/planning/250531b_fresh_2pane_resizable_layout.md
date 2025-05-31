# Goal

Replace the problematic 3-pane layout with a clean 2-pane implementation using shadcn/ui Resizable components, consolidating all navigation/tools into a unified left pane while fixing persistent CSS and scrolling issues.

## Context

Current problems with the 3-pane layout:
- Inconsistent CSS patterns between panes
- Persistent vertical scrolling issues  
- Complex state management across multiple components
- Fixed widths limiting flexibility

User requirements:
- Consolidate to 2 panes: unified left pane (5 tabs) + document viewer
- Fix CSS/scrolling issues that have "plagued the project"
- Use shadcn/ui components for cleaner implementation
- Future vision: vertical icon navigation on far left
- Start simple, add collapsible/resizable features incrementally

## References

- `docs/UI_INTERFACE.md` - Current problematic 3-pane layout
- `app/documents/[slug]/page-client.tsx` - Current layout coordinator
- `components/document-viewer.tsx` - Contains document + tools panes
- `components/table-of-contents.tsx` - Current left pane
- `components/tab-container.tsx` - Reusable tab component
- `planning/250530b_collapsible_resizable_panes.md` - Resizable component patterns
- `planning/250530a_shadcn_ui_adoption.md` - shadcn/ui setup (prerequisite)
- [shadcn/ui Resizable docs](https://ui.shadcn.com/docs/components/resizable)

## Principles & Key Decisions

1. **Fresh start**: Build new unified component rather than refactoring existing
2. **shadcn/ui foundation**: Use ResizablePanelGroup for proper layout/scrolling
3. **Single source of truth**: One TabContainer with all 5 tabs
4. **Progressive enhancement**: Start without resize handles, add later
5. **Left pane size**: 30% default (adjustable later via handles)
6. **Clean architecture**: Remove all CSS Grid, use ResizablePanelGroup throughout
7. **Preserve functionality**: All current features must work identically

## Actions

### Stage 1: Prerequisites & Setup ✓
- [x] Verify shadcn/ui is properly set up (`planning/250530a_shadcn_ui_adoption.md`)
- [x] Install Resizable component with subagent:
  - [x] Run `printf "\n" | npx shadcn@latest add resizable`
  - [x] Verify installation in `components/ui/resizable.tsx`
  - [x] Test basic ResizablePanelGroup in isolation
- [x] Analyze current component data flow
  - [x] Map all props passed between components
  - [x] Document state management requirements
  - [x] List all callback functions and events
- [x] Update todo list with implementation progress

### Stage 2: Create Unified Left Pane Component ✓
- [x] Create new `components/unified-left-pane.tsx`
  - [x] Accept all necessary props from both ToC and Tools
  - [x] Set up TabContainer with 5 tabs: Original, AI-generated, Summary, Chat, Glossary
  - [x] Move tab content rendering from both components
  - [x] Ensure proper height inheritance for scrolling
- [x] Extract shared logic
  - [x] Move glossary fetch logic from DocumentViewer
  - [x] Move heading click handlers from TableOfContents
  - [x] Consolidate loading/error states
- [x] Test each tab independently
  - [x] Original headings navigation works
  - [x] AI heading generation works
  - [x] Summary display works
  - [x] Chat interface works
  - [x] Glossary generation and click-to-scroll works
- [x] Git commit: "feat: create unified left pane component with all 5 tabs"

### Stage 3: Implement ResizablePanelGroup Layout ✓
- [x] Create new `components/resizable-document-layout.tsx`
  ```tsx
  <ResizablePanelGroup direction="horizontal" className="h-full">
    <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
      <UnifiedLeftPane {...leftPaneProps} />
    </ResizablePanel>
    <ResizablePanel defaultSize={70}>
      <SimpleDocumentViewer {...documentProps} />
    </ResizablePanel>
  </ResizablePanelGroup>
  ```
- [x] Create simplified document viewer
  - [x] Remove grid layout and tools pane code
  - [x] Keep only document structure rendering
  - [x] Ensure proper scrolling with `h-full overflow-y-auto`
- [x] Wire up in DocumentPageClient
  - [x] Replace current 3-pane layout
  - [x] Pass all required props to new components
  - [x] Maintain existing state management
- [x] Test core functionality
  - [x] Document scrolling works properly
  - [x] Element selection and highlighting works
  - [x] Cross-pane communication (heading clicks, glossary clicks)
- [x] Git commit: "feat: implement 2-pane layout with ResizablePanelGroup"

### Stage 4: Fix Scrolling & CSS Issues ✓
- [x] Standardize scrolling patterns
  - [x] Ensure all panels use `h-full` for proper height inheritance
  - [x] Remove any hardcoded heights
  - [x] Use consistent `overflow-y-auto` on scrollable areas
- [x] Clean up CSS
  - [x] Remove all CSS Grid code
  - [x] Remove complex flexbox nesting
  - [x] Use ResizablePanelGroup's built-in layout
- [x] Fix TabContainer scrolling
  - [x] Ensure tab content area has proper height constraints
  - [x] Test scrolling in all 5 tabs with long content
- [x] Polish visual design
  - [x] Consistent padding using Tailwind classes
  - [x] Proper borders between panes (handled by Resizable)
  - [x] Loading states using shadcn/ui patterns
- [x] Use subagent for cross-browser testing
  - [x] Test on Chrome, Firefox, Safari
  - [x] Verify scrolling at different viewport sizes
  - [x] Check for layout shifts or jumps
- [x] Git commit: "fix: resolve scrolling issues with proper height constraints"

### Stage 5: Add Basic Collapsible Functionality ✓
- [x] Add collapse button to left pane
  - [x] Use Phosphor `SidebarSimple` icon in top-right
  - [x] Tooltip: "Toggle sidebar (Ctrl+B)"
  - [x] Consistent with shadcn/ui button styling
- [x] Implement collapse state
  - [x] Add `isLeftPaneCollapsed` state to track collapse status
  - [x] Conditional rendering of ResizablePanel when collapsed
  - [x] Add keyboard shortcut handler for Ctrl+B
- [x] Handle collapsed state
  - [x] ResizablePanel handles sizing automatically when collapsed
  - [x] Show floating expand button when collapsed
  - [x] Smooth transitions using ResizablePanelGroup's built-in animations
- [x] Test collapsible behavior
  - [x] Collapse/expand works smoothly
  - [x] Keyboard shortcut functions correctly
  - [x] Document viewer expands to full width when left pane collapsed
- [x] Git commit: "feat: add collapsible left pane with keyboard shortcut"

### Stage 5.1: Fix ToC Auto-Scroll Regression ⚠️ (ATTEMPTED - UNSUCCESSFUL)

**Problem Identified**: After consolidating from 3-pane to 2-pane layout, the bidirectional navigation between Document and ToC was broken. Previously, clicking on document elements would automatically scroll the ToC to highlight the corresponding heading. This functionality was lost during the migration.

**Root Cause**: In the old 3-pane layout, there were separate components (`TableOfContents` and `DocumentViewer`) that had direct communication. The new unified layout breaks this connection because:
- `SimpleDocumentViewer` passes `onElementClick` to `ResizableDocumentLayout`
- But there's no direct path from document clicks to ToC scrolling
- The ToC is now inside `UnifiedLeftPane` and not directly accessible

**Attempted Solution** (in `components/resizable-document-layout.tsx`):
- [x] Added `handleElementClick` function to intercept document element clicks
- [x] Implemented smart heading detection logic:
  - First checks if clicked element is itself a heading (h1-h6)
  - Falls back to finding nearest preceding heading by document position
  - Uses element position comparison to walk backwards through sorted headings
- [x] Added ToC scroll functionality:
  - Uses existing `data-heading-id` attribute from `HeadingTree` component
  - Implemented `document.querySelector` to find ToC item
  - Added smooth scroll with `scrollIntoView({ behavior: 'smooth', block: 'center' })`
  - Added 100ms timeout to ensure ToC rendering
- [x] Wired up in `SimpleDocumentViewer` props: `onElementClick={handleElementClick}`

**Code Changes Made**:

```tsx
// Added to ResizableDocumentLayout component:
const handleElementClick = useCallback((element: DocumentElement) => {
  // Call original callback if provided
  if (onElementClick) {
    onElementClick(element)
  }
  
  // Find corresponding heading in ToC and scroll to it
  const findNearestHeading = (targetElement: DocumentElement): DocumentElement | null => {
    // First check if clicked element itself is a heading
    if (targetElement.tag && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(targetElement.tag.toLowerCase())) {
      return targetElement
    }
    
    // Find nearest heading by position (look backwards)
    const sortedElements = [...elements]
      .filter(el => el.tag && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tag.toLowerCase()))
      .sort((a, b) => a.position - b.position)
    
    let nearestHeading: DocumentElement | null = null
    for (const headingEl of sortedElements) {
      if (headingEl.position <= targetElement.position) {
        nearestHeading = headingEl
      } else {
        break
      }
    }
    
    return nearestHeading
  }
  
  const nearestHeading = findNearestHeading(element)
  if (nearestHeading && nearestHeading.id) {
    // Scroll the ToC to show this heading
    setTimeout(() => {
      const tocElement = document.querySelector(`[data-heading-id="${nearestHeading.id}"]`)
      if (tocElement) {
        tocElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }
}, [elements, onElementClick])
```

**Issues with Attempted Solution**:
- The fix didn't work as expected when tested
- Possible issues:
  - Timing problems with DOM queries across component boundaries
  - Incorrect element ID mapping between document elements and ToC items
  - Scrolling container conflicts (ToC is inside scrollable tab content)
  - Missing state synchronization between document viewer and left pane

**Alternative Approaches to Consider**:
1. **Ref-based solution**: Pass refs between components instead of DOM queries
2. **State-based solution**: Lift scroll state to parent and pass as props
3. **Custom hook**: Create `useToCSyncScroll` hook for bidirectional communication
4. **Event-based solution**: Use custom events or context for cross-component communication

**Status**: ⚠️ Problem identified and solution attempted, but fix unsuccessful. Requires further investigation and alternative approach.

### Stage 6: Testing & Documentation
- [ ] Write automated tests with subagent
  - [ ] Test unified left pane component
  - [ ] Test ResizablePanelGroup integration
  - [ ] Test collapsible functionality
  - [ ] Test all tab content rendering
  - [ ] Run tests in subagents
- [ ] Update documentation
  - [ ] Rewrite `docs/UI_INTERFACE.md` for new 2-pane architecture
  - [ ] Use a subagent to look for any other docs that might also need updating (e.g. still mentioning the 3 panes)
  - [ ] Document ResizablePanelGroup usage patterns
  - [ ] Add keyboard shortcuts to `docs/KEYBOARD_SHORTCUTS.md` following instructions in `docs/WRITING_EVERGREEN_DOCS.md`
- [ ] Performance testing
  - [ ] Check for unnecessary re-renders
- [ ] Git commit in a subagent provided with context

### Stage 7: Cleanup & Future Preparation
- [ ] Remove old components with subagent
  - [ ] Remove tools pane code from DocumentViewer
  - [ ] Clean up unused CSS classes
  - [ ] Remove redundant state management
- [ ] Add TODO comments for future enhancements
  - [ ] Vertical icon navigation placement
  - [ ] Resize handle enabling
  - [ ] Mobile responsive design
- [ ] Run final checks
  - [ ] `npm test` - all tests pass
  - [ ] `npm run build` - no TypeScript errors
  - [ ] `npm run lint` - code quality checks
- [ ] Update planning doc with completion status
- [ ] Move to `planning/finished/` folder
- [ ] Git commit: "chore: cleanup old 3-pane layout code"

## Appendix

### Component Architecture Comparison

**Before (3 panes):**
```
DocumentPageClient
├── TableOfContents (fixed 256px)
│   └── TabContainer (3 tabs)
└── DocumentViewer
    ├── Document (grid col-span-2)
    └── Tools (grid col-span-1)
        └── TabContainer (2 tabs)
```

**After (2 panes):**
```
ResizableDocumentLayout
└── ResizablePanelGroup
    ├── ResizablePanel (30%)
    │   └── UnifiedLeftPane
    │       └── TabContainer (5 tabs)
    └── ResizablePanel (70%)
        └── SimpleDocumentViewer
```

### Data Flow for Unified Component

Props needed by UnifiedLeftPane:
- From TableOfContents: `content`, `elements`, `documentId`, `markdownContent`, `headingVisibility`
- From Tools/Glossary: `glossaryEntities`, `isLoadingGlossary`, `showGlossary`, `glossaryError`
- From Tools/Chat: `documentContext`
- Callbacks: `onHeadingClick`, `onLoadGlossary`, `onScrollToEntity`

### Future Vertical Icon Navigation

When ready to add icons:
```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={5} minSize={3} maxSize={8}>
    <VerticalIconNav activeTab={activeTab} onTabChange={setActiveTab} />
  </ResizablePanel>
  <ResizablePanel defaultSize={25}>
    <UnifiedLeftPane activeTab={activeTab} />
  </ResizablePanel>
  <ResizablePanel defaultSize={70}>
    <SimpleDocumentViewer />
  </ResizablePanel>
</ResizablePanelGroup>
```

Icons: Files, Robot, FileText, ChatCircle, Book (Original, AI, Summary, Chat, Glossary)