# V3 Pipeline Image Metadata Enhancement

## Goal and Context

Implement improved image filename generation and alt tag support for the v3 PDF processing pipeline, leveraging Mistral OCR context to create more descriptive and accessible image assets. The v2 pipeline demonstrated the value of descriptive filenames (e.g., `neural-network-architecture-diagram.png` instead of `img-0.jpeg`) and proper alt tags for accessibility, but was expensive due to AI caption generation for every image.

**Current Problem**: The v3 pipeline extracts images successfully but uses basic filenames and lacks alt tag support. We want to leverage the Mistral OCR data already being processed to enhance image metadata without significant additional cost.

**Technical Constraint**: Research confirms that Mistral OCR returns markdown text per page with image bounding boxes, but does NOT provide text coordinates or caption anchoring. This limits our ability to spatially associate captions with images.

**Desired Solution**: A pragmatic approach that extracts captions from markdown using pattern matching, reuses existing services, and provides graceful fallbacks when caption association is uncertain.

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
- [ ] **Subagent: Analyze current v3 implementation**
  - Review `mistral-ocr-pdf-processor.ts` to understand OCR data structure
  - Examine `pdf-image-extractor-hybrid.ts` integration points
  - Document what OCR context is available for each image
  - Identify where to inject metadata enhancement
- [ ] Create test PDFs with various caption patterns:
  - Standard academic figures with captions
  - Multi-column layouts
  - Tables and equations
  - Non-English content
- [ ] Update planning doc with research findings

### Stage: Payload Verification Spike
- [ ] Create `scripts/tests/repro-mistral-caption-extraction.ts`
  - Process test PDFs through Mistral OCR
  - Log markdown output and image bounding boxes
  - Test caption extraction patterns
  - Verify what structural hints are available
- [ ] Analyze results to determine:
  - Success rate of regex-based caption matching
  - Common failure patterns
  - Whether marked's walkTokens provides enough structure
- [ ] Document findings and update approach if needed
- [ ] Git commit

### Stage: OCR Caption Extraction Using Existing Services
- [ ] Enhance `mistral-ocr-pdf-processor.ts` with caption extraction:
  - Use marked's walkTokens to traverse markdown structure
  - Identify caption patterns (Figure X:, Table Y:, etc.)
  - Associate captions with nearest image tokens
  - Track confidence scores for associations
- [ ] Integrate with existing `image-filename-generator.ts`:
  - Pass extracted captions as `aiCaption` parameter
  - Let existing service handle slugification and conflicts
  - Use existing fallback mechanisms
- [ ] Add comprehensive tests:
  - Standard caption formats
  - Edge cases (no caption, multiple images, page breaks)
  - Multi-language patterns
- [ ] Health check: `npm run check:health`
- [ ] Git commit

### Stage: Configuration and Control
- [ ] Add configuration to `lib/config.ts` following existing patterns:
  ```typescript
  export const IMAGE_METADATA_CONFIG = {
    ENABLE_OCR_METADATA: process.env.PDF_IMAGE_OCR_METADATA !== 'false',
    ENABLE_AI_ENHANCEMENT: process.env.PDF_IMAGE_AI_ENHANCEMENT === 'true',
    AI_CONFIDENCE_THRESHOLD: Number(process.env.PDF_IMAGE_AI_THRESHOLD || 0.3),
    MAX_FILENAME_LENGTH: Number(process.env.PDF_IMAGE_MAX_FILENAME_LEN || 50)
  } as const
  ```
- [ ] Update Mistral OCR processor to use centralized config
- [ ] Update UI to show metadata enhancement options
- [ ] Test configuration combinations
- [ ] Health check: `npm run check:health`
- [ ] Git commit

### Stage: Database and Frontend Integration
- [ ] Review current `document_assets` table schema
- [ ] Update metadata storage:
  - Store OCR-extracted captions in existing `caption` field
  - Use `extraction_confidence` for caption association confidence
  - Add source tracking to `metadata` JSONB field
- [ ] Verify frontend image rendering:
  - Confirm images use descriptive filenames in URLs
  - Ensure alt text is included in rendered HTML
  - Test accessibility with screen readers
- [ ] Document Content-Disposition header approach for downloads
- [ ] Health check: `npm run check:health`
- [ ] Git commit

### Stage: Optional AI Enhancement (Cost-Conscious)
- [ ] Enhance existing `image-caption-generator.ts`:
  - Add support for cheaper models via environment config
  - Use existing batch processing capabilities
  - Leverage existing confidence scoring system
- [ ] Integrate AI fallback into Mistral processor:
  - Trigger when OCR confidence < threshold
  - Use existing `AiCallService` for cost tracking
  - Pass `extractionPurpose: 'filename'` for cost optimization
- [ ] Configure selective AI enhancement:
  - Only process images without clear captions
  - Batch process per page for efficiency
  - Track usage via existing analytics
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

Common patterns to detect in OCR (English):
- `Figure \d+\.?\d*:` - Figure captions
- `Table \d+\.?\d*:` - Table titles  
- `Equation \(\d+\)` - Equation labels
- `Chart \d+:` - Chart labels
- `Exhibit [A-Z]:` - Legal/business documents

Multi-language patterns to support:
- Spanish: `Figura \d+:`, `Tabla \d+:`
- French: `Figure \d+:`, `Tableau \d+:`
- German: `Abbildung \d+:`, `Tabelle \d+:`
- Chinese: `图 \d+:`, `表 \d+:`
- Japanese: `図 \d+:`, `表 \d+:`

### F. Edge Cases and Fallback Strategies

**Challenging scenarios to handle**:
1. **Multi-image figures** - Single caption for subfigures (a), (b), (c)
   - Strategy: Associate same caption with multiple images, append subfigure labels
2. **Captions on different pages** - Image at bottom of page, caption on next
   - Strategy: Low confidence score, trigger AI enhancement
3. **No clear caption** - Decorative images, logos, or unlabeled charts
   - Strategy: Use position-based naming (e.g., `page-5-top-image.png`)
4. **Complex layouts** - Multi-column with captions in different column
   - Strategy: Use token proximity in markdown, not spatial proximity
5. **Equations as images** - Mathematical formulas rendered as graphics
   - Strategy: Detect "Equation" pattern, use equation numbering

### G. Implementation Notes

**Caption extraction approach**:
- Use marked's `walkTokens` to traverse markdown structure
- Build caption registry before processing images
- Associate captions with images based on token order
- Track confidence scores for each association
- Fall back to AI when confidence < threshold

**Confidence scoring factors**:
- Token distance between caption and image (closer = higher confidence)
- Caption format match quality (standard pattern = higher confidence)
- Multiple images near single caption (lower confidence)
- Page boundaries crossed (lower confidence)

