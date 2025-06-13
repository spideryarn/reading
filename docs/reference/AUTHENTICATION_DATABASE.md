# Authentication Database Integration

Database schema, user profile management, and data ownership patterns for the Spideryarn Reading authentication system, including automatic profile creation and Row Level Security implementation.

## See also

- `docs/reference/AUTHENTICATION_OVERVIEW.md` - High-level authentication system architecture and flows
- `docs/reference/AUTHENTICATION_ADMIN.md` - Admin access system and super-user capabilities
- `docs/reference/AUTHENTICATION_SETUP.md` - Initial configuration and development environment setup
- `docs/reference/AUTHENTICATION_UI.md` - User interface components and authentication pages
- `docs/reference/AUTHENTICATION_SECURITY.md` - Security best practices and route protection
- `docs/reference/TESTING_DATABASE.md` - Real RLS testing patterns and validation
- `lib/services/database/` - Database service layer implementations
- `supabase/migrations/` - Database schema migrations and setup
- `docs/reference/DATABASE_SCHEMA.md` - Complete database schema documentation
- `docs/reference/DATABASE_OVERVIEW.md` - General database architecture and patterns

## Database Schema Overview

### Authentication Tables

The authentication system leverages Supabase's built-in `auth` schema combined with custom `public` schema tables for user profile management:

**Core Tables**:
- `auth.users` - Supabase managed user authentication records
- `public.profiles` - Extended user profile information
- `public.documents` - User-owned documents with access control
- `public.chat_threads` - User-scoped conversation history
- `public.chat_messages` - Messages within user conversations

### User Profile Schema ✅

**Table**: `public.profiles`

```sql
CREATE TABLE public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  is_admin TIMESTAMPTZ NULL,  -- Admin access timestamp (NULL = regular user)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Key Features**:
- **Automatic Creation**: Profiles created via database trigger when users register
- **Flexible Preferences**: JSONB field for user settings and customization
- **Admin Support**: `is_admin` timestamp field for super-user access with audit trail
- **Cascade Deletion**: Profiles automatically deleted when auth user is removed
- **Unique Constraint**: One profile per authenticated user

### Document Ownership Schema ✅

**Enhanced `documents` Table**:

```sql
-- Documents with user ownership
ALTER TABLE public.documents 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_documents_created_by ON public.documents(created_by);
CREATE INDEX idx_documents_user_public ON public.documents(created_by, is_public);
```

**Ownership Features**:
- **User Association**: Documents linked to creating user via `created_by`
- **Public Sharing**: `is_public` flag allows sharing without authentication
- **Soft Deletion**: User deletion sets `created_by` to NULL (preserves documents)
- **Query Optimization**: Indexes for efficient user-scoped queries

## Automatic Profile Creation ✅

### Database Trigger Implementation

**Function**: `handle_new_user()`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Trigger**: Automatic execution on user creation

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Benefits**:
- **Zero Configuration**: Profiles created automatically for all registration methods
- **Consistent State**: Every authenticated user has a corresponding profile
- **Error Prevention**: Eliminates race conditions in profile creation
- **OAuth Compatible**: Works with email signup and Google OAuth flows

### Profile Creation Flow

1. **User Registration**: User signs up via email/password or OAuth
2. **Supabase Auth**: Creates record in `auth.users` table
3. **Trigger Execution**: `handle_new_user()` function automatically executes
4. **Profile Creation**: New record inserted into `public.profiles` table
5. **Application Ready**: User can immediately access profile-dependent features

## Database Service Layer ✅

### ProfileService Implementation

**Location**: `lib/services/database/profiles.ts`

**Core Methods**:
```typescript
class ProfileService {
  // Get profile by user ID
  async getByUserId(userId: string): Promise<Profile | null>
  
  // Update profile information
  async updateByUserId(userId: string, updates: ProfileUpdate): Promise<Profile>
  
  // Manage user preferences
  async updatePreferences(userId: string, preferences: Record<string, any>): Promise<Profile>
  async getPreferences(userId: string): Promise<Record<string, any>>
  
  // Administrative functions
  async create(profile: ProfileInsert): Promise<Profile>
  async deleteByUserId(userId: string): Promise<void>
}
```

**Error Handling**:
- **UUID Validation**: Validates user ID format before database queries
- **Not Found Handling**: Returns `null` for missing profiles (PGRST116 error)
- **Descriptive Errors**: Throws meaningful errors for database failures
- **Type Safety**: Full TypeScript integration with generated database types

### DocumentService User Integration ✅

**Location**: `lib/services/database/documents.ts`

**User-Scoped Methods**:
```typescript
class DocumentService {
  // Create document with explicit user ownership
  async createForUser(userId: string, document: DocumentInsert): Promise<Document>
  
  // Get all documents owned by user
  async getByUserId(userId: string, options?: PaginationOptions): Promise<{
    documents: Document[]
    hasMore: boolean
  }>
  
  // Verify document ownership
  async isOwnedByUser(documentId: string, userId: string): Promise<boolean>
  
  // Transfer document ownership (admin function)
  async updateOwnership(documentId: string, newOwnerId: string): Promise<Document>
}
```

**Query Patterns**:
- **User-Scoped Queries**: Filter documents by `created_by` user ID
- **Ownership Verification**: Security checks before document operations
- **Pagination Support**: Efficient handling of large document collections
- **Public Document Access**: Separate queries for public vs. private documents

## Row Level Security (RLS) Architecture ✅

### Security Model: "Owners and Admins"

The RLS implementation follows a consistent **"owners and admins"** pattern across all user-isolated tables. Every policy allows access to:
1. **Resource owners** - Users who created or own the resource
2. **System admins** - Users with `is_admin` timestamp set in their profile

**Admin Detection Pattern**:
```sql
-- Standard admin check used across all policies
EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
```

**Performance Optimization**:
```sql
-- Dedicated index for fast admin lookups
CREATE INDEX idx_profiles_admin_lookup ON profiles(user_id, is_admin) WHERE is_admin IS NOT NULL;
```

### Current RLS Policies ✅

**Documents**: `"Owners and admins can manage documents"`
```sql
CREATE POLICY "Owners and admins can manage documents" ON documents
  FOR ALL TO authenticated
  USING (
    auth.uid() = created_by::uuid OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );
```

**Document Enhancements**: `"Owners and admins can access enhancements"`
```sql
CREATE POLICY "Owners and admins can access enhancements" ON document_enhancements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id 
      AND documents.created_by::uuid = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );
```

**AI Calls**: `"Owners and admins can access AI calls"`
```sql
CREATE POLICY "Owners and admins can access AI calls" ON ai_calls
  FOR ALL TO authenticated
  USING (
    auth.uid() = created_by AND (
      document_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = ai_calls.document_id 
        AND documents.created_by::uuid = auth.uid()
      )
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );
```

**Chat Threads**: `"Owners and admins can access chat threads"`
```sql
CREATE POLICY "Owners and admins can access chat threads" ON chat_threads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = chat_threads.document_id 
      AND documents.created_by::uuid = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );
```

**Chat Messages**: `"Owners and admins can access chat messages"`
```sql
CREATE POLICY "Owners and admins can access chat messages" ON chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads 
      JOIN documents ON documents.id = chat_threads.document_id
      WHERE chat_threads.id = chat_messages.thread_id 
      AND documents.created_by::uuid = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );
```

**Profiles**: `"Users can manage own profile"` (no admin override needed)
```sql
-- Read access
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Update access  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Prevent manual creation (handled by trigger)
CREATE POLICY "Prevent manual profile creation" ON profiles
  FOR INSERT WITH CHECK (false);
```

### Public Access Policies ✅

**Public Documents**: Anyone can read public documents
```sql
CREATE POLICY "Anyone can read public documents" ON documents
  FOR SELECT USING (is_public = true);
```

**Document Creation**: Only authenticated users can create documents
```sql
CREATE POLICY "Authenticated users can create documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

### RLS Security Features

**Database-Level Enforcement**: All policies enforced at PostgreSQL level for maximum security
**Consistent Pattern**: Same "owners and admins" logic across all tables for predictable behavior  
**Performance Optimized**: Dedicated indexes for common access patterns
**Real Testing**: Validated with actual JWT tokens and database queries (see `docs/reference/TESTING_DATABASE.md`)

**Recent Security Fix**: AI calls policy vulnerability resolved in migration `20250613000004_fix_ai_calls_rls_security.sql` - previously allowed cross-user access to document-independent AI calls.

## User Data Patterns

### Profile Information Management

**Default Profile Data**:
```typescript
// Profile with sensible defaults
const defaultPreferences = {
  theme: 'light',           // UI theme preference
  notifications: true,      // Email notification settings
  language: 'en',          // Interface language
  timezone: 'UTC'          // User timezone
}
```

**Profile Update Patterns**:
```typescript
// Update display name
await profileService.updateByUserId(userId, {
  display_name: 'John Doe'
})

// Update preferences
await profileService.updatePreferences(userId, {
  theme: 'dark',
  notifications: false
})
```

### Document Ownership Patterns

**Creating User Documents**:
```typescript
// Explicit user ownership assignment
const document = await documentService.createForUser(userId, {
  title: 'My Document',
  slug: 'my-document',
  html_content: '<p>Content</p>',
  is_public: false
})
```

**User Document Queries**:
```typescript
// Get user's documents with pagination
const { documents, hasMore } = await documentService.getByUserId(userId, {
  limit: 10,
  offset: 0
})

// Check document ownership before operations
const canEdit = await documentService.isOwnedByUser(documentId, userId)
if (!canEdit) {
  throw new Error('Unauthorized access')
}
```

### Data Privacy and Isolation

**User Data Scope**:
- **Profile Data**: Private to individual users
- **Document Data**: Private by default, opt-in public sharing
- **Chat History**: Scoped to individual users
- **Usage Analytics**: Aggregated and anonymized

**Cross-User Data Access**:
- **Public Documents**: Accessible via share URLs without authentication
- **Shared Collections**: Future feature for collaborative document access
- **Administrative Access**: Service role for system operations

## Performance Considerations

### Database Indexes

**Essential Indexes**:
```sql
-- User profile lookups
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- Admin access optimization (for RLS policies)
CREATE INDEX idx_profiles_admin_lookup ON profiles(user_id, is_admin) WHERE is_admin IS NOT NULL;

-- Document ownership queries
CREATE INDEX idx_documents_created_by ON public.documents(created_by);
CREATE INDEX idx_documents_user_public ON public.documents(created_by, is_public);

-- Chat thread user access
CREATE INDEX idx_chat_threads_user_id ON public.chat_threads(user_id);
```

**Query Optimization**:
- **User-Scoped Queries**: Always filter by user ID for data isolation
- **Composite Indexes**: Multi-column indexes for common query patterns
- **Partial Indexes**: Indexes on filtered subsets for specific use cases

### Connection Pooling

**Supabase Configuration**:
- **Connection Limits**: Configured in `supabase/config.toml`
- **Pool Mode**: Transaction-level pooling for optimal performance
- **Client Pool Size**: Balanced for concurrent user load

### Data Volume Planning

**Growth Projections**:
- **Users**: Expect linear growth with authentication adoption
- **Documents**: Power-user growth pattern (heavy users create many documents)
- **Chat History**: Moderate growth with regular cleanup policies
- **Analytics**: High volume, require aggregation and archival strategies

## Database Migration Patterns

### Authentication Schema Evolution

**Migration Strategy**:
1. **Additive Changes**: Add new columns and tables without breaking existing functionality
2. **Backward Compatibility**: Maintain API compatibility during schema transitions
3. **Data Preservation**: Ensure user data integrity during migrations
4. **Rollback Safety**: Design migrations that can be safely reverted

**Example Migration**: Adding user preferences
```sql
-- Migration: Add preferences column to profiles
ALTER TABLE public.profiles 
ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;

-- Update existing profiles with default preferences
UPDATE public.profiles 
SET preferences = '{
  "theme": "light",
  "notifications": true
}'::jsonb
WHERE preferences IS NULL;
```

### Production Migration Process

**Migration Workflow**:
1. **Local Development**: Test migrations in local Supabase environment
2. **Migration Validation**: Verify schema changes don't break existing functionality
3. **Staging Deployment**: Apply migrations to staging environment
4. **Production Deployment**: Apply migrations to production with monitoring
5. **Rollback Plan**: Maintain rollback scripts for emergency recovery

**Migration Commands**:
```bash
# Create new migration
npx supabase migration new add_user_preferences

# Apply migrations locally
npx supabase db reset

# Apply migrations to production
npx supabase db push --linked
```

---

*Last updated: 13 June 2025*  
*Implementation Status: Complete with Admin RLS Integration ✅*  
*RLS Security: All vulnerabilities resolved ✅*  
*Next review: After additional RLS features or security updates*