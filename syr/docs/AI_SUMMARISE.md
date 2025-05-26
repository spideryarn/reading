# AI Summarise Feature

The AI summarise feature generates hierarchical summaries of document content using LLM analysis, supporting multiple granularity levels and displayed in tooltips and dedicated summary panes.

## See also

- `planning/250526a_ToC_hierarchical_summary_tooltips.md` - Implementation of ToC tooltip summaries with hierarchical content extraction
- `planning/250525b_debugging_summary.md` - Debugging and fixing the content pipeline from HTML to AI summarisation
- `lib/prompts/templates/summarise.ts` - Schema configuration and granularity options for summarisation prompts
- `lib/prompts/templates/summarise.njk` - LLM prompt template for content summarisation
- `/api/summarise/route.ts` - API endpoint for generating summaries with granularity control
- `components/document-summary.tsx` - Summary pane component for document-level summaries
- `components/table-of-contents.tsx` - ToC component with tooltip summarisation integration

## Key decisions

- **Granularity system**: Configurable summary length from "short phrase" (10 tokens) to "page" (800 tokens)
- **Hierarchical content**: ToC tooltips extract content including all sub-headings until next heading of equal/higher level
- **Template architecture**: Nunjucks templates with Zod validation for type-safe prompt generation
- **Loading behaviour**: Tooltips show loading state during LLM processing, document summaries via button click
- **Caching**: Component-level caching prevents repeated API calls for same content
- **Error handling**: Clear error messages with graceful fallback for failed generations

## Summarisation architecture

The system uses Claude Sonnet 4 to generate summaries with configurable granularity levels. The prompt instructs the model to:

- Provide concise, concrete, and understandable summaries
- Adjust length based on specified granularity or content complexity
- Return only the summary without markup or commentary
- Handle content from short phrases to full documents

## Granularity options

```typescript
{
  'short phrase of just a few words': 10,      // tokens
  'short title': 15,
  'short sentence': 25,
  'sentence': 30,
  'sentence or two': 50,
  'few sentences': 100,
  'single short paragraph': 200,
  'couple of paragraphs': 400,
  'page': 800,
}
```

When no granularity is specified, the system uses adaptive length based on content complexity.

## Content pipeline

```
HTML Document → TurndownService → Markdown → API Route → Claude → Summary
```

### Hierarchical extraction for ToC tooltips

For Table of Contents tooltips, the system extracts hierarchical content by:

1. Finding the target heading element in the document structure
2. Collecting all elements until the next heading of equal or higher level
3. Including paragraphs, sub-headings, and nested content
4. Truncating individual elements to 50 characters to prevent massive tooltips

## UI behaviour

### Document-level summaries
1. **Loading**: Click "Generate summary" button in document summary pane
2. **Display**: Full summary with configurable granularity
3. **Error states**: Clear error messages when generation fails

### ToC tooltip summaries
1. **Trigger**: Hover over any heading in Table of Contents
2. **Loading**: Brief delay with loading indicator during LLM processing
3. **Display**: Tooltip with section summary using 'single short paragraph' granularity
4. **Positioning**: Tippy.js handles robust tooltip positioning and behaviour
5. **Caching**: Generated summaries cached in component state

## Template system

The summarisation uses a sophisticated prompt template system:

- **Template files**: `.njk` files for prompt text with variable interpolation
- **Schema validation**: Zod schemas ensure type safety for prompt parameters
- **Token limits**: Granularity-based token limits prevent excessive output
- **Error handling**: Robust validation throughout the prompt pipeline

## Limitations

- Requires fresh LLM processing for each new summary (document-level caching not implemented)
- ToC tooltip summaries limited to 'single short paragraph' granularity
- Processing time depends on content length and LLM response time
- No persistent storage of generated summaries

## Planned enhancements

- Cache summaries in Supabase for faster subsequent loads
- User-configurable granularity preferences for ToC tooltips
- Batch summarisation for multiple sections
- Progressive summarisation for very long documents
- Summary history and versioning

## Troubleshooting

### Common issues

- **Wrong content summarised**: Ensure HTML to Markdown conversion pipeline is intact
- **Template errors**: Check Nunjucks template syntax and Zod schema validation
- **Token limit exceeded**: Verify granularity settings and content length
- **Tooltip positioning**: Check Tippy.js CSS imports and configuration