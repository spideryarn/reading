# Prompt Caching Implementation for Document Processing

## Goal

Enable prompt caching across all document-processing Nunjucks templates (excluding chat) to reduce costs by up to 90% and latency by up to 85% when processing documents with multiple AI operations.

**Specific objectives:**
- Implement consistent prompt structure with common cacheable prefix across all document templates
- Make caching configurable via input parameter to distinguish document-level vs other prompts
- Create reusable template component for the common cached section
- Maintain clean architecture and template reusability

## Context

Spideryarn Reading processes documents through multiple AI operations (summaries, headings, glossary, semantic search) using the same document content repeatedly. Currently, each operation sends the full document without leveraging provider caching capabilities, resulting in unnecessary costs and latency.

## References

- `docs/LLM_MODEL_CONFIGURATION.md` - Multi-provider LLM configuration
- `docs/VERCEL_AI_SDK_REFERENCE.md` - Vercel AI SDK usage patterns
- `docs/LLM_PROMPT_TEMPLATES.md` - Nunjucks + Zod template system
- `lib/services/llm-provider.ts` - Current LLM provider implementation
- `lib/prompts/templates/*.njk` - Existing prompt templates to update
- Provider caching docs:
  - Anthropic: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
  - Google Gemini: https://ai.google.dev/gemini-api/docs/caching

## Principles & Key Decisions

### Prompt Structure Decisions
- **Common prefix approach**: All document-processing prompts will start with identical cached section containing role and document
- **Role-based prompting**: Use Anthropic's recommended pattern of defining Claude's role in system parameter
- **Static-then-dynamic ordering**: Place all static content (role, document) before dynamic instructions
- **Minimum 1024 tokens**: Ensure cached prefix meets Anthropic's minimum requirement

### Architecture Decisions
- **Explicit caching control**: Add `enableCaching` parameter to force conscious decision by callers
- **Shared template component**: Create `document-prefix.njk` for consistency across templates
- **No default value**: Require explicit caching decision to prevent accidental misuse
- **Preserve template flexibility**: Maintain ability to use templates without caching where appropriate

### Cost-Benefit Analysis
- **Document operations**: Glossary + headings + summaries benefit from shared cache
- **Regeneration savings**: Future regenerations get 90% discount on cached content
- **Break-even point**: 2 reads of same cached content covers the 25% write premium

## Actions

### Stage: Investigate document format consistency across templates
- [ ] Examine all document-processing templates to identify document format variations:
  - [ ] Check if some use HTML format
  - [ ] Check if some use plaintext format
  - [ ] Check if some use markdown with element IDs (e.g., semantic search)
  - [ ] Document findings about format inconsistencies
- [ ] If significant variations found, STOP and discuss with user about:
  - Whether to standardize on single format
  - Which format would be most appropriate
  - Migration strategy for templates using different formats
- [ ] Only proceed with implementation after format question is resolved

### Stage: Create common document prefix template
- [ ] Create `lib/prompts/templates/partials/document-prefix.njk` with standardized structure:
  - Role definition for Claude as research assistant
  - Document wrapper with clear delineation
  - Ensure minimum 1024 tokens for Anthropic caching
- [ ] Test token count to verify meets minimum requirements
- [ ] Research and implement best practices for cache-friendly prompt structure

### Stage: Update LLM provider to support caching
- [ ] Modify `lib/services/llm-provider.ts` to accept `enableCaching` parameter
- [ ] Add `experimental_cacheHeaders: true` when caching is enabled
- [ ] Update TypeScript types to include caching parameter
- [ ] Add error handling for caching-related failures
- [ ] Write unit tests for caching functionality
- [ ] Run tests to verify provider changes work correctly
- [ ] Update planning doc with progress
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Update existing prompt templates
- [ ] Update templates to use common prefix (excluding chat):
  - [ ] `glossary.njk` - Extract document and prepend prefix
  - [ ] `headings.njk` - Restructure with document first
  - [ ] `summarise.njk` - Move document before instructions
  - [ ] `semantic-search.njk` - Ensure document comes before query
  - [ ] `pdf-to-html.njk` and variants - Update structure
  - [ ] `tweet-thread.njk` - Apply consistent pattern
  - [ ] `url-to-html.njk` - Update if applicable
- [ ] Verify each template maintains its functionality
- [ ] Check token counts remain appropriate for each use case
- [ ] Run existing tests to ensure no regressions
- [ ] Update planning doc with progress
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Update API routes to specify caching
- [ ] Update all document-processing API routes:
  - [ ] `/api/glossary/route.ts` - Add enableCaching: true
  - [ ] `/api/headings/route.ts` - Add enableCaching: true
  - [ ] `/api/summarise/route.ts` - Add enableCaching: true
  - [ ] `/api/semantic-search/route.ts` - Add enableCaching: true
  - [ ] `/api/tweet-thread/route.ts` - Add enableCaching: true
  - [ ] `/api/upload-pdf/route.ts` - Add enableCaching: true for conversion
- [ ] Ensure chat route explicitly sets enableCaching: false
- [ ] Add TypeScript types for the new parameter
- [ ] Run tests to verify API changes
- [ ] Update planning doc with progress
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Integration testing
- [ ] Test with subagent using Playwright MCP:
  - Upload a document
  - Generate glossary, headings, summary
  - Verify caching headers in network requests
  - Check for performance improvements
- [ ] Monitor Anthropic/Google API dashboards for cache hit rates
- [ ] Verify cost reduction in API usage
- [ ] Test regeneration scenarios to confirm cache benefits
- [ ] Document any issues or unexpected behavior
- [ ] Update planning doc with test results
- [ ] Follow `docs/DEBRIEF_PROGRESS.md` for progress summary
- [ ] Commit changes following `docs/GIT_COMMITS.md`

### Stage: Documentation and cleanup
- [ ] Update `docs/LLM_PROMPT_TEMPLATES.md` with caching guidance
- [ ] Create brief guide in `docs/` for prompt caching patterns
- [ ] Document the common prefix structure and rationale
- [ ] Review all changes for consistency
- [ ] Move this planning doc to `planning/finished/`
- [ ] Final commit

## Appendix

### Prompt Caching Economics

**Anthropic (Claude)**:
- Write cost: 125% of base price
- Read cost: 10% of base price  
- Break-even: 2 reads of same content
- Our use case: 3+ operations per document = significant savings

**Google (Gemini)**:
- Implicit caching: Automatic 75% discount
- Explicit caching: Higher minimums (32K tokens)
- Storage fees apply but offset by usage

### Example Cached Prefix Structure

Based on Anthropic best practices:
```
System: You are a smart, thoughtful, careful expert who assists with reading & research.

<document>
{{ document_content }}
</document>

[Dynamic instructions follow here...]
```

### Template Migration Pattern

Before:
```njk
Instructions...
<document>{{ content }}</document>
More instructions...
```

After:
```njk
{% include "partials/document-prefix.njk" %}

Instructions...
```

### Risk Mitigation

- Caching failures gracefully degrade to full-price calls
- Monitor cache hit rates to ensure effectiveness
- Can disable caching per-route if issues arise
- No changes to user-facing functionality

### Document Format Investigation

This is flagged as an early-stage investigation to determine if templates are using different document formats (HTML, plaintext, markdown with IDs). If inconsistencies are found, we'll need to discuss standardization strategy before proceeding with the caching implementation.