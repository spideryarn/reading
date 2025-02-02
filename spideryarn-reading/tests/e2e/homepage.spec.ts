import { test, expect } from '@playwright/test';

test('homepage loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // Visit the homepage
  await page.goto('http://localhost:5173/');
  
  // Wait for the content to be mounted
  await page.waitForSelector('h1:has-text("Vite + Svelte")');
  
  // Check for any errors
  expect(errors).toEqual([]);
  
  // Verify the counter button is present and working
  const button = await page.getByRole('button', { name: /count is \d+/ });
  await expect(button).toBeVisible();
  
  // Test counter functionality
  const initialText = await button.textContent() || '';
  await button.click();
  await expect(button).not.toHaveText(initialText);
}); 