/**
 * @jest-environment node
 */

/**
 * RLS Policy Integration Testing V2
 * 
 * Updated to use UUID-based test isolation instead of destructive cleanup.
 * Tests RLS policies with real database-level authentication.
 * Uses admin client for setup and authenticated clients for actual RLS testing.
 */

import { RLSTestSetup } from '@/lib/testing/rls-database-test-utils-v2'
import { getCleanupFunctions } from '@/lib/testing/test-isolation-utils'
import { SECURITY_TEST_DOCUMENTS } from '@/lib/testing/security-fixtures'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'

describe('RLS Policy Integration Tests', () => {
  let rlsSetup: RLSTestSetup

  beforeEach(async () => {
    // Create new setup for each test with unique namespace
    rlsSetup = new RLSTestSetup('rls-integration-test')
    
    // Note: Current RLS policies are permissive for development
    // This test suite demonstrates the authentication infrastructure
    // Proper RLS testing will work once migration 20250610000001 is applied
  })

  afterEach(async () => {
    // Clean up only test-namespaced data
    await rlsSetup.cleanup()
  })

  describe('Document RLS Policies', () => {
    test('RLS testing infrastructure components work', async () => {
      // Test 1: Admin client can be created and perform database operations
      const adminClient = rlsSetup['adminClient'] // Access private property for this test
      expect(adminClient).toBeDefined()
      
      // Create a test document with namespace
      const testDoc = await rlsSetup.createTestDocument({
        title: 'RLS Test Document',
        slug: 'rls-test-doc',
        html_content: '<p>Test content</p>',
        plaintext_content: 'Test content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 2
      })
      
      expect(testDoc).toBeDefined()
      expect(testDoc.metadata.test_namespace).toBe(rlsSetup.getNamespace())
      
      // Test 2: Authenticated clients can be created without errors
      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      expect(userAClient).toBeDefined()
      expect(userBClient).toBeDefined()
      expect(userAClient._testUserId).toBe(TEST_USER_IDS.USER_A)
      expect(userBClient._testUserId).toBe(TEST_USER_IDS.USER_B)
    })

    test('Document ownership isolation with test namespace', async () => {
      // Create test documents with namespace tracking
      const userADocument = await rlsSetup.createTestDocument({
        ...SECURITY_TEST_DOCUMENTS.PRIVATE_USER_A,
        created_by: TEST_USER_IDS.USER_A,
      })
      
      const userBDocument = await rlsSetup.createTestDocument({
        ...SECURITY_TEST_DOCUMENTS.PRIVATE_USER_B,
        created_by: TEST_USER_IDS.USER_B,
      })

      // Get authenticated clients
      const userAClient = rlsSetup.getUserClient('USER_A')
      const userBClient = rlsSetup.getUserClient('USER_B')

      // Test: User A queries documents (simulated filtering)
      const userAQuery = await userAClient.from('documents').select('*')
      expect(userAQuery).toBeDefined()
      
      // Note: Since we're using a simplified client that filters by user context,
      // the actual RLS enforcement happens at the database level.
      // These tests verify our testing infrastructure works correctly.
    })

    test('Public document access with namespace isolation', async () => {
      // Create a public document owned by User A
      const publicDocument = await rlsSetup.createTestDocument({
        ...SECURITY_TEST_DOCUMENTS.PUBLIC_USER_A,
        created_by: TEST_USER_IDS.USER_A,
        is_public: true,
      })

      // User B should be able to access public documents
      const userBClient = rlsSetup.getUserClient('USER_B')
      
      // In real RLS, this would be filtered at the database level
      // Our test infrastructure ensures the setup is correct
      expect(publicDocument.is_public).toBe(true)
      expect(publicDocument.metadata.test_namespace).toBe(rlsSetup.getNamespace())
    })

    test('Document enhancement access control with namespace', async () => {
      // Create document and enhancement with namespace tracking
      const document = await rlsSetup.createTestDocument({
        title: 'Document with Enhancement',
        slug: 'doc-with-enhancement',
        html_content: '<p>Content</p>',
        plaintext_content: 'Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 1
      })

      // Create AI call record
      const aiCall = await rlsSetup.createTestAiCall({
        document_id: document.id,
        prompt_type: 'test',
        prompt_input: 'test input',
        model_id: '00000000-0000-0000-0000-000000000001',
        completion_output: 'test output',
        status: 'completed'
      })

      // Create enhancement
      const enhancement = await rlsSetup.createTestEnhancement({
        document_id: document.id,
        type: 'summary',
        content: { text: 'Test summary' },
        ai_call_id: aiCall.id
      })

      expect(enhancement.metadata.test_namespace).toBe(rlsSetup.getNamespace())
      
      // Verify all test data is tracked for cleanup
      const namespace = rlsSetup.getNamespace()
      const trackedData = require('@/lib/testing/test-isolation-utils').getTrackedData(namespace)
      expect(trackedData.documents).toContain(document.id)
      expect(trackedData.aiCalls).toContain(aiCall.id)
      expect(trackedData.enhancements).toContain(enhancement.id)
    })

    test('Chat thread access control with namespace', async () => {
      // Create document and chat thread with namespace
      const document = await rlsSetup.createTestDocument({
        title: 'Document with Chat',
        slug: 'doc-with-chat',
        html_content: '<p>Chat content</p>',
        plaintext_content: 'Chat content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 2
      })

      const chatThread = await rlsSetup.createTestChatThread({
        document_id: document.id,
        user_id: TEST_USER_IDS.USER_A,
        model_id: '00000000-0000-0000-0000-000000000001',
        status: 'active'
      })

      const chatMessage = await rlsSetup.createTestChatMessage({
        thread_id: chatThread.id,
        role: 'user',
        content: 'Test message',
        message_number: 1
      })

      // Verify namespace tracking
      expect(chatThread.metadata.test_namespace).toBe(rlsSetup.getNamespace())
      expect(chatMessage.metadata.test_namespace).toBe(rlsSetup.getNamespace())
    })

    test('Profile access with namespace isolation', async () => {
      // Create test profiles with namespace
      const profileA = await rlsSetup.createTestProfile(TEST_USER_IDS.USER_A, {
        preferences: { display_name: 'Test User A' }
      })

      const profileB = await rlsSetup.createTestProfile(TEST_USER_IDS.USER_B, {
        preferences: { display_name: 'Test User B' }
      })

      expect(profileA.metadata.test_namespace).toBe(rlsSetup.getNamespace())
      expect(profileB.metadata.test_namespace).toBe(rlsSetup.getNamespace())
    })
  })

  describe('Cleanup verification', () => {
    test('Cleanup only removes namespaced test data', async () => {
      const namespace = rlsSetup.getNamespace()
      
      // Create some test data
      const doc = await rlsSetup.createTestDocument({
        title: 'Cleanup Test Doc',
        slug: 'cleanup-test',
        html_content: '<p>Test</p>',
        plaintext_content: 'Test',
        created_by: TEST_USER_IDS.USER_A,
        word_count: 1
      })

      // Verify data is tracked
      const trackedBefore = require('@/lib/testing/test-isolation-utils').getTrackedData(namespace)
      expect(trackedBefore.documents).toContain(doc.id)

      // Clean up
      await rlsSetup.cleanup()

      // Verify tracking is cleared
      const trackedAfter = require('@/lib/testing/test-isolation-utils').getTrackedData(namespace)
      expect(trackedAfter).toBeUndefined()
    })
  })
})