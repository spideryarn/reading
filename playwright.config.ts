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

/**
 * Playwright configuration for Spideryarn Reading
 * 
 * Key Features:
 * - Worktree-aware file paths for concurrent testing across environments
 * - Environment-specific authentication state (${envName})
 * - Sequential execution initially (workers: 1) until namespace isolation validated
 * - Headless Chrome only for AI-friendly minimal output
 * - Port configuration from .env.test
 * - Extended timeouts for AI operations
 * - Robust authentication with database reset recovery
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Global per-test timeout (dev build compile can exceed 2 min). */
  timeout: 300 * 1000,
  
  /* Run tests in files in parallel but start with sequential execution */
  fullyParallel: false, // Conservative approach per planning doc
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Sequential execution initially until namespace isolation validated */
  workers: 1,
  
  /* Minimal output for AI agents */
  reporter: [
    ['list'], // Minimal output during development
    ['json', { outputFile: 'tests/test-results/results.json' }] // For parsing if needed
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL from environment variable (different ports per worktree) */
    baseURL: `http://localhost:${process.env.PORT || 3000}`,
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot only on failures to minimize output */
    screenshot: 'only-on-failure',
    
    /* Headless by default for efficiency */
    headless: true,
    
    /* Extended timeouts for AI operations and slow first-page load (120 seconds) */
    actionTimeout: 300 * 1000,
    navigationTimeout: 300 * 1000,
    
    /* Larger viewport for better page layout */
    viewport: { width: 1200, height: 800 },
  },
  
  /* Configure projects for major browsers */
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
    
    // Chrome tests without authentication (for error pages, public content, etc.)
    {
      name: 'chromium-no-auth',
      testMatch: [
        '**/error-page-testing.spec.ts', 
        '**/optimized-anonymous-access-journey.spec.ts', 
        '**/optimized-authenticated-onboarding-journey.spec.ts',
        '**/optimized-document-library-journey.spec.ts',
        '**/optimized-route-smoke-tests.spec.ts',
        '**/optimized-mobile-experience.spec.ts',
        '**/optimized-error-recovery.spec.ts'
      ],
      use: { 
        ...devices['Desktop Chrome'],
        // No storageState - fresh context for each test
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  
  /* Environment-specific folder for test artifacts */
  outputDir: testResultsDir,
  
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:simple',
    port: Number(process.env.PORT || 3000),
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Extended timeout for Next.js startup
    stdout: 'ignore', // Minimize output for AI agents
    stderr: 'pipe',
  },
});