# HTML Document Storage and Security Implementation

## Goal, context

Implement comprehensive storage and security improvements for HTML document import in Spideryarn Reading. Currently, the system has a critical XSS vulnerability and inconsistent storage patterns compared to PDF documents.

**Current State Issues**:
- **Critical XSS vulnerability**: Uses `dangerouslySetInnerHTML` with unsanitized external HTML content
- **No original HTML preservation**: Only processed content stored, unlike PDFs which store originals
- **Inconsistent architecture**: PDF documents use `createWithStorage()` while URL extraction doesn't store originals
- **Missing sanitization**: No DOMPurify or CSP headers, relies only on Mozilla Readability/AI processing

**Target State**: 
- Store raw HTML content before any processing (following PDF storage pattern)
- Implement comprehensive XSS protection with DOMPurify sanitization 
- Maintain re-processing capabilities for future improvements
- Consistent storage architecture across all document types

**Success Criteria**:
- Original HTML stored in Supabase Storage with proper database references
- XSS vulnerability eliminated through sanitization layers
- Academic content compatibility maintained through appropriate sanitization rules
- Zero breaking changes to existing documents (new documents only)

## References

- `docs/reference/WEBPAGE_CONTENT_EXTRACTION.md` - Current HTML extraction implementation and security gaps analysis
- `planning/finished/250606a_pdf_Supabase_Storage_integration.md` - Completed PDF storage implementation to follow as pattern
- `app/api/extract-url/route.ts:316` - Current URL extraction endpoint that needs storage integration
- `lib/services/database/documents.ts:322` - `createWithStorage()` method for consistent storage pattern
- `components/simple-document-viewer.tsx:147,154` - Current XSS vulnerability locations with `dangerouslySetInnerHTML`
- `lib/utils/readability-extractor.ts` - Mozilla Readability implementation with basic security measures
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify) - HTML sanitization library for XSS prevention
- [Academic HTML Content Research](https://www.owasp.org/index.php/XSS_Prevention_Cheat_Sheet) - OWASP guidelines for academic content sanitization

## Principles, key decisions

Based on user requirements and security analysis:

**Storage Strategy**:
- **Store raw HTML first**: Preserve completely original HTML fetched from URLs before any processing
- **URL-based filename pattern**: Use slugified naming (e.g., `{document-uuid}/{domain-name-and-full-path-slugified}.html`)
- **Follow PDF storage pattern**: Use existing `createWithStorage()` method and Supabase Storage integration
- **Enable future re-processing**: Raw HTML storage allows improved extraction methods later (simple implementation for now)

**Security Approach**:
- **No pre-storage sanitization**: Store completely raw/original HTML to preserve source integrity  
- **Defense-in-depth sanitization**: Sanitize only at display time with academic content compatibility
- **Academic content focus**: Sanitization rules must support complex academic formatting (tables, equations, citations)
- **CSP headers implementation**: Add Content Security Policy for additional XSS protection layer

**Implementation Scope**:
- **New documents only**: No retroactive changes to existing documents
- **Storage + security together**: Implement both features simultaneously (no hotfix approach)
- **Accuracy over performance**: Prioritize content preservation and security over processing speed
- **Academic content priority**: Ensure sanitization doesn't break legitimate academic formatting
- **Research-based implementation**: Use findings from `docs/reference/HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md`

## Stages & actions

### Stage: Preparatory Setup
- [ ] Run `./scripts/sync-worktrees.ts` to pull latest changes from main
- [x] Research academic content sanitization requirements ✅
  - [x] ✅ Comprehensive research completed in `docs/reference/HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md`
  - [x] ✅ DOMPurify confirmed as optimal choice (9.9M weekly downloads, security expert maintenance)
  - [x] ✅ Academic publisher patterns analyzed (arXiv LaTeXML, PMC JATS, IEEE/ACM structures)
  - [x] ✅ Academic-specific configuration documented with MathML/SVG/table preservation

### Stage: Security Infrastructure Implementation  
- [ ] Install and configure HTML sanitization dependencies
  - [ ] Install DOMPurify: `npm install dompurify @types/dompurify isomorphic-dompurify`
  - [ ] Create `lib/utils/html-sanitizer.ts` with research-based academic sanitization configuration
  - [ ] Implement accuracy-first sanitization preserving MathML, complex tables, citations, figures
  - [ ] Add academic content profiles for different publisher patterns (arXiv, IEEE, PMC)
  - [ ] Include comprehensive test suite with real academic content examples
  
- [ ] Implement Content Security Policy headers
  - [ ] Add CSP configuration to `next.config.ts` for XSS prevention
  - [ ] Configure CSP to allow legitimate academic content while blocking scripts
  - [ ] Test CSP doesn't break existing document display functionality

- [ ] Create sanitization integration layer
  - [ ] Update `components/simple-document-viewer.tsx` to use sanitization before `dangerouslySetInnerHTML`
  - [ ] Add sanitization wrapper for all HTML content display points
  - [ ] Include fallback handling for sanitization failures

### Stage: HTML Storage Implementation
- [ ] Extend URL extraction to store original HTML
  - [ ] Update `app/api/extract-url/route.ts` to use `createWithStorage()` with HTML blob
  - [ ] Implement URL-based filename generation (slugified domain names)
  - [ ] Add original HTML storage before any Readability/AI processing
  - [ ] Update upload metadata to track storage method and file info
  
- [ ] Integrate with existing storage infrastructure  
  - [ ] Ensure HTML storage uses same Supabase Storage bucket as PDFs
  - [ ] Update storage path format: `{document-uuid}/{domain-name-slugified}.html`
  - [ ] Add proper MIME type handling for HTML files (`text/html`)
  - [ ] Include storage error handling and cleanup on failures

### Stage: Database and API Integration
- [ ] Update document creation workflow
  - [ ] Modify URL extraction to create HTML blob from fetched content
  - [ ] Update database record creation to include `storage_path` for HTML documents
  - [ ] Ensure `original_file_type` field properly set to `text/html`
  - [ ] Add storage success/failure tracking in upload metadata
  
- [ ] Implement original HTML retrieval
  - [ ] Add API endpoint for downloading original HTML (following PDF download pattern)
  - [ ] Update document service methods to handle HTML file retrieval
  - [ ] Include proper Content-Type headers and filename handling for HTML downloads
  - [ ] Test signed URL generation for secure HTML access

### Stage: Testing and Quality Assurance
- [ ] Write comprehensive test suite for HTML storage
  - [ ] Unit tests for HTML sanitization with academic content scenarios
  - [ ] Integration tests for URL extraction with storage (following PDF test patterns)
  - [ ] Test storage path generation and retrieval functionality
  - [ ] Use test isolation utilities to avoid database conflicts
  
- [ ] Security testing and validation
  - [ ] XSS payload testing with DOMPurify sanitization
  - [ ] Academic content preservation testing (tables, equations, complex formatting)
  - [ ] CSP violation testing and header validation
  - [ ] Test sanitization performance with large HTML documents
  
- [ ] Manual testing and validation
  - [ ] Test complete workflow: URL extraction → storage → sanitization → display
  - [ ] Validate academic content rendering quality after sanitization
  - [ ] Test original HTML download functionality
  - [ ] Verify no breaking changes to existing document display

### Stage: Documentation and Deployment
- [ ] Update relevant documentation
  - [ ] Update `docs/reference/WEBPAGE_CONTENT_EXTRACTION.md` with security improvements
  - [ ] Document new HTML storage architecture and security measures
  - [ ] Add troubleshooting guide for sanitization and storage issues
  - [ ] Update API documentation for new HTML storage endpoints
  
- [ ] Final validation and deployment preparation
  - [ ] Run full test suite to ensure no regressions
  - [ ] Validate development environment compatibility
  - [ ] Test with various academic website examples
  - [ ] Confirm zero impact on existing documents and PDF functionality

### Stage: Git Commit and Finalization
- [ ] Use subagent for comprehensive Git commit following `docs/instructions/DO_GIT_COMMITS.md`
  - [ ] Include storage implementation, security improvements, and documentation updates  
  - [ ] Verify working tree is clean after commit
  - [ ] Include comprehensive commit message documenting security and storage improvements

- [ ] Move completed planning document to `planning/finished/`

## Appendix

### Security Analysis Summary

**Current XSS Vulnerability Details**:
- Location: `components/simple-document-viewer.tsx:147,154`
- Risk: Malicious JavaScript execution via `dangerouslySetInnerHTML` with unsanitized external HTML
- Attack vectors: Script tags, event handlers, malicious iframes embedded in academic papers
- Impact: High - full JavaScript execution in user browsers, potential data theft

**Academic Content Sanitization Requirements**:
Based on academic publisher research, these elements must be preserved:
- **Tables**: Complex `<table>` structures with colspan/rowspan for data presentation
- **Citations**: `<cite>`, `<sup>`, `<sub>` elements for academic referencing  
- **Equations**: MathML elements or HTML mathematical notation
- **Figures**: `<figure>`, `<figcaption>` for academic diagrams
- **Cross-references**: `<a>` tags for internal document navigation
- **Typography**: `<em>`, `<strong>`, `<blockquote>` for academic formatting

**Research-Based DOMPurify Configuration** (from `docs/reference/HTML_SANITIZATION_FOR_ACADEMIC_CONTENT.md`):
```typescript
const ACADEMIC_SANITIZATION_CONFIG = {
  USE_PROFILES: { 
    mathMl: true,    // Enable MathML for mathematical notation
    svg: true,       // Enable SVG for scientific diagrams
    html: true       // Enable standard HTML tags
  },
  ADD_TAGS: [
    'semantics', 'annotation', 'annotation-xml',  // MathML semantic markup
    'article', 'section', 'header', 'main',       // HTML5 semantic elements
    'figure', 'figcaption',                       // Scientific figures
    'math', 'mrow', 'mi', 'mn', 'mo', 'mfrac',    // Mathematical notation
    'msub', 'msup', 'msubsup', 'munder', 'mover'  // Mathematical superscripts/subscripts
  ],
  ADD_ATTR: [
    'colspan', 'rowspan',           // Complex table structures
    'data-*',                       // Publisher-specific data attributes
    'mathvariant', 'mathsize',      // Mathematical styling
    'data-doi', 'data-ref'          // Citation metadata
  ],
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onload', 'onclick', 'onerror', 'javascript:']
}
```

### Storage Architecture Decisions

**Filename Pattern Rationale**:
- **Pattern**: `{document-uuid}/{domain-name-and-path-slugified}.html`
- **Example**: `550e8400-e29b-41d4-a716-446655440000/arxiv-org-abs-2024-12345.html`
- **Benefits**: UUID prevents conflicts, full URL path provides better identification for re-processing, slugification ensures filesystem compatibility
- **Research finding**: Academic papers often have meaningful URL paths (arXiv IDs, DOIs) worth preserving

**Storage Timing Strategy**:
Following the PDF "Storage-First" approach:
1. Fetch webpage HTML from URL
2. **Store raw HTML immediately** in Supabase Storage  
3. Process HTML with Readability/AI extraction
4. Sanitize processed HTML for display
5. Store sanitized HTML in database with storage path reference

**Alternative Approaches Considered**:

1. **Sanitize before storage** (rejected): Would lose original source for re-processing
2. **Store processed HTML only** (rejected): Inconsistent with PDF approach, no re-processing capability  
3. **Separate sanitization service** (rejected): Over-engineering for current needs
4. **Client-side sanitization only** (rejected): Not sufficient defense-in-depth

### Risk Assessment and Mitigation

**High Priority Risks**:
- **Over-sanitization**: Removing legitimate academic content → Mitigated by research-based configuration and real academic content testing
- **Accuracy vs security trade-offs**: Balancing content preservation with XSS protection → Mitigated by defense-in-depth approach (DOMPurify + CSP)
- **Publisher-specific content loss**: Different academic platforms use varying HTML patterns → Mitigated by configurable sanitization profiles
- **Storage cost increase**: HTML files can be large → Acceptable given zero users and accuracy priority

**Medium Priority Risks**:  
- **CSP compatibility**: Breaking existing functionality → Mitigated by thorough testing
- **Migration complexity**: New vs existing documents → Mitigated by new-documents-only approach

**Low Priority Risks**:
- **Re-processing implementation**: Future feature complexity → Deferred to later stages

### Academic Content Examples for Testing

**Test Cases for Sanitization**:
- arXiv papers with LaTeX-rendered equations
- IEEE papers with complex table structures  
- Academic journals with extensive citation formatting
- Research papers with embedded figures and captions
- Multi-column academic layouts with cross-references

**Security Test Payloads**:
- `<script>alert('xss')</script>` - Direct script injection
- `<img src="x" onerror="alert('xss')">` - Event handler injection  
- `<a href="javascript:alert('xss')">link</a>` - JavaScript protocol injection
- Nested iframe and object tag attempts
- SVG-based XSS payloads common in academic diagrams
