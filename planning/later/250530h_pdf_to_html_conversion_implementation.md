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

- **Direct PDF Processing**: Send PDFs directly to Claude/Gemini APIs, eliminating conversion complexity and improving quality
- **API Selection Strategy**: Claude for premium quality, Gemini for cost optimization, with hybrid routing based on document complexity
- **Serverless Compatibility**: Zero system dependencies, works perfectly on Vercel without GraphicsMagick or similar requirements
- **Simple Storage**: Store converted HTML directly in documents table, not as reversible mutations
- **Multi-page Support**: Remove single-page constraint, leverage APIs' native multi-page handling capabilities
- **Quality Focus**: Native PDF text extraction with better formatting preservation than image-based approaches
- **Academic Handling**: Preserve tables, multi-column layouts, equations through direct PDF analysis rather than image conversion
- **Cost Optimization**: Implement caching and API routing to balance quality vs cost (Gemini 10x cheaper than Claude)

## Actions

### Stage: Foundation Implementation ✅ (Deprecated - See Appendix)
**Note**: The stages below represent the working V1 implementation using pdf2pic + GraphicsMagick and image-based processing. While functional locally, this approach was abandoned due to Vercel serverless incompatibility. The code and tests remain available for reference.

- [x] **V1 Implementation Summary**:
  - ✅ Complete PDF to HTML conversion pipeline working end-to-end
  - ✅ Drag and drop upload interface with excellent UX
  - ✅ Comprehensive Jest test suite (27/27 tests passing)
  - ✅ Academic PDF processing with tables, equations, multi-column layouts
  - ✅ Claude 4 Sonnet integration with optimized prompts
  - ❌ **Deployment blocker**: GraphicsMagick system dependencies incompatible with Vercel

**Current Status**: V1 codebase preserved, V2 direct PDF approach to be implemented.

### Stage: Direct PDF Upload to Claude/Gemini APIs ⭐ **NEW APPROACH**
- [ ] **PHASE 1: Research and API Integration Planning**
    
  **Step 2: Update PDF Processing Pipeline**:
  - [ ] Remove pdf2pic and GraphicsMagick dependencies
  - [ ] Update API routes to send PDFs directly to Claude (optional argument, default to Claude, we'll do Gemini later)
  - [ ] Modify prompt templates for direct PDF analysis
  - [ ] Implement Claude PDF upload with proper headers (`anthropic-beta: pdfs-2024-09-25`)
  - [ ] Update error handling for API-specific limitations
  - [ ] Test end-to-end pipeline with academic content (use `static/examples/2105.10461v2_cropped.pdf`, and see `TESTING.md`)
  
  **Step 3: Storage**:
  - [ ] Set up Supabase Storage if it hasn't been already (search the web with a subagent)
  - [ ] Discuss Supabase Storage questions with user, e.g. how should the Document row reference the Supabase Storage row (so that the document knows about where its original file is stored)
  - [ ] Write & run tests (use a subagent)
  - [ ] Update the PDF pipeline to store the original PDF in Supabase Storage

  - [x] Remove single-page constraint to enable multi-page PDF processing ✅
  - [ ] Add Gemini support (following the Claude implementation approach as an example)

  - [ ] Modify existing tests to mock Claude/Gemini APIs instead of pdf2pic
  - [ ] Add integration tests for direct PDF processing
  - [ ] Test error scenarios (file size limits, API failures)
  - [ ] Validate output quality against previous image-based approach
  
### Stage: Final Polish & Documentation
- [ ] Tidying:
  - [ ] Clean up deprecated pdf2pic and pdf-to-png-converter code
  - [ ] Remove temporary quality test components from upload page  
  - [ ] Update test suite for direct PDF processing approach
  - [ ] Complete documentation updates

- [ ] Update documentation
  - [ ] Update `docs/PDF_TO_HTML_CONVERSION.md` with direct PDF approach
  - [ ] Document Claude/Gemini API integration patterns
  - [ ] Note cost optimization strategies and API routing
  - [x] Document research findings and deprecated approaches ✅

- [ ] Git commits, following `docs/GIT_COMMITS.md`
  - [ ] Direct PDF API integration commit
  - [ ] Remove deprecated PDF conversion dependencies  
  - [ ] Update documentation and planning docs

### Stage: Enhanced Figure/Image Extraction (Future)
  - [ ] Research how good a job latest Claude/Gemini/state-of-the-art alternatives for bounding boxes of figures/images/etc (search the web with subagent)
  - [ ] Research how best to extract the figures/images once we have the bounding boxes (given that we don't necessarily have an image version of the PDF)
  - [ ] Discuss next steps with user

  **Step 6: Bounding Box Detection and Figure Extraction**:
  - [ ] Discuss whether to implement PyMuPDF-based image extraction for Vercel Python functions
  - [ ] Discuss GROBID integration for academic figure detection
  - [ ] Create hybrid approach: direct PDF analysis + extracted figure analysis
  - [ ] Implement automatic figure type detection (charts, diagrams, photos)
  - [ ] Add figure caption extraction and linking
  - [ ] Create separate Claude Vision analysis for extracted figures
  - [ ] Integrate figure analysis results with main document processing

### Stage:
- [ ] Any further cleanup?
- [ ] Move planning doc to `planning/finished/` (when fully complete)

## Appendix

### Deprecated Approaches and Lessons Learned

**GraphicsMagick + pdf2pic Approach (V1 - Working Locally)**:
- ✅ **Excellent Quality**: High-resolution academic PDF conversion with proper font rendering
- ✅ **Reliable**: Successfully processed complex academic documents with equations and tables  
- ✅ **Complete Implementation**: Full working pipeline with Jest test coverage (11/11 tests passing)
- ❌ **Deployment Blocker**: Requires GraphicsMagick system binaries unavailable on Vercel serverless
- ❌ **50MB Limit**: GraphicsMagick binaries exceed Vercel's function size constraints
- **Decision**: Abandoned due to fundamental Vercel serverless incompatibility

**pdf-to-png-converter Migration Attempt (V1.5 - Failed)**:
- ✅ **Zero Dependencies**: No system binaries required, perfect for serverless deployment
- ✅ **Easy Integration**: Successful webpack configuration and Next.js compatibility
- ✅ **Performance**: Fast installation and no cold start penalties
- ❌ **Academic PDF Failure**: Font rendering errors on complex academic documents
- ❌ **Critical Error**: `Value is non of these types 'String', 'Path'` in PDF.js font handling
- ❌ **Target Use Case**: Failed on the exact content we need to process (academic papers)
- **Decision**: Abandoned after comprehensive quality testing revealed fundamental limitations

**Key Lessons**:
1. **Serverless Constraints**: System dependencies are non-starters for Vercel deployment
2. **Academic PDF Complexity**: Standard PDF.js struggles with academic document fonts/glyphs
3. **Quality Gates**: Always test with real target content before committing to approach
4. **Research Value**: Failed approaches provided valuable insights for final solution selection

### Direct PDF API Research Summary (June 2025)

**Claude (Anthropic) API PDF Support**:
- ✅ **Full PDF Support**: claude-3-5-sonnet-20241022 with `"anthropic-beta": "pdfs-2024-09-25"` header
- **File Limits**: 32MB max size, 100 pages max, up to 5 PDFs per request  
- **Academic Quality**: Excellent for equations, tables, complex layouts
- **Pricing**: $3 input / $15 output per million tokens, ~1,500-3,000 tokens per page
- **Integration**: Base64 upload or Files API (`"anthropic-beta": "files-api-2025-04-14"`)

**Gemini (Google) API PDF Support**:
- ✅ **Full PDF Support**: Gemini 2.0 Flash, 1.5 Pro/Flash via Vertex AI, Firebase AI
- **File Limits**: Up to 2GB per file (Gemini 2.0), 1,500 pages supported
- **Context**: 1-2 million tokens (much larger than Claude)
- **Pricing**: $0.35/M tokens (Gemini Flash 1.5) - **10x cheaper than Claude**
- **Integration**: Cloud Storage URI, Base64, Firebase file upload

**GraphicsMagick Serverless Research (Definitive)**:
- ❌ **Not Possible on Vercel**: 50MB function limit, no system binaries
- ❌ **No Bundling Solutions**: Vercel lacks AWS Lambda-style layers
- ❌ **No Container Support**: Vercel doesn't support Docker deployment
- ✅ **WebAssembly Alternative**: magick-wasm available but limited functionality
- ✅ **Cloud APIs**: Cloudinary, Imgix as external processing services

**PDF Image Extraction Solutions (2025)**:
- **PyMuPDF**: Best quality, works in Vercel Python functions, native resolution preservation
- **PDF.js**: Client-side extraction, zero server cost, good for web workflows  
- **GROBID**: AI-powered academic figure detection, 68 fine-grained document labels
- **Cloud APIs**: AWS Textract ($0.0015/page), Google Document AI (98% accuracy)
- **Academic Tools**: PDFFigures 2.0 (Allen Institute), ChatExtract (LLM-based)

### Original PDF Conversion Research Summary
The comprehensive research in `docs/PDF_TO_HTML_CONVERSION.md` evaluated:

**PDF Conversion Libraries**:
- **pdf-to-png-converter**: Zero dependencies, ideal for serverless deployment, Node.js 20+ requirement
- **pdf2pic**: High adoption but requires GraphicsMagick/Ghostscript, production deployment complexity
- **pdf-img-convert**: Limited adoption, still requires external dependencies

**LLM Performance Benchmarks (2025)**:
- **Claude 4 Sonnet**: 72.7% SWE-bench accuracy, superior structured reasoning for academic content
- **Gemini 2.5 Pro**: 84% GPQA Diamond, 86.7% AIME 2025, 1M+ token context, 3x cost efficiency
- **Cost Analysis**: ~$0.10-0.20 per page for high-resolution vision processing
- **Direct PDF Processing**: $0.045-0.09 per page (Claude), $0.0105-0.021 per page (Gemini)

**Figure Detection Capabilities**:
- **Gemini Pro/2.5**: Only LLM with native coordinate support (1000x1000 scale)
- **Claude 4/GPT-4**: No native bounding box detection, requires approximate methods
- **VILA Approach**: 95% text block classification, 90% object recognition for academic figures

### Key Design Decisions for V2 Approach (Direct PDF Processing)

**Direct PDF Upload**: Eliminates conversion complexity and improves text extraction quality by sending PDFs directly to Claude/Gemini APIs. Provides better format preservation and faster processing.

**API Selection Strategy**:
- **Claude**: Premium quality for complex academic analysis, superior equation recognition
- **Gemini**: Cost-effective alternative, larger context windows for long papers
- **Hybrid**: Route based on document complexity and processing requirements

**Academic Content Optimization**:
- **Native PDF Processing**: Better text extraction and formatting preservation
- **Visual Elements**: APIs handle embedded images, charts, and figures natively  
- **Mathematical Content**: Direct equation recognition without conversion artifacts
- **Multi-page Support**: Full document context vs single-page limitations

**Cost Optimization**: Gemini offers 10x cost savings over Claude for bulk processing, with caching and complexity-based routing for optimal cost/quality balance.

### Original V1 Design Decisions (Image-Based Processing)

**Single-Page Constraint**: Limits scope and complexity while ensuring fast processing and reliable results. Academic papers often have dense single-page excerpts that demonstrate all key challenges (tables, equations, multi-column).

**Raw HTML Output**: Display converted HTML directly to user rather than integrating with document system. This allows immediate validation of conversion quality and iterative prompt improvement.

**Academic Content Handling**:
- **Tables**: Preserve `<table>` structure with proper `<th>` and `<td>` markup
- **Multi-column**: Trust Claude 4's reading order detection (left-to-right, top-to-bottom)
- **Equations**: Convert to HTML entities or MathML where feasible, fallback to text
- **Page Numbers**: Ignore for single-page constraint (headers/footers irrelevant)

**Accuracy First**: Use Claude 4 Sonnet exclusively for maximum structured reasoning capability, accepting higher cost for better academic content preservation.

### Alternative Solutions Evaluated (June 2025)

**Serverless PDF Processing Options**:
1. **Mathpix Convert API**: $0.01-0.04/page, excellent equation OCR, academic-focused
2. **Adobe PDF Extract API**: $0.05/page, strong table extraction, enterprise reliability
3. **AWS Textract**: $1.50/1,000 pages, good layout analysis, limited equation support
4. **Client-side PDF.js**: Free, browser-based, moderate quality, font rendering limitations

**Image Extraction Approaches**:
1. **PyMuPDF**: Python-based, highest quality, works in Vercel Python functions
2. **PDF.js + Canvas**: JavaScript, client-side, zero server cost, moderate quality
3. **GROBID**: AI-powered academic focus, excellent figure detection, requires containerization
4. **Cloud APIs**: AWS/Google/Azure, reliable but per-page costs, enterprise features

**WebAssembly Solutions**:
- **magick-wasm**: ImageMagick compiled to WASM, client-side processing, 2x performance gains
- **MuPDF WebViewer**: C compiled to WASM, 1.5MB compressed, full PDF specification
- **Tesseract.js v2**: Client-side OCR, good for embedded text in figures