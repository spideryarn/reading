# Database RLS Security Comprehensive Review

## Goal

Address critical security gaps in Row Level Security (RLS) policies across all database tables, with particular focus on:
- ~~Implementing proper RLS policies for `storage.objects` table~~ ✅ Already implemented
- Documenting and implementing missing RLS policies for all tables
- ~~Addressing the hardcoded mock user UUID approach~~ ✅ Already resolved
- Ensuring proper access control for AI calls, profiles, and document enhancements
- Preventing unauthorized access to chat threads/messages for public documents
- Updating existing policies to support public document visibility (Phase 2)

## Context

Recent security review revealed significant gaps in RLS implementation:
- `storage.objects` has NO custom RLS policies - relying entirely on service role bypass
- Most tables have "RLS enabled" but actual policies are undocumented
- Mock user system (`00000000-0000-0000-0000-000000000001`) creates migration risks
- No clear permission cascade rules for public documents
- AI usage data potentially exposed without proper access controls

## References

- `docs/reference/DATABASE_SECURITY.md` - Current security documentation (needs major updates)
- `docs/reference/DATABASE_SCHEMA.md` - Schema reference showing all tables
- `docs/reference/AUTHENTICATION_ADMIN.md` - Admin system implementation
- `docs/reference/DATABASE_MIGRATIONS.md` - Migration guidelines
- `docs/reference/TESTING_DATABASE.md` - RLS testing patterns
- `docs/planning/250608a_document_rls_security_phase1_implementation.md` - Previous RLS work
- `lib/services/database/__tests__/rls-policies-real.test.ts` - Existing RLS tests

## Principles, Key Decisions

### Security Requirements (User-Specified)
- **AI calls**: Visible only to `created_by` user and admins
- **Profiles**: Visible only to their user and admins
- **Document enhancements**: Visible for public documents (inherit document visibility)
- **Chat threads/messages**: NEVER visible for public documents - require authentication
- **Storage objects**: Need proper RLS policies (not just application-layer)

### Architecture Principles
- **Defense in depth**: Database-level security even if application layer is compromised
- **Fail secure**: Deny by default, explicitly allow access
- **Audit trail**: Use timestamps for admin status, track who accessed what
- **Performance**: Index RLS lookup columns for query efficiency

### Critical Concerns
- **Mock UUID approach**: High risk of accidental production deployment
- **Storage vulnerability**: No database-level protection for uploaded files
- **Policy documentation**: Most policies exist but aren't documented

## Previous Work & Unfinished Tasks

### From docs/planning/250608a_document_rls_security_phase1_implementation.md:

**✅ Completed in Phase 1**:
- Basic document RLS policies (owners can manage own documents)
- API route authentication fixes (replaced mock users with real auth)
- Admin support implementation (Phase 1.5)
- Initial RLS testing with `rls-policies-real.test.ts`

**🔴 Critical Unfinished - AI Calls Security Vulnerability**:
- The previous implementation discovered a vulnerability in AI calls RLS (fixed in `20250613000004_fix_ai_calls_rls_security.sql`)
- AI calls policy allowed any authenticated user to access document-independent AI calls created by other users
- Need to verify this fix is properly applied and tested

**📋 Unfinished Testing Infrastructure** (from Next Stage section):
- NextRequest mocking issues causing 71% test pass rate
- No comprehensive multi-user context switching utilities
- Missing systematic ownership violation testing patterns
- Need for `lib/testing/rls-test-context.ts` and related utilities

**🚨 Storage RLS Not Implemented**:
- Previous work noted storage RLS policies could not be created via migration due to permission restrictions
- Currently using application-layer security only (high risk)

## Stages & Actions

### Stage: Critical - Discuss Mock User UUID Approach with User
- [x] **RESOLVED**: Mock user already properly handled
  - ✅ Mock user ONLY in `seed.sql`, not in migrations
  - ✅ Migration `20250603211615_add_mock_system_user.sql` already empty
  - ✅ No production risk - mock user will never exist in production
  - ✅ Appropriate for test/dev use in scripts and seed data
- [x] No action needed - current implementation is correct

### Stage: Document Existing RLS Policies
- [ ] Use subagent to examine all RLS policies in migrations
  - Check `20250531235026_comprehensive_storage_schema.sql`
  - Check any subsequent RLS-related migrations
  - Document actual vs intended policies
- [ ] Create comprehensive RLS documentation table in `DATABASE_SECURITY.md`:
  - Table name
  - Policy name
  - Operation (SELECT/INSERT/UPDATE/DELETE)
  - Policy logic
  - Security implications
- [ ] Identify any missing or inadequate policies

### Stage: Implement Storage Objects RLS Policies
- [x] **RESOLVED**: Storage RLS already implemented in `20250615140000_add_storage_rls_policies.sql`
  - ✅ Full RLS policies for all CRUD operations
  - ✅ Environment-aware with graceful local dev handling
  - ✅ Proper ownership validation through document UUID in path
  - ✅ Comprehensive documentation in `DATABASE_SUPABASE_STORAGE_REFERENCE.md`
- [x] **COMPLETED**: Updated storage policies for public documents in `20250618000004_update_storage_rls_public_documents.sql`
  - Add policy for anonymous users to view files for public documents
  - Follow same pattern as document visibility inheritance

### Stage: Implement AI Calls RLS Policies
- [x] ✅ ALREADY CORRECT - No migration needed, policy already implements requirements:
  ```sql
  -- Users can only see their own AI calls
  CREATE POLICY "Users can access own AI calls" ON ai_calls
  FOR ALL TO authenticated
  USING (
    auth.uid() = created_by::uuid OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );
  ```
- [ ] Add index for `created_by` column if not exists
- [ ] Write RLS tests for AI calls access patterns
- [ ] Run linter and build checks

### Stage: Implement Profiles RLS Policies
- [x] Created migration `20250618000001_update_profiles_rls_admin_access.sql`
- [x] Fixed recursion issue with `20250618000005_fix_profiles_admin_recursion.sql`:
  ```sql
  -- Users can only see their own profile
  CREATE POLICY "Users can access own profile" ON profiles
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );
  ```
- [ ] Test profile access isolation
- [ ] Verify admin override works correctly

### Stage: Implement Document Enhancements RLS Policies
- [x] Create migration for document_enhancements RLS:
  ```sql
  -- Inherit document visibility
  CREATE POLICY "Access based on document visibility" ON document_enhancements
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id
      AND (
        documents.created_by::uuid = auth.uid() OR
        documents.is_public = true OR
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
      )
    )
  );
  ```
- [ ] Test enhancement visibility for:
  - Private documents (owner only)
  - Public documents (anyone)
  - Admin access (all documents)

### Stage: Secure Chat Threads and Messages
- [x] ✅ ALREADY CORRECT - Policies already restrict to authenticated users
- [x] Created migration `20250618000003_ensure_chat_authenticated_only.sql` to document:
  ```sql
  -- No anonymous access to chat
  CREATE POLICY "Authenticated users only" ON chat_threads
  FOR ALL TO authenticated
  USING (
    auth.uid() = created_by::uuid OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );
  ```
- [ ] Similar policy for chat_messages
- [ ] **IMPORTANT**: Ensure NO public document exception for chat
- [ ] Update UI to show appropriate messaging for unauthenticated users
- [ ] Test chat access patterns thoroughly

### Stage: Handle Document Visibility Changes (Public/Private Transitions)
- [x] **COMPLETED**: Updated documents and enhancements policies in migration `20250618000002_update_document_enhancements_public_access.sql`
  - Documents table only checks ownership
  - No anonymous access policies exist
  - Public documents aren't actually accessible to public
- [ ] **No Action Needed for Transitions**: Once RLS policies check `is_public`:
  - Visibility changes will take effect immediately (no caching)
  - Private → Public: Anonymous users gain access instantly
  - Public → Private: Anonymous access revoked instantly
- [ ] **Implementation**: This will be handled automatically when we:
  - Add public document RLS policies in Stage "Document Enhancements RLS"
  - Update storage RLS to inherit document visibility
  - No special transition handling code required

### Stage: Update DATABASE_MIGRATIONS.md
- [x] **COMPLETED**: Added critical RLS warning section
  ```markdown
  ## ⚠️ CRITICAL: RLS Policy Considerations
  
  Before creating ANY new table or modifying existing tables:
  1. **STOP and discuss RLS requirements with the user**
  2. Consider who should access the data (owners, admins, public)
  3. Plan RLS policies BEFORE writing the migration
  4. Include RLS policies in the same migration as table creation
  5. Test policies with real RLS testing framework
  ```
- [ ] Add RLS checklist for new tables
- [ ] Reference this planning document as example

### Stage: Comprehensive RLS Testing
- [x] Extended existing RLS tests to cover all new policies
- [ ] Add specific test scenarios:
  - Public document access patterns
  - Enhancement visibility inheritance
  - Chat privacy for public documents
  - Storage access control
  - AI calls isolation
- [ ] Use subagent to run full test suite
- [ ] Fix any failing tests

### Stage: Security Documentation Updates
- [ ] Update `DATABASE_SECURITY.md` with complete policy documentation
- [ ] Add security decision rationale
- [ ] Document storage RLS local development limitations
- [ ] Create RLS policy matrix showing access patterns
- [ ] Add troubleshooting section for common RLS errors

### Stage: Final Review and Validation
- [ ] Run comprehensive security audit (subagent)
- [ ] Check all tables have appropriate RLS policies
- [ ] Verify no regression in existing functionality
- [ ] Test with different user roles (owner, admin, anonymous)
- [ ] Document any remaining security concerns
- [ ] Git commit with detailed security improvements message

### Stage: Post-Implementation Tasks
- [ ] Update `docs/reference/PROJECT_STATUS.md` with security improvements
- [ ] Consider creating security testing checklist
- [ ] Plan for regular security reviews
- [ ] Move this planning doc to `docs/planning/finished/`

## Appendix

### Mock User UUID Concerns - DETAILED EXPLANATION

The current approach uses a hardcoded UUID (`00000000-0000-0000-0000-000000000001`) throughout the codebase. This was implemented in migration `20250603211615_add_mock_system_user.sql`.

**Where it's used**:
- `supabase/seed.sql` - Creates test documents owned by this UUID
- Test files reference this UUID directly
- Development workflows assume this user exists
- Migration explicitly inserts this user into `auth.users` table

**Major risks**:

1. **Production Deployment Risk**: 
   - The mock user is in a migration file, so it WILL be created in production
   - No mechanism prevents using this UUID in production code
   - Easy to accidentally ship features that assume this user exists

2. **Testing Blindness**:
   - Tests written against mock UUID may not catch real authentication issues
   - No guarantee tests will work with real dynamic user IDs
   - Mock user has no real session/JWT, so auth flows aren't properly tested

3. **Data Migration Complexity**:
   - Existing dev/test data is owned by mock UUID
   - No clear strategy to migrate this data to real users
   - Risk of orphaned data when transitioning to real auth

4. **Security False Positives**:
   - Code may "work" with mock user but fail with real auth
   - RLS policies might have gaps only visible with real users
   - Authentication bypasses could hide behind mock user usage

**Current Impact**:
- All local development assumes this user exists
- Seeds and tests are tightly coupled to this UUID
- No separation between "test user" and "system user" concepts

**Potential solutions to discuss**:
1. **Environment-based approach**: 
   - Use different auth strategies for dev/test/prod
   - Mock auth middleware for development only
   - Real auth required for staging/production

2. **Proper test isolation**:
   - Dynamic test user creation/cleanup
   - Each test creates its own user
   - No hardcoded UUIDs in tests

3. **Feature flags**:
   - `USE_MOCK_AUTH` environment variable
   - Conditional logic in auth utilities
   - Clear warnings when mock auth is active

4. **Migration strategy**:
   - Separate "system" user from "test" user concepts
   - Plan for data ownership transfer
   - Remove mock user from production migrations

### Storage RLS Implementation Notes

The `storage.objects` table has special considerations:
- Owned by `supabase_storage_admin` role (not `postgres`)
- Local development shows "must be owner of relation objects" errors
- Need graceful degradation between local and production

Proposed approach:
1. Detect environment in migration (check for `supabase_admin` role)
2. Apply policies conditionally
3. Document limitations clearly
4. Maintain application-layer security as fallback

### Public Document Access Matrix

| Resource | Owner | Admin | Authenticated (not owner) | Anonymous |
|----------|--------|--------|--------------------------|-----------|
| Document | ✅ Full | ✅ Full | ✅ Read (if public) | ✅ Read (if public) |
| Enhancements | ✅ Full | ✅ Full | ✅ Read (if doc public) | ✅ Read (if doc public) |
| Storage | ✅ Full | ✅ Full | ✅ Read (if doc public) | ✅ Read (if doc public) |
| AI Calls | ✅ Own | ✅ All | ❌ None | ❌ None |
| Chat | ✅ Own | ✅ All | ❌ None | ❌ None |
| Profile | ✅ Own | ✅ All | ❌ None | ❌ None |

### RLS Performance Considerations

Key indexes needed for RLS queries:
- `documents(created_by)` - ownership lookups
- `documents(is_public)` - public document queries  
- `profiles(user_id, is_admin) WHERE is_admin IS NOT NULL` - admin checks
- `ai_calls(created_by)` - ownership lookups
- All foreign keys should be indexed

### Key Decisions & Resolutions

**1. Mock User UUID** ✅ RESOLVED
- Already properly isolated in `seed.sql` only
- No production risk - won't exist in production databases
- No migration needed for removal

**2. Storage RLS** ✅ PARTIALLY RESOLVED
- Full RLS policies already implemented in migration
- Environment-aware with local dev graceful degradation
- Still needs: Public document access policies (Phase 2)

**3. AI Calls Visibility** ✅ DECIDED
- ALL ai_calls private to creator + admins
- Including document-independent calls (where document_id IS NULL)
- No shared system AI calls

**4. Document Visibility Transitions** ✅ UNDERSTOOD
- No special handling needed
- RLS policies will check `is_public` in real-time
- Changes take effect immediately (no caching to worry about)

**5. Testing Infrastructure** ✅ DEFERRED
- Ignoring NextRequest mocking issues for now (71% pass rate)
- Will implement RLS with existing test coverage
- Can improve testing in future iterations