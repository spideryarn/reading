# Browser Automation Testing Overview

Quick reference for AI agents and developers using browser automation testing in the Spideryarn Reading project.

## See Also

- `docs/reference/RESEARCH_ON_TESTING_BROWSER_AUTOMATION.md` - Detailed tool comparison and research
- `docs/reference/TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md` - Detailed implementation patterns
- `docs/reference/TESTING_BROWSER_AUTOMATION_HELPERS.md` - Reusable test helpers and patterns
- `docs/reference/TESTING_OVERVIEW.md` - Current testing infrastructure using Jest and React Testing Library
- `docs/reference/GIT_WORKTREES.md` - Multi-worktree browser automation isolation
- [Playwright Documentation](https://playwright.dev/) - Official Playwright documentation

## Executive Summary

**Playwright** is the recommended solution for browser automation testing. It offers:

- **Fast execution** (2-5s per test vs 60s+ with Puppeteer MCP)
- **Minimal output** suitable for AI agents
- **Native Next.js integration**
- **Headless by default** for efficiency
- **Cross-browser support** (Chromium, Firefox, WebKit)

## Quick Start for AI Agents

**CRITICAL**: run in headless mode, unless explicitly asked by the user to be interactive/visible.

**CRITICAL**: use `--isolated` to avoid clashing with other agents also using Playwright.

### ⚠️ Prerequisites: Dev Server Must Be Running

**CRITICAL**: E2E tests require a running development server. The dev server MUST be started externally before running tests. Do NOT rely on Playwright's webServer configuration to start it.

```bash
# 1. Pre-flight checks (recommended)
npm run e2e:preflight  # Verifies test user exists & dev server is healthy

# OR manually:

# 2. Check dev server status
npm run dev:status

# 3. If not running, start dev server daemon
npm run dev:daemon

# 4. Verify server is healthy and responding
npm run dev:status

# 5. Only then run E2E tests
npx playwright test
```

**Why External Dev Server?**: 
- Playwright's webServer config conflicts with our daemon-based dev server management
- External daemon allows multiple test runs without server restarts
- Provides better control over server lifecycle and logs
- Enables concurrent development and testing in different terminals

**Port Configuration**: Each worktree uses a different port (3000-3006) configured in `.env.local`

### Essential Commands
```bash
# Run all E2E tests (dev server must be running first)
npx playwright test

# Run specific test file  
npx playwright test tests/e2e/complete-document-workflow-with-authentication.spec.ts

# Run tests matching pattern
npx playwright test --grep "authentication"

# Debug mode (only when needed)
npx playwright test --debug
```

### AI Agent Workflow for E2E Testing
```bash
# Recommended workflow with pre-flight checks
npm run e2e:preflight       # Verify test user & dev server
npx playwright test         # Run tests

# OR manual workflow:
npm run dev:status || npm run dev:daemon  # Ensure dev server running
npm run e2e:verify-user                    # Verify test user exists
npm run test:e2e:setup                    # Setup authentication (if needed)
npx playwright test                       # Run tests
```

### Current Implementation Status ✅

**Location**: `tests/e2e/`
- `complete-document-workflow-with-authentication.spec.ts` - Comprehensive workflow testing
- `document-upload-processing-with-ai-integration.spec.ts` - AI features integration testing

**Coverage**: Replaces 50+ unit tests with comprehensive integration testing:
- 🔐 Authentication flow and security
- 📝 Form validation and error handling  
- 📄 Document upload and processing
- 🤖 AI features integration (headings, glossary, chat, summary)
- 💾 Database operations with RLS enforcement

**Execution Results**:
- **3 test scenarios** covering authentication, validation, and complete workflows
- **~35 seconds** total execution time
- **95%+ success rate** with robust error handling

## Key Testing Patterns

### Authentication
```typescript
// Use existing seeded user
await page.fill('input[name="email"]', 'hello@spideryarn.com');
await page.fill('input[name="password"]', 'ASDFasdf1');
await page.click('button[type="submit"]');
await expect(page).toHaveURL(/^(?!.*\/auth\/login).*$/);
```

### Event-Driven Waiting (Recommended)
```typescript
// Wait for API responses, not arbitrary timeouts
const [response] = await Promise.all([
  page.waitForResponse(resp => 
    resp.url().includes('/api/extract-url') && resp.status() === 200
  ),
  page.click('#submit-button')
]);
```

### Multi-Worktree Support
Each worktree uses environment-specific configuration:
- **Port isolation**: Different ports per worktree (3000, 3001, 3002, etc.)
- **Authentication isolation**: Environment-specific test users
- **File isolation**: Separate auth states, screenshots, results

## Configuration

**Playwright Config**: `playwright.config.ts`
- Sequential execution (`workers: 1`) for database safety
- Extended timeouts for AI operations (30-45 seconds)
- Minimal output for AI agents (`reporter: 'list'`)
- Environment-aware port configuration

**Test Credentials**: Defined in `supabase/seed.sql`
- Main: `hello@spideryarn.com` / `ASDFasdf1`
- Worktree-specific: `test-user{N}@spideryarn.com` / `ASDFasdf1`

## E2E Value Proposition

**Why E2E over Unit Testing:**
- **Real workflows**: Tests actual user journeys, not isolated functions
- **Integration confidence**: Catches bugs between components
- **Security validation**: Tests actual RLS policies and authentication
- **Minimal mocking**: Tests real system behavior
- **Maintenance**: 1 E2E test replaces 50+ unit tests

**When to still use Unit Tests:**
- Complex algorithmic logic with edge cases
- Performance-critical code requiring isolated benchmarking
- Library functions without user interface
- Error conditions hard to trigger in E2E

## Common Issues & Solutions

### Dev Server Not Running (Most Common Issue)

**Symptoms**: 
- Tests timeout waiting for login page elements
- Authentication setup fails with timeout errors
- Blank/loading pages in Playwright traces

**Diagnosis**:
```bash
npm run dev:status  # Check if dev server is running
curl -f http://localhost:$PORT/ 2>/dev/null && echo "✅ Server responding" || echo "❌ Server not responding"
```

**Solution**:
```bash
# Start dev server daemon (AI agent recommended)
npm run dev:daemon

# Verify server is healthy
npm run dev:status

# Should show: "✅ Daemon running and healthy (PID: XXXX, Port: YYYY)"
```

**For AI Agents**: Always run `npm run dev:status || npm run dev:daemon` before E2E tests to ensure server availability.

### Port Conflicts

**Symptoms**:
- Server fails to start with "address already in use" error
- Tests connect to wrong application instance
- Authentication failures due to different database

**Diagnosis**:
```bash
# Check what's running on your port
lsof -ti:$PORT  # Shows PID if port is in use
```

**Solution**:
```bash
# Clean up stale processes and restart
npm run dev:clean  # Removes stale PID files
npm run dev:daemon # Start fresh daemon
```

**Prevention**: Each worktree should use a unique port (3000-3006) configured in `.env.local`

### Authentication Failures

**Symptoms**:
- Tests fail with "user not found" or authentication errors
- Login form submission doesn't redirect

**Root Causes**:
1. Test user missing from database (run `npm run e2e:verify-user`)
2. Using wrong test user for worktree
3. Auth state file corrupted

**Solution**:
```bash
# Verify test user exists
npm run e2e:verify-user

# If missing, reseed database
supabase db reset

# Clear auth cache and retry
rm -f playwright/.auth/*.json
npm run test:e2e:setup
```

### Database Reset Recovery
Tests include automatic recovery from database resets using `withDatabaseResetRecovery()` helper.

### Dev Server Memory Issues (Long Test Runs)

**Symptoms**:
- Server becomes unresponsive after running many tests
- Tests start timing out midway through suite
- "Cannot GET /" errors despite server process running

**Root Cause**: 
Hot module replacement accumulates memory during long test runs, eventually causing the dev server to become unresponsive.

**Solution**:
```bash
# Use the server stability helpers
import { checkServerHealth, restartServerIfUnhealthy } from './helpers/server-stability'

# Run tests in batches with health monitoring
npm run test:e2e -- --workers=1 --shard=1/3  # Run first third
npm run test:e2e -- --workers=1 --shard=2/3  # Run second third
npm run test:e2e -- --workers=1 --shard=3/3  # Run final third
```

**Prevention**:
- Use memory-aware batch sizing (see `calculateOptimalBatchSize()`)
- Add server health checks between test batches
- Monitor memory usage during test runs
- Consider using `--no-hmr` flag for CI environments

### Test Isolation
Each test uses UUID-based namespaces to avoid conflicts in shared database approach.

### AI Operation Timeouts
Extended timeouts (30-45s) configured for AI processing operations like content extraction and summarization.


---

For detailed implementation patterns, authentication helpers, and advanced configuration, see `docs/reference/TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md`.