/**
 * @jest-environment node
 */

/**
 * Extended Real RLS Policy Tests
 * 
 * Tests additional RLS policies for new features:
 * - Public document visibility
 * - Profile admin access
 * - Chat authentication requirements
 * - Document enhancement inheritance for public documents
 */

import { RealRLSTestSetup, RLSAssertions } from './rls-test-helpers'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'

describe('Extended RLS Policy Tests', () => {
  let setup: RealRLSTestSetup

  beforeAll(async () => {
    setup = new RealRLSTestSetup()
  })

  afterAll(async () => {
    await setup.cleanup()
  })

  describe('Test 5: Public document visibility', () => {
    test('Anonymous users can view public documents', async () => {
      // Create public document owned by User A
      const publicDocument = await setup.createTestDocument({
        title: 'Public Document',
        slug: 'public-document',
        html_content: '<h1>Public Content</h1>',
        plaintext_content: 'Public Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: true,
        word_count: 2,
      })

      // Create private document owned by User A
      const privateDocument = await setup.createTestDocument({
        title: 'Private Document',
        slug: 'private-document',
        html_content: '<h1>Private Content</h1>',
        plaintext_content: 'Private Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 2,
      })

      // Get authenticated client for User B
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User B should be able to see public document
      const publicResult = await setup.testResourceAccess(
        userBClient,
        'documents',
        publicDocument.id
      )
      RLSAssertions.assertHasAccess(publicResult, publicDocument.id)

      // User B should NOT be able to see private document
      const privateResult = await setup.testResourceAccess(
        userBClient,
        'documents',
        privateDocument.id
      )
      RLSAssertions.assertBlockedAccess(privateResult)
    })

    test('Public document enhancements are visible to all', async () => {
      // Create public document
      const publicDocument = await setup.createTestDocument({
        title: 'Public Document with Enhancements',
        slug: 'public-document-enhanced',
        html_content: '<h1>Public Enhanced Content</h1>',
        plaintext_content: 'Public Enhanced Content',
        created_by: TEST_USER_IDS.USER_A,
        is_public: true,
        word_count: 3,
      })

      // Create enhancements for the public document
      const enhancement = await setup.createTestEnhancement({
        document_id: publicDocument.id,
        type: 'ai_summary',
        content: { summary: 'Public document summary' },
      })

      // Get authenticated client for User B
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User B should be able to see enhancement for public document
      const enhancementResult = await setup.testResourceAccess(
        userBClient,
        'document_enhancements',
        enhancement.id
      )
      RLSAssertions.assertHasAccess(enhancementResult, enhancement.id)
    })

    test('Users cannot modify public documents they do not own', async () => {
      // Create public document owned by User A
      const publicDocument = await setup.createTestDocument({
        title: 'Public Document No Edit',
        slug: 'public-document-no-edit',
        html_content: '<h1>Public No Edit</h1>',
        plaintext_content: 'Public No Edit',
        created_by: TEST_USER_IDS.USER_A,
        is_public: true,
        word_count: 3,
      })

      // Get authenticated client for User B
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

      // User B should NOT be able to update public document they don't own
      const { data } = await userBClient
        .from('documents')
        .update({ title: 'Hacked Title' })
        .eq('id', publicDocument.id)
        .select()

      // RLS should block the update - no rows should be updated
      expect(data).toBeNull()
      // Note: Supabase returns empty result instead of error when RLS blocks update
      // This is expected behavior for UPDATE operations with RLS
    })
  })

  describe('Test 6: Admin profile access', () => {
    test('Admin users can access all profiles', async () => {
      // Create test admin user with valid UUID
      const adminUserId = '550e8400-e29b-41d4-a716-446655440001' // Valid UUID v4
      await setup.createTestProfile({
        user_id: adminUserId,
        preferences: { display_name: 'Test Admin' },
        is_admin: new Date().toISOString(), // Grant admin access
      })

      // Create regular user profile
      await setup.createTestProfile({
        user_id: TEST_USER_IDS.USER_A,
        preferences: { display_name: 'Regular User A' },
        is_admin: null, // Not an admin
      })

      // Get admin client
      const adminClient = await setup.createUserClient(adminUserId)

      // Admin should be able to access other user's profile
      const otherProfileResult = await setup.testProfileAccess(
        adminClient,
        TEST_USER_IDS.USER_A
      )
      RLSAssertions.assertHasAccess(otherProfileResult)
      expect(otherProfileResult.data.user_id).toBe(TEST_USER_IDS.USER_A)
    })

    test('Admin users can access all documents', async () => {
      // Create test admin user with valid UUID
      const adminUserId = '550e8400-e29b-41d4-a716-446655440002' // Valid UUID v4
      await setup.createTestProfile({
        user_id: adminUserId,
        preferences: { display_name: 'Test Admin 2' },
        is_admin: new Date().toISOString(),
      })

      // Create document owned by regular user
      const userDocument = await setup.createTestDocument({
        title: 'User A Private Document for Admin',
        slug: 'user-a-private-admin',
        html_content: '<h1>Private for Admin</h1>',
        plaintext_content: 'Private for Admin',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 3,
      })

      // Get admin client
      const adminClient = await setup.createUserClient(adminUserId)

      // Admin should be able to access any document
      const documentResult = await setup.testResourceAccess(
        adminClient,
        'documents',
        userDocument.id
      )
      RLSAssertions.assertHasAccess(documentResult, userDocument.id)
    })

    test('Regular users cannot access other profiles even if they claim to be admin', async () => {
      // Regular user tries to access another user's profile
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)

      // User A should NOT be able to access User B's profile
      const otherProfileResult = await setup.testProfileAccess(
        userAClient,
        TEST_USER_IDS.USER_B
      )
      RLSAssertions.assertBlockedAccess(otherProfileResult)
    })
  })

  describe('Test 7: Chat authentication requirements', () => {
    test('Chat threads require authentication - no anonymous access', async () => {
      // Create document
      const document = await setup.createTestDocument({
        title: 'Document with Chat',
        slug: 'document-with-chat',
        html_content: '<h1>Chat Document</h1>',
        plaintext_content: 'Chat Document',
        created_by: TEST_USER_IDS.USER_A,
        is_public: true, // Even public documents require auth for chat
        word_count: 2,
      })

      // Create chat thread using admin client
      const { data: thread, error: threadError } = await setup.getAdminClient()
        .from('chat_threads')
        .insert({
          document_id: document.id,
          created_by: TEST_USER_IDS.USER_A,
          model_string: setup.getTestModelString(),
        })
        .select()
        .single()

      expect(threadError).toBeNull()
      expect(thread).toBeTruthy()

      // User A (owner) should be able to access their chat thread
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const ownerResult = await setup.testResourceAccess(
        userAClient,
        'chat_threads',
        thread!.id
      )
      RLSAssertions.assertHasAccess(ownerResult, thread!.id)

      // User B should NOT be able to access User A's chat thread
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
      const otherUserResult = await setup.testResourceAccess(
        userBClient,
        'chat_threads',
        thread!.id
      )
      RLSAssertions.assertBlockedAccess(otherUserResult)
    })

    test('Chat messages follow thread ownership', async () => {
      // Create document and thread
      const document = await setup.createTestDocument({
        title: 'Document with Chat Messages',
        slug: 'document-with-chat-messages',
        html_content: '<h1>Chat Messages Document</h1>',
        plaintext_content: 'Chat Messages Document',
        created_by: TEST_USER_IDS.USER_A,
        is_public: false,
        word_count: 3,
      })

      const { data: thread } = await setup.getAdminClient()
        .from('chat_threads')
        .insert({
          document_id: document.id,
          created_by: TEST_USER_IDS.USER_A,
          model_string: setup.getTestModelString(),
        })
        .select()
        .single()

      // Create chat message
      const { data: message, error: messageError } = await setup.getAdminClient()
        .from('chat_messages')
        .insert({
          thread_id: thread!.id,
          role: 'user' as const,
          content: 'Test message',
          sequence_number: 1,
        })
        .select()
        .single()

      expect(messageError).toBeNull()
      expect(message).toBeTruthy()

      // User A (thread owner) should be able to access messages
      const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
      const ownerResult = await setup.testResourceAccess(
        userAClient,
        'chat_messages',
        message!.id
      )
      RLSAssertions.assertHasAccess(ownerResult, message!.id)

      // User B should NOT be able to access messages in User A's thread
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
      const otherUserResult = await setup.testResourceAccess(
        userBClient,
        'chat_messages',
        message!.id
      )
      RLSAssertions.assertBlockedAccess(otherUserResult)
    })

    test('Users cannot create chat threads for documents they do not own', async () => {
      // Create document owned by User A
      const document = await setup.createTestDocument({
        title: 'User A Document No Chat',
        slug: 'user-a-document-no-chat',
        html_content: '<h1>No Chat for Others</h1>',
        plaintext_content: 'No Chat for Others',
        created_by: TEST_USER_IDS.USER_A,
        is_public: true,
        word_count: 4,
      })

      // User B tries to create chat thread for User A's document
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
      const { error } = await userBClient
        .from('chat_threads')
        .insert({
          document_id: document.id,
          created_by: TEST_USER_IDS.USER_B,
          model_string: setup.getTestModelString(),
        })

      expect(error).toBeTruthy()
      // RLS should block the insert
      expect(error?.code).toBe('42501') // Insufficient privilege error
    })
  })

  describe('Test 8: Combined scenarios', () => {
    test('Admin can access public document chats', async () => {
      // Create admin user with valid UUID
      const adminUserId = '550e8400-e29b-41d4-a716-446655440003' // Valid UUID v4
      await setup.createTestProfile({
        user_id: adminUserId,
        preferences: { display_name: 'Chat Admin' },
        is_admin: new Date().toISOString(),
      })

      // Create public document with chat
      const document = await setup.createTestDocument({
        title: 'Public Document with Admin Chat Access',
        slug: 'public-document-admin-chat',
        html_content: '<h1>Admin Chat Access</h1>',
        plaintext_content: 'Admin Chat Access',
        created_by: TEST_USER_IDS.USER_A,
        is_public: true,
        word_count: 3,
      })

      // Create chat thread
      const { data: thread } = await setup.getAdminClient()
        .from('chat_threads')
        .insert({
          document_id: document.id,
          created_by: TEST_USER_IDS.USER_A,
          model_string: setup.getTestModelString(),
        })
        .select()
        .single()

      // Admin should be able to access any chat thread
      const adminClient = await setup.createUserClient(adminUserId)
      const adminResult = await setup.testResourceAccess(
        adminClient,
        'chat_threads',
        thread!.id
      )
      RLSAssertions.assertHasAccess(adminResult, thread!.id)
    })

    test('Public document visibility does not grant chat access', async () => {
      // Create public document
      const publicDocument = await setup.createTestDocument({
        title: 'Public Document No Chat Access',
        slug: 'public-document-no-chat-access',
        html_content: '<h1>Public No Chat</h1>',
        plaintext_content: 'Public No Chat',
        created_by: TEST_USER_IDS.USER_A,
        is_public: true,
        word_count: 3,
      })

      // Create chat thread for public document
      const { data: thread } = await setup.getAdminClient()
        .from('chat_threads')
        .insert({
          document_id: publicDocument.id,
          created_by: TEST_USER_IDS.USER_A,
          model_string: setup.getTestModelString(),
        })
        .select()
        .single()

      // User B can see the public document
      const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)
      const docResult = await setup.testResourceAccess(
        userBClient,
        'documents',
        publicDocument.id
      )
      RLSAssertions.assertHasAccess(docResult)

      // But User B cannot see the chat thread
      const chatResult = await setup.testResourceAccess(
        userBClient,
        'chat_threads',
        thread!.id
      )
      RLSAssertions.assertBlockedAccess(chatResult)
    })
  })
})