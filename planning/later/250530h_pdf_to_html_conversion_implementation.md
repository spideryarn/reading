# PDF to HTML Conversion Implementation

## Goal, context

Implement PDF to HTML conversion functionality for Spideryarn Reading to enable processing of academic papers in PDF format. This expands the application's document input capabilities beyond HTML files to handle the most common academic document format.

The implementation should leverage the comprehensive research documented in `docs/PDF_TO_HTML_CONVERSION.md`, which evaluated latest 2025 LLM capabilities, PDF conversion libraries, and bounding box detection approaches for academic documents.

Key requirements:
- Convert PDF documents to HTML while preserving academic structure (tables, figures, equations) 
- Prioritize accuracy and simplicity over cost, latency, or productionization concerns
- Start with a super-simple `/upload` page that outputs generated HTML directly
- Focus on single-page PDFs initially to minimize complexity
- Use Claude 4 Sonnet for maximum accuracy in academic document processing
- Handle tables, multi-column layouts, and page numbers appropriately for academic papers

## References

- `docs/PDF_TO_HTML_CONVERSION.md` - Comprehensive research on PDF conversion approaches, LLM capabilities, and implementation guidance
- `docs/ARCHITECTURE.md` - Multi-provider LLM support and document storage architecture
- `docs/MUTATIONS.md` - Document transformation system for integrating PDF imports (DISCUSS WITH USER BEFORE STARTING whether to make use of mutations)
- `docs/LLM_PROMPT_TEMPLATES.md` - Standardized Nunjucks + Zod template system for LLM calls
- `docs/CODING_PRINCIPLES.md` - Development principles prioritizing simplicity and rapid prototyping
- `lib/services/llm-provider.ts` - Existing multi-provider LLM infrastructure
- `lib/services/mutation-engine.ts` - Document transformation engine for reversible changes

## Principles, key decisions

Based on research findings and user priorities (accuracy and simplicity over cost/performance):

- **Library Selection**: Use `pdf-to-png-converter` for zero-dependency deployment (simple setup, no system dependencies)
- **Primary LLM**: Claude 4 Sonnet exclusively for maximum accuracy (72.7% SWE-bench performance)
- **Simple Storage**: Store converted HTML directly in documents table, not as reversible mutations
- **V1 Scope**: Single-page PDFs only to start, with super-simple `/upload` page showing raw HTML output
- **Quality Focus**: High-resolution conversion (viewportScale: 2.0) for academic content clarity
- **Academic Handling**: Preserve tables, multi-column layouts, equations, but ignore page numbers for single-page constraint
- **Minimal Infrastructure**: No queuing, caching, background processing - direct synchronous conversion

## Actions

### Stage: Minimal PDF to PNG Setup ✅
- [x] ~~Install and configure `pdf-to-png-converter` library~~ → **Switched to pdf2pic for better compatibility**
  - [x] Add to package.json: `npm install pdf2pic` (with GraphicsMagick system dependency)
  - [x] Test basic single-page PDF to PNG conversion with sample academic document
  - [x] Install GraphicsMagick via homebrew and configure PATH

- [x] Create simple PDF converter utility
  - [x] Implement `lib/utils/pdf-converter.ts` with single function: `convertPdfToBase64Image(pdfBuffer: Buffer)`
  - [x] Use high resolution (density: 200, width: 1600, height: 2400) for academic content clarity
  - [x] Add comprehensive error handling for invalid PDFs, conversion failures, and cleanup

### Stage: LLM Vision Support for PDF Processing ✅  
- [x] Extend existing LLM infrastructure for image inputs
  - [x] Update Zod schemas in `lib/prompts/types.ts` to support multimodal content: `text | { type: 'text', text: string } | { type: 'image', image: string }`
  - [x] Test Claude 4 Sonnet with base64 image input using existing `generateText()` function
  - [x] Verify message format: `{ role: 'user', content: [{ type: 'text', text: '...' }, { type: 'image', image: base64 }] }`
  - [x] **Added**: Create `loadMultimodalPromptTemplateFromCaller()` helper for path resolution

- [x] Create PDF to HTML prompt template
  - [x] Implement `lib/prompts/templates/pdf-to-html.njk` with academic-focused prompts
  - [x] Zod schema for PDF conversion responses (just expecting HTML string output)  
  - [x] Prompt engineering for Claude 4: "Convert this academic PDF to clean semantic HTML. Preserve table structure, maintain multi-column reading order, convert equations to HTML/MathML, ignore page numbers."

### Stage: Super-Simple /upload Page
- [x] Create basic upload page at `/app/upload/page.tsx`
  - [x] File input limited to PDF files only (accept=".pdf")
  - [x] Drag and drop support with dedicated landing zone for PDFs
  - [x] Single page constraint: max file size 2MB to ensure single-page PDFs
  - [x] Simple upload button with loading state
  - [x] Display converted HTML output directly on the page (raw HTML visible to user)
  - [x] Find way to display what the HTML document looks like when viewed (rendered preview)

### Stage: Enhanced UX Features (Current)
- [x] Add drag and drop functionality to existing upload page
  - [x] Replace file input with drag and drop zone using HTML5 drag/drop API
  - [x] Maintain existing file validation (PDF type, 2MB size limit)
  - [x] Add visual feedback for drag states (border/background changes)
  - [x] Ensure keyboard accessibility (Enter/Space to trigger file picker)
  - [x] Use Phosphor icons (Upload, FilePdf) for consistent styling
  - [x] Apply Spideryarn orange theme for active/hover states
  - [x] Show selected file preview with option to remove/replace

**Implementation Notes**:
- Excellent visual implementation with proper Spideryarn branding and Tailwind CSS styling
- Full accessibility support with keyboard navigation and ARIA labels
- Clean user experience with visual feedback for drag states
- File validation and error handling maintained from previous implementation
- HTML preview: Raw HTML display in textarea + rendered preview using iframe with `srcDoc` for complete HTML documents
- **HTML Preview Fix**: Replaced `dangerouslySetInnerHTML` with iframe approach to properly render complete HTML documents from Claude

**Current Status (2025-02-06)**:
- ✅ Drag and drop functionality: Complete and working excellently  
- ✅ HTML preview: Fixed to use iframe for proper rendering of complete HTML documents
- ✅ Backend PDF conversion: Successfully switched from pdf-to-png-converter to pdf2pic
- ✅ GraphicsMagick dependencies: Installed and configured properly
- ✅ Template system: Fixed multimodal prompt template path resolution
- ✅ End-to-end functionality: PDF upload → PNG conversion → Claude 4 vision → HTML output working
- ✅ PDF processing API: `/api/upload-pdf` route fully functional with proper error handling
- 🎉 **FULLY FUNCTIONAL**: Complete PDF to HTML conversion pipeline working end-to-end
- ⚠️ **DEPLOYMENT CONCERN**: Current GraphicsMagick dependency incompatible with Vercel serverless - requires future refactoring for production

- [x] Create PDF processing API endpoint
  - [x] Implement `/app/api/upload-pdf/route.ts` for direct PDF→HTML conversion
  - [x] Accept PDF file upload, convert to base64, call Claude 4 Sonnet - (use our existing LLMs machinery)
  - [x] Return raw HTML string (no storage, no integration - just conversion)
  - [x] Basic error handling for file size, invalid PDFs, LLM failures

- [ ] Basic academic content handling
  - [ ] Prompt Claude 4 to preserve table markup (`<table>`, `<th>`, `<td>`)
  - [ ] Handle multi-column layouts by preserving reading order (left-to-right, top-to-bottom)
  - [ ] Convert mathematical notation to HTML entities or MathML where possible
  - [ ] Ignore page numbers, headers, footers for single-page constraint

### Stage: Testing and Refinement
- [ ] Test with sample academic PDFs
  - [ ] Test with single-page research paper excerpts (tables, equations, multi-column)
  - [ ] Test with simple academic documents (journal articles, conference papers)
  - [ ] Validate HTML output quality and structure preservation

- [ ] Refine prompts based on results
  - [ ] Iterate on PDF→HTML prompt based on output quality
  - [ ] Add specific instructions for common academic elements (abstracts, references, captions, footnotes, endnotes, titles, page numbers, columns, hyphenation) (TODO each of these need to be broken out as separate actions???)
  - [ ] Optimize for Claude 4's structured reasoning capabilities

- [ ] Basic error handling and user feedback
  - [ ] Show clear error messages for file size limits, invalid PDFs
  - [ ] Display processing time and status to user
  - [ ] Add simple validation that output is valid HTML

### Stage: Serverless Deployment Compatibility
- [ ] **CRITICAL**: Address GraphicsMagick dependency for Vercel deployment
  - [ ] Current `pdf2pic` + GraphicsMagick approach will NOT work on Vercel serverless
  - [ ] System dependencies (GraphicsMagick) not available in Vercel runtime
  - [ ] Consider switching back to `pdf-to-png-converter` with proper bundling configuration
  - [ ] Alternative: Investigate PDF-lib + canvas approach for zero-dependency conversion
  - [ ] Alternative: Browser-based PDF.js conversion in headless context
  - [ ] Test deployment to Vercel to confirm dependency issues
  - [ ] Update webpack/turbopack configuration for serverless compatibility

### Stage: Documentation and Completion
- [ ] Write basic tests
  - [ ] Unit test for PDF→PNG conversion utility
  - [ ] Integration test for complete upload flow with sample PDF
  - [ ] Test error handling for edge cases

- [ ] Update documentation
  - [ ] Add implementation notes to `docs/PDF_TO_HTML_CONVERSION.md`
  - [ ] Document the /upload page functionality and limitations
  - [ ] Note single-page constraint and future expansion possibilities
  - [ ] Document serverless deployment considerations and dependency requirements

- [ ] Git commit and completion
  - [ ] Commit simple PDF upload functionality following `docs/GIT_COMMITS.md`
  - [ ] Move planning doc to `planning/finished/`

## Appendix

### Research Summary
The comprehensive research in `docs/PDF_TO_HTML_CONVERSION.md` evaluated:

**PDF Conversion Libraries**:
- **pdf-to-png-converter**: Zero dependencies, ideal for serverless deployment, Node.js 20+ requirement
- **pdf2pic**: High adoption but requires GraphicsMagick/Ghostscript, production deployment complexity
- **pdf-img-convert**: Limited adoption, still requires external dependencies

**LLM Performance Benchmarks (2025)**:
- **Claude 4 Sonnet**: 72.7% SWE-bench accuracy, superior structured reasoning for academic content
- **Gemini 2.5 Pro**: 84% GPQA Diamond, 86.7% AIME 2025, 1M+ token context, 3x cost efficiency
- **Cost Analysis**: ~$0.10-0.20 per page for high-resolution vision processing

**Figure Detection Capabilities**:
- **Gemini Pro/2.5**: Only LLM with native coordinate support (1000x1000 scale)
- **Claude 4/GPT-4**: No native bounding box detection, requires approximate methods
- **VILA Approach**: 95% text block classification, 90% object recognition for academic figures

### Key Design Decisions for V1 Simplicity

**Single-Page Constraint**: Limits scope and complexity while ensuring fast processing and reliable results. Academic papers often have dense single-page excerpts that demonstrate all key challenges (tables, equations, multi-column).

**Raw HTML Output**: Display converted HTML directly to user rather than integrating with document system. This allows immediate validation of conversion quality and iterative prompt improvement.

**Academic Content Handling**:
- **Tables**: Preserve `<table>` structure with proper `<th>` and `<td>` markup
- **Multi-column**: Trust Claude 4's reading order detection (left-to-right, top-to-bottom)
- **Equations**: Convert to HTML entities or MathML where feasible, fallback to text
- **Page Numbers**: Ignore for single-page constraint (headers/footers irrelevant)

**Accuracy First**: Use Claude 4 Sonnet exclusively for maximum structured reasoning capability, accepting higher cost for better academic content preservation.