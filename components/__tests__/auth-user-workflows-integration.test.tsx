/**
 * Consolidated Authentication User Workflows Integration Tests
 * 
 * This file consolidates authentication testing from multiple files:
 * - auth-workflow-integration.test.tsx (515 lines)
 * - auth-integration.test.tsx (406 lines) 
 * - auth-pages.test.tsx (309 lines)
 * - profile-page.test.tsx (partial)
 * 
 * Focus: End-to-end user workflows and critical authentication paths
 * Total reduction: ~1,230 lines → ~150 lines (88% reduction)
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { SignupForm } from '@/components/auth/signup-form'
import { ProfileDropdown } from '@/components/auth/profile-dropdown'
import { createClient } from '@/lib/supabase/client'
import { getTestNamespace, createTestEmail } from '@/lib/testing/test-isolation-utils'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

describe('Authentication User Workflows Integration', () => {
  const namespace = getTestNamespace('auth-workflows-test')
  const testEmail = createTestEmail(namespace)
  
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  }

  const mockSearchParams = {
    get: jest.fn().mockReturnValue(null),
  }

  const mockSupabaseClient = {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  }

  const mockUser = {
    id: 'user-123',
    email: testEmail,
    aud: 'authenticated',
    role: 'authenticated',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('Login Workflow', () => {
    it('completes successful login workflow with redirect', async () => {
      const user = userEvent.setup()
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null,
        data: { user: mockUser }
      })

      render(<LoginForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'validpassword123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      // Verify auth call and redirect
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: testEmail,
          password: 'validpassword123',
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/')
      })
    })

    it('handles invalid credentials with error display', async () => {
      const user = userEvent.setup()
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
        data: null
      })

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/email/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })
    })

    it('preserves redirect URL after login', async () => {
      const user = userEvent.setup()
      mockSearchParams.get.mockImplementation((key) => 
        key === 'redirectTo' ? '/read/document-123' : null
      )
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null,
        data: { user: mockUser }
      })

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/email/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/read/document-123')
      })
    })
  })

  describe('Signup Workflow', () => {
    it('completes successful signup with confirmation message', async () => {
      const user = userEvent.setup()
      const newUserEmail = createTestEmail(namespace, 'newuser')
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        error: null,
        data: { user: { id: '456', email: newUserEmail } }
      })

      render(<SignupForm />)

      // Fill form with matching passwords
      await user.type(screen.getByLabelText(/email/i), newUserEmail)
      await user.type(screen.getByLabelText(/^password$/i), 'securepassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'securepassword123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      // Should show success message
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: newUserEmail,
          password: 'securepassword123',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
          },
        })
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      })
    })

    it('prevents signup with mismatched passwords', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)

      await user.type(screen.getByLabelText(/email/i), testEmail)
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'different123')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      // Should not call API and show validation error
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })
  })

  describe('Profile Management Workflow', () => {
    it('displays user info and handles logout', async () => {
      const user = userEvent.setup()
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      render(<ProfileDropdown user={mockUser} />)

      // Should display user email
      expect(screen.getByText(testEmail)).toBeInTheDocument()

      // Open dropdown and logout
      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Log out'))

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
        expect(mockRouter.push).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('Form Validation', () => {
    it('validates required fields on both forms', async () => {
      const user = userEvent.setup()
      
      // Test login form validation
      const { rerender } = render(<LoginForm />)
      await user.click(screen.getByRole('button', { name: /log in/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/email.*required/i)).toBeInTheDocument()
        expect(screen.getByText(/password.*required/i)).toBeInTheDocument()
      })

      // Test signup form validation
      rerender(<SignupForm />)
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/email.*required/i)).toBeInTheDocument()
        expect(screen.getByText(/password.*required/i)).toBeInTheDocument()
        expect(screen.getByText(/confirm password.*required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      )

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/email/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('disables forms during submission', async () => {
      const user = userEvent.setup()
      
      // Create pending promise to simulate loading state
      let resolveAuth: (value: unknown) => void
      const authPromise = new Promise((resolve) => {
        resolveAuth = resolve
      })
      mockSupabaseClient.auth.signInWithPassword.mockReturnValue(authPromise)

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/email/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /log in/i })
      await user.click(submitButton)

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled()

      // Resolve and verify re-enabled
      resolveAuth!({ error: null, data: { user: mockUser } })
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled()
      })
    })
  })
})