import { test, expect } from '@playwright/test';
import { getCurrentEnvironmentTestUser } from '../../lib/testing/worktree-auth-helpers';

const { email, password } = getCurrentEnvironmentTestUser();

test('debug auth cookies', async ({ page, context }) => {
  // Login
  await page.goto('/auth/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.locator('button[type="submit"]').click();
  
  // Wait for auth to complete
  await page.waitForURL(/^(?!.*\/auth\/login).*$/, { timeout: 15000 });
  await page.waitForSelector('[class*="orange"]', { timeout: 15000 });
  
  // Get all cookies
  const cookies = await context.cookies();
  console.log('Cookies after login:', JSON.stringify(cookies, null, 2));
  
  // Get storage state
  const storageState = await context.storageState();
  console.log('Storage state:', JSON.stringify(storageState, null, 2));
  
  // Try to make an API call directly from the page context
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/extract-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        url: 'https://example.com/test',
        extractionMethod: 'readability',
        isPublic: false
      })
    });
    return {
      status: res.status,
      statusText: res.statusText,
      text: await res.text()
    };
  });
  
  console.log('API response:', response);
  
  // Also try from Node.js context with cookies
  const apiResponse = await page.request.post('/api/extract-url', {
    data: {
      url: 'https://example.com/test2',
      extractionMethod: 'readability',
      isPublic: false
    }
  });
  
  console.log('API response from page.request:', {
    status: apiResponse.status(),
    statusText: apiResponse.statusText(),
    text: await apiResponse.text()
  });
});