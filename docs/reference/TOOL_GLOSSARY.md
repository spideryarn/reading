# Glossary Feature

The glossary feature extracts key entities from documents using LLM analysis and displays them in a dedicated pane to help readers understand important terms and references.

## See also

- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Guide to creating and using LLM prompt templates
- `docs/reference/DESIGN_OVERLAPPING_TEXT_HIGHLIGHTS.md` - Comprehensive guide for implementing overlapping text highlighting to enable glossary + search highlight combinations
- `docs/reference/ARCHITECTURE_URL_STATE.md` - URL state management for shareable glossary states (e.g., `?tab=glossary&term=quantum`)
- `docs/planning/finished/250620c_glossary_generate_more_timeout_mitigation.md` - Comprehensive timeout mitigation implementation
- `lib/prompts/templates/glossary.ts` - Entity schema and prompt configuration  
- `lib/prompts/templates/glossary.njk` - LLM prompt template for entity extraction
- `app/api/glossary/route.ts` - API endpoint for generating glossaries
- `components/simple-document-viewer.tsx` - Document highlighting and tooltip implementation
- `lib/utils/entity-position-tracking.ts` - Entity position tracking and sorting utilities
- `lib/types/entity.ts` - Entity type definitions with scoring fields

## Key decisions

- **Display order**: Entities ordered by first occurrence in document with optional difficulty/centrality sorting
- **Loading behaviour**: On-demand via button click with progressive "Load More" for large documents
- **Error handling**: Clear error messages with Phosphor icons, no fallback data
- **Explanations**: Display `long_explanation` in glossary pane and tooltips, with fallback to `brief_explanation`
- **Timeout mitigation**: Entity capping (20 per batch) prevents 504 errors on complex documents
- **Storage architecture**: Individual entity storage for granular tracking and incremental updates

## Entity extraction

The system supports multiple LLM providers (Claude and Gemini) for analysing document content and extracting relevant entities. The LLM prompt instructs the model to:

- Identify key terms worth including in a glossary
- Categorise entities by ontology type (person, concept, place, etc.)
- Provide brief and detailed explanations in Markdown format
- Search the web if needed for accurate information
- Return entities ordered by first occurrence in the document

**Multi-Provider Support**: Uses the centralised provider-tier system from `lib/config.ts`. Switch models using the `LLM_MODEL` environment variable (e.g., `google-cheap` for development, `anthropic-balanced` for production). See [docs/reference/LLM_MODEL_CONFIGURATION.md](LLM_MODEL_CONFIGURATION.md) for model comparison.

## Entity schema

```typescript
{
  name: string,
  ontology: 'person' | 'place' | 'date' | 'theme' | 'event' | 
           'reference' | 'object' | 'organization' | 'concept' | 
           'definition' | 'other',
  aliases: string[],
  brief_explanation: string,    // Markdown formatted
  long_explanation?: string,    // Markdown formatted
  datetime?: string,
  url?: string,
  extra?: Record<string, any>,
  // Optional scoring fields for difficulty and centrality
  difficulty?: number,  // 0-1 scale: how likely someone will know this (0=common, 1=expert knowledge)
  centrality?: number   // 0-1 scale: how important to understanding document (0=minor, 1=central)
}
```

## UI behaviour

1. **Loading**: Click "Load glossary" button to generate entities
2. **Display**: Entities shown with name, ontology type (grey smallcaps), and long explanation rendered as Markdown
3. **Search**: Real-time text search filters entities by name and aliases
4. **Navigation**: Click entity to scroll to first occurrence in document text
5. **Error states**: Clear error messages with warning icons when generation fails
6. **Loading states**: Spinning icon during LLM processing

### Search Functionality

The glossary includes client-side search functionality for quick entity lookup:

- **Real-time filtering**: Filter entities as you type with 300ms debouncing
- **Search scope**: Searches entity names and aliases (case-insensitive exact matching)
- **Results indicator**: Shows "X of Y entries" badge when search is active
- **Clear functionality**: X button to clear search and return to full list
- **Empty state**: "No matches found" message with helpful guidance
- **Auto-clear**: Search resets when switching between documents/tabs

### URL State Persistence

The glossary integrates with URL state management for shareable views:

- **Selected term**: `?tab=glossary&term=TERM` - Automatically highlights the specified term when loading
- **Bookmark support**: Users can bookmark specific glossary terms for later reference
- **Browser history**: Clicking glossary entities updates URL for browser back/forward navigation

Example URL: `/read/my-doc?tab=glossary&term=quantum` - Opens glossary with "quantum" term highlighted

## Current features

✅ **Entity extraction and display**: LLM-powered entity identification with ontology categorisation  
✅ **Click navigation**: Click any entity to scroll to its first occurrence in the document  
✅ **Search and filtering**: Real-time search through entity names and aliases  
✅ **Loading and error states**: Clear UI feedback during processing and on failures  
✅ **Document highlighting**: Entity mentions highlighted with orange dotted underline and book icon  
✅ **Smart tooltips**: Hover tooltips showing entity explanations with primary name display for aliases  
✅ **Progressive loading**: "Load More" functionality for large glossaries with timeout mitigation  
✅ **Individual entity storage**: Each entity stored separately for granular tracking and updates  
✅ **Entity scoring**: Difficulty and centrality scoring for intelligent prioritisation  
✅ **Multiple sorting options**: Sort by document position, difficulty, or centrality  
✅ **Cross-device support**: Desktop hover and mobile long-press tooltip access

## Document highlighting system

Entities are highlighted within the document text using Mark.js with the following features:

**Visual design**:
- Orange dotted underline (`#DB8A45`) for discoverability
- Book emoji (📖) superscript indicator
- Subtle hover background highlighting
- No obtrusive background colour by default

**Smart tooltip display**:
- Hover shows entity explanation with Markdown formatting rendered as HTML
- For aliases: prepends primary entity name in bold (e.g., "**United States of America:** The U.S. is...")
- Uses `long_explanation` when available, falls back to `brief_explanation`
- Cross-device compatibility: hover on desktop, long-press on mobile

**Technical implementation**:
- Mark.js highlighting with case-insensitive exact phrase matching
- Data attributes store entity metadata (`data-glossary-entity`, `data-glossary-matched-text`)
- Click handlers navigate to glossary tab and highlight the selected term
- Cross-pane communication via `DocumentCommunicationContext` for term highlighting
- Custom tooltip positioning and styling

## Progressive loading and timeout mitigation

**Entity capping**: Initial generation limited to 20 entities to prevent timeouts  
**Load More UI**: Button to generate additional entities in batches  
**Individual storage**: Each entity stored as separate database row for incremental updates  
**Position tracking**: Entities ordered by first occurrence in document regardless of generation sequence  
**Smart completion detection**: LLM indicates when more entities are available

## Entity scoring and prioritisation

**Difficulty scoring**: 0-1 scale from common knowledge (0) to expert knowledge (1)  
**Centrality scoring**: 0-1 scale from minor relevance (0) to central to document understanding (1)  
**Sorting controls**: Three-way toggle between Position, Difficulty, and Centrality ordering  
**Visual indicators**: Colour-coded percentage badges (red for difficulty, blue for centrality)

## Limitations

- Search only covers names/aliases, not explanations
- Processing time depends on document length and LLM response time

## Planned enhancements

- Cache entities in Supabase for faster subsequent loads
- User preferences for entity types and display options  
- Fuzzy search and typo tolerance
- Search within entity explanations
- User-specified entity requests ("generate glossary entries for these specific terms")