import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

/**
 * Authentication Setup for Playwright Tests
 * 
 * This setup project runs before all tests and creates an authenticated user session.
 * It handles database resets gracefully and uses credentials from supabase/seed.sql.
 */
setup('authenticate', async ({ page }) => {
  console.log('Setting up authentication...');
  
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Wait for form to load
  await page.waitForLoadState('networkidle');
  
  // Fill login form with credentials from supabase/seed.sql
  await page.fill('input[name="email"]', 'hello@spideryarn.com');
  await page.fill('input[name="password"]', 'ASDFasdf1');
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
  
  console.log('Authentication setup completed successfully');
});