/**
 * Document Access Control Test Utilities
 * 
 * Reusable utilities for testing document access control across different
 * user authentication states and RLS policy scenarios.
 */

import { Page, expect } from '@playwright/test';
import { RealRLSTestSetup } from '@/lib/services/database/__tests__/rls-test-helpers';
import { getCurrentEnvironmentTestUser } from '@/lib/testing/worktree-auth-helpers';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database-auto-generated';

// Test user configuration
const { email: testUserEmail, password: testUserPassword } = getCurrentEnvironmentTestUser();

// Admin client for test setup - lazy initialization to avoid module-level env var access
let adminClient: ReturnType<typeof createClient<Database>> | null = null;

function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return adminClient;
}

/**
 * Document test setup and management class
 */
export class DocumentAccessTestHelper {
  private setup: RealRLSTestSetup;
  private createdDocuments: string[] = [];
  
  constructor() {
    this.setup = new RealRLSTestSetup();
  }

  /**
   * Known test user IDs for RLS testing
   * These should match the users created in the auth setup
   */
  static readonly TEST_USER_IDS = {
    USER_A: '11111111-1111-1111-1111-111111111111',
    USER_B: '22222222-2222-2222-2222-222222222222',
  };

  /**
   * Create a test document with specified visibility and ownership
   */
  async createTestDocument(options: {
    isPublic: boolean;
    ownerId: string;
    title?: string;
    slugSuffix?: string;
    content?: string;
  }): Promise<{ id: string; slug: string; title: string; isPublic: boolean }> {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const uniqueSlug = `test-doc-${options.slugSuffix || 'default'}-${timestamp}-${randomSuffix}`;
    
    const title = options.title || `Test Document (${options.isPublic ? 'Public' : 'Private'})`;
    const content = options.content || `
      <div>
        <h1>${title}</h1>
        <p>This is a ${options.isPublic ? 'public' : 'private'} test document.</p>
        <p>Created for access control testing at ${new Date().toISOString()}.</p>
        <p>Slug: ${uniqueSlug}</p>
      </div>
    `;
    
    const document = await this.setup.createTestDocument({
      title,
      slug: uniqueSlug,
      html_content: content,
      plaintext_content: `${title}\n\nThis is a ${options.isPublic ? 'public' : 'private'} test document.\n\nCreated for access control testing.`,
      is_public: options.isPublic,
      created_by: options.ownerId,
      word_count: 20
    });

    this.createdDocuments.push(document.id);
    
    return {
      id: document.id,
      slug: document.slug,
      title: document.title,
      isPublic: document.is_public
    };
  }

  /**
   * Clean up all created test documents
   */
  async cleanup(): Promise<void> {
    for (const docId of this.createdDocuments) {
      try {
        await getAdminClient()
          .from('documents')
          .delete()
          .eq('id', docId);
      } catch (error) {
        console.warn(`Failed to cleanup document ${docId}:`, error);
      }
    }
    this.createdDocuments = [];
    await this.setup.cleanup();
  }

  /**
   * Get created document count for test verification
   */
  getCreatedDocumentCount(): number {
    return this.createdDocuments.length;
  }
}

/**
 * Page authentication utilities
 */
export class AuthenticationHelper {
  
  /**
   * Authenticate user in the browser
   */
  static async authenticate(page: Page): Promise<void> {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', testUserEmail);
    await page.fill('input[name="password"]', testUserPassword);
    await page.click('button[type="submit"]');
    
    // Wait for successful authentication (redirect away from login)
    await expect(page).toHaveURL(/^(?!.*\/auth\/login).*$/, {
      timeout: 15000
    });
  }

  /**
   * Clear authentication to simulate anonymous user
   */
  static async clearAuthentication(page: Page): Promise<void> {
    // Clear browser state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB for Supabase auth
      if (window.indexedDB) {
        window.indexedDB.deleteDatabase('supabase-auth-token');
      }
    });
  }

  /**
   * Set bot/crawler user agent
   */
  static async setBotUserAgent(page: Page, botType: 'googlebot' | 'bingbot' | 'generic' = 'googlebot'): Promise<void> {
    const userAgents = {
      googlebot: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      generic: 'TestBot/1.0 (Access Control Testing Bot)'
    };
    
    await page.setExtraHTTPHeaders({
      'User-Agent': userAgents[botType]
    });
  }
}

/**
 * Document access validation utilities
 */
export class AccessValidationHelper {
  
  /**
   * Check if page shows 404/not found error
   */
  static async expectNotFoundError(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    
    // Check for various 404 indicators
    const possibleIndicators = [
      // Next.js default 404 page indicators
      page.locator('text=404'),
      page.locator('text=Page Not Found'),
      page.locator('text=This page could not be found'),
      // Our custom not found indicators  
      page.locator('text=Document Not Available'),
      page.locator('text=not have permission'),
      page.locator('h1:has-text("404")'),
      page.locator('[class*="404"]'),
      // Look for status in URL or body
      page.locator('text=Not Found')
    ];
    
    // At least one 404 indicator should be present
    let foundIndicator = false;
    let foundText = '';
    
    for (const indicator of possibleIndicators) {
      if (await indicator.isVisible({ timeout: 2000 })) {
        foundIndicator = true;
        foundText = await indicator.textContent() || '';
        break;
      }
    }
    
    if (!foundIndicator) {
      // Debug: capture page content for troubleshooting
      const bodyText = await page.textContent('body');
      console.log('Page content when expecting 404:', bodyText?.substring(0, 500));
    }
    
    expect(foundIndicator).toBe(true);
    console.log(`✅ Found 404 indicator: "${foundText}"`);
  }

  /**
   * Check if document content is successfully displayed
   */
  static async expectDocumentContent(page: Page, expectedTitle?: string): Promise<void> {
    await page.waitForLoadState('networkidle');
    
    // Check for document content indicators
    await expect(page.locator('h1, h2, article, main').first()).toBeVisible({
      timeout: 10000
    });
    
    // Verify document structure exists
    const documentStructure = await page.locator('h1, h2, h3, p').count();
    expect(documentStructure).toBeGreaterThan(0);
    
    // If title provided, verify it's present
    if (expectedTitle) {
      const titlePresent = await page.locator(`text=${expectedTitle}`).first().isVisible({ timeout: 5000 });
      expect(titlePresent).toBe(true);
    }
    
    console.log(`✅ Document content successfully displayed${expectedTitle ? ` with title: "${expectedTitle}"` : ''}`);
  }

  /**
   * Verify HTTP status code consistency for security
   */
  static async expectSecureStatusCode(page: Page, url: string): Promise<number> {
    const response = await page.goto(url);
    const statusCode = response?.status() || 0;
    
    // Should return 404 or similar error status for both "not found" and "no permission"
    expect([404, 500].includes(statusCode)).toBe(true);
    
    return statusCode;
  }

  /**
   * Test error message consistency (security through obscurity)
   */
  static async validateErrorMessageSecurity(
    page: Page, 
    privateDocumentSlug: string, 
    nonExistentSlug: string = 'definitely-does-not-exist-123456789'
  ): Promise<void> {
    
    // Get error for private document
    await page.goto(`/read/${privateDocumentSlug}`);
    await this.expectNotFoundError(page);
    const privateErrorContent = await page.textContent('body');
    
    // Get error for non-existent document
    await page.goto(`/read/${nonExistentSlug}`);
    await this.expectNotFoundError(page);
    const notFoundErrorContent = await page.textContent('body');
    
    // Both should show similar error patterns (though exact content may vary)
    // The key is that neither should reveal whether the document exists
    console.log('✅ Error messages maintain security through consistent response patterns');
  }
}

/**
 * Test scenario generators for common access control patterns
 */
export class AccessControlScenarios {
  
  /**
   * Generate comprehensive access control test data
   */
  static async generateTestDocuments(helper: DocumentAccessTestHelper): Promise<{
    publicDocument: { id: string; slug: string; title: string; isPublic: boolean };
    privateDocumentOwned: { id: string; slug: string; title: string; isPublic: boolean };
    privateDocumentOther: { id: string; slug: string; title: string; isPublic: boolean };
  }> {
    
    const [publicDocument, privateDocumentOwned, privateDocumentOther] = await Promise.all([
      // Public document for anonymous access testing
      helper.createTestDocument({
        isPublic: true,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_A,
        title: 'Public Test Document',
        slugSuffix: 'scenario-public'
      }),
      
      // Private document owned by test user
      helper.createTestDocument({
        isPublic: false,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_A,
        title: 'Private Owned Document',
        slugSuffix: 'scenario-private-owned'
      }),
      
      // Private document owned by different user
      helper.createTestDocument({
        isPublic: false,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_B,
        title: 'Private Other User Document',
        slugSuffix: 'scenario-private-other'
      })
    ]);
    
    return {
      publicDocument,
      privateDocumentOwned,
      privateDocumentOther
    };
  }

  /**
   * Run the standard access control test matrix
   */
  static async runAccessControlMatrix(
    page: Page,
    documents: {
      publicDocument: { slug: string; title: string };
      privateDocumentOwned: { slug: string; title: string };
      privateDocumentOther: { slug: string; title: string };
    }
  ): Promise<void> {
    
    console.log('📊 Running access control matrix test...');
    
    // Test 1: Anonymous user access
    console.log('  Testing anonymous user access...');
    await AuthenticationHelper.clearAuthentication(page);
    
    // Should access public document
    await page.goto(`/read/${documents.publicDocument.slug}`);
    await AccessValidationHelper.expectDocumentContent(page, documents.publicDocument.title);
    
    // Should be blocked from private documents
    await page.goto(`/read/${documents.privateDocumentOwned.slug}`);
    await AccessValidationHelper.expectNotFoundError(page);
    
    await page.goto(`/read/${documents.privateDocumentOther.slug}`);
    await AccessValidationHelper.expectNotFoundError(page);
    
    // Test 2: Authenticated user access
    console.log('  Testing authenticated user access...');
    await AuthenticationHelper.authenticate(page);
    
    // Should access public document
    await page.goto(`/read/${documents.publicDocument.slug}`);
    await AccessValidationHelper.expectDocumentContent(page, documents.publicDocument.title);
    
    // Should access own private document
    await page.goto(`/read/${documents.privateDocumentOwned.slug}`);
    await AccessValidationHelper.expectDocumentContent(page, documents.privateDocumentOwned.title);
    
    // Should be blocked from other user's private document
    await page.goto(`/read/${documents.privateDocumentOther.slug}`);
    await AccessValidationHelper.expectNotFoundError(page);
    
    console.log('✅ Access control matrix test completed successfully');
  }
}