# Glossary Feature

## Goal

Implement a glossary feature that extracts and displays key entities (people, concepts, places, etc.) from documents using LLM analysis. The glossary will appear in a dedicated pane and help readers understand important terms and references in the document.

## Context

The previous Spideryarn implementation had a sophisticated entity extraction system that:
- Used LLM to identify entities worth including in a glossary
- Categorised entities by ontology (person, concept, place, etc.)
- Provided brief and detailed explanations
- Highlighted entities in the document text

We want to adapt this approach for the new Next.js implementation while keeping it simpler initially.

## Key Decisions

1. **Display Order**: Show entities ordered by first occurrence in document (not grouped by type)
2. **Type Annotation**: Show ontology type as grey smallcaps annotation next to entity name
3. **Loading Behaviour**: Load on-demand via button (not automatic)
4. **Explanations**: Display long_explanation in glossary pane, save brief_explanation for future tooltips
5. **Error Handling**: Show clear errors with Phosphor icons, no fallback data
6. **Web Search**: Include instruction in prompt to search web if needed for accurate information

## Actions

### Phase 1: Basic Implementation

- [x] **DONE** Create API endpoint with hardcoded sample
  - [x] Created `/api/glossary/route.ts` with sample entities
  - [x] Initial UI testing successful

- [x] **DONE** Update document page UI
  - [x] Added glossary state management
  - [x] Added "Load glossary" button
  - [x] Pass glossary data to DocumentViewer

- [x] **DONE** Create glossary display component
  - [x] Display entities ordered by first occurrence
  - [x] Show ontology type as grey smallcaps annotation
  - [x] Show long_explanation (with fallback to brief)

- [x] **DONE** Create prompt templates
  - [x] Created `lib/prompts/templates/glossary.ts` with Zod schemas
  - [x] Created `lib/prompts/templates/glossary.njk` with comprehensive prompt
  - [x] Adapted from old `generate_entities` prompt

- [x] **DONE** Connect real LLM processing
  - [x] Replaced hardcoded sample with actual LLM call
  - [x] Fixed schema validation issues
  - [x] Removed fallback to sample data
  - [x] Added proper error handling with Phosphor icons

- [x] **DONE** Create documentation
  - [x] Created `docs/TOOL_GLOSSARY.md` following evergreen documentation guidelines
  - [x] Documented feature behaviour, implementation details, and future enhancements

### Phase 2: Navigation Features (Current Focus)

- [ ] **TODO** Click-to-scroll functionality
  - [ ] Track entity positions in document elements
  - [ ] Implement click handler for glossary entities
  - [ ] Scroll to first occurrence of entity in document viewer

- [ ] **TODO** Enhanced entity tracking
  - [ ] Modify LLM prompt to include position information
  - [ ] Update entity schema to include `first_occurrence_element_id`
  - [ ] Store entity-to-element mapping for navigation

### Phase 3: Highlighting Features

- [ ] **TODO** Document text highlighting
  - [ ] Highlight entity occurrences in document text
  - [ ] Show brief_explanation tooltips on hover
  - [ ] Visual indication of clickable entities

### Phase 4: Storage & Performance

- [ ] **TODO** Storage optimisation
  - [ ] Store entities in Supabase
  - [ ] Enable incremental updates
  - [ ] Cache entities per document

### Phase 5: User Experience

- [ ] **TODO** User preferences
  - [ ] Filter by entity type
  - [ ] Expand/collapse explanations
  - [ ] Search within glossary

## Appendix

### Entity Schema

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

### Relevant Files

**Previous Implementation Reference:**
- `obsolete_alternative_version/231208_jupyter_viz/prompt_templates.py` - `generate_entities` prompt
- `obsolete_alternative_version/231208_jupyter_viz/ai_entities.py` - `generate_entities()` and `create_entity()` functions
- `obsolete_alternative_version/231208_jupyter_viz/collection.py` - `do_llm_generate_entities()` function
- `docs/OBSOLETE_ALTERNATIVE_VERSION.md` - Overview of previous implementation

**Current Implementation Patterns:**
- `docs/LLM_PROMPT_TEMPLATES.md` - Prompt template guidelines
- `lib/prompts/templates/summarise.ts` - Example Zod schema
- `lib/prompts/templates/summarise.njk` - Example Nunjucks template
- `/api/summarise/route.ts` - Example API endpoint