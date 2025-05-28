# User Interface Architecture

The Spideryarn Reading application features a multi-pane layout with tabbed navigation for document analysis and AI-powered reading assistance.

## See also

- `components/tab-container.tsx` - reusable tab component implementation
- `components/table-of-contents.tsx` - left pane navigation with original/AI/summary tabs
- `components/document-viewer.tsx` - middle and right pane structure with document display
- `components/assistant-chat.tsx` - AI chat interface in right pane
- `app/documents/[slug]/page-client.tsx` - main layout coordination and state management
- `docs/TABLE_OF_CONTENTS_PANE.md` - detailed documentation of left pane functionality
- `docs/ARCHITECTURE.md` - overall application architecture

## Layout Structure

The application uses a **four-pane layout** within a responsive grid system:

### 1. Left Pane - Navigation (Table of Contents)
- **Fixed width**: 256px (`w-64`)
- **Scrollable**: `overflow-y-auto`
- **Tabs**:
  - **Original** - Document headings extracted from HTML
  - **AI-generated** - Semantically meaningful headings created by LLM analysis ✓
  - **Summary** - AI-generated document summary with collapsible content ✓

### 2. Middle-Left Pane - Document Structure
- **Grid column 1** of 3-column layout
- **Scrollable**: `overflow-y-auto`
- Shows hierarchical document element tree
- Interactive element selection for detailed inspection

### 3. Middle-Right Pane - Element Details
- **Grid column 2** of 3-column layout  
- **Scrollable**: `overflow-y-auto`
- Displays selected element properties, content, and attributes
- Updates based on element selection from structure pane

### 4. Right Pane - Tools
- **Grid column 3** of 3-column layout
- **Scrollable**: Fixed with `overflow-y-auto` (recent fix) ✓
- **Tabs**:
  - **Glossary** - AI-generated term definitions and explanations ✓
  - **Chat** - Interactive AI assistant for document discussion ✓

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

Both left and right panes follow the same pattern:

1. **Define tab array** with `id`, `label`, and `content`
2. **Render functions** for each tab's content
3. **Pass to TabContainer** with appropriate props
4. **State management** handled within individual render functions

## Scrolling Architecture ✓

**Issue Resolution**: Fixed scrolling problems across all panes by:

1. **TabContainer Fix**: Changed from `overflow-hidden` to `overflow-y-auto` in tab content areas
2. **Chat Component Fix**: Removed hard-coded 500px height constraint
3. **Consistent Height Management**: Ensured proper height inheritance through flex layouts

**Current State**: All panes and tabs now scroll properly with natural height constraints.

## Responsive Design Principles

- **Fixed left pane** maintains navigation accessibility
- **Flexible middle content** adapts to screen size via CSS Grid
- **Proportional tools pane** balances content consumption with assistance features
- **Consistent padding** and spacing throughout (`p-4`)

## State Management Flow

1. **DocumentPageClient** coordinates state between panes
2. **Unidirectional data flow**: User interactions → state updates → UI re-renders
3. **Shared selection state** enables cross-pane coordination
4. **Independent tab states** allow separate functionality within each pane

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

**Consistent Loading States**: All AI-powered features use standardised loading spinners and error handling

**Cross-Pane Communication**: Selection and navigation state shared via props and callbacks

## Technical Implementation

- **Framework**: Next.js with TypeScript
- **Styling**: Tailwind CSS with consistent spacing system
- **State**: React hooks for local component state
- **Coordination**: Props and callbacks for cross-component communication
- **Scrolling**: CSS `overflow-y-auto` with proper height constraints

## Limitations

- **Mobile responsiveness** not yet optimised for smaller screens
- **Pane resizing** not currently supported (fixed widths)
- **Keyboard navigation** limited to basic tab functionality
- **Screen reader support** could be enhanced with ARIA labels