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

### Stage: Initial setup and sync
- [ ] Run `./scripts/sync-worktrees.ts` to pull latest changes from main

### Stage: Find and document destructive operations
- [ ] Search for all database reset operations in tests (use subagent)
  - [ ] Search for `db.reset`, `db reset`, `supabase db reset`
  - [ ] Search for `DELETE FROM` without WHERE clauses
  - [ ] Search for `TRUNCATE` operations
  - [ ] Search for any cleanup that assumes empty tables
- [ ] Create comprehensive list of files and line numbers that need updating
- [ ] Document the patterns we're replacing (for future reference)

### Stage: Create test isolation utilities
- [ ] Create `lib/testing/test-isolation-utils.ts` with:
  - [ ] `getTestNamespace()` function for unique test identifiers
  - [ ] `createTestEmail()` function for test emails
  - [ ] `createTestUser()` helper with automatic cleanup tracking
  - [ ] `cleanupTestData()` utility for afterEach hooks
- [ ] Write tests for the test utilities themselves
- [ ] Run tests to ensure utilities work correctly

### Stage: Update documentation for LLM guidance
- [ ] Update `CLAUDE.md` with new testing approach
  - [ ] Add section on shared database testing
  - [ ] Include explicit "NEVER use database resets" instruction
  - [ ] Add code examples of proper test patterns
- [ ] Update `docs/reference/TESTING_DATABASE.md`
  - [ ] Remove references to test database separation
  - [ ] Add UUID-based isolation examples
  - [ ] Include cleanup patterns
- [ ] Update `docs/reference/TESTING_SETUP.md`
  - [ ] Remove dual-database setup instructions
  - [ ] Simplify to single database approach
- [ ] Add test pattern examples to `docs/reference/TESTING_OVERVIEW.md`
- [ ] Git commit documentation updates

### Stage: Update existing tests to remove destructive operations
- [ ] Update database integration tests (highest risk)
  - [ ] Replace any `supabase db reset` calls
  - [ ] Add UUID-based test data creation
  - [ ] Add proper cleanup in afterEach
- [ ] Update RLS policy tests
  - [ ] Remove assumptions about empty database
  - [ ] Use unique test users per test
- [ ] Update authentication tests
  - [ ] Replace hardcoded test emails
  - [ ] Add cleanup for test users
- [ ] Run all updated tests to ensure they pass
- [ ] Git commit test updates

### Stage: Revert infrastructure to single database
- [ ] Update `.env.test` to point to dev database ports
  - [ ] Change SUPABASE_URL from 54351 to 54341
  - [ ] Change DATABASE_URL from 54352 to 54342
- [ ] Update `package.json` to remove test database scripts
  - [ ] Remove `test:db:start`, `test:db:stop`, etc.
  - [ ] Update test scripts to remove `test:db:ensure`
- [ ] Test that all tests still run with single database
- [ ] Git commit infrastructure simplification

### Stage: Clean up test database artifacts
- [ ] Stop test database if running: `npm run test:db:stop`
- [ ] Remove `supabase-test/` directory
- [ ] Remove `supabase/config.test.toml`
- [ ] Verify no Docker containers for test database remain
- [ ] Git commit cleanup

### Stage: Create cleanup utilities
- [ ] Create `scripts/cleanup-test-data.ts` for periodic cleanup
  - [ ] Delete test users older than 24 hours
  - [ ] Remove orphaned test documents
  - [ ] Clean up test-created enhancements
- [ ] Add cleanup script to package.json
- [ ] Document when/how to run cleanup
- [ ] Git commit cleanup utilities

### Stage: Sync changes across worktrees
- [ ] Copy updated `.env.test` to all worktrees (use subagent)
- [ ] Create checklist of worktrees updated
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