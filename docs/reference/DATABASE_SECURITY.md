# Database Security Reference

Row Level Security (RLS) policies and access control patterns used across database tables in Spideryarn Reading.

📖 **Related Documentation:**
- `docs/reference/DATABASE_OVERVIEW.md` - Database architecture overview
- `docs/reference/DATABASE_SCHEMA.md` - Complete schema reference
- `docs/reference/AUTHENTICATION_SECURITY.md` - Authentication system security
- `docs/reference/DATABASE_MIGRATIONS.md` - Migration best practices

## Overview

The project uses Supabase Row Level Security (RLS) to enforce data access policies directly at the database level. This provides defense-in-depth security by ensuring access control is maintained even if application-layer logic is bypassed.

**Security Model**: Document-centric access control where users can access documents they own, plus admin override capabilities. Public document support is planned but not yet implemented.

**Current State**: 
- ✅ **Authentication**: Full Supabase Auth integration with email/password and Google OAuth
- ✅ **RLS Policies**: Comprehensive policies implemented across all tables
- ✅ **Admin System**: Admin users (identified by non-null `is_admin` timestamp) have full access
- ✅ **Storage RLS**: Full policies implemented with environment-aware handling
- ⚠️ **Public Documents**: Not yet supported in RLS policies (planned for Phase 2)

## RLS Policy Status Summary

| Table | RLS Enabled | Policies Implemented | Admin Support | Public Access |
|-------|-------------|---------------------|---------------|---------------|
| documents | ✅ Yes | ✅ Full CRUD | ✅ Yes | ❌ No |
| document_enhancements | ✅ Yes | ✅ Full CRUD | ✅ Yes | ❌ No |
| ai_calls | ✅ Yes | ✅ Full CRUD (Fixed) | ✅ Yes | ❌ No |
| profiles | ✅ Yes | ✅ User-only access | ❌ No* | N/A |
| chat_threads | ✅ Yes | ✅ Full CRUD | ✅ Yes | ❌ No |
| chat_messages | ✅ Yes | ✅ Full CRUD | ✅ Yes | ❌ No |
| ai_models | ✅ Yes | ✅ Read-only | N/A | N/A |
| storage.objects | ✅ Yes | ✅ Full CRUD | ❌ No** | ❌ No |

*Profiles don't have admin override - each user manages only their own profile
**Storage policies don't include admin override yet

## RLS Policy Reference

### storage.objects (Supabase Storage)

**Purpose**: Controls access to uploaded files (PDFs, images, etc.) stored in Supabase Storage buckets.

**Current Implementation**: ✅ Full RLS policies with environment-aware handling
- **RLS Status**: ✅ Enabled (Supabase default)
- **Custom Policies**: ✅ Implemented (migration `20250615140000_add_storage_rls_policies.sql`)
- **Access Method**: User-scoped access via RLS policies
- **Path Structure**: `documents/{document-uuid}/original/{filename}`

**Implemented Policies**:

| Policy Name | Operation | Logic | Notes |
|-------------|-----------|-------|-------|
| "Users can upload files for owned documents" | INSERT | Document ownership check OR UUID path pattern | Allows temporary uploads during document creation |
| "Users can access files for owned documents" | SELECT | Document ownership via path parsing | Enforces document-level ownership |
| "Users can update files for owned documents" | UPDATE | Document ownership via path parsing | Same as SELECT |
| "Users can delete files for owned documents" | DELETE | Document ownership via path parsing | Same as SELECT |

**Local Development Handling**:
- **Detection**: Migration checks for `supabase_admin` role to identify local environment
- **Graceful Degradation**: Policies creation wrapped in exception handlers
- **Warnings**: Local environment shows expected warnings but continues
- **Production**: Full RLS enforcement in production environment

**Security Notes**:
- Path parsing extracts document UUID from first path segment
- Temporary upload support for document creation workflow
- No admin override in current policies
- No public document support yet (Phase 2)

### documents

**Purpose**: Core document records containing processed content and metadata.

**RLS Status**: ✅ Enabled with comprehensive policies

**Current Policy**: "Owners and admins can manage documents" (ALL operations)
```sql
auth.uid() = created_by::uuid OR
EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
```

**Access Patterns**:
- ✅ **Create**: Users can create documents owned by themselves
- ✅ **Read**: Users can read documents they own (admins can read all)
- ✅ **Update**: Users can modify documents they own (admins can modify all)
- ✅ **Delete**: Users can delete documents they own (admins can delete all)
- ❌ **Public Access**: Not yet implemented (is_public field exists but not checked)

**Key Security Fields**:
- `created_by`: UUID linking to auth.users
- `is_public`: Boolean for future public sharing (not yet used in RLS)
- `storage_path`: Reference to original file in Supabase Storage

### profiles

**Purpose**: User profile information and administrative access control.

**RLS Status**: ✅ Enabled with user-only access

**Current Policy**: "Users can manage own profile" (ALL operations)
```sql
auth.uid() = user_id
```

**Access Patterns**:
- ✅ **All Operations**: Users can only access their own profile
- ❌ **Admin Override**: No admin access to other users' profiles
- ❌ **Cross-User Access**: No user can see another user's profile

**Key Security Fields**:
- `user_id`: UUID linking to auth.users (primary key)
- `is_admin`: Nullable timestamp - NULL means not admin, timestamp shows when admin became admin
- `created_at`, `updated_at`: Standard audit fields

**Admin Status Implementation**:
- **Field Type**: `timestamptz` (not boolean) - provides audit trail
- **NULL = Not Admin**: Default state for all users
- **Timestamp = Admin**: Records exact time of admin privilege grant
- **Usage Pattern**: Check with `IS NOT NULL` for admin status

### ai_calls

**Purpose**: Track AI/LLM API usage for billing and debugging.

**RLS Status**: ✅ Enabled with security fix applied

**Current Policy**: "Owners and admins can access AI calls" (ALL operations)
```sql
(auth.uid() = created_by::uuid AND 
  (document_id IS NULL OR 
   EXISTS (SELECT 1 FROM documents WHERE id = ai_calls.document_id AND created_by = auth.uid())
  )
) OR
EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
```

**Security History**:
- **Initial Vulnerability**: Any authenticated user could access document-independent AI calls
- **Fixed**: Migration `20250615000001_fix_duplicate_rls_policies_and_security.sql`
- **Current**: Proper isolation - users see only their own AI calls

### document_enhancements

**Purpose**: Store AI-generated content (summaries, headings, glossary, etc.)

**RLS Status**: ✅ Enabled with document-based access

**Current Policy**: "Owners and admins can access enhancements" (ALL operations)
- Access derived from document ownership
- Supports centaur-sourcing model (human creates, AI enhances)
- No direct ownership concept - follows document permissions

### chat_threads & chat_messages

**Purpose**: Document-based AI chat conversations.

**RLS Status**: ✅ Enabled with cascading document-based access

**Security Requirements**:
- ✅ **Authentication Required**: No anonymous access even for public documents
- ✅ **Document Ownership**: Access tied to document ownership
- ✅ **Admin Override**: Admins can access all threads/messages
- ❌ **Public Documents**: Chat remains private even when document is public

### ai_models

**Purpose**: Reference table for AI model configurations (deprecated - replaced by model strings).

**RLS Status**: ✅ Enabled with read-only access

**Current Policy**: "Authenticated users can read ai_models" (SELECT only)
- All authenticated users can read model configurations
- No write access (managed by migrations only)

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

## Security Architecture

### Defense in Depth
1. **Database Level**: RLS policies enforce access control at the lowest level
2. **Application Level**: Additional validation in service classes
3. **API Level**: Route protection with `requireAuth()` and ownership checks
4. **Admin System**: Timestamp-based admin status with full override capabilities

### Admin System Implementation

The admin system uses a SECURITY DEFINER function to avoid RLS recursion:

```sql
-- auth.is_admin() function checks admin status without triggering RLS
CREATE FUNCTION auth.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;
```

This function is used in all RLS policies that need admin override, preventing the infinite recursion that would occur if policies directly queried the profiles table.

### Access Control Matrix

| Resource | Owner | Admin | Other Authenticated | Anonymous |
|----------|--------|--------|--------------------|------------|
| Documents | ✅ Full | ✅ Full | ❌ None | ❌ None* |
| Enhancements | ✅ Via doc | ✅ Full | ❌ None | ❌ None* |
| AI Calls | ✅ Own only | ✅ All | ❌ None | ❌ None |
| Chat | ✅ Via doc | ✅ Full | ❌ None | ❌ None |
| Profiles | ✅ Own only | ❌ None | ❌ None | ❌ None |
| Storage | ✅ Via doc | ❌ None** | ❌ None | ❌ None* |

*Will have read access to public documents in Phase 2
**Admin storage access not yet implemented

### Migration Evolution

1. **Initial Setup** (20250531235026): Tables with permissive dev policies
2. **Phase 1 Security** (20250610000001): User-scoped access control
3. **Admin Support** (20250612223724): Admin override capabilities
4. **Security Fix** (20250615000001): Fixed AI calls vulnerability
5. **Storage RLS** (20250615140000): Full storage policies with env handling

## Recent Security Improvements (June 2025)

### Implemented Features
1. **Public Document Support**: Documents and enhancements now support public visibility
2. **Admin System**: Full admin override using `auth.is_admin()` function  
3. **Profile Admin Access**: Admins can view all user profiles
4. **Storage Public Access**: Files for public documents accessible to anonymous users
5. **Chat Privacy**: Enforced authentication requirement for all chat features

### Migration Files Created
- `20250618000001_update_profiles_rls_admin_access.sql` - Admin profile access
- `20250618000002_update_document_enhancements_public_access.sql` - Public documents
- `20250618000003_ensure_chat_authenticated_only.sql` - Chat authentication
- `20250618000004_update_storage_rls_public_documents.sql` - Storage public access
- `20250618000005_fix_profiles_admin_recursion.sql` - Admin recursion fix

## Troubleshooting

### Common RLS Issues
- **"Row Level Security policy violation"**: Check user authentication and policy conditions
- **Empty query results**: User may lack permission to view data
- **Storage access denied**: Verify bucket policies and authentication state
- **Admin recursion**: Use `auth.is_admin()` function instead of direct profile queries

### Development Tips
- **Use service role**: For administrative operations during development
- **Test with anon key**: Verify RLS policies work from client perspective
- **Check policy order**: Policies are evaluated in creation order, conflicts can cause issues
- **Test public access**: Create public documents and test with anonymous clients

### Policy Testing
```sql
-- Test current user context
SELECT auth.uid(), auth.role();

-- Test admin status
SELECT auth.is_admin();

-- Test document ownership
SELECT id, title, created_by, is_public
FROM documents;

-- Test public document access (as anonymous)
SET ROLE anon;
SELECT id, title FROM documents WHERE is_public = true;
RESET ROLE;

-- Test storage access
SELECT name, bucket_id 
FROM storage.objects 
WHERE bucket_id = 'documents';
```