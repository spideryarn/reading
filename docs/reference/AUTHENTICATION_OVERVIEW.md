# Authentication System Overview

Spideryarn Reading uses Supabase Auth with Next.js App Router for secure user registration, login, route protection, and profile management. Supports email/password authentication, Google OAuth, long-lasting sessions, and password reset.

## See also

**Authentication Documentation**:
- `docs/reference/AUTHENTICATION_SETUP.md` - Configuration, Supabase, Gmail SMTP, development and production setup
- `docs/reference/AUTHENTICATION_UI.md` - UI components, forms, and authentication pages
- `docs/reference/AUTHENTICATION_DATABASE.md` - Database integration, user profiles, and data ownership
- `docs/reference/AUTHENTICATION_SECURITY.md` - Security practices, route protection, and troubleshooting

**Implementation Files**:
- `lib/auth/` - Authentication utilities and server-side helpers
- `components/auth/` - Authentication UI components and forms
- `app/auth/` - Authentication pages and route handlers
- `middleware.ts` - Session management and automatic token refresh

**Related Documentation**:
- `docs/reference/DESIGN_SHADCN_UI_REFERENCE.md` - UI component library patterns
- `planning/250601a_authentication_implementation.md` - Complete implementation history
- `planning/250612b_integrate_stripe_subscriptions.md` - Stripe subscription integration planning

## Key Architecture Decisions

**Authentication Strategy**:
- Supabase Auth with email/password + Google OAuth
- Cookie-based sessions with @supabase/ssr for SSR compatibility
- Long-lasting sessions (1 week JWT, never-expiring refresh tokens)
- shadcn/ui components with React Hook Form and Zod validation
- Server-side validation using `getUser()` for all protected resources

**Route Protection Philosophy**:
- Flexible protection for specific routes while leaving others public
- User experience with `/auth/login?next=/protected/route` redirects
- Proper 401 status codes for bots accessing protected routes

## Authentication Helper Functions

The authentication system provides three core helper functions in `lib/auth/server-auth.ts`, each with a single, well-defined behavior. All functions support both cookie-based authentication (default) and Bearer token authentication (explicit opt-in for testing).

### `getAuthUser(opts?: { allowBearer?: boolean; request?: Request }): Promise<User | null>`
Returns the current authenticated user or `null`. Never throws errors or performs redirects.

**Use when**: You need to check authentication status and handle the result yourself (e.g., showing different UI for authenticated vs unauthenticated users).

```typescript
// In a server component (cookie-based)
const user = await getAuthUser()
if (!user) {
  return <div>Please log in to view your documents</div>
}
return <DocumentList userId={user.id} />

// In an API route with Bearer token support (for testing)
const user = await getAuthUser({ allowBearer: true, request })
```

### `requireAuth(opts?: { redirectTo?: string; allowBearer?: boolean; request?: Request }): Promise<User>`
Guarantees authentication by either returning a User or handling failure.

- **API routes** (no options): Throws `AuthError` with status 401
- **Page components** (with `redirectTo`): Performs redirect to login page

**Use when**: You need guaranteed authentication and want the helper to handle failures.

```typescript
// In an API route (throws AuthError)
export async function GET() {
  const user = await requireAuth()
  // user is guaranteed to be valid here
}

// In a page component (redirects)
export default async function ProtectedPage() {
  const user = await requireAuth({ redirectTo: '/auth/login' })
  // user is guaranteed to be valid here
}

// In an API route with Bearer token support (for testing)
export async function POST(request: Request) {
  const user = await requireAuth({ allowBearer: true, request })
  // user is guaranteed to be valid here
}
```

### `assertAuth(request: Request, opts?: { allowBearer?: boolean }): Promise<{ success: boolean; user?: User; error?: string }>`
Returns a structured result object. Never throws errors or performs redirects.

**Use when**: You need explicit control over authentication failure handling, such as in middleware or edge functions.

```typescript
// In an API route with explicit error handling
export async function POST(request: Request) {
  const { success, user, error } = await assertAuth(request)
  if (!success) {
    return NextResponse.json({ error }, { status: 401 })
  }
  // Use user here
}

// In an API route with Bearer token support (for testing)
export async function POST(request: Request) {
  const { success, user, error } = await assertAuth(request, { allowBearer: true })
  if (!success) {
    return NextResponse.json({ error }, { status: 401 })
  }
  // Use user here
}
```

## Authentication Methods

### Cookie-Based Authentication (Default)
- Primary authentication method for web browsers
- Sessions managed via HTTP-only cookies with @supabase/ssr
- Automatic token refresh via middleware
- Secure by default with CSRF protection

### Bearer Token Authentication (Testing Only)
- Secondary authentication method for API testing
- Requires explicit opt-in via `allowBearer: true` flag
- Uses `Authorization: Bearer <jwt>` header
- No caching of Supabase clients to prevent JWT leakage
- Designed for integration tests and automated testing scenarios

### Unified Supabase Client Creation
The system provides `getSupabaseServerClient(request, opts)` which returns a properly authenticated Supabase client based on the authentication method:
- Cookie-based client by default
- Bearer token client when `opts.allowBearer` is true and Authorization header is present
- Ensures RLS policies work correctly regardless of authentication method

## Implementation Status

### ✅ Completed Features
- Foundation setup with middleware and route handlers
- Login/signup forms with validation and error handling  
- Server-side route protection with redirect handling
- Automatic profile creation and document ownership tracking
- Google OAuth integration
- User profile page and dropdown navigation
- Email-based password reset flow
- Production deployment documentation

### ⚠️ Configuration TODO
- Gmail SMTP setup for password reset emails
- Production Supabase project configuration

## Core Authentication Flows

**Registration**: Sign up with email/password or Google OAuth → automatic profile creation → immediate login

**Login**: Credential validation → session creation → redirect to requested page

**Password Reset**: Email link → reset form → automatic login

**Session Management**: 
- Automatic token refresh via middleware
- 1-week duration with never-expiring refresh tokens
- Cross-domain support for apex and www domains

## Application Integration

**Document Access**: User-scoped documents with `created_by` ownership

**Chat Feature**: Requires authentication - chat threads are user-scoped with no anonymous access allowed

**User Profiles**: Automatic profile creation, profile page with document listings, header dropdown navigation

**Database**: RLS policies for data isolation, PostgreSQL triggers for profile creation, document ownership patterns

## Development Workflow

**Local Development**: `npx supabase start` → `npm run dev`

**Testing**: Email auth at `/auth/login`, OAuth flow, protected routes at `/read/[slug]`, profile at `/auth/profile`

**Production**: See `docs/reference/AUTHENTICATION_SETUP.md` for Supabase dashboard, OAuth, and domain configuration

## Troubleshooting

**Common Issues**: Session persistence (check middleware), OAuth redirects (verify URLs), password reset (check Gmail SMTP), route protection (use server-side `getUser()`)

**Debug Tools**: Supabase Studio (http://127.0.0.1:54343), Inbucket email testing (http://127.0.0.1:54344), browser DevTools

