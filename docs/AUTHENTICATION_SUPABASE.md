# Supabase Authentication Implementation Guide

This document provides a comprehensive guide for implementing authentication in the Spideryarn Reading application using Supabase Auth, Next.js App Router, and shadcn/ui components.

## See also

- `lib/supabase/client.ts` - Browser-side Supabase client implementation
- `lib/supabase/server.ts` - Server-side Supabase client implementation  
- `supabase/config.toml` - Local Supabase configuration with auth settings
- `docs/SHADCN_UI_REFERENCE.md` - Component library usage and installation guide
- `docs/CODING_GUIDELINES.md` - TypeScript and React patterns to follow
- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) - Official documentation
- [Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Server component patterns
- [shadcn/ui Authentication Examples](https://ui.shadcn.com/examples/authentication) - UI component reference

## Key Architectural Decisions

**Current State**: ✅ Route Protection System implemented with authentication UI and protected routes
**Target State**: 📋 Database Profile Integration and advanced features
**Implementation Status**: Foundation ✅, Basic Authentication UI ✅, Route Protection System ✅

### Authentication Strategy
- **Provider**: Supabase Auth as primary authentication service
- **Session Management**: Cookie-based sessions using @supabase/ssr for SSR compatibility
- **UI Framework**: shadcn/ui components with React Hook Form and Zod validation
- **Security Pattern**: Server-side validation using `getUser()` for all protected resources

## Current Infrastructure

### Supabase Configuration ✓

The project has Supabase properly configured with modern packages:

```json
"@supabase/ssr": "^0.6.1",
"@supabase/supabase-js": "^2.49.8"
```

**Client Setup**:
- Browser client: `lib/supabase/client.ts` using `createBrowserClient`
- Server client: `lib/supabase/server.ts` using `createServerClient` with cookie handling
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Local Development**: 
- Auth enabled in `supabase/config.toml`
- Email confirmations disabled for local dev (`enable_confirmations = false`)
- Signup enabled (`enable_signup = true`)
- Site URL configured for localhost:3000

### Available UI Components ✓

The project uses shadcn/ui with these authentication-relevant components:
- `Button` - All variants with Spideryarn orange theme
- `Dialog` - For modal authentication flows
- `Alert` - Error and success state handling
- `Input` - Form field components
- Form components planned (not yet installed)

## Implementation Plan

### Phase 1: Core Authentication Infrastructure 📋

#### 1.1 Install Required Components
```bash
# Install shadcn/ui form components for authentication
printf "\n" | npx shadcn@latest add form
printf "\n" | npx shadcn@latest add label
```

#### 1.2 Create Middleware
Implement `middleware.ts` to handle session refresh:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => 
            request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

#### 1.3 Authentication Route Handlers
Create API routes for auth flows:

- `app/auth/confirm/route.ts` - Email confirmation handler
- `app/auth/callback/route.ts` - OAuth callback handler
- `app/auth/signout/route.ts` - Sign out handler

### Phase 2: Authentication UI Components 📋

#### 2.1 Core Authentication Forms
Based on shadcn/ui patterns and React Hook Form:

**Login Form** (`components/auth/login-form.tsx`):
```typescript
const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Implementation using shadcn/ui Form components
// with Supabase signInWithPassword
```

**Signup Form** (`components/auth/signup-form.tsx`):
```typescript
const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword)

// Implementation using shadcn/ui Form components  
// with Supabase signUp
```

#### 2.2 Authentication Layouts
- Authentication page wrapper (light mode only)
- Error handling with shadcn/ui Alert components
- Loading states using existing Loading component

### Phase 3: Protected Routes and Session Management ✅

#### 3.1 Authentication Context ✅
Authentication context implemented in `lib/context/auth-context.tsx`:

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

#### 3.2 Route Protection Patterns ✅
Comprehensive route protection system implemented:

**Server-Side Route Protection** (`lib/auth/route-protection.ts`):
```typescript
// Require authentication for a server component
export default async function ProtectedPage() {
  await requireAuth({ returnTo: '/protected/route' })
  // User is guaranteed to be authenticated here
}

// Optional authentication check
const user = await getAuthUser()
if (user) {
  // User is authenticated
}
```

**Server-Side Authentication Helpers** (`lib/auth/server-auth.ts`):
```typescript
// Get user with error handling
const { user, error } = await getUser()

// Validate authentication (throws if not authenticated)
const user = await validateAuth() // Use in API routes

// Get user profile information
const profile = await getUserProfile()

// Check resource ownership
const canEdit = await checkResourceOwnership(resourceUserId)
```

**Client-Side Utilities** (`lib/auth/client-utils.ts`):
```typescript
// Safe redirect URL handling (prevents open redirects)
const redirectUrl = getRedirectUrl(searchParams, '/')
```

**Route Configuration Examples**:
- **Protected**: `/documents/[slug]` - Requires authentication
- **Public**: `/documents/[slug]/share` - Accessible to all users and bots
- **Mixed**: `/documents/[slug]/tweets` - Protected feature route

#### 3.3 Security Features ✅
- **Open Redirect Prevention**: Validates redirect URLs to prevent security vulnerabilities
- **Bot Detection**: Differentiates between search engine bots and users for SEO-friendly 401 responses
- **Server-Side Validation**: All protected routes use server-side `getUser()` validation
- **Comprehensive Error Handling**: Graceful handling of authentication failures and edge cases

#### 3.4 Database Integration 📋
User-related schema extensions (next phase):
- User profiles table linking to `auth.users`
- Document ownership and access control
- RLS (Row Level Security) policies

## Security Best Practices

### Server-Side Security ⚠️ CRITICAL
1. **Always use `supabase.auth.getUser()`** for server-side auth validation
2. **Never trust `supabase.auth.getSession()`** in Server Components
3. **Implement RLS policies** for all user-accessible data
4. **Validate auth state** before any database operations

### Client-Side Patterns
1. **Use authentication context** for consistent state management
2. **Handle loading states** during auth operations
3. **Implement proper error handling** with user-friendly messages
4. **Redirect appropriately** based on auth state

### Cookie Configuration
- **Secure cookies** in production
- **SameSite settings** for CSRF protection
- **HttpOnly flags** where appropriate
- **Proper expiration** aligned with JWT settings

## Development Workflow

### Local Development
1. Start Supabase: `supabase start`
2. Access Studio: `http://127.0.0.1:54343`
3. Test emails: Inbucket at `http://127.0.0.1:54344`
4. View logs: `supabase logs --local`

### Testing Strategy ✅
Comprehensive test suite implemented with 124+ passing tests:

**Unit Tests**:
- Route protection utilities (`lib/auth/__tests__/route-protection.test.ts`)
- Server authentication helpers (`lib/auth/__tests__/server-auth.test.ts`) 
- Client utilities (`lib/auth/__tests__/client-utils.test.ts`)
- Authentication context and form validation

**Integration Tests**:
- Complete authentication flows (`lib/auth/__tests__/route-integration.test.ts`)
- Protected route access patterns
- Redirect flows with next parameter handling
- Bot detection and 401 response generation

**Security Tests**:
- Open redirect prevention
- Input validation and sanitization
- Resource ownership verification
- Error handling and edge cases

**Testing Infrastructure**:
- Jest with React Testing Library
- Mocked Supabase authentication calls
- Next.js route and redirect mocking
- Comprehensive coverage of authentication scenarios

### Environment Variables
Required for authentication:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Integration Points

### Existing Application Features
- **Document access control**: Restrict documents by user ownership
- **Chat history**: Associate conversations with authenticated users  
- **Settings persistence**: User-specific preferences and configurations
- **Activity tracking**: User-scoped analytics and usage patterns

### Database Schema Considerations
- Link documents to user accounts via `user_id` foreign keys
- Implement RLS policies for data isolation
- Consider document sharing mechanisms for future collaboration features

## Troubleshooting

### Common Issues
1. **Cookie not being set**: Check middleware configuration and domain settings
2. **Session not persisting**: Verify `createServerClient` cookie handlers
3. **Auth state out of sync**: Ensure proper client/server state management
4. **Redirect loops**: Check middleware matcher patterns and auth guards

### Debugging Tools
- Supabase Studio for auth logs and user management
- Browser DevTools for cookie inspection
- Next.js debugging for middleware execution
- Network tab for API call monitoring

## Future Enhancements 🚧

### Planned Features
- **Social authentication**: GitHub, Google OAuth providers
- **Multi-factor authentication**: TOTP and phone verification
- **User profiles**: Extended user information and preferences
- **Team collaboration**: Document sharing and access management
- **API authentication**: Service-to-service authentication for future API endpoints

### Advanced Security
- **Rate limiting**: Enhanced protection against brute force attacks
- **Session management**: Advanced timeout and refresh policies
- **Audit logging**: Comprehensive authentication event tracking
- **Password policies**: Enhanced strength requirements

---

*Last updated: 1 June 2025*
*Next review: After Phase 1 implementation completion*