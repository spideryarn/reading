import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as os from 'os';
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
  
  /* Retry failed tests for flake detection */
  retries: 3,
  
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
    
    /* Capture detailed diagnostics on retry */
    trace: 'on-first-retry',
    
    /* Record video on retry for debugging */
    video: 'on-first-retry',
    
    /* Screenshot failures */
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
    
    // Chrome tests without authentication (for truly public content only)
    {
      name: 'chromium-no-auth',
      testMatch: [
        // Only tests that genuinely don't need authentication
        '**/optimized-anonymous-access-journey.spec.ts', 
        '**/optimized-route-smoke-tests.spec.ts',
        '**/optimized-mobile-experience.spec.ts',
        '**/optimized-error-recovery.spec.ts'
        // Removed: error-page-testing.spec.ts (needs auth fixes)
        // Removed: optimized-authenticated-onboarding-journey.spec.ts (has "authenticated" in name)
        // Removed: optimized-document-library-journey.spec.ts (requires auth for document operations)
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
  
  /* Dev server management - starts only if not already running */
  // The dev:daemon command should be running externally for best results.
  // This webServer config acts as a fallback to start the server if needed.
  webServer: {
    // Use --once flag to check if server is already running before starting a new one
    command: 'npm run dev:daemon -- --once',
    port: Number(process.env.PORT || 3000),
    reuseExistingServer: true, // Don't duplicate existing daemon
    timeout: 120 * 1000, // Extended timeout for Next.js startup
    stdout: 'ignore', // Minimize output for AI agents
    stderr: 'pipe',
  },
});