/**
 * Integration tests for route protection system
 * 
 * These tests verify that the authentication system works correctly
 * across different route types and scenarios.
 */

import { requireAuth, getAuthUser, isBot, createUnauthorizedResponse } from '../route-protection'
import { validateAuth, getUser, checkResourceOwnership } from '../server-auth'
import { getRedirectUrl } from '../client-utils'
import { redirect } from 'next/navigation'
import { getTestNamespace, createTestEmail } from '@/lib/testing/test-isolation-utils'

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

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
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

describe('Route Protection Integration Tests', () => {
  const namespace = getTestNamespace('route-integration')
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>
  
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  describe('Document Route Protection Flow', () => {
    it('should demonstrate complete authentication flow for document access', async () => {
      // Simulate unauthenticated user trying to access /documents/test-doc
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient)

      // User tries to access protected route
      await requireAuth({ returnTo: '/documents/test-doc' })

      // Should redirect to login with returnTo parameter
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login?next=%2Fdocuments%2Ftest-doc')
    })

    it('should allow authenticated user to access document', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockUser = {
        id: 'user-123',
        email: createTestEmail(namespace, 'authenticated'),
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        app_metadata: {},
        user_metadata: {},
      }
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient)

      const result = await requireAuth()

      expect(result).toBe(mockUser)
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('Share Route Accessibility', () => {
    it('should allow public access to share routes', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient)

      // Share routes should use getAuthUser (optional auth) instead of requireAuth
      const result = await getAuthUser()

      expect(result).toBeNull()
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('API Route Protection', () => {
    it('should protect API routes with validateAuth', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)

      await expect(validateAuth()).rejects.toThrow('User not authenticated')
    })

    it('should return 401 for unauthenticated API requests', () => {
      const response = createUnauthorizedResponse()
      
      expect(response).toBeDefined()
      expect(response.status).toBe(401)
    })
  })

  describe('Bot Detection and SEO', () => {
    const createMockRequest = (userAgent) => ({
      headers: {
        get: (name) => name.toLowerCase() === 'user-agent' ? userAgent : null
      }
    })

    it('should detect search engine bots correctly', () => {
      const googleBotRequest = createMockRequest('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
      expect(isBot(googleBotRequest)).toBe(true)
    })

    it('should allow human users through bot detection', () => {
      const humanRequest = createMockRequest('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
      expect(isBot(humanRequest)).toBe(false)
    })
  })

  describe('Redirect URL Security Integration', () => {
    it('should handle safe redirect after login', () => {
      // User comes from login page with safe redirect
      const searchParams = new URLSearchParams('next=/documents/test-doc')
      const redirectUrl = getRedirectUrl(searchParams)

      expect(redirectUrl).toBe('/documents/test-doc')
    })

    it('should prevent malicious redirects after login', () => {
      // Attacker tries to redirect to external site
      const searchParams = new URLSearchParams('next=https://malicious.com')
      const redirectUrl = getRedirectUrl(searchParams)

      expect(redirectUrl).toBe('/') // Safe fallback
    })

    it('should handle URL encoding in redirects', () => {
      // Browser URL-encodes the redirect parameter
      const searchParams = new URLSearchParams('next=%2Fdocuments%2Ftest-doc%2Ftweets')
      const redirectUrl = getRedirectUrl(searchParams)

      expect(redirectUrl).toBe('/documents/test-doc/tweets')
    })
  })

  describe('Resource Ownership Integration', () => {
    it('should verify resource ownership for authenticated users', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      
      const mockUser = {
        id: 'user-123',
        email: createTestEmail(namespace, 'ownership'),
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        app_metadata: {},
        user_metadata: {},
      }
      
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      }
      
      ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)

      // User owns the resource
      const ownsResource = await checkResourceOwnership('user-123')
      expect(ownsResource).toBe(true)

      // User doesn't own the resource
      const doesntOwnResource = await checkResourceOwnership('other-user-456')
      expect(doesntOwnResource).toBe(false)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle Supabase connection errors gracefully', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      // Mock connection failure
      ;(createClient as jest.Mock).mockRejectedValue(new Error('Database connection failed'))
      ;(createServerClient as jest.Mock).mockImplementation(() => {
        throw new Error('Supabase client creation failed')
      })
      ;(cookies as jest.Mock).mockResolvedValue({
        getAll: () => [],
        set: () => {},
      })

      // Server auth should handle errors gracefully
      const { user, error } = await getUser()
      expect(user).toBeNull()
      expect(error).toBe('An unexpected error occurred during authentication')

      // Route protection should handle errors by redirecting
      await expect(requireAuth()).rejects.toThrow()
    })

    it('should handle authentication token expiry', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'JWT expired', name: 'AuthError' },
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient)

      // Expired token should trigger redirect
      await requireAuth()
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
    })
  })

  describe('Real-world Route Scenarios', () => {
    it('should handle document page access flow', async () => {
      // 1. User visits /documents/test-doc (protected)
      // 2. Gets redirected to /auth/login?next=/documents/test-doc
      // 3. After login, gets redirected back to /documents/test-doc

      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)

      // Step 1: Unauthenticated access
      const unauthenticatedClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      
      ;(createServerClient as jest.Mock).mockReturnValue(unauthenticatedClient)
      
      await requireAuth({ returnTo: '/documents/test-doc' })
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login?next=%2Fdocuments%2Ftest-doc')

      // Step 2: After login, redirect processing
      const loginParams = new URLSearchParams('next=/documents/test-doc')
      const redirectUrl = getRedirectUrl(loginParams)
      expect(redirectUrl).toBe('/documents/test-doc')

      // Step 3: Authenticated access
      const mockUser = {
        id: 'user-123',
        email: createTestEmail(namespace, 'scenario'),
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        app_metadata: {},
        user_metadata: {},
      }
      
      const authenticatedClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      }
      
      ;(createServerClient as jest.Mock).mockReturnValue(authenticatedClient)
      mockRedirect.mockClear()
      
      const user = await requireAuth()
      expect(user).toBe(mockUser)
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should handle tweet thread page access', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient)

      await requireAuth({ returnTo: '/documents/test-doc/tweets' })
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login?next=%2Fdocuments%2Ftest-doc%2Ftweets')
    })

    it('should allow access to share routes without authentication', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient)

      // Share routes should not require authentication
      const user = await getAuthUser()
      expect(user).toBeNull()
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('Performance and Caching Considerations', () => {
    it('should not make redundant auth calls', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockUser = {
        id: 'user-123',
        email: createTestEmail(namespace, 'performance'),
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        app_metadata: {},
        user_metadata: {},
      }
      
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient)

      // Multiple calls to requireAuth should each create their own client
      // (This is expected behavior for server components)
      await requireAuth()
      await requireAuth()

      expect(createServerClient).toHaveBeenCalledTimes(2)
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(2)
    })
  })
})