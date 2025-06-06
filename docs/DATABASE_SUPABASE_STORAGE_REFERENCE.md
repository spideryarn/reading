# Supabase Storage Reference Guide

Comprehensive guide to implementing file storage in Spideryarn Reading using Supabase Storage for PDF documents and other assets.

## See also

- `planning/250606a_pdf_Supabase_Storage_integration.md` - Complete PDF storage integration planning
- `planning/later/250530h_pdf_to_html_conversion_implementation.md` - PDF conversion implementation context
- `supabase/migrations/20250531235026_comprehensive_storage_schema.sql` - Database schema with `storage_path` field
- `lib/types/database.ts` - TypeScript definitions for documents table including storage references
- `docs/DATABASE_SCHEMA.md` - Complete database schema documentation
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage) - Official Supabase Storage documentation

## Principles, key decisions

**File Storage Strategy**: Store original files (PDFs) in Supabase Storage while keeping processed content (HTML, plaintext) in PostgreSQL for query performance and full-text search capabilities.

**Security-First Approach**: Use Row Level Security (RLS) policies for all storage operations to ensure proper access control and user isolation.

**Path Management**: Use document-centric organization with nested paths for different file types per document, enabling clear ownership and future extensibility.

## Storage Architecture Overview

### Core Components

**Buckets**: Top-level containers for organizing files by access patterns
- `documents` - Single bucket containing all document-related files

**Objects**: Individual files stored within buckets with hierarchical paths
- Path format: `{document-uuid}/{file-type}/{original-filename.ext}`
- Example: `550e8400-e29b-41d4-a716-446655440000/original/research-paper.pdf`
- Future examples: `{doc-uuid}/extracted/figure-1.png`, `{doc-uuid}/thumbnails/page-1.jpg`

**Policies**: RLS-based access control for fine-grained security
- Read/write permissions based on user authentication
- Public/private bucket configurations
- Document ownership validation

### Database Integration Pattern

The documents table includes a `storage_path` field for referencing stored files:

```typescript
interface Document {
  id: string                        // UUID primary key
  title: string                     // Display name
  html_content: string             // Processed HTML (required)
  plaintext_content: string        // Processed text (required)
  storage_path: string | null      // Reference to original file in Storage
  original_file_type: string | null // MIME type (e.g., 'application/pdf')
  source_url: string | null        // Original URL if web-sourced
}
```

## File Upload Implementation

### Standard Uploads (≤ 6MB)

Best for most PDF documents and typical file sizes:

```javascript
async function uploadDocument(file, documentId) {
  const filePath = `${documentId}/original/${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false  // Prevent overwriting
    });
    
  if (error) throw error;
  return data.path; // Store this in documents.storage_path
}
```

### Resumable Uploads (> 6MB)

For large files up to 5GB using TUS protocol:

```javascript
import { createUpload } from 'tus-js-client';

async function uploadLargeDocument(file, documentId) {
  return new Promise((resolve, reject) => {
    const upload = new createUpload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000],
      headers: {
        authorization: `Bearer ${supabaseKey}`,
        'x-upsert': 'false'
      },
      metadata: {
        bucketName: 'documents',
        objectName: `${documentId}/original/${file.name}`,
        contentType: file.type
      },
      onError: reject,
      onSuccess: () => resolve(upload.url)
    });
    
    upload.start();
  });
}
```

## Security and Access Control

### Bucket Policies

Essential RLS policies for document storage:

```sql
-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload documents" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to explicitly public documents
CREATE POLICY "Public document access"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.storage_path = name 
    AND documents.is_public = true
  )
);
```

### Development Mock User Strategy

During development phase using mock authentication:

```sql
-- Allow system user to manage all documents
CREATE POLICY "System user document access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);
```

## File URL Generation

### Public URLs

For publicly accessible files:

```javascript
const { data } = supabase.storage
  .from('documents')
  .getPublicUrl(filePath);

console.log(data.publicUrl); // Direct CDN URL
```

### Signed URLs

For private files with temporary access:

```javascript
const { data, error } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 3600); // 1 hour expiry

if (data) {
  console.log(data.signedUrl); // Time-limited access URL
}
```

## Performance Considerations

### CDN and Caching

**Automatic CDN**: Supabase Storage automatically uses global CDN
- First request: Cache miss, fetched from origin
- Subsequent requests: Served directly from edge locations
- Cache status available in `cf-cache-status` header

**Optimization Strategies**:
- Public buckets have better cache hit rates
- Private buckets check permissions per request
- Use consistent file paths for better caching

### File Size Guidelines

**Standard Uploads** (multipart/form-data):
- Recommended: ≤ 6MB
- Maximum: 5GB (not recommended for large files)
- Best for: Most PDFs, documents, images

**Resumable Uploads** (TUS protocol):
- Recommended: > 6MB
- Maximum: 5GB
- Best for: Large PDFs, videos, datasets
- Supports resume on network interruption

## Limitations and Constraints

### File Size Limits

| Upload Method | Recommended | Maximum | Notes |
|---------------|-------------|---------|-------|
| Standard      | ≤ 6MB      | 5GB     | Use resumable for > 6MB |
| Resumable     | > 6MB      | 5GB     | TUS protocol required |

### Naming Constraints

Files must follow AWS S3 object key naming guidelines:
- UTF-8 encoding required
- Avoid special characters: `& $ @ = ; : + , ?`
- Forward slashes `/` create folder structure
- Case sensitive
- Maximum key length: 1,024 Unicode characters

### Bucket Configuration

```javascript
// Example bucket creation with constraints
await supabase.storage.createBucket('documents', {
  public: false,                    // Private bucket
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html',
    'text/plain'
  ],
  fileSizeLimit: 50 * 1024 * 1024  // 50MB limit
});
```

## Integration with PDF Processing Pipeline

### Complete Workflow Example

```typescript
// 1. Upload original PDF to Storage
async function processDocumentUpload(file: File): Promise<string> {
  const documentId = crypto.randomUUID();
  
  // Upload to Supabase Storage
  const storagePath = await uploadDocument(file, documentId);
  
  // Convert PDF to HTML (existing pipeline)
  const { htmlContent, plaintextContent } = await convertPdfToHtml(file);
  
  // Store document record with storage reference
  const { data } = await supabase
    .from('documents')
    .insert({
      id: documentId,
      title: file.name.replace('.pdf', ''),
      html_content: htmlContent,
      plaintext_content: plaintextContent,
      storage_path: storagePath,
      original_file_type: file.type,
      created_by: '00000000-0000-0000-0000-000000000001' // Mock user
    })
    .select()
    .single();
    
  return data.id;
}

// 2. Retrieve original file when needed
async function getOriginalDocument(documentId: string): Promise<Blob> {
  // Get storage path from database
  const { data: document } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .single();
    
  if (!document?.storage_path) {
    throw new Error('Original file not available');
  }
  
  // Download from Storage
  const { data, error } = await supabase.storage
    .from('documents')
    .download(document.storage_path);
    
  if (error) throw error;
  return data;
}
```

## Error Handling and Recovery

### Common Error Scenarios

**Upload Failures**:
```javascript
async function safeUploadDocument(file, documentId) {
  try {
    return await uploadDocument(file, documentId);
  } catch (error) {
    if (error.message?.includes('Asset Already Exists')) {
      // File already uploaded, get existing path
      return `${documentId}/original/${file.name}`;
    }
    
    if (error.message?.includes('File size')) {
      // Switch to resumable upload
      return await uploadLargeDocument(file, documentId);
    }
    
    throw error; // Re-throw unexpected errors
  }
}
```

**Access Permission Errors**:
```javascript
async function getDocumentWithFallback(storagePath) {
  try {
    // Try signed URL first
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);
    return data?.signedUrl;
  } catch (error) {
    // Fallback to public URL if allowed
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }
}
```

## Storage Migration Patterns

### Adding Storage to Existing Documents

```sql
-- Migration to add storage references for existing documents
UPDATE documents 
SET storage_path = CONCAT(id::text, '/original/', title, '.pdf')
WHERE original_file_type = 'application/pdf' 
AND storage_path IS NULL;
```

### Cleanup and Maintenance

```javascript
// Remove orphaned files (no database reference)
async function cleanupOrphanedFiles() {
  const { data: storageFiles } = await supabase.storage
    .from('documents')
    .list();
    
  const { data: dbPaths } = await supabase
    .from('documents')
    .select('storage_path')
    .not('storage_path', 'is', null);
    
  const dbPathSet = new Set(dbPaths.map(d => d.storage_path));
  
  for (const file of storageFiles) {
    if (!dbPathSet.has(file.name)) {
      await supabase.storage
        .from('documents')
        .remove([file.name]);
    }
  }
}
```

## Testing Strategies

### Local Development

```javascript
// Mock storage operations for testing
const mockStorage = {
  upload: jest.fn().mockResolvedValue({ 
    data: { path: 'mock-path' }, 
    error: null 
  }),
  download: jest.fn().mockResolvedValue({ 
    data: new Blob(['mock content']), 
    error: null 
  })
};
```

### Integration Testing

```javascript
describe('Document Storage Integration', () => {
  it('should store and retrieve PDF documents', async () => {
    const testFile = new File(['test content'], 'test.pdf', {
      type: 'application/pdf'
    });
    
    const documentId = await processDocumentUpload(testFile);
    const retrievedFile = await getOriginalDocument(documentId);
    
    expect(retrievedFile.size).toBeGreaterThan(0);
    expect(retrievedFile.type).toBe('application/pdf');
  });
});
```

## Future Enhancements

### Planned Features 📋

- **Automatic cleanup**: Background job to remove orphaned storage files
- **File versioning**: Store multiple versions of documents with revision history
- **Metadata extraction**: Store file metadata (size, checksum, creation date) in database
- **Thumbnail generation**: Automatic preview generation for PDFs and images

### Advanced Patterns 📋

- **Multi-region storage**: Geo-distributed storage for global performance
- **Transformation API**: On-the-fly image/document transformations
- **Webhook integration**: Real-time notifications for storage events
- **Batch operations**: Bulk upload/download operations with progress tracking

## Appendix

### Bucket Organization Strategy Research

During planning, we evaluated multiple approaches for organizing files in Supabase Storage, particularly considering future extensibility for extracted images, thumbnails, and other document-related files.

#### Option A: Multiple Buckets by File Type

**Structure**:
```
Bucket: "original-documents"
├── {doc-uuid}/filename.pdf
├── {doc-uuid}/presentation.pptx

Bucket: "extracted-images" 
├── {doc-uuid}/figure-1.png
├── {doc-uuid}/chart-2.jpg

Bucket: "thumbnails"
├── {doc-uuid}/page-1-thumb.jpg
├── {doc-uuid}/cover-thumb.png
```

**Advantages**:
- **Granular security**: Different RLS policies per file type
- **Performance optimization**: Different caching strategies per bucket
- **Clear separation**: Easy to understand what each bucket contains
- **Independent scaling**: Can optimize each bucket separately

**Disadvantages**:
- **Complexity**: More buckets to manage and maintain
- **Cross-bucket operations**: Coordination required for document operations
- **API overhead**: Multiple bucket creation and policy management

#### Option B: Single Bucket with Document-Centric Organization (CHOSEN)

**Structure**:
```
Bucket: "documents"
├── {doc-uuid}/original/filename.pdf
├── {doc-uuid}/extracted/figure-1.png
├── {doc-uuid}/extracted/chart-2.jpg
├── {doc-uuid}/thumbnails/page-1-thumb.jpg
├── {doc-uuid}/processed/summary.json
```

**Advantages**:
- **Simplicity**: Single bucket to manage during development
- **Document-centric**: All files for a document grouped together
- **Easier cleanup**: Delete entire document folder at once
- **Simple API**: Consistent bucket parameter across all operations
- **Atomic operations**: All files for a document in one location

**Disadvantages**:
- **Complex RLS policies**: Must use path pattern matching for file-type access
- **All-or-nothing access**: Document access grants access to all file types
- **Future constraints**: Harder to implement different access patterns later

#### Decision Rationale

**Chosen**: Option B (Single Bucket) based on:
1. **Development velocity**: Faster to implement and test initially
2. **Security model**: RLS centered around document/user relationships, not file types
3. **Access patterns**: No immediate need for different permissions per file type
4. **Migration path**: Can evolve to multiple buckets later if needed

**Quote from decision**: "I think probably the RLS will centre around the document/user relationship. So, a given user will have a role (e.g. owner, editor, viewer) for a given document. I don't know if we really need different access patterns of different file types."

#### Migration Strategy

If future requirements demand multiple buckets:
1. Create new type-specific buckets
2. Implement dual-write (write to both old and new locations)
3. Background migration of existing files  
4. Switch reads to new buckets
5. Clean up old bucket structure

This approach provides immediate simplicity while preserving future flexibility.

### Storage Schema Reference

Current `storage.objects` table structure (managed by Supabase):

```sql
-- Core fields in storage.objects
bucket_id      text        -- Bucket name
name           text        -- File path/key
owner          uuid        -- User ID (nullable)
created_at     timestamptz -- Upload timestamp
updated_at     timestamptz -- Last modification
last_accessed_at timestamptz -- CDN tracking
metadata       jsonb       -- File metadata
```

### Cost Considerations

**Storage Pricing** (as of June 2025):
- Storage: ~$0.021 per GB per month
- Bandwidth: ~$0.09 per GB egress
- Requests: Minimal cost per operation

**Optimization Tips**:
- Use CDN caching for frequently accessed files
- Compress files before upload when possible
- Implement proper cleanup procedures
- Monitor usage with Supabase dashboard

### AWS S3 Compatibility

Supabase Storage is S3-compatible, enabling:
- Migration tools and scripts designed for S3
- Third-party integrations and SDKs
- Familiar S3 concepts (buckets, objects, policies)
- AWS CLI compatibility for bulk operations

**Key Differences from AWS S3**:
- Integrated with Supabase Auth and RLS
- Built-in CDN without additional configuration
- PostgreSQL-style policies instead of IAM
- Real-time capabilities through Supabase ecosystem