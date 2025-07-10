# Pure JS PDF Image Extraction for Server-Side Processing

## Goal and Context

Replace the native `skia-canvas` dependency in the Mistral OCR PDF processing pipeline with a pure JavaScript solution that works both on local development (Mac) and Vercel Serverless Functions. This preserves the v3 pipeline's advantages: single native PDF upload (smaller, faster, simpler) and better handling of cross-page content (tables, paragraphs).

**Current Problem**: The `pdf-image-extractor-server.ts` service uses `skia-canvas` (native module) which causes NODE_MODULE_VERSION mismatch errors on Vercel. The service is critical for extracting image regions from PDFs based on bounding boxes returned by Mistral OCR.

**Desired Solution**: Find a pure-JS approach that can render PDF pages and extract image regions server-side, maintaining compatibility across environments without native dependencies.

## User Stories & Acceptance Criteria

### Primary User Story
**As an academic researcher**, I want to upload a single native PDF and have all images extracted automatically so that:
- I can upload smaller files (native PDFs vs multiple page images)
- Processing is faster and simpler (single upload)
- Cross-page content (tables, paragraphs) is handled correctly
- It works reliably on both development and production environments

**Acceptance Criteria**:
- Native PDF upload works without NODE_MODULE_VERSION errors on Vercel
- Image regions are extracted based on Mistral-provided bounding boxes
- Extracted images are uploaded to Supabase Storage with appropriate filenames
- HTML fragments have img src URLs updated to reference stored images
- Performance is acceptable (within 2x of current native module approach)
- No quality degradation that would impact readability of academic figures/charts

### Secondary User Story
**As a developer**, I want a pure-JS solution that:
- Works identically on Mac development and Vercel production
- Doesn't require complex build configurations or native module compilation
- Can be easily debugged and maintained
- Provides clear error messages when extraction fails

## References

- `docs/planning/250628a_vision_pdf_image_extraction_to_supabase_storage.md` - Comprehensive vision pipeline planning including Phase 2 architecture
- `lib/services/pdf-image-extractor-server.ts` - Current implementation using skia-canvas
- `lib/services/mistral-ocr-pdf-processor.ts` - Mistral OCR processor that calls the image extractor
- `docs/reference/CODING_PRINCIPLES.md` - Core development philosophy (fail fast, fix root causes)
- `docs/instructions/RESEARCH_THIS_TOPIC.md` - Instructions for research subagents
- `docs/instructions/DETECTIVE_SCIENTIST_MODE.md` - Systematic debugging approach
- `app/api/upload-pdf-single-page-image/route.ts` - Phase 2 implementation that avoids native modules

## Principles and Key Decisions

- **Prioritize server-side solutions**: Maintain the v3 single-PDF-upload architecture if possible
- **Pure JavaScript only**: No native modules, WebAssembly acceptable if it works on Vercel
- **Fail fast philosophy**: Clear errors rather than silent degradation
- **Progressive approach**: Try multiple solutions systematically, gathering data before moving on
- **Acceptable trade-offs**: 2x performance hit is acceptable for compatibility
- **Browser fallback**: Only if server-side approaches fail completely

## Stages & Actions

### Stage: Initial Setup and Context Gathering
- [ ] **Subagent: Inspect uncommitted changes** - Review any uncommitted files related to canvas/image processing to identify useful code or previous attempts
  - Look for files in `scripts/tests/repro-*.ts` 
  - Check `app/api/test-canvas/` 
  - Identify what's been tried and what might be salvageable
  - Write findings to `docs/working_notes/250710a_ephemeral_canvas_attempts.md`
- [ ] **Subagent: Web research on pure-JS PDF rendering** 
  - Follow `docs/instructions/RESEARCH_THIS_TOPIC.md` and `docs/instructions/WRITE_RESEARCH_DOC.md`
  - Research topics:
    - PDF.js server-side usage (without DOM/Canvas)
    - WebAssembly PDF renderers that work on Vercel
    - Pure-JS image manipulation libraries
    - Alternative PDF-to-image approaches
  - Focus on Vercel compatibility and Node.js constraints
  - Document findings in `docs/reference/PURE_JS_PDF_PROCESSING_OPTIONS.md`
- [ ] **Subagent: Analyze existing Phase 2 implementation** - Study how Phase 2 avoids native modules
  - Review `app/api/upload-pdf-single-page-image/route.ts`
  - Understand client-side PDF rendering approach
  - Identify reusable patterns for server-side
  - Document architecture insights
- [ ] **Subagent: Create Playwright test for current upload flow**
  - Use Playwright MCP to test upload with `static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf`
  - Capture exact error messages and stack traces
  - Write test to `e2e/mistral-ocr-upload-error.spec.ts`
  - This becomes our baseline for knowing when we've fixed the issue
- [ ] **Subagent: Build focused command-line reproduction script**
  - Create `scripts/tests/repro-pdf-extraction-minimal.ts`
  - Isolate the exact failing operation (PDF render + image crop)
  - Remove all unnecessary complexity
  - Make it easy to test different approaches quickly
- [ ] Update planning doc with testing results
- [ ] Git commit

### Stage: Pure-JS PDF.js Server-Side Experiment
- [ ] **Subagent: Implement PDF.js server-side renderer**
  - Create `lib/services/pdf-renderer-pdfjs-pure.ts`
  - Use PDF.js with node-canvas polyfills or virtual canvas
  - Handle Path2D requirements that PDF.js needs
  - Test with reproduction script
- [ ] **Subagent: Performance and quality testing**
  - Compare render quality with current skia-canvas approach
  - Measure performance difference
  - Test with various academic PDFs
  - Document results and viability
- [ ] Health check: `npm run check:health`
- [ ] Update planning doc with experiment results
- [ ] Git commit

### Stage: WebAssembly PDF Renderer Experiment
- [ ] **Subagent: Research and implement WASM PDF renderer**
  - Investigate options like pdf-wasm, pdfium-wasm
  - Create `lib/services/pdf-renderer-wasm.ts`
  - Ensure Vercel compatibility (WASM file serving)
  - Test with reproduction script
- [ ] **Subagent: Vercel deployment test**
  - Deploy minimal test endpoint to Vercel
  - Verify WASM loading and execution
  - Document any Vercel-specific issues
- [ ] Health check: `npm run check:health`
- [ ] Update planning doc with WASM findings
- [ ] Git commit

### Stage: Alternative Server-Side Approaches
- [ ] **Subagent: Investigate PDF-to-SVG conversion**
  - Research pure-JS PDF to SVG libraries
  - Test SVG rendering and image extraction
  - Evaluate quality and performance
- [ ] **Subagent: Explore pre-rendered image extraction**
  - Can we extract embedded images directly from PDF?
  - Would this work for figures/charts?
  - Test with Mistral bounding boxes
- [ ] Update planning doc with alternative approach results
- [ ] Git commit

### Stage: Hybrid Approach Design (if pure server-side fails)
- [ ] **Design hybrid architecture**
  - Keep single PDF upload to server
  - Server processes with Mistral, returns bounding boxes
  - Send minimal data back to browser for image extraction
  - Browser extracts and uploads images asynchronously
- [ ] **Subagent: Prototype hybrid flow**
  - Modify `mistral-ocr-pdf-processor.ts` to skip image extraction
  - Return bounding box metadata to client
  - Reuse Phase 2 client-side extraction code
  - Test end-to-end flow
- [ ] Update planning doc with hybrid approach findings
- [ ] Git commit (if moving forward with hybrid)

### Stage: Implementation of Chosen Solution
- [ ] **Implement selected approach** based on experiment results
  - Replace `skia-canvas` implementation in `pdf-image-extractor-server.ts`
  - Maintain same API interface for backward compatibility
  - Add appropriate error handling
- [ ] **Subagent: Comprehensive testing**
  - Run Playwright test to verify fix
  - Test with multiple PDFs of varying complexity
  - Verify Supabase Storage integration still works
  - Check image quality meets requirements
- [ ] Health check: `npm run check:health --rigorous`
- [ ] Update planning doc with implementation results
- [ ] Git commit

### Stage: Performance Optimization
- [ ] **Profile and optimize** the chosen solution
  - Add performance logging
  - Identify bottlenecks
  - Implement caching if beneficial
- [ ] **Subagent: Load testing**
  - Test with large PDFs (100+ pages)
  - Monitor memory usage
  - Ensure Vercel function limits are respected
- [ ] Update planning doc with optimization results
- [ ] Git commit

### Stage: Documentation and Deployment
- [ ] Update `docs/reference/PDF_IMAGE_EXTRACTION_ARCHITECTURE.md` with new approach
- [ ] Update deployment documentation if any special configuration needed
- [ ] **Subagent: Test on Vercel preview deployment**
  - Deploy to preview environment
  - Test with production-like PDFs
  - Verify no NODE_MODULE_VERSION errors
- [ ] Final health check and test consolidation
- [ ] Git commit following `docs/instructions/GIT_COMMIT_CHANGES.md`
- [ ] Move planning doc to `docs/planning/finished/`

## Appendix

### A. Current Error Details

The NODE_MODULE_VERSION error indicates a mismatch between the Node.js version used to compile `canvas` (or `skia-canvas`) and the runtime version on Vercel. This is a fundamental issue with native modules in serverless environments.

**Example error messages:**

```
{"type":"https://spideryarn.com/problems/PROCESSING_ERROR","title":"Processing error","status":500,"detail":"The module '/Users/greg/dev/spideryarn/reading-worktree1/node_modules/canvas/build/Release/canvas.node'\nwas compiled against a different Node.js version using\nNODE_MODULE_VERSION 127. This version of Node.js requires\nNODE_MODULE_VERSION 137. Please try re-compiling or re-installing\nthe module (for instance, using `npm rebuild` or `npm install`).","correlationId":"5d424e96-6f16-4437-b2aa-fc2fb3bd6f43"}
```

```
{"type":"https://spideryarn.com/problems/PROCESSING_ERROR","title":"Processing error","status":500,"detail":"resolvedCanvasModule.createCanvas is not a function","correlationId":"8c229954-1413-4f55-a518-4d8ed852344f"}
```

### B. Why Pure-JS is Challenging

PDF rendering typically requires:
1. Font rendering capabilities
2. Vector graphics rendering  
3. Image decoding/encoding
4. Complex layout calculations

These are traditionally handled by native libraries for performance reasons.

### C. Trade-offs to Consider

**Server-side pure-JS**:
- ✅ Maintains v3 architecture simplicity
- ✅ Better cross-page content handling
- ❌ Performance impact
- ❌ Limited library options

**Hybrid browser/server**:
- ✅ Leverages browser's native capabilities
- ✅ Proven to work (Phase 2)
- ❌ More complex architecture
- ❌ Additional client-server roundtrips

### D. Vercel Constraints

- 50MB max function size (including dependencies)
- 10s default timeout (configurable to 5 min)
- Node.js 18.x or 20.x runtime
- No native module compilation
- WebAssembly is supported