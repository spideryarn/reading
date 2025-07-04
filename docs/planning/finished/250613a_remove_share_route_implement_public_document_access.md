# Remove /share Route and Implement Public Document Access

## Goal

Remove the redundant `/share` route in favor of using the main document route (`/documents/[slug]`) with `is_public` permission machinery. This consolidates the architecture to have a single URL per document while implementing proper public document access with tiered functionality based on authentication status.

**Core Principle**: If a tool requires LLM calls, it should be blocked for anonymous users with a "pro" badge and paywall redirect. If a tool only retrieves from the database (including pre-generated AI content), it should work for anonymous users.

## References

- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Current authentication architecture with middleware and route protection patterns
- `docs/reference/TOOL_*.md` - Documentation for all current tools that need updating to reflect anonymous access patterns
- `docs/planning/250608a_document_rls_security_phase1_implementation.md` - Phase 2 RLS design for public document support (not yet implemented)
- `/app/documents/[slug]/share/page.tsx` - Current share route to be removed
- `/app/documents/[slug]/page.tsx` - Main document route to be updated with permission logic
- `middleware.ts` - Only handles session refresh, doesn't block routes
- `lib/auth/route-protection.ts` - Contains `requireAuth()` and `getAuthUser()` utilities

## Principles & Key Decisions

### Authentication & Tool Access
- **LLM-required tools**: Block for anonymous users, show "pro" badge with paywall redirect
  - AI-Generated Headings, Document Summary, Glossary, Tweet Thread Generator, AI Assistant Chat, Semantic Search, ToC tooltip summaries (when generating new ones)
- **Database-only tools**: Allow for anonymous users
  - Original ToC navigation, Text search, Basic highlights (session storage), Pre-generated AI content from database
- **Pre-generated AI content**: If AI headings/summaries/glossary already exist in database, show them to anonymous users
- **API protection**: All LLM endpoints should return 401 for anonymous users attempting to trigger new AI processing

### Architecture Simplification
- Single URL per document: `/documents/[slug]`
- Permission logic based on `is_public` field and user ownership
- Conditional UI rendering based on authentication status and permissions
- Remove `/share` route entirely to eliminate architectural duplication

### RLS Policy Requirements
- Implement missing Phase 2 RLS policy for anonymous access to public documents
- Allow anonymous read access to pre-generated enhancements (summaries, glossaries, etc.)
- Maintain security for private documents and AI processing operations

## Stages & Actions

### Stage: Preparation and RLS Foundation
- [ ] Run `./scripts/sync-worktrees.ts` to sync latest changes from main
- [ ] Implement missing RLS policies for public document access
  - [ ] Add anonymous read policy for public documents: `CREATE POLICY "Anonymous users can view public documents" ON documents FOR SELECT TO anon, authenticated USING (is_public = true)`
  - [ ] Add anonymous read policy for document enhancements on public documents
  - [ ] Test RLS policies with manual database queries to verify anonymous access works
  - [ ] Update database types with `npm run db:types`
- [ ] Write tests for public document access scenarios
  - [ ] Test anonymous access to public documents
  - [ ] Test blocked access to private documents
  - [ ] Test authenticated user access to own documents
- [ ] Git commit RLS policy implementation

### Stage: Update Main Document Route
- [ ] Modify `/app/documents/[slug]/page.tsx` to handle both authenticated and anonymous users
  - [ ] Replace `requireAuth()` with `getAuthUser()` to allow anonymous access
  - [ ] Add permission checking logic: user owns document OR document is public
  - [ ] Return appropriate error pages for insufficient permissions
  - [ ] Pass authentication/ownership status to client component
- [ ] Update `DocumentPageClient` to accept authentication props
  - [ ] Add `isAuthenticated` and `isOwner` props
  - [ ] Pass these props through to tool components
- [ ] Test main route with different user scenarios
  - [ ] Anonymous user accessing public document
  - [ ] Anonymous user accessing private document (should be blocked)
  - [ ] Owner accessing their own document
  - [ ] Authenticated user accessing someone else's public document
- [ ] Git commit main route updates

### Stage: Implement Tool-Level Authentication UI
- [ ] Update ToC component to show pre-generated AI headings to anonymous users
  - [ ] Display AI-generated headings from database if they exist
  - [ ] Show "pro" badge on generate button for anonymous users
  - [ ] Hide tooltip summary generation for anonymous users, show existing summaries
- [ ] Update Summary tool component
  - [ ] Display pre-generated summaries from database for anonymous users
  - [ ] Show "pro" badge on generate button for anonymous users
  - [ ] Block new summary generation for anonymous users
- [ ] Update Glossary component
  - [ ] Display pre-generated glossary from database for anonymous users
  - [ ] Show "pro" badge on generate button for anonymous users
  - [ ] Block new glossary generation for anonymous users
- [ ] Update Chat component
  - [ ] Show "pro" badge and paywall redirect for anonymous users
  - [ ] Block all chat functionality for anonymous users
- [ ] Update Search component
  - [ ] Allow text search for anonymous users
  - [ ] Show "pro" badge on semantic search for anonymous users
- [ ] Test tool UI with anonymous user access

### Stage: API Protection and Paywall Infrastructure
- [ ] Audit all LLM-related API endpoints to ensure 401 responses for anonymous users
  - [ ] `/api/headings` - verify authentication requirement
  - [ ] `/api/summarise` - verify authentication requirement
  - [ ] `/api/glossary` - verify authentication requirement
  - [ ] `/api/chat` - verify authentication requirement
  - [ ] `/api/semantic-search` - verify authentication requirement
  - [ ] `/api/tweet-thread` - verify authentication requirement
- [ ] Create paywall placeholder page `/paywall`
  - [ ] Basic page explaining pro features and pricing
  - [ ] Placeholder for future Stripe integration
  - [ ] Link back to login/signup flows
- [ ] Update all "pro" badge links to point to paywall page
- [ ] Test API protection with anonymous requests

### Stage: Remove /share Route and Update Links
- [ ] Update profile page to link to main document URL instead of `/share`
- [ ] Remove `/app/documents/[slug]/share/page.tsx` entirely
- [ ] Search codebase for any remaining references to `/share` routes
- [ ] Update any documentation that references share URLs
- [ ] Test that profile page links work correctly

### Stage: Update Tool Documentation
- [ ] Update `docs/reference/TOOL_CHATBOT_ASSISTANT_UI_INTEGRATION.md` to reflect authentication requirements
- [ ] Update `docs/reference/TOOL_GLOSSARY.md` to document anonymous access to pre-generated content
- [ ] Update `docs/reference/TOOL_SUMMARISE.md` to document anonymous access to existing summaries
- [ ] Update `docs/reference/UNIFIED_LEFT_PANE_TABBED_NAVIGATION.md` to document tool authentication patterns
- [ ] Create or update documentation about public document access and tool tiering

### Stage: End-to-End Testing and Validation
- [ ] Use subagent to perform comprehensive testing with Playwright
  - [ ] Test complete anonymous user journey on public document
  - [ ] Test authenticated user journey with full tool access
  - [ ] Test "pro" badge interactions and paywall redirects
  - [ ] Test document ownership scenarios
- [ ] Manual testing of UI/UX flow
  - [ ] Verify anonymous users can navigate and read public documents
  - [ ] Verify pre-generated AI content displays correctly
  - [ ] Verify "pro" badges appear consistently
  - [ ] Verify paywall page works
- [ ] Performance testing of public document access
- [ ] Stop and review with user for UX feedback

### Stage: Final Integration and Cleanup
- [ ] Run full test suite to ensure no regressions
- [ ] Run lint and typecheck to ensure code quality
- [ ] Update `CLAUDE.md` if needed to reflect new public document patterns
- [ ] Git commit final changes
- [ ] Move this doc to `docs/planning/finished/` and commit

## Appendix

### Current Tool Analysis Summary

**Database-Only Tools (Anonymous Access)**:
- Original ToC navigation
- Text search with Mark.js highlighting  
- Basic highlights with session storage
- **Pre-generated AI content**: Headings, summaries, glossary entries that already exist in database

**LLM-Required Tools (Authenticated Only)**:
- AI-Generated Headings (generation only)
- Document Summary (generation only)
- AI Assistant Chat (all functionality)
- Glossary (generation only)
- Semantic Search
- Tweet Thread Generator
- ToC tooltip summaries (generation only)

### Security Architecture Notes

**Current Issue**: `/share` route bypasses all security and RLS policies, allowing access to any document by slug regardless of `is_public` status.

**Target Architecture**: Single route with proper permission checking that respects both user ownership and public sharing settings while maintaining security for private documents and expensive AI operations.

### User Experience Design

**Anonymous User on Public Document**:
- Full document reading capability
- Access to pre-generated AI enhancements
- Clear "pro" badges on unavailable features
- Seamless upgrade path to authentication

**Authenticated User Experience**:
- Full feature access on owned documents
- Read-only access to others' public documents with all pre-generated content
- Ability to generate new AI content on owned documents