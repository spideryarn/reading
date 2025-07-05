# Browser Automation Testing Helpers

> **Status**: ✅ Complete - Comprehensive E2E test helpers and patterns  
> **Last Updated**: January 2025  
> **Target Audience**: Developers and AI agents writing Playwright E2E tests

This document describes the reusable test helpers and patterns available in `tests/e2e/helpers/` for writing robust, maintainable E2E tests.

## Files

- **auth-setup.ts** - Enhanced authentication setup with per-worker storage state files
- **test-base.ts** - Common test configuration and helper functions

## Usage

### Basic Test with Authentication

```typescript
import { test, expect, useAuthentication } from '../helpers/test-base'

// Enable authentication for all tests in this file
useAuthentication()

test('my authenticated test', async ({ page }) => {
  // Already authenticated - no login needed!
  await page.goto('/documents')
  await expect(page.locator('h1')).toContainText('My Documents')
})
```

### Test with Per-Worker Authentication (for parallel execution)

```typescript
import { test, expect, commonPatterns } from '../helpers/test-base'

// Get worker-specific auth file from fixture
test.use({ storageState: ({ storageStateFile }) => storageStateFile })

test.beforeAll(async ({ browser, storageStateFile }) => {
  // Setup authentication for this specific worker
  await commonPatterns.setupAuthentication(browser, storageStateFile)
})

test('parallel-safe test', async ({ page }) => {
  await page.goto('/documents')
  // Test logic here
})
```

### Using Test Helpers

```typescript
import { test, expect, testHelpers } from '../helpers/test-base'

test('test with AI operations', async ({ page }) => {
  // Create a test document with faker-generated content
  const { documentId, url } = await testHelpers.createTestDocument(page, {
    title: testHelpers.generateTestData.documentTitle('AI Test'),
    useRichContent: true // Use faker to generate unique content
  })
  
  // Navigate to Structure tab
  await testHelpers.navigateToTab(page, 'Structure')
  
  // Trigger AI operation
  await page.click('button:text("Improve headings")')
  
  // Wait for AI processing to complete
  await testHelpers.waitForAIOperation(page)
  
  // Verify enhancements
  const hasEnhancements = await testHelpers.hasAIEnhancements(page)
  expect(hasEnhancements).toBe(true)
})
```

### Using Faker for Test Data

```typescript
import { test, expect, testHelpers } from '../helpers/test-base'

test('test with unique data', async ({ page }) => {
  // Generate unique test data
  const testData = {
    title: testHelpers.generateTestData.documentTitle(),
    url: testHelpers.generateTestData.documentUrl(),
    content: testHelpers.generateTestData.content(5), // 5 paragraphs
    testId: testHelpers.generateTestData.testId('doc')
  }
  
  // Use the unique data in your test
  await page.goto('/upload')
  await page.fill('input[name="url"]', testData.url)
  // ... rest of test
})
```

## Best Practices

1. **Always use relative URLs** - Don't hardcode `http://localhost:3000`, use `/path`
2. **Use the auth helpers** - Don't implement login in each test
3. **Create unique test data** - Use namespaces and faker.js to avoid conflicts
4. **Wait for stability** - Use `waitForPageStability()` after navigation
5. **Clean up test data** - Implement cleanup in afterEach/afterAll hooks
6. **Leverage built-in features** - Use Playwright's retries, traces, and auto-wait
7. **Test isolation** - Each test must be completely independent

## Recommended Libraries

### @faker-js/faker
The only external library strongly recommended for E2E tests. Helps generate unique, realistic test data:

```typescript
import { faker } from '@faker-js/faker'

// Generate unique test data
const testDocument = {
  title: faker.lorem.sentence(),
  content: faker.lorem.paragraphs(5),
  url: faker.internet.url(),
  userEmail: faker.internet.email()
}

// Combine with namespacing for extra safety
const namespace = createWorkerTestNamespace('my-test', workerIndex)
const uniqueTitle = `${faker.lorem.words(3)} ${namespace}`
```

Benefits:
- Prevents data collisions in parallel tests
- Creates realistic test scenarios
- Eliminates hardcoded test values
- Actively maintained with TypeScript support

## Authentication Pattern

The recommended pattern for E2E tests is:

```typescript
import { test, expect } from '../helpers/test-base'
import { getCurrentEnvironmentPaths } from '../../../lib/testing/worktree-auth-helpers'

// File-level auth injection
const { authFile } = getCurrentEnvironmentPaths()
test.use({ storageState: authFile })

// One-time setup
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const authManager = new RobustAuthManager(page)
  await authManager.loginAs('user', { forceReauth: true })
  await context.close()
})

// Tests are automatically authenticated
test('my test', async ({ page }) => {
  await page.goto('/protected-route')
  // No login code needed!
})
```

## Parallel Execution

When running tests in parallel, each worker needs its own auth state file to avoid conflicts:

```typescript
// auth-setup.ts provides this automatically via fixtures
test.use({ storageState: ({ storageStateFile }) => storageStateFile })
```

This ensures each parallel worker maintains its own authentication state.

## Playwright Built-in Stability Features

Leverage these built-in features for test stability instead of adding external libraries:

### 1. **Auto-waiting**
Playwright automatically waits for elements to be actionable:
```typescript
// No need for explicit waits - Playwright handles this
await page.click('button') // Waits for button to be visible, enabled, and stable
```

### 2. **Web-first Assertions**
Assertions automatically retry until the condition is met:
```typescript
// Retries until the element contains the expected text
await expect(page.locator('.status')).toContainText('Success')
```

### 3. **Retries and Flake Detection**
Configure in playwright.config.ts:
```typescript
export default defineConfig({
  retries: 3, // Retry failed tests up to 3 times
  use: {
    trace: 'on-first-retry', // Capture trace on first retry
    video: 'on-first-retry', // Record video on first retry
    screenshot: 'only-on-failure' // Screenshot on failure
  }
})
```

### 4. **Test Isolation**
Each test gets a fresh browser context:
```typescript
// Automatic isolation - no cleanup needed between tests
test('test 1', async ({ page }) => { /* fresh context */ })
test('test 2', async ({ page }) => { /* different fresh context */ })
```

### 5. **Network Interception**
Mock or modify network requests for stability:
```typescript
await page.route('**/api/flaky-endpoint', route => {
  route.fulfill({ status: 200, body: 'stable response' })
})
```