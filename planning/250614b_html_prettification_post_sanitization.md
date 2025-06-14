# HTML Prettification Post-Sanitization Implementation

## Goal, Context

Implement HTML prettification/standardization after DOMPurify sanitization to improve downstream document processing consistency, ML/NLP accuracy, and debugging capabilities for academic document analysis. Currently, DOMPurify sanitizes HTML for security but doesn't standardize formatting, leading to inconsistent HTML structure across documents from different sources (arXiv, PubMed, IEEE, etc.).

Research shows that standardized document formats significantly improve ML model accuracy and convergence speed. Our AI-powered features (glossary, summaries, TOC generation) would benefit from consistent HTML structure for more reliable parsing and analysis.

## References

- `docs/reference/UPLOAD.md` - Current document upload and sanitization documentation
- `docs/reference/WEBPAGE_HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md` - Security and sanitization for HTML content
- `lib/utils/html-sanitizer.ts` - HTML sanitization implementation using DOMPurify
- `app/api/upload-pdf/route.ts`, `app/api/extract-url/route.ts` - Upload API implementations that will be refactored to use shared pipeline
- `lib/utils/html-text-extraction.ts` - Existing `extractCleanText()` utility that should replace duplicated regex-based extraction
- `planning/finished/250613c_html_document_storage_and_security_implementation.md` - HTML storage and security improvements context
- **js-beautify library documentation**: https://github.com/beautifier/js-beautify - Primary prettification library
- **Academic document processing research**: https://arxiv.org/html/2410.21169v2 - Benefits of standardization for ML/NLP
- **DOMPurify whitespace behavior**: https://github.com/cure53/DOMPurify/issues/299 - Known whitespace handling limitations

## Principles, Key Decisions

### Implementation Approach: js-beautify with Academic-Focused Configuration
- **Chosen over Prettier**: js-beautify offers more granular control over academic content preservation
- **Conservative configuration**: Prioritize content preservation over strict formatting
- **Academic-first**: Special handling for mathematical notation, code blocks, and citation formatting
- **Feature flag initially**: Gradual rollout with ability to disable if issues emerge
- **Pre/post comparison**: Store both versions initially for safety and regression testing

### DRY Architecture Approach: Shared HTML Processing Pipeline
- **Create shared service**: `lib/services/html-document-processor.ts` to consolidate post-HTML-generation processing
- **Eliminate duplication**: Remove 150-240 lines of duplicated code across 3 upload APIs
- **Single integration point**: Add prettification to shared pipeline instead of 3 separate locations
- **Consistent processing**: Guarantee all documents get identical sanitization → prettification → storage flow
- **Improved maintainability**: Future upload methods automatically get full processing pipeline

### Security and Quality Principles
- **Post-sanitization only**: Always apply prettification AFTER DOMPurify sanitization, never before
- **Academic content sensitivity**: Special handling for whitespace-sensitive elements (pre, code, math, citations)
- **Publisher compatibility**: Maintain compatibility with existing publisher-specific configurations (arXiv, IEEE, PubMed)
- **Comprehensive testing**: Visual regression testing with real academic documents
- **Rollback capability**: Maintain ability to revert if formatting issues emerge

### Performance and Reliability
- **Minimal overhead**: Target <100ms additional processing time
- **Fail-safe behavior**: If prettification fails, fall back to sanitized-only HTML
- **No destructive changes**: Original sanitized HTML preserved alongside prettified version

## Stages & Actions

### Stage: Analyze Current Architecture and Create DRY Foundation
- [ ] Analyze current upload API duplication
  - [ ] Use subagent to examine `app/api/upload-pdf/route.ts`, `app/api/extract-url/route.ts` and any existing `app/api/upload-html/route.ts`
  - [ ] Document current post-sanitization processing patterns and identify exact duplication
  - [ ] Identify existing shared utilities (`sanitizeAcademicContent`, `extractCleanText`, `DocumentService.createWithStorage`)
  - [ ] Map out current processing flow: [APIs] → HTML Generation → Sanitization → Plaintext Extraction → Document Creation

- [ ] Create shared HTML processing pipeline service
  - [ ] Create `lib/services/html-document-processor.ts` with `processHtmlToDocument()` function
  - [ ] Consolidate existing post-sanitization logic from all 3 APIs into shared service
  - [ ] Replace duplicated regex-based plaintext extraction with existing `extractCleanText()` utility
  - [ ] Include comprehensive error handling, logging, and metadata tracking
  - [ ] Add JSDoc documentation explaining the complete processing pipeline

### Stage: Refactor APIs to Use Shared Pipeline
- [ ] Update upload-pdf API to use shared pipeline
  - [ ] Replace post-AI-conversion processing with call to `processHtmlToDocument()`
  - [ ] Ensure all existing functionality (metadata, logging, error handling) is preserved
  - [ ] Test that PDF upload flow works identically to before

- [ ] Update extract-url API to use shared pipeline
  - [ ] Replace post-extraction processing with call to `processHtmlToDocument()`
  - [ ] Ensure both Readability and AI transcription methods work with shared pipeline
  - [ ] Test that URL extraction flow works identically to before

- [ ] Update upload-html API (if exists) or prepare for future implementation
  - [ ] Use shared pipeline from the start for consistent processing
  - [ ] Document that any future upload methods automatically get full pipeline

- [ ] Create comprehensive tests for shared pipeline
  - [ ] Create `lib/services/__tests__/html-document-processor.test.ts`
  - [ ] Test with sample content from all 3 upload sources (PDF, URL Readability, URL AI)
  - [ ] Verify identical behavior to previous individual implementations
  - [ ] Use subagent for comprehensive test implementation

### Stage: Research and Library Setup for Prettification
- [ ] Install and configure js-beautify library
  - [ ] Run `npm install js-beautify @types/js-beautify` to add dependency
  - [ ] Create academic-focused configuration based on research findings (see Appendix A)
  - [ ] Test basic functionality with sample academic HTML content

### Stage: Integrate Prettification into Shared Pipeline
- [ ] Create HTML prettification utility module
  - [ ] Create `lib/utils/html-prettifier.ts` with academic-focused js-beautify configuration
  - [ ] Implement `prettifyAcademicHtml()` function with error handling and fallback
  - [ ] Add comprehensive JSDoc documentation explaining academic-specific settings
  - [ ] Include configuration for preserving pre, code, math, and citation elements (see Appendix B)

- [ ] Add prettification to shared HTML processing pipeline
  - [ ] Update `processHtmlToDocument()` in `lib/services/html-document-processor.ts`
  - [ ] Insert prettification step: Sanitization → **Prettification** → Plaintext Extraction → Storage
  - [ ] Add feature flag support (`ENABLE_HTML_PRETTIFICATION`) with disabled default
  - [ ] Add error handling with fallback to sanitized-only HTML if prettification fails
  - [ ] Include prettification metrics in existing logging (processing time, size changes)

### Stage: Enhanced Testing and Validation
- [ ] Update tests for shared pipeline with prettification
  - [ ] Extend `lib/services/__tests__/html-document-processor.test.ts` to include prettification tests
  - [ ] Test prettification enabled/disabled modes via feature flag
  - [ ] Verify fallback behavior when prettification fails
  - [ ] Test with real academic content samples from arXiv, PubMed, IEEE (see Appendix C)

### Stage: Visual Regression and Performance Testing
- [ ] Create detailed prettification test suite
  - [ ] Create `lib/utils/__tests__/html-prettifier.test.ts` with comprehensive test cases
  - [ ] Test preservation of mathematical notation, code blocks, and citation formatting
  - [ ] Test edge cases: empty content, malformed HTML, very large documents
  - [ ] Use subagent for comprehensive test implementation to avoid context overflow

- [ ] Visual regression testing setup
  - [ ] Create test documents representing different academic publishers
  - [ ] Implement before/after HTML comparison utilities
  - [ ] Set up automated screenshot comparison using Puppeteer MCP (see Appendix D)
  - [ ] Test rendering differences in browser to catch visual regressions

### Stage: Performance and End-to-End Integration Testing
- [ ] Performance benchmarking of complete pipeline
  - [ ] Measure total processing overhead including DRY refactoring improvements
  - [ ] Ensure processing remains under 100ms for typical academic documents
  - [ ] Load test with concurrent uploads to validate scalability
  - [ ] Compare performance before/after DRY refactoring (should be improved)
  - [ ] Use subagent for performance testing to capture detailed metrics

- [ ] End-to-end integration testing with all upload methods
  - [ ] Test PDF upload → AI conversion → shared pipeline → prettification → storage → display
  - [ ] Test URL extraction (both Readability and AI) → shared pipeline → prettification → storage → display
  - [ ] Test HTML upload (when implemented) → shared pipeline → prettification → storage → display
  - [ ] Verify AI features (glossary, summaries, TOC) work correctly with prettified HTML from all sources
  - [ ] Use Puppeteer MCP in subagent to validate UI functionality across all upload types

### Stage: Documentation and Rollout Preparation
- [ ] Create comprehensive documentation
  - [ ] Create `docs/reference/UPLOAD_HTML_PRETTIFICATION.md` following `docs/instructions/WRITE_EVERGREEN_DOC.md`
  - [ ] Update `docs/reference/UPLOAD.md` to include prettification information
  - [ ] Document configuration options, troubleshooting, and rollback procedures
  - [ ] Include before/after examples and visual comparisons

- [ ] Update existing documentation for DRY refactoring and prettification
  - [ ] Update `docs/reference/UPLOAD.md` to reflect new shared pipeline architecture
  - [ ] Create `docs/reference/HTML_DOCUMENT_PROCESSOR.md` documenting the new shared service
  - [ ] Update `docs/reference/DOCUMENTATION_ORGANISATION.md` to include new documentation
  - [ ] Add cross-references from related documents about upload APIs and HTML processing
  - [ ] Use subagent to identify all documentation requiring updates

### Stage: Gradual Rollout and Monitoring
- [ ] Enable feature flag in development
  - [ ] Test thoroughly with development data
  - [ ] Monitor logs for errors or unexpected behavior
  - [ ] Gather feedback on formatting consistency improvements

- [ ] Production deployment preparation
  - [ ] Update production environment variables
  - [ ] Prepare rollback plan if issues emerge
  - [ ] Monitor performance impact and content quality metrics
  - [ ] Plan gradual rollout to percentage of users initially

### Stage: Post-Deployment Validation and Cleanup
- [ ] Monitor and validate production performance
  - [ ] Analyze prettification success rates and processing times
  - [ ] Monitor for any reported formatting issues from users
  - [ ] Validate AI feature accuracy improvements with prettified HTML

- [ ] Final documentation and cleanup
  - [ ] Update documentation based on production learnings
  - [ ] Document performance improvements from DRY refactoring
  - [ ] Remove temporary dual-storage approach if rollout successful
  - [ ] Clean up any debugging code or temporary features
  - [ ] Git commit all changes following `docs/instructions/GIT_COMMIT_CHANGES.md`

- [ ] Move planning document to `planning/finished/`

## Appendix

### A. js-beautify Academic Configuration Research

Based on research, the optimal configuration for academic content preservation:

```javascript
const ACADEMIC_PRETTIFICATION_CONFIG = {
  // Indentation settings
  indent_size: 2,                    // Consistent, readable indentation
  indent_char: ' ',                  // Spaces over tabs for consistency
  indent_with_tabs: false,
  
  // Whitespace preservation (critical for academic content)
  preserve_newlines: true,           // Maintain author's line break intent
  max_preserve_newlines: 2,          // Limit excessive blank lines
  wrap_line_length: 0,               // No line wrapping to avoid breaking inline elements
  
  // Academic content preservation
  content_unformatted: [
    'pre', 'code', 'math',           // Core whitespace-sensitive elements
    'script', 'style',               // Technical elements
    'mi', 'mo', 'mn',                // MathML notation elements
    'mtext', 'ms'                    // Additional MathML text elements
  ],
  
  unformatted: [
    'math', 'semantics',             // MathML container elements
    'annotation', 'annotation-xml'   // MathML annotation elements
  ],
  
  // Inline element handling (critical for citations)
  inline: [
    'a', 'cite', 'sup', 'sub',       // Citation and reference elements
    'abbr', 'acronym', 'dfn',        // Academic abbreviation elements
    'strong', 'em', 'b', 'i'         // Emphasis elements
  ],
  
  // Structure preservation
  void_elements: [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ],
  
  // Additional academic-specific settings
  end_with_newline: true,            // Consistent file endings
  extra_liners: [],                  // Don't force extra lines
  indent_empty_lines: false,         // Don't indent empty lines
  indent_head_inner_html: true,      // Consistent head formatting
  indent_body_inner_html: true,      // Consistent body formatting
  
  // Security-conscious settings
  templating: [],                    // No template processing for security
  indent_scripts: 'keep'             // Don't modify scripts (though they should be sanitized out)
};
```

**Key Research Findings Supporting This Configuration:**

1. **Whitespace Preservation Critical**: "js-beautify has known bugs where it removes trailing spaces of inline tags (a, span, strong, etc)" - our inline configuration addresses this
2. **Pre Tag Issues**: "Current indentation level of the HTML pre tag is being added to the indentation of the code" - our content_unformatted setting prevents this
3. **Academic Content Sensitivity**: Mathematical notation and citations rely on precise spacing - our comprehensive unformatted lists protect these

### B. Academic Content Preservation Patterns

**MathML Elements Requiring Special Handling:**
- `<math>`, `<mrow>`, `<mi>`, `<mn>`, `<mo>` - Core mathematical notation
- `<mfrac>`, `<msub>`, `<msup>`, `<msubsup>` - Mathematical structures
- `<semantics>`, `<annotation>`, `<annotation-xml>` - Semantic annotations

**Citation and Reference Elements:**
```html
<!-- Preserve exact spacing in these patterns -->
<cite>Author et al.</cite> shows that...
See <a href="#ref1">Smith (2024)</a> for details.
The formula <math><mi>E</mi><mo>=</mo><mi>m</mi><mi>c</mi><msup><mi>c</mi><mn>2</mn></msup></math> demonstrates...
```

**Code Block Preservation:**
```html
<pre><code class="language-python">
def extract_citations(html):
    # Whitespace here must be preserved exactly
    return parse_html(html)
</code></pre>
```

### C. Test Content Sources and Cases

**Academic Publishers for Testing:**
- **arXiv**: LaTeXML-generated HTML with complex mathematical notation
- **PubMed Central**: JATS XML converted HTML with structured metadata
- **IEEE Xplore**: Technical papers with equations and code blocks
- **Nature/Springer**: Scientific articles with figures and citations

**Critical Test Cases:**
1. **Mathematical Equations**: Complex MathML with nested structures
2. **Code Blocks**: Programming examples with precise indentation
3. **Citation Chains**: Multiple inline citations with specific spacing
4. **Figure Captions**: Long captions with internal formatting
5. **Table Structures**: Complex academic tables with colspan/rowspan
6. **Mixed Content**: Documents combining all above elements

**Edge Cases to Test:**
- Empty documents
- Documents with only whitespace
- Malformed HTML (post-sanitization)
- Very large documents (>1MB HTML)
- Documents with unusual publisher-specific markup

### D. Visual Regression Testing Approach

**Puppeteer Testing Strategy:**
```javascript
// Capture before/after screenshots for visual comparison
const testDocument = await uploadDocument(originalHtml);
const beforeScreenshot = await page.screenshot({
  selector: '.document-content',
  width: 1200,
  height: 800
});

// Enable prettification and re-upload
await enablePrettification();
const prettifiedDocument = await uploadDocument(originalHtml);
const afterScreenshot = await page.screenshot({
  selector: '.document-content', 
  width: 1200,
  height: 800
});

// Compare for significant visual differences
const pixelDiff = compareScreenshots(beforeScreenshot, afterScreenshot);
expect(pixelDiff).toBeLessThan(ACCEPTABLE_PIXEL_DIFFERENCE_THRESHOLD);
```

**Key Validation Points:**
- Mathematical equations render identically
- Code block formatting preserved
- Citation spacing unchanged
- Table structures maintain alignment
- Figure positioning unaffected

### E. Alternative Approaches Considered and Rejected

**Prettier HTML Processing**
- **Pros**: Modern, well-maintained, good TypeScript support
- **Cons**: Less granular control, more opinionated formatting, whitespace sensitivity issues
- **Research Finding**: "Prettier introduces whitespace-sensitive formatting" which could break academic citations
- **Decision**: Rejected due to insufficient control over academic content preservation

**Custom HTML Parser Implementation**
- **Pros**: Complete control over formatting rules, academic-specific optimizations
- **Cons**: Significant development time, maintenance burden, potential security risks
- **Research Finding**: "Parser inconsistencies between different environments" create security vulnerabilities
- **Decision**: Rejected due to development complexity and security risks

**html-minifier with Custom Configuration**
- **Pros**: Well-tested, configurable, smaller output size
- **Cons**: Primarily designed for minification, not prettification; limited academic content awareness
- **Research Finding**: Minification focus conflicts with our readability and debugging goals
- **Decision**: Rejected as it optimizes for size rather than consistency and readability

**No Prettification (Status Quo)**
- **Pros**: No additional complexity, no risk of formatting issues
- **Cons**: Inconsistent HTML structure hinders ML/NLP accuracy, makes debugging difficult
- **Research Finding**: "Standardized document formats achieve consistently accurate results" vs free-form processing
- **Decision**: Rejected due to missed opportunities for AI feature improvements

### F. Risk Mitigation Strategies

**Content Preservation Risks:**
- **Inline Element Spacing**: Comprehensive inline element configuration prevents spacing changes
- **Mathematical Notation**: Extensive MathML element protection in unformatted lists
- **Code Block Indentation**: content_unformatted prevents modification of pre/code content
- **Citation Formatting**: Careful inline element handling preserves citation spacing

**Security Risks:**
- **Post-Sanitization Processing**: Only applied after DOMPurify sanitization, never before
- **Parser Inconsistencies**: Using well-tested js-beautify library reduces custom parsing risks
- **Content Injection**: No dynamic content generation, only formatting of existing sanitized content

**Performance Risks:**
- **Processing Overhead**: Target <100ms processing time with performance monitoring
- **Memory Usage**: Large document handling with chunking if needed
- **Concurrent Load**: Load testing to validate scalability under production conditions

**Rollback and Recovery:**
- **Feature Flag**: Instant disable capability if issues emerge
- **Dual Storage**: Temporarily store both versions for comparison and rollback
- **Monitoring**: Comprehensive logging to detect issues early
- **Gradual Rollout**: Percentage-based deployment to limit impact of any issues