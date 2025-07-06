# Gemini Native PDF Pipeline (v1.5) - Leveraging Native PDF Processing with Bounding Box Extraction

## Goal

Create a new PDF upload pipeline that leverages Gemini's unique native PDF processing capabilities with built-in bounding box detection, providing a middle ground between the simple v1 pipeline (no image extraction) and the complex v3 vision pipeline (full page-by-page image processing).

### Problem Statement

The current v1 LLM pipeline has critical limitations:
1. **Silent failures from output token exhaustion** - Documents may be truncated without user awareness
2. **No image/figure extraction** - Academic papers lose crucial visual content
3. **Single-shot processing** - No recovery mechanism for large documents
4. **Accuracy issues** - Summarization instead of verbatim transcription

The v3 vision pipeline solves these issues but at significant cost and complexity:
- 4-10x more expensive ($0.10-0.20/page vs $0.01-0.05/page)
- Complex multi-stage processing with image conversion
- Higher latency due to image processing overhead

### Solution Overview

A "Gemini Native" pipeline that:
1. Sends the full PDF directly to Gemini Flash 2.0
2. Receives HTML with normalized bounding box coordinates for all visual elements
3. Extracts images locally using the coordinates (no vision API calls needed)
4. Optionally refines output with Claude for highest quality

This approach provides 80% of v3's benefits at 20% of the cost and complexity.

## Context & Background

### Current Pipeline Comparison

**v1 (LLM Direct)**:
- ✅ Simple: One API call with PDF buffer
- ✅ Fast: No image processing overhead
- ❌ No image extraction
- ❌ Token limit issues (silent truncation)
- ❌ Limited to 20MB (Gemini) or 32MB (Claude)

**v3 (Vision Pipeline)**:
- ✅ Full image extraction with bounding boxes
- ✅ Handles any size PDF via pagination
- ✅ Highest quality output
- ❌ Complex: PDF→Images→Parallel processing→Assembly
- ❌ Expensive: Vision API costs
- ❌ Requires significant client-side processing

**v1.5 (Proposed Gemini Native)**:
- ✅ Image extraction via native bounding boxes
- ✅ Simple: One API call + local extraction
- ✅ Cost-effective: Text API pricing
- ✅ Leverages Gemini's unique coordinate detection
- ❌ Still subject to context limits (but 1M tokens)
- ❌ Gemini-only (no Claude option for initial processing)

### Key Technical Discoveries

From our investigation:

1. **Gemini is the only major LLM with native bounding box support** - Returns normalized coordinates (0-1000 scale) without any fine-tuning or special prompting

2. **Current v1 never checks for output truncation** - The `finishReason` field is stored but ignored, leading to silent failures

3. **The v3 vision prompts are significantly more sophisticated** - Explicit instructions about verbatim transcription, continuation markers, and mathematical formatting

4. **Gemini Flash 2.0 pricing makes this viable** - At $0.075/M input tokens, processing a full PDF is cost-effective

## User Stories & Acceptance Criteria

### As a user uploading an academic PDF:
- I want all text content accurately transcribed without summarization
- I want figures, charts, and diagrams extracted as separate images
- I want to know if my document was too large to process completely
- I want reasonable processing time (under 30 seconds for typical papers)
- I want costs to remain low (under $0.50 for most documents)

### Acceptance Criteria:
1. **Complete content preservation**:
   - All text appears in output (no truncation)
   - Figures are extracted with correct boundaries
   - Mathematical notation is preserved
   - Multi-column layouts are handled correctly

2. **Error handling**:
   - Clear error message if document exceeds token limits
   - Fallback to v3 vision pipeline for unsupported documents
   - No silent failures or partial content

3. **Performance targets**:
   - 20-page PDF processes in < 30 seconds
   - Costs < $0.10 per typical academic paper
   - Images extracted at original resolution

4. **Quality validation**:
   - Output includes metadata about token usage
   - Bounding boxes validated for minimum size
   - HTML structure validated before storage

## References

- `docs/planning/250628a_vision_pdf_image_extraction_to_supabase_storage.md` - Original v3 vision pipeline design with image extraction architecture
- `docs/reference/PDF_TO_HTML_LLM_APPROACHES.md` - Comprehensive analysis of token limit challenges and parallel processing strategies
- `docs/diagrams/250705a_llm_v1_pdf_upload_pipeline.mermaid` - Current v1 pipeline flow showing limitations
- `lib/prompts/templates/pdf-to-html-direct.njk` - Current v1 prompt template to be enhanced
- `lib/prompts/templates/page-to-html-fragment.njk` - v3 vision prompt with bounding box instructions
- `lib/utils/html-fragment-processor.ts` - Bounding box parsing logic from v3
- `lib/utils/image-extractor.ts` - Canvas-based image extraction from v3
- `docs/instructions/WRITE_PLANNING_DOC.md` - Instructions for maintaining planning docs

## Principles & Key Decisions

1. **Fail fast on token limits** - Unlike v1, explicitly detect and report output truncation rather than processing incomplete content

2. **Reuse v3 infrastructure** - Leverage existing bounding box parsing and image extraction code rather than reimplementing

3. **Progressive enhancement** - Start with basic Gemini-only pipeline, add Claude refinement as optional stage

4. **Maintain v1 compatibility** - New pipeline should be a drop-in replacement with same API interface

5. **Cost consciousness** - Target 5-10x cheaper than v3 while providing most benefits

6. **Verbatim transcription** - Adopt v3's explicit anti-summarization prompting

7. **Graceful degradation** - Clear fallback path to v3 for documents that exceed limits

## Stages & Actions

### Stage: Initial Setup & Preparation
- [ ] Run `./scripts/sync-worktrees.ts` in a subagent to pull latest changes from main
- [ ] Review existing v1 implementation to understand integration points
- [ ] Create working branch `250706a_gemini_native_pdf` for this feature

### Stage: Research & Validation
- [ ] Use subagent to research Gemini's latest PDF capabilities and limits
  - Max file size for native PDF input
  - Token counting for PDF content
  - Coordinate system specifications
  - Any breaking changes in Gemini 2.0 Flash
- [ ] Create test PDF with known bounding boxes to validate coordinate extraction
- [ ] Test Gemini's response with explicit bounding box prompting
- [ ] Document findings in Appendix A

### Stage: Immediate v1 Token Limit Fix
- [ ] Add finish reason checking to existing v1 pipeline
  - Check for `finishReason === 'length'` after AI calls
  - Throw descriptive error instead of processing truncated content
  - Add test case for token exhaustion scenario
- [ ] Update error handling to suggest v3 pipeline for large documents
- [ ] Run tests to ensure no regressions
- [ ] Commit this critical fix separately for easy cherry-picking

### Stage: Create Enhanced Prompt Template
- [ ] Create new prompt template `pdf-to-html-gemini-native.njk` based on v1
- [ ] Incorporate key improvements from v3 vision prompt:
  - Explicit verbatim transcription instructions
  - Bounding box format specifications
  - Continuation markers for cross-page content
  - Mathematical notation preservation
- [ ] Add Gemini-specific coordinate instructions (0-1000 scale)
- [ ] Test prompt with sample PDFs to verify bounding box output
- [ ] Compare output quality with v1 and v3 pipelines

### Stage: Implement Core Gemini Native Pipeline
- [ ] Create new API route `/api/upload-pdf-gemini-native` 
- [ ] Implement `GeminiNativePdfProcessor` service class:
  - PDF validation (size, format)
  - Token estimation before processing
  - Gemini API call with native PDF
  - Response parsing and validation
  - Finish reason checking
- [ ] Adapt v3's `HtmlFragmentProcessor` for single-document processing
- [ ] Integrate bounding box parsing from parsed HTML
- [ ] Add comprehensive error handling and logging
- [ ] Write unit tests for processor class

### Stage: Image Extraction Integration
- [ ] Reuse v3's `ImageExtractor` class for local image extraction
- [ ] Create `PdfImageExtractor` wrapper that:
  - Loads PDF into canvas/pdf.js
  - Converts normalized coordinates to pixel coordinates
  - Extracts regions as PNG/JPEG
  - Handles multi-page PDFs
- [ ] Implement parallel image extraction for performance
- [ ] Add progress tracking for large documents
- [ ] Test with various PDF types (single/multi-column, figures, charts)

### Stage: Storage Integration
- [ ] Update document creation to store extracted images
- [ ] Modify HTML to reference extracted images in Supabase storage
- [ ] Ensure proper RLS permissions for image assets
- [ ] Add rollback handling for failed uploads
- [ ] Test end-to-end with real PDFs

### Stage: Cost & Performance Optimization
- [ ] Implement token counting before API calls
- [ ] Add cost estimation display in UI
- [ ] Create fallback logic for documents exceeding limits:
  - If < 1M tokens: Process with Gemini Native
  - If > 1M tokens: Suggest v3 vision pipeline
  - Clear messaging to users about options
- [ ] Add performance metrics logging
- [ ] Run load tests with various document sizes

### Stage: UI Integration
- [ ] Add "Gemini Native (v1.5)" option to upload UI
- [ ] Display cost estimate before processing
- [ ] Show extraction progress for images
- [ ] Add clear messaging about capabilities and limits
- [ ] Use subagent with Playwright to verify UI changes
- [ ] Ensure responsive design works correctly

### Stage: Quality Validation & Testing
- [ ] Create comprehensive test suite:
  - Token limit handling
  - Bounding box accuracy
  - Image extraction quality
  - Error scenarios
  - Performance benchmarks
- [ ] Compare output quality with v1 and v3 for test documents
- [ ] Use subagent to run full test suite
- [ ] Document quality metrics in Appendix B

### Stage: External Critique & Refinement
- [ ] Commit initial implementation
- [ ] Follow `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md`
- [ ] Incorporate feedback from external AI models
- [ ] Update implementation based on critique
- [ ] Commit refined version

### Stage: Optional Claude Refinement Layer
- [ ] Design two-stage processing option:
  - Stage 1: Gemini Native for extraction + bounding boxes
  - Stage 2: Claude for quality refinement (optional)
- [ ] Implement togglable refinement in UI
- [ ] Add cost comparison for with/without refinement
- [ ] Test quality improvements from refinement
- [ ] Document when refinement is recommended

### Stage: Documentation & Monitoring
- [ ] Create `docs/reference/PDF_UPLOAD_GEMINI_NATIVE.md` with:
  - Architecture overview
  - Cost analysis
  - When to use each pipeline (v1, v1.5, v3)
  - Performance characteristics
- [ ] Update `docs/reference/PDF_UPLOAD_PIPELINES_COMPARISON.md`
- [ ] Add monitoring for:
  - Token usage statistics
  - Image extraction success rates
  - Processing times by document size
  - Error frequencies
- [ ] Update logging per `docs/reference/LOGGING_BEST_PRACTICES.md`

### Stage: Migration & Rollout
- [ ] Create migration plan for existing v1 users
- [ ] Add feature flag for gradual rollout
- [ ] Implement A/B testing to compare pipelines
- [ ] Monitor error rates and user feedback
- [ ] Plan for v1 deprecation timeline

### Stage: Final Validation & Cleanup
- [ ] Run comprehensive health check: `npm run check:health --rigorous`
- [ ] Use subagent for test consolidation:
  - Review all tests added
  - Consolidate redundant tests
  - Aim for high coverage with fewer tests
- [ ] Verify all error messages are descriptive
- [ ] Review code for improvement opportunities
- [ ] Get user approval for production deployment
- [ ] Merge branch to main
- [ ] Move planning doc to `docs/planning/finished/`

## Appendix

### A. Gemini PDF Capabilities Research

*To be populated after research stage*

Expected findings:
- Maximum PDF file size for native input
- Token counting methodology for PDFs
- Coordinate system details (0-1000 normalization)
- Rate limits and quotas
- Quality comparison with other models

### B. Quality Metrics & Benchmarks

*To be populated after testing*

Metrics to track:
- Transcription accuracy (vs ground truth)
- Bounding box precision (IoU scores)
- Processing time by page count
- Token usage by document type
- Cost per page breakdown

### C. Example Bounding Box Output

Expected format from Gemini:
```html
<figure data-bbox="125,200,875,600" class="figure-1">
  <figcaption>Figure 1: System Architecture</figcaption>
</figure>
```

Converted to normalized coordinates (0-1):
```javascript
{
  x1: 0.125,
  y1: 0.200,
  x2: 0.875,
  y2: 0.600
}
```

### D. Cost Analysis

Estimated costs per 20-page academic paper:
- **v1 (Current)**: $0.01-0.05 (text only, may truncate)
- **v1.5 (Gemini Native)**: $0.02-0.08 (with image extraction)
- **v1.5 + Claude Refinement**: $0.05-0.12 (highest quality)
- **v3 (Vision)**: $0.10-0.20 (current implementation)

### E. Technical Decisions & Rationale

1. **Why Gemini-only for initial processing?**
   - Only model with native bounding box support
   - 1M token context window handles most documents
   - Cost-effective for full document processing

2. **Why reuse v3 components?**
   - Proven image extraction logic
   - Existing bounding box parsing
   - Reduced implementation risk

3. **Why not streaming?**
   - Bounding boxes need full document context
   - Image extraction requires complete HTML
   - Complexity outweighs benefits for this use case

### F. Risk Mitigation

1. **Risk**: Gemini API changes break coordinate format
   - **Mitigation**: Version lock API, comprehensive tests

2. **Risk**: Token limits still hit for very large documents  
   - **Mitigation**: Clear fallback to v3, upfront validation

3. **Risk**: Image extraction quality inferior to vision API
   - **Mitigation**: Optional Claude refinement stage

4. **Risk**: Users confused by multiple pipeline options
   - **Mitigation**: Clear UI guidance, automatic recommendation