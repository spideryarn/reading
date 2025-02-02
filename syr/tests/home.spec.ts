import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  // Navigate to the homepage
  const response = await page.goto('/');
  
  // Check if the page loaded successfully
  expect(response?.status()).toBe(200);
  
  // Verify we're on the homepage by checking for typical Svelte welcome content
  await expect(page.getByRole('heading')).toBeVisible();
}); 