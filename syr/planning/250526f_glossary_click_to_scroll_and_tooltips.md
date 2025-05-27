# Glossary Click-to-Scroll and Highlight Tooltips

## Goal

Enhance the glossary feature with navigation and highlighting capabilities:
1. Click entity in glossary → scroll to first occurrence in document structure
2. Bidirectional scrolling sync between document and glossary panes  
3. Automatic text highlighting with tooltip explanations for entity mentions

This builds on the existing glossary implementation to create a fully interactive reading experience.

## Context

The current glossary feature (tracked in `planning/250526e_glossary_feature.md`) extracts entities using LLM and displays them in a dedicated pane. The next logical step is enabling navigation between the glossary and document content.

The previous Spideryarn implementation had sophisticated text replacement functionality (`obsolete_alternative_version/231208_jupyter_viz/ai_entities.py::replace_text_with_links()`) that we can adapt for the new React/Next.js architecture.

## Key Decisions

1. **Phase-by-phase approach**: Implement click-to-scroll first, then add bidirectional sync, then text highlighting
2. **Element ID targeting**: Use deterministic element IDs from document structure for precise navigation
3. **LLM-assisted positioning**: Enhance prompt to return first occurrence element IDs
4. **Comprehensive alias support**: Extract multiple aliases for robust text matching
5. **Regex-based highlighting**: Use proven approach from old implementation adapted for React

## Actions

### Stage 1: Click Entity → Scroll to First Occurrence

- [ ] **TODO** Update entity schema with position information
  - [ ] Add `first_occurrence` field with `element_id` and `text_snippet` properties
  - [ ] Update `lib/prompts/templates/glossary.ts` schema definitions
  - [ ] See `docs/GLOSSARY.md` for current entity schema reference

- [ ] **TODO** Enhance LLM prompt for position detection
  - [ ] Update `lib/prompts/templates/glossary.njk` to request element IDs
  - [ ] Instruct model to identify first occurrence of each entity
  - [ ] Include document structure context (element IDs, headings)
  - [ ] Add text snippet extraction for verification

- [ ] **TODO** Update API to pass document structure
  - [ ] Modify `app/api/glossary/route.ts` to accept document elements
  - [ ] Pass element structure to LLM for better position detection
  - [ ] Validate enhanced response schema

- [ ] **TODO** Implement click-to-scroll in UI
  - [ ] Add click handlers to entity names in glossary component
  - [ ] Use `document.getElementById()` to find target elements
  - [ ] Implement smooth scrolling with `scrollIntoView()`
  - [ ] Add visual feedback (highlight target after scroll)
  - [ ] Update `components/document-viewer.tsx` with navigation logic

- [ ] **TODO** Test and validate Stage 1
  - [ ] Test with multiple document types
  - [ ] Verify accurate positioning across different content structures
  - [ ] Ensure fallback handling when element IDs not found

**STOP HERE** for review before proceeding to subsequent stages

### Stage 2: Bidirectional Scrolling Sync

- [ ] **TODO** Track visible elements in document structure
  - [ ] Implement intersection observer for document pane
  - [ ] Identify which entities correspond to currently visible content
  - [ ] Update glossary highlighting based on document scroll position

- [ ] **TODO** Auto-scroll glossary to relevant entities
  - [ ] Calculate which entities are associated with visible document sections
  - [ ] Implement smooth glossary pane scrolling
  - [ ] Add visual indicators for "active" entities

### Stage 3: Enhanced Alias Support

- [ ] **TODO** Update prompt for comprehensive aliases
  - [ ] Review original prompt in `obsolete_alternative_version/231208_jupyter_viz/prompt_templates.py`
  - [ ] Ensure model extracts all relevant aliases (abbreviations, variations, etc.)
  - [ ] Example: "United States of America" → ["America", "US", "USA", "United States"]

- [ ] **TODO** Validate alias extraction quality
  - [ ] Test with documents containing varied entity references
  - [ ] Verify alias coverage for complex entities

### Stage 4: Text Highlighting with Tooltips

- [ ] **TODO** Implement regex-based text matching
  - [ ] Adapt `replace_text_with_links()` approach from `obsolete_alternative_version/231208_jupyter_viz/ai_entities.py`
  - [ ] Create React component for highlighted entity mentions
  - [ ] Handle HTML structure preservation during text replacement

- [ ] **TODO** Add tooltip functionality
  - [ ] Display `brief_explanation` on hover over highlighted entities
  - [ ] Implement click handler to scroll to entity in glossary pane
  - [ ] Style tooltips consistently with existing design system

- [ ] **TODO** Text replacement pipeline
  - [ ] Process document HTML to insert entity links
  - [ ] Preserve existing HTML structure and styling
  - [ ] Handle edge cases (entities spanning multiple elements, nested tags)

## Technical Considerations

### Element ID Strategy
- Leverage existing deterministic ID generation from `lib/services/deterministic-id.ts`
- Ensure LLM receives element context for accurate position detection
- Fallback to text search if element IDs not available

### Performance Optimisation
- Process text highlighting client-side to avoid API round-trips
- Consider memoisation for expensive regex operations
- Lazy load highlighting for long documents

### Error Handling
- Graceful degradation when element IDs not found
- Clear user feedback for navigation failures
- Fallback text search for edge cases

## References

### Related Documentation
- `docs/GLOSSARY.md` - Current glossary feature architecture and limitations
- `planning/250526e_glossary_feature.md` - Base glossary implementation progress
- `docs/LLM_PROMPT_TEMPLATES.md` - Prompt enhancement guidelines

### Previous Implementation
- `obsolete_alternative_version/231208_jupyter_viz/ai_entities.py::replace_text_with_links()` - Text replacement reference
- `obsolete_alternative_version/231208_jupyter_viz/prompt_templates.py` - Original entity extraction prompt

### Current Codebase
- `lib/prompts/templates/glossary.ts` - Entity schema and prompt configuration
- `lib/prompts/templates/glossary.njk` - LLM prompt template  
- `components/document-viewer.tsx` - Main document display component
- `lib/services/deterministic-id.ts` - Element ID generation service

## Appendix

### Enhanced Entity Schema (Proposed)

```typescript
const entitySchema = z.object({
  name: z.string(),
  ontology: z.enum([...]),
  aliases: z.array(z.string()),
  brief_explanation: z.string(),
  long_explanation: z.string().optional(),
  datetime: z.string().optional(),
  url: z.string().url().optional(),
  extra: z.record(z.any()).optional(),
  // New fields for navigation
  first_occurrence: z.object({
    element_id: z.string(),
    text_snippet: z.string(), // surrounding text for verification
    confidence: z.number().optional() // LLM confidence in position
  }).optional()
})
```

### Navigation Flow

1. User clicks entity in glossary pane
2. Extract `first_occurrence.element_id` from entity data
3. Use `document.getElementById()` to find target element
4. Scroll document structure pane to element using `scrollIntoView()`
5. Temporarily highlight target element for visual feedback
6. Handle errors gracefully with fallback text search if needed

### Multiple Occurrence Navigation - Design Options

**Problem**: Current implementation only navigates to first occurrence. Users need visibility and navigation to all entity mentions.

**Key user scenarios:**
- Academic reading: "Show me all mentions of 'consciousness' to follow the argument"
- Reference checking: "Is this 'Maxwell' referring to the person or the equations?"
- Concept tracking: "How does the author's use of this term evolve through the document?"

**Design constraints:**
- Frequency expectations: Could be 3-5 occurrences vs 15-20
- Context importance: Do users need surrounding text or just location?
- Performance: Loading context snippets could be slow
- UI complexity budget: Risk of feature creep

#### Option A: Footnotes Approach
- Add numbered footnotes next to entity names (¹ ² ³)
- Each footnote links to different occurrence
- Tooltip hover shows paragraph snippet
- Main entity name preserves current first-occurrence behaviour

**Pros:** Familiar footnote pattern, preserves main click behaviour
**Cons:** Cluttered for high-frequency entities, footnote numbers break mental model (not citations)

#### Option B: Filtered Results Tab
- Click entity → opens new tab/pane showing search results
- Each result shows context snippet: "...Maxwell's equations describe..."
- Click snippet → navigate to that occurrence

**Pros:** Rich context, familiar search results paradigm
**Cons:** Significant UI complexity, unclear where tab appears/dismissed, breaks document structure model

#### Option C: Progressive Disclosure (Recommended)
- First click → first occurrence (preserves current simplicity)
- Second click on same entity → shows occurrence picker overlay
- Maintains simplicity while adding power

**Pros:** Progressive complexity, preserves current UX, familiar interaction
**Cons:** Requires state tracking, might be non-obvious to users

#### Option D: Visual Frequency Indicators
- Show occurrence count in glossary: "Maxwell (5)"
- Hover shows mini-timeline of document positions
- Click behaviour unchanged but users get visibility

**Pros:** Non-intrusive, provides useful information, simple implementation
**Cons:** Doesn't solve navigation problem, only awareness

#### Option E: Document Highlighting + Navigation
- Click entity → highlight ALL occurrences in document structure pane
- Users click individual highlighted elements to navigate
- Leverages existing document structure view

**Pros:** Uses existing UI, clear visual feedback, simple implementation
**Cons:** Requires scrolling through document structure to find occurrences

#### Option F: Expandable Entity Cards
- Click chevron next to entity name → expands to show occurrence list
- Each with snippet: "Section 2.1: Maxwell's equations describe..."
- Preserves space when not needed

**Pros:** Space-efficient, clear information hierarchy, familiar UI pattern
**Cons:** Additional UI complexity, unclear how many users need this feature

#### Option G: Context Menu Approach
- Left click → first occurrence (preserves current behaviour)
- Right click → "Show all 5 occurrences" context menu
- Familiar desktop interaction pattern

**Pros:** Preserves current UX, familiar interaction, discoverable
**Cons:** Right-click may not be obvious, mobile compatibility issues

#### Recommended Hybrid Approach
Combine **Visual Frequency Indicators** + **Progressive Disclosure**:

1. Show occurrence count: "Maxwell (3)"
2. First click → first occurrence (preserves current simplicity)  
3. Second click → minimal overlay with occurrence list
4. Each showing: "Section 2.1: Maxwell's equations..."

**Rationale:** Adds power without cluttering default experience, fits existing interaction patterns, progressive complexity matches user needs.