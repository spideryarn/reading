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

### Stage 5: Add Basic Collapsible Functionality
- [ ] Add collapse button to left pane
  - [ ] Use Phosphor `SidebarSimple` icon in top-right
  - [ ] Tooltip: "Toggle sidebar (Ctrl+B)"
  - [ ] Consistent with shadcn/ui button styling
- [ ] Implement collapse state
  - [ ] Add `collapsedPanels` state to track which panels are collapsed
  - [ ] Use ResizablePanel's `onCollapse` and `onExpand` callbacks
  - [ ] Add keyboard shortcut handler for Ctrl+B
- [ ] Handle collapsed state
  - [ ] ResizablePanel handles sizing automatically when collapsed
  - [ ] Show floating expand button when collapsed
  - [ ] Smooth transitions using ResizablePanel's built-in animations
- [ ] Test collapsible behavior
  - [ ] Collapse/expand works smoothly
  - [ ] Keyboard shortcut functions correctly
  - [ ] Document viewer expands to full width when left pane collapsed
- [ ] Git commit: "feat: add collapsible left pane with keyboard shortcut"

### Stage 6: Testing & Documentation
- [ ] Write automated tests with subagent
  - [ ] Test unified left pane component
  - [ ] Test ResizablePanelGroup integration
  - [ ] Test collapsible functionality
  - [ ] Test all tab content rendering
- [ ] Update documentation
  - [ ] Rewrite `docs/UI_INTERFACE.md` for new 2-pane architecture
  - [ ] Document ResizablePanelGroup usage patterns
  - [ ] Add keyboard shortcuts to user-facing docs
- [ ] Performance testing
  - [ ] Check for unnecessary re-renders
  - [ ] Test with large documents
  - [ ] Verify smooth resize animations
- [ ] Final user testing
  - [ ] Demo all functionality in new layout
  - [ ] Verify improved reading experience
  - [ ] Confirm all features work as before
- [ ] Git commit: "docs: update documentation for new 2-pane layout"

### Stage 7: Cleanup & Future Preparation
- [ ] Remove old components with subagent
  - [ ] Archive original TableOfContents (keep for reference)
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