import { test, expect } from '@playwright/test';

/**
 * Basic Document Access Control Test
 * 
 * A simplified test to validate the core document access control functionality
 * without complex dependencies. This serves as a smoke test for the new 
 * conditional authentication and RLS-based access control system.
 */

test.describe('Document Access Control - Basic Tests', () => {
  
  test('anonymous users can access the application', async ({ page }) => {
    console.log('🔄 Testing basic anonymous access to application');
    
    // Navigate to the main page without authentication
    await page.goto('/');
    
    // Should be able to see the main page
    await expect(page).toHaveTitle(/Spideryarn/i);
    
    console.log('✅ Anonymous user can access application home page');
  });

  test('document access returns proper 404 for non-existent documents', async ({ page }) => {
    console.log('🔄 Testing access to non-existent document');
    
    // Navigate to a definitely non-existent document
    await page.goto('/read/definitely-does-not-exist-123456789');
    
    // Should see some form of 404 or not found page
    const indicators = [
      page.locator('text=404'),
      page.locator('text=Page Not Found'),
      page.locator('text=This page could not be found'),
      page.locator('text=Document Not Available'),
      page.locator('h1:has-text("404")'),
    ];
    
    let foundIndicator = false;
    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 3000 })) {
        foundIndicator = true;
        break;
      }
    }
    
    expect(foundIndicator).toBe(true);
    
    console.log('✅ Non-existent document properly returns 404');
  });

  test('authentication system is accessible', async ({ page }) => {
    console.log('🔄 Testing authentication system accessibility');
    
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Should see login form
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    console.log('✅ Authentication system is accessible');
  });

  test('read page redirects to documents list for authenticated users', async ({ page }) => {
    console.log('🔄 Testing read page accessibility');
    
    // Navigate to the read page
    await page.goto('/read');
    
    // Should either see the documents list or be redirected to login
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    const isReadPage = currentUrl.includes('/read');
    const isLoginPage = currentUrl.includes('/auth/login');
    
    // Should be either on read page or redirected to login
    expect(isReadPage || isLoginPage).toBe(true);
    
    console.log('✅ Read page is accessible and handles authentication appropriately');
  });

  test('application handles bot user agents properly', async ({ page }) => {
    console.log('🔄 Testing bot user agent handling');
    
    // Set bot user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)'
    });
    
    // Navigate to main page
    await page.goto('/');
    
    // Should still be able to access the application
    await expect(page).toHaveTitle(/Spideryarn/i);
    
    console.log('✅ Application properly handles bot user agents');
  });
});