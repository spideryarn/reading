# User Interface Architecture

The Spideryarn Reading application features a **2-pane resizable layout** with tabbed navigation for document analysis and AI-powered reading assistance.

## See also

- `components/resizable-document-layout.tsx` - main 2-pane layout with ResizablePanelGroup
- `components/unified-left-pane.tsx` - consolidated navigation and tools pane
- `components/simple-document-viewer.tsx` - streamlined document viewer
- `components/tab-container.tsx` - reusable tab component implementation
- `components/assistant-chat.tsx` - AI chat interface
- `components/dialog.tsx` - reusable modal dialog component
- `components/document-header.tsx` - document header with title and action buttons
- `app/documents/[slug]/page-client.tsx` - main layout coordination and state management
- `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` - detailed documentation of left pane functionality
- `docs/reference/STYLING_SHADCN_UI_REFERENCE.md` - shadcn/ui component usage patterns
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - overall application architecture
- `docs/reference/UI_COMPONENTS.md`
- `docs/reference/STYLING_SHADCN_UI_REFERENCE.md`
- `docs/reference/TOOL_HIGHLIGHT.md` - semantic highlighting system accessible via the Highlights tab
- `docs/reference/STYLING_MOBILE_PLATFORM_DETECTION.md` - mobile device detection and responsive design system for UI adaptation

## Layout Structure

The application uses a **two-pane resizable layout** built with shadcn/ui ResizablePanelGroup:

### Document Header ✓
- **Fixed height**: 3rem minimum (`min-h-[3rem]`)
- **Background**: White with bottom border  
- **Content**: Document title only (clean, minimal design)
- **Action Buttons**: None - all functionality moved to vertical icon rail for better organization

### 1. Left Pane - Unified Navigation & Tools ✓
- **Resizable width**: 30% default (20-50% range)
- **Collapsible**: Ctrl+B keyboard shortcut, floating expand button when collapsed
- **Scrollable**: `overflow-y-auto` with proper height constraints
- **Component**: `UnifiedLeftPane` with consolidated functionality
- **Tabs** (7 total):
  - **Original** - Document headings extracted from HTML
  - **AI-generated** - Semantically meaningful headings created by LLM analysis ✓
  - **Summary** - AI-generated document summary with collapsible content ✓
  - **Chat** - Interactive AI assistant for document discussion ✓
  - **Glossary** - AI-generated term definitions and explanations with click-to-scroll functionality ✓
  - **Search** - Full-text document search with debounced input, loading states, and click-to-navigate results with element selection ✓
  - **Highlights** - AI-powered semantic highlighting with confidence-based visual intensity ✓
- **Additional Actions** (via vertical icon rail):
  - **Tweet Thread** - Convert document to Twitter thread format for social sharing (opens in new window) ✓

### 2. Right Pane - Document Viewer ✓
- **Resizable width**: 70% default, expands to full width when left pane collapsed
- **Scrollable**: `overflow-y-auto` with smooth scrolling
- **Component**: `SimpleDocumentViewer` (streamlined from DocumentViewer)
- **Features**:
  - Hierarchical document element tree with interactive selection
  - Typography-aware rendering: Different heading styles, proper list formatting, markdown content support
  - Visual feedback: Hover states, selection highlighting, scroll-to-element with temporary highlighting
  - Bidirectional navigation: Element clicks trigger ToC auto-scroll

## Resizable Layout Architecture

### ResizablePanelGroup Implementation ✓

The application uses shadcn/ui ResizablePanelGroup for the core layout:

```typescript
<ResizablePanelGroup direction="horizontal" className="h-full w-full">
  <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
    <UnifiedLeftPane {...leftPaneProps} />
  </ResizablePanel>
  <ResizableHandle withHandle={!isLeftPaneCollapsed} />
  <ResizablePanel defaultSize={70}>
    <SimpleDocumentViewer {...documentProps} />
  </ResizablePanel>
</ResizablePanelGroup>
```

**Key Features**:
- **Horizontal resizing**: Drag handles between panes
- **Collapsible left pane**: Keyboard shortcut (Ctrl+B) and button toggle
- **Smooth animations**: Built-in transitions for resize and collapse
- **Responsive sizing**: Percentage-based with min/max constraints
- **Floating controls**: Expand button appears when collapsed

### Unified Tab System ✓

All navigation and tools are consolidated into a single TabContainer:

```typescript
interface Tab {
  id: string
  label: string  
  content: ReactNode
}
```

**Consolidation Benefits**:
- **Single source of truth**: All 6 tabs in one component
- **Consistent behavior**: Unified scrolling and height management
- **Simplified state**: One TabContainer instead of two separate ones
- **Better UX**: All tools accessible in one location
- **Code reduction**: Eliminated duplicate tab logic

### Search Functionality ✓

The **Search** tab provides advanced full-text document search with cross-element capabilities using Mark.js:

**Core Features**:
- **Cross-element search** using Mark.js library - finds phrases spanning inline elements (e.g., `<em>`, `<strong>`, `<span>`) within block containers
- **Precise text highlighting** with yellow background on exact matched text spans, not just element-level highlighting
- **Enhanced navigation** - search results scroll to specific text matches with pulse animations and visual feedback
- **Auto-focus** search input when Search tab is clicked for immediate typing
- **Pinned search input** stays at top when scrolling through results
- **Debounced search** (300ms delay) with proper highlight clearing to optimize performance during typing
- **Loading state** with spinner during search operations
- **Result count display** showing accurate number of matches found
- **Text excerpts** showing matched text with context
- **Element type metadata** (h1, h2, p, etc.) for each result
- **Click-to-navigate** that scrolls to element and highlights the specific text match with pulse animation
- **Clear button** to reset search query and remove all highlights

**Advanced Options**:
- **Collapsible settings** section below search input
- **Case sensitivity toggle** (default: false) with immediate re-search on change
- **Expandable design** for future search options (regex, whole word, etc.)

**Edge Case Handling**:
- **Empty queries** clear results and highlights without showing "no results" message
- **Whitespace-only queries** treated as empty queries
- **Elements without content** skipped during search
- **Rapid typing** properly debounced to prevent performance issues
- **Multiple matches per element** handled with accurate counting and first-match navigation
- **Cross-block limitations** documented - search works within block containers, not across separate paragraphs

**Technical Implementation**:
- **Mark.js integration** (v8.11.1) for robust DOM-based text highlighting and cross-element search
- **DOM-based search** finds text as users see it in rendered HTML, not markdown source
- **React refs** for search input focus and Mark.js instance management
- **Element mapping** from highlights back to DocumentElement IDs for navigation
- **Reuses existing navigation** via `onHeadingClick` handler for consistent behavior
- **Element selection state** coordination with existing highlight system
- **Timeout management** to prevent memory leaks and race conditions
- **Comprehensive test coverage** including Mark.js integration, UI enhancements, and cross-element scenarios

**Known Limitations**:
- **Cross-block search limitation**: Mark.js `acrossElements: true` only works within block containers, not across separate `<p>` tags or different block elements
- **Safari CSS animation bug**: Pulse animation may not render correctly in Safari (cosmetic issue only)
- **Browser compatibility**: Optimized for Chrome and mobile browsers; other browsers are supported but not primary targets

## Scrolling Architecture ✓

**ResizablePanelGroup Solution**: Completely resolved scrolling issues by:

1. **Native height handling**: ResizablePanelGroup provides proper height constraints
2. **Eliminated CSS Grid**: Removed problematic grid layouts causing height conflicts
3. **Consistent overflow patterns**: All scrollable areas use `overflow-y-auto`
4. **Height inheritance**: Proper `h-full` cascading through component tree
5. **Tab content scrolling**: TabContainer properly manages content overflow

**Current State**: Perfect scrolling behavior across all panes and tabs with no layout conflicts.

## Responsive Design Principles

- **Resizable left pane** (30% default, 20-50% range) for flexible navigation space
- **Collapsible left pane** maximizes document reading area when needed
- **Dynamic document pane** (70% default, 100% when collapsed) adapts to user preference
- **Consistent padding** and spacing throughout (`p-4`)
- **ResizablePanelGroup layout** ensures proper height distribution and overflow handling
- **Keyboard accessibility** with Ctrl+B shortcut for quick pane toggling
- **Mobile adaptations** use device detection to auto-collapse left pane and optimize touch interactions (see `docs/reference/STYLING_MOBILE_PLATFORM_DETECTION.md`)

## State Management Flow

1. **DocumentPageClient** coordinates state between the two panes
2. **ResizableDocumentLayout** manages layout state and cross-pane communication
3. **Unidirectional data flow**: User interactions → state updates → UI re-renders
4. **Shared element selection state** enables coordination between UnifiedLeftPane and SimpleDocumentViewer
5. **Collapse state management**: `isLeftPaneCollapsed` controls layout and visibility
6. **Bidirectional navigation**: 
   - ToC heading clicks → document element highlighting and scrolling
   - Document element clicks → ToC auto-scroll to corresponding heading
7. **Unified tab state** within single TabContainer simplifies state management

## Future Enhancements 📋

- **Enhanced keyboard navigation** beyond Ctrl+B shortcut
- **Pane memory**: Restore size preferences across sessions
- **Mobile-optimized layout** with different responsive patterns for touch interfaces

## Common Patterns

**Tab Content Rendering**:
```typescript
const renderTabName = () => (
  <div className="space-y-4">
    {/* Tab-specific content */}
  </div>
)
```

**Dialog Implementation**: The Settings dialog demonstrates the reusable dialog pattern:
```typescript
<Dialog isOpen={isOpen} onClose={onClose} title="Settings">
  {/* Dialog content */}
</Dialog>
```

**Modal Dialog Features**:
- **Escape key** closes dialog
- **Click outside** closes dialog
- **Overlay** prevents interaction with background
- **Consistent styling** with header, content, and action areas

**Consistent Loading States**: All AI-powered features use standardised loading spinners and error handling

**Cross-Pane Communication**: Selection and navigation state shared via props and callbacks

## Technical Implementation

- **Framework**: Next.js with TypeScript
- **Styling**: Tailwind CSS with consistent spacing system
- **Layout**: shadcn/ui ResizablePanelGroup with ResizablePanel components
- **State**: React hooks for layout state (collapse), shared element selection
- **Components**: Unified architecture with consolidated functionality
- **Scrolling**: ResizablePanelGroup native height management with `overflow-y-auto`
- **Interactions**: DOM manipulation for highlighting, smooth scrolling behaviors
- **Keyboard**: Event listeners for Ctrl+B shortcut with proper cleanup

## Limitations

- **Mobile responsiveness** not yet optimized for smaller screens (though vertical icon rail is now fully scrollable for constrained viewports)
- **ToC auto-scroll regression** needs fixing (Stage 5.1 unsuccessful attempt)
- **Keyboard navigation** limited to Ctrl+B and basic tab functionality
- **Screen reader support** could be enhanced with ARIA labels
- **Resize handle styling** could be more prominent for discoverability