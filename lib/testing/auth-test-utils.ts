/**
 * Authentication Test Utilities
 * 
 * Provides standardized authentication mocking for API route tests using next-test-api-route-handler.
 * Designed to work with the shared database testing approach while providing consistent user fixtures.
 */

import { type User } from '@supabase/supabase-js'

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
 * Mocks the validateAuth function to return a successful authentication result
 * Should be called before running API route tests that require authentication
 */
export function mockValidateAuth(user: TestUser | null = null): void {
  const { validateAuth } = require('@/lib/auth/server-auth')
  
  if (user) {
    validateAuth.mockResolvedValue({
      user: user as User,
      session: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: user as User
      }
    })
  } else {
    // Mock unauthenticated state
    validateAuth.mockResolvedValue({
      user: null,
      session: null
    })
  }
}

/**
 * Mocks authentication failure scenarios for testing error handling
 */
export function mockAuthFailure(error: string = 'Authentication failed'): void {
  const { validateAuth } = require('@/lib/auth/server-auth')
  
  validateAuth.mockRejectedValue(new Error(error))
}

/**
 * Resets all authentication mocks to clean state
 * Should be called in test cleanup (afterEach) to ensure test isolation
 */
export function resetAuthMocks(): void {
  const { validateAuth } = require('@/lib/auth/server-auth')
  
  if (validateAuth && validateAuth.mockClear) {
    validateAuth.mockClear()
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
    mockValidateAuth(testUser)
    return {
      user: testUser,
      headers: createAuthHeaders(testUser)
    }
  },

  /**
   * Setup for testing unauthenticated API routes  
   */
  unauthenticated: () => {
    mockValidateAuth(null)
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