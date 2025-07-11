# V3 Pipeline Image Metadata Enhancement

## Goal and Context

Implement improved image filename generation and alt tag support for the v3 PDF processing pipeline, leveraging Mistral OCR context to create more descriptive and accessible image assets. The v2 pipeline demonstrated the value of descriptive filenames (e.g., `neural-network-architecture-diagram.png` instead of `img-0.jpeg`) and proper alt tags for accessibility, but was expensive due to AI caption generation for every image.

**Current Problem**: The v3 pipeline extracts images successfully but uses basic filenames and lacks alt tag support. We want to leverage the Mistral OCR data already being processed to enhance image metadata without significant additional cost.

**Desired Solution**: A cost-effective approach that uses Mistral OCR context first, with optional AI enhancement only when needed, maintaining the quality benefits of v2 while keeping costs low.

## User Stories & Acceptance Criteria

### Primary User Story
**As an academic researcher**, I want extracted images to have descriptive filenames and alt tags so that:
- I can easily identify and organize extracted figures, tables, and charts
- The document is accessible to screen readers
- Images can be searched and referenced by their content
- The system works cost-effectively without expensive AI calls for every image

**Acceptance Criteria**:
- Images have descriptive filenames based on OCR-detected captions (e.g., `fig-3-2-neural-architecture.png`)
- Alt tags are populated from OCR context or AI captions
- Existing v3 pipeline functionality is preserved
- Cost remains low (minimal AI usage)
- Confidence scoring indicates metadata quality
- Fallback to generic naming when context is insufficient

### Secondary User Story
**As a developer**, I want the image metadata system to:
- Integrate cleanly with the existing hybrid extraction pipeline
- Use OCR data that's already being processed
- Have clear configuration options for cost/quality tradeoffs
- Provide debugging information about metadata sources

## References

- `docs/planning/250710a_pure_js_pdf_image_extraction_server_side.md` - V3 pipeline implementation with hybrid extraction
- `lib/utils/image-filename-generator.ts` - V2 filename generation implementation
- `lib/services/image-caption-generator.ts` - V2 AI caption generation service
- `lib/services/mistral-ocr-pdf-processor.ts` - Mistral OCR processor that needs enhancement
- `lib/services/pdf-image-extractor-hybrid.ts` - Hybrid extractor to integrate with
- `docs/reference/CODING_PRINCIPLES.md` - Core development philosophy
- `docs/instructions/WRITE_PLANNING_DOC.md` - Instructions for planning docs

## Principles and Key Decisions

- **OCR-first approach**: Use Mistral OCR context as primary source for metadata (free)
- **Cost-conscious AI usage**: Only use AI enhancement when OCR provides insufficient context
- **Preserve v3 advantages**: Maintain the single PDF upload and hybrid extraction benefits
- **Progressive enhancement**: Start simple, add complexity only where it adds value
- **Clear metadata sourcing**: Always track where metadata came from for debugging
- **Academic content focus**: Optimize for figures, tables, equations, charts common in research
- **Backward compatibility**: Don't break existing v3 pipeline functionality

## Stages & Actions

### Stage: Initial Setup and Research
- [ ] Run `./scripts/sync-worktrees.ts` in a subagent to pull latest changes
- [ ] **Subagent: Analyze current v3 implementation**
  - Review `mistral-ocr-pdf-processor.ts` to understand OCR data structure
  - Examine `pdf-image-extractor-hybrid.ts` integration points
  - Document what OCR context is available for each image
  - Identify where to inject metadata enhancement
- [ ] Create simple test PDF with figures and captions for development
- [ ] Update planning doc with research findings

### Stage: Basic OCR Context Extraction
- [ ] Create `lib/utils/ocr-context-extractor.ts` for parsing Mistral output
  - Extract figure captions (e.g., "Figure 3.2: Neural network architecture")
  - Find surrounding text near image bounding boxes
  - Detect table titles and equation labels
- [ ] Add unit tests for OCR context extraction
  - Test figure caption detection patterns
  - Test proximity-based text association
  - Test edge cases (no caption, multiple captions)
- [ ] Health check: `npm run check:health`
- [ ] Git commit

### Stage: Simple Filename Generation from OCR
- [ ] Create `lib/utils/ocr-based-filename-generator.ts`
  - Parse figure/table numbers from OCR text
  - Generate academic-style filenames (e.g., `fig-3-2-description.png`)
  - Implement fallback to position-based naming
- [ ] Integrate with `pdf-image-extractor-hybrid.ts`
  - Pass OCR context to extraction functions
  - Update `extractPdfRegionAndUpload` signature
  - Maintain backward compatibility
- [ ] Test with sample PDFs
- [ ] Health check: `npm run check:health`
- [ ] Update planning doc with progress
- [ ] Git commit

### Stage: Alt Tag Generation from OCR
- [ ] Extend OCR context extractor to generate alt text
  - Use detected figure captions as primary source
  - Include surrounding descriptive text
  - Format for accessibility standards
- [ ] Update image upload metadata structure
  - Add alt text field to upload metadata
  - Track metadata source (OCR vs AI vs fallback)
- [ ] Write tests for alt tag generation
- [ ] Health check: `npm run check:health`
- [ ] Git commit

### Stage: Configuration and Control
- [ ] Add configuration options to Mistral OCR processor
  ```typescript
  interface ImageMetadataOptions {
    enableOCRMetadata: boolean
    enableAIEnhancement: boolean
    aiConfidenceThreshold: number
    maxFilenameLength: number
  }
  ```
- [ ] Implement environment variable controls
  - `PDF_IMAGE_OCR_METADATA` - Enable OCR-based metadata
  - `PDF_IMAGE_AI_ENHANCEMENT` - Enable AI fallback
- [ ] Update UI to show metadata enhancement options
- [ ] Test configuration combinations
- [ ] Health check: `npm run check:health`
- [ ] Git commit

### Stage: Optional AI Enhancement (Cost-Conscious)
- [ ] Create `lib/services/image-metadata-enhancer.ts`
  - Determine when AI enhancement is needed (low OCR confidence)
  - Use cheaper models (Haiku or Gemini Flash)
  - Batch process images per page for efficiency
- [ ] Implement confidence scoring
  - OCR confidence based on caption match quality
  - Threshold for triggering AI enhancement
  - Track enhancement statistics
- [ ] Add cost tracking and limits
- [ ] Test AI enhancement fallback scenarios
- [ ] Health check: `npm run check:health`
- [ ] Update planning doc with cost analysis
- [ ] Git commit

### Stage: Integration Testing and Refinement
- [ ] **Subagent: Create comprehensive test suite**
  - Test with various academic PDF types
  - Verify filename uniqueness and conflicts
  - Check alt tag quality and formatting
  - Measure performance impact
- [ ] Test with production-like PDFs
  - Research papers with complex figures
  - Documents without clear captions
  - Multi-language content
- [ ] Refine caption detection patterns based on results
- [ ] Health check: `npm run check:health`
- [ ] Git commit

### Stage: Documentation and Monitoring
- [ ] Update `docs/reference/PDF_IMAGE_EXTRACTION_ARCHITECTURE.md`
  - Document OCR metadata extraction flow
  - Add examples of enhanced filenames
  - Include configuration guide
- [ ] Create `docs/reference/IMAGE_METADATA_ENHANCEMENT.md`
  - Explain the hierarchical approach
  - Provide cost/quality tradeoff guidance
  - Include troubleshooting section
- [ ] Add logging for metadata generation
  - Source tracking (OCR vs AI)
  - Confidence scores
  - Performance metrics
- [ ] Update error handling patterns
- [ ] Health check: `npm run check:health`
- [ ] Git commit

### Stage: External Critique and Optimization
- [ ] **External critique stage**: Follow `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md`
- [ ] Optimize based on critique feedback
- [ ] Performance profiling and optimization
  - Measure metadata extraction overhead
  - Optimize regex patterns
  - Consider caching strategies
- [ ] Final health check: `npm run check:health`
- [ ] Git commit

### Stage: Final Testing and Deployment Preparation
- [ ] **Subagent: Run full test suite**
  - All unit tests
  - Integration tests with real PDFs
  - Performance benchmarks
- [ ] Test on Vercel preview deployment
- [ ] Verify no regression in existing functionality
- [ ] **Test consolidation** - Use subagent to consolidate redundant tests
- [ ] **Error message verification** - Review all error handling
- [ ] Final health check: `npm run build && npm run lint && npm test`
- [ ] Update planning doc with final results
- [ ] Git commit
- [ ] Move doc to `docs/planning/finished/`

## Appendix

### A. OCR Context Examples

Example Mistral OCR output that can be leveraged:
```
Figure 3.2: Comparison of transformer and LSTM architectures for sequence modeling. 
The transformer (left) uses self-attention mechanisms while the LSTM (right) relies 
on recurrent connections.

[IMAGE REGION DETECTED]

Table 1: Performance metrics across different model configurations showing accuracy,
F1 score, and processing time.
```

### B. Filename Generation Examples

**With good OCR context:**
- Input: "Figure 3.2: Neural network architecture comparison"
- Output: `fig-3-2-neural-network-architecture.png`

**With partial context:**
- Input: "Table 1" (near image)
- Output: `table-1-page-5.png`

**Fallback (no context):**
- Input: No caption detected
- Output: `page-5-top-chart-2f3a8b9.png`

### C. Cost Analysis

**V2 Approach (AI for all images):**
- ~$0.001-0.002 per image for AI caption
- 10 images per document = $0.01-0.02

**V3 Approach (OCR-first with AI fallback):**
- 80% handled by OCR = $0 (already paid for OCR)
- 20% need AI enhancement = $0.002-0.004 per document
- 5-10x cost reduction

### D. Integration Points

Key files to modify:
1. `lib/services/mistral-ocr-pdf-processor.ts` - Add context extraction
2. `lib/services/pdf-image-extractor-hybrid.ts` - Pass context through
3. `lib/services/storage-server.ts` - Store enhanced metadata
4. `lib/utils/` - New utilities for OCR parsing and filename generation

### E. Academic Content Patterns

Common patterns to detect in OCR:
- `Figure \d+\.?\d*:` - Figure captions
- `Table \d+\.?\d*:` - Table titles  
- `Equation \(\d+\)` - Equation labels
- `Chart \d+:` - Chart labels
- `Exhibit [A-Z]:` - Legal/business documents