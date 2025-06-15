// Mock for server-auth module to use in tests
import type { User } from '@supabase/supabase-js'
import type { AuthResult, UserProfile } from '../server-auth'

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

export const validateAuth = jest.fn<Promise<User>, []>().mockResolvedValue(defaultTestUser)

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

// Helper to configure the mock user for specific tests
export const setMockUser = (user: User | null) => {
  if (user) {
    getUser.mockResolvedValue({ user, error: null })
    validateAuth.mockResolvedValue(user)
    getUserId.mockResolvedValue(user.id)
    getUserProfile.mockResolvedValue({
      id: user.id,
      email: user.email!,
      displayName: user.user_metadata?.display_name || user.email || 'User',
      createdAt: user.created_at
    })
  } else {
    getUser.mockResolvedValue({ user: null, error: 'Not authenticated' })
    validateAuth.mockRejectedValue(new Error('User not authenticated'))
    getUserId.mockResolvedValue(null)
    getUserProfile.mockResolvedValue(null)
  }
}

// Helper to reset all mocks
export const resetAuthMocks = () => {
  getUser.mockClear()
  getSession.mockClear()
  validateAuth.mockClear()
  checkAdminAccess.mockClear()
  getUserId.mockClear()
  getAuthenticatedClient.mockClear()
  checkResourceOwnership.mockClear()
  getUserProfile.mockClear()
  
  // Reset to default authenticated state
  setMockUser(defaultTestUser)
}