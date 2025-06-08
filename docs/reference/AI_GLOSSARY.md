# Glossary Feature

The glossary feature extracts key entities from documents using LLM analysis and displays them in a dedicated pane to help readers understand important terms and references.

## See also

- `docs/LLM_PROMPT_TEMPLATES.md` - Guide to creating and using LLM prompt templates
- `planning/250526e_glossary_feature.md` - Implementation planning and progress tracking
- `lib/prompts/templates/glossary.ts` - Entity schema and prompt configuration  
- `lib/prompts/templates/glossary.njk` - LLM prompt template for entity extraction
- `/api/glossary/route.ts` - API endpoint for generating glossaries

## Key decisions

- **Display order**: Entities ordered by first occurrence in document (not grouped by type)
- **Loading behaviour**: On-demand via button click (not automatic on page load)
- **Error handling**: Clear error messages with Phosphor icons, no fallback data
- **Explanations**: Display `long_explanation` in glossary pane, reserve `brief_explanation` for future tooltips

## Entity extraction

The system supports multiple LLM providers (Claude and Gemini) for analysing document content and extracting relevant entities. The LLM prompt instructs the model to:

- Identify key terms worth including in a glossary
- Categorise entities by ontology type (person, concept, place, etc.)
- Provide brief and detailed explanations in Markdown format
- Search the web if needed for accurate information
- Return entities ordered by first occurrence in the document

**Multi-Provider Support**: Uses the centralised provider-tier system from `lib/config.ts`. Switch models using the `LLM_MODEL` environment variable (e.g., `google-cheap` for development, `anthropic-balanced` for production). See [docs/LLM_MODELS_REFERENCE.md](LLM_MODELS_REFERENCE.md) for model comparison.

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
  extra?: Record<string, any>
}
```

## UI behaviour

1. **Loading**: Click "Load glossary" button to generate entities
2. **Display**: Entities shown with name, ontology type (grey smallcaps), and long explanation
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

## Current features

✅ **Entity extraction and display**: LLM-powered entity identification with ontology categorisation
✅ **Click navigation**: Click any entity to scroll to its first occurrence in the document
✅ **Search and filtering**: Real-time search through entity names and aliases
✅ **Loading and error states**: Clear UI feedback during processing and on failures

## Limitations

- Requires fresh LLM processing for each document (no caching yet)
- No highlighting of entities within the document
- Processing time depends on document length and LLM response time
- Search only covers names/aliases, not explanations

## Planned enhancements

- Highlight entity mentions in document text with tooltips
- Cache entities in Supabase for faster subsequent loads
- User preferences for entity types and display options
- Fuzzy search and typo tolerance
- Search within entity explanations