# Authentication Implementation

## Goal, context

Implement a comprehensive authentication system for the Spideryarn Reading application using Supabase Auth, Next.js App Router, and shadcn/ui components. The system should provide secure user registration, login, route protection, and user profile management while integrating seamlessly with the existing database schema.

Key objectives:
- Email/password authentication in early stage, Google OAuth in middle stage
- Route-level access control with configurable protection patterns
- Bot-friendly 401 responses for protected routes
- User profile management with document ownership tracking
- Automatic profile creation when users register
- Clean UI integration with the existing design system
- Visual polish and aesthetic enhancements in later stages

This builds on the completed database implementation and leverages the existing Supabase infrastructure already configured in the project.

## References

- `docs/AUTHENTICATION_SUPABASE.md` - Comprehensive technical guide with implementation patterns, security best practices, and component architecture
- `planning/250531a_database_storage_implementation.md` - Completed database schema with profiles table and auth.users integration
- `lib/supabase/client.ts` and `lib/supabase/server.ts` - Existing Supabase client configuration using @supabase/ssr
- `supabase/config.toml` - Local Supabase configuration with auth settings enabled
- `docs/SHADCN_UI_REFERENCE.md` - Component library installation and usage patterns
- `docs/CODING_GUIDELINES.md` - TypeScript, React, and testing patterns to follow
- `docs/STYLING.md` - CSS and visual styling configuration for UI consistency
- `components/app-header.tsx` - Main header component requiring auth UI integration
- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) - Official documentation for auth implementation
- [shadcn/ui Authentication Examples](https://ui.shadcn.com/examples/authentication) - Reference UI patterns for auth forms

## Principles, key decisions

### Authentication Strategy
- **Provider**: Supabase Auth as primary service with email/password first, OAuth providers second
- **Session Management**: Cookie-based sessions using @supabase/ssr for SSR compatibility and long session duration
- **Security**: Server-side validation with `getUser()` for all protected resources, never trust `getSession()` in server components
- **UI Framework**: shadcn/ui components with React Hook Form and Zod validation for type-safe forms

### Route Protection Philosophy
- **Flexible Protection**: Easy to apply protection to specific routes while leaving others public
- **SEO-Friendly**: Public routes like `/documents/[slug]/share` remain accessible to bots and unauthenticated users
- **User Experience**: Redirect pattern `/auth/login?next=/protected/route` for seamless post-login navigation
- **Bot Handling**: Return proper 401 status codes for protected routes accessed by bots

### Database Integration
- **Profile Automation**: Automatic profile creation in `public.profiles` when auth.users is created (database trigger)
- **Document Ownership**: Link documents to users via `created_by` foreign key from completed schema
- **User-Scoped Data**: Row Level Security policies to isolate user data appropriately

### UI Design Approach
- **Light Mode Only**: Focus on light mode implementation, no dual-mode complexity
- **Progressive Enhancement**: Start with basic functional UI, add visual polish in later stages
- **Design Consistency**: Follow existing Spideryarn orange theme and Phosphor icons patterns
- **Accessibility**: Leverage shadcn/ui accessibility features and proper form patterns

### Long-term Session Strategy
- **User-Friendly**: Sessions persist for extended periods to minimize re-authentication friction
- **Security Balance**: Use Supabase's default JWT settings while prioritizing user convenience
- **Simple Configuration**: Avoid complex "remember me" patterns, default to long sessions

## Actions

### Stage: Foundation Setup ✅
- [x] Install required shadcn/ui components for authentication forms
  - [x] Run: `printf "\n" | npx shadcn@latest add form`
  - [x] Run: `printf "\n" | npx shadcn@latest add label` 
  - [x] Verify components installed correctly in `components/ui/`

- [x] Create authentication middleware for session management
  - [x] Create `middleware.ts` in project root with session refresh logic
  - [x] Configure cookie handling for server/client synchronization
  - [x] Add middleware matcher to exclude static assets and API routes
  - [x] Test middleware with simple protected route

- [x] Set up core authentication route handlers
  - [x] Create `app/auth/callback/route.ts` for OAuth callback handling
  - [x] Create `app/auth/confirm/route.ts` for email confirmation flow
  - [x] Create `app/auth/signout/route.ts` for logout functionality
  - [x] Test route handlers with basic authentication flows

- [ ] Write tests for authentication infrastructure using subagent
  - [ ] Test middleware session refresh behavior
  - [ ] Test route handler responses and redirects
  - [ ] Verify error handling in auth flows

- [ ] Update `docs/AUTHENTICATION_SUPABASE.md` with foundation implementation details

### Stage: Basic Authentication UI 
- [ ] Create authentication page layouts
  - [ ] Create `app/auth/login/page.tsx` with clean, centered layout
  - [ ] Create `app/auth/signup/page.tsx` with matching design
  - [ ] Include Spideryarn branding and consistent styling
  - [ ] Ensure light mode only, no theme switching

- [ ] Implement login form component
  - [ ] Create `components/auth/login-form.tsx` using shadcn/ui Form components
  - [ ] Add email and password fields with Zod validation
  - [ ] Implement Supabase `signInWithPassword` integration
  - [ ] Add loading states and error handling with Alert components
  - [ ] Test form validation and submission flows

- [ ] Implement signup form component
  - [ ] Create `components/auth/signup-form.tsx` with email/password/confirm fields
  - [ ] Add password confirmation validation with Zod
  - [ ] Implement Supabase `signUp` integration
  - [ ] Include email confirmation messaging
  - [ ] Test complete signup flow including email verification

- [ ] Create authentication context for state management
  - [ ] Create `lib/context/auth-context.tsx` with user session state
  - [ ] Implement context provider with auth methods (signIn, signUp, signOut)
  - [ ] Add authentication state persistence across page loads
  - [ ] Test context state updates and session synchronization

- [ ] Write comprehensive tests for authentication UI using subagent
  - [ ] Test form validation, submission, and error states
  - [ ] Test authentication context state management
  - [ ] Test complete user registration and login flows

- [ ] Update header component with basic auth UI
  - [ ] Modify `components/app-header.tsx` to show login/signup links for unauthenticated users
  - [ ] Display user email for authenticated users in top-right corner
  - [ ] Add conditional rendering based on authentication state

- [ ] Git commit progress following `docs/GIT_COMMITS.md` using subagent

### Stage: Route Protection System
- [ ] Create route protection utilities
  - [ ] Create `lib/auth/route-protection.ts` with helper functions for protecting routes
  - [ ] Implement server-side auth guards using `getUser()` validation
  - [ ] Add redirect logic for `/auth/login?next=` pattern
  - [ ] Create utility for returning 401 responses to bots

- [ ] Implement authentication guards for server components
  - [ ] Create `lib/auth/server-auth.ts` with server-side authentication helpers
  - [ ] Add user session retrieval utilities for server components
  - [ ] Implement proper error handling for unauthorized access

- [ ] Configure route protection for document routes
  - [ ] Protect `/documents/[slug]` routes requiring authentication
  - [ ] Keep `/documents/[slug]/share` routes public for sharing
  - [ ] Add authentication checks to relevant page components
  - [ ] Test route protection with authenticated and unauthenticated access

- [ ] Create authentication redirect system
  - [ ] Implement `next` parameter handling in login page
  - [ ] Add post-login redirect to originally requested page
  - [ ] Test redirect flow with various protected routes

- [ ] Write tests for route protection using subagent
  - [ ] Test protected route access patterns
  - [ ] Test redirect flows and next parameter handling
  - [ ] Test bot detection and 401 response generation

- [ ] Update documentation with route protection patterns
  - [ ] Document how to protect new routes
  - [ ] Add examples of public vs protected route configuration

### Stage: Database Profile Integration
- [ ] Create database trigger for automatic profile creation
  - [ ] Create Supabase migration for auth.users -> public.profiles trigger
  - [ ] Test trigger fires correctly when new users register
  - [ ] Verify profile creation includes proper user_id reference

- [ ] Implement profile management utilities
  - [ ] Create `lib/services/profile.ts` with profile CRUD operations
  - [ ] Add profile retrieval and update functions
  - [ ] Include proper error handling and type safety

- [ ] Connect document ownership to user profiles
  - [ ] Update document creation to set `created_by` field
  - [ ] Add user-scoped document queries
  - [ ] Test document ownership assignment and retrieval

- [ ] Write tests for profile integration using subagent
  - [ ] Test automatic profile creation on user registration
  - [ ] Test profile data retrieval and updates
  - [ ] Test document ownership assignment

- [ ] Git commit database integration following `docs/GIT_COMMITS.md` using subagent

### Stage: Google OAuth Implementation
- [ ] Configure Google OAuth in Supabase
  - [ ] Set up Google OAuth provider in Supabase dashboard
  - [ ] Configure OAuth redirect URLs for development and production
  - [ ] Add Google client ID and secret to environment configuration

- [ ] Add Google OAuth to authentication forms
  - [ ] Add "Sign in with Google" button to login form
  - [ ] Add "Sign up with Google" button to signup form
  - [ ] Implement Supabase `signInWithOAuth` integration
  - [ ] Style OAuth buttons consistently with existing design

- [ ] Test Google OAuth flow
  - [ ] Test complete OAuth registration flow
  - [ ] Test OAuth login for existing users
  - [ ] Verify profile creation works with OAuth users
  - [ ] Test OAuth error handling and edge cases

- [ ] Write tests for OAuth integration using subagent
  - [ ] Test OAuth button rendering and interaction
  - [ ] Test OAuth callback handling
  - [ ] Mock OAuth flows for unit testing

- [ ] Update authentication documentation with OAuth patterns

### Stage: User Profile Management
- [ ] Create user profile page
  - [ ] Create `app/auth/profile/page.tsx` with user information display
  - [ ] List documents created by the user with proper filtering
  - [ ] Add basic profile editing capabilities (display name, preferences)
  - [ ] Include navigation back to main application

- [ ] Implement profile dropdown in header
  - [ ] Create `components/auth/profile-dropdown.tsx` with account menu
  - [ ] Add dropdown trigger with user initials or avatar
  - [ ] Include "Logged in as [email]", "Profile", and "Log out" options
  - [ ] Style dropdown to match application design system

- [ ] Update header component with profile dropdown
  - [ ] Replace simple email display with profile dropdown
  - [ ] Add proper keyboard navigation and accessibility
  - [ ] Test dropdown behavior across different screen sizes

- [ ] Implement logout functionality
  - [ ] Create logout route handler in `app/auth/logout/route.ts`
  - [ ] Clear authentication state and redirect to home page
  - [ ] Test logout from various application states

- [ ] Write tests for profile management using subagent
  - [ ] Test profile page rendering and data display
  - [ ] Test profile dropdown functionality
  - [ ] Test logout flow and state clearing

- [ ] Git commit profile management features following `docs/GIT_COMMITS.md` using subagent

### Stage: Visual Polish and Aesthetics
- [ ] Enhance authentication form styling
  - [ ] Improve form layouts with better spacing and typography
  - [ ] Add subtle animations for form interactions
  - [ ] Enhance error and success state presentations
  - [ ] Add consistent focus states and accessibility improvements

- [ ] Polish profile dropdown design
  - [ ] Create elegant dropdown with proper shadows and spacing
  - [ ] Add user avatar or styled initial circle
  - [ ] Implement smooth dropdown animations
  - [ ] Ensure dropdown works well on mobile devices

- [ ] Enhance authentication page layouts
  - [ ] Add visual interest to auth pages without being distracting
  - [ ] Include subtle Spideryarn branding elements
  - [ ] Optimize layouts for various screen sizes
  - [ ] Add loading skeleton states for better perceived performance

- [ ] Test visual enhancements using Playwright MCP subagent
  - [ ] Take screenshots of authentication flows
  - [ ] Test responsive behavior across device sizes
  - [ ] Verify animations and transitions work smoothly
  - [ ] Check accessibility features and keyboard navigation

- [ ] Update UI documentation with authentication patterns
  - [ ] Document authentication UI components and usage
  - [ ] Add authentication-specific styling guidelines
  - [ ] Include examples of common authentication UI patterns

### Stage: Future Enhancements Implementation
- [ ] Add password reset functionality
  - [ ] Create "Forgot Password" link on login page
  - [ ] Create `app/auth/reset-password/page.tsx` with email input form
  - [ ] Implement Supabase password reset flow
  - [ ] Create password reset confirmation page
  - [ ] Test complete password reset user journey

- [ ] Implement advanced session management
  - [ ] Add session timeout warnings for long-running sessions
  - [ ] Implement automatic session refresh in background
  - [ ] Add security notifications for login from new devices

- [ ] Add user preferences and settings
  - [ ] Extend profile page with user preference options
  - [ ] Add settings for notification preferences
  - [ ] Implement preference persistence in database

- [ ] Write comprehensive end-to-end tests using subagent
  - [ ] Test complete user registration and onboarding flow
  - [ ] Test authentication edge cases and error conditions
  - [ ] Test security features and unauthorized access attempts

### Stage: Integration Testing and Security Review
- [ ] Conduct comprehensive security testing using subagent
  - [ ] Test for common authentication vulnerabilities
  - [ ] Verify proper session handling and invalidation
  - [ ] Test route protection against various attack vectors
  - [ ] Review error messages for information disclosure

- [ ] Performance testing for authentication flows
  - [ ] Test authentication performance under load
  - [ ] Optimize database queries for user profile operations
  - [ ] Test middleware performance impact on all routes

- [ ] Cross-browser and device testing using Playwright MCP subagent
  - [ ] Test authentication on various browsers and devices
  - [ ] Verify responsive design works across screen sizes
  - [ ] Test accessibility features with screen readers

- [ ] Final code review and cleanup
  - [ ] Review all authentication code for consistency and best practices
  - [ ] Remove any temporary code or debug statements
  - [ ] Ensure all tests pass: `npm test`
  - [ ] Run linting and fix any issues: `npm run lint`

### Stage: Documentation and Finalization
- [ ] Update all relevant documentation
  - [ ] Update `docs/AUTHENTICATION_SUPABASE.md` with final implementation details
  - [ ] Update `docs/UI_COMPONENTS.md` with authentication components
  - [ ] Update `docs/SITE_ORGANISATION.md` with new authentication routes
  - [ ] Add troubleshooting guide for common authentication issues
  - [ ] Update `docs/CODING_GUIDELINES.md`
  - [ ] Add very concise bullet points to `CLAUDE.md`, and a reference to `docs/AUTHENTICATION_SUPABASE.md`

- [ ] Create user-facing documentation
  - [ ] Document authentication requirements for end users
  - [ ] Create onboarding guide for new user registration
  - [ ] Document account management features

- [ ] Final review with user
  - [ ] Demonstrate complete authentication system
  - [ ] Review security implementation and configuration
  - [ ] Address any final concerns or feature requests
  - [ ] Confirm implementation meets all requirements

- [ ] Git commit final implementation following `docs/GIT_COMMITS.md` using subagent
- [ ] Move this document to `planning/finished/`
- [ ] Final commit with planning document move

## Appendix

### User Requirements Summary

Based on the detailed requirements discussion:

1. **Authentication Scope**: Email/password authentication in early stage, Google OAuth in middle stage, with password reset as future enhancement
2. **Route Protection**: Flexible system allowing `/documents/[slug]` to be protected while `/documents/[slug]/share` remains public
3. **User Experience**: Redirect pattern with `next` parameter for seamless post-login navigation
4. **Session Management**: Long-lasting sessions for user convenience with proper security
5. **UI Integration**: Login/signup links for unauthenticated users, email display for authenticated users, progressing to account dropdown with profile management
6. **Database Integration**: Automatic profile creation leveraging completed database schema
7. **Visual Design**: Focus on light mode with visual polish in later stages

### Technical Architecture Decisions

**Authentication Infrastructure**:
- Supabase Auth with @supabase/ssr for Next.js App Router compatibility
- Cookie-based session management for SSR support
- Middleware for automatic session refresh across all routes

**Form Implementation**:
- shadcn/ui components with React Hook Form for robust form handling
- Zod validation for type-safe form validation
- Consistent error handling and loading states

**Route Protection Strategy**:
- Server-side authentication guards using `getUser()` validation
- Flexible protection utilities for easy application to specific routes
- Bot-friendly 401 responses for protected content

**Database Integration**:
- Automatic profile creation via database triggers
- User-scoped data access through Row Level Security
- Document ownership tracking with `created_by` foreign keys

### Reference Implementation Patterns

**Middleware Pattern**:
```typescript
// middleware.ts - Session refresh for all routes
export async function middleware(request: NextRequest) {
  // Cookie-based session refresh logic
  // Supabase client configuration
  // Automatic token validation
}
```

**Route Protection Pattern**:
```typescript
// Route protection with redirect
const { user } = await getUser()
if (!user) {
  redirect(`/auth/login?next=${pathname}`)
}
```

**Database Profile Pattern**:
```sql
-- Automatic profile creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Testing Strategy

**Unit Testing**: Form validation, authentication context, utility functions
**Integration Testing**: Complete authentication flows, database operations, route protection
**End-to-End Testing**: User registration, login, profile management, document access
**Security Testing**: Route protection, session handling, unauthorized access attempts
**Performance Testing**: Authentication middleware impact, database query optimization

### Future Considerations

1. **Multi-Factor Authentication**: TOTP and phone verification capabilities
2. **Team Collaboration**: Document sharing and collaborative access controls
3. **API Authentication**: Service-to-service authentication for future API endpoints
4. **Advanced Security**: Enhanced rate limiting, audit logging, session management
5. **User Analytics**: Authentication event tracking and user behavior analysis