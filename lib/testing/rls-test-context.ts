/**
 * DEPRECATED: Multi-User RLS Testing Context Management
 * 
 * This file is DEPRECATED and should not be used for new development.
 * 
 * REPLACEMENT: Use `/lib/testing/rls-database-test-utils.ts` with `RLSTestDatabase` class instead.
 * 
 * REASON FOR DEPRECATION:
 * - This simulation-based approach doesn't actually test real RLS policies
 * - It provides false confidence by mocking user contexts instead of using real authentication
 * - Complex infrastructure that's hard to maintain and prone to failures
 * - Real RLS testing discovered critical security vulnerabilities that this approach missed
 * 
 * MIGRATION PATH:
 * - Replace usage with RLSTestDatabase class for real database-level RLS testing
 * - See `docs/reference/TESTING_DATABASE.md` for comprehensive real RLS testing guide
 * - New approach is faster, more reliable, and provides genuine security validation
 * 
 * This file is kept temporarily for reference but will be removed in a future cleanup.
 * 
 * @deprecated Use RLSTestDatabase class instead
 */

import type { User } from '@supabase/supabase-js'

// Test user fixtures for consistent RLS testing
// Uses existing users from seed.sql for database compatibility
export const TEST_USERS = {
  USER_A: {
    id: '00000000-0000-0000-0000-000000000001', // System user from seed.sql
    email: 'system@spideryarn.internal',
    aud: 'authenticated' as const,
    role: 'authenticated' as const,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: { display_name: 'Test User A' },
  },
  USER_B: {
    id: '7bfcabea-690c-4754-936d-1a194f4244c2', // Greg's test user from seed.sql
    email: 'greg@gregdetre.com',
    aud: 'authenticated' as const,
    role: 'authenticated' as const,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: { display_name: 'Test User B' },
  },
  // Using only two users for RLS testing - this covers all isolation scenarios
  USER_C: {
    id: '00000000-0000-0000-0000-000000000001', // Alias to USER_A for backward compatibility
    email: 'system@spideryarn.internal',
    aud: 'authenticated' as const,
    role: 'authenticated' as const,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: { display_name: 'Test User C' },
  },
  ADMIN_USER: {
    id: '7bfcabea-690c-4754-936d-1a194f4244c2', // Alias to USER_B for backward compatibility
    email: 'greg@gregdetre.com',
    aud: 'authenticated' as const,
    role: 'authenticated' as const,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: { role: 'admin' },
    user_metadata: { display_name: 'Test Admin User', is_admin: true },
  }
} satisfies Record<string, User>

// Type for test user keys
export type TestUserKey = keyof typeof TEST_USERS

// Global context for tracking current test user
let currentTestUser: User | null = null
let originalSupabaseAuth: unknown = null

/**
 * Mock Supabase auth to return the current test user
 */
export function mockSupabaseAuth(user: User | null) {
  const mockAuth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { 
        session: user ? {
          access_token: `mock-token-${user.id}`,
          refresh_token: `mock-refresh-${user.id}`,
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user,
        } : null 
      },
      error: null,
    }),
  }

  // Store original if not already stored
  if (!originalSupabaseAuth) {
    originalSupabaseAuth = jest.requireActual('@/lib/supabase/client')
  }

  // Mock the createClient function (client-side returns synchronously)
  jest.doMock('@/lib/supabase/client', () => ({
    createClient: jest.fn(() => ({
      auth: mockAuth,
      from: jest.fn(() => ({
        select: jest.fn(() => ({ eq: jest.fn(() => ({ data: [], error: null })) })),
        insert: jest.fn(() => ({ data: [], error: null })),
        update: jest.fn(() => ({ data: [], error: null })),
        delete: jest.fn(() => ({ data: [], error: null })),
        upsert: jest.fn(() => ({ data: [], error: null })),
      })),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn(() => ({ data: { path: 'mock-path' }, error: null })),
          download: jest.fn(() => ({ data: new Blob(), error: null })),
          remove: jest.fn(() => ({ data: [], error: null })),
        })),
      },
    })),
  }))

  currentTestUser = user
  return mockAuth
}

/**
 * Execute a test function with a specific user context
 * 
 * @param userKey - Test user to authenticate as (or null for unauthenticated)
 * @param testFn - Test function to execute
 * @returns Promise resolving to test function result
 */
export async function withUserContext<T>(
  userKey: TestUserKey | null,
  testFn: () => Promise<T>
): Promise<T> {
  const user = userKey ? TEST_USERS[userKey] : null
  
  // Set up user context
  mockSupabaseAuth(user)
  
  try {
    // Execute test function with user context
    const result = await testFn()
    return result
  } finally {
    // Clean up is handled by individual test cleanup
  }
}

/**
 * Execute a test function with User A context (convenience method)
 */
export function withUserA<T>(testFn: () => Promise<T>): Promise<T> {
  return withUserContext('USER_A', testFn)
}

/**
 * Execute a test function with User B context (convenience method)
 */
export function withUserB<T>(testFn: () => Promise<T>): Promise<T> {
  return withUserContext('USER_B', testFn)
}

/**
 * Execute a test function with unauthenticated context (convenience method)
 */
export function withUnauthenticated<T>(testFn: () => Promise<T>): Promise<T> {
  return withUserContext(null, testFn)
}

/**
 * Get the currently set test user
 */
export function getCurrentTestUser(): User | null {
  return currentTestUser
}

/**
 * RLS isolation test helper - tests that User A cannot access User B's resources
 * 
 * @param createResourceAsUserA - Function to create a resource as User A
 * @param accessResourceAsUserB - Function to try accessing the resource as User B  
 * @param expectation - What User B should see ('null', 'empty', or 'error')
 */
export async function testUserIsolation<TResource>(
  createResourceAsUserA: () => Promise<TResource>,
  accessResourceAsUserB: (resource: TResource) => Promise<unknown>,
  expectation: 'null' | 'empty' | 'error' = 'null'
): Promise<void> {
  // Create resource as User A
  const resource = await withUserA(createResourceAsUserA)
  
  // Try to access as User B
  const result = await withUserB(() => accessResourceAsUserB(resource))
  
  // Verify isolation
  switch (expectation) {
    case 'null':
      expect(result).toBeNull()
      break
    case 'empty':
      expect(result).toEqual([])
      break
    case 'error':
      expect(result).toBeInstanceOf(Error)
      break
  }
}

/**
 * Cleanup function to restore original Supabase mocks
 * Call this in test cleanup (afterEach)
 */
export function cleanupRLSTestContext(): void {
  currentTestUser = null
  jest.restoreAllMocks()
  
  if (originalSupabaseAuth) {
    jest.doMock('@/lib/supabase/client', () => originalSupabaseAuth)
  }
}

/**
 * Test helper to verify document ownership patterns
 * 
 * @param documentService - Instance of DocumentService to test
 * @param testDocument - Document data to create
 */
export async function testDocumentOwnership(
  documentService: Record<string, unknown>,
  testDocument: Record<string, unknown>
): Promise<void> {
  await testUserIsolation(
    // User A creates document
    async () => {
      const doc = await (documentService as any).createForUser(TEST_USERS.USER_A.id, testDocument)
      return doc
    },
    // User B tries to access document
    async (document) => {
      const result = await (documentService as any).getById(document.id)
      return result
    },
    'null' // User B should see null due to RLS
  )
}

/**
 * Mock authentication for API route testing
 * 
 * @param userKey - User to authenticate API requests as
 * @returns Mock authentication headers for API requests
 */
export function mockApiAuth(userKey: TestUserKey | null): Record<string, string> {
  if (!userKey) {
    return {} // No auth headers for unauthenticated requests
  }
  
  const user = TEST_USERS[userKey]
  
  // Mock the server-side auth validation
  jest.doMock('@/lib/auth/server-auth', () => ({
    requireAuth: jest.fn().mockResolvedValue(user),
    getAuthUser: jest.fn().mockResolvedValue(user),
    assertAuth: jest.fn().mockResolvedValue({ success: !!user, user }),
    getUser: jest.fn().mockResolvedValue({ user, error: null }),
    getUserId: jest.fn().mockResolvedValue(user?.id ?? null),
    checkResourceOwnership: jest.fn().mockImplementation((ownerId: string) => {
      return Promise.resolve(ownerId === (user?.id ?? ''))
    }),
  }))
  
  return {
    'authorization': `Bearer mock-token-${user.id}`,
    'x-user-id': user.id, // For additional verification
  }
}

/**
 * Create a test scenario for cross-user access testing
 * 
 * @param scenario - Description of the test scenario
 * @param setup - Setup function run as User A
 * @param test - Test function run as User B
 * @param expectation - Expected result for User B
 */
export function createCrossUserTest<T>(
  scenario: string,
  setup: () => Promise<T>,
  test: (setupResult: T) => Promise<unknown>,
  expectation: 'null' | 'empty' | 'error' | 'success' = 'null'
) {
  return async () => {
    const setupResult = await withUserA(setup)
    const testResult = await withUserB(() => test(setupResult))
    
    switch (expectation) {
      case 'null':
        expect(testResult).toBeNull()
        break
      case 'empty':
        expect(Array.isArray(testResult) ? testResult : [testResult]).toEqual([])
        break
      case 'error':
        expect(testResult).toBeInstanceOf(Error)
        break
      case 'success':
        expect(testResult).toBeTruthy()
        break
    }
  }
}

// Export test user IDs for easy reference
export const TEST_USER_IDS = {
  USER_A: TEST_USERS.USER_A.id,
  USER_B: TEST_USERS.USER_B.id, 
  USER_C: TEST_USERS.USER_C.id,
  ADMIN: TEST_USERS.ADMIN_USER.id,
} as const