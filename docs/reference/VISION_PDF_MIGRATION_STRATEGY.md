# Vision PDF Image Extraction Migration Strategy

## Overview

This document outlines the migration strategy for rolling out the vision-based PDF image extraction to Supabase Storage feature. The feature replaces base64 image embedding with external storage to solve payload size limitations while adding comprehensive image asset management.

## See Also

- `planning/250628a_vision_pdf_image_extraction_to_supabase_storage.md` - Complete implementation planning
- `planning/250627c_vision_based_pdf_processing_pipeline.md` - Vision pipeline architecture
- `docs/reference/DATABASE_SUPABASE_STORAGE_REFERENCE.md` - Storage architecture and patterns
- `lib/services/page-processor.ts` - Core implementation with image extraction integration

## Current Implementation Status

### ✅ Completed Infrastructure
- **Database Schema**: `document_assets` table with RLS policies for asset tracking
- **Storage Architecture**: `/assets/` directory structure with descriptive AI-generated filenames
- **Integration**: Image extraction embedded in page processing pipeline (Stage 3)
- **Error Handling**: Transaction-based rollback with user-friendly error messages
- **Testing**: Comprehensive test coverage (49 new tests) with integration validation

### ✅ Production Readiness
- **Build Status**: Production build succeeds with no blocking errors
- **API Endpoint**: `/api/upload-pdf-vision` fully functional with image extraction
- **Database Migration**: Applied successfully with asset tracking enabled
- **Security**: RLS policies ensure document-based access control for assets

## Migration Phases

### Phase 1: Silent Launch (Current Status) ✅ COMPLETE
**Status**: Image extraction is fully implemented but controlled by explicit enablement

**Implementation**:
- Vision-based PDF processing with image extraction is available via `enableImageExtraction: true` parameter
- Feature is used in production vision pipeline but controlled by processing options
- All supporting infrastructure (database, storage, error handling) is operational

**Validation Criteria**:
- [x] Production build successful
- [x] Database migration applied
- [x] Integration tests passing (9/9)
- [x] Storage service operational
- [x] RLS policies enforced

**Risk Level**: **LOW** - Feature is fully contained and doesn't affect existing workflows

### Phase 2: Gradual Enablement (Recommended Next Step)
**Goal**: Enable image extraction for vision-based PDF processing by default

**Implementation Strategy**:
```typescript
// In lib/services/page-processor.ts
export async function processPageToHtml(
  input: PageProcessingInput,
  provider: 'claude' | 'gemini' = 'gemini'
): Promise<PageProcessingResult> {
  const validatedInput = pageProcessingInputSchema.parse(input)
  
  // Feature flag approach - enable by default for vision processing
  const shouldExtractImages = validatedInput.enableImageExtraction ?? 
    (validatedInput.documentId ? true : false) // Enable if documentId present
  
  if (shouldExtractImages && validatedInput.documentId) {
    // Image extraction pipeline
  }
}
```

**Rollout Steps**:
1. **Monitor Existing Usage**: Track current vision processing performance baseline
2. **Enable for New Documents**: Set `enableImageExtraction: true` by default in vision API
3. **Monitor Performance**: Track processing time, storage usage, error rates
4. **Gradual Expansion**: Enable for all vision-based uploads if metrics are positive

**Success Metrics**:
- Processing time increase < 30% compared to baseline
- Storage upload success rate > 95%
- User error reports < 1% of processing attempts
- Database performance maintains current levels

**Rollback Plan**:
- Set `enableImageExtraction: false` in vision API configuration
- Existing uploaded images remain accessible
- No data loss or corruption risk

### Phase 3: Full Integration (Future Enhancement)
**Goal**: Make image extraction the standard for all PDF processing

**Implementation Strategy**:
```typescript
// Extend to traditional AI processing pipeline
const defaultProcessingOptions = {
  enableImageExtraction: true, // Default for all PDF uploads
  extractionMethod: 'vision_pipeline_stage3',
  storageEnabled: true
}
```

**Considerations**:
- Requires extending non-vision PDF processing to support image extraction
- May need different extraction strategies for different processing methods
- Storage cost implications for all PDF uploads

## Feature Flag Configuration

### Environment Variables
```bash
# .env.local / .env.production
ENABLE_IMAGE_EXTRACTION=true          # Global feature flag
IMAGE_EXTRACTION_TIMEOUT_MS=30000     # Processing timeout
IMAGE_STORAGE_ENABLED=true            # Storage functionality
MAX_IMAGES_PER_DOCUMENT=50            # Resource limits
```

### Runtime Configuration
```typescript
// lib/config/features.ts
export const FEATURE_FLAGS = {
  imageExtraction: {
    enabled: process.env.ENABLE_IMAGE_EXTRACTION === 'true',
    timeoutMs: parseInt(process.env.IMAGE_EXTRACTION_TIMEOUT_MS || '30000'),
    maxImagesPerDoc: parseInt(process.env.MAX_IMAGES_PER_DOCUMENT || '50'),
    storageEnabled: process.env.IMAGE_STORAGE_ENABLED === 'true'
  }
} as const

// Usage in services
if (FEATURE_FLAGS.imageExtraction.enabled && documentId) {
  await extractAndStoreImages(/* ... */)
}
```

### A/B Testing Support
```typescript
// lib/services/feature-flags.ts
export function shouldExtractImages(
  documentId: string, 
  userSegment?: string
): boolean {
  // Global feature flag check
  if (!FEATURE_FLAGS.imageExtraction.enabled) return false
  
  // Gradual rollout based on document ID hash
  const documentHash = parseInt(documentId.slice(-8), 16)
  const rolloutPercentage = 100 // Start with 100% for vision processing
  
  return (documentHash % 100) < rolloutPercentage
}
```

## Monitoring and Observability

### Key Metrics to Track

**Performance Metrics**:
```typescript
// Processing time impact
const metrics = {
  avgProcessingTimeWithImages: 45000,    // ms
  avgProcessingTimeWithoutImages: 15000, // ms
  imageExtractionSuccessRate: 0.95,      // 95%
  storageUploadSuccessRate: 0.98,        // 98%
  databaseInsertSuccessRate: 0.99        // 99%
}
```

**Storage Metrics**:
```typescript
// Storage usage tracking
const storageMetrics = {
  totalAssetsStored: 1250,               // count
  averageAssetSize: 85000,               // bytes
  totalStorageUsed: 106250000,           // bytes (~106MB)
  monthlyStorageCost: 2.23,              // USD
  monthlyBandwidthCost: 5.67             // USD
}
```

**Error Tracking**:
```typescript
// Error categorization
const errorMetrics = {
  imageExtractionErrors: 15,             // Technical failures
  storageUploadErrors: 8,                // Network/permission issues  
  databaseInsertErrors: 2,               // Database constraint violations
  userFriendlyErrorsGenerated: 25,       // Total user-facing errors
  transactionRollbacksPerformed: 23      // Cleanup operations
}
```

### Logging Strategy

**Structured Logging**:
```typescript
// Enhanced logging for migration monitoring
logger.info('Image extraction pipeline started', {
  documentId: validatedInput.documentId,
  pageNumber: validatedInput.pageNumber,
  imageCount: extractedImages.length,
  extractionEnabled: validatedInput.enableImageExtraction,
  migrationPhase: 'phase_2_gradual_enablement'
})

logger.info('Image extraction completed', {
  documentId: validatedInput.documentId,
  extractedImagesCount: extractedImages.length,
  totalProcessingTimeMs: processingTimeMs,
  storageUploadTimeMs: storageTimeMs,
  databaseInsertTimeMs: dbTimeMs,
  migrationMetrics: {
    phase: 'phase_2',
    successRate: 1.0,
    averageImageSize: avgSize
  }
})
```

**Alert Conditions**:
- Image extraction failure rate > 5%
- Storage upload failure rate > 2%
- Average processing time > 60 seconds
- Database constraint violations detected
- Transaction rollback rate > 1%

## Risk Assessment and Mitigation

### High Risk Scenarios

**1. Storage Service Outage**
- **Impact**: Image extraction fails, processing continues without images
- **Mitigation**: Graceful degradation implemented - returns `null` for failed uploads
- **Recovery**: Automatic retry on service restoration, no data loss

**2. Database Migration Issues**
- **Impact**: Asset tracking unavailable, potential foreign key errors
- **Mitigation**: Migration includes comprehensive validation and rollback procedures
- **Recovery**: Database rollback available, storage cleanup via administrative tools

**3. Performance Degradation**
- **Impact**: Document processing becomes unacceptably slow
- **Mitigation**: Feature flag allows instant disabling, A/B testing for gradual rollout
- **Recovery**: Immediate rollback to previous processing method

### Medium Risk Scenarios

**1. Storage Cost Explosion**
- **Impact**: Unexpected cost increases from image storage
- **Mitigation**: Resource limits (max images per document), monitoring alerts
- **Recovery**: Feature flag disabling, cost analysis and optimization

**2. RLS Policy Conflicts**
- **Impact**: Asset access control issues in production
- **Mitigation**: Comprehensive RLS testing, policy validation in staging
- **Recovery**: Policy rollback procedures, manual access recovery

### Low Risk Scenarios

**1. Filename Generation Conflicts**
- **Impact**: Duplicate filenames causing storage conflicts
- **Mitigation**: UUID fallback system, conflict resolution logic
- **Recovery**: Automatic filename deduplication, manual cleanup if needed

**2. User Experience Confusion**
- **Impact**: Users confused by new image extraction behavior
- **Mitigation**: Clear error messages, documentation updates
- **Recovery**: User education, support documentation

## Testing Strategy for Migration

### Pre-Migration Testing

**Production Environment Validation**:
```bash
# Database migration testing
npm run db:diff    # Verify migration readiness
npm test          # Full test suite validation
npm run build     # Production build verification

# Integration testing
npm run test:e2e  # End-to-end processing validation
```

**Performance Baseline**:
```typescript
// Capture baseline metrics before migration
const baseline = {
  avgProcessingTime: 15000,      // Current vision processing time
  successRate: 0.98,             // Current success rate
  errorRate: 0.02,               // Current error rate
  storageUsage: 1200000000       // Current storage usage (bytes)
}
```

### Post-Migration Monitoring

**Automated Health Checks**:
```typescript
// Health check endpoints for migration monitoring
GET /api/health/image-extraction
{
  "status": "healthy",
  "metrics": {
    "extractionEnabled": true,
    "successRate": 0.95,
    "avgProcessingTime": 42000,
    "storageHealth": "operational"
  }
}
```

**User Acceptance Testing**:
- Upload representative academic PDFs with multiple images
- Verify image extraction and storage URL generation
- Test error handling with invalid or corrupted PDFs
- Validate performance with large documents (20+ pages)

## Success Criteria

### Technical Success Metrics
- **Processing Success Rate**: > 95% of vision processing with image extraction succeeds
- **Storage Integration**: > 98% of extracted images successfully stored and retrievable
- **Performance Impact**: < 30% increase in average processing time
- **Error Handling**: 100% of failures result in graceful degradation with user-friendly messages

### Business Success Metrics
- **User Experience**: No increase in user-reported processing errors
- **Cost Efficiency**: Storage costs remain within acceptable budget ($10-50/month initially)
- **System Reliability**: No degradation in overall system availability
- **Data Integrity**: 100% data consistency between storage and database records

### Quality Success Metrics
- **Code Quality**: All new functionality covered by tests (current: 49 new tests)
- **Documentation**: Complete documentation for troubleshooting and maintenance
- **Security**: RLS policies properly enforced for all asset access
- **Maintainability**: Clean integration with existing codebase architecture

## Rollback Procedures

### Immediate Rollback (Emergency)
```typescript
// Emergency feature flag disable
process.env.ENABLE_IMAGE_EXTRACTION = 'false'

// Or via configuration
const EMERGENCY_CONFIG = {
  imageExtraction: { enabled: false }
}
```

**Impact**: 
- New documents process without image extraction
- Existing stored images remain accessible
- No data loss or corruption

### Gradual Rollback (Planned)
1. **Reduce rollout percentage**: A/B test from 100% → 50% → 25% → 0%
2. **Monitor metrics**: Ensure no negative impact during reduction
3. **Complete disabling**: Set feature flag to false when ready

### Data Cleanup (If Required)
```sql
-- Remove asset records (if rollback requires cleanup)
DELETE FROM document_assets 
WHERE extraction_method = 'vision_pipeline_stage3'
AND created_at > '2025-06-29';  -- Only recent extractions

-- Storage cleanup via API (if needed)
-- Manual cleanup of orphaned files in {doc-uuid}/assets/ directories
```

## Timeline and Milestones

### Phase 1: Completed ✅
- **Duration**: Completed
- **Milestone**: Infrastructure ready, feature flag controlled

### Phase 2: Gradual Enablement (Recommended)
- **Duration**: 1-2 weeks
- **Week 1**: Enable by default, monitor closely
- **Week 2**: Full rollout if metrics positive
- **Milestone**: Image extraction standard for vision processing

### Phase 3: Full Integration (Future)
- **Duration**: 4-6 weeks
- **Dependencies**: Phase 2 success, non-vision processing enhancement
- **Milestone**: Image extraction for all PDF processing types

## Conclusion

The vision PDF image extraction feature is ready for production deployment with comprehensive infrastructure, testing, and monitoring. The migration strategy provides multiple levels of control and rollback options to ensure safe deployment.

**Immediate Recommendation**: Proceed with Phase 2 (Gradual Enablement) to enable image extraction by default for vision-based PDF processing, with careful monitoring of performance and error metrics.

**Long-term Goal**: Based on Phase 2 success, consider extending image extraction to all PDF processing methods to provide consistent asset management across the entire document processing pipeline.