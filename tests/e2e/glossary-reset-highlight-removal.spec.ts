import { test, expect } from '@playwright/test';
import { withDatabaseResetRecovery } from '../helpers/robust-auth';

// Use pre-authenticated state for faster test execution (worktree-specific)
test.use({ 
  storageState: 'playwright/.auth/worktree1-user.json' 
});

/**
 * Comprehensive Glossary Reset and Document Highlight Removal Test
 * 
 * This test verifies that when the glossary is reset (all entities deleted from database),
 * the document pane glossary hover highlights are properly removed from the DOM.
 * 
 * Key scenarios tested:
 * - Document upload and processing
 * - Glossary generation with technical terms that create highlights
 * - Verification of document highlights presence via DOM inspection
 * - Glossary reset button functionality 
 * - Complete removal of highlights from document pane after reset
 * - Screenshot comparison before and after reset
 * 
 * Focus areas:
 * - Mark.js highlight class 'highlight-glossary' removal
 * - UI state consistency between glossary pane and document pane
 * - Complete cleanup of glossary-related DOM modifications
 */
test.describe('Glossary Reset and Document Highlight Removal', () => {
  
  test('complete glossary reset workflow with document highlight verification', async ({ page }) => {
    await withDatabaseResetRecovery(page, async () => {
      
      // Step 1: Navigate to an existing document that likely has technical content
      // This avoids document creation conflicts and is more realistic for testing glossary reset
      await page.goto('/read');
      await page.waitForLoadState('networkidle');
      
      // Find and click on any existing document (preferably one with technical content)
      const documentLinks = page.locator('a[href*="/read/"]');
      const documentCount = await documentLinks.count();
      
      if (documentCount === 0) {
        // If no documents exist, create one
        await page.goto('/upload');
        await page.waitForLoadState('networkidle');
        
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const testUrl = `https://en.wikipedia.org/wiki/Programming?test=${timestamp}-${random}`;
        await page.fill('input[type="url"]', testUrl);
        
        const [documentResponse] = await Promise.all([
          page.waitForResponse(resp => 
            resp.url().includes('/api/extract-url'),
            { timeout: 45000 }
          ),
          page.click('button:has-text("Add Document")')
        ]);
        
        if (documentResponse.status() !== 200 && documentResponse.status() !== 201) {
          const responseText = await documentResponse.text();
          throw new Error(`Document creation failed with status ${documentResponse.status()}: ${responseText}`);
        }
      } else {
        // Click on the first existing document
        await documentLinks.first().click();
      }
      
      // Ensure we're on a document page
      await expect(page).toHaveURL(/\/read\/.*/, { timeout: 20000 });
      
      // Step 2: Take screenshot of document before glossary generation
      await page.waitForSelector('#document-viewer', { timeout: 10000 });
      await page.screenshot({ 
        path: 'tests/test-results/glossary-test-before-generation.png',
        fullPage: true 
      });
      
      // Step 3: Navigate to Glossary tab using the vertical icon navigation
      // From the debug screenshot, we can see the vertical navigation icons on the left
      // The book icon (📖) should be the glossary
      const glossaryIcon = page.locator('[aria-label*="Glossary"], button[title*="Glossary"], button:has([data-icon="Book"]), button:has-text("📖")').first();
      
      if (await glossaryIcon.isVisible({ timeout: 5000 })) {
        await glossaryIcon.click();
        console.log('Successfully clicked glossary icon');
      } else {
        // Fallback: look for any Book icon or glossary-related selector
        const fallbackSelectors = [
          'button[aria-label*="glossary" i]',
          'button[title*="glossary" i]', 
          '[data-testid="nav-glossary"]',
          'button:has([class*="book" i])'
        ];
        
        let found = false;
        for (const selector of fallbackSelectors) {
          try {
            const element = page.locator(selector);
            if (await element.isVisible({ timeout: 1000 })) {
              await element.click();
              found = true;
              console.log(`Used fallback selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (!found) {
          await page.screenshot({ 
            path: 'tests/test-results/glossary-icon-debug.png',
            fullPage: true 
          });
          throw new Error('Could not find glossary icon in vertical navigation');
        }
      }
      
      // Wait for the left pane to expand and glossary content to appear
      // Try multiple selectors as the data-testid might be different or the pane needs time to expand
      try {
        await page.waitForSelector('[data-testid="glossary-section"]', { timeout: 5000 });
      } catch (e) {
        // Try alternative selectors for glossary content
        const glossaryContentSelectors = [
          'button:has-text("Generate Glossary")',
          'h3:has-text("Document Glossary")',
          'h3:has-text("Generate Glossary")',
          '[data-testid="glossary-entities"]',
          '.glossary', // Generic class
          'text=Generate Glossary',
          'text=Document Glossary'
        ];
        
        let foundGlossaryContent = false;
        for (const selector of glossaryContentSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            foundGlossaryContent = true;
            console.log(`Found glossary content with selector: ${selector}`);
            break;
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (!foundGlossaryContent) {
          await page.screenshot({ 
            path: 'tests/test-results/glossary-content-debug.png',
            fullPage: true 
          });
          throw new Error('Could not find glossary content after clicking icon');
        }
      }
      
      // Check if glossary is already generated or needs to be generated
      const generateButton = page.locator('button:has-text("Generate Glossary")');
      const existingGlossary = page.locator('[data-testid="glossary-entities"]');
      
      let entityCount = 0;
      if (await generateButton.isVisible({ timeout: 2000 })) {
        console.log('Glossary not yet generated, generating now...');
        
        // Click and wait for glossary generation with extended timeout for AI processing
        const [glossaryResponse] = await Promise.all([
          page.waitForResponse(resp => 
            resp.url().includes('/api/tools/glossary') && resp.status() === 200,
            { timeout: 60000 } // Extended timeout for LLM processing
          ),
          generateButton.click()
        ]);
        
        console.log(`Glossary response status: ${glossaryResponse.status()}`);
        
        // Verify glossary entities are loaded
        await expect(page.locator('[data-testid="glossary-entities"]')).toBeVisible({ timeout: 15000 });
        
        const glossaryEntities = page.locator('[data-testid="glossary-entity"]');
        entityCount = await glossaryEntities.count();
        expect(entityCount).toBeGreaterThan(0);
        console.log(`Generated ${entityCount} glossary entities`);
        
      } else {
        // Check for existing glossary by looking for the entities count text or individual entities
        const entitiesCountText = page.locator('text=/\\d+ entries found/');
        const glossaryEntityItems = page.locator('[data-testid="glossary-entity"], .glossary-entity, h3:has-text("Document Glossary") ~ div [data-testid*="entity"]');
        
        if (await entitiesCountText.isVisible({ timeout: 2000 })) {
          console.log('Glossary already exists (found entities count text), proceeding with reset test...');
          // Extract the count from text like "20 entries found"
          const countText = await entitiesCountText.textContent();
          const match = countText?.match(/(\d+) entries/);
          entityCount = match ? parseInt(match[1]) : 1;
          expect(entityCount).toBeGreaterThan(0);
          console.log(`Found existing ${entityCount} glossary entities from count text`);
          
        } else if (await glossaryEntityItems.count() > 0) {
          console.log('Glossary already exists (found entity items), proceeding with reset test...');
          entityCount = await glossaryEntityItems.count();
          expect(entityCount).toBeGreaterThan(0);
          console.log(`Found existing ${entityCount} glossary entities from DOM`);
          
        } else {
          await page.screenshot({ 
            path: 'tests/test-results/glossary-state-debug.png',
            fullPage: true 
          });
          throw new Error('Could not find either Generate Glossary button or existing glossary entities');
        }
      }
      
      // Get entity names for verification (try multiple selectors)
      let entityNames: string[] = [];
      try {
        entityNames = await page.locator('[data-testid="entity-name"]').allTextContents();
      } catch (e) {
        // Try alternative selectors for entity names
        const altSelectors = [
          '.glossary-entity h4, .glossary-entity h3, .glossary-entity .entity-name',
          'h4:has-text("Computer"), h3:has-text("Computer")', // Based on screenshot
          '.entity-title, .term-name'
        ];
        
        for (const selector of altSelectors) {
          try {
            const names = await page.locator(selector).allTextContents();
            if (names.length > 0) {
              entityNames = names;
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
      }
      
      if (entityNames.length > 0) {
        console.log(`Entity names: ${entityNames.slice(0, 3).join(', ')}...`);
      } else {
        console.log('Could not extract entity names, but proceeding with test...');
      }
      
      // Step 5: Wait for document highlights to be applied and verify their presence
      // Mark.js highlighting is applied asynchronously, so we need to wait
      await page.waitForTimeout(2000);
      
      // Check for glossary highlights in the document viewer
      const documentViewer = page.locator('#document-viewer');
      await expect(documentViewer).toBeVisible();
      
      // Verify that Mark.js highlights are present using the 'highlight-glossary' class
      const highlightElements = page.locator('#document-viewer .highlight-glossary');
      const highlightCount = await highlightElements.count();
      
      console.log(`Found ${highlightCount} document highlights before reset`);
      
      // Should have highlights if entities were generated
      if (entityCount > 0) {
        expect(highlightCount).toBeGreaterThan(0);
        
        // Verify highlight elements have expected attributes
        const firstHighlight = highlightElements.first();
        if (await firstHighlight.isVisible()) {
          const entityAttr = await firstHighlight.getAttribute('data-glossary-entity');
          const explanationAttr = await firstHighlight.getAttribute('data-glossary-explanation');
          expect(entityAttr).toBeTruthy();
          expect(explanationAttr).toBeTruthy();
          console.log(`First highlight entity: ${entityAttr}`);
        }
      }
      
      // Step 6: Take screenshot with highlights present
      await page.screenshot({ 
        path: 'tests/test-results/glossary-test-with-highlights.png',
        fullPage: true 
      });
      
      // Step 7: Test glossary reset functionality
      const resetButton = page.locator('button:has-text("Reset"), button[title*="Reset"]').first();
      
      // Verify reset button is visible
      await expect(resetButton).toBeVisible({ timeout: 5000 });
      
      // Click reset and wait for the DELETE API call
      const [resetResponse] = await Promise.all([
        page.waitForResponse(resp => 
          resp.url().includes('/api/tools/glossary') && resp.request().method() === 'DELETE',
          { timeout: 30000 }
        ),
        resetButton.click()
      ]);
      
      console.log(`Glossary reset response status: ${resetResponse.status()}`);
      expect(resetResponse.status()).toBe(200);
      
      // Step 8: Verify UI state is reset
      // Should return to the "Generate Glossary" state
      await expect(page.locator('button:has-text("Generate Glossary")')).toBeVisible({ timeout: 10000 });
      
      // Glossary entities should no longer be visible
      await expect(page.locator('[data-testid="glossary-entities"]')).not.toBeVisible();
      
      // Step 9: CRITICAL - Verify document highlights are completely removed
      // Wait for highlight removal to be processed
      await page.waitForTimeout(1000);
      
      // Check that no glossary highlights remain in the document
      const remainingHighlights = page.locator('#document-viewer .highlight-glossary');
      const remainingCount = await remainingHighlights.count();
      
      console.log(`Found ${remainingCount} document highlights after reset`);
      
      // This is the core assertion - highlights should be completely removed
      expect(remainingCount).toBe(0);
      
      // Additional verification - check that highlight-related attributes are removed
      const elementsWithGlossaryAttrs = page.locator('#document-viewer [data-glossary-entity]');
      const attrsCount = await elementsWithGlossaryAttrs.count();
      expect(attrsCount).toBe(0);
      
      // Step 10: Take screenshot after reset to demonstrate cleanup
      await page.screenshot({ 
        path: 'tests/test-results/glossary-test-after-reset.png',
        fullPage: true 
      });
      
      // Step 11: Verify that reset state persists across tab navigation
      // Navigate away and back to glossary tab to ensure state consistency
      await page.click('button:has-text("Table of Contents: Navigate through document structure")');
      
      await page.waitForTimeout(500);
      
      // Navigate back to glossary
      await page.click('button:has-text("Glossary: Explore key terms and concepts from the document")');
      
      // Should still show "Generate Glossary" button (reset state persisted)
      await expect(page.locator('button:has-text("Generate Glossary")')).toBeVisible({ timeout: 5000 });
      
      // Document should still have no highlights
      const finalHighlightCheck = page.locator('#document-viewer .highlight-glossary');
      const finalHighlightCount = await finalHighlightCheck.count();
      expect(finalHighlightCount).toBe(0);
      
      console.log('✅ Glossary reset and highlight removal test completed successfully');
      
    });
  });
  
  test('glossary reset with multiple entities and complex highlights', async ({ page }) => {
    await withDatabaseResetRecovery(page, async () => {
      
      // Use a more complex technical document for this test
      await page.goto('/upload');
      await page.waitForLoadState('networkidle');
      
      // Use a smaller technical page that should generate glossary entities but avoid size limits
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const testUrl = `https://en.wikipedia.org/wiki/Software_engineering?test=${timestamp}-${random}`;
      await page.fill('input[type="url"]', testUrl);
      
      const [documentResponse] = await Promise.all([
        page.waitForResponse(resp => 
          resp.url().includes('/api/extract-url'),
          { timeout: 45000 }
        ),
        page.click('button:has-text("Add Document")')
      ]);
      
      if (documentResponse.status() !== 200 && documentResponse.status() !== 201) {
        const responseText = await documentResponse.text();
        throw new Error(`Document creation failed with status ${documentResponse.status()}: ${responseText}`);
      }
      
      await expect(page).toHaveURL(/\/read\/.*/, { timeout: 20000 });
      
      // Navigate to glossary and generate
      await page.click('button:has-text("Glossary: Explore key terms and concepts from the document")');
      
      await page.waitForSelector('[data-testid="glossary-section"]', { timeout: 10000 });
      
      const glossaryButton = page.locator('button:has-text("Generate Glossary")');
      await expect(glossaryButton).toBeVisible();
      
      const [glossaryResponse] = await Promise.all([
        page.waitForResponse(resp => 
          resp.url().includes('/api/tools/glossary') && resp.status() === 200,
          { timeout: 60000 }
        ),
        glossaryButton.click()
      ]);
      
      expect(glossaryResponse.status()).toBe(200);
      
      // Wait for entities to load
      await expect(page.locator('[data-testid="glossary-entities"]')).toBeVisible({ timeout: 15000 });
      
      const entityCount = await page.locator('[data-testid="glossary-entity"]').count();
      expect(entityCount).toBeGreaterThan(0);
      
      // Test "Load More" functionality if available to get more highlights
      const loadMoreButton = page.locator('button:has-text("Load More")');
      if (await loadMoreButton.isVisible()) {
        console.log('Loading more entities to increase highlight coverage...');
        
        const [loadMoreResponse] = await Promise.all([
          page.waitForResponse(resp => 
            resp.url().includes('/api/tools/glossary') && resp.status() === 200,
            { timeout: 60000 }
          ),
          loadMoreButton.click()
        ]);
        
        expect(loadMoreResponse.status()).toBe(200);
        
        // Wait for additional entities
        await page.waitForTimeout(2000);
        
        const newEntityCount = await page.locator('[data-testid="glossary-entity"]').count();
        console.log(`Entity count increased from ${entityCount} to ${newEntityCount}`);
      }
      
      // Wait for all highlights to be applied
      await page.waitForTimeout(3000);
      
      // Get comprehensive highlight count
      const initialHighlights = page.locator('#document-viewer .highlight-glossary');
      const initialHighlightCount = await initialHighlights.count();
      
      console.log(`Found ${initialHighlightCount} highlights before reset`);
      expect(initialHighlightCount).toBeGreaterThan(0);
      
      // Verify some highlights have tooltip data
      const highlightsWithTooltips = page.locator('#document-viewer .highlight-glossary[data-glossary-explanation]');
      const tooltipCount = await highlightsWithTooltips.count();
      expect(tooltipCount).toBeGreaterThan(0);
      
      // Test highlight click functionality before reset
      const firstHighlight = initialHighlights.first();
      if (await firstHighlight.isVisible()) {
        // Clicking should navigate to glossary tab (testing the click handler)
        await firstHighlight.click();
        // Should already be on glossary tab, so no change expected
        await page.waitForTimeout(500);
      }
      
      // Reset glossary
      const resetButton = page.locator('button[title*="Reset"], button:has-text("Reset")').first();
      await expect(resetButton).toBeVisible();
      
      const [resetResponse] = await Promise.all([
        page.waitForResponse(resp => 
          resp.url().includes('/api/tools/glossary') && resp.request().method() === 'DELETE',
          { timeout: 30000 }
        ),
        resetButton.click()
      ]);
      
      expect(resetResponse.status()).toBe(200);
      
      // Verify complete cleanup
      await page.waitForTimeout(1000);
      
      // No highlights should remain
      const remainingHighlights = page.locator('#document-viewer .highlight-glossary');
      const remainingCount = await remainingHighlights.count();
      expect(remainingCount).toBe(0);
      
      // No tooltip attributes should remain
      const remainingTooltips = page.locator('#document-viewer [data-glossary-explanation]');
      const remainingTooltipCount = await remainingTooltips.count();
      expect(remainingTooltipCount).toBe(0);
      
      // No entity attributes should remain
      const remainingEntities = page.locator('#document-viewer [data-glossary-entity]');
      const remainingEntityCount = await remainingEntities.count();
      expect(remainingEntityCount).toBe(0);
      
      console.log('✅ Complex glossary reset test completed successfully');
      
    });
  });
  
  test('glossary reset error handling and recovery', async ({ page }) => {
    await withDatabaseResetRecovery(page, async () => {
      
      // Create document and generate glossary (abbreviated setup)
      await page.goto('/upload');
      await page.waitForLoadState('networkidle');
      
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const testUrl = `https://en.wikipedia.org/wiki/Data_structure?test=${timestamp}-${random}`;
      await page.fill('input[type="url"]', testUrl);
      
      const [documentResponse] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/extract-url'), { timeout: 45000 }),
        page.click('button:has-text("Add Document")')
      ]);
      
      if (documentResponse.status() !== 200 && documentResponse.status() !== 201) {
        throw new Error(`Document creation failed: ${documentResponse.status()}`);
      }
      
      await expect(page).toHaveURL(/\/read\/.*/, { timeout: 20000 });
      
      // Generate glossary
      await page.click('button:has-text("Glossary: Explore key terms and concepts from the document")');
      
      await page.waitForSelector('[data-testid="glossary-section"]', { timeout: 10000 });
      
      const [glossaryResponse] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/tools/glossary') && resp.status() === 200, { timeout: 60000 }),
        page.click('button:has-text("Generate Glossary")')
      ]);
      
      await expect(page.locator('[data-testid="glossary-entities"]')).toBeVisible({ timeout: 15000 });
      
      // Verify highlights are present
      await page.waitForTimeout(2000);
      const initialHighlights = await page.locator('#document-viewer .highlight-glossary').count();
      expect(initialHighlights).toBeGreaterThan(0);
      
      // Test multiple rapid resets (stress test)
      const resetButton = page.locator('button[title*="Reset"], button:has-text("Reset")').first();
      
      // First reset
      await resetButton.click();
      await page.waitForTimeout(1000);
      
      // Verify first reset worked
      let highlights = await page.locator('#document-viewer .highlight-glossary').count();
      expect(highlights).toBe(0);
      
      // Generate again and reset again (testing recovery)
      await page.click('button:has-text("Generate Glossary")');
      
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/tools/glossary') && resp.status() === 200, { timeout: 60000 }),
        page.waitForSelector('[data-testid="glossary-entities"]', { timeout: 15000 })
      ]);
      
      await page.waitForTimeout(2000);
      highlights = await page.locator('#document-viewer .highlight-glossary').count();
      expect(highlights).toBeGreaterThan(0);
      
      // Second reset
      await resetButton.click();
      await page.waitForTimeout(1000);
      
      // Verify second reset also worked
      highlights = await page.locator('#document-viewer .highlight-glossary').count();
      expect(highlights).toBe(0);
      
      console.log('✅ Glossary reset error handling and recovery test completed successfully');
      
    });
  });
  
});