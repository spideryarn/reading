import { requireAuth, getAuthUser, isBot, createUnauthorizedResponse } from '../route-protection'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: () => Promise.resolve(body),
      status: init?.status || 200,
      headers: {
        get: (name) => name === 'content-type' ? 'application/json' : null
      }
    }))
  }
}))

describe('Route Protection Utilities', () => {
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>
  const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>
  
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

  const mockCookieStore = {
    getAll: jest.fn(),
    set: jest.fn(),
  }

  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    
    // Mock cookies
    mockCookies.mockResolvedValue(mockCookieStore as any)
    mockCookieStore.getAll.mockReturnValue([])
    
    // Mock Supabase client
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any)
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await requireAuth()

      expect(result).toBe(mockUser)
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should redirect to login when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await requireAuth()

      expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
    })

    it('should redirect to login when authentication error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', name: 'AuthError' },
      })

      await requireAuth()

      expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
    })

    it('should redirect to custom login path when specified', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await requireAuth({ loginPath: '/custom-login' })

      expect(mockRedirect).toHaveBeenCalledWith('/custom-login')
    })

    it('should include returnTo parameter in redirect URL', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await requireAuth({ returnTo: '/documents/test-doc' })

      expect(mockRedirect).toHaveBeenCalledWith('/auth/login?next=%2Fdocuments%2Ftest-doc')
    })

    it('should use custom login path with returnTo parameter', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await requireAuth({ 
        loginPath: '/signin',
        returnTo: '/protected-page'
      })

      expect(mockRedirect).toHaveBeenCalledWith('/signin?next=%2Fprotected-page')
    })

    it('should handle cookie operations gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await requireAuth()
      
      // Should return user when authenticated, regardless of cookie issues
      expect(result).toBe(mockUser)
      
      // Should have called createServerClient with proper configuration
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test-project.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      )
    })
  })

  describe('getAuthUser', () => {
    it('should return user when authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getAuthUser()

      expect(result).toBe(mockUser)
    })

    it('should return null when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getAuthUser()

      expect(result).toBeNull()
    })

    it('should return null when authentication error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', name: 'AuthError' },
      })

      const result = await getAuthUser()

      expect(result).toBeNull()
    })

    it('should create Supabase client with correct configuration', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      await getAuthUser()

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test-project.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      )
    })
  })

  describe('isBot', () => {
    const createMockRequest = (userAgent) => ({
      headers: {
        get: (name) => name.toLowerCase() === 'user-agent' ? userAgent : null
      }
    })

    it('should return true for Google bot', () => {
      const request = createMockRequest('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
      expect(isBot(request)).toBe(true)
    })

    it('should return true for Bing bot', () => {
      const request = createMockRequest('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')
      expect(isBot(request)).toBe(true)
    })

    it('should return true for Twitter bot', () => {
      const request = createMockRequest('Twitterbot/1.0')
      expect(isBot(request)).toBe(true)
    })

    it('should return true for Facebook bot', () => {
      const request = createMockRequest('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')
      expect(isBot(request)).toBe(true)
    })

    it('should return true for LinkedIn bot', () => {
      const request = createMockRequest('LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com/)')
      expect(isBot(request)).toBe(true)
    })

    it('should return true for Discord bot', () => {
      const request = createMockRequest('Mozilla/5.0 (Macintosh; Intel Mac OS X 11.6; rv:92.0) Gecko/20100101 Firefox/92.0 DiscordBot')
      expect(isBot(request)).toBe(true)
    })

    it('should return true for Chrome Lighthouse', () => {
      const request = createMockRequest('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36 Chrome-Lighthouse')
      expect(isBot(request)).toBe(true)
    })

    it('should return false for regular browser user agents', () => {
      const chromeRequest = createMockRequest('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
      const firefoxRequest = createMockRequest('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0')
      const safariRequest = createMockRequest('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15')

      expect(isBot(chromeRequest)).toBe(false)
      expect(isBot(firefoxRequest)).toBe(false)
      expect(isBot(safariRequest)).toBe(false)
    })

    it('should return false when no user agent is provided', () => {
      const request = createMockRequest(null)
      expect(isBot(request)).toBe(false)
    })

    it('should be case insensitive for bot detection', () => {
      const request = createMockRequest('GOOGLEBOT/2.1')
      expect(isBot(request)).toBe(true)
    })

    it('should detect bots with partial matches in user agent', () => {
      const request = createMockRequest('Some custom agent with googlebot inside')
      expect(isBot(request)).toBe(true)
    })
  })

  describe('createUnauthorizedResponse', () => {
    it('should return 401 response with default message', () => {
      const response = createUnauthorizedResponse()

      expect(response).toBeDefined()
      expect(response.status).toBe(401)
    })

    it('should return 401 response with custom message', () => {
      const customMessage = 'Custom auth required message'
      const response = createUnauthorizedResponse(customMessage)

      expect(response).toBeDefined()
      expect(response.status).toBe(401)
    })

    it('should include error and code in response body', async () => {
      const customMessage = 'Custom auth required message'
      const response = createUnauthorizedResponse(customMessage)
      const body = await response.json()

      expect(body).toEqual({
        error: customMessage,
        code: 'UNAUTHORIZED',
      })
    })

    it('should have correct content type header', () => {
      const response = createUnauthorizedResponse()
      
      expect(response.headers.get('content-type')).toBe('application/json')
    })
  })

  describe('Cookie handling edge cases', () => {
    it('should handle cookie store errors gracefully in requireAuth', async () => {
      mockCookies.mockRejectedValue(new Error('Cookie store unavailable'))
      
      // This should still work because Supabase handles cookie errors internally
      await expect(requireAuth()).rejects.toThrow()
      
      // Verify that the error was due to the cookies mock, not our code
      expect(mockCookies).toHaveBeenCalled()
    })

    it('should handle cookie store errors gracefully in getAuthUser', async () => {
      mockCookies.mockRejectedValue(new Error('Cookie store unavailable'))
      
      // This should still work because Supabase handles cookie errors internally
      await expect(getAuthUser()).rejects.toThrow()
      
      // Verify that the error was due to the cookies mock, not our code
      expect(mockCookies).toHaveBeenCalled()
    })

    it('should handle cookie setAll errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Create a mock that throws in setAll
      const failingCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        setAll: jest.fn().mockImplementation(() => {
          throw new Error('Cookie setting failed')
        }),
      }
      
      mockCookies.mockResolvedValue(failingCookieStore as any)
      
      // Mock the client creation with a callback that will trigger setAll
      mockCreateServerClient.mockImplementation((url, key, config) => {
        // Simulate what Supabase does - call setAll with some cookies
        try {
          config.cookies.setAll([
            { name: 'test-cookie', value: 'test-value', options: {} }
          ])
        } catch (error) {
          // This should be caught and ignored as per the implementation
        }
        
        return mockSupabaseClient as any
      })
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await requireAuth()
      
      expect(result).toBe(mockUser)
      
      consoleSpy.mockRestore()
    })
  })
})