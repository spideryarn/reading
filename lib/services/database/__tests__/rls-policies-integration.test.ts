/**
 * @jest-environment node
 */

/**
 * DEPRECATED: RLS Policy Integration Testing
 * 
 * This test file is DEPRECATED and should not be used for new development.
 * 
 * REPLACEMENT: Use `/lib/services/database/__tests__/rls-policies-real.test.ts` instead.
 * 
 * REASON FOR DEPRECATION:
 * - This file uses a complex simulation approach that doesn't actually test real RLS policies
 * - The new real RLS testing approach provides genuine database-level security testing
 * - These tests were failing due to infrastructure complexity and didn't provide real security validation
 * - The new approach discovered and fixed critical security vulnerabilities that these tests missed
 * 
 * MIGRATION PATH:
 * - Replace any usage of this file with the new real RLS testing patterns
 * - See `docs/reference/TESTING_DATABASE.md` for comprehensive real RLS testing guide
 * - The new tests are faster (330ms vs 2000ms+), more reliable, and provide actual security validation
 * 
 * This file is kept temporarily for reference but will be removed in a future cleanup.
 * 
 * @deprecated Use rls-policies-real.test.ts instead
 */

import { RLSTestSetup, RLSTestHelpers, RLSAssertions } from '@/lib/testing/rls-database-test-utils'
import { SECURITY_TEST_DOCUMENTS } from '@/lib/testing/security-fixtures'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'

describe.skip('DEPRECATED: RLS Policy Integration Tests', () => {
  let rlsSetup: RLSTestSetup

  beforeAll(async () => {
    rlsSetup = new RLSTestSetup()
    
    // Note: Current RLS policies are permissive for development
    // This test suite demonstrates the authentication infrastructure
    // Proper RLS testing will work once migration 20250610000001 is applied
  })

  afterAll(async () => {
    await rlsSetup.cleanup()
  })

  describe('Document RLS Policies', () => {
    test('RLS testing infrastructure components work', async () => {
      // Test 1: Admin client can be created and perform database operations
      const adminClient = rlsSetup.getAdminClient()
      expect(adminClient).toBeDefined()
      
      // Test admin can query existing data
      const { data: existingDocs, error: adminError } = await adminClient
        .from('documents')
        .select('*')
        .limit(1)
      
      expect(adminError).toBeNull()
      expect(existingDocs).toBeDefined()
      
      // Test 2: Authenticated clients can be created without errors
      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      expect(userAClient).toBeDefined()
      expect(userBClient).toBeDefined()
      
      // Test 3: Authenticated clients can perform database queries (permissive policies)
      const userAQuery = await userAClient
        .from('documents')
        .select('id, title')
        .limit(1)
        
      const userBQuery = await userBClient
        .from('documents') 
        .select('id, title')
        .limit(1)
      
      // Both should work due to current permissive RLS policies
      expect(userAQuery.error).toBeNull()
      expect(userBQuery.error).toBeNull()
      
      // Test 4: Profile queries work (to verify basic table access)
      const profileQuery = await adminClient
        .from('profiles')
        .select('*')
        .limit(1)
        
      expect(profileQuery.error).toBeNull()
      
      // Infrastructure verification complete - all components working
    })

    test('User B cannot access User A documents', async () => {
      // Create document owned by User B (as admin)
      const userBDoc = await rlsSetup.createTestDocument({
        ...SECURITY_TEST_DOCUMENTS.USER_B_DOCUMENT,
        id: '22222222-2222-2222-2222-222222222222',
        created_by: TEST_USER_IDS.USER_B,
      })

      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      // User B should be able to access their own document
      const userBResult = await RLSTestHelpers.testOwnerAccess(
        userBClient,
        'documents',
        userBDoc.id
      )
      RLSAssertions.assertOwnerAccess(userBResult, userBDoc.id)

      // User A should NOT be able to access User B's document
      const userAResult = await RLSTestHelpers.testNonOwnerBlocked(
        userAClient,
        'documents',
        userBDoc.id
      )
      RLSAssertions.assertNonOwnerBlocked(userAResult)
    })

    test('Document listing respects user isolation', async () => {
      // Create documents for both users (as admin)
      const userADoc = await rlsSetup.createTestDocument({
        id: '33333333-3333-3333-3333-333333333333',
        title: 'User A List Document',
        slug: 'user-a-list-doc',
        html_content: '<h1>User A List Content</h1>',
        plaintext_content: 'User A List Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 4,
      })

      const userBDoc = await rlsSetup.createTestDocument({
        id: '44444444-4444-4444-4444-444444444444',
        title: 'User B List Document',
        slug: 'user-b-list-doc',
        html_content: '<h1>User B List Content</h1>',
        plaintext_content: 'User B List Content',
        created_by: TEST_USER_IDS.USER_B,
        is_public: false,
        word_count: 4,
      })

      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      // User A should only see their own documents
      const userAListResult = await RLSTestHelpers.testListIsolation(
        userAClient,
        'documents',
        TEST_USER_IDS.USER_A
      )
      RLSAssertions.assertListIsolation(userAListResult, 1)

      // Verify User A sees their document but not User B's
      const userADocIds = userAListResult.data?.map((doc: any) => doc.id) || []
      expect(userADocIds).toContain(userADoc.id)
      expect(userADocIds).not.toContain(userBDoc.id)

      // User B should only see their own documents
      const userBListResult = await RLSTestHelpers.testListIsolation(
        userBClient,
        'documents',
        TEST_USER_IDS.USER_B
      )
      RLSAssertions.assertListIsolation(userBListResult, 1)

      // Verify User B sees their document but not User A's
      const userBDocIds = userBListResult.data?.map((doc: any) => doc.id) || []
      expect(userBDocIds).toContain(userBDoc.id)
      expect(userBDocIds).not.toContain(userADoc.id)
    })

    test('Document creation assigns correct ownership', async () => {
      const userAClient = rlsSetup.getUserClient('USER_A')

      // Test document creation as User A
      const createResult = await RLSTestHelpers.testDocumentCreation(
        userAClient,
        {
          title: 'User A Created Document',
          slug: 'user-a-created-doc',
          html_content: '<h1>Created by User A</h1>',
          plaintext_content: 'Created by User A',
          is_public: false,
          word_count: 4,
        },
        TEST_USER_IDS.USER_A
      )

      RLSAssertions.assertOwnership(createResult, TEST_USER_IDS.USER_A)
    })
  })

  describe('AI Calls RLS Policies', () => {
    test('AI calls follow document ownership', async () => {
      // Create document owned by User A
      const userADoc = await rlsSetup.createTestDocument({
        id: '55555555-5555-5555-5555-555555555555',
        title: 'User A AI Document',
        slug: 'user-a-ai-doc',
        html_content: '<h1>User A AI Content</h1>',
        plaintext_content: 'User A AI Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 4,
      })

      // Create AI call linked to document
      const aiCall = await rlsSetup.createTestAICall({
        id: '66666666-6666-6666-6666-666666666666',
        provider: 'anthropic',
        model_id: 'claude-3-haiku',
        prompt_type: 'test',
        input_data: { test: true },
        output_data: { result: 'test output' },
        document_id: userADoc.id,
        created_by: TEST_USER_IDS.USER_A,
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        finish_reason: 'stop',
      })

      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      // User A should be able to access AI call for their document
      const userAResult = await RLSTestHelpers.testOwnerAccess(
        userAClient,
        'ai_calls',
        aiCall.id
      )
      RLSAssertions.assertOwnerAccess(userAResult, aiCall.id)

      // User B should NOT be able to access AI call for User A's document
      const userBResult = await RLSTestHelpers.testNonOwnerBlocked(
        userBClient,
        'ai_calls',
        aiCall.id
      )
      RLSAssertions.assertNonOwnerBlocked(userBResult)
    })

    test('Document-independent AI calls are isolated by creator', async () => {
      // Create AI call without document association
      const aiCall = await rlsSetup.createTestAICall({
        id: '77777777-7777-7777-7777-777777777777',
        provider: 'anthropic',
        model_id: 'claude-3-haiku',
        prompt_type: 'independent-test',
        input_data: { test: true },
        output_data: { result: 'independent output' },
        document_id: null, // No document association
        created_by: TEST_USER_IDS.USER_A,
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        finish_reason: 'stop',
      })

      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      // User A should be able to access their own AI call
      const userAResult = await RLSTestHelpers.testOwnerAccess(
        userAClient,
        'ai_calls',
        aiCall.id
      )
      RLSAssertions.assertOwnerAccess(userAResult, aiCall.id)

      // User B should NOT be able to access User A's AI call
      const userBResult = await RLSTestHelpers.testNonOwnerBlocked(
        userBClient,
        'ai_calls',
        aiCall.id
      )
      RLSAssertions.assertNonOwnerBlocked(userBResult)
    })
  })

  describe('Document Enhancements RLS Policies', () => {
    test('Enhancements follow document ownership', async () => {
      // Create document owned by User A
      const userADoc = await rlsSetup.createTestDocument({
        id: '88888888-8888-8888-8888-888888888888',
        title: 'User A Enhancement Document',
        slug: 'user-a-enhancement-doc',
        html_content: '<h1>User A Enhancement Content</h1>',
        plaintext_content: 'User A Enhancement Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 4,
      })

      // Create enhancement for the document
      const enhancement = await rlsSetup.createTestEnhancement({
        id: '99999999-9999-9999-9999-999999999999',
        document_id: userADoc.id,
        type: 'ai_headings',
        content: { headings: [{ level: 1, text: 'Test Heading', id: 'h1' }] },
        status: 'completed',
      })

      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      // User A should be able to access enhancement for their document
      const userAResult = await RLSTestHelpers.testOwnerAccess(
        userAClient,
        'document_enhancements',
        enhancement.id
      )
      RLSAssertions.assertOwnerAccess(userAResult, enhancement.id)

      // User B should NOT be able to access enhancement for User A's document
      const userBResult = await RLSTestHelpers.testNonOwnerBlocked(
        userBClient,
        'document_enhancements',
        enhancement.id
      )
      RLSAssertions.assertNonOwnerBlocked(userBResult)
    })
  })

  describe('Profile RLS Policies', () => {
    test('Users can only access their own profile', async () => {
      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      // User A should be able to access their own profile
      const userAResult = await RLSTestHelpers.testOwnerAccess(
        userAClient,
        'profiles',
        TEST_USER_IDS.USER_A
      )
      expect(userAResult.hasAccess).toBe(true)
      expect(userAResult.data.user_id).toBe(TEST_USER_IDS.USER_A)

      // User A should NOT be able to access User B's profile
      const { data: userBProfile } = await userBClient
        .from('profiles')
        .select('*')
        .eq('user_id', TEST_USER_IDS.USER_B)
        .single()

      const userAAccessToBResult = await RLSTestHelpers.testNonOwnerBlocked(
        userAClient,
        'profiles',
        userBProfile.id
      )
      RLSAssertions.assertNonOwnerBlocked(userAAccessToBResult)
    })
  })

  describe('Cross-Table RLS Integration', () => {
    test('Complete document ecosystem respects ownership chain', async () => {
      // Create full document ecosystem for User A
      const userADoc = await rlsSetup.createTestDocument({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        title: 'User A Ecosystem Document',
        slug: 'user-a-ecosystem-doc',
        html_content: '<h1>User A Ecosystem Content</h1>',
        plaintext_content: 'User A Ecosystem Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 4,
      })

      const aiCall = await rlsSetup.createTestAICall({
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        provider: 'anthropic',
        model_id: 'claude-3-haiku',
        prompt_type: 'ecosystem-test',
        input_data: { document_id: userADoc.id },
        output_data: { result: 'ecosystem output' },
        document_id: userADoc.id,
        created_by: TEST_USER_IDS.USER_A,
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        finish_reason: 'stop',
      })

      const enhancement = await rlsSetup.createTestEnhancement({
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        document_id: userADoc.id,
        type: 'ai_headings',
        content: { headings: [{ level: 1, text: 'Ecosystem Heading', id: 'eh1' }] },
        status: 'completed',
        ai_call_id: aiCall.id,
      })

      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      // User A should be able to access all parts of their ecosystem
      const docResult = await RLSTestHelpers.testOwnerAccess(userAClient, 'documents', userADoc.id)
      const aiCallResult = await RLSTestHelpers.testOwnerAccess(userAClient, 'ai_calls', aiCall.id)
      const enhancementResult = await RLSTestHelpers.testOwnerAccess(userAClient, 'document_enhancements', enhancement.id)

      RLSAssertions.assertOwnerAccess(docResult, userADoc.id)
      RLSAssertions.assertOwnerAccess(aiCallResult, aiCall.id)
      RLSAssertions.assertOwnerAccess(enhancementResult, enhancement.id)

      // User B should be blocked from accessing any part of User A's ecosystem
      const docBlockedResult = await RLSTestHelpers.testNonOwnerBlocked(userBClient, 'documents', userADoc.id)
      const aiCallBlockedResult = await RLSTestHelpers.testNonOwnerBlocked(userBClient, 'ai_calls', aiCall.id)
      const enhancementBlockedResult = await RLSTestHelpers.testNonOwnerBlocked(userBClient, 'document_enhancements', enhancement.id)

      RLSAssertions.assertNonOwnerBlocked(docBlockedResult)
      RLSAssertions.assertNonOwnerBlocked(aiCallBlockedResult)
      RLSAssertions.assertNonOwnerBlocked(enhancementBlockedResult)
    })
  })
})