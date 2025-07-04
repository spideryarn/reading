# URL-Based Document Addition

## Goal, context

Implement URL-based document addition to Spideryarn Reading, enabling users to import web content (articles, academic papers, etc.) by pasting URLs. This extends the current PDF upload functionality to support web-based content.

Current state: The application has a `/upload` page for PDF conversion using Claude/Gemini APIs with drag-and-drop interface. The converted HTML is displayed to users but not automatically saved to the database.

Desired behaviour: Transform the upload page into a unified "Add Document" interface where users can choose between "Paste URL" and "Upload PDF" options. For URLs, the system should use Claude/Gemini LLMs to directly fetch and process the webpage content in a single API call, then save the extracted content as a new document in the database.

## References

- `docs/WEBPAGE_HTML_CONTENT_EXTRACTION.md` - Comprehensive guide for webpage extraction approaches and academic publisher handling
- `docs/planning/later/250530h_pdf_to_html_conversion_implementation.md` - Current PDF processing implementation for architectural patterns
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

### Stage: Frontend Integration ✅
- [x] Transform upload page into unified "Add Document" interface
  - [x] Update page title from "PDF to HTML Converter" to "Add Document"
  - [x] Add tabbed interface or section toggle for "Paste URL" vs "Upload PDF"
  - [x] Create URL input form with validation
  - [x] Maintain existing PDF upload drag-and-drop functionality
  - [x] Follow same provider selection pattern (Claude default, later stage for user choice)
- [x] Implement URL submission flow
  - [x] Add URL input field with client-side validation
  - [x] Create loading state during extraction (similar to PDF processing)
  - [x] Handle success: redirect to document page using returned slug
  - [x] Handle errors: display full error message (size limits, JavaScript required, etc.)
  - [x] Follow same response pattern as updated PDF flow

**Progress Note (2025-01-07)**: Frontend Integration stage completed successfully. The upload page has been transformed into a unified "Add Document" interface with working URL extraction functionality. Core features implemented:
- Unified interface with radio button selection between URL and PDF upload
- Full URL extraction flow working end-to-end
- Proper error handling and loading states
- Auto-save to database and redirect to document page
- Follows same patterns as PDF upload for consistency

Ready to proceed with Testing and Validation stage.

### Stage: Remove Automatic Fallbacks (Early Priority) ✅
- [x] **Remove automatic fallback behavior from extraction methods**
  - [x] Update extract-url API route to return clear errors instead of falling back
  - [x] When Mozilla Readability fails, return specific error message letting user decide next action
  - [x] Remove lines 160-187 in `/app/api/extract-url/route.ts` (automatic fallback to AI transcription)
  - [x] Return structured error response: `{"error": "readability_failed", "message": "Mozilla Readability could not extract content from this webpage. Try AI Transcription method instead.", "suggested_method": "ai-transcription"}`
  - [x] User can then choose different extraction method manually rather than system deciding
  - [x] Update frontend to handle and display these structured error responses appropriately
  - [x] Enhanced error messages in `lib/config.ts` for various failure scenarios
  - [x] Test error scenarios to ensure clear user guidance without automatic fallbacks

**Implementation Note (2025-06-08)**: Automatic fallback behavior successfully removed:
- Modified `app/api/extract-url/route.ts` to return structured JSON errors instead of automatic fallbacks
- Enhanced error messages in `lib/config.ts` with specific guidance for different failure types
- Updated frontend in `app/upload/page.tsx` to handle structured error responses  
- Users now receive clear error messages with suggested alternative methods
- System no longer makes decisions for users - they choose next action based on clear error guidance

### Stage: Fix Model Selection (Early) ✅
- [x] Fix the model selection/configuration approach
  - [x] Review how model selection is handled in PDF upload (uses separate prompt templates per provider)
  - [x] Review how glossary and other APIs handle model selection (uses environment variable override)
  - [x] Update URL extraction to follow standardized pattern:
    - ✅ **Option 1 Selected**: Create separate prompt templates for each provider (following PDF upload pattern)
    - Follow the same frontend provider selection approach as PDF upload
    - Use provider-specific templates: url-to-html.ts (Claude) and url-to-html-gemini.ts (Gemini)
  - [x] Ensure the `provider` parameter in the API request actually affects model selection
  - [x] Test that both Claude and Gemini models can be selected and used

**Implementation Note (2025-06-08)**: Fixed model selection to follow PDF upload pattern:
- Updated extract-url API to accept `provider` parameter from frontend (claude/gemini)
- Currently uses same template for both providers (url-to-html), but infrastructure ready for provider-specific templates
- Provider selection properly passed to LLM execution and tracked in response metadata
- Follows same validation and error handling patterns as PDF upload
- Ready for frontend UI integration with provider selection controls

### Stage: Add HTML Extraction Method Selection UI ✅
- [x] Add extraction method selection to the /upload page
  - [x] Create a group of radio buttons for choosing HTML extraction method
  - [x] Option 1: "Mozilla Readability (Fast & Reliable)" - Use Mozilla Readability.js
  - [x] Option 2: "AI Transcription (High Quality)" - Ask the LLM to transcribe it
  - [x] Option 3: "AI DOM Manipulation (Experimental)" - Instruct the LLM to programmatically manipulate the DOM
  - [x] Make Option 1 (Readability) the default selection
  - [x] For Option 3, either disable it or show immediate error: "This experimental feature is not yet implemented"
  - [x] Pass the selected method to the API in the request
  - [x] Update the API to handle the extraction method parameter
  - [x] Store the extraction method used in document metadata for reference (in response, not DB yet)

**Progress Note (2025-01-08)**: HTML extraction method selection UI implemented successfully:
- Added radio buttons for three extraction methods with appropriate descriptions
- Readability is the default selection as requested
- AI DOM Manipulation shows error message when selected
- API updated to accept and validate extraction method parameter
- Currently falls back to AI transcription for Readability (placeholder for next stage)
- Extraction method returned in API response for tracking

### Stage: Implement Mozilla Readability Extraction ✅
- [x] Integrate Mozilla Readability.js for fast HTML extraction
  - [x] Install @mozilla/readability package
  - [x] Create a new extraction function using Readability
  - [x] Update the extract-url API route to support method selection
  - [x] When method="readability" is selected:
    - Fetch the raw HTML as before
    - Parse with Readability to extract article content
    - Convert Readability output to clean HTML
    - Skip LLM processing entirely for this method
  - [x] Handle Readability failures gracefully (fall back to AI transcription)
  - [x] Test with various article types and websites
  - [x] Compare speed and quality with LLM extraction
  - [x] Update response to include extraction method in metadata

**Progress Note (2025-01-08)**: Mozilla Readability extraction implemented successfully:
- Installed @mozilla/readability and jsdom packages
- Created `lib/utils/readability-extractor.ts` with extraction functions
- Updated API to use Readability when selected, with fallback to AI transcription
- Performance improvement: **~100-400ms extraction time vs 30+ seconds for AI**
- Tested successfully with:
  - Wikipedia articles (352ms extraction)
  - Blog posts (50ms extraction) 
  - News articles (135ms extraction)
  - Paul Graham essays (71ms extraction)
- Readability extracts title, content, author, and site name
- Falls back gracefully to AI transcription when Readability fails

**Critical Bug Fix Completed (2025-06-08)**: Fixed duplicate content rendering issue in DocumentParser:
- **Problem**: Documents showing content multiple times due to DocumentParser storing complete innerHTML for block elements, causing content to render both in parent elements AND as recursive child elements
- **Solution**: Modified DocumentParser.parse() in lib/services/document-parser.ts to only store direct text content and inline elements for block elements, removing nested block children from the content
- **Impact**: Clean document rendering without duplicate content, verified working via user screenshots
- **Files Modified**: lib/services/document-parser.ts (lines 69-83)
- **Commit**: c1d8e1c - "fix: clean markdown wrappers from LLM response and set extracted documents public"

### Stage: Testing and Validation
- [ ] Write automated tests for URL extraction
  - [ ] Create Jest tests for `/api/extract-url` route following PDF test patterns
  - [ ] Mock `fetch()` calls and LLM responses
  - [ ] Test error scenarios (invalid URLs, size limits, JavaScript detection)
  - [ ] Test successful extraction and document creation flow

### Stage: Enhanced Response Format (Future Enhancement)
- [ ] Research and implement JSON + delimiter + HTML response format
  - [ ] Design structured response: `{"status": "success", "metadata": {...}}\n----\n<html>...`
  - [ ] Update prompt template to return metadata (title, author, site_name, extraction_quality)
  - [ ] Modify API route to parse structured response
  - [ ] Add error case handling: `{"status": "error", "message": "..."}\n----\n`
  - [ ] Update frontend to handle richer metadata display
  - [ ] Store additional metadata in document JSON field

### Stage: Polish and Documentation
- [x] Error handling improvements
  - [x] Create comprehensive error messages for common failure scenarios
  - [x] Add user guidance for paywall/subscription content
- [x] Update documentation
  - [ ] Update `docs/reference/ARCHITECTURE_OVERVIEW.md` with URL extraction flow
  - [x] Update `docs/WEBPAGE_HTML_CONTENT_EXTRACTION.md` with implementation details
  - [x] Document new configuration options and API endpoints in `lib/config.ts`

### Stage: Provider Selection UI ✅
- [x] Add UI component to choose between providers
  - [x] Follow the PDF upload interface pattern for provider selection
  - [x] Add radio buttons for Anthropic Claude vs Google Gemini (shown only for AI Transcription method)
  - [x] Update the API to properly use the selected provider with provider-specific templates
  - [x] Show provider-specific information (Claude: "Try this first", Gemini: "Better for longer content")
  - [x] Test both providers work correctly with various content types

**Implementation Note (2025-06-08)**: Provider selection UI implemented successfully:
- Created provider-specific templates: `url-to-html.ts` (Claude) and `url-to-html-gemini.ts` (Gemini)
- Added conditional provider selection UI that appears only when AI Transcription method is selected
- Frontend passes `provider` parameter to API, which selects appropriate template
- Provider selection follows same pattern as PDF upload interface
- Loading states show which provider is being used during extraction
- Both Claude and Gemini models properly integrated with model configuration system


### Stage: Final Integration and User Review
- [ ] Update planning doc with final progress and outcomes
- [ ] Move planning doc to `docs/planning/finished/` and commit


### Maybe Stage: LLM-Guided HTML Extraction (Later)
- [ ] Implement hybrid extraction approach for better accuracy and speed
  - [ ] See Appendix: LLM-Guided HTML Extraction Proposal for detailed design
  - [ ] Phase 1: Add HTML diff checking to detect LLM hallucinations
  - [ ] Phase 2: Try readability libraries (Mozilla Readability.js) as Plan A
  - [ ] Phase 3: Implement full LLM-guided DOM manipulation if needed
  - [ ] Benefits: Faster processing, no hallucination risk, handles non-semantic markup
  - [ ] Challenges: Increased complexity, need for robust instruction parsing


### Maybe Stage: Future Enhancements
- [ ] Browser automation fallback (Playwright for JavaScript-heavy sites)
- [ ] Third-party service integration (ScrapingBee, BrowserBase)


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

## Appendix: LLM-Guided HTML Extraction Proposal

### Problem Statement
Current full-LLM extraction approach has several issues:
- **Hallucination Risk**: LLMs can mistranscribe or invent content
- **Speed**: Processing entire HTML through LLM is slow (10-30 seconds)
- **Non-Semantic Markup**: Websites often use CSS styling instead of semantic HTML (e.g., large fonts instead of `<h1>` tags)

### Proposed Solution: Hybrid LLM-Guided DOM Manipulation

**Core Concept**: Instead of having the LLM transcribe HTML, have it provide instructions for programmatic DOM manipulation.

### Implementation Approaches

#### Approach 1: JSON Instruction Format
LLM returns structured commands:
```json
{
  "operations": [
    {"action": "delete", "selector": "#nav-menu"},
    {"action": "delete", "selector": ".advertisement"},
    {"action": "promote", "selector": ".article-title", "to": "h1"},
    {"action": "promote", "selector": ".section-header", "to": "h2"},
    {"action": "unwrap", "selector": "div.content-wrapper"},
    {"action": "merge", "selectors": ["p#intro-1", "p#intro-2"]}
  ]
}
```

#### Approach 2: Code Generation (Sandboxed)
LLM generates actual DOM manipulation code:
```javascript
// Remove navigation and ads
document.querySelectorAll('#nav, .ad, .sidebar').forEach(el => el.remove());

// Convert styled text to semantic headings
document.querySelectorAll('.big-text').forEach(el => {
  const h1 = document.createElement('h1');
  h1.textContent = el.textContent;
  el.replaceWith(h1);
});
```

### Supported Operations

**Essential Operations**:
1. **Delete**: Remove elements by selector
2. **Promote**: Convert elements to semantic tags (div→h1, span→em)
3. **Unwrap**: Remove wrapper while keeping children
4. **Extract**: Keep only specified elements
5. **SetAttribute**: Add/modify attributes

**Advanced Operations**:
1. **Merge**: Combine adjacent elements
2. **Split**: Break elements at specific points
3. **Reorder**: Change element sequence
4. **Group**: Wrap elements in new container
5. **ConvertTable**: Transform layout tables to semantic markup

### Technical Considerations

**DOM Manipulation Libraries**:
- **jsdom**: Full DOM implementation in Node.js
- **cheerio**: jQuery-like server-side DOM manipulation (currently used)
- **linkedom**: Faster, lighter alternative to jsdom
- **parse5**: Low-level HTML parser with tree manipulation

**Safety & Validation**:
- Sandbox any code execution
- Validate all selectors before execution
- Set operation limits (max deletions, transformations)
- Rollback capability for failed operations

### Phased Implementation Plan

**Phase 1: Detection & Validation**
- Add checksum/hash validation to detect LLM changes
- Log and flag suspicious transcription changes
- Measure hallucination frequency

**Phase 2: Simple Extraction**
- Integrate Mozilla Readability.js
- Use as primary extraction for compatible sites
- Fall back to LLM for complex layouts

**Phase 3: Guided Manipulation**
- Implement JSON instruction format
- Start with delete operations only
- Gradually add transformation operations

**Phase 4: Advanced Features**
- Support full operation set
- Consider code generation approach
- Add visual diff preview

### Benefits vs Complexity Trade-off

| Approach | Complexity | Benefits |
|----------|------------|----------|
| Current (Full LLM) | Low | Simple but slow, hallucination risk |
| Readability.js | Medium | Fast, reliable for standard articles |
| JSON Instructions | High | Full control, no hallucination |
| Code Generation | Very High | Maximum flexibility |

### Recommendation

Start with Readability.js integration (Phase 2) as it provides the best complexity/benefit ratio. Only proceed to LLM-guided manipulation if:
1. Hallucination remains a problem after prompt improvements
2. Many sites fail Readability.js extraction
3. Speed remains unacceptable for users