import { test as setup, expect } from '@playwright/test';
import { getCurrentEnvironmentTestUser, getEnvironmentName, getCurrentEnvironmentId, validateEnvironmentSetup } from '../../lib/testing/worktree-auth-helpers';

// Increase timeout – first page load can take up to a minute while Next.js compiles.
setup.setTimeout(120_000);

// Strict environment validation - fail fast if misconfigured
const validation = validateEnvironmentSetup();
if (!validation.isValid) {
  throw new Error(`Environment validation failed:\n${validation.errors.join('\n')}\n\nCurrent: PORT=${validation.port}, envId=${validation.envId}, envName=${validation.envName}`);
}

const envId = getCurrentEnvironmentId();
const envName = getEnvironmentName(envId);
const authFile = `playwright/.auth/${envName}-user.json`;
const { email, password } = getCurrentEnvironmentTestUser();

/**
 * Worktree-Aware Authentication Setup for Playwright Tests
 * 
 * This setup project runs before all tests and creates an authenticated user session
 * using environment-specific test users to prevent auth conflicts across worktrees.
 * 
 * Environment: ${envName} (ID: ${envId})
 * Test User: ${email}
 * Auth File: ${authFile}
 */
setup('authenticate', async ({ page }) => {
  console.log(`Setting up authentication for ${envName} environment...`);
  console.log(`Using test user: ${email}`);
  console.log(`Auth file: ${authFile}`);
  
  // Navigate to login page (wait only for DOMContentLoaded to shorten compile wait)
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  
  // Wait for the login form elements to be present (max 60 s)
  await page.waitForSelector('input[name="email"]', { timeout: 60_000 });
  
  // Fill login form with environment-specific credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for successful authentication (redirect away from login)
  await expect(page).toHaveURL(/^(?!.*\/auth\/login).*$/, {
    timeout: 15000 // Extended timeout for auth processing
  });
  
  // Verify authentication by checking we're not on login page and can access protected content
  await expect(page).not.toHaveURL(/\/auth\/login/);
  
  // Try to access a protected route to verify authentication
  await page.goto('/read');
  await expect(page).toHaveURL(/\/read/);
  
  // Look for any indication of being logged in (more flexible selector)
  const authIndicators = [
    page.locator('text=Log out'),
    page.locator('text=Profile'),
    page.locator('[class*="orange"]'), // Orange user avatar
    page.locator('button:has([class*="orange"])'), // Button with orange avatar
    page.locator('.text-orange-700') // Direct orange text class
  ];
  
  // Wait for at least one auth indicator to be visible
  let authFound = false;
  for (const indicator of authIndicators) {
    try {
      await indicator.waitFor({ timeout: 2000 });
      authFound = true;
      break;
    } catch {
      // Continue to next indicator
    }
  }
  
  if (!authFound) {
    console.log('Warning: Could not verify visual authentication indicator, but login redirect succeeded');
  }
  
  // Save authentication state with IndexedDB for Supabase
  await page.context().storageState({ 
    path: authFile,
    indexedDB: true  // Critical for Supabase auth persistence
  });
  
  console.log(`Authentication setup completed successfully for ${envName} environment`);
});