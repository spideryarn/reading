import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

/**
 * Playwright configuration for Spideryarn Reading
 * 
 * Key Features:
 * - Sequential execution initially (workers: 1) until namespace isolation validated
 * - Headless Chrome only for AI-friendly minimal output
 * - Port configuration from .env.test
 * - Extended timeouts for AI operations
 * - Robust authentication with database reset recovery
 */
export default defineConfig({
  testDir: './tests/e2e',
  
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
    ['json', { outputFile: 'test-results/results.json' }] // For parsing if needed
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL from environment variable (different ports per worktree) */
    baseURL: `http://localhost:${process.env.PORT || 3002}`,
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot only on failures to minimize output */
    screenshot: 'only-on-failure',
    
    /* Headless by default for efficiency */
    headless: true,
    
    /* Extended timeouts for AI operations (30-45 seconds) */
    actionTimeout: 30 * 1000,
    navigationTimeout: 45 * 1000,
    
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
        // Use the authentication state from setup
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  
  /* Folder for test artifacts */
  outputDir: 'test-results/',
  
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:safe',
    port: Number(process.env.PORT || 3002),
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Extended timeout for Next.js startup
    stdout: 'ignore', // Minimize output for AI agents
    stderr: 'pipe',
  },
});