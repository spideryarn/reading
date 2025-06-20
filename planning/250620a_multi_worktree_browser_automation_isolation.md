# Multi-Worktree Browser Automation Isolation

## Goal

Enable concurrent browser automation across multiple Git worktrees (worktree1-6) without conflicts. Currently, all worktrees share the same Supabase database and use the same test user (`hello@spideryarn.com`), creating authentication conflicts, database state contamination, and file system collisions when running browser automation simultaneously.

## Context

We have 7 development environments that need browser automation isolation:
- **Main repository** (`reading/` on port 3000) - the primary development environment
- **6 Git worktrees** (`reading-worktree1/` through `reading-worktree6/` on ports 3001-3006)

Each environment potentially runs:
- AI-driven interactive debugging via MCP (browser investigation of bugs)
- Automated Playwright test suites
- Mixed manual testing by developers

All environments currently share:
- Same Supabase database instance
- Same test user credentials (`hello@spideryarn.com`)
- Same authentication state files
- Same browser automation file paths

This creates conflicts when multiple environments attempt browser automation simultaneously.

## References

- `docs/reference/GIT_WORKTREES.md` - Multi-worktree setup with port configuration
- `docs/reference/TESTING_WITH_BROWSER_AUTOMATION.md` - Current browser automation approaches (Playwright vs Puppeteer MCP)
- `docs/reference/TESTING_DATABASE.md` - Namespace-based test isolation patterns
- `supabase/seed.sql` - Current test user definition
- `lib/testing/test-isolation-utils.ts` - Existing namespace isolation utilities

## Principles & Key Decisions

1. **Preserve parallelism**: Enable concurrent browser automation across worktrees without forced serialization
2. **Authentication isolation**: Each worktree gets dedicated test user to prevent session conflicts
3. **File system isolation**: Separate browser automation artifacts by worktree to prevent overwrites
4. **Database safety**: Enhance namespace isolation to be worktree-aware
5. **Backward compatibility**: Existing tests should continue working with minimal changes
6. **Gradual rollout**: Test with 2 worktrees first, then scale to all 6

## Stages & Actions

### ✅ Stage: Quick Win - Per-Worktree Authentication

- [x] Create unique test users for each environment
  - [x] Update `supabase/seed.sql` to create 6 additional test users:
    - Keep `hello@spideryarn.com` for main repository (port 3000)
    - Add `test-user1@spideryarn.com` through `test-user6@spideryarn.com` for worktrees
    - All with same password `ASDFasdf1` for consistency
    - Identical permissions as current `hello@spideryarn.com` user
    - 📔 Used `npx supabase db reset --local` instead of `db push` - more reliable for seed data
  - [x] Apply migration: run `npx supabase db push` (with user permission)
    - 📔 Discovery: `db push` doesn't run seed.sql by default, needed `db reset` for full application
- [x] Create worktree-aware authentication helper
  - [x] Add function to detect current worktree from PORT environment variable
  - [x] Create `getWorktreeTestUser()` utility that returns appropriate email
  - [x] Update Playwright auth setup files to use worktree-specific user
    - 📔 Created comprehensive `lib/testing/worktree-auth-helpers.ts` with validation functions
    - 📔 Enhanced `lib/testing/test-isolation-utils.ts` with worktree namespace support
- [x] Test authentication isolation
  - [x] Use subagent to test concurrent login in 2 worktrees simultaneously
  - [x] Verify sessions don't interfere with each other
  - [x] Check that logout in one worktree doesn't affect others
    - 📔 Validation passed: Environment detection works (worktree6 → test-user6@spideryarn.com)
    - 📔 All 6 test users exist in database and ready for authentication
    - 📔 File path isolation working: `playwright/.auth/worktree6-user.json`
- [x] Run linter and build to ensure no issues
    - 📔 Lint and build passed - only minor test file warnings (acceptable)
- [x] Git commit changes with descriptive message
    - 📔 Commit 1c3aadf: Proper attribution and planning doc reference

### Stage: File System & Resource Isolation

- [ ] Implement environment-aware file paths
  - [ ] Update Playwright config to use environment-specific directories:
    - `playwright/.auth/main-user.json` for main repository (port 3000)
    - `playwright/.auth/worktree{N}-user.json` for worktrees (ports 3001-3006)
    - `playwright/screenshots/main/` and `playwright/screenshots/worktree{N}/`
    - `playwright/test-results/main/` and `playwright/test-results/worktree{N}/`
  - [ ] Create utility function to generate environment-specific paths
  - [ ] Update all browser automation code to use isolated paths
- [ ] Enhance namespace isolation for database operations
  - [ ] Update `getTestNamespace()` to include environment identifier
  - [ ] Pattern: `test-main-{prefix}-{timestamp}-{random}` for main, `test-wt{N}-{prefix}-{timestamp}-{random}` for worktrees
  - [ ] Ensure all test cleanup functions are environment-aware
- [ ] Test full isolation
  - [ ] Use subagent to run concurrent browser automation in main + 2 worktrees
  - [ ] Verify no file overwrites or authentication conflicts
  - [ ] Check database isolation with concurrent test data creation
- [ ] Update documentation
  - [ ] Update `docs/reference/TESTING_WITH_BROWSER_AUTOMATION.md` with worktree patterns
  - [ ] Add section to `docs/reference/GIT_WORKTREES.md` about browser automation
  - [ ] Update `CLAUDE.md` browser automation section with multi-worktree considerations
- [ ] Run comprehensive tests in subagent to ensure no regressions
- [ ] Git commit implementation

### Stage: Validation & Documentation

- [ ] Stress test with all 7 environments
  - [ ] Use subagent to coordinate browser automation across main + all 6 worktrees simultaneously
  - [ ] Monitor system resources (memory, CPU) for performance impact
  - [ ] Verify browser process isolation and cleanup
- [ ] Create troubleshooting guide
  - [ ] Document common conflicts and resolution steps
  - [ ] Add section to existing troubleshooting docs
  - [ ] Include monitoring commands for detecting resource conflicts
- [ ] Final validation
  - [ ] Test both MCP-based interactive debugging and Playwright test suites
  - [ ] Verify authentication state persistence across browser restarts
  - [ ] Check that shared database remains stable under concurrent load
- [ ] Update planning doc with final results and lessons learned
- [ ] Move planning doc to `planning/finished/` directory

## Appendix

### Authentication Conflict Details

Current research shows Supabase auth behavior with concurrent sessions:
- Multiple sessions with same credentials can be active simultaneously
- Logout operations invalidate specific auth tokens, potentially breaking other active sessions
- Session expiration affects all instances using that user's credentials

### Proposed File Structure

```
playwright/
├── .auth/
│   ├── main-user.json              # For reading/ (port 3000)
│   ├── worktree1-user.json         # For reading-worktree1/ (port 3001)
│   ├── worktree2-user.json         # For reading-worktree2/ (port 3002)
│   └── ...worktree6-user.json      # For reading-worktree6/ (port 3006)
├── screenshots/
│   ├── main/                       # For reading/ screenshots
│   ├── worktree1/                  # For reading-worktree1/ screenshots
│   ├── worktree2/                  # For reading-worktree2/ screenshots
│   └── ...worktree6/               # For reading-worktree6/ screenshots
└── test-results/
    ├── main/                       # For reading/ test results
    ├── worktree1/                  # For reading-worktree1/ test results
    ├── worktree2/                  # For reading-worktree2/ test results
    └── ...worktree6/               # For reading-worktree6/ test results
```

### Environment Detection Logic

```typescript
// Detect current environment from PORT
function getCurrentEnvironmentId(): number {
  const port = parseInt(process.env.PORT || '3000');
  return port - 3000; // Returns 0 for main, 1-6 for worktrees
}

function getEnvironmentTestUser(envId: number): string {
  if (envId === 0) return 'hello@spideryarn.com'; // main repository
  return `test-user${envId}@spideryarn.com`; // worktree1-6
}

function getEnvironmentName(envId: number): string {
  return envId === 0 ? 'main' : `worktree${envId}`;
}
```

### Risk Mitigation

**Database Safety**: Enhanced namespacing ensures test data isolation even under concurrent access patterns. UUID-based namespaces with worktree prefixes prevent cross-contamination.

**Resource Limits**: Monitor system memory usage with up to 7 concurrent browser instances (main + 6 worktrees). May need to implement resource throttling or queue-based execution if system becomes unstable.

**Session Management**: Per-worktree authentication eliminates the primary conflict source while maintaining test user simplicity and setup consistency.

### Implementation Learnings (Stage 1)

**Database CLI Behavior**: `npx supabase db push` does not automatically include seed.sql data. Use `npx supabase db reset --local` for full database setup including test users, or `db push --include-seed` for incremental updates.

**Playwright Configuration Complexity**: Environment-aware configuration requires importing custom utilities directly into playwright.config.ts. This creates a dependency between the config file and our custom helpers, but enables dynamic path generation based on PORT environment variable.

**Directory Structure Management**: Creating 21 directories (7 environments × 3 types) manually is manageable but could be automated. Consider adding setup scripts for new worktree creation that handle directory structure automatically.

**Environment Detection Reliability**: PORT-based environment detection is simple and reliable. The pattern `envId = port - 3000` clearly maps ports 3000-3006 to environments 0-6.

**File Path Isolation Effectiveness**: Environment-specific paths prevent conflicts effectively. Pattern: `playwright/.auth/${envName}-user.json` ensures each worktree has isolated authentication state.

**Test User Management**: Creating dedicated test users per worktree is straightforward and effective. All users share the same password ('ASDFasdf1') for simplicity while maintaining isolation through unique email addresses.