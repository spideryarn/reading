# Semantic Search Implementation

## Goal

Add semantic search functionality to complement the existing text search in Spideryarn Reading. Users should be able to search for themes, concepts, and questions rather than just exact text matches. The LLM will analyze the document content and identify semantically relevant elements that match the user's query.

### Initial Requirements (Stage 1)
- Add semantic search toggle/option within existing Search tab
- Use LLM to identify document elements that semantically match user queries
- Reuse existing search result display and navigation machinery
- Start with binary (yes/no) semantic matching rather than confidence scores
- Focus on element-level matches using existing element ID system
- No database caching initially - implement direct LLM calls

### Future Enhancements (Later Stages)
- Confidence scores and continuous-valued matching with color gradients
- Sub-element highlighting of specific relevant text spans
- Database caching of semantic search results
- User interface options for sorting by position vs relevance
- Different visual styling to distinguish semantic vs text matches

## Context

The application currently has:
- Robust text search using Mark.js with cross-element highlighting
- Search tab in unified left pane with advanced options (case sensitivity)
- Existing LLM integration using Nunjucks + Zod prompt templates
- Element-based document structure with deterministic IDs
- Search result navigation that scrolls to and highlights matched elements
- Document storage with both HTML and plaintext content

## References

- `docs/SEARCH_TEXT.md` - Current text search implementation and architecture
- `planning/finished/250604b_document_search_functionality.md` - Initial search feature planning
- `planning/finished/250605a_cross_element_text_search_implementation.md` - Cross-element search development
- `docs/LLM_PROMPT_TEMPLATES.md` - Standard pattern for LLM integration using Nunjucks + Zod
- `components/unified-left-pane.tsx` - Search UI implementation with advanced options section
- `lib/prompts/templates/` - Existing prompt templates (glossary, summarise, headings)
- `docs/CODING_PRINCIPLES.md` - Development principles emphasising simplicity and rapid prototyping

## Principles & Key Decisions

1. **Reuse existing search infrastructure**: Leverage current search UI, result display, navigation, and element highlighting systems
2. **Start simple with binary matching**: Use yes/no semantic relevance initially, evolving to confidence scores later
3. **Element-level granularity initially**: Match whole elements by ID, with sub-element highlighting as future enhancement
4. **No fallbacks or masking**: Surface errors and unusual outputs clearly to user rather than hiding them
5. **Manual trigger**: Semantic search activated by button click, not automatic like text search
6. **Clean document format for LLM**: Use annotated text format rather than raw HTML to minimize token usage
7. **Extensible output format**: Ask LLM for structured output including future fields, only use element IDs initially
8. **No database caching initially**: Keep implementation simple, add persistence later
9. **No content truncation initially**: Send full documents to LLM, implement truncation only if needed

## Actions

### Stage 1: Create Semantic Search Prompt Template
- [ ] Create semantic search Nunjucks template (`lib/prompts/templates/semantic-search.njk`)
  - [ ] Use annotated document format: `[elem_id] content text`
  - [ ] Request structured JSON output with elementId, confidence, reasoning, relevantText
  - [ ] Emphasize conservative matching to avoid false positives
  - [ ] Follow existing prompt template patterns from glossary/summarise features
- [ ] Create corresponding TypeScript schema (`lib/prompts/templates/semantic-search.ts`)
  - [ ] Define input schema for document content and search query
  - [ ] Define output schema for structured match results
  - [ ] Use Zod validation following existing patterns
  - [ ] Configure appropriate model settings (temperature, maxTokens)
- [ ] Write basic tests for prompt template validation
  - [ ] Test input schema validation
  - [ ] Test with sample document and query
  - [ ] Run tests and ensure they pass
- [ ] Update planning doc with progress and commit changes

### Stage 2: Implement Document Format Conversion
- [ ] Create utility function to convert document elements to annotated format
  - [ ] Extract elements from existing document structure
  - [ ] Format as `[element_id] text_content` lines
  - [ ] Handle various element types (headings, paragraphs, etc.)
  - [ ] Add function to `lib/services/document-parser.ts` or create new utility file
- [ ] Write tests for document format conversion
  - [ ] Test with sample document elements
  - [ ] Verify element ID preservation and text extraction
  - [ ] Test edge cases (empty elements, special characters)
  - [ ] Run tests and ensure they pass
- [ ] Manual testing with actual document data
- [ ] Update planning doc with progress and commit changes

### Stage 3: Create Semantic Search API Endpoint  
- [ ] Create API route `/app/api/semantic-search/route.ts`
  - [ ] Follow existing pattern from `/app/api/glossary/route.ts`
  - [ ] Accept document slug and search query
  - [ ] Load document from database
  - [ ] Convert document to annotated format
  - [ ] Execute semantic search prompt
  - [ ] Parse LLM response and extract element IDs
  - [ ] Return structured results
- [ ] Add proper error handling and validation
  - [ ] Handle LLM failures gracefully
  - [ ] Validate input parameters
  - [ ] Return appropriate HTTP status codes
  - [ ] Surface errors clearly (no masking per principles)
- [ ] Write API tests
  - [ ] Test with valid document and query
  - [ ] Test error scenarios
  - [ ] Test response format validation
  - [ ] Run tests and ensure they pass
- [ ] Manual testing with Playwright MCP or curl
- [ ] Update planning doc with progress and commit changes

### Stage 4: Add Semantic Search Toggle to UI
- [ ] Modify `components/unified-left-pane.tsx` to add semantic search option
  - [ ] Add semantic search state variable
  - [ ] Add toggle/checkbox in advanced options section (alongside case sensitivity)
  - [ ] Add "Semantic Search" button to trigger semantic search
  - [ ] Show loading state during LLM processing
  - [ ] Handle semantic search results alongside text search results
- [ ] Update search result display
  - [ ] Distinguish semantic results from text results (simple approach initially)
  - [ ] Use existing result format but indicate source (text vs semantic)
  - [ ] Reuse existing navigation and highlighting on click
- [ ] Write UI tests for semantic search components
  - [ ] Test toggle rendering and state changes
  - [ ] Test semantic search button functionality
  - [ ] Test loading states and error display
  - [ ] Test results display and navigation
  - [ ] Run tests and ensure they pass
- [ ] Update planning doc with progress and commit changes

### Stage 5: Integrate Semantic Search with Existing Navigation
- [ ] Ensure semantic search results work with existing `onHeadingClick` navigation
  - [ ] Verify element IDs from LLM match document structure
  - [ ] Test scroll-to-element functionality
  - [ ] Test element highlighting/selection state
- [ ] Handle edge cases for semantic search
  - [ ] No results from LLM
  - [ ] Invalid element IDs returned by LLM
  - [ ] LLM timeout or failure
  - [ ] Empty or very short queries
- [ ] Add comprehensive error messaging
  - [ ] Clear user feedback for different error types
  - [ ] No confusing fallbacks per principles
- [ ] Write integration tests
  - [ ] Test end-to-end semantic search flow
  - [ ] Test navigation from semantic results
  - [ ] Test error scenarios
  - [ ] Run tests and ensure they pass
- [ ] Update planning doc with progress and commit changes

### Stage 6: Manual Testing and Polish
- [ ] Comprehensive manual testing with dev server
  - [ ] Test semantic search with various document types
  - [ ] Try different query types (themes, questions, concepts)
  - [ ] Verify navigation and highlighting work correctly
  - [ ] Test error handling with invalid inputs
- [ ] UI polish and refinements
  - [ ] Ensure consistent styling with existing search features
  - [ ] Optimize loading states and user feedback
  - [ ] Verify accessibility and responsive design
- [ ] Performance testing
  - [ ] Test with large documents
  - [ ] Measure LLM response times
  - [ ] Ensure UI remains responsive during processing
- [ ] Update planning doc with progress and commit changes

### Stage 7: Documentation and Cleanup
- [ ] Update `docs/SEARCH_TEXT.md` to include semantic search
  - [ ] Document semantic search functionality and architecture
  - [ ] Explain integration with existing text search
  - [ ] Document prompt template and LLM integration
- [ ] Update `docs/PROJECT_STATUS.md` with new semantic search feature
- [ ] Clean up any TODO comments or debug logging
- [ ] Final test run of entire test suite
- [ ] Move planning doc to `planning/finished/` and commit
- [ ] Stop and review with user for feedback on semantic search functionality

### Later Stage: Advanced Features. DISCUSS WITH USER before proceeding
- [ ] Implement confidence-based matching with visual indicators
  - [ ] Modify prompt to return confidence scores
  - [ ] Add color gradients to indicate match strength
  - [ ] Add user option to sort by relevance vs position
- [ ] Add sub-element text highlighting
  - [ ] Parse "relevantText" from LLM output
  - [ ] Implement precise text span highlighting
  - [ ] Integrate with Mark.js highlighting system
- [ ] Implement database caching
  - [ ] Store semantic search results in `document_enhancements` table
  - [ ] Cache by (document_id, query_hash) for performance
  - [ ] Add cache invalidation strategy
- [ ] Add different visual styling for semantic vs text matches
  - [ ] Implement color coding system
  - [ ] Add user preferences for visual distinctions

## Appendix

### Annotated Document Format Example
```
[elem_h1_0_title] Introduction to Quantum Physics
[elem_p_1_content] Quantum mechanics describes the physical properties of nature at the scale of atoms and subatomic particles.
[elem_h2_2_wave] Wave-Particle Duality  
[elem_p_3_content] One of the most fascinating aspects of quantum mechanics is the concept of wave-particle duality.
```

### Expected LLM Output Structure
```json
{
  "matches": [
    {
      "elementId": "elem_p_1_content",
      "confidence": 0.9,
      "reasoning": "Directly defines quantum mechanics which matches the user's query about quantum physics fundamentals",
      "relevantText": "Quantum mechanics describes the physical properties of nature"
    },
    {
      "elementId": "elem_h2_2_wave", 
      "confidence": 0.8,
      "reasoning": "Wave-particle duality is a core concept in quantum physics",
      "relevantText": "Wave-Particle Duality"
    }
  ]
}
```

### Alternative Approaches Considered

**Document Format Options:**
- Raw HTML with element IDs: Rejected due to token overhead and noise
- Plaintext only: Rejected because can't map back to element IDs
- **Selected: Annotated format** - Clean, concise, preserves element mapping

**Output Format Evolution:**
- Start simple with just element IDs: Would require format changes later
- **Selected: Structured output from start** - Ask for full structure, ignore unused fields initially
- Progressive enhancement without breaking changes

**Integration Strategy:**  
- Separate semantic search tab: Rejected due to UI complexity
- **Selected: Toggle in existing search** - Leverages existing infrastructure
- Always-on semantic search: Rejected due to performance/cost concerns

### Key Technical Decisions

**No Content Truncation Initially**: Unlike existing glossary feature (50k char limit), semantic search will handle full documents to test LLM capabilities and performance characteristics.

**Manual Trigger Over Auto-search**: Semantic search requires explicit user action rather than debounced automatic execution due to LLM cost and latency.

**Conservative Matching Strategy**: Prompt will emphasize avoiding false positives rather than maximizing recall, following principle of surfacing clear errors rather than confusing results.