import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { SignupForm } from '@/components/auth/signup-form'
import { createClient } from '@/lib/supabase/client'
import { getTestNamespace, createTestEmail } from '@/lib/testing/test-isolation-utils'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
})

// Mock UI components to avoid complex shadcn/ui setup
jest.mock('@/components/ui/form', () => {
  let fieldCounter = 0
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Form: ({ children }: any) => <div data-testid="form">{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FormControl: ({ children }: any) => <div>{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FormField: ({ name }: any) => {
      const fieldId = `field-${++fieldCounter}-${name}`
      const field = { value: '', onChange: jest.fn(), onBlur: jest.fn(), name }
      let labelText = name
      if (name === 'email') labelText = 'Email address'
      else if (name === 'password') labelText = 'Password'
      else if (name === 'confirmPassword') labelText = 'Confirm password'
      
      return (
        <div>
          <label htmlFor={fieldId}>{labelText}</label>
          <input id={fieldId} {...field} />
        </div>
      )
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FormItem: ({ children }: any) => <div>{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FormLabel: ({ children }: any) => <span>{children}</span>,
    FormMessage: () => <div data-testid="form-message"></div>,
  }
})

jest.mock('@/components/ui/button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input: (props: any) => <input {...props} />,
}))

jest.mock('@/components/auth/oauth-button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OAuthButton: ({ provider, children }: any) => (
    <button data-testid={`oauth-${provider}`}>
      {children}
    </button>
  ),
}))

describe('Authentication Workflow Integration', () => {
  // Create test namespace for this test suite
  const namespace = getTestNamespace('auth-workflow-test')
  const testEmail = createTestEmail(namespace)
  const newUserEmail = createTestEmail(namespace, 'newuser')
  
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }

  const mockSearchParams = {
    get: jest.fn(),
  }

  const mockSupabaseClient = {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    mockSearchParams.get.mockReturnValue(null)
  })

  describe('Login Form Integration', () => {
    it('handles successful login workflow', async () => {
      const user = userEvent.setup()
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: '123', email: testEmail } }
      })

      render(<LoginForm />)

      // Fill form
      await user.type(screen.getByLabelText(/email address/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Verify auth call and redirect
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: testEmail,
          password: 'password123',
        })
        expect(mockRouter.push).toHaveBeenCalledWith('/')
      })
    })

    it('handles login validation errors', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      // Submit without filling form
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/email address is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('handles auth errors from Supabase', async () => {
      const user = userEvent.setup()
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
        data: null
      })

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/email address/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })
    })
  })

  describe('Signup Form Integration', () => {
    it('handles successful signup workflow', async () => {
      const user = userEvent.setup()
      
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        error: null,
        data: { user: { id: '123', email: newUserEmail } }
      })

      render(<SignupForm />)

      // Fill form
      await user.type(screen.getByLabelText(/email address/i), newUserEmail)
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      // Verify auth call
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: newUserEmail,
          password: 'password123',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/confirm',
          },
        })
      })

      // Should show confirmation message
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })

    it('validates password confirmation', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)

      await user.type(screen.getByLabelText(/email address/i), testEmail)
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'different')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('handles signup validation errors', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)

      // Submit without filling form
      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/email address is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('OAuth Integration', () => {
    it('renders OAuth buttons for both forms', () => {
      const { rerender } = render(<LoginForm />)
      expect(screen.getByTestId('oauth-google')).toBeInTheDocument()

      rerender(<SignupForm />)
      expect(screen.getByTestId('oauth-google')).toBeInTheDocument()
    })
  })

  describe('Error Handling & Edge Cases', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      )

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/email address/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('disables form during submission', async () => {
      const user = userEvent.setup()
      
      // Create a promise that never resolves to simulate slow network
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let resolveAuth: (value: any) => void
      const authPromise = new Promise((resolve) => {
        resolveAuth = resolve
      })
      mockSupabaseClient.auth.signInWithPassword.mockReturnValue(authPromise)

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/email address/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled()

      // Resolve the auth call
      resolveAuth!({ error: null, data: { user: { id: '123' } } })
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled()
      })
    })
  })

  describe('URL Parameter Handling', () => {
    it('handles redirect parameter in login form', async () => {
      const user = userEvent.setup()
      
      mockSearchParams.get.mockImplementation((key) => 
        key === 'redirectTo' ? '/documents' : null
      )
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: '123' } }
      })

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/email address/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/documents')
      })
    })
  })
})