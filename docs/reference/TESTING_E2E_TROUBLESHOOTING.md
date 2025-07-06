# E2E Test Troubleshooting Guide

**Purpose**: Quick reference for diagnosing and fixing common E2E test failures  
**Updated**: January 2025

## Quick Diagnostics Checklist

Before diving into specific issues, run through this checklist:

```bash
# 1. Check dev server status
npm run dev:status

# 2. Verify test user exists
npm run e2e:verify-user

# 3. Check port configuration
echo "Port: $PORT"
cat .env.local | grep PORT

# 4. Clear auth cache if needed
rm -f playwright/.auth/*.json

# 5. Run pre-flight checks
npm run e2e:preflight
```

## Common Issues & Solutions

### 1. Authentication Setup Failures

**Symptoms**:
- Tests timeout waiting for login
- "Authentication required" errors despite valid auth
- Auth setup passes but subsequent tests fail with auth errors

**Root Causes & Solutions**:

#### A. Auth Setup Timing Out
```bash
# Solution 1: Verify test user exists
npm run e2e:verify-user

# Solution 2: Clear auth cache and retry
rm -f playwright/.auth/*.json
npm run test:e2e:setup

# Solution 3: Check if auth file was created correctly
cat playwright/.auth/worktree2-user.json
# Should contain cookies and origins, not empty arrays
```

#### B. API Authentication Context Not Propagating
**Issue**: Browser auth works but API calls return "Authentication required"

**Diagnosis**:
- Browser shows user is logged in (avatar visible)
- But API calls fail with 401/403 errors
- Common in document upload and AI feature tests

**Solutions**:
1. Ensure cookies are included in fetch requests
2. Check CORS configuration allows credentials
3. Verify auth middleware processes cookies correctly
4. Consider if auth headers need explicit passing

### 2. Dev Server Issues

**Symptoms**:
- "Cannot GET /" errors
- Server unresponsive after running tests
- Tests timeout waiting for page loads

**Root Causes & Solutions**:

#### A. Server Not Running
```bash
# Check status
npm run dev:status

# Start if needed
npm run dev:daemon

# Verify it's responding
curl -f http://localhost:$PORT/ || echo "Server not responding"
```

#### B. Server Memory Issues (Long Test Runs)
**Symptoms**: Server becomes unresponsive midway through test suite

```bash
# Solution 1: Restart server
npm run dev:daemon --restart

# Solution 2: Run tests in smaller batches
npm run test:e2e -- --shard=1/3
npm run test:e2e -- --shard=2/3
npm run test:e2e -- --shard=3/3

# Solution 3: Monitor memory usage
ps aux | grep "next dev" | grep -v grep
```

#### C. Port Conflicts
```bash
# Check what's using your port
lsof -ti:$PORT

# Clean up and restart
npm run dev:clean
npm run dev:daemon
```

### 3. Test Runner Configuration Issues

**Symptoms**:
- "unknown option '--headed=false'"
- "unknown option '--isolated'"
- Tests run in headed mode unexpectedly

**Solution**:
```bash
# Use the correct command (no invalid flags)
npm run test:e2e

# For specific tests
npm run test:e2e path/to/test.spec.ts

# For debugging (when needed)
npm run test:e2e:debug
```

### 4. URL and Port Configuration

**Symptoms**:
- Tests fail with wrong URLs (e.g., localhost:3004 instead of 3002)
- Hardcoded URLs breaking in different environments

**Solutions**:
1. Use relative URLs in tests: `await page.goto('/')` not `await page.goto('http://localhost:3002/')`
2. For URL comparisons: `${new URL(page.url()).origin}${path}` not hardcoded URLs
3. Check `.env.local` and `.env.test` have correct PORT values

### 5. 409 Conflict Errors

**Symptoms**:
- Document upload fails with 409 Conflict
- "Slug already exists" errors
- Tests pass individually but fail when run together

**Solution**: Use unique identifiers in test data
```typescript
import { createUniqueTestSlug } from '@/lib/testing/slug-test-utils'

const uniqueUrl = `https://example.com/article-${createUniqueTestSlug()}`
```

### 6. Flaky Tests and Timing Issues

**Symptoms**:
- Tests pass sometimes, fail others
- "Element not found" errors
- Timeouts waiting for elements

**Solutions**:

#### A. Wait for Page Stability
```typescript
import { waitForPageStability } from '../helpers/test-base'

await waitForPageStability(page)
```

#### B. Use Event-Driven Waiting
```typescript
// Good: Wait for specific events
const [response] = await Promise.all([
  page.waitForResponse(resp => 
    resp.url().includes('/api/extract-url') && resp.status() === 200
  ),
  page.click('#submit-button')
])

// Bad: Arbitrary timeouts
await page.click('#submit-button')
await page.waitForTimeout(5000) // Avoid this!
```

### 7. Post-Logout Security Issues

**Symptoms**:
- Some routes remain accessible after logout
- Tests warn about security but pass

**Investigation Steps**:
1. Check if routes should be public or protected
2. Verify middleware is checking auth correctly
3. Consider if this is intentional UX (e.g., public document routes)

## Test Isolation Best Practices

### Per-Worker Auth State
Each Playwright worker should have its own auth state file to avoid conflicts:
```typescript
// In auth-setup.ts
const authFile = `playwright/.auth/${envName}-user-w${workerInfo.workerIndex}.json`
```

### Unique Test Data
Always use unique identifiers to prevent conflicts:
```typescript
import { faker } from '@faker-js/faker'
import { v4 as uuidv4 } from 'uuid'

const testId = uuidv4()
const testTitle = `${faker.lorem.sentence()} - ${testId}`
```

### Cleanup After Tests
```typescript
import { DocumentCleanupTracker } from '@/lib/testing/document-cleanup-utils'

const cleanup = new DocumentCleanupTracker()
// ... create documents ...
await cleanup.cleanupAll() // In test.afterAll()
```

## Environment-Specific Issues

### Worktree Isolation
Each worktree uses different ports and test users:
- worktree1: PORT=3001, test-user1@spideryarn.com
- worktree2: PORT=3002, test-user2@spideryarn.com
- etc.

Always use environment-aware helpers:
```typescript
import { getCurrentEnvironmentPaths } from '../helpers/auth-setup'
const { testUser, authFile } = getCurrentEnvironmentPaths()
```

## Advanced Debugging

### Enable Playwright Traces
```bash
# Run with trace on first retry
npm run test:e2e -- --trace on-first-retry

# View trace
npx playwright show-trace test-results/*/trace.zip
```

### Check Browser Console
```typescript
// Add to your test
page.on('console', msg => console.log('Browser:', msg.text()))
page.on('pageerror', err => console.error('Page error:', err))
```

### Network Request Debugging
```typescript
// Log all API calls
page.on('request', req => {
  if (req.url().includes('/api/')) {
    console.log('API Request:', req.method(), req.url())
  }
})

page.on('response', res => {
  if (res.url().includes('/api/') && !res.ok()) {
    console.log('API Error:', res.status(), res.url())
  }
})
```

## Performance Optimization

### Parallel Execution (Currently Disabled)
Tests run with `workers: 1` for database safety. To enable parallel execution:
1. Ensure all tests use unique data (UUIDs)
2. Verify database operations are isolated
3. Update playwright.config.ts: `workers: process.env.CI ? 1 : undefined`

### Batch Execution for Stability
For large test suites:
```bash
# Run authentication tests
npm run test:e2e -- --grep "auth"

# Run AI feature tests
npm run test:e2e -- --grep "ai-"

# Run remaining tests
npm run test:e2e -- --grep-invert "(auth|ai-)"
```

## When to Ask for Help

If you've tried the above solutions and tests still fail:
1. Check if it's a known issue in `docs/planning/250705b_e2e_test_suite_stabilization_and_best_practices.md`
2. Look for similar issues in test history
3. Consider if it's an application bug vs test issue
4. Document the failure pattern for debugging

## Quick Reference Commands

```bash
# Most common fixes
npm run e2e:preflight          # Run pre-flight checks
npm run dev:daemon --restart    # Restart dev server
rm -f playwright/.auth/*.json   # Clear auth cache
npm run test:e2e:setup         # Re-run auth setup

# Debugging
npm run test:e2e:debug         # Debug mode with UI
npm run test:e2e -- --headed   # Run in headed mode
npm run dev:status             # Check server health
npm run e2e:verify-user        # Verify test user exists

# Running specific tests
npm run test:e2e <file>        # Run specific test file
npm run test:e2e -- --grep "pattern"  # Run tests matching pattern
```

## See Also

- `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - E2E testing overview
- `docs/reference/TESTING_BROWSER_AUTOMATION_IMPLEMENTATION.md` - Implementation patterns
- `docs/reference/TESTING_BROWSER_AUTOMATION_HELPERS.md` - Test helper utilities
- `docs/planning/250705b_e2e_test_suite_stabilization_and_best_practices.md` - Current stabilization effort