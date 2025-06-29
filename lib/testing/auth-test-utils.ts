/**
 * Authentication Test Utilities
 * 
 * Provides standardized authentication mocking for API route tests using next-test-api-route-handler.
 * Designed to work with the shared database testing approach while providing consistent user fixtures.
 */

import { type User } from '@supabase/supabase-js'
import { getAuthUser, requireAuth, assertAuth } from '@/lib/auth/server-auth'

/**
 * Test user fixture with all required properties for authentication testing
 */
export interface TestUser {
  id: string
  email: string
  email_confirmed_at?: string
  last_sign_in_at?: string
  created_at?: string
  updated_at?: string
  app_metadata?: {
    provider?: string
    providers?: string[]
  }
  user_metadata?: {
    name?: string
    email?: string
  }
  aud?: string
  role?: string
}

/**
 * Creates a test user fixture with UUID-based isolation
 * Uses namespace to ensure test isolation in shared database environment
 */
export function createTestUser(namespace?: string): TestUser {
  const testId = namespace ? `${namespace}-user-${Math.random().toString(36).slice(2, 8)}` : `test-user-${Math.random().toString(36).slice(2, 8)}`
  const email = `${testId}@test.example.com`
  
  return {
    id: testId,
    email,
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {
      provider: 'email',
      providers: ['email']
    },
    user_metadata: {
      name: `Test User ${testId}`,
      email
    },
    aud: 'authenticated',
    role: 'authenticated'
  }
}

/**
 * Creates an anonymous (unauthenticated) user fixture for testing unauthorized scenarios
 */
export function createAnonymousUser(): null {
  return null
}

/**
 * Mocks the getAuthUser function to return a user or null
 * Should be called before running API route tests that require authentication
 */
export function mockGetAuthUser(user: TestUser | null = null): void {
  const mockUser = user as User | null
  
  // Mock getAuthUser
  ;(getAuthUser as jest.MockedFunction<typeof getAuthUser>).mockResolvedValue(mockUser)
  
  // Mock requireAuth
  if (mockUser) {
    ;(requireAuth as jest.MockedFunction<typeof requireAuth>).mockResolvedValue(mockUser)
  } else {
    ;(requireAuth as jest.MockedFunction<typeof requireAuth>).mockRejectedValue(new Error('Authentication required'))
  }
  
  // Mock assertAuth
  if (mockUser) {
    ;(assertAuth as jest.MockedFunction<typeof assertAuth>).mockResolvedValue({
      success: true,
      user: mockUser
    })
  } else {
    ;(assertAuth as jest.MockedFunction<typeof assertAuth>).mockResolvedValue({
      success: false,
      error: 'Authentication required'
    })
  }
}

/**
 * Mocks authentication failure scenarios for testing error handling
 */
export function mockAuthFailure(error: string = 'Authentication failed'): void {
  ;(getAuthUser as jest.MockedFunction<typeof getAuthUser>).mockResolvedValue(null)
  ;(requireAuth as jest.MockedFunction<typeof requireAuth>).mockRejectedValue(new Error(error))
  ;(assertAuth as jest.MockedFunction<typeof assertAuth>).mockResolvedValue({
    success: false,
    error
  })
}

/**
 * Resets all authentication mocks to clean state
 * Should be called in test cleanup (afterEach) to ensure test isolation
 */
export function resetAuthMocks(): void {
  if (getAuthUser && (getAuthUser as jest.MockedFunction<typeof getAuthUser>).mockClear) {
    ;(getAuthUser as jest.MockedFunction<typeof getAuthUser>).mockClear()
  }
  if (requireAuth && (requireAuth as jest.MockedFunction<typeof requireAuth>).mockClear) {
    ;(requireAuth as jest.MockedFunction<typeof requireAuth>).mockClear()
  }
  if (assertAuth && (assertAuth as jest.MockedFunction<typeof assertAuth>).mockClear) {
    ;(assertAuth as jest.MockedFunction<typeof assertAuth>).mockClear()
  }
}

/**
 * Helper to create authentication headers for API requests
 * Simulates the cookies/headers that would be sent by authenticated clients
 */
export function createAuthHeaders(user: TestUser): Record<string, string> {
  return {
    'Authorization': `Bearer test-access-token-${user.id}`,
    'Cookie': `sb-access-token=test-access-token-${user.id}; sb-refresh-token=test-refresh-token-${user.id}`,
  }
}

/**
 * Common authentication test scenarios as reusable patterns
 */
export const authTestScenarios = {
  /**
   * Setup for testing authenticated API routes
   */
  authenticated: (namespace?: string) => {
    const testUser = createTestUser(namespace)
    mockGetAuthUser(testUser)
    return {
      user: testUser,
      headers: createAuthHeaders(testUser)
    }
  },

  /**
   * Setup for testing unauthenticated API routes  
   */
  unauthenticated: () => {
    mockGetAuthUser(null)
    return {
      user: null,
      headers: {}
    }
  },

  /**
   * Setup for testing authentication failure scenarios
   */
  authFailure: (error?: string) => {
    mockAuthFailure(error)
    return {
      user: null,
      headers: {},
      expectedError: error || 'Authentication failed'
    }
  }
}