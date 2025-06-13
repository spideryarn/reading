/**
 * @jest-environment node
 */

/**
 * Real RLS Policy Tests
 * 
 * Tests actual Row Level Security policies using real Supabase authentication.
 * Replaces simulated RLS testing with database-level security validation.
 * 
 * These tests validate that RLS policies correctly enforce user isolation
 * and document ownership at the database level.
 */

import { RealRLSTestSetup, RLSAssertions, RLSTestHelpers } from './rls-test-helpers'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'

describe('Real RLS Policy Tests', () => {
  let setup: RealRLSTestSetup

  beforeAll(async () => {
    setup = new RealRLSTestSetup()
  })

  afterAll(async () => {
    await setup.cleanup()
  })

  describe('Test 1: Document ownership isolation', () => {
    test('Users can only access their own documents', async () => {
      // Create test document owned by User A (using admin client)
      const userADocument = await setup.createTestDocument({
        title: 'User A Private Document',
        slug: 'user-a-private-document',
        html_content: '<h1>User A Content</h1>',
        plaintext_content: 'User A Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 3,
      })

      // Create authenticated clients for both users
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User A should be able to access their own document
      const userAResult = await setup.testResourceAccess(
        userAClient,
        'documents',
        userADocument.id
      )
      RLSAssertions.assertHasAccess(userAResult, userADocument.id)
      RLSAssertions.assertOwnership(userAResult, TEST_USER_IDS.USER_A)

      // User B should be blocked from accessing User A's document
      const userBResult = await setup.testResourceAccess(
        userBClient,
        'documents',
        userADocument.id
      )
      RLSAssertions.assertBlockedAccess(userBResult)
    })

    test('Document listing respects user isolation', async () => {
      // Create documents for both users
      const userADoc = await setup.createTestDocument({
        title: 'User A List Test Document',
        slug: 'user-a-list-test',
        html_content: '<h1>User A List Content</h1>',
        plaintext_content: 'User A List Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 4,
      })

      const userBDoc = await setup.createTestDocument({
        title: 'User B List Test Document',
        slug: 'user-b-list-test',
        html_content: '<h1>User B List Content</h1>',
        plaintext_content: 'User B List Content',
        created_by: TEST_USER_IDS.USER_B,
        is_public: false,
        word_count: 4,
      })

      // Get authenticated clients
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User A should only see their own documents
      const { data: userADocuments } = await userAClient
        .from('documents')
        .select('id, title, created_by')

      expect(userADocuments).toBeTruthy()
      const userADocIds = userADocuments?.map(doc => doc.id) || []
      
      // User A should see their own document but not User B's
      expect(userADocIds).toContain(userADoc.id)
      expect(userADocIds).not.toContain(userBDoc.id)

      // All documents should belong to User A
      userADocuments?.forEach(doc => {
        expect(doc.created_by).toBe(TEST_USER_IDS.USER_A)
      })

      // User B should only see their own documents
      const { data: userBDocuments } = await userBClient
        .from('documents')
        .select('id, title, created_by')

      expect(userBDocuments).toBeTruthy()
      const userBDocIds = userBDocuments?.map(doc => doc.id) || []
      
      // User B should see their own document but not User A's
      expect(userBDocIds).toContain(userBDoc.id)
      expect(userBDocIds).not.toContain(userADoc.id)

      // All documents should belong to User B
      userBDocuments?.forEach(doc => {
        expect(doc.created_by).toBe(TEST_USER_IDS.USER_B)
      })
    })
  })

  describe('Test 2: AI calls follow document ownership', () => {
    test('Users can only access AI calls for documents they own', async () => {
      // Create document owned by User A
      const userADocument = await setup.createTestDocument({
        title: 'User A AI Document',
        slug: 'user-a-ai-document',
        html_content: '<h1>User A AI Content</h1>',
        plaintext_content: 'User A AI Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 4,
      })

      // Create AI call linked to User A's document
      const aiCall = await setup.createTestAICall({
        prompt_type: 'test_headings',
        prompt_input: `Generate headings for document: ${userADocument.id}`,
        document_id: userADocument.id,
        created_by: TEST_USER_IDS.USER_A,
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        finish_reason: 'stop',
        response_text: 'Generated headings response',
      })

      // Get authenticated clients
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User A should be able to access AI call for their document
      const userAResult = await setup.testResourceAccess(
        userAClient,
        'ai_calls',
        aiCall.id
      )
      RLSAssertions.assertHasAccess(userAResult, aiCall.id)

      // User B should be blocked from accessing AI call for User A's document
      const userBResult = await setup.testResourceAccess(
        userBClient,
        'ai_calls',
        aiCall.id
      )
      RLSAssertions.assertBlockedAccess(userBResult)
    })

    test('Document-independent AI calls are isolated by creator', async () => {
      // Create AI call without document association (document_id = null)
      const independentAICall = await setup.createTestAICall({
        prompt_type: 'independent_test',
        prompt_input: 'test independent call',
        document_id: null, // No document association
        created_by: TEST_USER_IDS.USER_A,
        prompt_tokens: 50,
        completion_tokens: 25,
        total_tokens: 75,
        finish_reason: 'stop',
        response_text: 'test independent response',
      })

      // Get authenticated clients
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User A should be able to access their own independent AI call
      const userAResult = await setup.testResourceAccess(
        userAClient,
        'ai_calls',
        independentAICall.id
      )
      RLSAssertions.assertHasAccess(userAResult, independentAICall.id)

      // User B should be blocked from accessing User A's independent AI call
      const userBResult = await setup.testResourceAccess(
        userBClient,
        'ai_calls',
        independentAICall.id
      )
      RLSAssertions.assertBlockedAccess(userBResult)
    })
  })

  describe('Test 3: Profile access isolation', () => {
    test('Users can only access their own profile', async () => {
      // Ensure profiles exist for both users (they should already exist from seed data)
      await setup.createTestProfile({
        user_id: TEST_USER_IDS.USER_A,
        preferences: { display_name: 'Test User A', bio: 'User A profile for RLS testing' },
      })

      await setup.createTestProfile({
        user_id: TEST_USER_IDS.USER_B,
        preferences: { display_name: 'Test User B', bio: 'User B profile for RLS testing' },
      })

      // Get authenticated clients
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User A should be able to access their own profile
      const userAResult = await setup.testProfileAccess(userAClient, TEST_USER_IDS.USER_A)
      RLSAssertions.assertHasAccess(userAResult)
      expect(userAResult.data.user_id).toBe(TEST_USER_IDS.USER_A)
      expect(userAResult.data.preferences).toBeDefined() // Profile has preferences object

      // User A should be blocked from accessing User B's profile
      const userAAccessToBResult = await setup.testProfileAccess(userAClient, TEST_USER_IDS.USER_B)
      RLSAssertions.assertBlockedAccess(userAAccessToBResult)

      // User B should be able to access their own profile
      const userBResult = await setup.testProfileAccess(userBClient, TEST_USER_IDS.USER_B)
      RLSAssertions.assertHasAccess(userBResult)
      expect(userBResult.data.user_id).toBe(TEST_USER_IDS.USER_B)
      expect(userBResult.data.preferences).toBeDefined() // Profile has preferences object

      // User B should be blocked from accessing User A's profile
      const userBAccessToAResult = await setup.testProfileAccess(userBClient, TEST_USER_IDS.USER_A)
      RLSAssertions.assertBlockedAccess(userBAccessToAResult)
    })
  })

  describe('Test 4: Document enhancements follow document ownership', () => {
    test('Enhancements follow document ownership rules', async () => {
      // Create document owned by User A
      const userADocument = await setup.createTestDocument({
        title: 'User A Enhancement Document',
        slug: 'user-a-enhancement-document',
        html_content: '<h1>User A Enhancement Content</h1>',
        plaintext_content: 'User A Enhancement Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 4,
      })

      // Create enhancement for User A's document
      const enhancement = await setup.createTestEnhancement({
        document_id: userADocument.id,
        type: 'ai_headings',
        content: { 
          headings: [
            { level: 1, text: 'Test Heading 1', id: 'h1' },
            { level: 2, text: 'Test Heading 2', id: 'h2' }
          ]
        },
      })

      // Get authenticated clients
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User A should be able to access enhancement for their document
      const userAResult = await setup.testResourceAccess(
        userAClient,
        'document_enhancements',
        enhancement.id
      )
      RLSAssertions.assertHasAccess(userAResult, enhancement.id)
      expect(userAResult.data.document_id).toBe(userADocument.id)
      expect(userAResult.data.type).toBe('ai_headings')

      // User B should be blocked from accessing enhancement for User A's document
      const userBResult = await setup.testResourceAccess(
        userBClient,
        'document_enhancements',
        enhancement.id
      )
      RLSAssertions.assertBlockedAccess(userBResult)
    })

    test('Enhancement listing respects document ownership', async () => {
      // Create documents for both users
      const userADocument = await setup.createTestDocument({
        title: 'User A Enhancement List Document',
        slug: 'user-a-enhancement-list',
        html_content: '<h1>User A Enhancement List Content</h1>',
        plaintext_content: 'User A Enhancement List Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 5,
      })

      const userBDocument = await setup.createTestDocument({
        title: 'User B Enhancement List Document',
        slug: 'user-b-enhancement-list',
        html_content: '<h1>User B Enhancement List Content</h1>',
        plaintext_content: 'User B Enhancement List Content',
        created_by: TEST_USER_IDS.USER_B,
        is_public: false,
        word_count: 5,
      })

      // Create enhancements for both documents
      const userAEnhancement = await setup.createTestEnhancement({
        document_id: userADocument.id,
        type: 'ai_summary',
        content: { summary: 'User A document summary' },
      })

      const userBEnhancement = await setup.createTestEnhancement({
        document_id: userBDocument.id,
        type: 'ai_glossary',
        content: { terms: [{ term: 'test', definition: 'a test term' }] },
      })

      // Get authenticated clients
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User A should only see enhancements for their documents
      const { data: userAEnhancements } = await userAClient
        .from('document_enhancements')
        .select('id, document_id, type')

      expect(userAEnhancements).toBeTruthy()
      const userAEnhancementIds = userAEnhancements?.map(enh => enh.id) || []
      
      // User A should see their own enhancement but not User B's
      expect(userAEnhancementIds).toContain(userAEnhancement.id)
      expect(userAEnhancementIds).not.toContain(userBEnhancement.id)

      // All enhancements should be for User A's documents (may include enhancements from other tests)
      // At minimum, verify User A's enhancement is present and for the correct document
      const foundUserAEnhancement = userAEnhancements?.find(enh => enh.id === userAEnhancement.id)
      expect(foundUserAEnhancement?.document_id).toBe(userADocument.id)

      // User B should only see enhancements for their documents
      const { data: userBEnhancements } = await userBClient
        .from('document_enhancements')
        .select('id, document_id, type')

      expect(userBEnhancements).toBeTruthy()
      const userBEnhancementIds = userBEnhancements?.map(enh => enh.id) || []
      
      // User B should see their own enhancement but not User A's
      expect(userBEnhancementIds).toContain(userBEnhancement.id)
      expect(userBEnhancementIds).not.toContain(userAEnhancement.id)

      // All enhancements should be for User B's documents (may include enhancements from other tests)
      // At minimum, verify User B's enhancement is present and for the correct document
      const foundUserBEnhancement = userBEnhancements?.find(enh => enh.id === userBEnhancement.id)
      expect(foundUserBEnhancement?.document_id).toBe(userBDocument.id)
    })
  })

  describe('Infrastructure validation', () => {
    test('Test setup infrastructure works correctly', async () => {
      // Test admin client can perform operations
      const adminClient = setup.getAdminClient()
      expect(adminClient).toBeDefined()

      // Test admin client can query existing data
      const { data: existingDocs, error } = await adminClient
        .from('documents')
        .select('id')
        .limit(1)

      expect(error).toBeNull()
      expect(existingDocs).toBeDefined()

      // Test user clients can be created
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      expect(userAClient).toBeDefined()
      expect(userBClient).toBeDefined()

      // Test user clients can perform queries (will be filtered by RLS)
      const userAQuery = await userAClient
        .from('documents')
        .select('id')
        .limit(5)

      const userBQuery = await userBClient
        .from('documents')
        .select('id')
        .limit(5)

      // Both queries should succeed (though results will be filtered by RLS)
      expect(userAQuery.error).toBeNull()
      expect(userBQuery.error).toBeNull()
    })
  })
})