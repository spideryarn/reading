# Vision PDF Image Extraction to Supabase Storage

## Goal and Context

Replace base64 image embedding in vision-based PDF processing with Supabase Storage extraction to solve payload size limitations and improve performance. Currently, the vision pipeline identifies images via bounding boxes but doesn't extract actual image data, limiting the fidelity of complex academic documents with figures, charts, and diagrams.

**Current Problem**: Vision pipeline hits Vercel's 4.5MB payload limit due to base64 image embedding (which we don't actually implement yet). As we add more sophisticated image extraction, this will become a critical bottleneck.

**Proposed Solution**: Extract image regions from original PDF page images using existing bounding box coordinates, generate descriptive filenames using AI-powered captions, and store images in Supabase Storage with organized paths.

## User Stories & Acceptance Criteria

### Primary User Story
**As an academic researcher**, I want PDF images (figures, charts, equations) to be properly extracted and stored so that:
- Complex documents load quickly without payload size limitations
- Images have descriptive, meaningful filenames for organization
- Images are accessible via CDN for optimal performance
- Original image quality is preserved without base64 encoding overhead

**Acceptance Criteria**:
- Images extracted using existing bounding box coordinates from vision pipeline
- Descriptive filenames generated from AI captions, alt-text, or deterministic IDs
- All images stored in `{document-uuid}/assets/` directory structure
- HTML `<img>` elements updated with Supabase Storage URLs
- Fatal error handling with clear user messages for any storage failures
- No size limits imposed by base64 encoding in HTML payload

### Secondary User Story
**As a system administrator**, I want reliable image storage that:
- Fails fatally with clear errors rather than silent degradation
- Maintains consistent naming conventions across all documents
- Integrates seamlessly with existing RLS security policies
- Provides organized asset management alongside original documents

## References

- **Vision Pipeline Planning**: `planning/250627c_vision_based_pdf_processing_pipeline.md` - Current vision-based processing implementation
- **Supabase Storage Reference**: `docs/reference/DATABASE_SUPABASE_STORAGE_REFERENCE.md` - Storage architecture and implementation patterns
- **Current Vision Implementation**: `app/api/upload-pdf-vision/route.ts` - Vision-based PDF processing API endpoint
- **Fragment Processor**: `lib/services/html-fragment-processor.ts` - Bounding box extraction and image metadata processing
- **Page Processing**: `lib/services/page-processor.ts` - Individual page AI processing with Gemini Flash 2.5
- **Vision Prompt Template**: `lib/prompts/templates/page-to-html-fragment.njk` - AI instructions for image bounding box identification
- **PDF to Images Utility**: `lib/utils/pdf-to-images.ts` - PDF.js conversion for page image generation
- **Storage Service**: `lib/services/storage.ts` - Existing Supabase Storage integration for document files
- **Deterministic ID Generation**: `lib/utils/deterministic-id.ts` - UUID v5 generation for consistent element IDs

## Principles and Key Decisions

### Core Architecture Decisions
- **Storage path convention**: Use `{document-uuid}/assets/` instead of `/extracted/` for broader asset type support
- **Fail-fast error handling**: Any image extraction or storage failure results in immediate fatal error with clear user message
- **Caption-driven naming**: Primary filename source is AI-generated image captions, with fallback hierarchy
- **All images stored**: No size-based filtering - consistent approach for all images regardless of dimensions
- **Integration point**: Extract images during individual page processing (Stage 3) for early failure detection

### Filename Generation Strategy
**Hierarchical approach** with clear fallback chain:
1. **AI-generated captions**: Slugify and truncate captions from dedicated image description prompts
2. **Existing alt-text**: Use existing `alt` attributes if AI caption generation fails
3. **Deterministic IDs**: Generate consistent UUID v5 based on page number + bounding box coordinates as final fallback
4. **HTML element updates**: Update `<img>` element IDs to match storage filenames for consistency

### Technical Constraints
- **Fatal error philosophy**: "Fail fast with clear error messages rather than silent degradation" (per coding principles)
- **Consistent integration**: Use existing vision pipeline infrastructure without disrupting current functionality
- **RLS security**: Leverage existing document-based RLS policies for image access control
- **Storage organization**: Align with current document-centric storage architecture

## Stages & Actions

### Stage: Research and Foundation Setup
- [ ] **Audit current image handling capabilities**: Review research findings to confirm current bounding box extraction, storage infrastructure, and AI prompt patterns
- [ ] **Design image caption generation prompt**: Create dedicated Nunjucks template for generating descriptive captions from image regions
  - Design prompt to output JSON with caption, description, and confidence score
  - Include instructions for academic content (figures, charts, equations, diagrams)
  - Test prompt with sample image regions from existing PDF test documents
- [ ] **Update storage service for image assets**: Extend `lib/services/storage.ts` to handle image file uploads and URL generation
  - Add `uploadImageAsset()` function for document images
  - Add `getImageAssetUrl()` for retrieving storage URLs
  - Update path generation to use `/assets/` directory structure
- [ ] **Health check**: Run `npm run check:health` to validate storage service extensions

### Stage: Image Extraction and Caption Generation
- [ ] **Implement image region extraction**: Create `lib/services/image-extractor.ts` for extracting image regions from PDF page images
  - Use existing bounding box coordinates from fragment processing
  - Extract image regions using HTML5 Canvas API for precise cropping
  - Support PNG/JPEG output with configurable quality settings
  - Handle edge cases (invalid coordinates, empty regions, extraction failures)
- [ ] **Create image caption generation service**: Implement `lib/services/image-caption-generator.ts` for AI-powered image descriptions
  - Use dedicated prompt template for image analysis
  - Support batch processing for multiple images per page
  - Generate structured output with caption, technical description, and confidence
  - Include fallback to existing alt-text extraction from HTML fragments
- [ ] **Implement filename generation utility**: Create `lib/utils/image-filename-generator.ts` following hierarchical naming strategy
  - Slugify and truncate AI-generated captions (max 50 characters)
  - Fall back to alt-text slugification if caption generation fails
  - Generate deterministic UUID v5 from page number + bounding box as final fallback
  - Handle filename conflicts and invalid characters
- [ ] **Write comprehensive tests**: Test image extraction, caption generation, and filename utilities
  - Mock PDF page images and bounding box extraction
  - Test caption generation with various image types (figures, charts, equations)
  - Validate filename generation fallback hierarchy
  - Test error handling for all failure scenarios
- [ ] **Health check**: Run `npm run check:health` to validate image processing services

### Stage: Integration with Vision Pipeline
- [ ] **Modify page processor**: Update `lib/services/page-processor.ts` to integrate image extraction during individual page processing
  - Extract images immediately after fragment generation and validation
  - Store images in Supabase Storage with generated filenames
  - Update HTML fragment `<img>` elements with storage URLs
  - Implement fatal error handling for any extraction or storage failures
- [ ] **Update fragment processor**: Modify `lib/services/html-fragment-processor.ts` to handle storage URL references
  - Preserve image metadata while replacing base64 sources with storage URLs
  - Update image metadata schema to include storage path and filename
  - Maintain backward compatibility with existing bounding box system
- [ ] **Update HTML assembler**: Modify `lib/services/html-assembler.ts` to handle storage-based image references
  - Validate all image storage URLs are accessible during assembly
  - Handle missing images gracefully with clear error messages
  - Ensure proper `<img>` element ID assignment matching storage filenames
- [ ] **Test integration end-to-end**: Test complete vision pipeline with image extraction enabled
  - Upload test PDF with multiple figures and charts
  - Verify images are extracted, stored, and properly referenced in HTML
  - Validate filename generation and storage path organization
  - Test error handling for storage failures and extraction issues
- [ ] **Health check**: Run `npm run check:health` to validate vision pipeline integration

### Stage: Database Schema and Metadata Enhancement
- [ ] **Design asset metadata schema**: Extend database schema to track extracted assets for cleanup and reference
  - Add `document_assets` table linking documents to stored assets (images, future asset types)
  - Include fields: `type` (enum: 'image'), filename, storage_path, caption, extraction_confidence
  - Add JSON `metadata` field for asset-specific data: bounding_box, page_number, original_dimensions, file_size, extraction_method
  - Design RLS policies matching existing document access patterns
- [ ] **Create database migration**: Implement schema changes with proper RLS policies
  - Migration for `document_assets` table with appropriate indexes
  - RLS policies ensuring asset access follows document ownership
  - Foreign key constraints and cleanup triggers for document deletion
- [ ] **Update document processing metadata**: Extend upload metadata tracking to include asset extraction metrics
  - Count of assets extracted per document (by type)
  - Storage space used by document assets
  - Asset extraction and caption generation timing
- [ ] **Health check**: Run `npm run check:health` to validate database changes

### Stage: Error Handling and Edge Cases
- [ ] **Implement comprehensive error handling**: Ensure fatal failures with clear user messages for all error scenarios
  - Storage service failures (network, permissions, capacity)
  - Image extraction failures (invalid coordinates, canvas errors)
  - Caption generation failures (AI timeouts, invalid responses)
  - Filename generation conflicts and invalid characters
- [ ] **Add cleanup mechanisms**: Implement proper cleanup for failed document processing
  - Remove partially uploaded images if document processing fails
  - Background cleanup job for orphaned assets
  - Cleanup triggers for document deletion in database
- [ ] **Test error scenarios**: Verify fatal error handling and user experience
  - Test storage service failures with clear error messages
  - Test image extraction edge cases (empty regions, invalid coordinates)
  - Test caption generation failures and fallback behavior
  - Verify cleanup mechanisms work correctly
- [ ] **Health check**: Run `npm run check:health` to validate error handling

### Stage: Documentation and Deployment
- [ ] **Update vision pipeline documentation**: Revise `planning/250627c_vision_based_pdf_processing_pipeline.md` with image extraction details
  - Document new image extraction stage integration
  - Update payload limit mitigation strategy
  - Include image storage architecture and naming conventions
- [ ] **Update storage reference documentation**: Extend `docs/reference/DATABASE_SUPABASE_STORAGE_REFERENCE.md` with asset storage patterns
  - Document `/assets/` directory structure and naming conventions  
  - Include RLS policies for document assets
  - Add examples of image storage and retrieval patterns
- [ ] **Test production deployment readiness**: Verify all components work correctly in production environment
  - Test Supabase Storage integration in cloud environment
  - Verify RLS policies work correctly for image access
  - Test performance with larger documents and multiple images
- [ ] **Create migration strategy**: Plan rollout of image extraction feature
  - Feature flag for enabling/disabling image extraction
  - Gradual rollout strategy starting with smaller documents
  - Monitoring and alerting for storage usage and errors

### Stage: Final Validation and Cleanup
- [ ] **Final comprehensive testing**: Run complete test suite to ensure pipeline stability
  - `npm run test` - Full test suite including new image processing tests
  - `npm run test:e2e` - End-to-end testing of complete upload flow with image extraction
  - `npm run build` - Production build validation
- [ ] **Performance benchmarking**: Compare vision pipeline performance with and without image extraction
  - Document processing time impact
  - Storage space usage analysis
  - CDN performance for image delivery
  - User experience impact assessment
- [ ] **Code review and optimization**: Review implementation for performance and maintainability
  - Optimize image extraction for large documents
  - Review error handling patterns for consistency
  - Consolidate redundant code and improve type safety
- [ ] **Final health check**: Run `npm run check:health --rigorous` for comprehensive validation
- [ ] **Update planning doc**: Document final implementation details and lessons learned
- [ ] **Commit final implementation**: Follow Git commit best practices and update planning doc to completed status

## Appendix

### A. Current Vision Pipeline Image Handling Research

**Key Research Findings** (from subagent investigation):

**Current State**:
- **NO automated image caption generation**: System extracts metadata but not AI descriptions
- **NO base64 image extraction**: Only bounding box metadata collection
- **Robust bounding box system**: Normalized coordinates (0-1 scale) with validation
- **Existing storage infrastructure**: Supabase Storage ready for expansion
- **PDF.js conversion pipeline**: Frontend-based page image generation

**Missing Components**:
- Image extraction from page regions using bounding boxes
- AI-powered caption generation for descriptive filenames
- Individual image storage in Supabase Storage
- HTML element updates with storage URLs
- Error handling for storage failures

**Integration Points**:
- Stage 3 (Individual Page Processing) ideal for image extraction
- `html-fragment-processor.ts` handles bounding box extraction
- `page-processor.ts` manages AI processing with Gemini Flash 2.5
- Existing deterministic ID system available for fallback naming

### B. Storage Path Architecture

**Proposed Directory Structure**:
```
documents/
├── {document-uuid}/original/research-paper.pdf
├── {document-uuid}/assets/figure-1-neural-network-architecture.png
├── {document-uuid}/assets/table-2-performance-metrics.png
├── {document-uuid}/assets/equation-3-loss-function.png
├── {document-uuid}/assets/{uuid-fallback}.png
```

**Benefits**:
- Document-centric organization aligns with existing RLS model
- `/assets/` directory supports future expansion (thumbnails, processed versions)
- Descriptive filenames improve asset management and debugging
- Consistent path structure simplifies storage operations

### C. Filename Generation Examples

**AI Caption → Filename Conversion**:
- "Figure 1: Neural network architecture diagram" → `figure-1-neural-network-architecture.png`
- "Table 2: Performance metrics comparison" → `table-2-performance-metrics.png`
- "Equation 3: Loss function derivation" → `equation-3-loss-function.png`

**Fallback Hierarchy**:
1. AI caption (preferred): `descriptive-caption-name.png`
2. Alt-text: `existing-alt-text.png`
3. Deterministic UUID v5: `img-{uuid}.png` (based on page + bbox coordinates)

**Technical Constraints**:
- Maximum filename length: 50 characters (excluding extension)
- Valid characters: lowercase letters, numbers, hyphens
- Conflict resolution: append numeric suffix (`-2`, `-3`, etc.)

### D. Error Handling Philosophy

**Fatal Error Scenarios** (immediate user-visible failure):
- Supabase Storage service unavailable or permission denied
- Image extraction fails due to invalid bounding box coordinates
- PDF page image corruption or inaccessible
- Caption generation service timeouts or invalid responses
- Filename generation produces invalid or conflicting names

**User Error Messages**:
- "Image extraction failed: Unable to access storage service"
- "Document processing failed: Invalid image coordinates detected"
- "Upload failed: Image caption generation service unavailable"

**No Silent Degradation**: Following coding principles, any image-related failure causes complete document processing failure with clear error message rather than proceeding without images.

### E. Performance and Cost Considerations

**Storage Cost Impact**:
- Academic PDFs typically 5-15 images per document
- Average image size: 50-200KB (PNG) or 20-80KB (JPEG)
- Storage cost: ~$0.021/GB/month (minimal impact)
- CDN bandwidth: ~$0.09/GB egress (pay-per-use)

**Processing Time Impact**:
- Image extraction: +1-3 seconds per page
- Caption generation: +2-5 seconds per image
- Storage upload: +1-2 seconds per image
- Total overhead: +30-60 seconds for typical academic paper

**Optimization Opportunities**:
- Parallel image processing per page
- Batch caption generation for multiple images
- Configurable image quality/compression settings
- Lazy loading for large documents

### F. Integration with Existing Infrastructure

**Leverage Existing Systems**:
- **RLS Security**: Document-based access control extends naturally to document assets
- **Deterministic ID Generation**: UUID v5 system provides consistent fallback naming
- **AI Model Management**: Use existing Gemini Flash 2.5 integration for caption generation
- **Error Logging**: Existing Pino logging system captures image processing events
- **Storage Service**: Existing Supabase Storage patterns for file management

**Maintain Compatibility**:
- Existing bounding box extraction remains unchanged
- Current vision pipeline stages preserved
- HTML fragment processing API backward compatible
- Document metadata schema extensible without breaking changes