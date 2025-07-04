# Goal

Implement collapsible and resizable panes for the three-pane interface (Table of Contents, Document Viewer, Tools) to improve screen space utilisation and provide a better reading experience across different screen sizes.

## Context

The current layout uses a fixed three-pane structure:
- **Left pane** (256px fixed width) - Table of Contents with Original/AI-generated/Summary tabs
- **Middle pane** (2/3 of remaining width) - Document viewer showing hierarchical elements  
- **Right pane** (1/3 of remaining width) - Tools pane with Chat/Glossary tabs

User requirements:
- Ability to collapse none, one, or both side panes
- Allow users to make left or right panes slightly bigger or smaller (resizable)
- Default to no panes collapsed on wide screens
- Default to both side panes collapsed on narrow screens
- No persistence needed across page refreshes

## References

- `docs/planning/250530a_shadcn_ui_adoption.md` - **Prerequisite**: shadcn/ui setup must be completed first
- `docs/UI_INTERFACE.md` - Current multi-pane layout architecture and component structure
- `docs/TABLE_OF_CONTENTS_PANE.md` - Left pane functionality and features
- `app/documents/[slug]/page-client.tsx` - Current layout coordination and state management
- `components/document-viewer.tsx` - Middle and right pane implementation using CSS Grid
- `components/table-of-contents.tsx` - Left pane implementation
- `docs/DESIGN_OVERVIEW.md` - Phosphor icons usage and current styling patterns
- [shadcn/ui Resizable component](https://ui.shadcn.com/docs/components/resizable) - Built on react-resizable-panels

## Principles & Key Decisions

1. **Dependency on shadcn/ui**: This work cannot begin until shadcn/ui setup is complete from `docs/planning/250530a_shadcn_ui_adoption.md`
2. **Use shadcn/ui Resizable**: Leverage the ResizablePanelGroup/ResizablePanel/ResizableHandle components for consistency with the design system
3. **Progressive enhancement**: Start with collapsible-only, then add resizing capabilities
4. **Responsive-first**: Narrow screens automatically collapse side panes
5. **Preserve existing functionality**: All current features (tabs, scrolling, state management) must continue working
6. **Accessibility**: Keyboard shortcuts and screen reader support for pane controls
7. **No persistence**: Pane states reset on page refresh (keep implementation simple)

## Actions

### Stage 1: Prerequisites & Planning
- [ ] **Dependency check**: Verify `docs/planning/250530a_shadcn_ui_adoption.md` Stage 2-3 are complete
  - [ ] Confirm shadcn/ui CLI is installed and configured
  - [ ] Verify Button and Dialog components are working
  - [ ] Ensure theme customisation is set up
- [ ] Install shadcn/ui Resizable component
  - [ ] Run `npx shadcn-ui@latest add resizable`
  - [ ] Test basic ResizablePanelGroup functionality
  - [ ] Verify component works with existing Tailwind styles
- [ ] Analyse current layout structure in detail
  - [ ] Map current CSS Grid approach in DocumentViewer 
  - [ ] Identify state management needs for pane visibility/sizes
  - [ ] Document current component hierarchy and data flow

### Stage 2: Basic Collapsible Implementation
- [ ] Create collapsible state management
  - [ ] Add React state for left/right pane visibility in DocumentPageClient
  - [ ] Implement responsive logic for narrow screens (< 1024px)
  - [ ] Add keyboard shortcuts (`Ctrl+Shift+E` for ToC, `Ctrl+Shift+U` for Tools)
- [ ] Implement toggle controls
  - [ ] Add collapse/expand buttons to pane headers using Phosphor icons (`SidebarSimple`, `CaretLeft`/`CaretRight`)
  - [ ] Style buttons consistently with existing UI patterns
  - [ ] Add tooltips explaining keyboard shortcuts
- [ ] Replace CSS Grid with ResizablePanelGroup
  - [ ] Refactor DocumentPageClient layout to use ResizablePanelGroup direction="horizontal"
  - [ ] Initially disable resizing, focus on collapsible functionality
  - [ ] Preserve all existing component props and functionality
- [ ] Test collapsible functionality
  - [ ] Verify both side panes can be independently collapsed/expanded
  - [ ] Test responsive behaviour on narrow screens
  - [ ] Test keyboard shortcuts work correctly
  - [ ] Verify all existing features still work (ToC navigation, glossary, chat)
- [ ] Git commit: "feat: add collapsible side panes with shadcn/ui Resizable"

### Stage 3: Add Resizing Capabilities
- [ ] Enable ResizableHandle components
  - [ ] Add ResizableHandle between ToC and Document panes
  - [ ] Add ResizableHandle between Document and Tools panes
  - [ ] Configure with `withHandle` prop for visual drag indicator
- [ ] Configure panel constraints
  - [ ] Set `minSize` (e.g., 15% minimum) and reasonable `defaultSize` for each pane
  - [ ] Ensure middle pane always gets majority of space
  - [ ] Test edge cases (dragging to extreme sizes)
- [ ] Handle collapsible + resizable interaction
  - [ ] When pane is collapsed, remove it from ResizablePanelGroup
  - [ ] When expanding, restore to last known size or reasonable default
  - [ ] Ensure smooth transitions between states
- [ ] Test resizing functionality
  - [ ] Verify drag handles work smoothly
  - [ ] Test keyboard accessibility for resize handles
  - [ ] Verify constraints prevent panels from becoming unusably small
  - [ ] Test resizing behaviour while panes are collapsed/expanded
- [ ] Git commit: "feat: add resizable functionality to panes"

### Stage 4: Responsive & Mobile Optimisation
- [ ] Implement mobile layout strategy
  - [ ] Create vertically stacked layout for mobile using `direction="vertical"`
  - [ ] Use Tailwind responsive classes to switch between horizontal/vertical layouts
  - [ ] Consider completely different layout approach for very small screens
- [ ] Test responsive breakpoints
  - [ ] Verify auto-collapse behaviour at 1024px breakpoint
  - [ ] Test layout on tablet sizes (768-1024px range)
  - [ ] Test mobile layout (< 768px)
- [ ] Add visual polish
  - [ ] Smooth animations for collapse/expand transitions
  - [ ] Improve resize handle styling and hover states
  - [ ] Ensure consistent spacing and borders across all breakpoints
- [ ] Cross-browser testing using Playwright MCP
  - [ ] Test on different screen sizes and orientations
  - [ ] Verify touch device support for resize handles
  - [ ] Check accessibility with screen readers
- [ ] Git commit: "feat: add responsive layout and mobile optimisation"

### Stage 5: Integration Testing & Polish
- [ ] Comprehensive feature testing
  - [ ] Test all existing features work with new layout: ToC navigation, AI headings, glossary, chat
  - [ ] Verify scroll behaviour and element selection still work
  - [ ] Test state management across pane operations
  - [ ] Test edge cases: rapid toggle, resize during loading states, etc.
- [ ] Performance testing
  - [ ] Verify layout changes don't cause unnecessary re-renders
  - [ ] Test with large documents and many elements
  - [ ] Check memory usage during resize operations
- [ ] Write automated tests
  - [ ] Unit tests for state management hooks
  - [ ] Integration tests for pane operations
  - [ ] Visual regression tests for layout changes
- [ ] Documentation updates
  - [ ] Update `docs/UI_INTERFACE.md` with new resizable layout architecture
  - [ ] Add keyboard shortcut documentation to user-facing areas
  - [ ] Update component JSDoc comments with resizable functionality
- [ ] Final user review
  - [ ] Demo all functionality: collapse, expand, resize, responsive
  - [ ] Gather feedback on keyboard shortcuts and UX
  - [ ] Test with actual reading workflow
- [ ] Git commit: "docs: update UI documentation for resizable layout"

### Stage 6: Documentation & Cleanup
- [ ] Update evergreen documentation
  - [ ] Revise `docs/UI_INTERFACE.md` to reflect new resizable architecture
  - [ ] Update `docs/DESIGN_OVERVIEW.md` if new patterns were introduced
  - [ ] Add section to `CLAUDE.md` about using ResizablePanelGroup for future layouts
- [ ] Code cleanup and optimisation
  - [ ] Remove any dead CSS Grid code
  - [ ] Optimise re-renders during resize operations
  - [ ] Add TypeScript types for pane state management
- [ ] Final testing
  - [ ] Run full test suite: `npm test`
  - [ ] Run type checking: `npm run build`
  - [ ] Run linting: `npm run lint`
- [ ] Update this planning doc with final status
- [ ] Git commit: "refactor: cleanup and optimise resizable panes implementation"

## Appendix

### shadcn/ui Resizable API

Based on research, the key components we'll use:

```tsx
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/components/ui/resizable"

// Basic usage
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={20} minSize={15}>
    <TableOfContents />
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={60}>
    <DocumentViewer />
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={20} minSize={15}>
    <ToolsPane />
  </ResizablePanel>
</ResizablePanelGroup>
```

### Keyboard Shortcuts Design

Following VS Code patterns:
- `Ctrl+Shift+E` - Toggle Table of Contents (Explorer)
- `Ctrl+Shift+U` - Toggle Tools pane (following alphabetical pattern)
- Standard accessibility: Tab to navigate between resize handles, arrow keys to resize

### Responsive Breakpoints

- **Wide screens (≥1024px)**: All panes visible by default, resizable
- **Medium screens (768-1023px)**: Both side panes collapsed by default, but can be expanded
- **Small screens (<768px)**: Consider vertical stacking or drawer-style overlays

### Current Layout Analysis

The existing layout uses:
- DocumentPageClient: Flexbox container with fixed-width left pane
- DocumentViewer: CSS Grid (`grid-cols-3`) for middle and right panes
- All panes use `overflow-y-auto` for independent scrolling

This will be replaced with ResizablePanelGroup managing all three panes in a single container.