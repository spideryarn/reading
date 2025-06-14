# Glossary Robust Text Matching with Regex Word Boundaries

**⚠️ OBSOLETE**: This planning document has been superseded by `planning/250614a_glossary_multi_occurrence_navigation.md` which implements multi-occurrence navigation using Mark.js instead of regex. The insights from this document regarding word boundaries and test cases have been incorporated into the new plan.

## Goal

Improve the glossary click-to-scroll functionality by replacing simple substring matching with robust regex-based word boundary matching. This will prevent false matches (e.g., "AI" matching "PAID") while building toward future HTML highlighting capabilities.

Current implementation uses `string.includes()` which causes precision issues. The goal is to implement word-boundary aware matching that handles multi-word aliases correctly, while laying groundwork for future text highlighting features.

## Context

The existing glossary feature (tracked in `planning/250526e_glossary_feature.md` and `planning/250526f_glossary_click_to_scroll_and_tooltips.md`) extracts entities using LLM and enables click-to-scroll navigation. However, the current `findFirstOccurrence()` function in `components/document-viewer.tsx:47-67` uses basic substring matching that produces false positives.

Investigation findings from codebase analysis:
- HTML processing goes through Cheerio which guarantees well-formed HTML
- `element.content` contains plain text only (HTML tags stripped via `$el.text().trim()`)
- Original HTML is accessible and well-formed for future highlighting work
- No fallback mechanisms needed - prefer clear failures for debugging

## Principles & Key Decisions

**Staging approach**: Build simple text-based matching first, then evolve toward HTML highlighting
- Stage 1: Word-boundary regex on plain text (`element.content`)
- Stage 2: Position mapping between text matches and HTML locations  
- Stage 3: HTML highlighting using DOM manipulation

**Matching behaviour**:
- Case-insensitive matching (preserves current user experience)
- Word boundary awareness using regex `\b` anchors
- Equal treatment of entity names and aliases
- Multi-word alias support (e.g., "Word1 Word2" should match across HTML tags)
- No fallback matching - fail clearly when entities not found

**Performance approach**: 
- Prioritise simplicity over micro-optimisations for documents <20 pages
- Compile regex per entity as needed (not overly complex pre-compilation)

**Future highlighting decision point**: When implementing Stage 3, choose between:
- DOM manipulation (inserting `<span>` elements around matches)
- CSS-based highlighting (marking text ranges, using Selection API)
- Canvas/overlay-based highlighting

## Actions

### Stage 1: Text-Based Word Boundary Matching

- [ ] **Implement regex-based entity matching**
  - [ ] Create new function `findEntityOccurrenceWithRegex()` in `components/document-viewer.tsx`
  - [ ] Use word boundary regex `/\b(entity|alias1|alias2)\b/gi` for each entity
  - [ ] Handle multi-word aliases by allowing optional whitespace: `/\b(word1\s+word2)\b/gi`
  - [ ] Preserve case-insensitive matching behaviour
  - [ ] Return first matching element ID or null (no fallbacks)

- [ ] **Update findFirstOccurrence function**
  - [ ] Replace `content.includes(term.toLowerCase())` with regex matching
  - [ ] Test with entities that previously caused false positives
  - [ ] Ensure multi-word aliases work correctly
  - [ ] Verify case-insensitive behaviour maintained

- [ ] **Add regex helper utilities**
  - [ ] Create `lib/utils/regex-matching.ts` for reusable regex functions
  - [ ] Function to escape special regex characters in entity names/aliases
  - [ ] Function to build word-boundary regex from entity data
  - [ ] Consider future needs for HTML position mapping

- [ ] **Test Stage 1 implementation**
  - [ ] Test with problematic cases: "AI" vs "PAID", "Maxwell" vs "Maxwell's"
  - [ ] Test multi-word aliases across different document structures
  - [ ] Verify performance acceptable for typical document sizes
  - [ ] Ensure clear failure behaviour when entities not found

**STOP HERE** for review before proceeding to subsequent stages

### Stage 2: HTML Position Mapping (Future)

- [ ] **Create text-to-HTML position mapper**
  - [ ] Build system to map text positions back to HTML element locations
  - [ ] Account for HTML tags, entities, and whitespace normalization
  - [ ] Store mapping data structure for efficient lookups
  - [ ] Handle edge cases where text spans multiple HTML elements

- [ ] **Integrate position mapping with regex matching**
  - [ ] Modify regex matching to return both element ID and text positions
  - [ ] Map text positions to HTML positions using position mapper
  - [ ] Validate mapping accuracy across different document types

### Stage 3: HTML Highlighting Implementation (Future)

- [ ] **Choose highlighting approach** (Decision point)
  - [ ] **Option A**: DOM manipulation - insert `<span class="highlight">` around matches
  - [ ] **Option B**: CSS-based - use Selection API or Range objects
  - [ ] **Option C**: Canvas/overlay - draw highlights over text
  - [ ] Consider accessibility, performance, and maintenance implications

- [ ] **Implement chosen highlighting method**
  - [ ] Create highlighting components/utilities
  - [ ] Handle multiple highlights per element
  - [ ] Ensure highlights don't break existing HTML structure
  - [ ] Add highlight removal/toggling functionality

- [ ] **Integrate highlighting with click-to-scroll**
  - [ ] Highlight all occurrences when entity clicked
  - [ ] Maintain scroll-to-first behaviour as primary action
  - [ ] Add visual feedback for active highlights

## Technical Implementation Notes

### Regex Pattern Strategy

For single-word entities: `/\b(entityname)\b/gi`
For multi-word entities: `/\b(word1\s+word2)\b/gi`
For aliases with special characters: Escape with `entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`

### Element Content Processing

Since `element.content` is plain text:
- No HTML tag stripping needed
- Direct regex application possible
- Word boundaries work as expected
- Multi-word matching handles whitespace variations

### Future HTML Highlighting Considerations

- Well-formed HTML from Cheerio enables safe DOM manipulation
- Position mapping required to translate text matches to HTML locations
- Need to preserve existing element IDs and attributes
- Consider impact on existing click handlers and interactivity

## References

### Related Documentation
- `docs/TOOL_GLOSSARY.md` - Current glossary feature architecture
- `planning/250526e_glossary_feature.md` - Base glossary implementation  
- `planning/250526f_glossary_click_to_scroll_and_tooltips.md` - Click-to-scroll design decisions

### Code Locations
- `components/document-viewer.tsx:47-67` - Current `findFirstOccurrence()` function
- `lib/services/document-parser.ts` - Document processing pipeline with Cheerio
- `obsolete_alternative_version/231208_jupyter_viz/ai_entities.py` - Reference regex implementation

### External References
- [gjdutils regex.py](https://github.com/gregdetre/gjdutils/blob/main/src/gjdutils/regex.py) - Inspiration for word boundary handling

## Appendix

### Test Cases for Regex Matching

**Problem cases to solve:**
- Entity "AI" should not match "PAID", "AIC", "AISLE"
- Entity "Maxwell" should match "Maxwell's" but not "Maxwell-Boltzmann" 
- Multi-word "United States" should match "United States of America"
- Case variations: "AI", "ai", "Ai" should all match entity "AI"

**Multi-word spanning HTML:**
- Alias "Word1 Word2" should match `Word1 <span>Word2</span>`
- Text normalization handles extra whitespace: "Word1    Word2"
- Hyphenated variations: "twenty-first century" vs "twenty first century"

### Performance Expectations

- Documents typically <20 pages, <50 entities
- Regex compilation per entity acceptable
- Text-only matching should be near-instantaneous
- Future HTML highlighting may require optimisation for longer documents