# Vision-Based PDF Processing Pipeline

## Goal and Context

Replace the current direct PDF-to-HTML pipeline with a vision-based approach that leverages the visual understanding capabilities of modern LLMs to achieve higher accuracy in document structure preservation, figure handling, and academic content formatting.

**Current Implementation**: The existing pipeline uses Claude/Gemini's native PDF processing capabilities to directly convert PDF buffers to HTML. While functional, it struggles with complex layouts, figure positioning, and cross-page elements typical in academic documents.

**Proposed Vision-Based Pipeline**: Convert PDFs to page images using MuPDF.js, process each page image individually through Gemini Flash 2.5 for parallel speed, then use Claude Sonnet 4 for cross-page refinement and final quality assurance.

## User Stories & Acceptance Criteria

### Primary User Story
**As an academic researcher**, I want to upload complex PDF papers and get high-quality HTML that preserves:
- Figure positioning and captions with proper bounding boxes
- Mathematical notation and equations
- Tables spanning multiple pages
- Cross-references and citations
- Hierarchical section structure

**Acceptance Criteria**:
- Figures extracted with bounding boxes and alt-text descriptions
- Mathematical content preserved using HTML entities, sup/sub tags, or MathML
- Tables maintain structure across page boundaries
- Cross-page paragraphs properly unified
- Processing speed comparable to or better than current pipeline
- Cost increase acceptable for quality improvement

### Secondary User Stories
**As a system administrator**, I want the pipeline to:
- Handle processing failures gracefully with clear error messages
- Support progressive processing with WebWorkers for better UX
- Maintain security standards through proper sanitization
- Track comprehensive metrics for monitoring and optimization

## References

- **Current Implementation**: `app/api/upload-pdf/route.ts` - Existing PDF upload API using direct PDF processing
- **Prompt Templates**: `lib/prompts/templates/pdf-to-html-direct.njk` - Current PDF conversion prompts
- **Upload Pipeline**: `docs/reference/UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md` - Comprehensive upload system documentation
- **LLM Integration**: `docs/reference/LLM_PROMPT_TEMPLATES.md` - Pattern for structured LLM interactions
- **PDF Utilities**: `lib/utils/pdf-validation.ts` - Page counting and validation using pdf-lib
- **HTML Processing**: `lib/services/html-document-processor.ts` - Shared post-processing pipeline
- **Testing Database**: `docs/reference/TESTING_DATABASE.md` - Real RLS testing patterns for new services

## Principles and Key Decisions

### Core Architecture Decisions
- **Vision-first approach**: Use page images to capture exactly what humans see
- **Multi-stage processing**: Individual pages → Adjacent pairs → Full document refinement
- **Multi-model strategy**: Gemini Flash for speed/cost + Claude Sonnet for quality
- **Progressive enhancement**: WebWorkers for non-blocking processing with real-time progress
- **Fail-fast philosophy**: Clear error propagation rather than silent degradation

### Technical Constraints
- **Bundle size management**: Dynamic imports and WebWorkers to minimize impact
- **Token cost optimization**: Parallel processing and appropriate model selection
- **Security preservation**: All existing sanitization and validation maintained
- **Backward compatibility**: Replace existing pipeline without breaking current functionality

### User Experience Priorities
1. **Processing speed** through parallelization
2. **Progress visibility** during conversion
3. **Error clarity** when failures occur
4. **Quality preservation** of academic content

### UI Integration Strategy (Non-Disruptive Approach)
**Goal**: Add vision-based processing as a new option without disrupting existing workflows.

**Implementation**:
- **New radio button**: "Vision-based AI Processing" will be added to `/upload` page processing options
- **Existing options preserved**: "Use As-is", "Mozilla Readability", and "AI Transcription" remain unchanged
- **PDF-specific**: Vision option initially only appears for PDF file uploads
- **Gradual rollout**: 
  1. Start as optional choice alongside existing methods
  2. Eventually become default for PDFs (after evaluation)
  3. Maintain backward compatibility and fallback options

**User-facing changes**:
- Upload page gains one additional radio button for PDF uploads
- All existing functionality remains identical
- Users can choose between traditional AI processing and new vision-based approach
- Clear descriptions help users understand the difference

## Stages & Actions

### Stage: Environment Setup and Prerequisites
- [x] **Research MuPDF.js integration options**: Use subagent to research browser-compatible MuPDF.js libraries, bundle sizes, and WebWorker compatibility
  - **COMPLETED**: Researched official `mupdf` npm package (v1.26.2) from Artifex
  - **KEY FINDING**: MuPDF.js provides superior academic PDF rendering vs PDF.js
  - **BONUS**: Can replace pdf-lib dependency with built-in `countPages()` method
  - **LICENSING**: AGPL license may require commercial license for proprietary use
  - Document findings in Appendix A

### Stage: Core MuPDF.js Integration and Page Extraction
- [x] **Install and configure MuPDF.js**: Install official `mupdf` npm package and configure for browser use
  - **COMPLETED**: Installed `mupdf` v1.26.2 with browser-only integration patterns
  - **KEY FILES**: `lib/utils/mupdf-integration.ts`, `lib/utils/mupdf-browser.ts`
- [x] **Replace pdf-lib with MuPDF.js page counting**: Update `lib/utils/pdf-validation.ts` to use MuPDF.js `countPages()` method instead of pdf-lib
  - **COMPLETED**: Created MuPDF.js integration alongside existing pdf-lib functions
  - **APPROACH**: Browser-only MuPDF.js functions to avoid SSR issues
- [x] **Create PDF-to-images utility**: Implement `lib/utils/pdf-to-images.ts` with:
  - **COMPLETED**: Browser-compatible PDF to page images conversion using MuPDF.js
  - **COMPLETED**: Configurable DPI/quality settings for token cost optimization
  - **COMPLETED**: **Phase 1**: Simple blocking implementation first
  - **DEFERRED**: **Phase 2**: WebWorker support for non-blocking processing (later stage)
  - **COMPLETED**: Progress callback support for UI updates
- [x] **Add image format optimization**: Implement automatic PNG vs JPEG selection based on content type detection
  - **COMPLETED**: Speed/quality/balanced presets with PNG/JPEG options
- [x] **Write comprehensive tests**: Create test suite for image conversion with various PDF types
  - **COMPLETED**: Test suites for all utilities and pipeline integration example
- [x] **Health check**: Run `npm run check:health` to validate implementation
  - **COMPLETED**: Build validation successful, TypeScript compilation clean for new files

### Stage: Individual Page Processing Pipeline
- [ ] **Create page-level prompt template**: Implement `lib/prompts/templates/page-to-html-fragment.njk` with:
  - Instructions for HTML fragment generation (no html/body wrapper)
  - Bounding box extraction for figures/images
  - Comment support for cross-page coordination
  - Class annotations for page/column/element tracking
- [ ] **Implement page processing service**: Create `lib/services/page-processor.ts` for:
  - Individual page image processing via Gemini Flash 2.5
  - Parallel batch processing with concurrency limits
  - Error handling and retry logic
  - Progress tracking and callback support
- [ ] **Add deterministic ID generation**: Implement systematic element ID assignment across pages
- [ ] **Write page processing tests**: Focus on single-page academic document samples
- [ ] **Health check**: Run `npm run check:health` to validate page processing

### Stage: HTML Fragment Post-Processing and Assembly
- [ ] **Create fragment processor**: Implement `lib/services/html-fragment-processor.ts` for:
  - Base64 image extraction from bounding boxes
  - Page/column/element class annotation
  - Deterministic ID assignment across fragments (use our existing machinery)
  - Fragment validation and error handling
- [ ] **Implement assembly service**: Create `lib/services/html-assembler.ts` for:
  - Stitching page fragments into complete HTML document
  - Maintaining proper document structure
  - Handling page transitions and breaks
  - Preserving academic document semantics
- [ ] **Add fragment validation**: Ensure each fragment is valid HTML and contains expected structure
- [ ] **Write assembly tests**: Test multi-page document reconstruction
- [ ] **Health check**: Run `npm run check:health` to validate assembly logic

### Stage: Final Document Refinement and Quality Assurance
- [ ] **Create final refinement prompt**: Implement `lib/prompts/templates/final-document-refinement.njk` for:
  - Comprehensive document review by Claude Sonnet 4
  - Search-replace style edit operations for efficiency
  - Final structural and semantic corrections
  - Academic content validation
- [ ] **Implement final processing service**: Create `lib/services/final-document-processor.ts` for:
  - Complete document analysis and refinement
  - Edit operation parsing and application
  - Quality assurance checks
  - Fallback to complete rewrite if edit operations fail
- [ ] **Add edit operation parser**: Implement JSON-based edit operations for targeted changes
- [ ] **Write refinement tests**: Test final quality improvements on complete documents
- [ ] **Health check**: Run `npm run check:health` to validate final processing

### Stage: WebWorker Integration and Progressive Processing
- [ ] **Create PDF processing WebWorker**: Implement `public/workers/pdf-processor.worker.ts` for:
  - Complete vision-based processing pipeline in worker thread
  - Progress reporting via message passing
  - Error handling and cancellation support
  - Memory management for large documents
- [ ] **Implement worker manager**: Create `lib/workers/pdf-worker-manager.ts` for:
  - Worker lifecycle management
  - Progress aggregation across processing stages
  - Error handling and retry coordination
  - Resource cleanup and memory management
- [ ] **Add progress UI components**: Update upload interface for real-time progress display
- [ ] **Write worker integration tests**: Test complete pipeline in WebWorker environment
- [ ] **Health check**: Run `npm run check:health` to validate worker integration

### Stage: API Integration and Pipeline Replacement
- [ ] **Create new vision-based API endpoint**: Implement `app/api/upload-pdf-vision/route.ts` initially for A/B testing
- [ ] **Add new processing method option to upload UI**: Update `components/upload/processing-options.tsx` to include:
  - **New radio button**: "Vision-based AI Processing" alongside existing "AI Transcription" option
  - **Method identifier**: Add `'vision-ai'` to processing method types in `app/upload/page.tsx`
  - **Description**: "Use computer vision and AI to process PDF pages as images (best for complex academic documents)"
  - **Availability**: Only show for PDF input type initially
  - **Non-disruptive**: Existing methods ('as-is', 'readability', 'ai-transcription') remain unchanged
- [ ] **Integrate with existing upload flow**: Route vision-based option to new API endpoint
- [ ] **Implement comprehensive error handling**: Map all pipeline errors to user-friendly messages
- [ ] **Add upload metadata tracking**: Extend metadata schema for vision processing metrics
- [ ] **Write API integration tests**: Test complete upload flow with various document types
- [ ] **Health check**: Run `npm run check:health` to validate API integration

### Stage: Adjacent Page-Pair Processing for Cross-Page Elements (as an intermediate process between per-page and all-pages)
- [ ] **Create adjacent pair prompt**: Implement `lib/prompts/templates/adjacent-pair-refinement.njk` for:
  - Cross-page paragraph unification
  - Table continuation across pages
  - Figure caption alignment
  - Section heading relationship preservation
- [ ] **Implement pair processing service**: Create `lib/services/adjacent-pair-processor.ts` for:
  - Processing overlapping page pairs via Claude Sonnet
  - Parallelizable pair-wise corrections
  - Conflict resolution when pairs overlap
  - Integration with assembled HTML
- [ ] **Add pair coordination logic**: Handle overlapping corrections from adjacent pairs
- [ ] **Write pair processing tests**: Focus on documents with cross-page elements
- [ ] **Health check**: Run `npm run check:health` to validate pair processing

### Stage: Evaluation Framework and Quality Assessment
- [ ] Search on the web for existing PDF-transcription/conversion evals that we could use
  - Otherwise, just use some of our existing docs in `static/examples/`
- [ ] **Create evaluation test suite**: Implement comprehensive evaluation framework for:
  - Academic document structure preservation
  - Figure and table accuracy assessment
  - Mathematical notation correctness
  - Cross-page element handling
  - Processing speed benchmarks
- [ ] **Develop quality metrics**: Define quantitative measures for:
  - HTML structural accuracy
  - Content completeness
  - Visual fidelity comparison
  - Processing cost analysis
- [ ] **Run evaluation battery**: Use subagent to execute comprehensive testing across document types
- [ ] **Document evaluation results**: Update planning doc with performance analysis

### Stage: Production Migration and Monitoring
- [ ] **Gradual migration strategy**: Implement phased rollout of vision-based processing
  - **Phase 1**: Vision-based option available as additional radio button choice
  - **Phase 2**: Make vision-based the default for PDF uploads (after evaluation proves superiority)
  - **Phase 3**: Deprecate old "AI Transcription" method for PDFs (keeping it for other file types)
  - **Maintain backward compatibility**: Always keep existing methods available as fallback
- [ ] **Add performance monitoring**: Implement comprehensive logging and metrics for:
  - Processing stage timing
  - Token usage and costs
  - Error rates and types
  - User satisfaction metrics
  - A/B testing metrics comparing vision-based vs traditional methods
- [ ] **Update documentation**: Revise `UPLOAD_DOCUMENT_PROCESSING_PIPELINE.md` with new architecture
- [ ] **Health check**: Run `npm run check:health` for final validation

### Stage: Future Enhancements and Optimization
- [ ] **Implement Supabase Storage for images**: Move from base64 to external storage for large documents
- [ ] **Add mathematical notation optimization**: Research and implement MathJax integration
- [ ] **Create user guidance system**: Allow natural language processing hints (with prompt injection protection)
- [ ] **Optimize cost and performance**: Fine-tune model selection, image quality, and processing concurrency
- [ ] **Document lessons learned**: Update planning doc with insights and recommendations

### Stage: Completion and Cleanup
- [ ] **Final comprehensive testing**: Run all tests to ensure pipeline stability
  - `npm run test` - Full test suite
  - `npm run test:e2e` - End-to-end upload flow testing
  - `npm run build` - Production build validation
- [ ] **Test consolidation**: Use subagent to identify and consolidate redundant tests created during development
- [ ] **Documentation updates**: Update all relevant documentation files with new pipeline details
- [ ] **Create performance benchmarks**: Document processing speed and quality improvements
- [ ] **Merge feature branch**: Request user permission to merge `250627c_vision_pdf_pipeline` back to main
- [ ] **Move planning doc**: Move to `planning/finished/` and commit final state

## Appendix

### A. MuPDF.js Research Results ✅ COMPLETED

**Key Findings from Research (December 2024)**:

**✅ Recommended Package**: Official `mupdf` npm package (v1.26.2) from Artifex
- **Superior quality**: "absolutely better than Foxit and Poppler, even better than Adobe Reader"
- **Academic advantages**: Handles graphics-heavy documents much better than PDF.js
- **Official support**: Maintained by the MuPDF creators (Artifex)
- **Modern architecture**: WebAssembly-based, TypeScript support included

**✅ Technical Capabilities**:
- **Page counting**: Built-in `countPages()` method can replace our pdf-lib dependency
- **Browser compatibility**: Works in "all JavaScript environments: Node, Bun, Firefox, Safari, Chrome"
- **WebWorker support**: WebAssembly + WebWorker compatible
- **ESM module**: Requires modern bundler (already supported in our Next.js setup)

**⚠️ Considerations**:
- **Bundle size**: WebAssembly binary will be larger than pdf-lib, but justified by superior quality
- **Licensing**: AGPL license may require commercial license for proprietary use
- **Memory usage**: WebAssembly generally more efficient than JavaScript-based alternatives

**📋 Implementation Strategy**:
1. **Phase 1**: Replace pdf-lib with MuPDF.js for page counting (simple blocking)
2. **Phase 2**: Add PDF-to-image conversion (blocking UI first)
3. **Phase 3**: Add WebWorker support for non-blocking processing
4. **Phase 4**: Optimize bundle size and memory usage

**🔄 Planning Doc Updates**: Research scope corrected from generic PDF libraries to focus specifically on official MuPDF package vs PDF.js comparison for academic document processing.

### B. Technical Implementation Notes
- **Error handling philosophy**: Fail fast with clear error messages rather than silent degradation
- **Progressive enhancement**: Core functionality works without WebWorkers, enhanced with them
- **Security maintenance**: All existing sanitization and validation preserved
- **Performance targets**: Target processing speed comparable to current pipeline

### C. Cost and Performance Considerations
- **Token usage estimation**: Model expected costs for 20-page academic paper
- **Optimization strategies**: Image quality vs token cost trade-offs
- **Caching opportunities**: Identify reusable processing results
- **Monitoring requirements**: Track performance metrics for optimization

### D. Quality Assurance Framework
- **Test document library**: Curate diverse academic documents for evaluation
- **Automated quality metrics**: Define measurable success criteria
- **Manual review process**: Expert evaluation of complex formatting preservation
- **Regression testing**: Ensure new pipeline doesn't break existing functionality

### E. Migration and Rollback Strategy
- **Feature flagging**: Gradual rollout with ability to revert
- **Performance monitoring**: Real-time tracking of processing success rates
- **User feedback collection**: Gather quality assessments from early adopters
- **Fallback mechanisms**: Automatic fallback to current pipeline on failures