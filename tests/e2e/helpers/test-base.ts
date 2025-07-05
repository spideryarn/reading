import { test as authTest, expect, setupWorkerAuthentication, createWorkerTestNamespace, verifyAuthentication } from './auth-setup'
import { getCurrentEnvironmentPaths } from '../../../lib/testing/worktree-auth-helpers'
import type { Page } from '@playwright/test'

/**
 * Base test configuration for E2E tests
 * 
 * This module provides a pre-configured test object that includes:
 * - Automatic authentication state injection
 * - Per-worker namespace generation
 * - Common test helpers
 * 
 * Usage:
 * ```typescript
 * import { test, expect } from '../helpers/test-base'
 * 
 * test('my test', async ({ page }) => {
 *   // Already authenticated!
 *   await page.goto('/protected-route')
 *   // ... test logic
 * })
 * ```
 */

// Export the extended test with auth support
export const test = authTest

// Re-export expect for convenience
export { expect }

/**
 * Common test helpers that can be used across all E2E tests
 */
export const testHelpers = {
  /**
   * Wait for page to be fully loaded and stable
   * 
   * This is more reliable than just waitForLoadState as it ensures
   * both DOM content and network activity have settled.
   */
  async waitForPageStability(page: Page) {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')
  },

  /**
   * Wait for AI operation to complete
   * 
   * Many operations in the app involve AI processing which can take
   * 30-60 seconds. This helper waits for common AI operation patterns.
   */
  async waitForAIOperation(page: Page, options: { timeout?: number } = {}) {
    const timeout = options.timeout || 60000 // Default 60s for AI operations
    
    // Common patterns that indicate AI processing
    const processingIndicators = [
      'text=Processing',
      'text=Generating',
      'text=Analyzing',
      'text=Loading',
      '[aria-busy="true"]',
      '.animate-pulse',
      '.animate-spin'
    ]
    
    // Wait for any processing indicator to appear
    let foundIndicator = false
    for (const indicator of processingIndicators) {
      const element = page.locator(indicator).first()
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        foundIndicator = true
        // Wait for it to disappear
        await element.waitFor({ state: 'hidden', timeout })
        break
      }
    }
    
    // If no indicator found, just wait a bit for stability
    if (!foundIndicator) {
      await page.waitForTimeout(2000)
    }
    
    // Ensure page is stable after operation
    await testHelpers.waitForPageStability(page)
  },

  /**
   * Create a test document with predictable content
   * 
   * This helper creates a document that's suitable for testing various
   * AI features like heading generation, summaries, etc.
   */
  async createTestDocument(page: Page, options: { 
    title?: string,
    namespace?: string,
    workerIndex?: number 
  } = {}) {
    const namespace = options.namespace || createWorkerTestNamespace('doc', options.workerIndex || 0)
    const title = options.title || `Test Document ${namespace}`
    
    // Navigate to upload page
    await page.goto('/upload')
    await expect(page.locator('h2:has-text("Add Document")')).toBeVisible()
    
    // Switch to HTML upload
    const htmlTab = page.locator('text=HTML').or(page.locator('[data-tab="html"]'))
    if (await htmlTab.isVisible({ timeout: 3000 })) {
      await htmlTab.click()
    }
    
    // Create test HTML content
    const testHtml = `
      <html>
        <head><title>${title}</title></head>
        <body>
          <h1>${title}</h1>
          <p>This is a test document created for E2E testing with namespace: ${namespace}</p>
          
          <p>The document contains multiple sections to test AI features. Each section has enough content to allow meaningful AI analysis and enhancement.</p>
          
          <h2>Introduction</h2>
          <p>This section introduces the main concepts. It provides context and background information that helps readers understand the document's purpose.</p>
          
          <h2>Main Content</h2>
          <p>The main content discusses key points in detail. It explores various aspects of the topic and provides examples to illustrate important concepts.</p>
          
          <h2>Advanced Topics</h2>
          <p>Advanced topics delve deeper into complex areas. These sections require more careful reading and may reference earlier material.</p>
          
          <h2>Conclusion</h2>
          <p>The conclusion summarizes the key points and provides recommendations for further reading or action items based on the content presented.</p>
        </body>
      </html>
    `
    
    // Fill and submit
    const htmlTextarea = page.locator('textarea[name="htmlContent"], textarea[placeholder*="HTML"]')
    await htmlTextarea.fill(testHtml)
    
    const submitButton = page.locator('button:has-text("Add Document")')
    await expect(submitButton).toBeEnabled()
    await submitButton.click()
    
    // Wait for redirect to document view
    await expect(page).toHaveURL(/\/read\/.*/, { timeout: 15000 })
    
    // Extract document ID
    const documentUrl = page.url()
    const documentId = documentUrl.match(/\/read\/(.+)/)?.[1]
    
    if (!documentId) {
      throw new Error('Failed to extract document ID from URL')
    }
    
    return {
      documentId,
      namespace,
      title,
      url: documentUrl
    }
  },

  /**
   * Navigate to a specific tab in the left pane
   * 
   * The app uses a tabbed interface in the left pane for different tools.
   */
  async navigateToTab(page: Page, tabName: string) {
    const tab = page.locator(`text=${tabName}`).first()
    await tab.click()
    
    // Wait for tab content to load
    await page.waitForTimeout(500) // Brief wait for animation
    await testHelpers.waitForPageStability(page)
  },

  /**
   * Check if a document has AI enhancements
   * 
   * Returns true if the document shows indicators of AI enhancement.
   */
  async hasAIEnhancements(page: Page): Promise<boolean> {
    const indicators = [
      'span:text("AI-enhanced")',
      'text=AI-generated',
      '[data-ai-enhanced="true"]'
    ]
    
    for (const indicator of indicators) {
      if (await page.locator(indicator).first().isVisible({ timeout: 3000 }).catch(() => false)) {
        return true
      }
    }
    
    return false
  },

  /**
   * Get all headings from the current document
   * 
   * Useful for comparing heading counts before/after AI enhancement.
   */
  async getDocumentHeadings(page: Page): Promise<string[]> {
    await testHelpers.waitForPageStability(page)
    return await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
  },

  /**
   * Verify the page shows authenticated state
   * 
   * Checks for common indicators that the user is logged in.
   */
  async verifyAuthenticatedState(page: Page) {
    // Should not see login/signup prompts
    await expect(page.locator('text=Sign in')).not.toBeVisible()
    await expect(page.locator('text=Log in')).not.toBeVisible()
    await expect(page.locator('text=Sign up')).not.toBeVisible()
    
    // Should be able to access protected routes
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/auth/')
  }
}

/**
 * Common test patterns as async functions
 */
export const commonPatterns = {
  /**
   * Setup pattern for tests that need authentication
   * 
   * Usage in test file:
   * ```typescript
   * test.beforeAll(async ({ browser }) => {
   *   await commonPatterns.setupAuthentication(browser)
   * })
   * ```
   */
  async setupAuthentication(browser: any, storageStateFile?: string) {
    const file = storageStateFile || getCurrentEnvironmentPaths().authFile
    await setupWorkerAuthentication(browser, file)
  },

  /**
   * Pattern for tests that need a fresh document
   * 
   * Returns a function that creates a document with proper namespace.
   */
  createDocumentForWorker(workerIndex: number) {
    return async (page: Page, title?: string) => {
      return await testHelpers.createTestDocument(page, {
        title,
        workerIndex
      })
    }
  }
}

/**
 * Export a function to configure test.use() with auth state
 * 
 * This allows test files to easily opt into authentication:
 * ```typescript
 * import { test, expect, useAuthentication } from '../helpers/test-base'
 * 
 * useAuthentication()
 * 
 * test('my test', async ({ page }) => {
 *   // Already authenticated!
 * })
 * ```
 */
export function useAuthentication(storageStateFile?: string) {
  const file = storageStateFile || getCurrentEnvironmentPaths().authFile
  test.use({ storageState: file })
}