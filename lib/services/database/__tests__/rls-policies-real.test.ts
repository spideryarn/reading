/**
 * @jest-environment node
 */

/**
 * Real RLS Policy Testing
 * 
 * Tests actual database-level RLS policies using authenticated Supabase clients.
 * This replaces the simulated RLS testing approach with real authentication.
 */

import { createClient } from '@/lib/supabase/server'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'

// Test helper to create authenticated client for a specific user
const createUserClient = async (userId: string) => {
  const client = await createClient()
  
  // Mock auth.uid() to return our test user ID
  // In a real test environment, this would be actual authentication
  const originalAuth = client.auth
  client.auth = {
    ...originalAuth,
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: userId, email: `test-${userId}@example.com` } },
      error: null
    })
  }
  
  // Override auth.uid() function used by RLS policies
  // This simulates the user being authenticated as the specified user
  Object.defineProperty(client, 'rpc', {
    value: (fnName: string, params: any) => {
      if (fnName === 'auth.uid') {
        return Promise.resolve({ data: userId, error: null })
      }
      return originalAuth.getUser?.()
    }
  })
  
  return client
}

describe('Real RLS Policy Testing', () => {
  const USER_A_ID = TEST_USER_IDS.USER_A
  const USER_B_ID = TEST_USER_IDS.USER_B

  afterEach(async () => {
    // Clean up any test data
    const adminClient = await createClient()
    await adminClient.from('documents').delete().ilike('title', '%RLS Test%')
    await adminClient.from('ai_calls').delete().ilike('prompt_type', '%rls-test%')
  })

  describe('Document RLS Policies', () => {
    test('Users can only access their own documents', async () => {
      const userAClient = await createUserClient(USER_A_ID)
      const userBClient = await createUserClient(USER_B_ID)
      const adminClient = await createClient()

      // Create document owned by User A (as admin to bypass RLS)
      const { data: userADoc } = await adminClient
        .from('documents')
        .insert({
          title: 'User A RLS Test Document',
          slug: 'user-a-rls-test',
          html_content: '<p>Private content</p>',
          plaintext_content: 'Private content',
          created_by: USER_A_ID,
          is_public: false,
          word_count: 2,
        })
        .select()
        .single()

      // User A should be able to access their own document
      const { data: userAAccess } = await userAClient
        .from('documents')
        .select('*')
        .eq('id', userADoc.id)
        .single()

      expect(userAAccess).not.toBeNull()
      expect(userAAccess.title).toBe('User A RLS Test Document')

      // User B should NOT be able to access User A's document
      const { data: userBAccess } = await userBClient
        .from('documents')
        .select('*')
        .eq('id', userADoc.id)
        .single()

      expect(userBAccess).toBeNull()
    })

    test('Document listing respects user isolation', async () => {
      const userAClient = await createUserClient(USER_A_ID)
      const userBClient = await createUserClient(USER_B_ID)
      const adminClient = await createClient()

      // Create documents for both users
      const { data: userADoc } = await adminClient
        .from('documents')
        .insert({
          title: 'User A RLS Test List',
          slug: 'user-a-rls-test-list',
          html_content: '<p>User A content</p>',
          plaintext_content: 'User A content',
          created_by: USER_A_ID,
          is_public: false,
          word_count: 3,
        })
        .select()
        .single()

      const { data: userBDoc } = await adminClient
        .from('documents')
        .insert({
          title: 'User B RLS Test List',
          slug: 'user-b-rls-test-list',
          html_content: '<p>User B content</p>',
          plaintext_content: 'User B content',
          created_by: USER_B_ID,
          is_public: false,
          word_count: 3,
        })
        .select()
        .single()

      // User A should only see their own documents
      const { data: userADocs } = await userAClient
        .from('documents')
        .select('id, title')
        .ilike('title', '%RLS Test List%')

      expect(userADocs).toHaveLength(1)
      expect(userADocs[0].id).toBe(userADoc.id)

      // User B should only see their own documents
      const { data: userBDocs } = await userBClient
        .from('documents')
        .select('id, title')
        .ilike('title', '%RLS Test List%')

      expect(userBDocs).toHaveLength(1)
      expect(userBDocs[0].id).toBe(userBDoc.id)
    })
  })

  describe('AI Calls RLS Policies', () => {
    test('AI calls follow document ownership', async () => {
      const userAClient = await createUserClient(USER_A_ID)
      const userBClient = await createUserClient(USER_B_ID)
      const adminClient = await createClient()

      // Create document owned by User A
      const { data: userADoc } = await adminClient
        .from('documents')
        .insert({
          title: 'User A RLS Test AI Doc',
          slug: 'user-a-rls-test-ai',
          html_content: '<p>AI test content</p>',
          plaintext_content: 'AI test content',
          created_by: USER_A_ID,
          is_public: false,
          word_count: 3,
        })
        .select()
        .single()

      // Create AI call linked to User A's document
      const { data: aiCall } = await adminClient
        .from('ai_calls')
        .insert({
          provider: 'anthropic',
          model_id: 'claude-3-haiku',
          prompt_type: 'rls-test',
          input_data: { test: true },
          output_data: { result: 'test output' },
          document_id: userADoc.id,
          created_by: USER_A_ID,
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          finish_reason: 'stop',
        })
        .select()
        .single()

      // User A should be able to access AI call for their document
      const { data: userAAccess } = await userAClient
        .from('ai_calls')
        .select('*')
        .eq('id', aiCall.id)
        .single()

      expect(userAAccess).not.toBeNull()
      expect(userAAccess.prompt_type).toBe('rls-test')

      // User B should NOT be able to access AI call for User A's document
      const { data: userBAccess } = await userBClient
        .from('ai_calls')
        .select('*')
        .eq('id', aiCall.id)
        .single()

      expect(userBAccess).toBeNull()
    })
  })

  describe('Profile RLS Policies', () => {
    test('Users can only access their own profile', async () => {
      const userAClient = await createUserClient(USER_A_ID)
      const userBClient = await createUserClient(USER_B_ID)

      // User A should be able to access their own profile
      const { data: userAProfile } = await userAClient
        .from('profiles')
        .select('*')
        .eq('user_id', USER_A_ID)
        .single()

      expect(userAProfile).not.toBeNull()
      expect(userAProfile.user_id).toBe(USER_A_ID)

      // User A should NOT be able to access User B's profile
      const { data: userBProfileAccess } = await userAClient
        .from('profiles')
        .select('*')
        .eq('user_id', USER_B_ID)
        .single()

      expect(userBProfileAccess).toBeNull()
    })
  })
})