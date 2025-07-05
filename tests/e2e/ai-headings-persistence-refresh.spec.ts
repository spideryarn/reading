import { test, expect } from '@playwright/test';
import { RobustAuthManager } from '../helpers/robust-auth';

/**
 * AI Headings Persistence After Page Refresh E2E Test
 * 
 * This test verifies that AI-generated headings:
 * 1. Are successfully generated and displayed
 * 2. Persist to the database
 * 3. Are restored when the page is refreshed
 * 4. Maintain the correct UI state (AI-enhanced) after refresh
 * 
 * This addresses the issue where headings are saved but not loaded on refresh.
 */

test.describe('AI Headings Persistence After Refresh', () => {
  let authManager: RobustAuthManager;

  test.beforeAll(async ({ browser }) => {
    authManager = new RobustAuthManager(browser);
    await authManager.setupAuth();
  });

  test.afterAll(async () => {
    await authManager?.cleanup();
  });

  // Helper function to find an existing document or create one
  async function getTestDocument(page: any): Promise<string> {
    // First, try to find existing documents
    await page.goto('/read');
    await page.waitForLoadState('networkidle');
    
    // Look for existing documents
    const documentLinks = page.locator('a[href*="/read/"]');
    const documentCount = await documentLinks.count();
    
    if (documentCount > 0) {
      // Use the first available document
      const firstDocumentLink = documentLinks.first();
      const href = await firstDocumentLink.getAttribute('href');
      const documentId = href?.match(/\/read\/(.+)/)?.[1];
      
      if (documentId) {
        console.log(`✅ Using existing document: ${documentId}`);
        await firstDocumentLink.click();
        
        // Wait for document to load
        await expect(page.locator('h1, h2, p, article, main').first()).toBeVisible({
          timeout: 15000
        });
        
        return documentId;
      }
    }
    
    // If no existing documents, create a simple one using HTML upload
    await page.goto('/upload');
    await expect(page.locator('h2:has-text("Add Document")')).toBeVisible();
    
    // Switch to HTML upload method
    const htmlTab = page.locator('text=HTML').or(page.locator('[data-tab="html"]'));
    if (await htmlTab.isVisible({ timeout: 3000 })) {
      await htmlTab.click();
    }
    
    // Create HTML content suitable for heading generation
    const timestamp = Date.now();
    const testHtml = `
      <html>
        <head><title>Persistence Test Document ${timestamp}</title></head>
        <body>
          <h1>AI Headings Persistence Test Document</h1>
          <p>This document tests whether AI-generated headings persist across page refreshes. It contains multiple paragraphs of content that should allow the AI to generate meaningful section headings.</p>
          
          <p>The first section discusses the importance of persistence in web applications. When users invest time in enhancing their documents with AI-generated headings, those enhancements should remain available when they return to the document later.</p>
          
          <p>Another important aspect is the user experience. Users expect their work to be saved automatically, and any AI enhancements should behave like other persistent document modifications.</p>
          
          <p>Technical implementation details matter too. The system needs to properly save the enhanced content to the database and correctly restore it when the document is loaded again.</p>
          
          <p>Finally, the UI state should accurately reflect whether a document has AI enhancements. This helps users understand the current state of their document at a glance.</p>
        </body>
      </html>
    `;
    
    const htmlTextarea = page.locator('textarea[name="htmlContent"], textarea[placeholder*="HTML"]');
    await htmlTextarea.fill(testHtml);
    
    const submitButton = page.locator('button:has-text("Add Document")');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    // Wait for redirect to document view
    await expect(page).toHaveURL(/\/read\/.*/, { timeout: 15000 });
    
    // Extract document ID from URL
    const documentUrl = page.url();
    const documentId = documentUrl.match(/\/read\/(.+)/)?.[1];
    expect(documentId).toBeDefined();
    
    console.log(`✅ Created new test document: ${documentId}`);
    return documentId!;
  }

  test('AI-generated headings persist after page refresh', async ({ page, context }) => {
    // Use authenticated context
    await authManager.setupPageAuth(page, context);
    
    console.log('🔄 Starting AI headings persistence test');
    
    // Step 1: Get or create a test document
    const documentId = await getTestDocument(page);
    const documentUrl = page.url();
    console.log(`📄 Testing with document: ${documentId}`);
    
    // Step 2: Count initial headings before AI generation
    const initialHeadingCount = await page.locator('h1, h2, h3, h4, h5, h6').count();
    console.log(`📊 Initial heading count: ${initialHeadingCount}`);
    
    // Step 3: Navigate to Structure tab and generate AI headings
    console.log('🔄 Navigating to Structure tab');
    
    // Wait for document interface to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.left-pane, .document-layout, nav, aside, [data-tool]').first()).toBeVisible({
      timeout: 15000
    });
    
    // Click Structure tab
    const structureTab = page.locator('text=Structure').first();
    await expect(structureTab).toBeVisible({ timeout: 5000 });
    await structureTab.click();
    console.log('✅ Structure tab opened');
    
    // Verify initial state (should show "Original" or generate button)
    const originalStateIndicator = page.locator('text=Original').or(page.locator('button:has-text("Generate")')).first();
    await expect(originalStateIndicator).toBeVisible({ timeout: 5000 });
    console.log('✅ Confirmed document is in original state');
    
    // Step 4: Generate AI headings
    const generateButton = page.locator('button:has-text("Generate AI headings"), button:has-text("Generate")').first();
    await expect(generateButton).toBeVisible();
    console.log('🔄 Generating AI headings...');
    
    await generateButton.click();
    
    // Wait for generation to complete
    await expect(page.locator('text=Generating')).toBeHidden({ timeout: 120000 });
    
    // Verify AI-enhanced state (should show "AI-enhanced" or remove button)
    const enhancedStateIndicator = page.locator('text=AI-enhanced').or(page.locator('button[aria-label*="trash"]')).first();
    await expect(enhancedStateIndicator).toBeVisible({ timeout: 10000 });
    console.log('✅ AI headings generated successfully');
    
    // Step 5: Count headings after AI generation
    const enhancedHeadingCount = await page.locator('h1, h2, h3, h4, h5, h6').count();
    console.log(`📊 Enhanced heading count: ${enhancedHeadingCount}`);
    expect(enhancedHeadingCount).toBeGreaterThan(initialHeadingCount);
    
    // Step 6: Capture some heading text to verify later
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    const aiGeneratedHeadings = headings.slice(initialHeadingCount); // Get only the new headings
    console.log(`📝 AI-generated headings: ${aiGeneratedHeadings.length} new headings`);
    aiGeneratedHeadings.forEach((heading, index) => {
      console.log(`  ${index + 1}. "${heading}"`);
    });
    
    // Step 7: Reload the page
    console.log('🔄 Reloading page to test persistence...');
    await page.reload();
    
    // Wait for page to fully load after refresh
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, p, article, main').first()).toBeVisible({
      timeout: 15000
    });
    console.log('✅ Page reloaded');
    
    // Step 8: Verify we're still on the same document
    await expect(page).toHaveURL(documentUrl);
    console.log('✅ Still on same document after refresh');
    
    // Step 9: Count headings after refresh
    const refreshedHeadingCount = await page.locator('h1, h2, h3, h4, h5, h6').count();
    console.log(`📊 Heading count after refresh: ${refreshedHeadingCount}`);
    
    // Step 10: Verify heading count matches enhanced state
    expect(refreshedHeadingCount).toBe(enhancedHeadingCount);
    console.log('✅ Heading count matches - headings persisted!');
    
    // Step 11: Verify actual heading content persisted
    const refreshedHeadings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    const refreshedAIHeadings = refreshedHeadings.slice(initialHeadingCount);
    
    // Check that we have the same AI-generated headings
    expect(refreshedAIHeadings.length).toBe(aiGeneratedHeadings.length);
    for (let i = 0; i < aiGeneratedHeadings.length; i++) {
      expect(refreshedAIHeadings[i]).toBe(aiGeneratedHeadings[i]);
    }
    console.log('✅ All AI-generated heading content preserved after refresh');
    
    // Step 12: Navigate to Structure tab to verify UI state
    console.log('🔄 Checking Structure tab UI state after refresh');
    
    const structureTabAfterRefresh = page.locator('text=Structure').first();
    await structureTabAfterRefresh.click();
    
    // Verify it shows AI-enhanced state (not Original)
    const enhancedStateAfterRefresh = page.locator('text=AI-enhanced').or(page.locator('button[aria-label*="trash"]')).first();
    await expect(enhancedStateAfterRefresh).toBeVisible({ timeout: 10000 });
    console.log('✅ Structure tab correctly shows AI-enhanced state after refresh');
    
    // Verify we don't see the generate button (which would indicate original state)
    const generateButtonAfterRefresh = page.locator('button:has-text("Generate AI headings"), button:has-text("Generate")');
    await expect(generateButtonAfterRefresh).not.toBeVisible();
    console.log('✅ Generate button correctly hidden in AI-enhanced state');
    
    console.log('');
    console.log('🎉 AI HEADINGS PERSISTENCE TEST COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`- Initial headings: ${initialHeadingCount}`);
    console.log(`- After AI generation: ${enhancedHeadingCount}`);
    console.log(`- After page refresh: ${refreshedHeadingCount}`);
    console.log(`- AI headings added: ${aiGeneratedHeadings.length}`);
    console.log('- ✅ All headings persisted across refresh');
    console.log('- ✅ UI state correctly shows AI-enhanced');
  });

  test('AI headings removal persists after refresh', async ({ page, context }) => {
    // Use authenticated context
    await authManager.setupPageAuth(page, context);
    
    console.log('🔄 Testing AI headings removal persistence');
    
    // Step 1: Get document with AI headings
    const documentId = await getTestDocument(page);
    
    // Navigate to Structure and generate AI headings
    const structureTab = page.locator('text=Structure').first();
    await structureTab.click();
    
    const generateButton = page.locator('button:has-text("Generate AI headings"), button:has-text("Generate")').first();
    
    // Only generate if not already enhanced
    if (await generateButton.isVisible({ timeout: 3000 })) {
      await generateButton.click();
      await expect(page.locator('text=Generating')).toBeHidden({ timeout: 120000 });
    }
    
    // Verify AI-enhanced state
    await expect(page.locator('text=AI-enhanced').or(page.locator('button[aria-label*="trash"]')).first()).toBeVisible();
    
    const enhancedHeadingCount = await page.locator('h1, h2, h3, h4, h5, h6').count();
    console.log(`📊 Enhanced heading count: ${enhancedHeadingCount}`);
    
    // Step 2: Remove AI headings
    console.log('🔄 Removing AI headings...');
    const removeButton = page.locator('button[aria-label*="trash"], button:has-text("Remove")').first();
    await removeButton.click();
    
    // Wait for removal to complete
    await expect(page.locator('text=Original').or(page.locator('button:has-text("Generate")')).first()).toBeVisible({ 
      timeout: 10000 
    });
    console.log('✅ AI headings removed');
    
    const originalHeadingCount = await page.locator('h1, h2, h3, h4, h5, h6').count();
    console.log(`📊 Heading count after removal: ${originalHeadingCount}`);
    expect(originalHeadingCount).toBeLessThan(enhancedHeadingCount);
    
    // Step 3: Reload page
    console.log('🔄 Reloading page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Step 4: Verify removal persisted
    const refreshedHeadingCount = await page.locator('h1, h2, h3, h4, h5, h6').count();
    console.log(`📊 Heading count after refresh: ${refreshedHeadingCount}`);
    expect(refreshedHeadingCount).toBe(originalHeadingCount);
    
    // Step 5: Check Structure tab shows original state
    await page.locator('text=Structure').first().click();
    await expect(page.locator('text=Original').or(page.locator('button:has-text("Generate")')).first()).toBeVisible();
    console.log('✅ Structure tab correctly shows Original state after refresh');
    
    console.log('');
    console.log('🎉 AI headings removal persistence test completed!');
  });
});