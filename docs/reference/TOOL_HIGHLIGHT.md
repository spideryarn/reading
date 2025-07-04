# Document Semantic Highlighting Tool

Document semantic highlighting enables users to create AI-powered highlights based on semantic criteria (e.g., "arguments supporting the main thesis", "statistical evidence") with confidence-based visual intensity.

## See Also

- `components/highlight-management.tsx` - Main highlighting interface and logic
- `components/simple-document-viewer.tsx` - Document rendering with highlight display
- `lib/utils/semantic-highlighting.ts` - Utility functions for confidence-to-CSS mapping
- `app/globals.css` - CSS classes for semantic highlighting with visual intensity levels
- `docs/reference/CROSS_PANE_COMMUNICATION_MESSAGING_ARCHITECTURE.md` - Cross-pane communication patterns including highlight data flow
- `docs/reference/DESIGN_OVERLAPPING_TEXT_HIGHLIGHTS.md` - Comprehensive guide for implementing overlapping text highlighting to combine semantic highlights with search and glossary
- `docs/planning/finished/250612a_semantic_search_to_highlights_refactor.md` - Original implementation design decisions
- `docs/planning/finished/250613a_semantic_highlight_persistence_fix.md` - React-first architecture migration and persistence fixes

## Key Principles & Decisions

### React-First Architecture ✓
- **Highlight state managed in React state** at page-client level, not DOM manipulation
- **Props-based data flow** from page-client → ResizableDocumentLayout → UnifiedLeftPane → HighlightManagement and SimpleDocumentViewer
- **CSS classes applied during React render cycle** ensuring persistence through re-renders

### Separation of Concerns ✓
- **Highlight management** (creation, API calls) handled by HighlightManagement component
- **Highlight display** (visual styling) handled by SimpleDocumentViewer component  
- **Active highlight interactions** (scrolling, temporary effects) use DocumentCommunicationContext actions

### Performance & Simplicity Trade-offs
- **Explicit props threading** chosen over React Context for clarity and debugging ease
- **O(N×H) highlight lookup** accepted for prototype phase - can optimize with memoized Map if needed
- **Document-level state ownership** enables future persistence and collaboration features

## Architecture Overview

```
page-client.tsx (semanticHighlights: SemanticHighlight[])
├── ResizableDocumentLayout (props threading)
    ├── UnifiedLeftPane → HighlightManagement (highlight creation)
    └── SimpleDocumentViewer (highlight display)
```

### Data Flow

1. **User creates highlights** in HighlightManagement tab
2. **API call to `/api/semantic-search`** returns confidence scores and element IDs
3. **Convert to simplified format** for display: `{elementId, confidence}`
4. **Update page-client state** via `onSemanticHighlightsChange` callback
5. **Props flow down** to SimpleDocumentViewer for visual rendering
6. **CSS classes applied** during React render with confidence-based intensity

### State Management

**Two highlight interfaces serve different purposes:**

```typescript
// Full metadata for management (internal to HighlightManagement)
interface Highlight {
  id: string
  criterion: string
  elementId: string
  confidence: number
  reasoning: string
  textExcerpt: string
  // ... other metadata
}

// Simplified interface for display (passed as props)
interface SemanticHighlight {
  elementId: string
  confidence: number
}
```

**Rationale**: Separation of concerns - display logic only needs visual information, management retains full metadata.

## Visual Implementation

### CSS Intensity System ✓

Five confidence-based visual intensity levels using Spideryarn orange theme:

```css
.semantic-highlight-very-low    /* 0-19%: rgba(219, 138, 69, 0.1) */
.semantic-highlight-low         /* 20-39%: rgba(219, 138, 69, 0.2) */
.semantic-highlight-medium      /* 40-59%: rgba(219, 138, 69, 0.3) */
.semantic-highlight-high        /* 60-79%: rgba(219, 138, 69, 0.4) */
.semantic-highlight-very-high   /* 80-100%: rgba(219, 138, 69, 0.5) */
```

### CSS Specificity for Selection Compatibility ✓

High-specificity rules preserve semantic highlights when elements are selected:

```css
/* Overrides selection styling to maintain highlight visibility */
.bg-blue-50.semantic-highlight-high {
  background-color: rgba(219, 138, 69, 0.45) !important;
  border-left: 4px solid rgba(219, 138, 69, 0.8) !important;
}
```

**Coverage**: Currently handles `.bg-blue-50` (element selection). Could be extended for `.bg-green-50` (AI-generated elements) if needed.

## User Interaction Patterns

### Highlight Creation
1. **User enters criterion** in Highlights tab (e.g., "statistical evidence")
2. **Query history dropdown** shows previous searches for quick reuse
3. **"Create Highlights" button** triggers semantic analysis via LLM
4. **Results displayed** in highlights list with confidence-based visual intensity
5. **Document elements** automatically receive orange highlighting

### Navigation & Active Highlighting
- **Click highlight in list** → Uses `actions.scrollToElement(elementId)` from DocumentCommunicationContext
- **Automatic scrolling** with temporary highlight pulse effect (2 seconds)
- **No DOM manipulation** - reuses existing robust scrolling infrastructure

### Sorting & Organization
- **Position sorting** (default): Highlights appear in document order using `element.position` field
- **Intensity sorting**: Highlights ordered by confidence score (highest first)
- **Sort toggle** available when multiple highlights exist

## API Integration

### Semantic Search Endpoint
- **POST `/api/semantic-search`** with `{query, documentId}`
- **LLM analysis** returns confidence scores, reasoning, and relevant text excerpts
- **Caching system** stores results for repeat queries
- **Query history** tracked for UX improvements

### Response Format
```typescript
{
  matches: [{
    elementId: string
    confidence: number // 0-1 range
    reasoning: string
    relevantText: string
  }],
  cached: boolean,
  cachedAt?: string
}
```

## Cross-Pane Communication

### Highlight Data Flow (Props-Based)
Semantic highlight data flows as **document state** through explicit props:

```typescript
// page-client.tsx manages persistent highlight state
const [semanticHighlights, setSemanticHighlights] = useState<SemanticHighlight[]>([])

// Props threaded through component hierarchy
<ResizableDocumentLayout 
  semanticHighlights={semanticHighlights}
  onSemanticHighlightsChange={setSemanticHighlights}
/>
```

### Active Highlight Interactions (Context-Based)
Active highlight interactions use **DocumentCommunicationContext** actions for UI coordination:

```typescript
// HighlightManagement uses context actions for scrolling/highlighting
const { actions } = useDocumentCommunication()

const handleHighlightClick = (highlight: Highlight) => {
  actions.scrollToElement(highlight.elementId) // Handles scrolling + temp highlight
}
```

**Rationale**: Persistent highlight data is document content state (props), while interaction effects are cross-pane UI coordination (context).

## Alternative Architectures Considered

### React Context Alternative
The o3 AI critique suggested using React Context instead of props drilling:

**Props Drilling (Current Choice)**:
- ✅ Explicit data flow, easier debugging
- ✅ Clear component interfaces  
- ✅ Consistent with project's architectural patterns
- ❌ Verbose - requires threading through 3 component layers

**React Context Alternative**:
- ✅ Cleaner component interfaces
- ✅ Localized re-renders  
- ❌ Implicit data dependencies
- ❌ More complex testing setup

**Decision**: Keep props drilling for simplicity, explicit data flow, and consistency with existing patterns. Can migrate to context if prop chains become unwieldy.

See `docs/planning/250613a_semantic_highlight_persistence_fix.md` appendix for detailed critique analysis.

## Performance Considerations

### Current Implementation
- **O(N×H) highlight lookup** in SimpleDocumentViewer using `Array.find()`
- **Re-render cascade** when highlights change (all components in props chain)
- **Acceptable for prototype phase** with typical document/highlight sizes

### Optimization Options (If Needed)
```typescript
// Memoized Map for O(1) lookup
const highlightMap = useMemo(() => 
  new Map(semanticHighlights.map(h => [h.elementId, h])), 
  [semanticHighlights]
)
```

**When to optimize**: If performance issues observed with large documents (1000+ elements) or many highlights (50+).

## Testing Strategy

### Unit Tests ✓
- `lib/utils/__tests__/semantic-highlighting.test.ts` - Utility functions (11 tests)
- Confidence-to-CSS mapping validation
- Boundary condition testing

### Integration Tests ✓  
- `components/__tests__/semantic-highlighting-integration.test.tsx` - DOM integration (5 tests)
- CSS class application during React render
- Highlight persistence through re-renders

### Manual Testing Scenarios ✓
- Position sorting: First paragraph appears first in highlights list
- Highlight persistence: Orange highlights remain after clicking elements  
- Selection compatibility: Highlights visible when elements selected
- Multiple highlight sets with different confidence levels

## Known Limitations & Future Enhancements

### Current Limitations
- **Single highlight set**: Only one semantic criterion active at a time
- **No persistence**: Highlights cleared on page reload
- **Limited CSS overrides**: Only handles `.bg-blue-50` selection conflicts

### Planned Enhancements 📋
- **Multiple simultaneous criteria**: Support overlapping highlight sets
- **Highlight persistence**: Save to localStorage or database
- **Real-time collaboration**: Sync highlights across users
- **Advanced filtering**: Filter highlights by confidence threshold

### Technical Debt to Address
- **Eliminate remaining DOM manipulation**: Convert `.semantic-highlight-active` pulse effect to React state
- **Extend CSS coverage**: Add overrides for `.bg-green-50` and other selection states
- **Add E2E regression test**: Automated click-select-deselect persistence validation

## Troubleshooting

### Highlights Disappear After Interaction
**Symptom**: Orange highlights vanish when clicking on elements  
**Cause**: Likely regression to DOM manipulation approach  
**Solution**: Ensure highlights applied via React props, not manual DOM updates

### Incorrect Highlight Order
**Symptom**: First document paragraphs appear later in highlights list  
**Cause**: Sorting by `elementId` strings instead of `element.position`  
**Solution**: Verify `sortHighlights()` uses actual position data from DocumentElement

### CSS Conflicts
**Symptom**: Highlights masked by selection styling  
**Solution**: Add high-specificity CSS overrides in `app/globals.css`

## Implementation Status

- Core highlighting system ✓
- React-based persistence ✓ 
- Position-based sorting ✓
- Confidence-based visual intensity ✓
- Cross-pane communication ✓
- API integration ✓
- Query history & caching ✓
- CSS selection compatibility ✓ (partial - blue selection only)
- Active highlight DOM manipulation elimination 🚧 (pending)
- Extended CSS override coverage 📋 (planned)