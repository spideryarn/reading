# PDF Storage Integration with Supabase Storage

## Goal, context

Implement Supabase Storage integration for the PDF upload pipeline to store original PDF files while maintaining the current HTML conversion and database storage architecture. This completes the PDF-to-HTML conversion feature by adding persistent storage for original files, enabling features like re-processing, version history, and direct PDF serving.

**Current State**: The PDF conversion pipeline (V2 Direct PDF Processing) successfully converts PDFs to HTML using Claude/Gemini APIs and stores the processed content in the database. However, original PDF files are not preserved after conversion.

**Target State**: Original PDFs are stored in Supabase Storage with references in the documents table, enabling both processed content access and original file retrieval when needed.

**Success Criteria**: Users can upload PDFs that are both converted to HTML (existing functionality) and stored in Supabase Storage with proper database references, security policies, and error handling.

## References

- `planning/later/250530h_pdf_to_html_conversion_implementation.md` - Complete PDF conversion implementation with direct API processing
- `docs/DATABASE_SUPABASE_STORAGE_REFERENCE.md` - Comprehensive Supabase Storage implementation guide and best practices
- `supabase/migrations/20250531235026_comprehensive_storage_schema.sql` - Database schema with `storage_path` field already defined
- `lib/types/database.ts` - Documents table interface with `storage_path: string | null` field
- `app/api/upload-pdf/route.ts` - Current PDF conversion API endpoint that needs storage integration
- `app/upload/page.tsx` - Upload interface that handles PDF file selection and conversion
- `lib/services/database/documents.ts` - Document service layer for database operations
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage) - Official documentation for storage operations

## Principles, key decisions

**Storage-First Strategy**: Store the original PDF in Supabase Storage before processing to ensure file preservation even if conversion fails. This provides better error recovery and enables re-processing with different models or parameters.

**Database Reference Pattern**: Use the existing `storage_path` field (already defined in schema) to store the Supabase Storage file path, following the pattern: `{document-uuid}/{original-filename.pdf}`.

**Security Model**: Implement RLS policies that align with the current mock user authentication system (`00000000-0000-0000-0000-000000000001`) while being prepared for future real authentication.

**Minimal API Changes**: Integrate storage operations into the existing `/api/upload-pdf` endpoint to avoid breaking changes to the UI layer.

**Error Handling Priority**: If storage fails, the conversion should still proceed (storage path will be null). If conversion fails after storage succeeds, clean up the stored file to avoid orphans.

## Actions

### Stage: Supabase Storage Setup ✅ COMPLETED
- [x] **Set up Supabase Storage bucket for documents**
  - [x] Create `documents` bucket through SQL migration
  - [x] Configure bucket settings (private, PDF MIME types, 50MB limit)
  - [x] Verify bucket creation and basic access
  - [x] Add bucket configuration to environment documentation

- [x] **Implement RLS policies for document storage**
  - [x] Initial bucket creation with basic configuration
  - [x] Storage permissions handled through application layer during development
  - [x] Created migration `20250606000001_storage_bucket_and_policies.sql`
  - [x] Test policies and bucket access confirmed working
  - [x] Comprehensive testing with real PDF uploads/downloads

### Stage: Storage Service Integration ✅ COMPLETED
- [x] **Create storage utility functions**
  - [x] Add storage upload function to handle PDF files with document UUID path structure
  - [x] Add storage download function for retrieving original PDFs
  - [x] Add storage cleanup function for removing orphaned files
  - [x] Include proper error handling and retry logic
  - [x] Add TypeScript types for storage operations
  - [x] Created comprehensive `lib/services/storage.ts` with all operations

- [x] **Update document service layer**
  - [x] Modify `DocumentService` to handle `storage_path` field in create operations
  - [x] Add method for retrieving original files via storage path
  - [x] Update service interface to support storage operations
  - [x] Ensure backward compatibility with existing documents (null storage_path)
  - [x] Added `createWithStorage()`, `getOriginalFile()`, `deleteWithStorage()` methods

### Stage: PDF Upload Pipeline Integration ✅ COMPLETED
- [x] **Modify PDF upload API endpoint**
  - [x] Update `/api/upload-pdf/route.ts` to store PDF before conversion
  - [x] Generate document UUID early in the process for storage path
  - [x] Integrate storage upload with existing conversion workflow
  - [x] Update response to include storage path information
  - [x] Implement cleanup on conversion failure to prevent orphaned files
  - [x] Comprehensive error handling for storage, AI, and database failures

- [x] **Update database document creation**
  - [x] Modify document insertion to include `storage_path` field
  - [x] Update `original_file_type` to store PDF MIME type
  - [x] Ensure `slug` generation still works with storage integration
  - [x] Test that existing document creation patterns continue to work
  - [x] Complete workflow: storage → conversion → database with atomic operations

### Stage: Error Handling and Recovery ✅ COMPLETED
- [x] **Implement comprehensive error handling**
  - [x] Handle storage upload failures gracefully (continue with conversion)
  - [x] Handle conversion failures after successful storage (cleanup stored file)
  - [x] Add retry logic for temporary storage issues
  - [x] Provide meaningful error messages for different failure scenarios
  - [x] Test error scenarios with comprehensive test suite
  - [x] Atomic operations with proper rollback on failures

- [x] **Add file cleanup and maintenance**
  - [x] Create utility for detecting orphaned storage files
  - [x] Implement cleanup function for removing files without database references
  - [x] Add validation for storage path consistency with database
  - [x] Built into document service layer for automatic cleanup
  - [x] Background job system consideration documented for future

### Stage: File Retrieval and Serving ✅ COMPLETED
- [x] **Implement original file download functionality**
  - [x] Add API endpoint for downloading original PDFs via document slug
  - [x] Generate signed URLs for secure access to private files
  - [x] Handle public document access through CDN URLs
  - [x] Add proper Content-Type headers and filename handling
  - [x] Test download functionality with various file sizes
  - [x] Created `/api/documents/[slug]/download/route.ts` with comprehensive features

- [ ] **Update document interface for file access** (REMAINING WORK)
  - [ ] Add UI indicator when original file is available (we already have View Original icon at the top - let's use that. perhaps replace it with a PDF icon for PDFs)
  - [ ] Ensure graceful handling when storage_path is null (legacy documents)
  - [ ] Test UI updates don't break existing document display

### Stage: Testing and Validation ✅ COMPLETED
- [x] **Write comprehensive tests for storage integration**
  - [x] Unit tests for storage utility functions
  - [x] Integration tests for upload pipeline with storage
  - [x] Error scenario tests (storage failures, cleanup)
  - [x] Test storage policy enforcement and access control
  - [x] Performance tests with various PDF file sizes
  - [x] Created `scripts/test-pdf-storage-integration.ts` with full coverage

- [x] **Manual testing and validation**
  - [x] Test complete upload flow: file upload → storage → conversion → database
  - [x] Verify storage paths are correctly stored and retrievable
  - [x] Test file download and access functionality
  - [x] Validate cleanup and error recovery scenarios
  - [x] Test with both small and large PDF files
  - [x] All core functionality verified working

### Stage: Documentation and Deployment ✅ MOSTLY COMPLETED
- [x] **Update relevant documentation**
  - [x] Storage integration examples already in `docs/DATABASE_SUPABASE_STORAGE_REFERENCE.md`
  - [ ] Update `planning/later/250530h_pdf_to_html_conversion_implementation.md` with completion status
  - [x] Document new API endpoint behavior and storage fields
  - [x] Add troubleshooting guide for common storage issues
  - [x] Comprehensive documentation with examples and best practices

- [x] **Environment and deployment preparation**  
  - [x] Verify Supabase Storage is enabled in project configuration
  - [x] Add any required environment variables for storage operations
  - [x] Test storage operations in development environment
  - [x] Document deployment considerations for production
  - [x] All testing confirms ready for production use

### Stage: Git Commit and Finalization 🚧 IN PROGRESS
- [ ] **Commit all changes following `docs/GIT_COMMITS.md`**
  - [ ] Use subagent for commit to ensure proper message structure
  - [ ] Include storage setup, API changes, and documentation updates
  - [ ] Verify working tree is clean after commit

- [ ] **Move completed planning documents**
  - [ ] Update `planning/later/250530h_pdf_to_html_conversion_implementation.md` to mark storage action as complete
  - [ ] Move this planning document to `planning/finished/`
  - [ ] Final commit with planning doc move

## Appendix

### Current Database Schema Context

The documents table already includes the necessary `storage_path` field:

```typescript
interface Document {
  id: string                        // UUID primary key  
  title: string                     // Display name
  html_content: string             // Processed HTML content
  plaintext_content: string        // Processed plaintext
  storage_path: string | null      // Supabase Storage file path
  original_file_type: string | null // MIME type (e.g., 'application/pdf')
  source_url: string | null        // Original URL if web-sourced
  created_by: string | null        // User ID (mock user for now)
  slug: string                     // URL-friendly identifier
  is_public: boolean               // Access control flag
}
```

### Storage Path Format

Following Supabase Storage best practices and the research in `docs/SUPABASE_STORAGE_REFERENCE.md`:

**Path Structure**: `{document-uuid}/{original-filename.pdf}`
**Example**: `550e8400-e29b-41d4-a716-446655440000/research-paper.pdf`

**Benefits**:
- UUID prefix prevents naming conflicts
- Preserves original filename for user recognition
- Enables folder-like organization in storage
- Supports future multi-file documents

### File Size Considerations

Based on Supabase Storage research:
- **Standard uploads**: Recommended for ≤ 6MB PDFs (most academic papers)
- **Resumable uploads**: Available for > 6MB files up to 5GB limit
- **Current pipeline**: Already handles multi-page PDFs via direct API processing

### Mock User Authentication Context

Current system uses mock user `00000000-0000-0000-0000-000000000001` for all operations:
- Storage policies should allow this system user full access
- Future authentication implementation will need policy updates
- Database foreign key constraints already satisfied with mock user

### Integration with Existing PDF Pipeline

The current V2 Direct PDF Processing implementation:
- ✅ Successfully processes PDFs with Claude and Gemini APIs  
- ✅ Stores HTML/plaintext in database with proper relationships
- ✅ Handles provider selection and error scenarios
- ✅ Includes comprehensive test coverage
- ❌ Missing: Original PDF storage (this planning document addresses this gap)

### Alternative Approaches Considered

**Storage Timing Options**:
1. **Store before conversion** (chosen): Ensures file preservation, enables re-processing
2. **Store after conversion**: Slightly simpler but risks file loss on conversion failure
3. **Store only on conversion success**: Simplest but loses original on any failure

**Chosen approach**: Store before conversion for maximum data preservation and flexibility.

**Database Reference Patterns**:
1. **Direct storage path** (chosen): Simple string field, efficient queries
2. **Separate storage table**: More normalized but adds complexity
3. **JSONB metadata**: Flexible but harder to query and validate

**Chosen approach**: Direct storage path in existing `storage_path` field for simplicity and performance.

### Risks and Mitigation

**Storage Setup Complexity**: Mitigated by comprehensive reference documentation and step-by-step setup actions.

**RLS Policy Errors**: Mitigated by starting with simple mock user policies and testing before adding complexity.

**Orphaned File Management**: Mitigated by implementing cleanup utilities and proper error handling from the start.

**Large File Handling**: Mitigated by implementing both standard and resumable upload patterns based on file size.