# URL-Based Document Addition

## Goal, context

Implement URL-based document addition to Spideryarn Reading, enabling users to import web content (articles, academic papers, etc.) by pasting URLs. This extends the current PDF upload functionality to support web-based content.

Current state: The application has a `/upload` page for PDF conversion using Claude/Gemini APIs with drag-and-drop interface. The converted HTML is displayed to users but not automatically saved to the database.

Desired behaviour: Transform the upload page into a unified "Add Document" interface where users can choose between "Paste URL" and "Upload PDF" options. For URLs, the system should use Claude/Gemini LLMs to directly fetch and process the webpage content in a single API call, then save the extracted content as a new document in the database.

## References

- `docs/WEBPAGE_CONTENT_EXTRACTION.md` - Comprehensive guide for webpage extraction approaches and academic publisher handling
- `planning/later/250530h_pdf_to_html_conversion_implementation.md` - Current PDF processing implementation for architectural patterns
- `docs/LLM_PROMPT_TEMPLATES.md` - Nunjucks + Zod template system for LLM calls
- `lib/services/database/documents.ts` - Document service layer with CRUD operations
- `app/upload/page.tsx` - Current PDF upload interface to be extended
- `app/api/upload-pdf/route.ts` - Current API route pattern to follow
- `docs/DATABASE_SCHEMA.md` - Document table structure including `source_url` field
- `docs/CODING_PRINCIPLES.md` - Development principles prioritising simplicity and rapid prototyping

## Principles, key decisions

Based on user requirements and research findings:

- **Fetch-then-LLM Approach**: Since LLMs cannot fetch URLs directly, use traditional fetch + LLM processing approach
- **Simple Fetching**: Use Node.js built-in `fetch()` with basic anti-bot headers, no preprocessing of HTML
- **Size Limits**: 500KB HTML size limit (defined in `lib/config.ts`) with immediate clear error if exceeded
- **Hard Error for JavaScript**: If page requires JavaScript rendering, LLM should return hard error with clear message
- **Full Document Creation**: Follow updated PDF pattern - auto-save to database and return document details for navigation
- **Unified Interface**: Rename/extend `/upload` to support both URL pasting and PDF upload in one page
- **Template Integration**: Use existing Nunjucks + Zod prompt template system, reuse as much PDF machinery as possible
- **Default Provider**: Use Claude as default (consistent with PDF approach), later stage for user selection

## Actions

### Stage: Configuration and Foundation ✅
- [x] Research LLM URL fetching capabilities 
  - [x] Test Claude URL fetching - confirmed: cannot fetch URLs directly
  - [x] Test Gemini URL fetching - confirmed: cannot fetch URLs directly
  - [x] Document findings: must use fetch-then-LLM approach

### Stage: Configuration Setup ✅
- [x] Add URL extraction configuration to `lib/config.ts`
  - [x] Add `URL_EXTRACTION_CONFIG` with 500KB size limit, 10s timeout, user agent
  - [x] Define clear error messages for size limits and validation failures
  - [x] Ensure configuration follows existing patterns

### Stage: API Foundation ✅
- [x] Create URL extraction API route
  - [x] Create `/app/api/extract-url/route.ts` following updated PDF pattern from `app/api/upload-pdf/route.ts`
  - [x] Implement URL validation (HTTP/HTTPS format, basic safety checks)
  - [x] Add HTML fetching with built-in `fetch()` and anti-bot headers
  - [x] Add size validation (500KB limit) with immediate clear error
  - [x] Follow document creation pattern: auto-save to database and return document details
- [x] Create URL extraction prompt template
  - [x] Create `lib/prompts/templates/url-to-html.njk` and corresponding TypeScript file
  - [x] Follow pattern from `pdf-to-html-direct.njk` for consistency
  - [x] Include instructions for main content extraction, removing ads/navigation
  - [x] Add hard error instruction for JavaScript-required pages
  - [x] Use Claude as default provider (anthropic-balanced model)

### Stage: Frontend Integration
- [ ] Transform upload page into unified "Add Document" interface
  - [ ] Update page title from "PDF to HTML Converter" to "Add Document"
  - [ ] Add tabbed interface or section toggle for "Paste URL" vs "Upload PDF"
  - [ ] Create URL input form with validation
  - [ ] Maintain existing PDF upload drag-and-drop functionality
  - [ ] Follow same provider selection pattern (Claude default, later stage for user choice)
- [ ] Implement URL submission flow
  - [ ] Add URL input field with client-side validation
  - [ ] Create loading state during extraction (similar to PDF processing)
  - [ ] Handle success: redirect to document page using returned slug
  - [ ] Handle errors: display full error message (size limits, JavaScript required, etc.)
  - [ ] Follow same response pattern as updated PDF flow

### Stage: Testing and Validation
- [ ] Write automated tests for URL extraction
  - [ ] Create Jest tests for `/api/extract-url` route following PDF test patterns
  - [ ] Mock `fetch()` calls and LLM responses
  - [ ] Test error scenarios (invalid URLs, size limits, JavaScript detection)
  - [ ] Test successful extraction and document creation flow
- [ ] Manual testing with real content
  - [ ] Test with news articles, blog posts, simple web content
  - [ ] Verify content quality and structure preservation
  - [ ] Test error cases (large pages, JavaScript-heavy sites)
  - [ ] Use subagent for end-to-end Playwright testing

### Stage: Enhanced Response Format (Future Enhancement)
- [ ] Research and implement JSON + delimiter + HTML response format
  - [ ] Design structured response: `{"status": "success", "metadata": {...}}\n----\n<html>...`
  - [ ] Update prompt template to return metadata (title, author, site_name, extraction_quality)
  - [ ] Modify API route to parse structured response
  - [ ] Add error case handling: `{"status": "error", "message": "..."}\n----\n`
  - [ ] Update frontend to handle richer metadata display
  - [ ] Store additional metadata in document JSON field

### Stage: Polish and Documentation
- [ ] Error handling improvements
  - [ ] Create comprehensive error messages for common failure scenarios
  - [ ] Add user guidance for paywall/subscription content
  - [ ] Consider retry mechanisms for transient failures
- [ ] UI/UX refinements
  - [ ] Ensure consistent styling with existing upload interface
  - [ ] Add helpful placeholder text and URL validation feedback
  - [ ] Consider URL preview functionality
- [ ] Update documentation
  - [ ] Update `docs/ARCHITECTURE.md` with URL extraction flow
  - [ ] Update `docs/WEBPAGE_CONTENT_EXTRACTION.md` with implementation details
  - [ ] Document new configuration options and API endpoints
- [ ] Use subagent for Git commits following `docs/GIT_COMMITS.md`

### Stage: Future Enhancements (Later)
- [ ] Provider selection UI (allow user to choose Claude vs Gemini)
- [ ] Browser automation fallback (Playwright for JavaScript-heavy sites)
- [ ] Third-party service integration (ScrapingBee, BrowserBase)
- [ ] Academic publisher-specific optimizations
- [ ] Batch URL processing
- [ ] URL preview and validation before processing

### Stage: Final Integration and User Review
- [ ] Integration testing across the system
  - [ ] Verify URL-sourced documents work with AI features (summaries, glossary, etc.)
  - [ ] Test search functionality includes URL-sourced content
  - [ ] Confirm document appears correctly in `/documents` list
- [ ] User experience review with user
  - [ ] Review complete unified add document flow
  - [ ] Gather feedback on interface, error messaging, and functionality
  - [ ] Make final refinements based on user input
- [ ] Update planning doc with final progress and outcomes
- [ ] Move planning doc to `planning/finished/` and commit

## Appendix

### Metadata Structure for JSON Field

Proposed optional fields for document metadata JSON:
```json
{
  "extraction_method": "claude-sonnet-4" | "gemini-1.5-pro",
  "extraction_timestamp": "2025-06-06T10:30:00Z",
  "site_name": "Example News Site",
  "author": "John Doe",
  "publish_date": "2025-06-01",
  "content_type": "article" | "blog" | "academic" | "news",
  "word_count_estimated": 1500,
  "extraction_quality": "high" | "medium" | "low",
  "original_title": "Original Page Title",
  "meta_description": "Page meta description if available"
}
```

### Research Findings Summary

**LLM URL Fetching Capabilities (December 2025)**:
- ✅ **Research Completed**: Both Claude and Gemini explicitly confirmed they cannot fetch URLs directly
- ❌ **Claude**: "I cannot fetch URLs directly. I am not able to actively retrieve content from the internet"
- ❌ **Gemini**: "I cannot fetch URLs directly. I am a large language model, and I do not have the capability to browse the internet"
- **Conclusion**: Must use traditional fetch-then-LLM approach as originally discussed

### Configuration Decisions

**URL Extraction Configuration** (to be added to `lib/config.ts`):
```typescript
export const URL_EXTRACTION_CONFIG = {
  MAX_HTML_SIZE_BYTES: 500 * 1024, // 500KB limit (safe for both Claude/Gemini token limits)
  FETCH_TIMEOUT_MS: 10000, // 10 second timeout
  DEFAULT_USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  ERROR_MESSAGES: {
    SIZE_LIMIT: 'Webpage content too large (max 500KB). Try a more specific URL or consider PDF upload for lengthy documents.',
    JAVASCRIPT_REQUIRED: 'This webpage requires JavaScript for content rendering and cannot be processed.',
    INVALID_URL: 'Please enter a valid HTTP or HTTPS URL.',
    FETCH_FAILED: 'Unable to fetch webpage content. The site may be blocking automated access.'
  }
} as const
```

### Updated PDF Flow for Reference

**Current PDF processing** (post-integration update):
1. User uploads PDF via drag-and-drop interface
2. File sent to `/api/upload-pdf` with provider selection (Claude/Gemini)
3. PDF processed by LLM directly using multimodal prompts
4. HTML content extracted and document auto-created in database
5. User redirected to document page with slug

**Target URL flow** (following same pattern):
1. User pastes URL in unified interface
2. URL sent to `/api/extract-url` with Claude as default provider
3. Server fetches HTML with `fetch()`, validates size limits
4. Raw HTML sent to LLM for content extraction and cleaning
5. Clean HTML auto-saved as document in database
6. User redirected to document page with slug

### JSON + Delimiter Response Format (Future Enhancement)

**Concept**: Instead of plain HTML response, have LLM return structured format:
```
{"status": "success", "metadata": {"title": "Article Title", "author": "John Doe", "site_name": "Example.com", "extraction_quality": "high"}}
----
<html>
  <h1>Article Title</h1>
  <p>Clean extracted content...</p>
</html>
```

**Error case**:
```
{"status": "error", "message": "This webpage requires JavaScript for content rendering", "error_type": "javascript_required"}
----

```

**Benefits**:
- Rich metadata extraction (title, author, publish date, confidence scores)
- Consistent error handling
- Structured response parsing
- Better database metadata storage

**Complexity Trade-offs**:
- LLM format compliance challenges
- More complex parsing logic
- Breaks consistency with current PDF flow
- Additional error handling for malformed responses

**Decision**: Implement as later stage enhancement after basic flow is working

### Technical Implementation Notes

**Reusing PDF Machinery**:
- Same `executeMultimodalPrompt()` function (text-only instead of PDF buffer)
- Same document creation pattern with `DocumentService.createWithStorage()`
- Same slug generation and database storage approach
- Same error handling patterns and response structure
- Same provider configuration and model selection logic

**Key Differences from PDF Flow**:
- Fetch HTML content before LLM processing
- No file upload handling (URL string input instead)
- Size validation on fetched content rather than uploaded file
- No original file storage (though could store original HTML for debugging)

### Error Scenarios and Handling

**Common Failure Cases**:
1. **Invalid URLs**: Immediate validation error with clear message
2. **Size Limits**: Hard error when HTML exceeds 500KB limit
3. **JavaScript Required**: LLM detects and returns hard error
4. **Network Failures**: Fetch timeout or connection issues
5. **Paywalls**: LLM extracts limited content, may detect paywall patterns
6. **Bot Detection**: Site blocks fetch request with 403/captcha

**Error Response Strategy**: Clear, immediate failure messages with specific guidance rather than fallbacks or partial success handling.