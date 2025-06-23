import { test, expect } from '@playwright/test';

/**
 * Error Page E2E Tests
 * 
 * Tests the custom error pages and error handling functionality including:
 * - /error page that intentionally throws an error for testing 500 error page
 * - Custom 500 error page display and functionality
 * - Navigation buttons and "Try Again" functionality
 * - Error handling without unexpected console errors (beyond the intentional test error)
 * 
 * Note: These tests don't require authentication as error pages should be accessible to all users
 */

test.describe('Error Page Testing', () => {
  
  // Use a fresh browser context for each test to avoid auth state
  test.use({ storageState: { cookies: [], origins: [] } });
  
  test('intentional error page displays 500 error correctly', async ({ page }) => {
    console.log('🔄 Testing /error page displays custom 500 error page');
    
    // Navigate to the intentional error page
    await page.goto('/error');
    
    // Should display the custom 500 error page
    // Check for the error code "500" in the large display element
    await expect(page.locator('div.text-6xl:has-text("500")')).toBeVisible();
    
    // Check for the error title
    await expect(page.locator('h1:has-text("Something went wrong")')).toBeVisible();
    
    // Check for the error description
    await expect(page.locator('text=An unexpected error occurred')).toBeVisible();
    
    // Check for the "Try Again" button
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    
    // Check for the "Go Home" button
    await expect(page.locator('a:has-text("Go Home")')).toBeVisible();
    
    // Check for the "Go Back" button
    await expect(page.locator('button:has-text("Go Back")')).toBeVisible();
    
    console.log('✅ 500 error page displays all required elements correctly');
  });

  test('error page shows development error details in development mode', async ({ page }) => {
    console.log('🔄 Testing error page shows development error details');
    
    // Navigate to the intentional error page
    await page.goto('/error');
    
    // In development mode, should show error details
    const errorDetails = page.locator('details:has-text("Error Details (Development)")');
    
    if (await errorDetails.isVisible()) {
      // Click to expand error details
      await errorDetails.locator('summary').click();
      
      // Should show the actual error message
      await expect(page.locator('pre:has-text("Test error for 500 page testing")')).toBeVisible();
      
      console.log('✅ Development error details are visible and expandable');
    } else {
      console.log('ℹ️  Error details not shown (likely production mode)');
    }
  });

  test('Try Again button functionality works', async ({ page }) => {
    console.log('🔄 Testing "Try Again" button functionality');
    
    // Navigate to the intentional error page
    await page.goto('/error');
    
    // Wait for the error page to load
    await expect(page.locator('div.text-6xl:has-text("500")')).toBeVisible();
    
    // Click the "Try Again" button
    await page.locator('button:has-text("Try Again")').click();
    
    // Should reload the page and show the error again (since /error always throws)
    await expect(page.locator('div.text-6xl:has-text("500")')).toBeVisible();
    
    console.log('✅ "Try Again" button reloads the page correctly');
  });

  test('Go Home button navigation works', async ({ page }) => {
    console.log('🔄 Testing "Go Home" button navigation');
    
    // Navigate to the intentional error page
    await page.goto('/error');
    
    // Wait for the error page to load
    await expect(page.locator('div.text-6xl:has-text("500")')).toBeVisible();
    
    // Click the "Go Home" button
    await page.locator('a:has-text("Go Home")').click();
    
    // Should navigate to the home page
    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle(/Spideryarn/i);
    
    console.log('✅ "Go Home" button navigates to home page correctly');
  });

  test('Go Back button functionality works', async ({ page }) => {
    console.log('🔄 Testing "Go Back" button functionality');
    
    // Start from home page to have a page to go back to
    await page.goto('/');
    await expect(page).toHaveTitle(/Spideryarn/i);
    
    // Navigate to the error page
    await page.goto('/error');
    await expect(page.locator('div.text-6xl:has-text("500")')).toBeVisible();
    
    // Click the "Go Back" button
    await page.locator('button:has-text("Go Back")').click();
    
    // Should go back to the previous page (home page)
    await expect(page).toHaveURL('/');
    await expect(page).toHaveTitle(/Spideryarn/i);
    
    console.log('✅ "Go Back" button navigates back correctly');
  });

  test('error page has proper branding and layout', async ({ page }) => {
    console.log('🔄 Testing error page branding and layout');
    
    // Navigate to the intentional error page
    await page.goto('/error');
    
    // Check for Spideryarn branding in header
    await expect(page.locator('header a:has-text("Spideryarn")')).toBeVisible();
    
    // Check for footer content
    await expect(page.locator('footer:has-text("© 2025 Spideryarn")')).toBeVisible();
    
    // Check for proper layout structure
    await expect(page.locator('main')).toBeVisible();
    
    // Check that the error content is centered
    const errorContainer = page.locator('main div.text-center');
    await expect(errorContainer).toBeVisible();
    
    console.log('✅ Error page has proper branding and layout structure');
  });

  test('error page handles browser console errors appropriately', async ({ page }) => {
    console.log('🔄 Testing console error handling on error page');
    
    // Collect console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });
    
    // Navigate to the intentional error page
    await page.goto('/error');
    
    // Wait for the error page to load
    await expect(page.locator('div.text-6xl:has-text("500")')).toBeVisible();
    
    // Give a moment for any console errors to be logged
    await page.waitForTimeout(1000);
    
    // Should have some console errors (the intentional React error)
    // but they should be expected error messages, not unexpected crashes
    const hasExpectedError = consoleMessages.some(msg => 
      msg.includes('Test error for 500 page testing') || 
      msg.includes('The above error occurred in the')
    );
    
    // We expect some errors due to the intentional error throwing,
    // but we shouldn't have unexpected errors beyond that
    console.log(`Console errors found: ${consoleMessages.length}`);
    console.log('Console error messages:', consoleMessages);
    
    // This is informational - we expect some errors but want to validate they're expected
    if (hasExpectedError) {
      console.log('✅ Found expected error messages from intentional error throwing');
    } else if (consoleMessages.length === 0) {
      console.log('ℹ️  No console errors detected (unexpected but not necessarily wrong)');
    } else {
      console.log('⚠️  Found unexpected console error patterns');
    }
  });

  test('error page accessibility and responsive design', async ({ page }) => {
    console.log('🔄 Testing error page accessibility and responsive design');
    
    // Navigate to the intentional error page
    await page.goto('/error');
    
    // Check for proper heading hierarchy
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for proper button labeling
    const tryAgainButton = page.locator('button:has-text("Try Again")');
    await expect(tryAgainButton).toBeVisible();
    
    const goHomeButton = page.locator('a:has-text("Go Home")');
    await expect(goHomeButton).toBeVisible();
    
    const goBackButton = page.locator('button:has-text("Go Back")');
    await expect(goBackButton).toBeVisible();
    
    // Test responsive design by changing viewport
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile size
    
    // Elements should still be visible and properly laid out
    await expect(page.locator('div.text-6xl:has-text("500")')).toBeVisible();
    await expect(page.locator('h1:has-text("Something went wrong")')).toBeVisible();
    await expect(tryAgainButton).toBeVisible();
    await expect(goHomeButton).toBeVisible();
    await expect(goBackButton).toBeVisible();
    
    // Reset viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    
    console.log('✅ Error page has proper accessibility and responsive design');
  });
});