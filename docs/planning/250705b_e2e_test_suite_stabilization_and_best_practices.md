# E2E Test Suite Stabilization and Best Practices

## Goal

Stabilize the E2E test suite to achieve >90% pass rate by:
1. Applying existing best practices consistently across all tests
2. Fixing infrastructure issues (authentication, dev server, configuration)
3. Creating reusable test machinery to prevent future issues
4. Addressing actual application bugs discovered during testing
5. Enabling **safe parallel execution** so the suite can use multiple workers without introducing flakiness

Current state: 9% passing (2/23 tests), with 70% failing due to authentication issues that we already have solutions for.

Parallel execution is currently *disabled* (`workers: 1`). A major success criterion is to raise this to `workers = max(1, cpu-cores-1)` once the work below is complete.

## Context

Recent E2E test analysis revealed that while we have excellent patterns and documentation for browser automation testing, these aren't being consistently applied. The uncommitted changes to `ai-headings-persistence-refresh.spec.ts` demonstrate a superior authentication pattern that would fix most failures, but this pattern hasn't been propagated to other tests.

## User Stories & Acceptance Criteria

**As a developer**, I want E2E tests to run reliably so I can:
- Trust test results to catch real bugs
- Run tests locally without manual setup steps
- Add new E2E tests following clear patterns

**Acceptance Criteria**:
- ✅ >90% of E2E tests pass consistently
- ✅ Authentication works automatically without per-test setup
- ✅ Tests use relative URLs and respect baseURL configuration
- ✅ Clear documentation of best practices with examples
- ✅ Reusable test helpers prevent common mistakes
- ✅ Suite runs successfully with parallel workers (≥ CPU-1) locally and in CI without introducing new flakes

## References

- `docs/reference/TESTING_E2E_COVERAGE.md` - Current test status showing 91% failure rate
- `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - Best practices that aren't being followed
- `docs/reference/TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md` - Detailed patterns needing updates
- `tests/e2e/ai-headings-persistence-refresh.spec.ts` - Uncommitted changes with superior auth pattern
- `tests/e2e/auth.setup.ts` - Current auth setup project
- `playwright.config.ts` - Configuration with conflicts (webServer vs dev:daemon)
- `docs/reference/SD_STRING_DISPLACEMENT_FIND_REPLACE.md` – Bulk find-replace tool used in later stages

## Principles & Key Decisions

1. **Apply existing solutions first** - We already have the patterns, just need consistent application
2. **Minimal changes to achieve stability** - Don't over-engineer, focus on making tests pass
3. **Clear separation of concerns** - Infrastructure fixes vs app bugs
4. **Progressive enhancement** - Start with critical auth fixes, then configuration, then nice-to-haves
5. **Documentation-first** - Update docs before code to ensure patterns are clear
6. **Concurrency safety** - All helpers and patterns must work when tests run in parallel across multiple workers

## Stages & Actions

### Stage: Pre-flight sanity checks (database & dev server)
_Run **before any other stage** so the remaining work isn't built on a broken foundation._

- [ ] **Database sanity check**
  - [ ] Add script `npm run e2e:verify-user` that calls `/api/debug/user-exists?email=<envTestUser>` (or queries Supabase directly).
  - [ ] If the seeded user is missing, **stop** and re-run `supabase/seed.sql` or investigate local DB health before proceeding.
- [ ] **Dev-server health check**
  - [ ] If port `$PORT` is not responding, run `npm run dev:daemon`.
  - [ ] If daemon PID exists but server unhealthy, restart with `npm run dev:daemon -- --restart`.

Only after both checks pass should subsequent stages run.

### Stage: Update documentation with consolidated best practices
- [ ] Update `docs/reference/TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md` with the superior auth pattern from uncommitted changes
  - [ ] Add "Authentication Best Practice" section showing the `test.use({ storageState })` pattern
  - [ ] Include complete working example from ai-headings-persistence-refresh.spec.ts
  - [ ] Add "Common Anti-patterns" section showing what NOT to do
- [ ] Update `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` 
  - [ ] Clarify that dev server MUST be running externally (not via webServer config)
  - [ ] Add troubleshooting section for port conflicts
  - [ ] Update quick start commands to emphasize `npm run dev:daemon` first
- [ ] Add minimal updates to `CLAUDE.md`
  - [ ] Add E2E testing best practices reference under testing section
  - [ ] Emphasize using `test.use({ storageState })` for auth in E2E tests

### Stage: Create general-purpose E2E testing machinery
- [ ] Create `tests/e2e/helpers/auth-setup.ts` with the superior pattern
  - [ ] Generate one **storageState file per worker** to avoid write-contention:
    ```typescript
    import { test as base, expect, type TestInfo } from '@playwright/test'
    // ...existing imports...

    export const test = base.extend<{ storageStateFile: string }>({
      storageStateFile: async ({}, use, workerInfo) => {
        const { envName } = getCurrentEnvironmentPaths()
        const file = `playwright/.auth/${envName}-user-w${workerInfo.workerIndex}.json`
        await use(file)
      },
    })
    ```
  - [ ] Inside `beforeAll`, write to `storageStateFile` instead of a shared one.
- [ ] Create `tests/e2e/helpers/test-base.ts` with common test configuration
  - [ ] Export `test` & `expect` re-exporting from above so all specs can simply `import { test, expect } from '../helpers/test-base'`
  - [ ] Provide `createWorktreeTestNamespace(testInfo.title)` helper so per-worker uploads don't collide in DB.

### Stage: Fix configuration issues
- [ ] Update `playwright.config.ts`
  - [ ] **Keep** the `webServer` block but change `command` to `"npm run dev:daemon -- --once"` so Playwright *starts* the server only if one is not already running.
  - [ ] Ensure `reuseExistingServer: true` (already set) so an existing daemon isn't duplicated.
  - [ ] After stability proven, set `workers = Math.max(1, os.cpus().length - 1)` (import `os` at top).
  - [ ] Fix test project assignments (move auth-required tests out of `chromium-no-auth`).
  - [ ] Add explanatory comments so future maintainers understand the dev-server workflow.

### Stage: Apply authentication fixes to failing tests (Quick wins - 70% of failures)
- [ ] Update failing auth tests using subagent & **sd**:
  - [ ] `complete-document-workflow-with-authentication.spec.ts`
  - [ ] `document-upload-processing-with-ai-integration.spec.ts`
  - [ ] `document-access-control.spec.ts`
  - [ ] `ai-tweet-thread-generation.spec.ts`
  - [ ] `error-page-testing.spec.ts`
  - [ ] `command-palette-basic-debug.spec.ts`
  - [ ] `document-search-navigation-workflow.spec.ts`
  - [ ] `optimized-document-library-journey.spec.ts`
  - [ ] Apply the pattern: Add `setupAuthentication()` at top, remove all auth code from tests
- [ ] Run updated tests to verify auth fixes work
- [ ] Use subagent to check which tests now pass: `npm run test:e2e`

### Stage: Fix URL and port configuration issues
- [ ] Fix hardcoded URLs in tests:
  - [ ] `tool-keyboard-shortcuts.spec.ts` - Change `http://localhost:3004/` to `/`
  - [ ] Search for other hardcoded URLs: Use subagent with grep
- [ ] Update any tests using absolute URLs to use relative URLs
- [ ] Verify tests respect baseURL from config

### Stage: Enable parallel execution & flake detection
_Runs after configuration fixes and a majority of auth failures are resolved._

- [ ] Temporarily set `workers = 2` and run the full suite three times: `npx playwright test --repeat-each 3`.
- [ ] If no new failures, raise to `workers = Math.max(1, os.cpus().length - 1)`.
- [ ] Monitor CI logs for race-condition indicators (console 401, DB unique-constraint violations).

### Stage: Add stability improvements
- [ ] Add page stability checks to test helpers:
  ```typescript
  export async function waitForPageStability(page: Page) {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')
  }
  ```
- [ ] Add frame stability checks for tests with detachment errors
- [ ] Increase timeouts in auth.setup.ts if needed

### Stage: Run comprehensive test validation
- [ ] Start fresh dev server: `npm run dev:daemon`
- [ ] Run all E2E tests with subagent: `npm run test:e2e`
- [ ] Document which tests are now passing vs still failing
- [ ] Categorize remaining failures (infrastructure vs app bugs)

### Stage: Fix application bugs (ACTUAL APP ISSUES - not test issues)
- [ ] **APP BUG**: Fix command palette not appearing
  - [ ] Investigation: Command palette should show on Ctrl+K but `[role="dialog"]` not found
  - [ ] Use subagent with Playwright MCP to debug in browser
  - [ ] Fix the actual UI code (not the test)
- [ ] **APP BUG**: Fix glossary/AI features if still failing after auth fixes
  - [ ] Only if tests still fail after infrastructure fixes
  - [ ] These may just be auth-related failures

### Stage: Test consolidation and cleanup
- [ ] Use subagent to identify redundant test coverage:
  - [ ] Find tests with >80% overlap in functionality
  - [ ] Consolidate authentication workflow tests (3 similar tests)
  - [ ] Keep search tests separate (they test different aspects)
- [ ] Remove or merge redundant tests
- [ ] Ensure remaining tests follow new patterns

### Stage: Final validation and documentation
- [ ] Run final health check: `npm run check:health`
- [ ] Run complete E2E test suite: `npm run test:e2e`
- [ ] Update `docs/reference/TESTING_E2E_COVERAGE.md` with new pass/fail status
- [ ] Create troubleshooting guide for common E2E test issues
- [ ] Update this planning doc with final results
- [ ] Git commit all changes following `docs/instructions/GIT_COMMIT_CHANGES.md`
- [ ] Move this doc to `docs/planning/finished/`

## Appendix

### Superior Authentication Pattern (from uncommitted changes)

The pattern discovered in `ai-headings-persistence-refresh.spec.ts` uncommitted changes:

```typescript
// At file level - automatic auth injection
const { authFile } = getCurrentEnvironmentPaths()
test.use({ storageState: authFile })

// One-time setup creates auth file
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  authManager = new RobustAuthManager(page)
  await authManager.loginAs('user', { forceReauth: true })
  await context.close()
})

// Tests just work - no auth code needed!
test('my test', async ({ page }) => {
  await page.goto('/protected-route')  // Already authenticated!
})
```

### Current Anti-patterns to Fix

1. **Per-test authentication** - Wastes time, causes timeouts
2. **Hardcoded URLs** - Breaks in different environments  
3. **Manual auth handling** - Error-prone and inconsistent
4. **WebServer in config** - Conflicts with dev:daemon approach

### Expected Outcomes

- From 2/23 passing → 20+/23 passing
- Authentication issues: 100% fixed
- Configuration issues: 100% fixed  
- App bugs: Identified and tracked separately
- Future tests: Clear patterns to follow
- Suite stable with parallel workers (≥ CPU-1)