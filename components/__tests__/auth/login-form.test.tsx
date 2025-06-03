import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { createClient } from '@/lib/supabase/client'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock UI components to avoid complex shadcn/ui setup
jest.mock('@/components/ui/form', () => {
  let fieldCounter = 0
  return {
    Form: ({ children, ...props }: any) => <div data-testid="form">{children}</div>,
    FormControl: ({ children }: any) => <div>{children}</div>,
    FormField: ({ render, control, name }: any) => {
      const fieldId = `field-${++fieldCounter}-${name}`
      const field = { value: '', onChange: jest.fn(), onBlur: jest.fn(), name }
      return (
        <div>
          <label htmlFor={fieldId}>{name === 'email' ? 'Email address' : name === 'password' ? 'Password' : name}</label>
          <input id={fieldId} {...field} />
        </div>
      )
    },
    FormItem: ({ children }: any) => <div>{children}</div>,
    FormLabel: ({ children }: any) => <span>{children}</span>,
    FormMessage: () => <div data-testid="form-message"></div>,
  }
})

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
}))

describe('LoginForm', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()
  const mockGet = jest.fn()
  const mockSignInWithPassword = jest.fn()
  const mockSupabaseClient = {
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock router
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
    
    // Mock search params - default to no 'next' param
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: mockGet.mockReturnValue(null),
    })
    
    // Mock Supabase client
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('Form Rendering', () => {
    test('renders login form with all required fields', () => {
      render(<LoginForm />)
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    })

    test('renders email field with correct attributes', () => {
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
    })

    test('renders password field with correct attributes', () => {
      render(<LoginForm />)
      
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
    })
  })

  describe('Form Validation', () => {
    test('validates email is required', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const submitButton = screen.getByRole('button', { name: /log in/i })
      await user.click(submitButton)
      
      // The form validation should prevent submission
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    test('validates email format', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      // The form validation should prevent submission
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    test('validates password is required', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      // The form validation should prevent submission
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    test('validates password minimum length', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '12345') // Less than 6 characters
      await user.click(submitButton)
      
      // The form validation should prevent submission
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    test('submits form with valid data', async () => {
      const user = userEvent.setup()
      mockSignInWithPassword.mockResolvedValue({ error: null })
      
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        })
      })
    })

    test('shows loading state during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: () => void
      const signInPromise = new Promise<{ error: null }>((resolve) => {
        resolvePromise = () => resolve({ error: null })
      })
      mockSignInWithPassword.mockReturnValue(signInPromise)
      
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      // Check loading state
      expect(screen.getByRole('button', { name: /logging in/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled()
      
      // Resolve the promise
      resolvePromise!()
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
      })
    })

    test('redirects to home page on successful login (no next param)', async () => {
      const user = userEvent.setup()
      mockSignInWithPassword.mockResolvedValue({ error: null })
      
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    test('redirects to next parameter on successful login', async () => {
      const user = userEvent.setup()
      mockSignInWithPassword.mockResolvedValue({ error: null })
      mockGet.mockReturnValue('/documents/example')
      
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/documents/example')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    test('displays authentication error from Supabase', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Invalid login credentials'
      mockSignInWithPassword.mockResolvedValue({ 
        error: { message: errorMessage }
      })
      
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(errorMessage)
      })
      
      // Should not redirect on error
      expect(mockPush).not.toHaveBeenCalled()
    })

    test('displays generic error on unexpected errors', async () => {
      const user = userEvent.setup()
      mockSignInWithPassword.mockRejectedValue(new Error('Network error'))
      
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'An unexpected error occurred. Please try again.'
        )
      })
    })

    test('clears error when retrying submission', async () => {
      const user = userEvent.setup()
      // First call fails
      mockSignInWithPassword.mockResolvedValueOnce({ 
        error: { message: 'Invalid credentials' }
      })
      // Second call succeeds
      mockSignInWithPassword.mockResolvedValueOnce({ error: null })
      
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      // First attempt - should show error
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      
      // Clear password and try again
      await user.clear(passwordInput)
      await user.type(passwordInput, 'correctpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })
})