/**
 * ❌ DEPRECATED: RLS Database Testing Utilities
 * 
 * ⚠️  WARNING: This file is deprecated and should not be used for new tests.
 * 
 * **REPLACEMENT**: Use `@/lib/services/database/__tests__/rls-test-helpers.ts` instead.
 * 
 * **WHY DEPRECATED**: 
 * This implementation used client-side JavaScript filtering to simulate RLS policies
 * rather than testing actual database-level security. This approach was fundamentally
 * flawed because:
 * 
 * 1. **False Security Confidence**: Tests could pass while real RLS policies were broken
 * 2. **Complex Simulation Logic**: Required duplicating RLS logic in test code
 * 3. **Maintenance Burden**: Simulation logic had to be kept in sync with real policies
 * 4. **Missing Critical Bugs**: Failed to catch a serious security vulnerability in AI calls policy
 * 
 * **SECURITY ISSUE DISCOVERED**: During migration to real RLS testing, we discovered
 * that this simulation approach missed a critical vulnerability where any user could
 * access any document-independent AI call created by any other user. The real RLS
 * testing implementation caught this immediately.
 * 
 * **MIGRATION GUIDE**: 
 * Replace imports like:
 *   `import { RLSTestSetup } from '@/lib/testing/rls-database-test-utils'`
 * With:
 *   `import { RealRLSTestSetup } from '@/lib/services/database/__tests__/rls-test-helpers'`
 * 
 * See docs/reference/AUTHENTICATION_TESTING.md for complete migration examples.
 * 
 * **REMOVAL TIMELINE**: This file will be deleted in a future cleanup once all
 * references have been migrated to the real RLS testing approach.
 * 
 * @deprecated Use RealRLSTestSetup from rls-test-helpers.ts instead
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { TEST_USER_IDS, TEST_USERS, type TestUserKey } from './rls-test-context'
import type { Database } from '@/lib/types/database-auto-generated'

// Create admin client for test setup (bypasses RLS)
/** @deprecated Use RealRLSTestSetup.getAdminClient() instead */
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
/** @deprecated Use RealRLSTestSetup.createUserClient() instead */
export function createAuthenticatedClient(userKey: TestUserKey) {
  const user = TEST_USERS[userKey]
  const adminClient = createAdminClient()
  
  // ⚠️ SIMPLIFIED DEPRECATED IMPLEMENTATION
  // This no longer attempts to simulate complex RLS logic
  // Use RealRLSTestSetup for actual RLS testing
  return {
    _testUserId: user.id,
    _testUser: user,
    _adminClient: adminClient,
    from: adminClient.from.bind(adminClient),
    rpc: adminClient.rpc.bind(adminClient),
    auth: adminClient.auth,
    storage: adminClient.storage,
  }
}

// ⚠️ REMOVED: Complex simulation logic
// The complex filterDataByOwnership and shouldUserSeeRecord functions have been
// removed because they provided false confidence in security testing.
// Use RealRLSTestSetup for actual database-level RLS testing.

/**
 * Test setup class for RLS policy testing
 * @deprecated Use RealRLSTestSetup from rls-test-helpers.ts instead
 */
export class RLSTestSetup {
  private adminClient: SupabaseClient
  private testUsers: Map<TestUserKey, ReturnType<typeof createAuthenticatedClient>> = new Map()
  private usersCreated: boolean = false

  constructor() {
    this.adminClient = createAdminClient()
  }

  /**
   * Ensure test users exist in the database
   * Creates both auth.users entries and profiles
   */
  async ensureTestUsers() {
    if (this.usersCreated) return

    // Create auth.users entries for test users
    const testUsers = [
      {
        id: TEST_USER_IDS.USER_A,
        email: 'system@spideryarn.internal',
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
      },
      {
        id: TEST_USER_IDS.USER_B,
        email: 'greg@gregdetre.com',
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
      },
    ]

    // Create auth users
    for (const userData of testUsers) {
      try {
        await this.createTestUser(userData)
      } catch (error: unknown) {
        // Ignore duplicate key errors (user already exists)
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage?.includes('duplicate key') && !errorMessage?.includes('already exists')) {
          console.warn(`Failed to create test user ${userData.id}:`, errorMessage)
        }
      }
    }

    // Create test profiles for our test user IDs if they don't exist
    const testProfiles = [
      { user_id: TEST_USER_IDS.USER_A, preferences: { test_user: 'A' } },
      { user_id: TEST_USER_IDS.USER_B, preferences: { test_user: 'B' } },
    ]

    for (const profileData of testProfiles) {
      try {
        await this.createTestProfile(profileData)
      } catch (error: unknown) {
        // Ignore duplicate key errors (profile already exists)
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage?.includes('duplicate key') && !errorMessage?.includes('already exists')) {
          console.warn(`Failed to create test profile ${profileData.user_id}:`, errorMessage)
        }
      }
    }

    this.usersCreated = true
  }

  /**
   * Get a valid model string for testing
   * @deprecated Use direct model string: 'anthropic:claude-3-5-haiku:20241022'
   */
  getTestModelString(): string {
    return 'anthropic:claude-3-5-haiku:20241022'
  }

  /**
   * Get admin client for test setup (bypasses RLS)
   */
  getAdminClient() {
    return this.adminClient
  }

  /**
   * Get authenticated client for specific user
   */
  getUserClient(userKey: TestUserKey) {
    if (!this.testUsers.has(userKey)) {
      this.testUsers.set(userKey, createAuthenticatedClient(userKey))
    }
    return this.testUsers.get(userKey)!
  }

  /**
   * Create test data as admin (bypasses RLS for setup)
   */
  async createTestDocument(data: Database['public']['Tables']['documents']['Insert']) {
    // Ensure test users exist before creating documents
    await this.ensureTestUsers()
    
    const { data: document, error } = await this.adminClient
      .from('documents')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return document
  }

  /**
   * Create test AI call as admin
   */
  async createTestAICall(data: Database['public']['Tables']['ai_calls']['Insert']) {
    // Ensure test users exist before creating AI calls
    await this.ensureTestUsers()

    // Use model_string instead of model_id
    const modelString = data.model_string || 'anthropic:claude-3-5-haiku:20241022'

    // Map test data to actual schema
    const mappedData = {
      id: data.id,
      model_string: modelString,
      document_id: data.document_id,
      created_by: data.created_by,
      prompt_type: data.prompt_type,
      prompt_template: data.prompt_template || null,
      prompt_input: data.prompt_input || JSON.stringify({ test: true }),
      response_text: data.response_text || JSON.stringify({ result: 'test' }),
      status: data.status || 'completed',
      error_message: data.error_message || null,
      error_code: data.error_code || null,
      prompt_tokens: data.prompt_tokens || 10,
      completion_tokens: data.completion_tokens || 5,
      total_tokens: data.total_tokens || 15,
      reasoning_tokens: data.reasoning_tokens || null,
      latency_ms: data.latency_ms || 1000,
      finish_reason: data.finish_reason || 'stop',
      extra: data.extra || {},
      extra_usage: data.extra_usage || null,
      completed_at: data.completed_at || new Date().toISOString()
    }

    const { data: aiCall, error } = await this.adminClient
      .from('ai_calls')
      .insert(mappedData)
      .select()
      .single()

    if (error) throw error
    return aiCall
  }

  /**
   * Create test enhancement as admin
   */
  async createTestEnhancement(data: Database['public']['Tables']['document_enhancements']['Insert']) {
    // Ensure test users exist before creating enhancements
    await this.ensureTestUsers()

    const { data: enhancement, error } = await this.adminClient
      .from('document_enhancements')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return enhancement
  }

  /**
   * Create test user in auth.users table (as admin)
   * For now, we'll just ensure the user exists by checking and warning if not
   */
  async createTestUser(data: { id: string; email: string }) {
    // For RLS testing, we'll assume the seed data creates the necessary users
    // If users don't exist, the foreign key constraints will fail which is expected
    console.log(`Test user setup: ${data.id} (${data.email})`)
    return { id: data.id, email: data.email }
  }

  /**
   * Create test profile as admin
   */
  async createTestProfile(data: Database['public']['Tables']['profiles']['Insert']) {
    const { data: profile, error } = await this.adminClient
      .from('profiles')
      .upsert(data)
      .select()
      .single()

    if (error) throw error
    return profile
  }

  /**
   * Clean up test data (as admin)
   */
  async cleanup() {
    // Clean up in reverse dependency order
    await this.adminClient.from('document_enhancements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await this.adminClient.from('ai_calls').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await this.adminClient.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await this.adminClient.from('chat_threads').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await this.adminClient.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    // Reset user clients
    this.testUsers.clear()
  }

  // ⚠️ REMOVED: testUserIsolation method
  // Use RLSTestHelpers.testOwnershipIsolation() from rls-test-helpers.ts instead
}

/**
 * Helper functions for common RLS test patterns
 * @deprecated Use RLSTestHelpers from rls-test-helpers.ts instead
 */
export const RLSTestHelpers = {
  /**
   * Test that user can access their own resource
   */
  async testOwnerAccess(client: SupabaseClient, table: string, resourceId: string) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq('id', resourceId)
      .single()

    return { data, error, hasAccess: !!data && !error }
  },

  /**
   * Test that user cannot access other user's resource
   */
  async testNonOwnerBlocked(client: SupabaseClient, table: string, resourceId: string) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq('id', resourceId)
      .single()

    // Should return null data (blocked by RLS) or specific error
    return { data, error, isBlocked: !data || !!error }
  },

  /**
   * Test document creation with proper ownership
   */
  async testDocumentCreation(client: SupabaseClient, documentData: Database['public']['Tables']['documents']['Insert'], expectedOwnerId: string) {
    const { data, error } = await client
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    const hasCorrectOwnership = data?.created_by === expectedOwnerId
    return { data, error, hasCorrectOwnership }
  },

  /**
   * Test list queries respect RLS (user only sees their own data)
   */
  async testListIsolation(client: SupabaseClient, table: string, expectedOwnerId: string) {
    const { data, error } = await client
      .from(table)
      .select('*')

    const allOwnedByUser = data?.every((item: Record<string, unknown>) => 
      item.created_by === expectedOwnerId || item.user_id === expectedOwnerId
    )

    return { data, error, allOwnedByUser, count: data?.length || 0 }
  }
}

/**
 * Enhanced test assertions for RLS testing
 * @deprecated Use RLSAssertions from rls-test-helpers.ts instead
 */
export const RLSAssertions = {
  /**
   * Assert that access is properly granted to owner
   */
  assertOwnerAccess(result: { hasAccess: boolean; data: Record<string, unknown> | null; error: unknown }, resourceId: string) {
    expect(result.hasAccess).toBe(true)
    expect(result.data).not.toBeNull()
    expect(result.data?.id).toBe(resourceId)
    expect(result.error).toBeNull()
  },

  /**
   * Assert that access is properly blocked for non-owner
   */
  assertNonOwnerBlocked(result: { isBlocked: boolean; data: unknown }) {
    expect(result.isBlocked).toBe(true)
    expect(result.data).toBeNull()
  },

  /**
   * Assert proper ownership assignment
   */
  assertOwnership(result: { hasCorrectOwnership: boolean; data: Record<string, unknown> | null }, expectedOwnerId: string) {
    expect(result.hasCorrectOwnership).toBe(true)
    expect(result.data).not.toBeNull()
    expect((result.data?.created_by || result.data?.user_id)).toBe(expectedOwnerId)
  },

  /**
   * Assert list isolation (user only sees own data)
   */
  assertListIsolation(result: { allOwnedByUser: boolean; count: number; error: unknown }, expectedMinCount: number = 0) {
    expect(result.allOwnedByUser).toBe(true)
    expect(result.count).toBeGreaterThanOrEqual(expectedMinCount)
    expect(result.error).toBeNull()
  },

  /**
   * Assert complete isolation between users
   */
  assertUserIsolation(userAResult: { hasAccess?: boolean; hasCorrectOwnership?: boolean }, userBResult: { isBlocked?: boolean; hasAccess?: boolean }) {
    // User A should have access
    expect(userAResult.hasAccess || userAResult.hasCorrectOwnership).toBe(true)
    
    // User B should be blocked
    expect(userBResult.isBlocked || !userBResult.hasAccess).toBe(true)
  }
}