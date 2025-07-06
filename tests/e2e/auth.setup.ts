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
  
  // Wait for authentication to complete - user avatar appears first
  await page.waitForSelector('[class*="orange"]', { timeout: 15000 });
  console.log('Authentication successful - user avatar detected');
  
  // Save authentication state IMMEDIATELY after login succeeds
  // This ensures we capture the auth state while it's still valid
  await page.context().storageState({ 
    path: authFile,
    indexedDB: true  // Critical for Supabase auth persistence
  });
  console.log(`Authentication state saved to ${authFile}`);
  
  // Verify authentication works by navigating to protected route
  await page.goto('/read', { waitUntil: 'networkidle' });
  
  // Check if we stayed on the protected route (not redirected to login)
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/login')) {
    throw new Error('Authentication failed - redirected to login page when accessing protected route');
  }
  
  console.log(`Authentication setup completed successfully for ${envName} environment`);
  console.log(`Verified access to protected route: ${currentUrl}`);
});