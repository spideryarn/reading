# Migrate to Shared Database Testing Approach

## Goal, context

**Primary Goal**: Migrate from dual-database testing setup to shared database approach with smart test isolation, following Supabase's official recommendations.

**Context**: We initially implemented a separate test database to prevent test data from polluting the development database. However, this created complexity around migration sync, worktree conflicts, and maintenance overhead. After researching Supabase's official guidance, we discovered they explicitly recommend using the same database with UUID-based test isolation rather than separate instances.

**Key Problems to Solve**:
1. Remove all database reset operations from tests (destructive to dev data)
2. Update test patterns to use unique identifiers
3. Ensure future LLM-written tests follow the new patterns
4. Simplify infrastructure by removing dual-database setup

## References

- `docs/reference/TESTING_DATABASE_SUPABASE_OPTIONS_RESEARCH.md` - Detailed research comparing different approaches
- `docs/reference/TESTING_DATABASE.md` - Current testing patterns that need updating
- `docs/reference/TESTING_SETUP.md` - Test environment configuration to simplify
- `docs/reference/GIT_WORKTREES.md` - Multi-worktree setup that benefits from shared database approach
- https://supabase.com/docs/guides/local-development/testing/overview - Official Supabase testing recommendations

## Principles, key decisions

- **No database resets**: Tests must never reset or truncate the database
- **UUID isolation**: All test data must use unique identifiers (UUIDs, timestamps)
- **Self-cleaning tests**: Tests must clean up their own data in afterEach hooks
- **Concurrent-safe**: Tests must work when run in parallel across multiple worktrees
- **Documentation-driven**: Update docs first to guide future test development
- **Simplicity over complexity**: Remove infrastructure that adds maintenance burden

## Stages & actions

### Stage: Find and document destructive operations
- [x] Search for all database reset operations in tests (use subagent)
  - [x] Search for `db.reset`, `db reset`, `supabase db reset`
  - [x] Search for `DELETE FROM` without WHERE clauses
  - [x] Search for `TRUNCATE` operations
  - [x] Search for any cleanup that assumes empty tables
- [x] Create comprehensive list of files and line numbers that need updating
- [x] Document the patterns we're replacing (for future reference)

#### Findings from Destructive Operations Audit

**Critical Issues Found:**

1. **RLS Test Utilities - Broad DELETE Operations**
   - File: `lib/testing/rls-database-test-utils.ts` (lines 370-380)
   - Issue: The `cleanup()` method deletes ALL records from tables
   - Impact: This will delete ALL data in the development database, not just test data
   - Fix Required: Track created test records and delete only those specific records

2. **Database Reset Scripts**
   - File: `package.json`
   - Issue: Contains `db:reset` script that completely resets the database
   - Impact: Accidental execution will destroy all development data
   - Fix Required: Remove or rename this script with warnings

**Good Patterns Already in Use:**

1. **Specific Record Cleanup**
   - File: `src/lib/services/__tests__/database-schema.test.ts`
   - Pattern: Tracks and deletes only specific test records using testDocumentId

2. **Tracked Test Data**
   - File: `lib/services/database/__tests__/integration.test.ts`
   - Pattern: Maintains arrays of created IDs for cleanup

**Documentation References to Update:**
- CLAUDE.md - References to `npm run db:reset`
- docs/reference/SETUP.md - Multiple references to database reset
- docs/reference/CODING_GUIDELINES.md - Mentions reset operations
- docs/reference/DATABASE_OVERVIEW.md - References to reset commands

### Stage: Create test isolation utilities
- [x] Create `lib/testing/test-isolation-utils.ts` with:
  - [x] `getTestNamespace()` function for unique test identifiers
  - [x] `createTestEmail()` function for test emails
  - [x] `createTestUser()` helper with automatic cleanup tracking
  - [x] `cleanupTestData()` utility for afterEach hooks
  - Added additional utilities: `initTestTracking()`, `trackTestData()`, `createTestDocument()`, `getCleanupFunctions()`
- [x] Write tests for the test utilities themselves
- [x] Run tests to ensure utilities work correctly - all 21 tests passing

### Stage: Update documentation for LLM guidance
- [x] Update `CLAUDE.md` with new testing approach
  - [x] Add section on shared database testing
  - [x] Include explicit "NEVER use database resets" instruction
  - [x] Add code examples of proper test patterns
- [x] Update `docs/reference/TESTING_DATABASE.md`
  - [x] Remove references to test database separation
  - [x] Add UUID-based isolation examples
  - [x] Include cleanup patterns
- [x] Update `docs/reference/TESTING_SETUP.md`
  - [x] Remove dual-database setup instructions
  - [x] Simplify to single database approach
- [x] Add test pattern examples to `docs/reference/TESTING_OVERVIEW.md`
- [x] Create comprehensive test isolation patterns guide (`docs/reference/TEST_ISOLATION_PATTERNS.md`)
- [x] Git commit documentation updates
  - Commit 1: Test isolation utilities (`bdbdfbd`)
  - Commit 2: Documentation updates (`d805661`) 
  - Commit 3: Research documentation (`c8a3e02`)
  - Commit 4: Planning progress (`c028d82`)

### Stage: Update existing tests to remove destructive operations
- [x] Update database integration tests (highest risk)
  - [x] Replace any `supabase db reset` calls - None found in test files
  - [x] Add UUID-based test data creation - Created new v2 utilities
  - [x] Add proper cleanup in afterEach - Implemented in new utilities
- [x] Update RLS policy tests
  - [x] Created new RLS test utilities with namespace isolation (rls-database-test-utils-v2.ts)
  - [x] Created updated integration test example (rls-policies-integration-v2.test.ts)
- [x] Update authentication tests ✅ **COMPLETED**
  - [x] Update `/lib/auth/__tests__/server-auth.test.ts` - migrated to use test isolation utilities
  - [x] Update `/lib/context/__tests__/auth-context.test.tsx` - migrated to use test isolation utilities
  - [x] Update `/__tests__/auth-integration.test.tsx` - migrated to use test isolation utilities
  - [x] Update `/__tests__/setup-ui-mocks.ts` - updated createMockUser to use test isolation
  - [x] Update `/components/__tests__/auth-workflow-integration.test.tsx` - migrated to use test isolation utilities
  - [x] Update `/app/auth/__tests__/profile-page.test.tsx` - migrated to use test isolation utilities
  - [x] Update `/lib/auth/__tests__/route-integration.test.ts` - replaced 4 hardcoded emails
  - [x] Update `/lib/auth/__tests__/route-protection.test.ts` - replaced 1 hardcoded email
  - [x] Update `/components/__tests__/command-palette.test.tsx` - replaced 7 hardcoded emails
  - [x] Update `/lib/services/database/__tests__/rls-policies-real.test.ts` - uses RealRLSTestSetup (no changes needed)
- [x] Run all updated tests to ensure they pass
  - [x] Fixed failing auth-context.test.tsx - updated assertions to use namespaced emails
  - [x] Fixed failing auth-workflow-integration.test.tsx - updated mock components and assertions
  - [x] All authentication tests now passing with test isolation
- [x] Git commit test updates
  - Commit 1: RLS test utilities with namespace isolation (`acf60c9`)
  - Commit 2: Remove dangerous test database scripts (`439612a`) 
  - Commit 3: Planning progress update (`1d19dfa`)
  - Commit 4: Migrate auth tests to use test isolation (`09ccec7`)

### Stage: Revert infrastructure to single database
- [x] Update `.env.test` to point to dev database ports
  - [x] Change SUPABASE_URL from 54351 to 54341
  - [x] Change DATABASE_URL from 54352 to 54342
- [x] Update `package.json` to remove test database scripts
  - [x] Remove `test:db:start`, `test:db:stop`, etc.
  - [x] Update test scripts to remove `test:db:ensure`
  - [x] Renamed `db:reset` to `db:reset:DANGEROUS` with confirmation prompt
- [ ] Test that all tests still run with single database
- [ ] Git commit infrastructure simplification

### Stage: Clean up test database artifacts ✅
- [x] Stop test database if running: `npm run test:db:stop`
- [x] Remove `supabase-test/` directory
- [x] Remove `supabase/config.test.toml`
- [x] Verify no Docker containers for test database remain
- [x] Git commit cleanup (commit: 2f35ec2)

### Stage: Create cleanup utilities ✅
- [x] Create `scripts/cleanup-test-data.ts` for periodic cleanup
  - [x] Delete test users older than 24 hours
  - [x] Remove orphaned test documents
  - [x] Clean up test-created enhancements
- [x] Add cleanup script to package.json
- [x] Document when/how to run cleanup (created `docs/reference/TESTING_DATABASE_CLEANUP.md`)
- [x] Git commit cleanup utilities (commit: c7ad73b)

### Stage: Sync changes across worktrees
- [x] Copy updated `.env.test` to all worktrees (use subagent)
- [x] Create checklist of worktrees updated
  - Updated 6 worktrees: reading, reading-worktree1, reading-worktree3, reading-worktree4, reading-worktree5, reading-worktree6
  - Source: reading-worktree2 (already had updated file)
- [ ] Verify each worktree can run tests successfully

### Stage: Final validation and documentation
- [ ] Run full test suite to ensure everything works
- [ ] Update `docs/reference/TESTING_DATABASE_SUPABASE_OPTIONS_RESEARCH.md` with migration completion
- [ ] Follow instructions in `docs/instructions/DEBRIEF_PROGRESS.md`
- [ ] Git commit final updates
- [ ] Move this planning doc to `planning/finished/`

## Appendix

### Destructive Operations to Find

Common patterns that need replacement:
```javascript
// BAD - Resets entire database
beforeEach(async () => {
  await supabase.rpc('reset_db');
});

// BAD - Truncates tables
await supabase.from('documents').delete();

// BAD - Assumes empty state
const users = await supabase.from('profiles').select();
expect(users.data).toHaveLength(0);
```

### Replacement Patterns

Proper test isolation examples:
```javascript
// GOOD - Unique test data
const testId = getTestNamespace('auth-test');
const testUser = await createTestUser({
  email: createTestEmail(testId),
  metadata: { test_id: testId }
});

// GOOD - Cleanup specific test data
afterEach(async () => {
  await supabase.from('profiles')
    .delete()
    .eq('test_id', testId);
});

// GOOD - No assumptions about state
const testUsers = await supabase.from('profiles')
  .select()
  .eq('test_id', testId);
expect(testUsers.data).toHaveLength(1);
```

### Key Quote from Supabase Docs

"Application-level tests should not rely on a clean database state, as resetting the database before each test can be slow and makes tests difficult to parallelize. Instead, design your tests to be independent by using unique user IDs for each test case."

This validates our approach of moving to shared database with smart test design.