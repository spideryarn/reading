import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

/**
 * Demo Playwright configuration for E2E test demonstration
 * 
 * This configuration is specifically for demonstrating the value of E2E testing
 * without dependencies on setup projects or pre-existing authentication state.
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Single test file for demo */
  testMatch: '**/document-workflow-standalone.spec.ts',
  
  /* Run tests sequentially for clear output */
  fullyParallel: false,
  workers: 1,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* No retries for demo */
  retries: 0,
  
  /* Minimal output for demonstration */
  reporter: [['list']],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL from environment variable */
    baseURL: `http://localhost:${process.env.PORT || 3000}`,
    
    /* Collect trace on failure for debugging */
    trace: 'retain-on-failure',
    
    /* Take screenshot on failures */
    screenshot: 'only-on-failure',
    
    /* Headless by default, can be overridden with --headed */
    headless: true,
    
    /* Extended timeouts for AI operations */
    actionTimeout: 30 * 1000,
    navigationTimeout: 45 * 1000,
    
    /* Standard viewport */
    viewport: { width: 1200, height: 800 },
  },
  
  /* Configure projects for major browsers - NO SETUP DEPENDENCY */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // No storageState dependency - each test handles its own auth
      },
    },
  ],
  
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:simple',
    port: Number(process.env.PORT || 3000),
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});