# Authentication Security and Route Protection

Security best practices, route protection patterns, and troubleshooting guide for the Spideryarn Reading authentication system, ensuring secure access control and protection against common vulnerabilities.

## See also

- `docs/reference/AUTHENTICATION_OVERVIEW.md` - High-level authentication system architecture and flows
- `docs/reference/AUTHENTICATION_SETUP.md` - Configuration and setup for secure authentication
- `docs/reference/AUTHENTICATION_UI.md` - User interface components with security considerations
- `docs/reference/AUTHENTICATION_DATABASE.md` - Database security patterns and user data protection
- `lib/auth/` - Authentication utilities and security helper functions
- `middleware.ts` - Session management and automatic token refresh implementation
- `docs/reference/CODING_GUIDELINES.md` - Security-focused coding patterns and best practices

## Security Architecture

### Authentication Security Principles

**Server-Side Validation** ⚠️ **CRITICAL**:
- **Always use `supabase.auth.getUser()`** for server-side authentication validation
- **Never trust `supabase.auth.getSession()`** in Server Components or API routes
- **Validate auth state** before any database operations or sensitive actions
- **Use RLS policies** to enforce data isolation at the database level

**Session Management**:
- **Cookie-based sessions** with HttpOnly and Secure flags in production
- **Automatic token refresh** via middleware on every request
- **Long-lasting sessions** balanced with security considerations
- **Proper session invalidation** on logout and security events

**Input Validation**:
- **Client-side validation** for user experience (Zod schemas)
- **Server-side validation** for security (never trust client input)
- **Sanitization** of user inputs before database operations
- **Open redirect prevention** for authentication redirects

## Route Protection System ✅

### Server-Side Route Protection

**Authentication Utilities** (`lib/auth/server-auth.ts`):

```typescript
// Core authentication check
export async function getUser(): Promise<{
  user: User | null
  error: string | null
}> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    return { user: null, error: error.message }
  }
  
  return { user, error: null }
}

// Strict authentication requirement
export async function validateAuth(): Promise<User> {
  const { user, error } = await getUser()
  
  if (error || !user) {
    throw new Error('Authentication required')
  }
  
  return user
}
```

**Route Protection Utilities** (`lib/auth/route-protection.ts`):

```typescript
// Require authentication with redirect
export async function requireAuth(options: {
  returnTo?: string
  allowBots?: boolean
} = {}): Promise<User> {
  const { user } = await getUser()
  
  if (!user) {
    const { returnTo } = options
    const redirectUrl = `/auth/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''}`
    redirect(redirectUrl)
  }
  
  return user
}

// Optional authentication check
export async function getAuthUser(): Promise<User | null> {
  const { user } = await getUser()
  return user
}
```

### Client-Side Route Protection

**Authentication Context** (`lib/context/auth-context.tsx`):

```typescript
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}
```

**Client Route Guards**:
```typescript
// Protect client components
const { user, loading } = useAuth()

if (loading) {
  return <LoadingSpinner />
}

if (!user) {
  return <LoginRequired />
}

// Render protected content
return <ProtectedContent user={user} />
```

### Route Protection Patterns

**Protected Route Example**:
```typescript
// app/documents/[slug]/page.tsx
export default async function DocumentPage({ params }: { params: { slug: string } }) {
  // Require authentication, redirect if not logged in
  const user = await requireAuth({
    returnTo: `/read/${params.slug}`
  })
  
  // User is guaranteed to be authenticated here
  const document = await getDocumentBySlug(params.slug)
  
  // Check document ownership
  if (document.created_by !== user.id && !document.is_public) {
    notFound() // 404 for unauthorized access
  }
  
  return <DocumentView document={document} user={user} />
}
```

**Public Route Example**:
```typescript
// Public routes do not require authentication
export default async function PublicPage({ params }: { params: { slug: string } }) {
  // No authentication required
  const document = await getDocumentBySlug(params.slug)
  
  if (!document || !document.is_public) {
    notFound() // 404 for non-public documents
  }
  
  return <PublicDocumentView document={document} />
}
```

## Security Best Practices

### Server-Side Security

**API Route Protection**:
```typescript
// app/api/protected/route.ts
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const user = await validateAuth()
    
    // Perform authorized operation
    const data = await getUserData(user.id)
    
    return Response.json(data)
  } catch (error) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
```

**Resource Ownership Verification**:
```typescript
// Check document ownership before operations
export async function checkDocumentOwnership(documentId: string, userId: string): Promise<boolean> {
  const documentService = new DocumentService(createClient())
  return await documentService.isOwnedByUser(documentId, userId)
}

// Usage in API routes
const canEdit = await checkDocumentOwnership(documentId, user.id)
if (!canEdit) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Client-Side Security

**Redirect URL Validation** (`lib/auth/client-utils.ts`):
```typescript
export function getRedirectUrl(searchParams: URLSearchParams, fallback = '/'): string {
  const next = searchParams.get('next')
  
  if (!next) {
    return fallback
  }
  
  // Prevent open redirects - only allow relative URLs
  if (!next.startsWith('/') || next.startsWith('//')) {
    return fallback
  }
  
  // Prevent redirect loops by avoiding auth pages
  if (next.startsWith('/auth/')) {
    return fallback
  }
  
  return next
}
```

**CSRF Protection**:
- **SameSite Cookie Settings**: Configured in Supabase middleware
- **Origin Validation**: Built into Supabase Auth
- **State Parameter**: Used in OAuth flows for CSRF protection

### Database Security

**Row Level Security (RLS) Policies**:
```sql
-- Users can only access their own profiles
CREATE POLICY "Users can access own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own documents
CREATE POLICY "Users can manage own documents" ON public.documents
  FOR ALL USING (auth.uid() = created_by);

-- Public documents are readable by anyone
CREATE POLICY "Public documents are readable" ON public.documents
  FOR SELECT USING (is_public = true);
```

**Sensitive Data Protection**:
- **Environment Variables**: Secure storage of API keys and secrets
- **Database Encryption**: Supabase provides encryption at rest
- **Connection Security**: TLS encryption for all database connections
- **Audit Logging**: Track authentication events and sensitive operations

## Session Management Security

### Cookie Configuration

**Production Cookie Settings**:
```typescript
// Secure cookie configuration for production
const cookieOptions = {
  httpOnly: true,        // Prevent XSS access to cookies
  secure: true,          // HTTPS only in production
  sameSite: 'lax',       // CSRF protection
  maxAge: 60 * 60 * 24 * 7, // 1 week expiration
  path: '/'              // Available site-wide
}
```

### Session Duration Strategy

**Long-Lasting Sessions Configuration**:
- **JWT Expiry**: 1 week (604,800 seconds) - maximum allowed by Supabase
- **Refresh Token**: Never expires (refresh rotation disabled)
- **Automatic Refresh**: Middleware refreshes tokens on every request
- **Manual Logout**: Explicit session invalidation when user logs out

**Security Rationale**:
- **User Convenience**: Reduces re-authentication friction for document reading application
- **Automatic Refresh**: Maintains fresh tokens without user intervention
- **Explicit Logout**: Users maintain control over session termination
- **Compromise Detection**: Monitor for suspicious authentication patterns

### Token Management

**Middleware Session Refresh** (`middleware.ts`):
```typescript
export async function middleware(request: NextRequest) {
  let response = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // Update cookies in request and response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Trigger token refresh
  await supabase.auth.getUser()
  return response
}
```

## Troubleshooting Security Issues

### Common Authentication Problems

**Session Not Persisting**:
```typescript
// Debug session issues
const { data: { session }, error } = await supabase.auth.getSession()
console.log('Session:', session)
console.log('Error:', error)

// Check middleware configuration
// Verify cookie settings in production
// Confirm HTTPS is used in production
```

**Route Protection Failing**:
```typescript
// Debug route protection
export default async function ProtectedPage() {
  const { user, error } = await getUser()
  console.log('User:', user)
  console.log('Error:', error)
  
  if (!user) {
    console.log('Redirecting to login...')
    redirect('/auth/login')
  }
}
```

**OAuth Redirect Issues**:
- **Verify redirect URIs** in Google Cloud Console match exactly
- **Check Supabase site URL** configuration in dashboard
- **Confirm environment variables** are correctly set
- **Test with different browsers** to rule out cookie issues

### Security Vulnerability Checks

**Open Redirect Prevention**:
```typescript
// Test redirect URL validation
const testUrls = [
  '/valid/path',           // Should allow
  '//malicious.com',       // Should block
  'https://evil.com',      // Should block
  '/auth/login',           // Should block (loop prevention)
]

testUrls.forEach(url => {
  const result = getRedirectUrl(new URLSearchParams(`next=${url}`), '/')
  console.log(`${url} -> ${result}`)
})
```

**CSRF Protection Verification**:
- **Test SameSite cookie** settings prevent cross-site requests
- **Verify Origin header** validation in sensitive operations
- **Check state parameter** handling in OAuth flows

**Input Validation Testing**:
```typescript
// Test input sanitization
const maliciousInputs = [
  '<script>alert("xss")</script>',
  "'; DROP TABLE users; --",
  '../../../etc/passwd',
]

// Verify all inputs are properly validated and sanitized
```

### Security Checklist

**Pre-Production Security Review**:
- [ ] All routes properly protected with authentication checks
- [ ] RLS policies implemented and tested for all user data
- [ ] Input validation in place for all user inputs
- [ ] Open redirect vulnerabilities prevented
- [ ] HTTPS enforced in production
- [ ] Secure cookie settings configured
- [ ] OAuth providers properly configured with correct redirect URIs
- [ ] Environment variables secured and not exposed
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Error messages don't leak sensitive information
- [ ] Audit logging implemented for security events
- [ ] Rate limiting configured for authentication endpoints

---

*Last updated: 6 June 2025*  
*Security Status: Core Protection Complete ✅, Monitoring Recommended 📋*  
*Next review: After production deployment and security audit*