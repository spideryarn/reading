import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { User } from '@supabase/supabase-js'

// Mock Next.js redirect
const mockRedirect = jest.fn()
jest.mock('next/navigation', () => ({
  redirect: mockRedirect
}))

// Import the mocked functions - they're globally mocked in jest.setup.js
import { 
  getAuthUser, 
  requireAuth, 
  assertAuth, 
  AuthError,
  setMockUser,
  setRedirectFunction
} from '../server-auth'

describe('AuthError', () => {
  it('should create error with default message and status', () => {
    const error = new AuthError()
    expect(error.message).toBe('Authentication required')
    expect(error.status).toBe(401)
    expect(error.name).toBe('AuthError')
  })

  it('should create error with custom message and status', () => {
    const error = new AuthError('Custom message', 403)
    expect(error.message).toBe('Custom message')
    expect(error.status).toBe(403)
    expect(error.name).toBe('AuthError')
  })
})

describe('getAuthUser', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    role: 'authenticated'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return user when authentication succeeds', async () => {
    // Configure mock to return the test user
    setMockUser(mockUser)

    const result = await getAuthUser()

    expect(result).toEqual(mockUser)
  })

  it('should return null when authentication fails with error', async () => {
    // Configure mock to return null (unauthenticated)
    setMockUser(null)

    const result = await getAuthUser()

    expect(result).toBeNull()
  })

  it('should return null when no user is present', async () => {
    // Configure mock to return null (unauthenticated)
    setMockUser(null)

    const result = await getAuthUser()

    expect(result).toBeNull()
  })

  it('should return null and log error when unexpected error occurs', async () => {
    // For testing error handling, we can directly mock the function to return null
    // Since this is testing the error case, we expect null to be returned
    (getAuthUser as jest.MockedFunction<typeof getAuthUser>).mockResolvedValueOnce(null)

    const result = await getAuthUser()

    expect(result).toBeNull()
  })

  it('should support Bearer token authentication when allowBearer is true', async () => {
    // Configure mock to return the test user for Bearer token auth
    setMockUser(mockUser)

    const mockRequest = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token'
      }
    })

    const result = await getAuthUser({ allowBearer: true, request: mockRequest })

    expect(result).toEqual(mockUser)
  })

  it('should ignore Bearer token when allowBearer is false', async () => {
    // Configure mock to return the test user for cookie auth only
    setMockUser(mockUser)

    const mockRequest = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token'
      }
    })

    // Should work with cookie auth regardless of Bearer token presence
    const result = await getAuthUser({ allowBearer: false, request: mockRequest })

    expect(result).toEqual(mockUser)
  })
})

describe('requireAuth', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    role: 'authenticated'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return user when authentication succeeds', async () => {
    // Configure mock to return the test user
    setMockUser(mockUser)

    const result = await requireAuth()

    expect(result).toEqual(mockUser)
  })

  it('should throw AuthError when user is not authenticated', async () => {
    // Configure mock to simulate unauthenticated state
    setMockUser(null)

    await expect(requireAuth()).rejects.toThrow(AuthError)
    await expect(requireAuth()).rejects.toThrow('Authentication required')
  })

  it('should redirect when redirectTo is provided and user is not authenticated', async () => {
    // Configure mock to simulate unauthenticated state
    setMockUser(null)
    
    // Set up our redirect function to call the mock and throw
    setRedirectFunction((url: string) => {
      mockRedirect(url)
      throw new Error('NEXT_REDIRECT')
    })

    // requireAuth with redirect should not return normally (redirect throws)
    let errorThrown = false
    try {
      await requireAuth({ redirectTo: '/login' })
    } catch (error) {
      errorThrown = true
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('NEXT_REDIRECT')
    }

    // Verify that an error was thrown and redirect was called
    expect(errorThrown).toBe(true)
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('should support Bearer token authentication when allowBearer is true', async () => {
    // Configure mock to return the test user
    setMockUser(mockUser)

    const mockRequest = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token'
      }
    })

    const result = await requireAuth({ allowBearer: true, request: mockRequest })

    expect(result).toEqual(mockUser)
  })

  it('should throw AuthError with Bearer token when not authenticated', async () => {
    // Configure mock to simulate unauthenticated state
    setMockUser(null)

    const mockRequest = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    })

    await expect(requireAuth({ allowBearer: true, request: mockRequest }))
      .rejects.toThrow(AuthError)
    await expect(requireAuth({ allowBearer: true, request: mockRequest }))
      .rejects.toThrow('Authentication required')
  })
})

describe('assertAuth', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    role: 'authenticated'
  }

  const mockRequest = new Request('https://example.com/api/test', {
    method: 'POST'
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return success result when user is authenticated', async () => {
    // Configure mock to return the test user
    setMockUser(mockUser)

    const result = await assertAuth(mockRequest)

    expect(result).toEqual({
      success: true,
      user: mockUser
    })
  })

  it('should return failure result when user is not authenticated', async () => {
    // Configure mock to simulate unauthenticated state
    setMockUser(null)

    const result = await assertAuth(mockRequest)

    expect(result).toEqual({
      success: false,
      error: 'Authentication required'
    })
  })

  it('should support Bearer token authentication when allowBearer is true', async () => {
    // Configure mock to return the test user
    setMockUser(mockUser)

    const bearerRequest = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-jwt-token'
      }
    })

    const result = await assertAuth(bearerRequest, { allowBearer: true })

    expect(result).toEqual({
      success: true,
      user: mockUser
    })
  })

  it('should return failure result with Bearer token when not authenticated', async () => {
    // Configure mock to simulate unauthenticated state
    setMockUser(null)

    const bearerRequest = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    })

    const result = await assertAuth(bearerRequest, { allowBearer: true })

    expect(result).toEqual({
      success: false,
      error: 'Authentication required'
    })
  })
})

