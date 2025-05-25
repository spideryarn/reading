# Table of Contents Pane

The table of contents pane extracts headings from HTML documents and provides hierarchical navigation with interactive element selection. This document covers the architecture and key patterns for the ToC system.

## See also

- `components/table-of-contents.tsx` - main ToC component implementation
- `app/documents/[slug]/page-client.tsx` - state management and coordination between panes
- `components/document-viewer.tsx` - element display and selection functionality
- `docs/ARCHITECTURE.md` - overall application architecture

## Key Architecture

The ToC system uses a three-component coordination pattern:

1. **TableOfContents** - extracts headings from HTML and renders hierarchical list
2. **DocumentPageClient** - manages shared state and coordinates between panes
3. **DocumentViewer** - displays elements and accepts external selection state

State flows unidirectionally: ToC click → client handler → element selection → viewer update.

## Heading Extraction

Uses browser DOMParser to extract `h1-h6` elements from HTML content:

```typescript
const parser = new DOMParser()
const doc = parser.parseFromString(content, 'text/html')
const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
```

Generates IDs for headings that lack them, ensuring reliable navigation targets.

## Visual Hierarchy

- **Indentation**: Progressive left padding (`pl-0`, `pl-4`, `pl-8`, etc.) based on heading level
- **Level labels**: Small `H1`, `H2` prefixes in gray text
- **Clickable items**: Hover states and smooth scrolling behaviour

## Interactive Coordination

When a ToC heading is clicked:

1. `handleHeadingClick` finds corresponding `DocumentElement` by matching heading text
2. Sets `selectedElement` state in parent component
3. DocumentViewer receives updated selection and highlights element
4. Smooth scroll centers selected element in middle pane

## Element Matching

Matches ToC headings to document elements using:
- Tag name pattern matching (`/^h[1-6]$/i`)
- Exact text content comparison (trimmed)
- First match wins approach

## Common Patterns

**State Management**: External state pattern allows DocumentViewer to work standalone or with shared state.

**Fallback Behaviour**: ToC provides DOM scrolling fallback when no callback is provided.

**Data Attributes**: Uses `data-element-id` for reliable scroll targeting.

## Limitations

- Relies on exact text matching between HTML headings and parsed elements
- No support for duplicate heading text
- Single-click selection only (no multi-select or ranges)