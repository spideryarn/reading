import { 
  getUser, 
  getSession,
  validateAuth,
  checkAdminAccess,
  getUserId,
  getAuthenticatedClient,
  checkResourceOwnership,
  getUserProfile,
  type AuthResult,
  type UserProfile
} from '../server-auth'
import { createClient } from '@/lib/supabase/server'
import type { User, Session } from '@supabase/supabase-js'

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('Server Auth Utilities', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
  
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
  }

  const mockAdminUser: User = {
    ...mockUser,
    id: 'admin-456',
    email: 'admin@example.com',
    user_metadata: { role: 'admin' },
  }

  const mockSession: Session = {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: mockUser,
  }

  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any)
    
    // Spy on console.error to verify error logging
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.error
    jest.restoreAllMocks()
  })

  describe('getUser', () => {
    it('should return user when authentication succeeds', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result: AuthResult = await getUser()

      expect(result).toEqual({
        user: mockUser,
        error: null,
      })
    })

    it('should return null user and error message when auth fails', async () => {
      const authError = {
        message: 'Invalid JWT token',
        name: 'AuthError',
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      })

      const result: AuthResult = await getUser()

      expect(result).toEqual({
        user: null,
        error: 'Invalid JWT token',
      })
      expect(console.error).toHaveBeenCalledWith('Authentication error:', 'Invalid JWT token')
    })

    it('should return null user when no user is authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result: AuthResult = await getUser()

      expect(result).toEqual({
        user: null,
        error: null,
      })
    })

    it('should handle unexpected errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'))

      const result: AuthResult = await getUser()

      expect(result).toEqual({
        user: null,
        error: 'An unexpected error occurred during authentication',
      })
      expect(console.error).toHaveBeenCalledWith('Unexpected authentication error:', expect.any(Error))
    })

    it('should handle Supabase client creation failure', async () => {
      mockCreateClient.mockRejectedValue(new Error('Client creation failed'))

      const result: AuthResult = await getUser()

      expect(result).toEqual({
        user: null,
        error: 'An unexpected error occurred during authentication',
      })
    })
  })

  describe('getSession', () => {
    it('should return session when available', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await getSession()

      expect(result).toBe(mockSession)
    })

    it('should return null when no session exists', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const result = await getSession()

      expect(result).toBeNull()
    })

    it('should return null and log error when session retrieval fails', async () => {
      const sessionError = {
        message: 'Session expired',
        name: 'SessionError',
      }
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: sessionError,
      })

      const result = await getSession()

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('Session retrieval error:', 'Session expired')
    })

    it('should handle unexpected errors gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Network error'))

      const result = await getSession()

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('Unexpected session error:', expect.any(Error))
    })
  })

  describe('validateAuth', () => {
    it('should return user when authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await validateAuth()

      expect(result).toBe(mockUser)
    })

    it('should throw error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(validateAuth()).rejects.toThrow('User not authenticated')
    })

    it('should throw error when authentication fails', async () => {
      const authError = {
        message: 'Invalid token',
        name: 'AuthError',
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      })

      await expect(validateAuth()).rejects.toThrow('Authentication failed: Invalid token')
    })

    it('should throw error when unexpected error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'))

      await expect(validateAuth()).rejects.toThrow('Authentication failed: An unexpected error occurred during authentication')
    })
  })

  describe('checkAdminAccess', () => {
    it('should return true for user with admin role in user_metadata', async () => {
      const adminUserMeta = {
        ...mockUser,
        user_metadata: { role: 'admin' },
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminUserMeta },
        error: null,
      })

      const result = await checkAdminAccess()

      expect(result).toBe(true)
    })

    it('should return true for user with admin role in app_metadata', async () => {
      const adminAppMeta = {
        ...mockUser,
        app_metadata: { role: 'admin' },
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminAppMeta },
        error: null,
      })

      const result = await checkAdminAccess()

      expect(result).toBe(true)
    })

    it('should return true for user with is_admin flag in user_metadata', async () => {
      const adminFlag = {
        ...mockUser,
        user_metadata: { is_admin: true },
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminFlag },
        error: null,
      })

      const result = await checkAdminAccess()

      expect(result).toBe(true)
    })

    it('should return true for user with is_admin flag in app_metadata', async () => {
      const adminFlag = {
        ...mockUser,
        app_metadata: { is_admin: true },
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminFlag },
        error: null,
      })

      const result = await checkAdminAccess()

      expect(result).toBe(true)
    })

    it('should return false for regular user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await checkAdminAccess()

      expect(result).toBe(false)
    })

    it('should return false when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await checkAdminAccess()

      expect(result).toBe(false)
    })

    it('should return false when authentication error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', name: 'AuthError' },
      })

      const result = await checkAdminAccess()

      expect(result).toBe(false)
    })

    it('should handle missing metadata gracefully', async () => {
      const userWithoutMetadata = {
        ...mockUser,
        user_metadata: undefined,
        app_metadata: undefined,
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithoutMetadata },
        error: null,
      })

      const result = await checkAdminAccess()

      expect(result).toBe(false)
    })
  })

  describe('getUserId', () => {
    it('should return user ID when user is authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getUserId()

      expect(result).toBe('user-123')
    })

    it('should return null when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getUserId()

      expect(result).toBeNull()
    })

    it('should return null when authentication error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', name: 'AuthError' },
      })

      const result = await getUserId()

      expect(result).toBeNull()
    })
  })

  describe('getAuthenticatedClient', () => {
    it('should return Supabase client', async () => {
      const result = await getAuthenticatedClient()

      expect(result).toBe(mockSupabaseClient)
      expect(mockCreateClient).toHaveBeenCalled()
    })
  })

  describe('checkResourceOwnership', () => {
    it('should return true when user owns the resource', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await checkResourceOwnership('user-123')

      expect(result).toBe(true)
    })

    it('should return false when user does not own the resource', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await checkResourceOwnership('different-user-456')

      expect(result).toBe(false)
    })

    it('should return false when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await checkResourceOwnership('any-user-id')

      expect(result).toBe(false)
    })

    it('should return false when authentication error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', name: 'AuthError' },
      })

      const result = await checkResourceOwnership('any-user-id')

      expect(result).toBe(false)
    })
  })

  describe('getUserProfile', () => {
    it('should return user profile when authenticated', async () => {
      const userWithMetadata = {
        ...mockUser,
        user_metadata: {
          display_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithMetadata },
        error: null,
      })

      const result = await getUserProfile()

      const expected: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      expect(result).toEqual(expected)
    })

    it('should use full_name as fallback for display name', async () => {
      const userWithFullName = {
        ...mockUser,
        user_metadata: {
          full_name: 'Jane Smith',
        },
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithFullName },
        error: null,
      })

      const result = await getUserProfile()

      expect(result?.displayName).toBe('Jane Smith')
    })

    it('should use email as fallback for display name', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getUserProfile()

      expect(result?.displayName).toBe('test@example.com')
    })

    it('should use "User" as final fallback for display name', async () => {
      const userWithoutEmail = {
        ...mockUser,
        email: null,
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithoutEmail },
        error: null,
      })

      const result = await getUserProfile()

      expect(result?.displayName).toBe('User')
    })

    it('should return null when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getUserProfile()

      expect(result).toBeNull()
    })

    it('should return null when authentication error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', name: 'AuthError' },
      })

      const result = await getUserProfile()

      expect(result).toBeNull()
    })

    it('should handle missing user_metadata gracefully', async () => {
      const userWithoutMetadata = {
        ...mockUser,
        user_metadata: undefined,
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithoutMetadata },
        error: null,
      })

      const result = await getUserProfile()

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'test@example.com',
        avatar: undefined,
        createdAt: '2024-01-01T00:00:00.000Z',
      })
    })

    it('should handle null user_metadata gracefully', async () => {
      const userWithNullMetadata = {
        ...mockUser,
        user_metadata: null,
      }
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithNullMetadata },
        error: null,
      })

      const result = await getUserProfile()

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'test@example.com',
        avatar: undefined,
        createdAt: '2024-01-01T00:00:00.000Z',
      })
    })
  })

  describe('Error handling patterns', () => {
    it('should consistently handle Supabase client creation errors', async () => {
      mockCreateClient.mockRejectedValue(new Error('Database connection failed'))

      const getUserResult = await getUser()
      const getSessionResult = await getSession()
      const getUserIdResult = await getUserId()
      const getUserProfileResult = await getUserProfile()
      const checkAdminResult = await checkAdminAccess()
      const checkOwnershipResult = await checkResourceOwnership('test-id')

      expect(getUserResult.error).toBe('An unexpected error occurred during authentication')
      expect(getSessionResult).toBeNull()
      expect(getUserIdResult).toBeNull()
      expect(getUserProfileResult).toBeNull()
      expect(checkAdminResult).toBe(false)
      expect(checkOwnershipResult).toBe(false)
    })

    it('should handle auth method throwing errors', async () => {
      mockSupabaseClient.auth.getUser.mockImplementation(() => {
        throw new Error('Auth method failed')
      })

      const getUserResult = await getUser()
      const validateAuthPromise = validateAuth()

      expect(getUserResult.error).toBe('An unexpected error occurred during authentication')
      await expect(validateAuthPromise).rejects.toThrow('Authentication failed: An unexpected error occurred during authentication')
    })
  })
})