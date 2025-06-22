# Browser Automation Testing Implementation Guide

> **Status**: ✅ Complete - Comprehensive implementation patterns for Playwright E2E testing  
> **Last Updated**: June 2025  
> **Target Audience**: Developers and AI agents implementing browser automation tests

This document provides detailed implementation patterns, authentication helpers, and advanced configuration for browser automation testing using Playwright in the Spideryarn Reading project.

## See Also

- `docs/reference/TESTING_BROWSER_AUTOMATION_OVERVIEW.md` - Quick reference and best practices
- `docs/reference/RESEARCH_ON_TESTING_BROWSER_AUTOMATION.md` - Tool comparison and selection rationale
- `docs/reference/TESTING_OVERVIEW.md` - Overall testing philosophy and Jest integration
- `docs/reference/GIT_WORKTREES.md` - Multi-worktree development environment setup

## Authentication Implementation Patterns

### Core Authentication Helper - RobustAuthManager

The `RobustAuthManager` class provides comprehensive authentication handling with database reset recovery:

```typescript
// tests/helpers/robust-auth.ts
import { Page, expect } from '@playwright/test';
import { getCurrentEnvironmentTestUser, getCurrentEnvironmentPaths } from '../../lib/testing/worktree-auth-helpers';

export class RobustAuthManager {
  constructor(private page: Page) {}
  
  async loginAs(userRole: UserRole = 'user', options: AuthOptions = {}) {
    const { authFile } = getCurrentEnvironmentPaths();
    
    // Skip if already authenticated and not forcing
    if (!options.forceReauth && !options.skipStateCheck) {
      if (await this.isAlreadyAuthenticated()) {
        return;
      }
    }
    
    // Clear any existing state for fresh auth
    await this.clearAuthState();
    
    // Perform login with environment-specific credentials
    await this.performLogin(userRole);
    
    // Save authentication state with IndexedDB for Supabase
    await this.page.context().storageState({ 
      path: authFile,
      indexedDB: true // Critical for Supabase auth persistence
    });
    
    // Verify authentication worked
    await this.verifyAuthentication();
  }
  
  private async performLogin(userRole: UserRole) {
    const credentials = this.getCredentials(userRole);
    
    await this.page.goto('/auth/login');
    await this.page.waitForLoadState('networkidle');
    
    // Fill login form using form field names
    await this.page.fill('input[name="email"]', credentials.email);
    await this.page.fill('input[name="password"]', credentials.password);
    await this.page.click('button[type="submit"]');
    
    // Wait for successful authentication (redirect away from login)
    await expect(this.page).toHaveURL(/^(?!.*\/auth\/login).*$/, {
      timeout: 15000 // Extended timeout for auth processing
    });
  }
  
  private async clearAuthState() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear IndexedDB for Supabase
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('keyval-store');
        indexedDB.deleteDatabase('supabase-auth-token');
      }
    });
  }
  
  private async verifyAuthentication() {
    // Verify user is actually logged in by checking profile API
    const response = await this.page.request.get('/api/user/profile');
    if (response.status() !== 200) {
      throw new Error(`Authentication verification failed: ${response.status()}`);
    }
  }
}
```

### Simple Authentication Helper Pattern

For straightforward tests, use this minimal authentication pattern:

```typescript
// Helper function for authentication
async function authenticate(page: any) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  
  // Use existing user that we verified exists
  await page.fill('input[name="email"]', 'hello@spideryarn.com');
  await page.fill('input[name="password"]', 'ASDFasdf1');
  await page.click('button[type="submit"]');
  
  // Wait for successful authentication
  await expect(page).toHaveURL(/^(?!.*\/auth\/login).*$/, {
    timeout: 15000
  });
}

// Usage in test
test('my feature test', async ({ page }) => {
  await authenticate(page);
  // ... rest of test
});
```

### Database Reset Recovery Implementation

The `withDatabaseResetRecovery` wrapper automatically handles database resets:

```typescript
export async function withDatabaseResetRecovery<T>(
  page: Page,
  operation: () => Promise<T>,
  maxRetries = 1
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Check if error indicates auth/database issue
      if (isAuthError(error) || isDatabaseResetError(error)) {
        const auth = new RobustAuthManager(page);
        await auth.loginAs('user', { forceReauth: true });
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage in test
test('database-dependent test', async ({ page }) => {
  await withDatabaseResetRecovery(page, async () => {
    // Test operations that might fail after database reset
    await page.goto('/upload');
    // ... rest of test logic
  });
});
```

## Multi-Worktree Authentication System

### Environment-Specific Test Users

Each worktree uses isolated test users to prevent authentication conflicts:

```typescript
// lib/testing/worktree-auth-helpers.ts

/**
 * Get test user email for the specified environment
 * @param envId - Environment ID (0 for main, 1-6 for worktrees)
 * @returns Email address for the environment's test user
 */
export function getEnvironmentTestUser(envId: number): string {
  if (envId === 0) {
    return 'hello@spideryarn.com' // Main repository uses original test user
  }
  return `test-user${envId}@spideryarn.com` // Worktree-specific users
}

/**
 * Get test user credentials for the current environment
 * @returns Object with email and password for current environment
 */
export function getCurrentEnvironmentTestUser(): { email: string; password: string } {
  const envId = getCurrentEnvironmentId()
  return {
    email: getEnvironmentTestUser(envId),
    password: 'ASDFasdf1' // Same password for all test users
  }
}

/**
 * Detect current environment ID from PORT environment variable
 * @returns Environment ID: 0 for main repo, 1-6 for worktrees
 */
export function getCurrentEnvironmentId(): number {
  const port = parseInt(process.env.PORT || '3000')
  return port - 3000 // Returns 0 for main (port 3000), 1-6 for worktrees (ports 3001-3006)
}
```

### Environment Path Management

Environment-specific file paths prevent conflicts:

```typescript
/**
 * Generate environment-specific file paths for browser automation
 * @param envId - Environment ID (0 for main, 1-6 for worktrees)
 * @returns Object with all environment-specific paths
 */
export function getEnvironmentPaths(envId: number): {
  envName: string
  authFile: string
  screenshotDir: string
  testResultsDir: string
} {
  const envName = getEnvironmentName(envId)
  return {
    envName,
    authFile: `playwright/.auth/${envName}-user.json`,
    screenshotDir: `playwright/screenshots/${envName}/`,
    testResultsDir: `playwright/test-results/${envName}/`
  }
}
```

## Test Structure Guidelines

### File Header Template

Use this template for comprehensive E2E tests:

```typescript
import { test, expect } from '@playwright/test';

// Override to skip authentication dependency if needed
test.use({ 
  storageState: undefined 
});

/**
 * [Test Suite Name] Integration Test
 * 
 * This comprehensive E2E test demonstrates the value of integration testing
 * over extensive unit testing by covering complete user workflows with real
 * system integration.
 * 
 * REPLACES [X]+ UNIT TESTS:
 * 
 * Authentication Tests ([X]+ tests):
 * - User login validation, session management, route protection
 * - Authentication state persistence, password validation
 * - Error handling for invalid credentials
 * 
 * [Feature] Tests ([X]+ tests):
 * - [Specific functionality being tested]
 * - [Additional test categories]
 * 
 * TABLE OF CONTENTS:
 * 
 * 🔐 Authentication Flow & Security
 * ├── Route protection (unauthenticated redirect to login)
 * ├── Form-based authentication with real credentials
 * ├── Session persistence and access control
 * └── UI authentication state indicators
 * 
 * 📝 [Primary Feature Area]
 * ├── [Specific test scenario 1]
 * ├── [Specific test scenario 2]
 * └── [Specific test scenario 3]
 * 
 * LIMITATIONS:
 * - Does not test complex algorithmic edge cases (use unit tests)
 * - Does not test performance-critical optimizations in isolation
 * - Does not cover malformed data scenarios requiring specific setup
 * 
 * BENEFITS OF E2E APPROACH:
 * - Tests real user workflows, not isolated functions
 * - Catches integration bugs that unit tests miss  
 * - Validates security with actual RLS policies and authentication
 * - Requires minimal mocking, tests actual system behavior
 * - Serves as living documentation of user workflows
 * - Faster execution than comprehensive unit test suites
 */
test.describe('[Test Suite Name]', () => {
  // Test implementations...
});
```

### Test Method Structure Pattern

Use this pattern for individual test methods:

```typescript
test('descriptive test name covering user workflow', async ({ page }) => {
  console.log('🔄 Starting [Test Description]');
  
  // =================================================================
  // PHASE 1: [AUTHENTICATION/SETUP]
  // =================================================================
  console.log('Phase 1: [Phase Description]');
  await authenticate(page);
  console.log('✅ [Phase] successful');
  
  // =================================================================
  // PHASE 2: [PRIMARY FEATURE TESTING]
  // =================================================================
  console.log('Phase 2: [Phase Description]');
  
  // Test implementation with detailed logging
  await page.goto('/target-route');
  await expect(page.locator('h2:has-text("Expected Header")')).toBeVisible();
  
  console.log('✅ [Phase] completed');
  
  // =================================================================
  // PHASE N: [VERIFICATION/CLEANUP]
  // =================================================================
  console.log('Phase N: [Final Phase Description]');
  
  // Final verifications
  console.log('✅ [Final verification] completed');
  
  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('');
  console.log('🎉 [TEST NAME] PASSED!');
  console.log('');
  console.log('📊 This test covered:');
  console.log('- ✅ [Feature 1]');
  console.log('- ✅ [Feature 2]');
  console.log('- ✅ [Feature 3]');
});
```

## Advanced Waiting Strategies

### Event-Driven Waiting (Recommended)

Wait for specific API responses rather than arbitrary timeouts:

```typescript
try {
  // Wait for the API call to complete and URL redirect
  const [uploadResponse] = await Promise.all([
    // Wait for the upload/extract API call to complete
    page.waitForResponse(response => {
      const isCorrectUrl = response.url().includes('/api/extract-url');
      const isSuccess = response.status() === 200;
      console.log(`🔍 API Response: ${response.url()} - Status: ${response.status()}`);
      return isCorrectUrl && isSuccess;
    }, { timeout: 60000 }), // Allow time for AI processing
    
    // Click submit button
    submitButton.click()
  ]);
  
  console.log('✅ Document submission and processing API call completed');
  
  // Wait for redirect to document view (should happen after API completes)
  await expect(page).toHaveURL(/\/read\/.*/, { 
    timeout: 10000 // Should be quick after API completes
  });
} catch (error) {
  // Fallback error handling
  console.log('❌ API call failed or timed out, checking for error messages...');
  // ... error recovery logic
}
```

### Multiple Selector Waiting

Wait for any of several possible outcomes:

```typescript
// Wait for main content to load (flexible selector approach)
await expect(page.locator('h1, h2, p, article, main').first()).toBeVisible({
  timeout: 15000
});

// Check for multiple possible error message formats
const errorSelectors = [
  '.error', '.text-red-500', '[class*="error"]', 
  'text=error', 'text=Error', 'text=failed', 'text=Failed'
];

for (const selector of errorSelectors) {
  const errorEl = page.locator(selector).first();
  if (await errorEl.isVisible({ timeout: 2000 })) {
    const errorText = await errorEl.textContent();
    console.log(`🚨 Error found: ${errorText}`);
  }
}
```

### Progressive Fallback Pattern

Implement multiple strategies for robust waiting:

```typescript
// Try primary approach
try {
  await expect(page).toHaveURL(/\/read\/.*/, { timeout: 10000 });
} catch (error) {
  // Fallback 1: Check for processing indicator
  const hasProcessingIndicator = await page.locator('text=Processing').isVisible({ timeout: 5000 });
  if (hasProcessingIndicator) {
    console.log('⏳ Found processing indicator, waiting for completion...');
    await page.locator('text=Processing').waitFor({ state: 'hidden', timeout: 60000 });
    await expect(page).toHaveURL(/\/read\/.*/, { timeout: 10000 });
  } else {
    // Fallback 2: Manual navigation check
    const currentUrl = page.url();
    if (currentUrl.includes('/read/')) {
      console.log('✅ Already on target page');
    } else {
      throw error; // Re-throw if all fallbacks fail
    }
  }
}
```

## Playwright Configuration Implementation

### Environment-Aware Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { getCurrentEnvironmentId, getEnvironmentName } from './lib/testing/worktree-auth-helpers';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Generate environment-aware paths
const envId = getCurrentEnvironmentId();
const envName = getEnvironmentName(envId);
const authFile = `playwright/.auth/${envName}-user.json`;
const screenshotDir = `playwright/screenshots/${envName}/`;
const testResultsDir = `playwright/test-results/${envName}/`;

export default defineConfig({
  testDir: './tests/e2e',
  
  /* Sequential execution initially until namespace isolation validated */
  fullyParallel: false,
  workers: 1,
  
  /* Minimal output for AI agents */
  reporter: [
    ['list'], // Minimal output during development
    ['json', { outputFile: 'tests/test-results/results.json' }]
  ],
  
  use: {
    /* Base URL from environment variable (different ports per worktree) */
    baseURL: `http://localhost:${process.env.PORT || 3000}`,
    
    /* Extended timeouts for AI operations (30-45 seconds) */
    actionTimeout: 30 * 1000,
    navigationTimeout: 45 * 1000,
    
    /* Larger viewport for better page layout */
    viewport: { width: 1200, height: 800 },
    
    /* Headless by default for efficiency */
    headless: true,
    
    /* Take screenshot only on failures to minimize output */
    screenshot: 'only-on-failure',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
  },
  
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Chrome tests with authentication dependency
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use environment-specific authentication state
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
  ],
  
  /* Environment-specific folder for test artifacts */
  outputDir: testResultsDir,
  
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:safe',
    port: Number(process.env.PORT || 3000),
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Extended timeout for Next.js startup
    stdout: 'ignore', // Minimize output for AI agents
    stderr: 'pipe',
  },
});
```

### Setup Project Implementation

Create `tests/e2e/auth.setup.ts` for authentication setup:

```typescript
import { test as setup, expect } from '@playwright/test';
import { RobustAuthManager } from '../helpers/robust-auth';
import { getCurrentEnvironmentPaths } from '../../lib/testing/worktree-auth-helpers';

const { authFile } = getCurrentEnvironmentPaths();

setup('authenticate', async ({ page }) => {
  const auth = new RobustAuthManager(page);
  await auth.loginAs('user');
  
  // Verify authentication worked
  await page.goto('/read');
  await expect(page.locator('body')).not.toContainText('Log in');
  
  // Save signed-in state to authFile
  await page.context().storageState({ path: authFile });
});
```

## Test Isolation Patterns

### Worker-Aware Test Isolation

Use environment-aware namespacing for database operations:

```typescript
import { getWorktreeTestNamespace, createWorktreeTestEmail } from '../../lib/testing/worktree-auth-helpers';

test('database-dependent test', async ({ page }) => {
  // Create environment-aware test namespace
  const namespace = getWorktreeTestNamespace('my-feature-test');
  const testEmail = createWorktreeTestEmail(namespace);
  
  // Use namespace in test operations
  const testData = {
    id: `test-doc-${namespace}`,
    title: `Test Document ${namespace}`,
    userEmail: testEmail
  };
  
  // ... test implementation using namespaced data
});
```

### UUID-Based Test Isolation

Generate unique identifiers for test data:

```typescript
test('document upload test', async ({ page }) => {
  // Create unique test data to avoid conflicts
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const testUrl = `https://example.com/test-doc?id=${timestamp}-${random}`;
  
  await page.fill('input[type="url"]', testUrl);
  // ... rest of test
});
```

## Error Recovery Patterns

### Comprehensive Error Detection

```typescript
function isAuthError(error: any): boolean {
  return error.message?.includes('401') || 
         error.message?.includes('unauthorized') ||
         error.message?.includes('Authentication verification failed');
}

function isDatabaseResetError(error: any): boolean {
  return error.message?.includes('relation') ||
         error.message?.includes('column') ||
         error.message?.includes('database') ||
         error.message?.includes('connection');
}
```

### Multi-Step Error Recovery

```typescript
async function recoverFromError(page: Page, error: any) {
  console.log(`🔄 Attempting error recovery: ${error.message}`);
  
  // Step 1: Clear authentication state
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Step 2: Re-authenticate
  const auth = new RobustAuthManager(page);
  await auth.loginAs('user', { forceReauth: true });
  
  // Step 3: Wait for system stabilization
  await page.waitForTimeout(2000);
  
  console.log('✅ Error recovery completed');
}
```

## Debugging and Troubleshooting

### Enhanced Console Logging

Use structured logging for better debugging:

```typescript
test('complex workflow', async ({ page }) => {
  console.log('🔄 Starting Complex Workflow Test');
  console.log(`Environment: ${getCurrentEnvironmentId()}`);
  console.log(`Test User: ${getCurrentEnvironmentTestUser().email}`);
  
  // Log each major step
  console.log('Phase 1: Authentication');
  // ... authentication code
  console.log('✅ Authentication successful');
  
  console.log('Phase 2: Data Setup');
  // ... data setup code
  console.log('✅ Data setup completed');
  
  // Log API responses for debugging
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ API Error: ${response.url()} - ${response.status()}`);
    }
  });
});
```

### Screenshot and Trace Collection

```typescript
test('failing test with debugging', async ({ page }) => {
  try {
    // Test implementation
  } catch (error) {
    // Capture debugging information on failure
    const timestamp = Date.now();
    await page.screenshot({ 
      path: `debug-screenshots/failure-${timestamp}.png`,
      fullPage: true 
    });
    
    // Log page content for debugging
    const html = await page.content();
    console.log('Page HTML at failure:', html.substring(0, 1000));
    
    throw error;
  }
});
```

### Network Request Monitoring

```typescript
test('API integration test', async ({ page }) => {
  // Monitor network requests
  const requests: string[] = [];
  page.on('request', request => {
    requests.push(`${request.method()} ${request.url()}`);
  });
  
  // Monitor responses
  const responses: { url: string, status: number }[] = [];
  page.on('response', response => {
    responses.push({ url: response.url(), status: response.status() });
  });
  
  // ... test implementation
  
  // Log network activity on completion
  console.log('Network Requests:', requests);
  console.log('Network Responses:', responses.filter(r => r.status >= 400));
});
```

## Performance Optimization

### Minimize Network Waiting

```typescript
// Use networkidle sparingly - prefer specific element waiting
await page.waitForLoadState('networkidle'); // Only when necessary

// Prefer specific element waiting
await expect(page.locator('#specific-element')).toBeVisible();

// Use domcontentloaded for faster page loads
await page.waitForLoadState('domcontentloaded');
```

### Efficient Selector Strategies

```typescript
// Efficient: Use specific, stable selectors
await page.click('button[data-testid="submit"]');

// Less efficient: Broad text matching
await page.click('text=Submit');

// Good compromise: Specific text with context
await page.click('button:has-text("Submit")');
```

### Resource Management

```typescript
test.afterEach(async ({ page }) => {
  // Clean up test data if needed
  await page.evaluate(() => {
    // Clear any test-specific local storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('test-')) {
        localStorage.removeItem(key);
      }
    });
  });
});
```

This comprehensive implementation guide provides the technical foundation for creating robust, maintainable browser automation tests using Playwright in the Spideryarn Reading project.