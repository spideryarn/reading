/**
 * Real RLS Test Helpers
 * 
 * Infrastructure for testing actual Row Level Security policies using real Supabase authentication.
 * Replaces the simulated RLS approach with database-level testing.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'
import type { Database } from '@/lib/types/database-auto-generated'
import jwt from 'jsonwebtoken'

export type TestSupabaseClient = SupabaseClient<Database>

/**
 * Real RLS Test Setup Class
 * 
 * Uses actual Supabase authentication to test RLS policies at the database level.
 * Service role client for test data setup, authenticated clients for RLS validation.
 * 
 * IMPORTANT: This approach validates that RLS policies work correctly by ensuring
 * that tests FAIL when they should (access is correctly blocked). 
 * "Test failures" often indicate RLS is working as intended.
 */
export class RealRLSTestSetup {
  private adminClient: TestSupabaseClient
  private userClients: Map<string, TestSupabaseClient>

  constructor() {
    // Service role client for test setup (bypasses RLS)
    this.adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    this.userClients = new Map()
  }

  /**
   * Get admin client for test data setup
   * This client uses service role and bypasses RLS policies
   */
  getAdminClient(): TestSupabaseClient {
    return this.adminClient
  }

  /**
   * Create a JWT token for testing
   * This creates a valid JWT token that Supabase will recognize for authentication
   */
  private createTestJWT(userId: string): string {
    const secret = process.env.SUPABASE_JWT_SECRET!
    
    const payload = {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
      sub: userId,
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
    }
    
    return jwt.sign(payload, secret)
  }

  /**
   * Create an authenticated user client for RLS testing
   * 
   * This creates a real authenticated context using anon client + JWT token.
   * The RLS policies will see auth.uid() as the provided userId.
   * 
   * @param userId - User ID to authenticate as
   * @returns Client with user authentication context for RLS testing
   */
  async createUserClient(userId: string): Promise<TestSupabaseClient> {
    if (this.userClients.has(userId)) {
      return this.userClients.get(userId)!
    }

    // Create anon client (respects RLS policies)
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            'Authorization': `Bearer ${this.createTestJWT(userId)}`
          }
        }
      }
    )

    this.userClients.set(userId, client)
    return client
  }

  /**
   * Create test document with admin privileges
   * Used for setting up test data that bypasses RLS
   */
  async createTestDocument(data: Partial<Database['public']['Tables']['documents']['Insert']>) {
    // Generate unique slug to avoid conflicts
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(7)
    const uniqueSlug = `test-document-${timestamp}-${randomSuffix}`
    
    const { data: document, error } = await this.adminClient
      .from('documents')
      .insert({
        title: 'Test Document',
        html_content: '<h1>Test</h1>',
        plaintext_content: 'Test',
        is_public: false,
        word_count: 1,
        ...data,
        // Ensure slug is unique even if provided in data
        slug: data.slug ? `${data.slug}-${timestamp}-${randomSuffix}` : uniqueSlug
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test document: ${error.message}`)
    }

    return document
  }

  /**
   * Get a valid model string for testing
   */
  getTestModelString(): string {
    // Use a standard test model string instead of database lookup
    return 'anthropic:claude-3-5-haiku:20241022'
  }

  /**
   * Create test AI call with admin privileges
   */
  async createTestAICall(data: Partial<Database['public']['Tables']['ai_calls']['Insert']>) {
    // Use model string instead of model_id
    const modelString = data.model_string || this.getTestModelString()

    const { data: aiCall, error } = await this.adminClient
      .from('ai_calls')
      .insert({
        model_string: modelString,
        prompt_type: 'test',
        prompt_input: 'test prompt input',
        status: 'success',
        finish_reason: 'stop',
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        ...data
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test AI call: ${error.message}`)
    }

    return aiCall
  }

  /**
   * Create test document enhancement with admin privileges
   */
  async createTestEnhancement(data: Partial<Database['public']['Tables']['document_enhancements']['Insert']>) {
    // Ensure an AI call exists and is linked for referential integrity
    let aiCallId = data.ai_call_id

    // Auto-create a basic AI call if none provided
    if (!aiCallId) {
      // Derive prompt_type from enhancement type or fallback to 'test_enhancement'
      const promptType = typeof data.type === 'string' ? data.type : 'test_enhancement'

      // Attempt to infer document owner for more realistic test data
      let createdBy: string | null = null
      if (data.document_id) {
        const { data: doc } = await this.adminClient
          .from('documents')
          .select('created_by')
          .eq('id', data.document_id)
          .maybeSingle()

        createdBy = doc?.created_by ?? null
      }

      const aiCall = await this.createTestAICall({
        prompt_type: promptType,
        prompt_input: `Auto-generated test AI call for ${promptType}`,
        document_id: data.document_id || null,
        created_by: createdBy,
        finish_reason: 'stop',
        status: 'success',
        total_tokens: 0,
        completion_tokens: 0,
        prompt_tokens: 0,
      })

      aiCallId = aiCall.id
    }

    // Build insert payload ensuring ai_call_id is set once
    const insertPayload: Database['public']['Tables']['document_enhancements']['Insert'] = {
      // Spread user-supplied values first so our overrides take precedence
      ...data,
      document_id: data.document_id!,
      type: (data.type as string) || 'ai_headings',
      subtype: data.subtype || 'auto',
      content: data.content || { headings: [] },
      ai_call_id: aiCallId,
    }

    const { data: enhancement, error } = await this.adminClient
      .from('document_enhancements')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test enhancement: ${error.message}`)
    }

    return enhancement
  }

  /**
   * Get or create test profile with admin privileges
   * Uses upsert to handle existing profiles
   */
  async createTestProfile(data: Partial<Database['public']['Tables']['profiles']['Insert']>) {
    // First try to get existing profile
    const { data: existing } = await this.adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', data.user_id!)
      .maybeSingle()

    if (existing) {
      return existing
    }

    // If no existing profile, create one
    const { data: profile, error } = await this.adminClient
      .from('profiles')
      .insert({
        user_id: data.user_id!,
        preferences: { display_name: 'Test User' },
        ...data
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test profile: ${error.message}`)
    }

    return profile
  }

  /**
   * Test if a user can access a specific resource
   * Returns the data and access status for verification
   */
  async testResourceAccess(
    client: TestSupabaseClient,
    table: string,
    resourceId: string
  ): Promise<{ data: any; hasAccess: boolean; error: any }> {
    const { data, error } = await (client.from as any)(table)
      .select('*')
      .eq('id', resourceId)
      .single()

    // RLS typically returns PGRST116 error code when no rows match due to RLS filtering
    const hasAccess = !error && data !== null
    const isRLSBlock = error?.code === 'PGRST116'

    return {
      data: hasAccess ? data : null,
      hasAccess,
      error: isRLSBlock ? null : error // Don't treat RLS blocks as errors
    }
  }

  /**
   * Test user access to their own profile
   * Profiles use user_id as primary key, not id
   */
  async testProfileAccess(
    client: TestSupabaseClient,
    userId: string
  ): Promise<{ data: any; hasAccess: boolean; error: any }> {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle() // Use maybeSingle instead of single to handle missing records

    const hasAccess = !error && data !== null
    const isRLSBlock = error?.code === 'PGRST116'

    return {
      data: hasAccess ? data : null,
      hasAccess,
      error: isRLSBlock ? null : error
    }
  }

  /**
   * Clean up test clients and data
   */
  async cleanup(): Promise<void> {
    // Clear all user clients
    this.userClients.clear()

    // Note: We don't clean up test data here as it should be handled
    // by database transaction rollback or explicit cleanup in tests
  }
}

/**
 * RLS Test Assertions
 * 
 * Standardized assertions for validating RLS behavior
 */
export class RLSAssertions {
  /**
   * Assert that a user has access to a resource
   */
  static assertHasAccess(result: { hasAccess: boolean; data: any; error: any }, expectedId?: string) {
    expect(result.hasAccess).toBe(true)
    expect(result.data).not.toBeNull()
    expect(result.error).toBeNull()
    
    if (expectedId) {
      expect(result.data.id).toBe(expectedId)
    }
  }

  /**
   * Assert that a user is blocked from accessing a resource
   */
  static assertBlockedAccess(result: { hasAccess: boolean; data: any; error: any }) {
    expect(result.hasAccess).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toBeNull() // No error for RLS blocks
  }

  /**
   * Assert that a resource belongs to the expected owner
   */
  static assertOwnership(result: { data: any }, expectedOwnerId: string) {
    expect(result.data).toHaveProperty('created_by', expectedOwnerId)
  }

  /**
   * Assert that a list operation returns only user's own resources
   */
  static assertListIsolation(result: { data: any[] }, expectedCount: number) {
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data).toHaveLength(expectedCount)
  }
}

/**
 * Convenience functions for common test patterns
 */
export class RLSTestHelpers {
  /**
   * Test the complete ownership isolation pattern:
   * 1. User A creates resource
   * 2. User A can access it
   * 3. User B cannot access it
   */
  static async testOwnershipIsolation<T>(
    setup: RealRLSTestSetup,
    createResource: () => Promise<T>,
    testAccess: (client: TestSupabaseClient, resource: T) => Promise<{ hasAccess: boolean; data: any; error: any }>,
    getResourceId: (resource: T) => string
  ): Promise<void> {
    // Create resource with admin client
    const resource = await createResource()
    const resourceId = getResourceId(resource)

    // Create user clients
    const userAClient = await setup.createUserClient(TEST_USER_IDS.USER_A)
    const userBClient = await setup.createUserClient(TEST_USER_IDS.USER_B)

    // User A should have access to their resource
    const userAResult = await testAccess(userAClient, resource)
    RLSAssertions.assertHasAccess(userAResult, resourceId)

    // User B should be blocked from User A's resource
    const userBResult = await testAccess(userBClient, resource)
    RLSAssertions.assertBlockedAccess(userBResult)
  }
}