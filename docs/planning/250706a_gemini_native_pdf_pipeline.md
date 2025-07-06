# Gemini Native PDF Pipeline (v3) - Upgrading v1 with Native PDF Processing and Bounding Box Extraction

## Goal

Upgrade the existing v1 PDF upload pipeline to leverage Gemini's unique native PDF processing capabilities with built-in bounding box detection. This upgrade will transform v1 into v3, providing a middle ground between the current simple v1 pipeline (no image extraction) and the complex v2 vision pipeline (full page-by-page image processing).

**Key Decision**: Rather than creating a separate pipeline, we will progressively enhance v1 with new capabilities and rename it to v3, maintaining API compatibility while adding significant new features.

### Problem Statement

The current v1 LLM pipeline has critical limitations:
1. **Silent failures from output token exhaustion** - Documents may be truncated without user awareness
2. **No image/figure extraction** - Academic papers lose crucial visual content
3. **Single-shot processing** - No recovery mechanism for large documents
4. **Accuracy issues** - Summarization sometimes instead of verbatim transcription

The v2 vision pipeline attempts to solve these issues but at significant cost and complexity:
- Complicated and brittle
- Higher latency due to image processing & upload
- More expensive

### Solution Overview

A "Gemini Native" pipeline that:
1. Sends the full PDF directly to Gemini Flash 2.5
2. Receives HTML with normalized bounding box coordinates for all visual elements
3. Extracts images locally using the coordinates (no vision API calls needed)
4. Optionally refines output with Claude for highest quality

This approach provides 80% of v2's benefits at 20% of the cost and complexity.

## Context & Background

### Current Pipeline Comparison

**v1 (LLM Direct)**:
- ✅ Simple: One API call with PDF buffer
- ✅ Fast: No image processing overhead
- ❌ No image extraction
- ❌ Token limit issues (silent truncation)
- ❌ Limited to 20MB (Gemini) or 32MB (Claude)

**v2 (Vision Pipeline)**:
- ✅ Full image extraction with bounding boxes
- ✅ Handles any size PDF via pagination
- ✅ Highest quality output
- ❌ Complex: PDF→Images→Parallel processing→Assembly
- ❌ Expensive: Vision API costs
- ❌ Requires significant client-side processing

**v3 (Proposed Gemini Native)**:
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

3. **The v2 vision prompts are significantly more sophisticated** - Explicit instructions about verbatim transcription, continuation markers, and mathematical formatting

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
   - Fallback to image/vision-based pipeline for unsupported documents?
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

- `docs/planning/250628a_vision_pdf_image_extraction_to_supabase_storage.md` - Original v2 vision pipeline design with image extraction architecture
- `docs/reference/PDF_TO_HTML_LLM_APPROACHES.md` - Comprehensive analysis of token limit challenges and parallel processing strategies
- `docs/diagrams/250705a_llm_v1_pdf_upload_pipeline.mermaid` - Current v1 pipeline flow showing limitations
- `lib/prompts/templates/pdf-to-html-direct.njk` - Current v1 prompt template to be enhanced
- `lib/prompts/templates/page-to-html-fragment.njk` - v2 vision prompt with bounding box instructions
- `lib/utils/html-fragment-processor.ts` - Bounding box parsing logic from v2
- `lib/utils/image-extractor.ts` - Canvas-based image extraction from v2
- `docs/instructions/WRITE_PLANNING_DOC.md` - Instructions for maintaining planning docs

## Principles & Key Decisions

1. **Gradual upgrade approach** - Progressively enhance v1 rather than building a separate pipeline, ensuring working software at each step

2. **Fail fast on token limits** - Unlike current v1, explicitly detect and report output truncation rather than processing incomplete content

3. **Reuse v2 infrastructure** - Leverage existing bounding box parsing and image extraction code rather than reimplementing

4. **Two-stage processing with Claude (Option C)** - Use Gemini for initial extraction with bounding boxes, then optionally refine with Claude for highest quality

5. **Maintain v1 compatibility** - Upgrades should be drop-in replacements with same API interface

6. **Cost consciousness** - Target 5-10x cheaper than v2 while providing most benefits

7. **Verbatim transcription** - Adopt v2's explicit anti-summarization prompting

8. **Graceful degradation** - Clear fallback path to v2 for documents that exceed limits

## Stages & Actions

### Stage: Immediate v1 Token Limit Fix (Critical)
- [ ] Add finish reason checking to existing v1 pipeline
  - Check for `finishReason === 'length'` after AI calls
  - Throw descriptive error instead of processing truncated content
  - Add test case for token exhaustion scenario
- [ ] Update error handling to suggest v2 pipeline for large documents
- [ ] Run tests to ensure no regressions
- [ ] Commit this critical fix separately for easy deployment
- [ ] Deploy fix immediately to prevent silent data corruption

### Stage: Research & Validation
- [ ] Review existing v1 implementation to understand integration points
- [ ] Use subagent to research Gemini's latest PDF capabilities and limits. Stop & discuss questions/concerns with the user immediately if they arise.
  - Max file size for native PDF input
  - Token counting for PDF content
  - Coordinate system specifications
  - Any breaking changes in Gemini 2.0 Flash
- [ ] Create test PDF with known bounding boxes to validate coordinate extraction
- [ ] Test Gemini's response with explicit bounding box prompting
- [ ] Document findings in Appendix A, and discuss with the user

### Stage: Rename v1 to v3
- [ ] Update all references from v1 to v3 in codebase
- [ ] Update UI text to reflect new version
- [ ] Update documentation to explain v3 is the upgraded v1
- [ ] Add migration notes explaining the upgrade

### Stage: Create Enhanced Prompt Template
- [ ] Create new prompt template `pdf-to-html-v3-gemini-native.njk` based on v1
- [ ] Incorporate key improvements from v2 vision prompt:
  - Explicit verbatim transcription instructions
  - Bounding box format specifications
  - Continuation markers for cross-page content
  - Mathematical notation preservation
- [ ] Add Gemini-specific coordinate instructions (0-1000 scale)
- [ ] Test prompt with sample PDFs to verify bounding box output

### Stage: Implement Core Gemini Native Pipeline
- [ ] Update existing `/api/upload-pdf` route to use new processor when appropriate
- [ ] Implement `GeminiNativePdfProcessor` service class:
  - PDF validation (size, format)
  - Token estimation before processing
  - Gemini API call with native PDF
  - Response parsing and validation
  - Finish reason checking
- [ ] Adapt v2's `HtmlFragmentProcessor` for single-document processing
- [ ] Integrate bounding box parsing from parsed HTML
- [ ] Add comprehensive error handling and logging
- [ ] Write unit tests for processor class

### Stage: Image Extraction Integration
- [ ] Reuse v2's `ImageExtractor` class for local image extraction
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
- [ ] Add performance metrics logging
- [ ] Run load tests with various document sizes

### Stage: UI update
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
- [ ] Use subagent to run full test suite
- [ ] Document quality metrics in Appendix B

### Stage: External Critique & Refinement
- [ ] Commit initial implementation
- [ ] Follow `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md`
- [ ] Incorporate feedback from external AI models
- [ ] Update implementation based on critique
- [ ] Commit refined version

### Stage: Optional Claude Refinement Layer (Two-Stage Processing)
- [ ] Implement two-stage processing workflow:
  - Stage 1: Always use Gemini Native for initial extraction + bounding boxes (required)
  - Stage 2: Optionally send Gemini's HTML output to Claude for quality refinement
- [ ] Add refinement option to existing provider selection in UI
  - When user selects Claude, explain it's a two-stage process
  - Show cost breakdown: Gemini extraction + Claude refinement
- [ ] Implement refinement pipeline:
  - Take Gemini's HTML output with bounding boxes
  - Send to Claude with refinement prompt
  - Preserve bounding box data during refinement
- [ ] Test quality improvements from refinement
- [ ] Document when refinement is recommended (complex layouts, critical accuracy needs)

### Stage: Documentation & Monitoring
- [ ] Create `docs/reference/PDF_UPLOAD_GEMINI_NATIVE.md` with:
  - Architecture overview
  - Cost analysis
  - When to use each pipeline - the intention is that v3 becomes the default and eventually only pipeline
  - Performance characteristics
- [ ] Update `docs/reference/PDF_UPLOAD_PIPELINES_COMPARISON.md`
- [ ] Add monitoring for:
  - Token usage statistics
  - Image extraction success rates
  - Processing times by document size
  - Error frequencies
- [ ] Update logging per `docs/reference/LOGGING_BEST_PRACTICES.md`

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
- **v2 (Vision)**: $0.10-0.20 (current implementation)
- **v3 (Gemini Native)**: $0.02-0.08 (with image extraction)
- **v3 + Claude Refinement**: $0.05-0.12 (highest quality)

### E. Technical Decisions & Rationale

1. **Why upgrade v1 instead of creating a new pipeline?**
   - Simpler mental model (just v2 and v3)
   - Easier migration - users get automatic improvements
   - Shared architecture reduces maintenance burden
   - API compatibility preserved

2. **Why Gemini-only for initial processing?**
   - Only model with native bounding box support
   - 1M token context window handles most documents
   - Cost-effective for full document processing

3. **Why two-stage processing with optional Claude refinement?**
   - Leverages each model's strengths
   - Provides user choice between speed/cost and quality
   - Maintains Claude support from v1

4. **Why reuse v2 components?**
   - Proven image extraction logic
   - Existing bounding box parsing
   - Reduced implementation risk

5. **Why not streaming?**
   - Bounding boxes need full document context
   - Image extraction requires complete HTML
   - Complexity outweighs benefits for this use case

### F. Risk Mitigation

1. **Risk**: Gemini API changes break coordinate format
   - **Mitigation**: Version lock API, comprehensive tests

2. **Risk**: Token limits still hit for very large documents  
   - **Mitigation**: Clear fallback to v2, upfront validation

3. **Risk**: Image extraction quality inferior to vision API
   - **Mitigation**: Optional Claude refinement stage

4. **Risk**: Users confused by multiple pipeline options
   - **Mitigation**: Clear UI guidance, automatic recommendation