# Table of Contents Pane

The table of contents pane provides hierarchical document navigation with both original and AI-generated headings, interactive element selection, and AI-powered tooltip summaries. Now integrated as part of the unified left pane in the 2-pane resizable layout. This document covers the architecture and features of the enhanced ToC system.

## See also

- `components/unified-left-pane.tsx` - consolidated navigation and tools pane containing ToC
- `components/heading-tree.tsx` - shared tree component for rendering hierarchical headings
- `components/resizable-document-layout.tsx` - main 2-pane layout coordinator
- `app/documents/[slug]/page-client.tsx` - state management and coordination between panes
- `components/simple-document-viewer.tsx` - streamlined document viewer
- `docs/ARCHITECTURE.md` - overall application architecture
- `docs/UI_INTERFACE.md` - 2-pane resizable layout documentation
- `docs/LLM_PROMPT_TEMPLATES.md` - prompt template system for AI features
- `planning/250526g_ai_generated_headings.md` - AI headings implementation details
- `planning/250526a_ToC_hierarchical_summary_tooltips.md` - tooltip feature planning
- `planning/250529b_ToC_expand_collapse_granularity.md` - expand/collapse and granularity control planning

## Key Architecture

The ToC system is now integrated into the 2-pane architecture with simplified coordination:

1. **UnifiedLeftPane** - contains ToC as tabs (Original, AI-generated) alongside Summary, Chat, and Glossary
2. **ResizableDocumentLayout** - manages cross-pane communication and scroll coordination
3. **SimpleDocumentViewer** - displays elements and accepts external selection state

State flows unidirectionally: ToC click → layout handler → element highlighting → document scroll.

## HeadingTree Component

The ToC uses a shared `HeadingTree` component that eliminates code duplication between tabs:

### Tree Data Structure
- Converts flat heading arrays to hierarchical tree structure using `buildHeadingTree()`
- Each `HeadingNode` extends `Heading` with a `children` array
- Tree structure enables efficient expand/collapse and granularity filtering
- Uses `useMemo` for efficient tree building when headings change

### Shared Rendering Logic
- Single component handles both Original and AI-generated heading display
- Theme customization via `themeColors` prop (blue for Original, green for AI-generated)
- Manages tooltip display, click handlers, and hierarchical indentation
- Supports expand/collapse controls and granularity filtering

### Expand/Collapse Functionality
- Individual sections can be collapsed to hide their child headings
- Chevron buttons (CaretDown/CaretRight icons) indicate expandable sections
- State is lifted to `TableOfContents` component and persists across tab switches
- Separate expand/collapse state for Original and AI-generated tabs
- Collapsed state automatically clears when new AI headings are generated
- Only affects ToC display - document pane content remains unchanged

### Granularity Control
- Per-tab slider allows filtering by heading depth (e.g., show only levels 1-3)
- Defaults to level 3 or document maximum depth, whichever is smaller
- Shows count of hidden descendants: "+N hidden" badges on parent headings
- Hidden counts capped at "99+" for deeply nested documents
- Suppresses "+0 hidden" badges for cleaner interface
- Independent granularity settings for Original and AI-generated tabs

### State Management
- All state is memory-only (not persisted to database or localStorage)
- Expand/collapse state: `collapsedStates: Record<'original' | 'ai-generated', Set<string>>`
- Granularity levels: `granularityLevels: Record<'original' | 'ai-generated', number>`
- State updates trigger immediate re-renders without layout shifts

### Benefits
- Eliminates ~100 lines of duplicate code between tabs
- Simplifies maintenance and feature additions
- Provides intuitive navigation for complex documents
- Maintains all existing features: tooltips, navigation, visual hierarchy

## Unified Tabbed Interface

The ToC is now part of a 6-tab unified interface in the left pane:

- **Original** - Headings extracted directly from the HTML document
- **AI-generated** - Semantically meaningful headings created by LLM analysis
- **Summary** - AI-generated document summary with expandable content
- **Chat** - Interactive AI assistant for document discussion
- **Glossary** - AI-generated term definitions with click-to-scroll
- **Search** - Cross-element text search with Mark.js library and enhanced navigation

### Tab Implementation
- Consolidated into single `TabContainer` within `UnifiedLeftPane`
- Uses controlled component pattern with `activeTab` state
- Visual styling: active tab (blue theme), inactive tab (gray text)
- Generate buttons appear in AI tabs to trigger content generation
- Loading states during AI processing with spinner animation

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
- Calls `/api/headings` endpoint with full document content
- LLM analyses document structure and generates semantic headings
- Returns structured array with heading text and levels
- Displayed with green theme to distinguish from original

### Document Summary
- Calls `/api/summarise` endpoint with full document content 
- LLM generates comprehensive document summary using markdown content
- Summary can be collapsed/expanded for better space utilisation
- Provides "Show summary" button to trigger generation on demand

## Visual Hierarchy

- **Indentation**: Progressive left padding (`pl-0`, `pl-4`, `pl-8`, etc.) based on heading level
- **Level labels**: Small `H1`, `H2` prefixes in gray/green text
- **Clickable items**: Hover states and smooth scrolling behaviour
- **Tooltip summaries**: AI-generated summaries appear on hover with loading states
- **Green theme**: AI-generated content uses green colour scheme
- **Expand/collapse controls**: Chevron icons (CaretDown/CaretRight) for non-leaf headings
- **Hidden count badges**: Gray "+N hidden" indicators when content is filtered by granularity
- **Granularity slider**: Blue progress bar with level indicators (1 to max depth)

## Interactive Coordination

When a ToC heading is clicked:

1. `handleHeadingClick` finds corresponding `DocumentElement` by matching heading text
2. `ResizableDocumentLayout` coordinates between panes
3. `SimpleDocumentViewer` receives updated selection and highlights element
4. Smooth scroll centers selected element in document pane with highlight animation

## Tooltip Summaries

The ToC provides AI-powered summaries on hover using hierarchical content extraction and LLM summarisation:

### Hierarchical Content Extraction

When hovering over a heading, the tooltip extracts all content belonging to that section:
- Includes content until the next heading of equal or higher level
- Captures sub-headings, paragraphs, and nested content
- Uses `DocumentElement[]` data from parsed HTML structure

### AI Summarisation

- Calls `/api/summarise` endpoint with `'single short paragraph'` granularity
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
- **Positioning**: Uses Tippy.js for robust tooltip positioning and behaviour

## Loading and Error States

Follows standardised pattern documented in `docs/STYLING.md`:

- **Generate Button**: Phosphor icons for consistent UI
- **Loading**: Spinner animation with disabled state
- **Success**: Updates tab content with generated headings
- **Error**: User-friendly error messages with retry capability

## Common Patterns

**State Management**: Unified state management through `ResizableDocumentLayout` simplifies coordination.

**Bidirectional Navigation**: ToC heading clicks scroll document, document element clicks auto-scroll ToC.

**Data Attributes**: Uses `data-element-id` and `data-heading-id` for reliable targeting.

**Type Safety**: Uses exported `GranularityKey` type and Zod validation for API responses.

## Limitations

- Relies on exact text matching between HTML headings and parsed elements
- No support for duplicate heading text in original headings
- Single-click selection only (no multi-select or ranges)
- AI-generated headings are not yet persisted to database
- Expand/collapse and granularity state is memory-only (lost on page refresh)
- No animation transitions for expand/collapse actions
- No keyboard shortcuts for expand/collapse operations
- Tooltip requests still fire for headings hidden by granularity filtering