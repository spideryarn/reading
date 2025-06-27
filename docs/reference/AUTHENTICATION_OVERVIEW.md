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

