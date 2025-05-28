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

The system uses Claude Sonnet 4 to analyse document content and extract relevant entities. The LLM prompt instructs the model to:

- Identify key terms worth including in a glossary
- Categorise entities by ontology type (person, concept, place, etc.)
- Provide brief and detailed explanations in Markdown format
- Search the web if needed for accurate information
- Return entities ordered by first occurrence in the document

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
3. **Error states**: Clear error messages with warning icons when generation fails
4. **Loading states**: Spinning icon during LLM processing

## Limitations

- Requires fresh LLM processing for each document (no caching yet)
- No navigation to entity occurrences in document text
- No highlighting of entities within the document
- Processing time depends on document length and LLM response time

## Planned enhancements

- Click entity to scroll to first occurrence in document
- Highlight entity mentions in document text with tooltips
- Cache entities in Supabase for faster subsequent loads
- Filter and search within glossary
- User preferences for entity types and display options