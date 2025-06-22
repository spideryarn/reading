import { test, expect } from '@playwright/test';
import { getCurrentEnvironmentId, getEnvironmentName } from '@/lib/testing/worktree-auth-helpers';
import { 
  DocumentAccessTestHelper,
  AuthenticationHelper,
  AccessValidationHelper,
  AccessControlScenarios
} from '../helpers/document-access-test-utils';

/**
 * Document Access Control E2E Tests
 * 
 * Tests the new conditional authentication and RLS-based access control system
 * for documents at /read/[slug]. Validates both security and functionality.
 * 
 * KEY SECURITY FEATURES TESTED:
 * - Anonymous users can access public documents
 * - Anonymous users get 404 for private documents (security-first error conflation)
 * - Authenticated users can access own private documents
 * - Authenticated users get 404 for other users' private documents
 * - Search engine bots can access public documents
 * 
 * ARCHITECTURE TESTED:
 * - Conditional authentication with getAuthUser() instead of requireAuth()
 * - RLS policies controlling document access at database level
 * - NotAuthorizedPage component using notFound() for security
 * - Removal of previous /share route workaround
 * 
 * TEST ISOLATION:
 * - Uses unique document slugs per test run to avoid conflicts
 * - Real RLS testing with actual database policies
 * - Environment-specific test users for multi-worktree support
 * - Proper cleanup of test data
 */

// Test setup and configuration
const envId = getCurrentEnvironmentId();
const envName = getEnvironmentName(envId);

// Test suite configuration
test.describe('Document Access Control', () => {
  let documentHelper: DocumentAccessTestHelper;
  
  test.beforeAll(async () => {
    console.log(`Setting up document access control tests for ${envName} environment`);
    documentHelper = new DocumentAccessTestHelper();
  });

  test.afterAll(async () => {
    console.log('Cleaning up document access control test data');
    await documentHelper.cleanup();
  });

  test.describe('Anonymous Users', () => {
    
    test('can access public documents', async ({ page }) => {
      console.log('🔄 Testing anonymous access to public document');
      
      // Ensure user is not authenticated
      await AuthenticationHelper.clearAuthentication(page);
      
      // Create a public test document
      const document = await documentHelper.createTestDocument({
        isPublic: true,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_A,
        title: 'Public Test Document',
        slugSuffix: 'anon-public'
      });
      
      // Navigate to document
      await page.goto(`/read/${document.slug}`);
      
      // Should successfully display document content
      await AccessValidationHelper.expectDocumentContent(page, document.title);
      
      console.log('✅ Anonymous user successfully accessed public document');
    });

    test('get 404 for private documents', async ({ page }) => {
      console.log('🔄 Testing anonymous access to private document (should be blocked)');
      
      // Ensure user is not authenticated
      await AuthenticationHelper.clearAuthentication(page);
      
      // Create a private test document
      const document = await documentHelper.createTestDocument({
        isPublic: false,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_A,
        title: 'Private Test Document',
        slugSuffix: 'anon-private'
      });
      
      // Navigate to document
      await page.goto(`/read/${document.slug}`);
      
      // Should show 404 error (security-first error conflation)
      await AccessValidationHelper.expectNotFoundError(page);
      
      console.log('✅ Anonymous user correctly received 404 for private document');
    });
  });

  test.describe('Authenticated Users', () => {
    
    test('can access own private documents', async ({ page }) => {
      console.log('🔄 Testing authenticated user access to own private document');
      
      // Authenticate user
      await AuthenticationHelper.authenticate(page);
      
      // Create a private document owned by the authenticated user
      const document = await documentHelper.createTestDocument({
        isPublic: false,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_A,
        title: 'Own Private Document',
        slugSuffix: 'auth-own-private'
      });
      
      // Navigate to document
      await page.goto(`/read/${document.slug}`);
      
      // Should successfully display document content
      await AccessValidationHelper.expectDocumentContent(page, document.title);
      
      console.log('✅ Authenticated user successfully accessed own private document');
    });

    test('get 404 for other users private documents', async ({ page }) => {
      console.log('🔄 Testing authenticated user access to another user\'s private document (should be blocked)');
      
      // Authenticate user
      await AuthenticationHelper.authenticate(page);
      
      // Create a private document owned by a different user
      const document = await documentHelper.createTestDocument({
        isPublic: false,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_B,
        title: 'Other User Private Document',
        slugSuffix: 'auth-other-private'
      });
      
      // Navigate to document
      await page.goto(`/read/${document.slug}`);
      
      // Should show 404 error (security-first error conflation)
      await AccessValidationHelper.expectNotFoundError(page);
      
      console.log('✅ Authenticated user correctly received 404 for other user\'s private document');
    });

    test('can access public documents', async ({ page }) => {
      console.log('🔄 Testing authenticated user access to public document');
      
      // Authenticate user
      await AuthenticationHelper.authenticate(page);
      
      // Create a public document owned by another user
      const document = await documentHelper.createTestDocument({
        isPublic: true,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_B,
        title: 'Public Document by Other User',
        slugSuffix: 'auth-public'
      });
      
      // Navigate to document
      await page.goto(`/read/${document.slug}`);
      
      // Should successfully display document content
      await AccessValidationHelper.expectDocumentContent(page, document.title);
      
      console.log('✅ Authenticated user successfully accessed public document');
    });
  });

  test.describe('Search Engine Bots and Crawlers', () => {
    
    test('can access public documents with bot user agent', async ({ page }) => {
      console.log('🔄 Testing bot/crawler access to public document');
      
      // Set bot user agent and clear authentication
      await AuthenticationHelper.setBotUserAgent(page, 'googlebot');
      await AuthenticationHelper.clearAuthentication(page);
      
      // Create a public test document
      const document = await documentHelper.createTestDocument({
        isPublic: true,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_A,
        title: 'SEO Test Document',
        slugSuffix: 'bot-public'
      });
      
      // Navigate to document
      await page.goto(`/read/${document.slug}`);
      
      // Should successfully display document content
      await AccessValidationHelper.expectDocumentContent(page, document.title);
      
      console.log('✅ Bot/crawler successfully accessed public document');
    });

    test('get 404 for private documents with bot user agent', async ({ page }) => {
      console.log('🔄 Testing bot/crawler access to private document (should be blocked)');
      
      // Set bot user agent and clear authentication
      await AuthenticationHelper.setBotUserAgent(page, 'googlebot');
      await AuthenticationHelper.clearAuthentication(page);
      
      // Create a private test document
      const document = await documentHelper.createTestDocument({
        isPublic: false,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_A,
        title: 'Private SEO Test Document',
        slugSuffix: 'bot-private'
      });
      
      // Navigate to document
      await page.goto(`/read/${document.slug}`);
      
      // Should show 404 error
      await AccessValidationHelper.expectNotFoundError(page);
      
      console.log('✅ Bot/crawler correctly received 404 for private document');
    });
  });

  test.describe('Security Validation', () => {
    
    test('error messages do not reveal existence of private documents', async ({ page }) => {
      console.log('🔄 Testing security-first error conflation');
      
      // Ensure user is not authenticated
      await AuthenticationHelper.clearAuthentication(page);
      
      // Create a private document
      const privateDoc = await documentHelper.createTestDocument({
        isPublic: false,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_A,
        title: 'Secret Private Document',
        slugSuffix: 'security-private'
      });
      
      // Validate error message security
      await AccessValidationHelper.validateErrorMessageSecurity(
        page,
        privateDoc.slug,
        'definitely-does-not-exist-123456789'
      );
      
      console.log('✅ Error messages properly conflate "not found" and "no permission"');
    });

    test('HTTP status codes are consistent for security', async ({ page }) => {
      console.log('🔄 Testing HTTP status code consistency');
      
      // Ensure user is not authenticated
      await AuthenticationHelper.clearAuthentication(page);
      
      // Test private document access
      const privateDoc = await documentHelper.createTestDocument({
        isPublic: false,
        ownerId: DocumentAccessTestHelper.TEST_USER_IDS.USER_A,
        title: 'Status Test Private Document',
        slugSuffix: 'status-private'
      });
      
      // Test both private and non-existent document status codes
      const privateStatus = await AccessValidationHelper.expectSecureStatusCode(page, `/read/${privateDoc.slug}`);
      const notFoundStatus = await AccessValidationHelper.expectSecureStatusCode(page, '/read/non-existent-document-987654321');
      
      console.log(`Private document status: ${privateStatus}`);
      console.log(`Non-existent document status: ${notFoundStatus}`);
      
      console.log('✅ HTTP status codes maintain security through consistency');
    });
  });

  test.describe('Cross-Document Navigation', () => {
    
    test('navigation between public and private documents respects access control', async ({ page }) => {
      console.log('🔄 Testing navigation between documents with different access levels');
      
      // Create test documents using the scenario generator
      const documents = await AccessControlScenarios.generateTestDocuments(documentHelper);
      
      // Run the access control matrix test
      await AccessControlScenarios.runAccessControlMatrix(page, {
        publicDocument: documents.publicDocument,
        privateDocumentOwned: documents.privateDocumentOwned,
        privateDocumentOther: documents.privateDocumentOther
      });
      
      console.log('✅ Navigation correctly respects access control based on authentication state');
    });

    test('comprehensive access control matrix validation', async ({ page }) => {
      console.log('🔄 Running comprehensive access control matrix test');
      
      // Generate all test document scenarios
      const documents = await AccessControlScenarios.generateTestDocuments(documentHelper);
      
      console.log('📊 Testing complete access control matrix:');
      console.log(`  - Public document: ${documents.publicDocument.slug}`);
      console.log(`  - Private owned document: ${documents.privateDocumentOwned.slug}`);
      console.log(`  - Private other user document: ${documents.privateDocumentOther.slug}`);
      
      // Run comprehensive matrix test
      await AccessControlScenarios.runAccessControlMatrix(page, documents);
      
      // Additional validation: Test bot access to public documents
      await AuthenticationHelper.setBotUserAgent(page, 'googlebot');
      await AuthenticationHelper.clearAuthentication(page);
      
      await page.goto(`/read/${documents.publicDocument.slug}`);
      await AccessValidationHelper.expectDocumentContent(page, documents.publicDocument.title);
      
      console.log('✅ Comprehensive access control matrix validation completed');
    });
  });
});