# Glossary Feature Implementation Plan

## Relevant Files

- **Previous Implementation Reference:**
  - `obsolete_alternative_version/231208_jupyter_viz/prompt_templates.py` - `generate_entities` prompt
  - `obsolete_alternative_version/231208_jupyter_viz/ai_entities.py` - `generate_entities()` and `create_entity()` functions
  - `obsolete_alternative_version/231208_jupyter_viz/collection.py` - `do_llm_generate_entities()` function
  - `docs/OBSOLETE_ALTERNATIVE_VERSION.md` - Overview of previous implementation

- **Current Implementation Patterns:**
  - `docs/LLM_PROMPT_TEMPLATES.md` - Prompt template guidelines
  - `lib/prompts/templates/summarise.ts` - Example Zod schema
  - `lib/prompts/templates/summarise.njk` - Example Nunjucks template
  - `/api/summarise/route.ts` - Example API endpoint

- **Documentation:**
  - `README.md` - Project overview
  - `docs/ARCHITECTURE.md` - System architecture
  - `docs/WRITING_EVERGREEN_DOCS.md` - Documentation guidelines

## Summary

Implement a glossary feature that extracts and displays key entities (people, concepts, places, etc.) from documents using LLM analysis. The glossary will appear in a dedicated pane and help readers understand important terms and references in the document.

## Context

The previous Spideryarn implementation had a sophisticated entity extraction system that:
- Used LLM to identify entities worth including in a glossary
- Categorised entities by ontology (person, concept, place, etc.)
- Provided brief and detailed explanations
- Highlighted entities in the document text

We want to adapt this approach for the new Next.js implementation while keeping it simpler initially.

## Goals

1. Extract entities from documents using Claude Sonnet 4
2. Display entities in a dedicated Glossary pane
3. Provide clear categorisation and explanations
4. Enable future enhancements (highlighting, navigation, storage)

## Proposed Solution

### Phase 1: Basic Entity Extraction and Display (MVP)

1. **API Endpoint** (`/api/glossary`)
   - Accept document HTML
   - Extract entities using LLM
   - Return JSON array of entities
   - On-demand generation (no caching initially)

2. **Entity Schema** (using Zod for validation)
   ```typescript
   const entitySchema = z.object({
     name: z.string(),
     ontology: z.enum([
       'person', 'place', 'date', 'theme', 'event', 
       'reference', 'object', 'organization', 'concept', 
       'definition', 'other'
     ]),
     aliases: z.array(z.string()),
     brief_explanation: z.string(), // Markdown formatted
     long_explanation: z.string().optional(), // Markdown formatted
     datetime: z.string().optional(),
     url: z.string().url().optional(),
     extra: z.record(z.any()).optional()
   });
   ```

3. **Prompt Template**
   - Adapt the comprehensive prompt from the old system
   - Preserve instructions about entity selection criteria
   - Include instruction to search the web if needed for accurate information
   - Maintain JSON output format
   - Use Nunjucks template with Zod validation

4. **UI Display**
   - List entities in the Glossary pane
   - Group by ontology type (People, Concepts, etc.)
   - Show name and brief explanation
   - Light formatting for readability

### Phase 2: Enhancements (Future)

1. **Navigation**
   - Click entity → scroll to first occurrence
   - Requires tracking entity positions in document

2. **Highlighting**
   - Highlight entity occurrences in document text
   - Show tooltips on hover

3. **Storage**
   - Cache entities in Supabase
   - Enable incremental updates

4. **User Preferences**
   - Filter by entity type
   - Expand/collapse explanations
   - Search within glossary

## Implementation Steps

### Step 1: Create Prompt Template
- Create `lib/prompts/templates/glossary.njk`
- Create `lib/prompts/templates/glossary.ts` with Zod schema
- Adapt prompt from `generate_entities` in old codebase

### Step 2: Create API Endpoint with Hardcoded Sample
- Create `/api/glossary/route.ts`
- Follow pattern from `/api/summarise`
- Initially return hardcoded sample entities for testing
- **STOP HERE** for user to test UI display

### Step 3: Connect Real LLM Processing
- Parse HTML, execute prompt, return entities
- Replace hardcoded sample with actual LLM call

### Step 4: Update Document Page
- Add state for glossary entities
- Fetch entities when document loads
- Pass entities to Glossary pane component

### Step 5: Create Glossary Component
- Create `components/glossary.tsx`
- Display entities grouped by ontology
- Apply formatting and styling

### Step 6: Testing
- Test with example documents
- Verify entity extraction quality
- Check UI responsiveness

### Step 7: Create Documentation
- Create `docs/GLOSSARY.md` following evergreen documentation guidelines
- Document feature behaviour, implementation details, and future enhancements

## Technical Considerations (IGNORE FOR NOW)

1. **Performance**
   - Large documents may take time to process
   - Consider showing loading state
   - Future: process in chunks

2. **Token Limits**
   - Long documents may exceed context window
   - Future: implement chunking strategy

3. **Entity Matching**
   - For future highlighting feature
   - Need robust text matching (handle variations)
   - Consider React component approach vs DOM manipulation

## Success Criteria

1. Entities are accurately extracted from documents
2. Glossary displays clearly with proper categorisation
3. Brief explanations help readers understand terms
4. UI remains responsive during extraction
5. Code follows existing patterns and conventions

## Risks and Mitigations

1. **Risk**: LLM token limits for long documents
   - **Mitigation**: Start with shorter documents, plan chunking for later

2. **Risk**: Poor entity extraction quality
   - **Mitigation**: Refine prompt based on testing, use comprehensive instructions from old system

3. **Risk**: Performance impact on page load
   - **Mitigation**: Load glossary asynchronously, show loading state

## Next Steps

1. Review and approve this plan
2. Create prompt template files
3. Implement API endpoint
4. Update UI components
5. Test with example documents

## Notes

- The old implementation's entity prompt is well-crafted and should be preserved with minimal changes
- The ontology categories provide good coverage of entity types
- Starting simple (just display) allows us to validate the extraction quality before adding complex features