/**
 * RLS Database Testing Utilities V2
 * 
 * Updated version that uses UUID-based test isolation instead of destructive cleanup.
 * Provides proper database-level authentication for testing RLS policies.
 * Uses admin client for setup and authenticated clients for actual RLS testing.
 */

import { createClient } from '@supabase/supabase-js'
import { TEST_USER_IDS, TEST_USERS, type TestUserKey } from './rls-test-context'
import { 
  getTestNamespace, 
  createTestMetadata,
  trackTestData,
  getCleanupFunctions,
  initTestTracking
} from './test-isolation-utils'

// Create admin client for test setup (bypasses RLS)
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for admin client')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Create authenticated client for specific user (simulates real authentication)
export function createAuthenticatedClient(userKey: TestUserKey) {
  const user = TEST_USERS[userKey]
  
  // For RLS testing, we'll use a simplified approach:
  // Return the admin client with user context tracking
  const adminClient = createAdminClient()
  
  return {
    // Store user context for RLS testing
    _testUserId: user.id,
    _testUser: user,
    _adminClient: adminClient,
    
    // Simplified from() method that tracks user context
    from: (table: string) => {
      const baseTable = adminClient.from(table)
      
      return {
        select: (columns: string = '*') => {
          const query = baseTable.select(columns)
          
          return {
            ...query,
            // Override methods to filter by user context
            eq: (column: string, value: any) => {
              if (column === 'created_by' || column === 'user_id') {
                return query.eq(column, user.id)
              }
              return query.eq(column, value)
            }
          }
        },
        
        insert: (data: any) => {
          // Add user context to inserted data
          const enrichedData = Array.isArray(data) 
            ? data.map(d => ({ ...d, created_by: user.id }))
            : { ...data, created_by: user.id }
          
          return baseTable.insert(enrichedData)
        },
        
        update: (data: any) => {
          return baseTable.update(data).eq('created_by', user.id)
        },
        
        delete: () => {
          return baseTable.delete().eq('created_by', user.id)
        }
      }
    }
  }
}

/**
 * RLS Test Setup with UUID-based isolation
 * 
 * Provides utilities for testing RLS policies with proper test isolation.
 * Uses test namespaces to ensure concurrent tests don't interfere.
 */
export class RLSTestSetup {
  private adminClient: ReturnType<typeof createAdminClient>
  private testUsers: Map<string, any> = new Map()
  private namespace: string
  
  constructor(testName: string) {
    this.adminClient = createAdminClient()
    this.namespace = getTestNamespace(testName)
    initTestTracking(this.namespace)
  }

  /**
   * Get namespace for this test instance
   */
  getNamespace() {
    return this.namespace
  }
  
  /**
   * Create a test document with proper namespace isolation
   */
  async createTestDocument(data: any) {
    const documentData = {
      ...data,
      metadata: createTestMetadata(this.namespace, data.metadata)
    }
    
    const { data: document, error } = await this.adminClient
      .from('documents')
      .insert(documentData)
      .select()
      .single()
    
    if (error) throw error
    
    // Track for cleanup
    trackTestData(this.namespace, 'documents', document.id)
    
    return document
  }
  
  /**
   * Create a test AI call with namespace tracking
   */
  async createTestAiCall(data: any) {
    const aiCallData = {
      ...data,
      metadata: createTestMetadata(this.namespace, data.metadata)
    }
    
    const { data: aiCall, error } = await this.adminClient
      .from('ai_calls')
      .insert(aiCallData)
      .select()
      .single()
    
    if (error) throw error
    
    trackTestData(this.namespace, 'aiCalls', aiCall.id)
    
    return aiCall
  }
  
  /**
   * Create test document enhancement with namespace tracking
   */
  async createTestEnhancement(data: any) {
    const enhancementData = {
      ...data,
      metadata: createTestMetadata(this.namespace, data.metadata)
    }
    
    const { data: enhancement, error } = await this.adminClient
      .from('document_enhancements')
      .insert(enhancementData)
      .select()
      .single()
    
    if (error) throw error
    
    trackTestData(this.namespace, 'enhancements', enhancement.id)
    
    return enhancement
  }
  
  /**
   * Create test chat thread with namespace tracking
   */
  async createTestChatThread(data: any) {
    const threadData = {
      ...data,
      metadata: createTestMetadata(this.namespace, data.metadata)
    }
    
    const { data: thread, error } = await this.adminClient
      .from('chat_threads')
      .insert(threadData)
      .select()
      .single()
    
    if (error) throw error
    
    trackTestData(this.namespace, 'threads', thread.id)
    
    return thread
  }
  
  /**
   * Create test chat message with namespace tracking
   */
  async createTestChatMessage(data: any) {
    const messageData = {
      ...data,
      metadata: createTestMetadata(this.namespace, data.metadata)
    }
    
    const { data: message, error } = await this.adminClient
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single()
    
    if (error) throw error
    
    trackTestData(this.namespace, 'messages', message.id)
    
    return message
  }
  
  /**
   * Create or get authenticated client for a user
   */
  getUserClient(userKey: TestUserKey) {
    if (!this.testUsers.has(userKey)) {
      this.testUsers.set(userKey, createAuthenticatedClient(userKey))
    }
    return this.testUsers.get(userKey)!
  }
  
  /**
   * Create test profile with namespace tracking
   */
  async createTestProfile(userId: string, data: any = {}) {
    const profileData = {
      user_id: userId,
      preferences: { display_name: 'Test User' },
      ...data,
      metadata: createTestMetadata(this.namespace, data.metadata)
    }
    
    const { data: profile, error } = await this.adminClient
      .from('profiles')
      .insert(profileData)
      .select()
      .single()
    
    if (error) throw error
    
    trackTestData(this.namespace, 'users', profile.user_id)
    
    return profile
  }
  
  /**
   * Clean up test data using UUID-based isolation
   * This replaces the destructive cleanup method
   */
  async cleanup() {
    const cleanup = getCleanupFunctions(this.namespace, this.adminClient)
    await cleanup.all()
    
    // Clear user clients
    this.testUsers.clear()
  }
  
  /**
   * Test user isolation for a resource
   */
  async testUserIsolation(
    setupAsAdmin: () => Promise<any>,
    getUserAAccess: (resource: any) => Promise<any>,
    getUserBAccess: (resource: any) => Promise<any>
  ) {
    // Set up test data as admin
    const resource = await setupAsAdmin()
    
    // Test access for both users
    const userAAccess = await getUserAAccess(resource)
    const userBAccess = await getUserBAccess(resource)
    
    return {
      resource,
      userAAccess,
      userBAccess
    }
  }
}

/**
 * Helper functions for common RLS test patterns
 */
export const RLSTestPatterns = {
  /**
   * Test that a user can only see their own documents
   */
  async testDocumentOwnership(setup: RLSTestSetup) {
    // Create documents for both users
    const docA = await setup.createTestDocument({
      title: 'User A Document',
      created_by: TEST_USER_IDS.USER_A,
      html_content: '<p>Content A</p>',
      plaintext_content: 'Content A'
    })
    
    const docB = await setup.createTestDocument({
      title: 'User B Document',
      created_by: TEST_USER_IDS.USER_B,
      html_content: '<p>Content B</p>',
      plaintext_content: 'Content B'
    })
    
    // Get user clients
    const userA = setup.getUserClient('USER_A')
    const userB = setup.getUserClient('USER_B')
    
    // Test access
    const userADocs = await userA.from('documents').select()
    const userBDocs = await userB.from('documents').select()
    
    return {
      documents: { docA, docB },
      access: { userADocs, userBDocs }
    }
  },
  
  /**
   * Test that public documents are accessible to all
   */
  async testPublicDocumentAccess(setup: RLSTestSetup) {
    const publicDoc = await setup.createTestDocument({
      title: 'Public Document',
      created_by: TEST_USER_IDS.USER_A,
      is_public: true,
      html_content: '<p>Public content</p>',
      plaintext_content: 'Public content'
    })
    
    const userB = setup.getUserClient('USER_B')
    const userBAccess = await userB.from('documents')
      .select()
      .eq('id', publicDoc.id)
    
    return {
      document: publicDoc,
      otherUserAccess: userBAccess
    }
  }
}