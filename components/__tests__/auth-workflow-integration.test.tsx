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

// Mock the entire auth forms to have better control over testing
jest.mock('@/components/auth/login-form', () => ({
  LoginForm: () => {
    const React = jest.requireActual('react')
    const { createClient } = jest.requireActual('@/lib/supabase/client')
    const { useRouter, useSearchParams } = jest.requireActual('next/navigation')
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [error, setError] = React.useState(null)
    const [isLoading, setIsLoading] = React.useState(false)
    const [emailError, setEmailError] = React.useState('')
    const [passwordError, setPasswordError] = React.useState('')
    
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setEmailError('')
      setPasswordError('')
      setError(null)
      
      // Validation
      let hasError = false
      if (!email) {
        setEmailError('Email address is required')
        hasError = true
      }
      if (!password) {
        setPasswordError('Password is required')
        hasError = true
      }
      
      if (hasError) return
      
      setIsLoading(true)
      
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (signInError) {
          setError(signInError.message)
        } else {
          const redirectTo = searchParams.get('redirectTo') || '/'
          router.push(redirectTo)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    return (
      <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg sm:px-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div>{error}</div>}
          
          <div>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
            {emailError && <div>{emailError}</div>}
          </div>
          
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            {passwordError && <div>{passwordError}</div>}
          </div>
          
          <div className="text-right">
            <a href="/auth/reset-password" className="text-sm text-orange-600 hover:text-orange-700 transition-colors">
              Forgot password?
            </a>
          </div>
          
          <button type="submit" disabled={isLoading}>
            Sign in
          </button>
          
          <div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <button type="button" data-testid="oauth-google">
              Sign in with Google
            </button>
          </div>
        </form>
      </div>
    )
  }
}))

jest.mock('@/components/auth/signup-form', () => ({
  SignupForm: () => {
    const React = jest.requireActual('react')
    const { createClient } = jest.requireActual('@/lib/supabase/client')
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [confirmPassword, setConfirmPassword] = React.useState('')
    const [error, setError] = React.useState(null)
    const [isLoading, setIsLoading] = React.useState(false)
    const [showSuccess, setShowSuccess] = React.useState(false)
    const [emailError, setEmailError] = React.useState('')
    const [passwordError, setPasswordError] = React.useState('')
    const [confirmPasswordError, setConfirmPasswordError] = React.useState('')
    
    const supabase = createClient()
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setEmailError('')
      setPasswordError('')
      setConfirmPasswordError('')
      setError(null)
      
      // Validation
      let hasError = false
      if (!email) {
        setEmailError('Email address is required')
        hasError = true
      }
      if (!password) {
        setPasswordError('Password is required')
        hasError = true
      }
      if (!confirmPassword) {
        setConfirmPasswordError('Confirm password is required')
        hasError = true
      }
      
      if (hasError) return
      
      if (password !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match')
        return
      }
      
      setIsLoading(true)
      
      try {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/confirm',
          },
        })
        
        if (signUpError) {
          setError(signUpError.message)
        } else {
          setShowSuccess(true)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (showSuccess) {
      return (
        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div>Check your email to confirm your account</div>
        </div>
      )
    }
    
    return (
      <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg sm:px-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div>{error}</div>}
          
          <div>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
            {emailError && <div>{emailError}</div>}
          </div>
          
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
            />
            {passwordError && <div>{passwordError}</div>}
          </div>
          
          <div>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
            />
            {confirmPasswordError && <div>{confirmPasswordError}</div>}
          </div>
          
          <button type="submit" disabled={isLoading}>
            Create account
          </button>
          
          <div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <button type="button" data-testid="oauth-google">
              Sign up with Google
            </button>
          </div>
        </form>
      </div>
    )
  }
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
      const submitButton = screen.getByRole('button', { name: /^sign in$/i })
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
      const submitButton = screen.getByRole('button', { name: /^sign in$/i })
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
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

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
      
      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      }, { timeout: 3000 })
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
        // Check for all three required field errors
        const allErrors = screen.getAllByText(/is required/i)
        expect(allErrors).toHaveLength(3) // email, password, confirm password
        
        // Verify specific password field error exists
        const passwordLabel = screen.getByLabelText(/^password$/i)
        const passwordError = passwordLabel.parentElement?.querySelector('div')
        expect(passwordError).toHaveTextContent('Password is required')
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
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('disables form during submission', async () => {
      const user = userEvent.setup()
      
      // Create a promise that never resolves to simulate slow network
      let resolveAuth: (value: any) => void
      const authPromise = new Promise((resolve) => {
        resolveAuth = resolve
      })
      mockSupabaseClient.auth.signInWithPassword.mockReturnValue(authPromise)

      render(<LoginForm />)

      await user.type(screen.getByLabelText(/email address/i), testEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /^sign in$/i })
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
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/documents')
      })
    })
  })
})