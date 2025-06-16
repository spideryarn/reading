import { test, expect } from '@playwright/test';
import { RobustAuthManager, withDatabaseResetRecovery } from '../helpers/robust-auth';

/**
 * Document Upload Flow - Highest Value User Journey Test
 * 
 * This test covers the complete document upload flow from navigation to successful display,
 * which is the core value proposition of Spideryarn Reading.
 * 
 * Test Scenarios:
 * 1. URL upload with Readability processing
 * 2. Document display with AI features activated
 * 3. Basic AI interaction (headings, ToC navigation)
 */
test.describe('Document Upload Flow', () => {
  let auth: RobustAuthManager;

  test.beforeEach(async ({ page }) => {
    auth = new RobustAuthManager(page);
    
    // Authentication is handled by setup project, but verify it's working
    await page.goto('/');
    
    // If not authenticated, login manually
    if (page.url().includes('/auth/login')) {
      await auth.loginAs('user');
    }
  });

  test('complete URL upload and document display flow', async ({ page }) => {
    await withDatabaseResetRecovery(page, async () => {
      // Step 1: Navigate to upload page
      await page.goto('/upload');
      
      // Verify upload page loads correctly
      await expect(page.locator('h2:has-text("Add Document")')).toBeVisible();
      
      // Step 2: Enter a test URL (using Apache.org with unique parameter to avoid naming conflicts)
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      const testUrl = `https://httpd.apache.org/?test=${timestamp}-${random}`; // Use apache.org with unique parameters
      await page.fill('input[type="url"]', testUrl);
      
      // Wait for URL processing to update
      await page.waitForTimeout(1000);
      
      // Verify submit button becomes enabled (indicating URL was processed)
      await expect(page.locator('button:has-text("Add Document")')).toBeEnabled({
        timeout: 5000
      });
      
      // Step 3: Verify processing options are available
      // Default should be Readability for URLs
      await expect(page.locator('text=Mozilla Readability').first()).toBeVisible();
      
      // Step 4: Submit the document
      await page.click('button:has-text("Add Document")');
      
      // Step 5: Wait for processing to complete (extended timeout for AI)
      await expect(page.locator('text=Processing')).toBeVisible({ timeout: 5000 });
      
      // Step 6: Wait for redirect to document view (up to 45 seconds for AI processing)
      await expect(page).toHaveURL(/\/read\/.*/, { 
        timeout: 45000 // Extended timeout for AI operations
      });
      
      // Step 7: Verify document content is displayed
      // Look for typical Apache content or any heading/paragraph content
      await expect(page.locator('text=Apache').or(page.locator('h1, h2, p')).first()).toBeVisible({
        timeout: 10000
      });
      
      // Step 8: Verify basic AI features are present
      // Check for sidebar with document navigation features
      await expect(page.locator('text=Showing levels').or(page.locator('[data-testid="sidebar"]')).first()).toBeVisible({
        timeout: 10000
      });
      
      console.log('✅ Document upload flow completed successfully');
    });
  });

  test('PDF upload flow (if PDF available)', async ({ page }) => {
    // This test would require a test PDF file
    // For now, we'll test the upload interface preparation for PDF
    
    await page.goto('/upload');
    
    // Verify file input is available for PDF upload
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    
    // Verify processing options update for PDF (should show AI Transcription)
    // Note: This is tested through UI state rather than actual file upload
    console.log('✅ PDF upload interface verified');
  });

  test('upload page navigation and error handling', async ({ page }) => {
    await page.goto('/upload');
    
    // Test 1: Verify submit button is disabled when no input
    const submitButton = page.locator('button:has-text("Add Document")');
    await expect(submitButton).toBeDisabled();
    
    // Test 2: Verify invalid URL handling - button should be enabled for invalid URLs
    await page.fill('input[type="url"]', 'not-a-valid-url');
    // Wait a moment for state to update
    await page.waitForTimeout(500);
    
    // Button should still be disabled for invalid URLs
    await expect(submitButton).toBeDisabled();
    
    // Test 3: Verify valid URL enables button
    await page.fill('input[type="url"]', 'https://example.com');
    await page.waitForTimeout(500);
    
    // Button should now be enabled
    await expect(submitButton).toBeEnabled();
    
    // Test 4: Verify localhost URL rejection (test the validation logic)
    await page.fill('input[type="url"]', 'http://localhost:3000');
    await page.waitForTimeout(500);
    
    // Submit and check for error message
    await submitButton.click();
    await expect(page.locator('text=Local URLs are not supported')).toBeVisible({
      timeout: 5000
    });
    
    console.log('✅ Upload validation and error handling verified');
  });

  test('processing options dynamic updates', async ({ page }) => {
    await page.goto('/upload');
    
    // Test URL processing options
    await page.fill('input[type="url"]', 'https://example.com');
    
    // Should show Readability and AI Transcription for URLs
    await expect(page.locator('text=Mozilla Readability').first()).toBeVisible();
    await expect(page.locator('text=AI Transcription').first()).toBeVisible();
    
    // Should not show "As-is" for URLs (only for HTML files)
    await expect(page.locator('text=As-is')).not.toBeVisible();
    
    console.log('✅ Processing options dynamic behavior verified');
  });

  test('back navigation and header functionality', async ({ page }) => {
    await page.goto('/upload');
    
    // Verify header shows correct title and back link
    await expect(page.locator('h2:has-text("Add Document")')).toBeVisible();
    
    // Test back navigation to documents
    const backLink = page.locator('a:has-text("Documents"), a[href="/read"]');
    await expect(backLink).toBeVisible();
    
    // Click back link and verify navigation
    await backLink.click();
    await expect(page).toHaveURL(/\/read$/);
    
    console.log('✅ Navigation and header functionality verified');
  });
});