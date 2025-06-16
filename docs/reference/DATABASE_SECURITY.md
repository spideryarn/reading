# Database Security Reference

Row Level Security (RLS) policies and access control patterns used across database tables in Spideryarn Reading.

📖 **Related Documentation:**
- `docs/reference/DATABASE_OVERVIEW.md` - Database architecture overview
- `docs/reference/DATABASE_SCHEMA.md` - Complete schema reference
- `docs/reference/AUTHENTICATION_SECURITY.md` - Authentication system security
- `docs/reference/DATABASE_MIGRATIONS.md` - Migration best practices

## Overview

The project uses Supabase Row Level Security (RLS) to enforce data access policies directly at the database level. This provides defense-in-depth security by ensuring access control is maintained even if application-layer logic is bypassed.

**Security Model**: Document-centric access control where users can access documents they own, plus optional public document sharing.

**Current State**: Development phase using mock user system (`00000000-0000-0000-0000-000000000001`) with plans for real authentication integration.

## RLS Policy Reference

### storage.objects (Supabase Storage)

**Purpose**: Controls access to uploaded files (PDFs, images, etc.) stored in Supabase Storage buckets.

**Current Implementation**: Application-layer access control
- **RLS Status**: ✅ Enabled (Supabase default)
- **Custom Policies**: ❌ None (using service role bypass)
- **Access Method**: Server-side service role key bypasses RLS
- **Security Layer**: Application logic in `DocumentService` enforces ownership

**Access Patterns**:
- ✅ **Upload**: Service role uploads files with document UUID paths
- ✅ **Download**: Service role retrieves files, application validates document access
- ✅ **Cleanup**: Service role removes orphaned files during document deletion

**Path Structure**: `documents/{document-uuid}/original/{filename}`

**Local Development Limitations**:
- **Known Issue**: Storage RLS policies fail in local Supabase with "must be owner of relation objects" error
- **Root Cause**: The `storage.objects` table is owned by `supabase_storage_admin` role, not `postgres`
- **Detection**: Migrations check for `supabase_admin` role existence to identify local environment
- **Handling**: Graceful degradation - local environment shows warnings, production enforces policies
- **Impact**: Local testing requires application-layer security validation only

**Future RLS Policies** (when real authentication implemented):
```sql
-- Allow authenticated users to upload to their document folders
CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = split_part(name, '/', 1)::uuid
    AND documents.created_by = auth.uid()::text
  )
);

-- Allow users to view documents they own
CREATE POLICY "Users can view own documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = split_part(name, '/', 1)::uuid
    AND documents.created_by = auth.uid()::text
  )
);

-- Allow public access to public documents
CREATE POLICY "Public document access" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = split_part(name, '/', 1)::uuid
    AND documents.is_public = true
  )
);
```

**Development Notes**:
- Service role access bypasses all RLS policies
- Document ownership validated at application layer in `DocumentService`
- Bucket is private by default (requires authentication)
- File paths include document UUID for ownership correlation
- Local environment requires application-only security due to storage ownership constraints

### documents

**Purpose**: Core document records containing processed content and metadata.

**RLS Status**: ✅ Enabled
**Current Policies**: Basic RLS enabled, using mock user authentication system

**Access Patterns**:
- ✅ **Create**: Users can create documents owned by themselves
- ✅ **Read**: Users can read documents they own + public documents
- ✅ **Update**: Users can modify documents they own
- ✅ **Delete**: Users can delete documents they own

**Key Security Fields**:
- `created_by`: UUID linking to user (currently mock user)
- `is_public`: Boolean enabling public read access
- `storage_path`: Reference to original file in Supabase Storage

### profiles

**Purpose**: User profile information and administrative access control.

**Key Security Fields**:
- `id`: UUID linking to auth.users
- `is_admin`: Nullable timestamp - NULL means not admin, timestamp shows when they became admin
- `created_at`, `updated_at`: Standard audit fields

**Admin Status Implementation**:
- **Field Type**: `timestamptz` (not boolean) - provides audit trail of when admin rights were granted
- **NULL = Not Admin**: Default state for all users
- **Timestamp = Admin**: Records exact time of admin privilege grant
- **Usage Pattern**: Check with `IS NOT NULL` for admin status, timestamp for audit purposes

### Other Tables

**Status**: RLS enabled on all tables as per initial migration (`20250531235026_comprehensive_storage_schema.sql`)

**Implementation**: Basic policies in place, detailed policies to be documented as they're refined during real authentication integration.

**Tables with RLS**:
- `ai_models`, `ai_calls` - AI service usage tracking
- `document_enhancements` - AI-generated content (summaries, headings, etc.)
- `chat_threads`, `chat_messages` - Document-based conversations

## Security Best Practices

### Service Role Usage
- **Server-side only**: Service role key never exposed to client
- **Controlled access**: Used only in API routes and server actions
- **Application validation**: Even with service role, validate document ownership

### Client-side Security
- **Anon key only**: Client uses anonymous key with RLS enforcement
- **API intermediation**: All storage operations go through API routes
- **Type safety**: Use generated TypeScript types for schema validation

### File Security
- **Private buckets**: No direct public access to storage
- **Signed URLs**: Temporary access for authorized users
- **Path validation**: UUID-based paths prevent directory traversal

## Migration Considerations

### RLS and Migrations
- **Permission requirements**: Modifying `storage.objects` requires special permissions
- **Development workaround**: Use application-layer security during development
- **Policy testing**: Test policies with both authenticated and anonymous users

### Future Authentication Integration
- **Mock user transition**: Current mock user system designed for easy migration
- **Policy updates**: Storage policies will need updating when real auth implemented
- **Data migration**: Existing documents can remain owned by system user or be migrated

## Troubleshooting

### Common RLS Issues
- **"Row Level Security policy violation"**: Check user authentication and policy conditions
- **Empty query results**: User may lack permission to view data
- **Storage access denied**: Verify bucket policies and authentication state

### Development Tips
- **Use service role**: For administrative operations during development
- **Test with anon key**: Verify RLS policies work from client perspective
- **Check policy order**: Policies are evaluated in creation order, conflicts can cause issues

### Policy Testing
```sql
-- Test current user context
SELECT auth.uid(), auth.role();

-- Test document ownership
SELECT id, title, created_by 
FROM documents 
WHERE created_by = auth.uid()::text;

-- Test storage access
SELECT name, bucket_id 
FROM storage.objects 
WHERE bucket_id = 'documents';
```