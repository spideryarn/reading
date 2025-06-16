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
export const defaultTestUser: User = {
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
} as User

/**
 * Mock configuration for validateAuth
 */
export interface ValidateAuthMockConfig {
  shouldSucceed: boolean
  user?: User
  errorMessage?: string
}

/**
 * Set up validateAuth mock with the specified behavior
 * 
 * @param config - Configuration for the mock behavior
 * @returns The mocked validateAuth function
 */
export function setupValidateAuthMock(config: ValidateAuthMockConfig): jest.Mock {
  const validateAuthMock = jest.fn()
  
  if (config.shouldSucceed) {
    validateAuthMock.mockResolvedValue(config.user || defaultTestUser)
  } else {
    validateAuthMock.mockRejectedValue(
      new Error(config.errorMessage || 'User not authenticated')
    )
  }
  
  return validateAuthMock
}

/**
 * Mock auth modules for testing
 * This should be called at the top of test files before imports
 */
export function mockAuthModules() {
  // Mock server-auth module
  jest.mock('@/lib/auth/server-auth', () => ({
    getUser: jest.fn(),
    validateAuth: jest.fn(),
    getUserId: jest.fn(),
    checkAdminAccess: jest.fn(),
    getSession: jest.fn()
  }))
  
  // Mock validate-auth module (if it exists separately)
  jest.mock('@/lib/auth/validate-auth', () => ({
    validateAuth: jest.fn()
  }))
}

/**
 * Setup auth mocks for different test scenarios
 */
export const authTestScenarios = {
  /**
   * Setup for testing business logic - auth always succeeds
   */
  businessLogic: () => {
    const validateAuth = setupValidateAuthMock({ shouldSucceed: true })
    // Dynamic import assignment - necessary for test mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/auth/server-auth').validateAuth = validateAuth
    return validateAuth
  },
  
  /**
   * Setup for testing auth failures
   */
  authFailure: (errorMessage?: string) => {
    const validateAuth = setupValidateAuthMock({ 
      shouldSucceed: false, 
      errorMessage 
    })
    // Dynamic import assignment - necessary for test mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/auth/server-auth').validateAuth = validateAuth
    return validateAuth
  },
  
  /**
   * Setup for testing with a specific user
   */
  withUser: (user: Partial<User>) => {
    const fullUser = { ...defaultTestUser, ...user }
    const validateAuth = setupValidateAuthMock({ 
      shouldSucceed: true, 
      user: fullUser as User 
    })
    // Dynamic import assignment - necessary for test mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/auth/server-auth').validateAuth = validateAuth
    return { validateAuth, user: fullUser }
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