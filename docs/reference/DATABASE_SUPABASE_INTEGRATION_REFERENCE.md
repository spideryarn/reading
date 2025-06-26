# Supabase.js Integration Reference

This document provides comprehensive guidance for using Supabase.js in a Next.js application, covering server-side vs client-side usage patterns, Row Level Security best practices, performance considerations, and common patterns for document-centric applications with user ownership.

## See also

**Related Documentation**:
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Authentication system architecture and flows
- `docs/reference/DATABASE_OVERVIEW.md` - Database schema and migration patterns
- `docs/reference/DATABASE_SECURITY.md` - RLS policies and security configuration
- `lib/supabase/` - Supabase client configuration and utilities
- `lib/services/database/` - Database service layer implementations

**Implementation Files**:
- `lib/supabase/client.ts` - Browser client configuration
- `lib/supabase/server.ts` - Server-side client with cookie handling
- `lib/services/storage.ts` - Storage service with signed URLs and file management
- `middleware.ts` - Session management and token refresh for SSR

**External References**:
- [Supabase Next.js App Router Guide](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) - Official integration patterns
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - Comprehensive RLS guide
- [Performance Tuning Guide](https://supabase.com/docs/guides/platform/performance) - Official performance recommendations

## Key Architecture Decisions

**Client Architecture**: 
- Separate browser (`@supabase/ssr` createBrowserClient) and server (`@supabase/ssr` createServerClient) clients
- Cookie-based session management for SSR compatibility  
- Service layer pattern with database services encapsulating Supabase calls
- Direct client calls for simple operations, API routes for complex business logic

**Security Strategy**:
- Row Level Security (RLS) enabled on all user-facing tables
- User ownership patterns with `created_by` foreign keys to `auth.users`
- Anonymous user support with `is_anonymous` JWT claim differentiation
- Signed URLs for secure file access in Supabase Storage

**Performance Philosophy**:
- Proper indexing aligned with RLS policy patterns
- Subquery wrapping for JWT functions like `auth.uid()` to enable query plan optimisation
- Real-time subscriptions for collaborative features, API caching for static data

## Server-Side vs Client-Side Usage

### When to Use Server-Side Clients

✅ **Use Server Components and Server Actions for**:
- Complex data manipulation before rendering
- Authentication validation and protected routes
- Business logic requiring server-side secrets (API keys, etc.)
- Initial page loads with sensitive user data
- Operations requiring guaranteed execution (payments, critical updates)

```typescript
// lib/supabase/server.ts - Server client with cookie handling
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore errors from Server Components
            // Middleware handles session refresh
          }
        },
      },
    }
  )
}
```

### When to Use Client-Side Clients

✅ **Use Client Components for**:
- Real-time subscriptions and collaborative features
- Interactive UI updates and optimistic mutations
- Simple CRUD operations without complex business logic
- Fast user interactions without network latency

```typescript
// lib/supabase/client.ts - Browser client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Critical Server-Side Security Rule

⚠️ **Always use `supabase.auth.getUser()` on the server, never `getSession()`**

```typescript
// ❌ Wrong - session is not validated on server
const { data: { session } } = await supabase.auth.getSession()

// ✅ Correct - validates JWT with Auth server
const { data: { user }, error } = await supabase.auth.getUser()
```

The `getSession()` method only checks cookie existence and expiry but doesn't verify the JWT signature. The `getUser()` method validates the token with the Auth server, ensuring tamper-proof authentication.

## Row Level Security (RLS) Best Practices

### Essential RLS Setup

RLS must be enabled on all user-facing tables. Tables created via the Supabase dashboard have RLS enabled by default, but SQL-created tables require manual enablement:

```sql
-- Enable RLS on custom tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
```

### Common RLS Policy Patterns

**User Ownership Pattern**:
```sql
-- Users can only access their own documents
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
```

**Anonymous vs Authenticated User Differentiation**:
```sql
-- Only allow permanent (non-anonymous) users to create posts
CREATE POLICY "Only permanent users can post" ON public.news_feed
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'is_anonymous')::boolean IS FALSE);
```

**Public Sharing with Privacy Controls**:
```sql
-- Documents can be viewed by owner or if marked as public
CREATE POLICY "View documents" ON public.documents
  FOR SELECT
  USING (
    created_by = auth.uid() OR 
    (is_public = true AND published_at IS NOT NULL)
  );
```

### RLS Performance Optimisation

**Subquery Wrapping for JWT Functions**:
```sql
-- ❌ Inefficient - JWT function called for every row
CREATE POLICY "user_documents" ON documents
  FOR SELECT USING (user_id = auth.uid());

-- ✅ Optimised - subquery enables query plan caching
CREATE POLICY "user_documents" ON documents
  FOR SELECT USING (user_id = (SELECT auth.uid()));
```

**Proper Indexing for RLS**:
```sql
-- Create indexes that align with RLS policy filters
CREATE INDEX idx_documents_user_id ON documents(created_by);
CREATE INDEX idx_documents_public ON documents(is_public, published_at) 
  WHERE is_public = true;
```

**Explicit Filtering in Queries**:
```sql
-- ❌ Relies only on RLS policy (poor performance)
SELECT * FROM documents ORDER BY created_at DESC LIMIT 10;

-- ✅ Explicit filter helps query planner
SELECT * FROM documents 
WHERE created_by = auth.uid()  -- Duplicate RLS logic intentionally
ORDER BY created_at DESC LIMIT 10;
```

### RLS Common Pitfalls

❌ **Missing Policies**: Every operation (SELECT, INSERT, UPDATE, DELETE) needs explicit policies
❌ **Complex Joins**: Multi-table queries involve multiple RLS policies - test thoroughly
❌ **Service Key Exposure**: Service keys bypass RLS entirely - never expose to client-side code
❌ **Default Template Misuse**: Supabase's default policy templates often need customisation

## Storage Security and File Access

### Storage RLS Integration

Supabase Storage uses RLS on the `storage.objects` table. File operations require appropriate policies:

```sql
-- Allow users to upload files to their folder
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### Signed URLs for Secure Access

For private buckets, use signed URLs to provide temporary access:

```typescript
// Generate signed URL for authenticated access
const { data, error } = await supabase.storage
  .from('documents')
  .createSignedUrl('user-id/document.pdf', 3600); // 1 hour expiry

// Download file directly (respects RLS)
const { data, error } = await supabase.storage
  .from('documents')
  .download('user-id/document.pdf');
```

### Service Key Pattern for Bypass

Use service keys only on the server for administrative operations:

```typescript
// Server-only service client (bypasses RLS)
import { createClient } from '@supabase/supabase-js'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Never expose to client
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

## Performance Considerations

### Query Optimisation Patterns

**Index Strategy**:
- Align indexes with RLS policy columns (`created_by`, `is_public`, etc.)
- Use partial indexes for filtered queries
- Consider BRIN indexes for timestamp columns with ordered inserts

**Connection Management**:
- Use connection pooling (Supavisor) for serverless functions
- Configure appropriate connection limits based on compute size
- Implement connection retry logic for transient failures

**Real-time Subscription Optimisation**:
```typescript
// ✅ Efficient real-time subscription with filters
const subscription = supabase
  .channel('document_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'documents',
    filter: `created_by=eq.${userId}` // Server-side filtering
  }, handleChange)
  .subscribe();

// Don't forget to cleanup
useEffect(() => {
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### Caching Strategies

**Next.js Cache Integration**:
```typescript
// API route with caching
export async function GET() {
  // Cookies opt out of Next.js static caching for auth
  const cookieStore = await cookies()
  
  const supabase = await createClient()
  const { data } = await supabase
    .from('documents')
    .select('*')
    
  return Response.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=300' // 5 minute cache
    }
  })
}
```

## API Routes vs Direct Client Calls

### Direct Client Call Patterns

✅ **Use for simple operations**:
```typescript
// Simple CRUD in Client Components
'use client'

import { createClient } from '@/lib/supabase/client'

export function DocumentList() {
  const [documents, setDocuments] = useState([])
  const supabase = createClient()
  
  useEffect(() => {
    async function loadDocuments() {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('created_by', user.id)
      setDocuments(data)
    }
    loadDocuments()
  }, [])
  
  return <div>{/* Render documents */}</div>
}
```

### API Route Patterns

✅ **Use for complex business logic**:
```typescript
// app/api/documents/process/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Validate auth
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Complex business logic
  const result = await processDocument(user.id, requestData)
  
  return Response.json({ success: true, data: result })
}
```

## Anonymous vs Authenticated User Patterns

### Anonymous User Creation and Management

```typescript
// Create anonymous user
const { data, error } = await supabase.auth.signInAnonymously({
  options: {
    captcha: captchaToken // Recommended for abuse prevention
  }
})

// Check if user is anonymous
const { data: { user } } = await supabase.auth.getUser()
const isAnonymous = user?.is_anonymous || false
```

### Converting Anonymous to Permanent Users

```typescript
// Link anonymous user to permanent identity
const { data, error } = await supabase.auth.linkIdentity({
  provider: 'google'
})

// Or via email signup
const { data, error } = await supabase.auth.updateUser({
  email: 'user@example.com',
  password: 'newpassword'
})
```

### RLS Policies for Mixed User Types

```sql
-- Allow both authenticated and anonymous users to read public content
CREATE POLICY "Public content access" ON public.articles
  FOR SELECT TO authenticated, anon
  USING (is_published = true);

-- Restrict creation to permanent users only
CREATE POLICY "Permanent users only" ON public.user_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE
    AND created_by = auth.uid()
  );
```

## Document-Centric Application Patterns

### User Document Ownership

```typescript
// Service layer pattern for document management
export class DocumentService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async createForUser(
    userId: string, 
    document: Omit<DocumentInsert, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<Document> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      throw new Error('Invalid user ID format')
    }

    const { data, error } = await this.supabase
      .from('documents')
      .insert({
        ...document,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create document: ${error.message}`)
    }

    return data
  }
}
```

### Public Document Sharing

```typescript
// Public sharing without authentication
async function getPublicDocument(slug: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .not('published_at', 'is', null)
    .single()
    
  return { data, error }
}
```

## Error Handling and Debugging

### Service Layer Error Patterns

```typescript
// Consistent error handling in database services
export class DocumentService {
  async getById(id: string): Promise<Document | null> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      // Handle "not found" gracefully
      if (error.code === 'PGRST116') {
        return null
      }
      // Propagate other errors with context
      throw new Error(`Failed to fetch document ${id}: ${error.message}`)
    }

    return data
  }
}
```

### Common Debugging Techniques

**Check RLS Policies**:
```sql
-- View policies on a table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'documents';
```

**Test JWT Claims**:
```sql
-- Check current user and JWT claims in SQL
SELECT auth.uid(), auth.jwt();
```

**Monitor Performance**:
```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC;
```

### Safe single-row selects with `.maybeSingle()`

Supabase v2 adds `.maybeSingle()` (or `.throwOnError().maybeSingle()` if you prefer exceptions) which behaves like `.single()` **except** it treats a "zero-rows" result as a success, returning `{ data: null, error: null }` instead of triggering an HTTP 406 / `PGRST116`. Use it whenever the absence of a row is a valid outcome (for example, per-user metadata that may not exist yet).

```ts
const { data, error } = await supabase
  .from('document_users')
  .select('background')
  .eq('user_id', user.id)
  .eq('document_id', docId)
  .maybeSingle()

// data === null means "no record yet", error remains null
```

If duplicates are possible, `.maybeSingle()` will still surface a `PGRST117` error ("multiple rows returned"), so misuse is easy to spot in development.

## Migration and Scaling Considerations

### Database Migration Patterns

When migrating database schemas, ensure RLS policies are updated accordingly:

```sql
-- Migration: Add new column with RLS update
ALTER TABLE documents ADD COLUMN visibility TEXT DEFAULT 'private';

-- Update existing RLS policy to use new column
DROP POLICY IF EXISTS "Public document access" ON documents;
CREATE POLICY "Public document access" ON documents
  FOR SELECT
  USING (
    created_by = auth.uid() OR 
    (visibility = 'public' AND published_at IS NOT NULL)
  );
```

### Scaling Strategies

**Connection Pooling**: Configure Supavisor for high-traffic applications
**Read Replicas**: Use for analytics and reporting queries
**Horizontal Scaling**: Consider table partitioning for large datasets
**CDN Integration**: Leverage signed URLs with CDN for global file distribution

## Troubleshooting Checklist

**Authentication Issues**:
- [ ] Using `getUser()` instead of `getSession()` on server
- [ ] Middleware configured for session refresh
- [ ] Cookies enabled for SSR client

**RLS Policy Issues**:
- [ ] RLS enabled on all user tables
- [ ] Policies exist for all required operations
- [ ] Indexes align with policy filter columns
- [ ] Service key not exposed to client

**Performance Problems**:
- [ ] JWT functions wrapped in subqueries
- [ ] Explicit filters added to queries
- [ ] Connection pooling configured
- [ ] Real-time subscriptions properly cleaned up

**Storage Access Issues**:
- [ ] Bucket privacy settings configured correctly
- [ ] Storage RLS policies match file structure
- [ ] Signed URLs used for private bucket access
- [ ] File paths follow expected patterns