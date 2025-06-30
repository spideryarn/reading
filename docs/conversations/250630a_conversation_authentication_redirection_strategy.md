---
Date: 2025-06-30
Duration: ~45 minutes
Type: Decision-making
Status: Active
Related Docs: docs/reference/AUTHENTICATION_*.md, docs/reference/SITE_ORGANISATION_WEBSITE_STRUCTURE.md
---

# Authentication Redirection Strategy Discussion - 2025-06-30

## Context & Goals

User wanted to improve the authentication redirection system to ensure users are returned to their original page after login/signup. The conversation began with investigating current implementation and exploring industry best practices, then evolved into defining a comprehensive route protection strategy.

## Key Background

Current system has a `next` parameter implementation but with gaps:
- **User's preference**: "I have a bias towards keeping things simple. So where possible, let's definitely use the Hard approach"
- **Future consideration**: "We want to have a notion of `public` documents, which will be world-readable, but only permit certain kinds of actions... Note that we aren't supporting public documents yet, so maybe we should start simple with a Hard approach throughout, and soften it later?"
- **Architectural preference**: "My intention was to try and rely heavily on RLS. How does that affect our thinking?"

## Main Discussion

### Current State Analysis

**Existing Implementation Strengths:**
- `next` parameter system already in place (`/auth/login?next=/protected/route`)
- Strong security validation in `getRedirectUrl()` prevents open redirect attacks
- OAuth flow properly handles redirection
- Multiple authentication patterns support different use cases

**Critical Gaps Identified:**
- Missing middleware protection - `/middleware.ts` only handles Supabase session management
- Inconsistent implementation across pages (3 different patterns)
- Signup form ignores `next` parameter - only login respects redirection
- Manual redirect setup required for each protected page

### Industry Best Practices Research

Key findings from web research:
- **Middleware-based route protection** is the industry standard
- **Whitelist-based URL validation** (already implemented)
- **Two-step authentication flows** to avoid cookie race conditions
- **Matcher configuration** to exclude static assets from middleware

### "Hard" vs "Soft" Protection Approaches

**Hard Approach (Immediate Redirect):**
- User automatically redirected to login page
- Example: Banking websites, admin dashboards
- User's preference: "Let's definitely use the Hard approach, e.g. /auth/profile"

**Soft Approach (Show Login Prompt):**
- Shows page with login prompts/restrictions
- Example: Medium articles, GitHub repositories
- More complex for future public documents

**Decision**: Start with Hard approach for simplicity, soften later when public documents are added.

### Route Classification Strategy

**Protected Routes (Hard Protection):**
- `/read/**` (including `/read` itself) - "Let's make /read/[slug] hard too"
- `/upload` - Document upload functionality
- `/auth/profile` - User profile management
- `/settings` - User preferences (identified from site structure)

**Public Routes:**
- `/` - Homepage
- `/design/**` - Design system pages
- `/auth/login`, `/auth/signup`, `/auth/reset-password` - Authentication pages

### API Endpoint Protection Strategy

**Expensive AI Operations** (Cost protection critical):
- `/api/chat`, `/api/summarise`, `/api/glossary`, `/api/headings`
- `/api/semantic-search`, `/api/tweet-thread`
- Must require authentication to prevent cost abuse

**Document Management**:
- `/api/upload-pdf`, `/api/extract-url`, `/api/delete-document`
- Require auth for ownership/abuse prevention

**Document Access**:
- `/api/documents/[slug]/download`, `/api/documents/[slug]/original`
- Can rely more heavily on RLS

### RLS vs Middleware Protection Analysis

**RLS Strengths:**
- Defense in depth - data protection even if middleware fails
- Consistent security model across all queries
- Simplified API logic without complex ownership checks
- Protection for direct database access

**RLS Limitations:**
- Won't prevent expensive LLM calls for unauthenticated users
- Less clear UX (empty results vs "please log in" messages)
- Harder to implement rate limiting and audit logging

**Hybrid Approach Decision:**
- Use RLS as primary data security layer
- Use middleware auth for cost protection and UX clarity
- Provides defense in depth without losing RLS benefits

## Alternatives Considered

**Option A: Middleware-Based Protection**
- ✅ Automatic, consistent protection
- ✅ No manual URL construction needed
- ❌ Less granular control per page
- ❌ Requires defining protected/public route lists

**Option B: Enhanced Page-Level Protection**
- ✅ Fine-grained control per page
- ✅ Easier to implement gradually
- ❌ Requires manual implementation on each page
- ❌ Risk of inconsistency

**Option C: Hybrid Approach** (Recommended)
- ✅ Middleware for common patterns, page-level for special cases
- ✅ Best of both worlds
- ❌ More complex to maintain

## Decisions Made

**Route Protection Strategy:**
> "Great. Let's go with Hard protection for /read** (i.e. including /read itself), /upload, /auth/profile . What have I missed? In other words, let's make /read/[slug] hard too, and we'll worry about public documents later. We'll keep / and /design** public."

**Implementation Approach:**
- Hard protection for all document-related routes
- RLS as primary data security with selective middleware for cost protection
- Start simple, evolve to support public documents later

**API Authentication:**
- Require auth for all expensive LLM operations
- Optional auth for simple data access (let RLS handle filtering)

## Open Questions

**Route Coverage:**
- Should `/settings` be hard protected? (Mentioned in site structure)
- Any other routes missing from current analysis?

**Future Public Documents:**
- How should AI features work on public documents for authenticated users?
- Rate limiting strategy even for authenticated users?
- Cost management for AI operations on public documents?

**Implementation Details:**
- Different protection levels for different environments?
- Should development `/api/fake_*` endpoints be restricted in production?

## Next Steps

1. **Immediate Implementation:**
   - Implement hard protection for identified routes
   - Fix signup form to respect `next` parameter
   - Add authentication requirements to expensive API operations

2. **Architecture Implementation:**
   - Maintain RLS as primary data security
   - Add selective middleware for cost protection and UX

3. **Future Enhancement:**
   - Design public document system with tiered protection
   - Implement rate limiting and audit logging

## Sources & References

**Industry Research:**
- **Next.js Authentication Best Practices** (Wisp CMS Blog) - Post-authentication redirection patterns
- **Next.js Middleware Documentation** - Route protection implementation
- **Open Redirect Security Best Practices** (Multiple sources) - URL validation and security measures

**Internal Documentation:**
- `docs/reference/AUTHENTICATION_OVERVIEW.md` - Current authentication system
- `docs/reference/AUTHENTICATION_UI.md` - UI components and redirection flow
- `docs/reference/SITE_ORGANISATION_WEBSITE_STRUCTURE.md` - Complete route structure
- `docs/instructions/SOUNDING_BOARD_MODE.md` - Conversation methodology

**Implementation Files:**
- `/middleware.ts` - Current session management (needs enhancement)
- `/lib/auth/client-utils.ts` - `getRedirectUrl()` security validation
- Authentication forms and pages in `/components/auth/` and `/app/auth/`

## Related Work

This conversation should inform:
- Route protection middleware implementation
- Authentication system standardization
- API endpoint security enhancement
- Future public document feature planning