# AI Headings Feature

The AI headings feature generates relevant headings for document sections using LLM analysis, displayed in the Table of Contents with visual indicators and tooltip summaries.

## See also

- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Guide to creating and using LLM prompt templates
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Documents the reversible document transformation system
- `planning/250526g_ai_generated_headings.md` - Implementation planning for AI-generated headings
- `lib/prompts/templates/headings.ts` - Schema and prompt configuration for heading generation
- `lib/prompts/templates/headings.njk` - LLM prompt template for heading generation
- `/api/headings/route.ts` - API endpoint for generating document headings
- `components/table-of-contents-tabs.tsx` - ToC tab components with AI headings integration
- `components/unified-left-pane.tsx` - Main left pane that includes AI headings tab

## Key decisions

- **Reversible mutations**: AI headings implemented as reversible document transformations
- **Visual indicators**: AI-generated headings marked with distinct styling in ToC
- **Loading behaviour**: On-demand via "Generate headings" button (not automatic)
- **Content structure**: Generates headings for sections that lack them, maintains document hierarchy
- **Template architecture**: Nunjucks templates with Zod validation for type-safe prompt generation

## Heading generation architecture

The system supports multiple LLM providers (Claude and Gemini) for analysing document content and generating relevant headings. The LLM prompt instructs the model to:

- Analyse content sections that lack appropriate headings
- Generate meaningful, descriptive headings that reflect content
- Maintain consistent heading hierarchy and style
- Ensure headings are concise but informative
- Return headings in structured format for document insertion

**Multi-Provider Support**: Uses the centralised provider-tier system from `lib/config.ts`. Switch models using the `LLM_MODEL` environment variable (e.g., `google-cheap` for development, `anthropic-balanced` for production). See [docs/reference/LLM_MODEL_CONFIGURATION.md](LLM_MODEL_CONFIGURATION.md) for model comparison.

## Content pipeline

```
HTML Document → Content Analysis → Missing Headings Detection → LLM Prompt → Generated Headings → Document Mutation
```

### Document mutation system

AI headings are implemented as reversible mutations:

1. **Analysis**: Identify content sections lacking appropriate headings
2. **Generation**: Use LLM to create relevant headings based on content analysis
3. **Insertion**: Apply heading mutations to document structure
4. **Reversibility**: Allow users to undo/redo heading changes
5. **Visual markers**: Mark AI-generated headings in Table of Contents

## UI behaviour

### Heading generation
1. **Trigger**: Click "Generate headings" button in Tools pane
2. **Loading**: Progress indicator during LLM processing and document mutation
3. **Display**: New headings appear in Table of Contents with AI indicators
4. **Error states**: Clear error messages when generation fails

### ToC integration
1. **Visual indicators**: AI-generated headings shown with distinct styling
2. **Tooltip summaries**: AI headings support same tooltip summary system as regular headings
3. **Navigation**: Click to scroll to heading location in document
4. **Mutation controls**: Undo/redo buttons to reverse heading changes

## Template system

The heading generation uses the standard prompt template system:

- **Template files**: `.njk` files for prompt text with variable interpolation
- **Schema validation**: Zod schemas ensure type safety for prompt parameters
- **Content analysis**: Sophisticated prompts for understanding document structure
- **Error handling**: Robust validation throughout the prompt pipeline

## Heading schema

```typescript
{
  content: string,           // Document content to analyse
  context?: string,          // Additional context about document
  style?: string,           // Heading style preferences
  max_headings?: number     // Maximum number of headings to generate
}
```

## Limitations

- Requires fresh LLM processing for each document (no caching implemented)
- Generated headings may need manual refinement for optimal quality
- Processing time depends on document length and complexity
- No persistent storage of heading preferences or history

## Planned enhancements

- Cache generated headings in Supabase for faster subsequent loads
- User preferences for heading style and frequency
- Batch heading generation for multiple documents
- Smart heading suggestion based on document type
- Integration with document editing capabilities
- Heading quality scoring and improvement suggestions

## Troubleshooting

### Common issues

- **Poor heading quality**: Try different provider-tier models for better results
- **Template errors**: Check Nunjucks template syntax and Zod schema validation
- **Mutation failures**: Verify document structure integrity and mutation system
- **ToC display issues**: Check component state and AI heading indicators