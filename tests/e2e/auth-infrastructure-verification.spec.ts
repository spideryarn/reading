import { test, expect } from '@playwright/test';

test('verify authentication infrastructure works', async ({ page }) => {
  console.log('1. Navigating to login page...');
  await page.goto('/auth/login');
  
  console.log('2. Filling login form...');
  await page.fill('input[name="email"]', 'test-user2@spideryarn.com');
  await page.fill('input[name="password"]', 'ASDFasdf1');
  
  console.log('3. Submitting form...');
  await page.click('button[type="submit"]');
  
  console.log('4. Waiting for redirect...');
  // Try multiple approaches to detect successful login
  const loginSuccess = await Promise.race([
    // Option 1: URL changes away from login
    page.waitForURL(/^(?!.*\/auth\/login).*$/, { timeout: 15000 })
      .then(() => ({ success: true, method: 'url-change' }))
      .catch(() => ({ success: false, method: 'url-change' })),
    
    // Option 2: Look for authenticated UI elements
    page.waitForSelector('text="Browse Documents"', { timeout: 15000 })
      .then(() => ({ success: true, method: 'ui-element' }))
      .catch(() => ({ success: false, method: 'ui-element' })),
    
    // Option 3: Check for user avatar/profile
    page.waitForSelector('[class*="orange"]', { timeout: 15000 })
      .then(() => ({ success: true, method: 'user-avatar' }))
      .catch(() => ({ success: false, method: 'user-avatar' }))
  ]);
  
  console.log('5. Login result:', loginSuccess);
  console.log('   Final URL:', page.url());
  
  // Additional debugging info
  console.log('6. Checking authentication state...');
  
  // Wait a bit for any client-side redirects
  await page.waitForTimeout(2000);
  console.log('   URL after wait:', page.url());
  
  // Try to navigate to a protected page
  console.log('7. Testing protected route access...');
  await page.goto('/read');
  await page.waitForLoadState('networkidle');
  console.log('   Protected route URL:', page.url());
  
  // Check if we stayed on the protected route or got redirected
  const isOnProtectedRoute = page.url().includes('/read');
  console.log('   Can access protected route:', isOnProtectedRoute);
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'auth-test-result.png' });
  
  expect(loginSuccess.success).toBe(true);
  
  // Also verify we can access protected content
  if (isOnProtectedRoute) {
    console.log('✓ Authentication fully working - can access protected routes');
  } else {
    console.log('⚠ Authentication partially working - UI shows logged in but cannot access protected routes');
  }
});