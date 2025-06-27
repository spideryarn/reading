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

- `docs/reference/LLM_PROMPT_CACHING.md` - Comprehensive guide to prompt caching across all major LLM providers with cost analysis
- `docs/reference/LLM_MODEL_CONFIGURATION.md` - Multi-provider LLM configuration
- `docs/reference/VERCEL_AI_SDK_REFERENCE.md` - Vercel AI SDK usage patterns
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Nunjucks + Zod template system
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
- **Document-level caching**: Single cache per document (not tool-specific) for simplicity and effectiveness
- **Page load cache timing**: Cache document prefix synchronously on page load before tools are available
- **Developer-driven cache annotation**: Tools must be explicitly annotated with cache behavior rather than automatic detection
- **Explicit caching control**: Add `enableCaching` parameter to force conscious decision by callers
- **Shared template component**: Create `document-prefix.njk` for consistency across templates
- **Standardized document format**: All tools use `<document_html>{{ html_content }}</document_html>` wrapper
- **Automatic cache invalidation**: Tools marked with `requiresCacheRefresh: true` automatically trigger cache updates

### Cost-Benefit Analysis
- **Document operations**: Glossary + headings + summaries benefit from shared cache
- **Regeneration savings**: Future regenerations get 90% discount on cached content
- **Break-even point**: 2 reads of same cached content covers the 25% write premium

## Actions

### Stage: Format Standardization Prerequisites

#### Substage: Standardize Variable Wrapper Tags
- [ ] Update all document-processing templates to use consistent wrapper tag `<document_html>{{ html_content }}</document_html>`:
  - [ ] `glossary.njk` - Change from `<document>{{ content }}</document>` to `<document_html>{{ html_content }}</document_html>`
  - [ ] `summarise.njk` - Change from `<text>{{ content }}</text>` to `<document_html>{{ html_content }}</document_html>`
  - [ ] `multi-summarise.njk` - Change from `<document>{{ content }}</document>` to `<document_html>{{ html_content }}</document_html>`
  - [ ] `reading-difficulty.njk` - Change from `<document>{{ content }}</document>` to `<document_html>{{ html_content }}</document_html>`
  - [ ] `chat.njk` - Change from `<document_context>{{ documentContext }}</document_context>` to `<document_html>{{ html_content }}</document_html>`
  - [ ] `headings.njk` - Already uses `<html_content>{{ html_content }}</html_content>`, change to `<document_html>{{ html_content }}</document_html>`
- [ ] Update corresponding API route handlers to pass `html_content` parameter consistently instead of mixed `content`/`documentContext` names
- [ ] Test each template to ensure functionality is preserved with new wrapper tags
- [ ] Run existing tests to verify no regressions

#### Substage: Investigate Semantic Search HTML Format Compatibility
- [ ] Examine current semantic search implementation:
  - [ ] Review `formatDocumentForSemanticSearch()` function in detail
  - [ ] Understand why annotated format `[elem_id] text` was chosen over standard HTML
  - [ ] Test semantic search accuracy with element IDs embedded in HTML vs annotated format
- [ ] Research alternative approaches:
  - [ ] Can semantic search work with HTML element IDs preserved in standard format?
  - [ ] Would using CSS selectors or XPath be more effective than current annotation?
  - [ ] Test search relevance and accuracy with standard HTML format
- [ ] Document findings and recommendation:
  - [ ] If standard HTML works well, plan migration to `<document_html>{{ html_content }}</document_html>`
  - [ ] If annotated format is significantly better, keep semantic search separate from caching
  - [ ] Consider hybrid approach where search can use either format

#### Substage: Adapt Structure/Headings Tool to Standard HTML
- [ ] Remove `removeExistingHeadings()` preprocessing from structure handler
- [ ] Update `headings.njk` template to work with HTML that includes existing headings:
  - [ ] Modify prompt to instruct Claude to "review existing headings and improve/replace them as needed"
  - [ ] Add instruction to "remove headings that aren't useful and add missing ones"
  - [ ] Test that Claude can effectively handle documents with existing heading structure
- [ ] Update structure tool workflow:
  - [ ] Ensure it uses standard `html_content` parameter like other tools
  - [ ] Verify it uses `<document_html>{{ html_content }}</document_html>` wrapper
- [ ] Test structure generation with various document types to ensure quality is maintained
- [ ] Update tests for new prompt approach

### Stage: Investigate document format consistency across templates
- [x] ✅ **COMPLETED** - Examination revealed significant format inconsistencies:
  - [x] **Found**: Mixed wrapper tags (`<document>`, `<text>`, `<html_content>`, `<content>`, `<document_context>`)
  - [x] **Found**: Variable parameter names (`content`, `html_content`, `documentContext`)
  - [x] **Found**: Semantic search uses unique annotated format `[elem_id] text`
  - [x] **Found**: Structure tool strips existing headings via `removeExistingHeadings()`
  - [x] **Decision**: Standardize on `<document_html>{{ html_content }}</document_html>` format
  - [x] **Decision**: Address inconsistencies through Format Standardization Prerequisites stages above

### Stage: Create common document prefix template
- [ ] Create `lib/prompts/templates/partials/document-prefix.njk` with standardized structure:
  - Role definition for Claude as research assistant
  - Document wrapper: `<document_html>{{ html_content }}</document_html>`
  - Ensure minimum 1024 tokens for Anthropic caching
- [ ] Test token count to verify meets minimum requirements
- [ ] Research and implement best practices for cache-friendly prompt structure

### Stage: Document-Level Cache Management System

#### Substage: Implement Page Load Caching
- [ ] Add document-level cache creation on page load:
  - [ ] Implement `cacheDocumentPrefix()` function in document viewer
  - [ ] Cache creation happens synchronously as part of page load before tools are available
  - [ ] Use document-level caching approach (not tool-specific)
  - [ ] Cache key: `document-{id}-prefix` for simple management
- [ ] Create cache management utilities:
  - [ ] `lib/services/document-cache.ts` - Document prefix cache operations
  - [ ] `createDocumentCache(documentId, htmlContent)` - Initial cache creation
  - [ ] `refreshDocumentCache(documentId, htmlContent)` - Cache invalidation/refresh
  - [ ] `getDocumentCache(documentId)` - Cache retrieval for tool operations

#### Substage: Tool Cache Configuration System
- [ ] Extend tool registry to support cache metadata:
  - [ ] Update `lib/tools/types.ts` to include `cacheConfig` interface
  - [ ] Add `mutatesDocument: boolean` flag for tools that modify document content
  - [ ] Add `requiresCacheRefresh: boolean` flag for tools that should trigger cache reload
- [ ] Annotate existing tools in tool registry:
  - [ ] Structure tool: `mutatesDocument: true, requiresCacheRefresh: true`
  - [ ] All other tools: `mutatesDocument: false, requiresCacheRefresh: false`
- [ ] Document cache configuration guidance:
  - [ ] Update tool documentation with cache configuration patterns
  - [ ] Add action to update `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md` with cache annotation guidance

#### Substage: Update LLM provider to support caching
- [ ] Modify `lib/services/llm-provider.ts` to accept `enableCaching` parameter
- [ ] Add Anthropic cache control headers when caching is enabled
- [ ] Update TypeScript types to include caching parameter
- [ ] Add error handling for caching-related failures
- [ ] Write unit tests for caching functionality
- [ ] Run tests to verify provider changes work correctly

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

### Stage: Automatic Cache Management Integration
- [ ] Integrate cache management with tool execution:
  - [ ] Update tool executor to check for cache configuration
  - [ ] After successful tool execution, check if `requiresCacheRefresh: true`
  - [ ] If tool mutates document, call `refreshDocumentCache()` automatically
  - [ ] Add cache refresh to structure tool apply operation
- [ ] Update tool execution flow:
  - [ ] Ensure all document-processing tools use cached prefix when `enableCaching: true`
  - [ ] Add cache hit/miss logging for monitoring effectiveness
  - [ ] Handle cache failures gracefully (fall back to full prompt)

### Stage: Integration testing
- [ ] Test with subagent using Playwright MCP:
  - Upload a document
  - Verify initial cache creation on page load
  - Generate glossary, headings, summary
  - Verify cache refresh after headings tool modifies document
  - Check for performance improvements and cost reduction
- [ ] Monitor Anthropic API dashboards for cache hit rates
- [ ] Test cache invalidation workflow:
  - Apply AI headings to document
  - Verify cache is refreshed with new document content
  - Confirm subsequent operations use updated cache
- [ ] Document any issues or unexpected behavior

### Stage: Documentation and cleanup
- [ ] Update tool documentation with cache configuration guidance:
  - [ ] Update `docs/reference/TOOL_TEMPLATE_FOR_CREATING_NEW.md` with cache annotation guidance
  - [ ] Add section on `cacheConfig` interface with `mutatesDocument` and `requiresCacheRefresh` flags
  - [ ] Provide examples of when to use each cache configuration
  - [ ] Document developer responsibility for cache annotation decisions
- [ ] Update `docs/reference/LLM_PROMPT_TEMPLATES.md` with caching guidance
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