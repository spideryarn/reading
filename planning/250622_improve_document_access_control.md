# Improve Document Access Control and Error Handling

**Status**: 🟡 In Progress  
**Created**: 2025-01-22  
**Author**: Greg (via Claude)

## Overview

Improve the document access control flow to properly handle unauthorized access attempts with clear error messages and appropriate HTTP status codes, rather than redirecting to login. This will also enable public documents to be accessible to anonymous users and search engine crawlers.

## Problem Statement

Currently when accessing `/read/[slug]`:
- The route always requires authentication via `requireAuth()` 
- Unauthorized users are redirected to `/auth/login` regardless of document visibility
- No distinction between "document doesn't exist" and "no permission"
- Public documents can't be accessed by anonymous users or search engines
- The `/read/[slug]/share` route exists as a workaround but adds complexity

## Success Criteria

- [ ] Public documents accessible to anonymous users and bots
- [ ] Clear "Not Authorized" error page instead of login redirect
- [ ] Proper HTTP 403 status code for unauthorized access
- [ ] Display current logged-in user (if any) on error page
- [ ] Remove the `/read/[slug]/share` route entirely
- [ ] E2E tests covering all access scenarios

## Technical Approach

### Key Changes

1. **Conditional Authentication**: Replace `requireAuth()` with `getAuthUser()` to check auth status without redirecting
2. **Rely on RLS**: Let database Row Level Security policies handle access control
3. **Error Handling**: Create proper error page for unauthorized access
4. **Route Consolidation**: Remove `/share` route and handle all access through main route

### Security Considerations

- Database RLS policies already properly configured for public/private access
- Conflate "not found" and "no permission" errors for security
- No change to underlying security model - just better UX

## Implementation Stages

### Stage 1: Remove Share Route ✅
**Goal**: Clean up the codebase by removing the `/read/[slug]/share` route
**Actions**:
- [x] Use subagent to remove share route and all references
- [x] Update any links or documentation that reference the share route
- [x] Verify TypeScript compilation and linting pass

### Stage 2: Implement Conditional Authentication 🔄
**Goal**: Update the main document route to handle both authenticated and anonymous users
**Actions**:
- [ ] Replace `requireAuth()` with `getAuthUser()` in `/read/[slug]/page.tsx`
- [ ] Attempt document fetch regardless of auth status
- [ ] Handle document access based on RLS response
- [ ] Pass user info (if authenticated) to error handling

### Stage 3: Create Not Authorized Page
**Goal**: Build a clear error page for unauthorized access
**Actions**:
- [ ] Create `not-authorized` component with proper messaging
- [ ] Show current logged-in user email (if authenticated)
- [ ] Provide login link for anonymous users
- [ ] Ensure proper 403 HTTP status code
- [ ] Match existing app styling and layout

### Stage 4: Testing & Verification
**Goal**: Ensure all access scenarios work correctly
**Actions**:
- [ ] Update/consolidate any existing unit tests
- [ ] Create comprehensive E2E test covering:
  - Anonymous user accessing public document (should work)
  - Anonymous user accessing private document (should see error)
  - Authenticated user accessing owned document (should work)
  - Authenticated user accessing another user's private document (should see error)
  - Search engine bot accessing public document (should work)
- [ ] Manual testing of all scenarios
- [ ] Verify proper HTTP status codes

## Code Examples

### Conditional Authentication Pattern
```typescript
// Instead of:
const user = await requireAuth({ returnTo: `/read/${slug}` })

// Use:
const user = await getAuthUser() // Returns null if not authenticated
const doc = await getDocumentBySlug(slug)

if (!doc) {
  // Show not authorized page (conflates not found and no permission)
  return <NotAuthorizedPage userEmail={user?.email} slug={slug} />
}
```

### Not Authorized Component
```typescript
export function NotAuthorizedPage({ userEmail, slug }: Props) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1>Document Not Available</h1>
        <p>You don't have permission to view this document.</p>
        {userEmail ? (
          <p>Currently logged in as: {userEmail}</p>
        ) : (
          <Link href={`/auth/login?next=/read/${slug}`}>
            Log in to access this document
          </Link>
        )}
      </div>
    </div>
  )
}
```

## Dependencies

- Existing RLS policies support public document access
- `getAuthUser()` utility already available
- No new infrastructure needed

## Future Considerations

- Could add bot-specific simplified HTML responses
- Might want admin override capabilities
- Could implement document sharing via explicit permissions (not just public/private)

## References

- Current implementation: `app/read/[slug]/page.tsx`
- Auth utilities: `lib/auth/route-protection.ts`
- RLS policies: `supabase/migrations/20250618000002_update_document_enhancements_public_access.sql`
- Testing guide: `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md`