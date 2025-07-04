# Unified Left Pane with Structure Tab

The unified left pane provides comprehensive document navigation and AI-powered tools through a vertical icon navigation system. The centerpiece is the unified Structure tab that consolidates original and AI-enhanced headings in a single interface, alongside summaries, chat, glossary, and search functionality. This document covers the architecture and features of the complete left pane system in the 2-pane resizable layout.

## See also

- `components/unified-left-pane.tsx` - consolidated navigation and tools pane containing ToC
- `components/tools/StructurePanel.tsx` - unified Structure tab component (replaces separate Original/AI-generated tabs)
- `components/vertical-icon-nav.tsx` - vertical icon navigation bar component
- `components/heading-tree.tsx` - shared tree component for rendering hierarchical headings
- `components/resizable-document-layout.tsx` - main 2-pane layout coordinator
- `app/documents/[slug]/page-client.tsx` - state management and coordination between panes
- `components/simple-document-viewer.tsx` - streamlined document viewer
- `docs/reference/ARCHITECTURE_OVERVIEW.md` - overall application architecture
- `docs/reference/KEYBOARD_SHORTCUTS.md` - keyboard shortcut documentation including sidebar toggle
- `docs/reference/UI_INTERFACE.md` - 2-pane resizable layout documentation
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - prompt template system for AI features
- `docs/reference/TOOL_HIGHLIGHT.md` - semantic highlighting feature accessible via the Highlights tab
- `docs/reference/ARCHITECTURE_URL_STATE.md` - URL state management for persistent tool state across sessions
- `docs/reference/DESIGN_MOBILE_PLATFORM_DETECTION.md` - mobile device detection affecting left pane auto-collapse behaviour
- `docs/planning/250608c_vertical_icon_navigation_bar.md` - vertical icon navigation implementation
- `docs/planning/250526g_ai_generated_headings.md` - AI headings implementation details
- `docs/planning/250526a_ToC_hierarchical_summary_tooltips.md` - tooltip feature planning
- `docs/planning/250529b_ToC_expand_collapse_granularity.md` - expand/collapse and granularity control planning

## Key Architecture

The Structure system is integrated into the 2-pane architecture with simplified coordination:

1. **UnifiedLeftPane** - contains unified Structure tab alongside Summary, Chat, Glossary, Search, Highlights, and Metadata
2. **StructurePanel** - unified component managing both original and AI-enhanced headings with mode-based display
3. **ResizableDocumentLayout** - manages cross-pane communication and scroll coordination
4. **SimpleDocumentViewer** - displays elements and accepts external selection state

State flows unidirectionally: Structure click → layout handler → element highlighting → document scroll.

## Structure Panel Component

The Structure tab uses a unified `StructurePanel` component that consolidates original and AI-enhanced heading functionality:

### Tree Data Structure
- Converts flat heading arrays to hierarchical tree structure using `buildHeadingTree()`
- Each `HeadingNode` extends `Heading` with a `children` array
- Tree structure enables efficient expand/collapse and granularity filtering
- Uses `useMemo` for efficient tree building when headings change

### Unified State Management
- Single component manages both original and AI-generated heading modes
- Mode determined by active mutation state (`activeMutationType === 'insert-headings'`)
- Status badge displays current mode: "Original" or "AI-enhanced"
- Context-aware action buttons: "Generate AI headings" vs "Remove AI headings"

### Expand/Collapse Functionality
- Individual sections can be collapsed to hide their child headings
- Chevron buttons (CaretDown/CaretRight icons) indicate expandable sections
- Single unified expand/collapse state (`collapsedIds: Set<string>`)
- Collapsed state automatically clears when switching between modes
- Only affects Structure display - document pane content remains unchanged

### Granularity Control
- Single slider controls heading depth filtering (e.g., show only levels 1-3)
- Defaults to level 3 or document maximum depth, whichever is smaller
- Shows count of hidden descendants: "+N hidden" badges on parent headings
- Hidden counts capped at "99+" for deeply nested documents
- Suppresses "+0 hidden" badges for cleaner interface
- Unified granularity setting across both modes

### State Management
- All state is memory-only (not persisted to database or localStorage)
- Single expand/collapse state: `collapsedIds: Set<string>`
- Single granularity level: `granularityLevel: number`
- Current mode determined by mutation context: `currentMode: StructureMode`
- State updates trigger immediate re-renders without layout shifts

### Mode Switching Behavior
- **Original Mode**: Shows headings extracted from HTML document structure
- **AI-Enhanced Mode**: Shows AI-generated headings applied via mutation system
- **Automatic Switching**: Mode determined by presence of active `insert-headings` mutation
- **Visual Indicators**: Status badge shows current mode with appropriate colors
- **State Preservation**: Expand/collapse and granularity states reset when switching modes
- **Action Context**: Generate/Remove buttons appear contextually based on current mode

### Benefits
- Eliminates code duplication between separate tabs
- Simplifies state management with single component
- Provides clear visual indication of current mode
- Seamless switching between original and AI-enhanced views
- Maintains all existing features: tooltips, navigation, visual hierarchy

## Vertical Icon Navigation Interface

The left pane uses a vertical icon navigation system for space-efficient access to all tools:

- **Structure** (TreeStructure icon) - Unified view of document structure with original and AI-enhanced headings
- **Summary** (ListBullets icon) - AI-generated document summary with expandable content
- **Chat** (ChatCircle icon) - Interactive AI assistant for document discussion
- **Glossary** (BookOpen icon) - AI-generated term definitions with click-to-scroll
- **Search** (MagnifyingGlass icon) - Cross-element text search with Mark.js library and enhanced navigation
- **Highlights** (HighlighterCircle icon) - AI-powered semantic highlighting with confidence-based visual intensity

### Icon Navigation Implementation
- Always-visible vertical icon rail (48px width) on the far left edge
- **Scrollable when viewport height is constrained** - `overflow-y-auto` with cross-browser scrollbar styling
- Phosphor icons with duotone weight for professional appearance
- Rich tooltips with bold titles and descriptive text (600ms delay)
- Spideryarn orange active state (#DB8A45) for current selection
- Platform-specific keyboard shortcuts (Cmd+B on Mac, Ctrl+B on Windows/Linux)
- Smooth CSS animations for pane collapse/expand (300ms duration)
- Accessibility compliant with proper ARIA labels and focus management

### Interaction Patterns
- Icon clicks expand left pane (if collapsed) AND activate the selected mode
- Collapse button integrated into top of icon rail for space efficiency
- **All icons remain accessible in short viewports** - scrollable interface ensures no functionality is lost in mobile landscape or constrained screen heights
- Size persistence: remembers user's preferred left pane width
- Auto-loading behaviors preserved (glossary content, search input focus)
- All existing functionality maintained through DocumentCommunicationContext

## Heading Extraction

### Original Headings
Uses browser DOMParser to extract `h1-h6` elements from HTML content:

```typescript
const parser = new DOMParser()
const doc = parser.parseFromString(content, 'text/html')
const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
```

Generates deterministic IDs using UUID v5 for reliable navigation.

### AI-Generated Headings
- Calls `/api/tools/structure` endpoint with full document content
- LLM analyses document structure and generates semantic headings
- Returns operations for inserting/replacing headings in document
- Applied using mutation system for reversible document transformations

### Document Summary
- Calls `/api/tools/summary` endpoint with full document content 
- LLM generates comprehensive document summary using markdown content
- Summary can be collapsed/expanded for better space utilisation
- Provides "Show summary" button to trigger generation on demand

## Visual Hierarchy

- **Indentation**: Progressive left padding (`pl-0`, `pl-4`, `pl-8`, etc.) based on heading level
- **Level labels**: Small `H1`, `H2` prefixes in gray text
- **Clickable items**: Hover states and smooth scrolling behaviour
- **Tooltip summaries**: AI-generated summaries appear on hover with loading states
- **Status badges**: Blue "Original" or green "AI-enhanced" badges indicating current mode
- **Expand/collapse controls**: Chevron icons (CaretDown/CaretRight) for non-leaf headings
- **Hidden count badges**: Gray "+N hidden" indicators when content is filtered by granularity
- **Granularity slider**: Blue progress bar with level indicators (1 to max depth)

## Interactive Coordination

When a Structure heading is clicked:

1. `handleHeadingClick` finds corresponding `DocumentElement` by matching heading text
2. `ResizableDocumentLayout` coordinates between panes
3. `SimpleDocumentViewer` receives updated selection and highlights element
4. Smooth scroll centers selected element in document pane with highlight animation

## Tooltip Summaries

The Structure tab provides AI-powered summaries on hover using hierarchical content extraction and LLM summarisation:

### Hierarchical Content Extraction

When hovering over a heading, the tooltip extracts all content belonging to that section:
- Includes content until the next heading of equal or higher level
- Captures sub-headings, paragraphs, and nested content
- Uses `DocumentElement[]` data from parsed HTML structure

### AI Summarisation

- Calls `/api/tools/summary` endpoint with `'single short paragraph'` granularity
- Provides natural loading states during API calls
- Implements caching to prevent repeated API requests
- Falls back to user-friendly error messages on API failures

### Technical Implementation

```typescript
// Type-safe granularity setting
const TOOLTIP_GRANULARITY: GranularityKey = 'single short paragraph'

// Hierarchical content extraction and LLM summarisation
const generateHeadingSummary = async (headingText: string): Promise<string>

// Loading state management with JSX components
const getTooltipContent = (headingText: string): JSX.Element
```

### User Experience

- **Loading State**: Shows spinner with "Loading..." message during API calls
- **Error Handling**: Displays "⚠️ Unable to generate summary. Please try again later."
- **Caching**: Prevents duplicate requests and provides instant display on subsequent hovers
- **Positioning**: Uses Radix UI tooltips for robust tooltip positioning and behaviour

## Loading and Error States

Follows standardised pattern documented in `docs/reference/DESIGN_OVERVIEW.md`:

- **Generate Button**: Phosphor icons for consistent UI
- **Loading**: Spinner animation with disabled state
- **Success**: Updates tab content with generated headings
- **Error**: User-friendly error messages with retry capability

## Common Patterns

**State Management**: Unified state management through `ResizableDocumentLayout` simplifies coordination.

**Bidirectional Navigation**: Structure heading clicks scroll document, document element clicks auto-scroll Structure tab.

**Data Attributes**: Uses `data-element-id` and `data-heading-id` for reliable targeting.

**Type Safety**: Uses exported `GranularityKey` type and Zod validation for API responses.

## Limitations

- Relies on exact text matching between HTML headings and parsed elements
- No support for duplicate heading text in original headings
- Single-click selection only (no multi-select or ranges)
- AI-generated headings are cached in database but mutations are not persisted across sessions
- Expand/collapse and granularity state is memory-only (lost on page refresh)
- No animation transitions for expand/collapse actions
- No keyboard shortcuts for expand/collapse operations
- Tooltip requests still fire for headings hidden by granularity filtering