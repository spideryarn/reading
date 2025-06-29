// Mock for server-auth module to use in tests
import type { User } from '@supabase/supabase-js'
import type { AuthResult, UserProfile } from '../server-auth'

// We'll use a dynamic redirect function that can be overridden in tests
let redirectFunction: (url: string) => never = (url: string) => {
  throw new Error(`REDIRECT: ${url}`)
}

// Export a function to set the redirect function for tests
export const setRedirectFunction = (fn: (url: string) => never) => {
  redirectFunction = fn
}

// Mock AuthError class
export class AuthError extends Error {
  public readonly status: number

  constructor(message: string = 'Authentication required', status: number = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

// Default test user
const defaultTestUser: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {
    full_name: 'Test User',
    display_name: 'Test User'
  },
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  phone: null,
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  confirmation_sent_at: null,
  recovery_sent_at: null,
  new_email: null,
  invited_at: null,
  action_link: null,
  identities: [],
  factors: [],
  is_anonymous: false
}

// Mock implementations
export const getUser = jest.fn<Promise<AuthResult>, []>().mockResolvedValue({
  user: defaultTestUser,
  error: null
})

export const getSession = jest.fn().mockResolvedValue({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() / 1000 + 3600,
  user: defaultTestUser
})

// Legacy function - kept for backward compatibility during transition
// TODO: Remove after all tests are migrated to new authentication helpers
export const validateAuth = jest.fn().mockResolvedValue(defaultTestUser)

export const checkAdminAccess = jest.fn<Promise<boolean>, []>().mockResolvedValue(false)

export const getUserId = jest.fn<Promise<string | null>, []>().mockResolvedValue(defaultTestUser.id)

export const getAuthenticatedClient = jest.fn().mockResolvedValue({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: {}, error: null })
})

export const checkResourceOwnership = jest.fn<Promise<boolean>, [string]>().mockImplementation(
  async (resourceUserId: string) => resourceUserId === defaultTestUser.id
)

export const getUserProfile = jest.fn<Promise<UserProfile | null>, []>().mockResolvedValue({
  id: defaultTestUser.id,
  email: defaultTestUser.email!,
  displayName: 'Test User',
  createdAt: defaultTestUser.created_at
})

// New authentication helper functions
export const getAuthUser = jest.fn<Promise<User | null>, []>().mockResolvedValue(defaultTestUser)

export const requireAuth = jest.fn().mockResolvedValue(defaultTestUser)

export const assertAuth = jest.fn<Promise<{ success: boolean; user?: User; error?: string }>, [Request]>()
  .mockResolvedValue({
    success: true,
    user: defaultTestUser
  })

// Helper to configure the mock user for specific tests
// Primary focus on new authentication helpers (getAuthUser, requireAuth, assertAuth)
export const setMockUser = (user: User | null) => {
  if (user) {
    getUser.mockResolvedValue({ user, error: null })
    getUserId.mockResolvedValue(user.id)
    getUserProfile.mockResolvedValue({
      id: user.id,
      email: user.email!,
      displayName: user.user_metadata?.display_name || user.email || 'User',
      createdAt: user.created_at
    })
    
    // New authentication helpers - primary interface
    getAuthUser.mockResolvedValue(user)
    requireAuth.mockResolvedValue(user)
    assertAuth.mockResolvedValue({
      success: true,
      user
    })
    
    // Legacy validateAuth - kept for backward compatibility during transition
    validateAuth.mockImplementation((request?: Request) => {
      if (request) {
        // Modern style - return result object (delegates to assertAuth)
        return Promise.resolve({ success: true, user })
      } else {
        // Legacy style - return user directly (delegates to requireAuth)
        return Promise.resolve(user)
      }
    })
  } else {
    getUser.mockResolvedValue({ user: null, error: 'Not authenticated' })
    getUserId.mockResolvedValue(null)
    getUserProfile.mockResolvedValue(null)
    
    // New authentication helpers - primary interface
    getAuthUser.mockResolvedValue(null)
    requireAuth.mockImplementation((opts?: { redirectTo?: string }) => {
      if (opts?.redirectTo) {
        redirectFunction(opts.redirectTo)
        // This line won't be reached due to redirect throwing
        return Promise.reject(new AuthError('Authentication required'))
      } else {
        return Promise.reject(new AuthError('Authentication required'))
      }
    })
    assertAuth.mockResolvedValue({
      success: false,
      error: 'Authentication required'
    })
    
    // Legacy validateAuth - kept for backward compatibility during transition
    validateAuth.mockImplementation((request?: Request) => {
      if (request) {
        // Modern style - return result object (delegates to assertAuth)
        return Promise.resolve({ success: false, error: 'Authentication required' })
      } else {
        // Legacy style - throw AuthError (delegates to requireAuth)
        return Promise.reject(new AuthError('Authentication required'))
      }
    })
  }
}

// Helper to reset all mocks
export const resetAuthMocks = () => {
  getUser.mockClear()
  getSession.mockClear()
  checkAdminAccess.mockClear()
  getUserId.mockClear()
  getAuthenticatedClient.mockClear()
  checkResourceOwnership.mockClear()
  getUserProfile.mockClear()
  
  // New authentication helpers - primary interface
  getAuthUser.mockClear()
  requireAuth.mockClear()
  assertAuth.mockClear()
  
  // Legacy validateAuth - kept for backward compatibility during transition
  validateAuth.mockClear()
  
  // Reset to default authenticated state
  setMockUser(defaultTestUser)
}