# User Interface Architecture

The Spideryarn Reading application features a multi-pane layout with tabbed navigation for document analysis and AI-powered reading assistance.

## See also

- `components/tab-container.tsx` - reusable tab component implementation
- `components/table-of-contents.tsx` - left pane navigation with original/AI/summary tabs
- `components/document-viewer.tsx` - unified document pane with tools integration
- `components/assistant-chat.tsx` - AI chat interface in right pane
- `components/dialog.tsx` - reusable modal dialog component
- `components/settings-dialog.tsx` - settings dialog showing LLM configuration
- `components/document-header.tsx` - document header with title and action buttons
- `app/documents/[slug]/page-client.tsx` - main layout coordination and state management
- `docs/TABLE_OF_CONTENTS_PANE.md` - detailed documentation of left pane functionality
- `docs/ARCHITECTURE.md` - overall application architecture

## Layout Structure

The application uses a **three-pane layout** within a responsive flexbox system:

### Document Header ✓
- **Fixed height**: 3rem minimum (`min-h-[3rem]`)
- **Background**: White with bottom border
- **Content**: Document title (left) and action buttons (right)
- **Action Buttons**:
  - **Settings** - Shows configuration dialog with LLM parameters ✓
  - **View Original** - Links to original HTML document
- **Settings Dialog**: Modal overlay showing current AI model, temperature, max tokens, and UI configuration

### 1. Left Pane - Navigation (Table of Contents)
- **Fixed width**: 256px (`w-64`)
- **Scrollable**: `overflow-y-auto`
- **Background**: Light grey (`bg-gray-50`)
- **Tabs**:
  - **Original** - Document headings extracted from HTML
  - **AI-generated** - Semantically meaningful headings created by LLM analysis ✓
  - **Summary** - AI-generated document summary with collapsible content ✓

### 2. Middle Pane - Document Structure ✓
- **Grid column span 2** of 3-column grid layout (taking up 2/3 of remaining space)
- **Scrollable**: `overflow-y-auto`
- **Border**: Right border separating from Tools pane
- Shows hierarchical document element tree with interactive selection
- **Typography-aware rendering**: Different heading styles, proper list formatting, markdown content support
- **Visual feedback**: Hover states, selection highlighting, scroll-to-element with temporary highlighting

### 3. Right Pane - Tools
- **Grid column span 1** of 3-column grid layout (taking up 1/3 of remaining space)
- **Scrollable**: Fixed with `overflow-y-auto` (recent fix) ✓
- **Tabs**:
  - **Chat** - Interactive AI assistant for document discussion ✓
  - **Glossary** - AI-generated term definitions and explanations with click-to-scroll functionality ✓

## Tab System Architecture

### Reusable TabContainer Component ✓

The application uses a standardised `TabContainer` component for all tabbed interfaces:

```typescript
interface Tab {
  id: string
  label: string  
  content: ReactNode
}

interface TabContainerProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
  title?: string
}
```

**Key Features**:
- Controlled component pattern with active tab state
- Visual styling with active/inactive states
- Flexible content rendering via React nodes
- Consistent navigation experience across panes

### Tab Implementation Pattern

Both ToC (left) and Tools (right) panes follow the same tabbed pattern:

1. **Define tab array** with `id`, `label`, and `content`
2. **Render functions** for each tab's content  
3. **Pass to TabContainer** with appropriate props
4. **State management** handled within individual render functions
5. **Auto-activation** support (e.g., glossary tab auto-loads when activated)

## Scrolling Architecture ✓

**Issue Resolution**: Fixed scrolling problems across all panes by:

1. **TabContainer Fix**: Changed from `overflow-hidden` to `overflow-y-auto` in tab content areas
2. **Chat Component Fix**: Removed hard-coded 500px height constraint
3. **Consistent Height Management**: Ensured proper height inheritance through flex layouts

**Current State**: All panes and tabs now scroll properly with natural height constraints.

## Responsive Design Principles

- **Fixed left pane** (256px) maintains navigation accessibility
- **Flexible document pane** (2/3 of remaining space) provides ample reading area via CSS Grid
- **Fixed tools pane** (1/3 of remaining space) balances content consumption with AI assistance features
- **Consistent padding** and spacing throughout (`p-4`)
- **Flexbox layout** ensures proper height distribution and overflow handling

## State Management Flow

1. **DocumentPageClient** coordinates state between the three panes
2. **Unidirectional data flow**: User interactions → state updates → UI re-renders
3. **Shared element selection state** enables coordination between ToC and Document panes
4. **Independent tab states** within ToC and Tools panes allow separate functionality
5. **Cross-pane scrolling**: ToC heading clicks scroll to document elements, glossary entries link to document locations

## Future Enhancements 📋

- **Collapsible panes** for better screen space utilisation
- **Responsive breakpoints** for mobile and tablet viewing
- **Keyboard navigation** for accessibility improvements
- **Pane component abstraction** if layout patterns stabilise

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
- **Layout**: Flexbox for outer structure, CSS Grid (3-column) for document/tools area
- **State**: React hooks for local component state, shared element selection
- **Coordination**: Props and callbacks for cross-component communication
- **Scrolling**: CSS `overflow-y-auto` with proper height constraints across all panes

## Limitations

- **Mobile responsiveness** not yet optimised for smaller screens  
- **Pane resizing** not currently supported (fixed left pane width, proportional document/tools split)
- **Keyboard navigation** limited to basic tab functionality
- **Screen reader support** could be enhanced with ARIA labels
- **Fixed proportions** document pane always takes 2/3, tools pane 1/3 of remaining space