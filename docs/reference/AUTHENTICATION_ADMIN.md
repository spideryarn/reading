# Admin Access System

Comprehensive guide for admin functionality in the Spideryarn Reading application, including admin role management, security architecture, and RLS integration for super-user access.

## See also

- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Core authentication system architecture
- `docs/reference/AUTHENTICATION_DATABASE.md` - Database integration and RLS policies  
- `docs/reference/AUTHENTICATION_SECURITY.md` - Security practices and considerations
- `docs/reference/TESTING_DATABASE.md` - RLS testing patterns including admin scenarios
- `lib/auth/admin-utils.ts` - Admin management utility functions
- `supabase/migrations/20250612223724_add_admin_support.sql` - Database schema and RLS policy implementation
- `planning/250608a_document_rls_security_phase1_implementation.md` - Historical context for admin system development

## Admin Role Concept

The admin system provides **super-user access** to all documents and system operations regardless of ownership. Key characteristics:

- **Timestamp-based**: Admin status uses `TIMESTAMPTZ` field for audit trails (when admin access was granted)
- **Database-level enforcement**: RLS policies grant access to admins at the database level
- **Application-level utilities**: Helper functions for checking and managing admin status
- **Additive permissions**: Admins retain all regular user permissions plus super-user access

## Security Architecture

### Database Integration

**Admin Field**: `profiles.is_admin TIMESTAMPTZ NULL`
- `NULL` = Regular user (no admin access)
- `TIMESTAMPTZ` = Admin user (timestamp when admin access was granted)

**RLS Policy Pattern**: All user-isolation policies include admin bypass:
```sql
CREATE POLICY "policy_name" ON table_name
  FOR ALL TO authenticated
  USING (
    -- Regular ownership check
    auth.uid() = created_by::uuid OR
    -- Admin bypass
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );
```

**Performance Optimization**: Dedicated index for admin lookups:
```sql
CREATE INDEX idx_profiles_admin_lookup ON profiles(user_id, is_admin) WHERE is_admin IS NOT NULL;
```

### RLS Policy Coverage ✓

All user-isolation RLS policies have been updated to include admin access:

- **Documents**: `"Owners and admins can manage documents"`
- **Document Enhancements**: `"Owners and admins can access enhancements"`  
- **AI Calls**: `"Owners and admins can access AI calls"`
- **Chat Threads**: `"Owners and admins can access chat threads"`
- **Chat Messages**: `"Owners and admins can access chat messages"`

### API Route Integration ✓

API routes check admin status alongside ownership:

```typescript
// Pattern used in API routes
const isOwned = await documentService.isOwnedByUser(documentId, user.id)
const adminStatus = await getCurrentUserAdminStatus()

if (!isOwned && !adminStatus.isAdmin) {
  return NextResponse.json({ error: 'Document not found' }, { status: 404 })
}
```

**Implemented in**:
- `/api/delete-document` ✓
- `/api/documents/[slug]/download` ✓  
- `/api/documents/[slug]/original` ✓

## Admin Management Functions

### Core Utilities (`lib/auth/admin-utils.ts`)

**Grant Admin Access**:
```typescript
await grantAdminAccess(userId: string)
// Sets is_admin to current timestamp
```

**Revoke Admin Access**:
```typescript
await revokeAdminAccess(userId: string)  
// Sets is_admin to NULL
```

**Check Admin Status**:
```typescript
await isUserAdmin(userId: string)
// Returns { isAdmin: boolean, adminSince?: string }

await getCurrentUserAdminStatus()
// Same for current authenticated user
```

**Require Admin Access**:
```typescript
await requireAdminAccess(userId?: string)
// Throws error if user is not admin
```

### Error Handling Pattern

All admin utilities return structured responses:
```typescript
{ success: boolean; error?: string }        // Grant/revoke operations
{ isAdmin: boolean; adminSince?: string; error?: string }  // Status checks
```

## Security Implementation Status

### ✅ Implemented Security Features

- **Database-level enforcement** via RLS policies
- **Audit trail** with timestamp-based admin field
- **Performance optimization** with dedicated index
- **Consistent API integration** across all protected routes
- **Comprehensive testing** with real RLS validation

### ✅ Security Vulnerability Fixed

**AI Calls RLS Policy Vulnerability**: Fixed in migration `20250613000004_fix_ai_calls_rls_security.sql`

**Previous Issue**: The original policy allowed any authenticated user to access document-independent AI calls created by other users due to insufficient creator ownership validation.

**Resolution**: Updated policy now enforces creator ownership for all AI calls:
```sql
-- ✅ SECURE: Fixed policy
USING (
  auth.uid() = created_by AND (
    document_id IS NULL OR 
    EXISTS (SELECT 1 FROM documents WHERE documents.id = ai_calls.document_id AND documents.created_by::uuid = auth.uid())
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
);
```

**Verification**: All RLS tests pass, confirming proper user isolation for document-independent AI calls.

### 📋 Additional Security Improvements (Low Priority)

1. **Admin Action Logging**: Add audit logging for grant/revoke operations
2. **Rate Limiting**: Implement rate limits on admin utility functions  
3. **Input Validation**: Validate target user existence in grant/revoke operations
4. **Admin Escalation Controls**: Prevent unlimited admin creation without oversight
5. **Enhanced Session Management**: Admin-specific session validation and timeout controls
6. **API Route Consistency**: Standardize admin check ordering across all routes

## Testing Patterns

### Real RLS Testing Integration ✅

Admin functionality is validated through real RLS testing:

```typescript
// Admin access testing pattern
const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
const adminClient = await setup.createAdminClient() // Uses service role for setup
const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

// Test admin can access any user's documents
const adminResult = await setup.testResourceAccess(adminClient, 'documents', userADocument.id)
RLSAssertions.assertHasAccess(adminResult)
```

### Test Coverage

- **Document ownership isolation** with admin bypass
- **AI calls access** including document-independent scenarios  
- **Profile access** with admin override capabilities
- **Cross-table integration** ensuring consistent admin access

See `lib/services/database/__tests__/rls-policies-real.test.ts` for complete test implementation.

## Current Admin User

**System Admin**: `hello@spideryarn.com` (configured in `supabase/seed.sql`)
- Granted admin access during database seeding
- Used for development and testing scenarios

## Usage Examples

### Checking Admin Status in Components

```typescript
import { getCurrentUserAdminStatus } from '@/lib/auth/admin-utils'

// In server components
const adminStatus = await getCurrentUserAdminStatus()
if (adminStatus.isAdmin) {
  // Show admin interface
}
```

### Protecting Admin-Only Routes

```typescript
import { requireAdminAccess } from '@/lib/auth/admin-utils'

// In API routes or server actions
try {
  await requireAdminAccess()
  // Admin-only logic
} catch (error) {
  return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
}
```

### Managing Admin Access

```typescript
// Grant admin access (requires existing admin)
const result = await grantAdminAccess('user-uuid-here')
if (!result.success) {
  console.error('Failed to grant admin:', result.error)
}

// Revoke admin access  
await revokeAdminAccess('user-uuid-here')
```

---

*Last updated: 13 June 2025*  
*Status: Core admin functionality implemented ✅*  
*Security: All critical vulnerabilities resolved ✅*  
*Next review: After additional security improvements*