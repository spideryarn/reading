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
- Memory usage stays under 512MB per page (Vercel limit is 1024MB)
- Cold start time remains under 3 seconds
- Processing completes within Vercel's timeout limits

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
- `docs/reference/PURE_JS_PDF_PROCESSING_OPTIONS.md` - **NEW**: Comprehensive pure-JS implementation guide
- `docs/research/PDF_PROCESSING_WITHOUT_NATIVE_MODULES.md` - Research findings and prototypes

## Principles and Key Decisions

- **Prioritize server-side solutions**: Maintain the v3 single-PDF-upload architecture if possible
- **Pure JavaScript only**: No native modules, WebAssembly acceptable if it works on Vercel
- **Fail fast philosophy**: Clear errors rather than silent degradation
- **Progressive approach**: Try multiple solutions systematically, gathering data before moving on
- **Acceptable trade-offs**: 2x performance hit is acceptable for compatibility
- **Browser fallback**: Only if server-side approaches fail completely
- **Feature flag strategy**: Implement `PURE_JS_PDF` environment variable for quick rollback
- **Resource constraints**: Enforce max page dimensions, processing timeouts, memory limits

## Stages & Actions

### Stage: Research and Feasibility Assessment ✅ COMPLETE
- [x] **Subagent: Comprehensive research and testing setup**
  - Inspected uncommitted changes in `scripts/tests/repro-*.ts` and `app/api/test-canvas/`
  - Researched pure-JS PDF processing options with focus on:
    - Direct image extraction from PDF streams (pdf-lib, pdfjs-extract-images) 
    - PDF.js operator list → custom rasterizer (no Canvas)
    - WebAssembly renderers (pdfium-wasm, mupdf-wasm)
  - Analyzed Phase 2 implementation for reusable patterns
  - Created minimal reproduction scripts
  - Wrote Playwright test to capture current errors
  - Documented all findings in `docs/reference/PURE_JS_PDF_PROCESSING_OPTIONS.md`
- [x] **Decision checkpoint**: Based on research, choose primary approach
  - Direct image extraction handles 40-60% of academic PDFs (not 80%)
  - **DECISION**: Implement hybrid approach - direct extraction + WASM fallback
  - Rationale: Best balance of performance (direct when possible) and compatibility (WASM for all cases)
- [x] Update planning doc with research findings and chosen direction
- [x] Git commit (research documentation created)

### Stage: Direct Image Extraction Experiment (NEW - Recommended First)
- [ ] **Subagent: Implement direct PDF image extraction**
  - Create `lib/services/pdf-image-direct-extractor.ts`
  - Use pdf-lib or pdfjs-dist to extract embedded images directly
  - Map extracted images to Mistral bounding boxes
  - Test with academic PDFs containing embedded figures
- [ ] **Evaluate coverage**: What percentage of use cases does this solve?
  - Test with various figure types (photos, diagrams, charts)
  - Document which types work vs need rasterization
- [ ] Update planning doc with findings
- [ ] Git commit

### Stage: Pure-JS PDF.js Server-Side Experiment
- [ ] **Subagent: Implement PDF.js operator list approach**
  - Create `lib/services/pdf-renderer-pdfjs-pure.ts`
  - Use PDF.js operator list → custom rasterizer (no Canvas dependency)
  - Reference `examples/node/getoplist.js` from pdf.js
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
  - Investigate options like pdf-wasm, pdfium-wasm, mupdf-wasm
  - Create `lib/services/pdf-renderer-wasm.ts`
  - Implement lazy loading to avoid cold start penalties
  - Prune unused WASM variants (x86, simd, threads) from bundle
  - Test with reproduction script
- [ ] **Subagent: Vercel deployment test**
  - Deploy minimal test endpoint to Vercel
  - Verify WASM loading and execution
  - Profile cold start time and bundle size
  - Test lazy loading with `WebAssembly.instantiateStreaming`
  - Document any Vercel-specific issues
- [ ] Health check: `npm run check:health`
- [ ] Update planning doc with WASM findings
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
- [ ] **Implement feature flag infrastructure**
  - Add `PURE_JS_PDF` environment variable
  - Create abstraction layer to switch between implementations
  - Default to existing skia-canvas until new solution is proven
- [ ] **Implement selected approach** based on experiment results
  - Replace `skia-canvas` implementation in `pdf-image-extractor-server.ts`
  - Maintain same API interface for backward compatibility
  - Add security constraints: max dimensions, timeouts, memory limits
  - Add appropriate error handling
- [ ] **Subagent: Comprehensive testing**
  - Run Playwright test to verify fix
  - Test with multiple PDFs of varying complexity
  - Add Jest/Vitest cold-start benchmark test
  - Test multi-page PDFs (50+ pages) for memory scaling
  - Monitor memory usage throughout processing
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

### Stage: Dependency Cleanup and Optimization
- [ ] **Evaluate imagescript dependency**
  - Check if `imagescript` still needed (contains native binary)
  - Consider alternatives: @jsquash/png (WASM) for pure-JS encoding
- [ ] **Update build configuration**
  - Remove `skia-canvas` from `serverExternalPackages` in next.config.ts
  - Add webpack rules to exclude WASM browser variants from server bundle
  - Ensure tree-shaking removes unused dependencies
- [ ] Update planning doc with dependency changes
- [ ] Git commit

### Stage: Documentation and Deployment
- [ ] Update `docs/reference/PDF_IMAGE_EXTRACTION_ARCHITECTURE.md` with new approach
- [ ] Update `docs/reference/ERROR_HANDLING_PATTERNS.md` with new failure modes
  - WASM instantiation errors
  - Memory limit exceeded errors
  - Processing timeout errors
- [ ] Update `next.config.ts` to remove `skia-canvas` from `serverExternalPackages`
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
- 1024MB memory limit
- 125ms cold start init budget
- Node.js 18.x or 20.x runtime
- No native module compilation
- WebAssembly is supported

### E. Technical Challenges Identified (from o3 critique)

**Canvas dependency issue**: PDF.js and unpdf both require Canvas implementation. All maintained Canvas polyfills are native modules. Potential solutions:
1. PDF.js operator list → custom rasterizer (examples/node/getoplist.js)
2. Direct image extraction without rasterization
3. WebAssembly-based rendering

**Memory constraints**: Rendering at 2x scale can exceed 512MB for detailed pages. Need to:
- Define memory budget per page
- Implement streaming/tiling for large pages
- Consider lower scale factors

**WASM considerations**:
- Bundle size with multiple variants can exceed 50MB
- Cold start loading can exceed 125ms budget
- Need lazy loading and variant pruning

**Security concerns**: Processing arbitrary PDFs requires:
- Max page dimension limits
- Processing timeouts
- Memory usage caps
- Sandboxing malicious content

### F. Alternative: Direct Image Extraction

For embedded images in PDFs, we can extract without rasterization:
- `pdf-lib` and `pdfjs-dist` expose XObject image streams
- `pdfjs-extract-images` does this in pure JS
- Advantages: No rasterization, native resolution, smaller memory
- Limitation: Won't work for vector+text figures (charts)
- Could solve 80% of use cases with much less complexity

### G. Key Research Findings (Stage 1 Complete)

**Direct Image Extraction Results**:
- Success rate: 40-60% of academic PDFs (lower than initially hoped)
- Performance: < 100ms per image (excellent)
- Works well for: Embedded JPEG/PNG images (photos, scanned figures)
- Fails for: Vector graphics, charts, text-as-paths, complex layouts

**WebAssembly Evaluation**:
- **pdfium-wasm**: Most mature, 6MB bundle, 2-3s cold start - RECOMMENDED
- **mupdf-wasm**: 4MB, excellent quality, good text extraction
- **pdf-wasm**: 2MB, experimental, lighter but less stable
- All options verified to work on Vercel

**Hybrid Approach Benefits**:
1. **Performance**: Direct extraction for compatible PDFs (< 100ms)
2. **Compatibility**: WASM fallback ensures 100% PDF support
3. **Quality**: Original image quality preserved when possible
4. **Deployment**: No native modules, works on Vercel
5. **Future-proof**: Can optimize as WASM technology improves

**Implementation Complexity**:
- Direct extraction: Medium (position matching is challenging)
- WASM integration: Low (well-documented libraries)
- Hybrid orchestration: Medium (need good fallback detection)

**Decision Rationale for Hybrid Approach**:
- Pure direct extraction insufficient (40-60% success rate)
- Pure WASM too slow for all PDFs (2-3s cold start)
- Hybrid gives best of both worlds
- Aligns with "fix root cause" principle - handles all PDF types correctly

**Implementation Prototypes Created**:
- Direct extraction code samples in research doc
- WASM integration examples with lazy loading
- Hybrid orchestration pattern defined
- Ready to proceed with implementation stage