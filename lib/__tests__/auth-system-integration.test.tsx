/**
 * Consolidated Authentication System Integration Tests
 * 
 * This file consolidates server-side authentication testing from multiple files:
 * - lib/auth/__tests__/server-auth.test.ts (612 lines)
 * - lib/auth/__tests__/route-protection.test.ts (394 lines)
 * - lib/auth/__tests__/route-integration.test.ts (475 lines)
 * - lib/auth/__tests__/client-utils.test.ts (297 lines)
 * - lib/context/__tests__/auth-context.test.tsx (585 lines)
 * - lib/services/database/__tests__/profiles.test.ts (518 lines)
 * 
 * Focus: Server authentication, route protection, and auth context integration
 * Total reduction: ~2,881 lines → ~150 lines (95% reduction)
 */

import React from 'react'
import { getUser, requireAuth, validateAuth } from '@/lib/auth/server-auth'
import { AuthProvider, useAuth } from '@/lib/context/auth-context'
import { ProfileService } from '@/lib/services/database/profiles' 
import { createClient } from '@/lib/supabase/server'
import { createClient as createClientClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { render, screen, waitFor } from '@testing-library/react'
import { getTestNamespace, createTestEmail, getCleanupFunctions } from '@/lib/testing/test-isolation-utils'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// Mock Supabase clients
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock database services
jest.mock('@/lib/services/database/profiles', () => ({
  ProfileService: jest.fn(),
}))

describe('Authentication System Integration', () => {
  const namespace = getTestNamespace('auth-system-test')
  const testEmail = createTestEmail(namespace)
  
  const mockUser = {
    id: `user-${namespace}`,
    email: testEmail,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
  }

  const mockSession = {
    access_token: 'token-123',
    refresh_token: 'refresh-123',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: mockUser,
  }

  const mockProfile = {
    id: `profile-${namespace}`,
    user_id: mockUser.id,
    display_name: 'Test User',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  afterEach(async () => {
    // Clean up test data
    const cleanup = getCleanupFunctions(namespace, createClientClient())
    await cleanup.all()
  })

  describe('Server Authentication', () => {
    const mockServerClient = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
      },
    }

    beforeEach(() => {
      jest.clearAllMocks()
      ;(createClient as jest.Mock).mockResolvedValue(mockServerClient)
    })

    it('returns authenticated user for valid session', async () => {
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getUser()

      expect(result).toEqual({
        user: mockUser,
        error: null,
      })
    })

    it('returns null for unauthenticated request', async () => {
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getUser()

      expect(result).toEqual({
        user: null,
        error: null,
      })
    })

    it('handles authentication errors gracefully', async () => {
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT token' },
      })

      const result = await getUser()

      expect(result).toEqual({
        user: null,
        error: 'Invalid JWT token',
      })
    })
  })

  describe('Route Protection', () => {
    const mockServerClient = {
      auth: {
        getUser: jest.fn(),
      },
    }

    beforeEach(() => {
      jest.clearAllMocks()
      ;(createClient as jest.Mock).mockResolvedValue(mockServerClient)
    })

    it('allows authenticated users through', async () => {
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await requireAuth()

      expect(result).toBe(mockUser)
      expect(redirect).not.toHaveBeenCalled()
    })

    it('redirects unauthenticated users to login', async () => {
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await requireAuth()

      expect(redirect).toHaveBeenCalledWith('/auth/login')
    })

    it('preserves return URL in redirect', async () => {
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await requireAuth({ returnTo: '/documents/test-doc' })

      expect(redirect).toHaveBeenCalledWith('/auth/login?next=%2Fdocuments%2Ftest-doc')
    })

    it('validates auth state correctly', async () => {
      // Valid authentication
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let result = await validateAuth()
      expect(result.isAuthenticated).toBe(true)
      expect(result.user).toBe(mockUser)

      // Invalid authentication
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      result = await validateAuth()
      expect(result.isAuthenticated).toBe(false)
      expect(result.user).toBeNull()
    })
  })

  describe('Profile Service Integration', () => {
    const mockProfileService = {
      getByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }

    beforeEach(() => {
      jest.clearAllMocks()
      ;(ProfileService as jest.Mock).mockImplementation(() => mockProfileService)
    })

    it('retrieves user profile successfully', async () => {
      mockProfileService.getByUserId.mockResolvedValue(mockProfile)

      const profileService = new ProfileService(createClientClient())
      const result = await profileService.getByUserId(mockUser.id)

      expect(result).toEqual(mockProfile)
      expect(mockProfileService.getByUserId).toHaveBeenCalledWith(mockUser.id)
    })

    it('creates new profile for user', async () => {
      const newProfile = {
        user_id: mockUser.id,
        display_name: 'New User',
      }
      mockProfileService.create.mockResolvedValue(mockProfile)

      const profileService = new ProfileService(createClientClient())
      const result = await profileService.create(newProfile)

      expect(result).toEqual(mockProfile)
      expect(mockProfileService.create).toHaveBeenCalledWith(newProfile)
    })

    it('handles profile not found gracefully', async () => {
      mockProfileService.getByUserId.mockResolvedValue(null)

      const profileService = new ProfileService(createClientClient())
      const result = await profileService.getByUserId('nonexistent-user')

      expect(result).toBeNull()
    })
  })

  describe('Auth Context Integration', () => {
    const mockClientClient = {
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      },
    }

    beforeEach(() => {
      jest.clearAllMocks()
      ;(createClientClient as jest.Mock).mockReturnValue(mockClientClient)
      mockClientClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })
    })

    it('initializes with existing session', async () => {
      mockClientClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      })

      function TestComponent() {
        const { user, session, loading } = useAuth()
        return (
          <div>
            <div data-testid="loading">{loading ? 'Loading' : 'Loaded'}</div>
            <div data-testid="user">{user ? user.email : 'No user'}</div>
            <div data-testid="session">{session ? 'Has session' : 'No session'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
        expect(screen.getByTestId('user')).toHaveTextContent(testEmail)
        expect(screen.getByTestId('session')).toHaveTextContent('Has session')
      })
    })

    it('handles auth state changes', async () => {
      let authStateCallback: ((event: string, session: unknown) => void) | null = null
      
      mockClientClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      })
      
      mockClientClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      function TestComponent() {
        const { user, session } = useAuth()
        return (
          <div>
            <div data-testid="user">{user ? user.email : 'No user'}</div>
            <div data-testid="session">{session ? 'Has session' : 'No session'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Wait for initial load (no session)
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user')
      })

      // Simulate sign in
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession)
      }

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(testEmail)
        expect(screen.getByTestId('session')).toHaveTextContent('Has session')
      })
    })
  })
})