/**
 * Test helpers for managing authentication in API route tests
 * 
 * This module provides utilities for isolating auth concerns from
 * business logic validation in tests, addressing the execution
 * order issue where validateAuth() is called before input validation.
 */

import type { User } from '@supabase/supabase-js'

/**
 * Default test user for authenticated requests
 */
export const defaultTestUser: User = ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  // Additional required fields for User type
  phone: null,
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: null,
  last_sign_in_at: new Date().toISOString(),
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  identities: [],
  is_anonymous: false,
  factors: []
} as unknown as User)

/**
 * Mock configuration for getAuthUser
 */
export interface GetAuthUserMockConfig {
  shouldSucceed: boolean
  user?: User
}

/**
 * Set up getAuthUser mock with the specified behavior
 * 
 * @param config - Configuration for the mock behavior
 * @returns The mocked getAuthUser function
 */
export function setupGetAuthUserMock(config: GetAuthUserMockConfig): jest.Mock {
  const getAuthUserMock = jest.fn()
  
  if (config.shouldSucceed) {
    getAuthUserMock.mockResolvedValue(config.user || defaultTestUser)
  } else {
    getAuthUserMock.mockResolvedValue(null)
  }
  
  return getAuthUserMock
}

/**
 * Mock auth modules for testing
 * This should be called at the top of test files before imports
 */
export function mockAuthModules() {
  // Mock server-auth module with new authentication helpers
  jest.mock('@/lib/auth/server-auth', () => ({
    getUser: jest.fn(),
    getAuthUser: jest.fn(),
    requireAuth: jest.fn(),
    assertAuth: jest.fn(),
    getUserId: jest.fn(),
    checkAdminAccess: jest.fn(),
    getSession: jest.fn(),
  }))
}

/**
 * Setup auth mocks for different test scenarios using new authentication helpers
 */
export const authTestScenarios = {
  /**
   * Setup for testing business logic - auth always succeeds
   */
  businessLogic: () => {
    const getAuthUser = setupGetAuthUserMock({ shouldSucceed: true })
    const requireAuth = jest.fn().mockResolvedValue(defaultTestUser)
    const assertAuth = jest.fn().mockResolvedValue({ success: true, user: defaultTestUser })
    
    // Dynamic import assignment - necessary for test mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require('@/lib/auth/server-auth')
    authModule.getAuthUser = getAuthUser
    authModule.requireAuth = requireAuth
    authModule.assertAuth = assertAuth
    
    return { getAuthUser, requireAuth, assertAuth }
  },
  
  /**
   * Setup for testing auth failures
   */
  authFailure: () => {
    const getAuthUser = setupGetAuthUserMock({ shouldSucceed: false })
    const requireAuth = jest.fn().mockRejectedValue(new Error('Authentication required'))
    const assertAuth = jest.fn().mockResolvedValue({ success: false, error: 'Authentication required' })
    
    // Dynamic import assignment - necessary for test mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require('@/lib/auth/server-auth')
    authModule.getAuthUser = getAuthUser
    authModule.requireAuth = requireAuth
    authModule.assertAuth = assertAuth
    
    return { getAuthUser, requireAuth, assertAuth }
  },
  
  /**
   * Setup for testing with a specific user
   */
  withUser: (user: Partial<User>) => {
    const fullUser = { ...defaultTestUser, ...user } as User
    const getAuthUser = setupGetAuthUserMock({ shouldSucceed: true, user: fullUser })
    const requireAuth = jest.fn().mockResolvedValue(fullUser)
    const assertAuth = jest.fn().mockResolvedValue({ success: true, user: fullUser })
    
    // Dynamic import assignment - necessary for test mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require('@/lib/auth/server-auth')
    authModule.getAuthUser = getAuthUser
    authModule.requireAuth = requireAuth
    authModule.assertAuth = assertAuth
    
    return { getAuthUser, requireAuth, assertAuth, user: fullUser }
  },
  
  /**
   * Reset all auth mocks
   */
  reset: () => {
    jest.clearAllMocks()
  }
}

/**
 * Test helper for creating authenticated request contexts
 */
export function createAuthenticatedContext(user: Partial<User> = {}) {
  const authenticatedUser = { ...defaultTestUser, ...user }
  
  return {
    user: authenticatedUser,
    headers: {
      'Authorization': `Bearer test-token-${authenticatedUser.id}`
    }
  }
}

/**
 * Helper to run tests with different auth states
 */
export function describeWithAuth(
  description: string,
  testSuite: (authHelpers: typeof authTestScenarios) => void
) {
  describe(description, () => {
    beforeEach(() => {
      authTestScenarios.reset()
    })
    
    afterEach(() => {
      authTestScenarios.reset()
    })
    
    testSuite(authTestScenarios)
  })
}