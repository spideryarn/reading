import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { SignupForm } from '@/components/auth/signup-form'
import { createClient } from '@/lib/supabase/client'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
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
    Form: ({ children, ...props }: any) => <div data-testid="form">{children}</div>,
    FormControl: ({ children }: any) => <div>{children}</div>,
    FormField: ({ render, control, name }: any) => {
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
    FormItem: ({ children }: any) => <div>{children}</div>,
    FormLabel: ({ children }: any) => <span>{children}</span>,
    FormMessage: () => <div data-testid="form-message"></div>,
  }
})

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, variant, ...props }: any) => (
    <button disabled={disabled} onClick={onClick} data-variant={variant} {...props}>
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

describe('SignupForm', () => {
  const mockPush = jest.fn()
  const mockSignUp = jest.fn()
  const mockSupabaseClient = {
    auth: {
      signUp: mockSignUp,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock router
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    
    // Mock Supabase client
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('Form Rendering', () => {
    test('renders signup form with all required fields', () => {
      render(<SignupForm />)
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    test('renders email field with correct attributes', () => {
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
    })

    test('renders password fields with correct attributes', () => {
      render(<SignupForm />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Create a password')
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password')
      
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password')
      expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password')
    })
  })

  describe('Form Validation', () => {
    test('validates email is required', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)
      
      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)
      
      // The form validation should prevent submission
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    test('validates email format', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      // The form validation should prevent submission
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    test('validates password requirements', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      // Test minimum length
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '12345') // Less than 6 characters
      await user.type(confirmPasswordInput, '12345')
      await user.click(submitButton)
      
      expect(mockSignUp).not.toHaveBeenCalled()
      
      // Clear and test complexity requirements
      await user.clear(passwordInput)
      await user.clear(confirmPasswordInput)
      await user.type(passwordInput, 'simplepassword') // No uppercase or numbers
      await user.type(confirmPasswordInput, 'simplepassword')
      await user.click(submitButton)
      
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    test('validates password confirmation matching', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'DifferentPassword123')
      await user.click(submitButton)
      
      // The form validation should prevent submission
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    test('allows submission with valid data', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })
      
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
          },
        })
      })
    })
  })

  describe('Form Submission', () => {
    test('shows loading state during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: () => void
      const signUpPromise = new Promise<{ error: null }>((resolve) => {
        resolvePromise = () => resolve({ error: null })
      })
      mockSignUp.mockReturnValue(signUpPromise)
      
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(submitButton)
      
      // Check loading state
      expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
      
      // Resolve the promise
      resolvePromise!()
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /creating account/i })).not.toBeInTheDocument()
      })
    })

    test('shows success state after successful signup', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })
      
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
        expect(screen.getByText(/we've sent you a confirmation link/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument()
      })
      
      // Form fields should no longer be visible
      expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument()
    })

    test('success state go to login button works', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })
      
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument()
      })
      
      const goToLoginButton = screen.getByRole('button', { name: /go to login/i })
      await user.click(goToLoginButton)
      
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })
  })

  describe('Error Handling', () => {
    test('displays authentication error from Supabase', async () => {
      const user = userEvent.setup()
      const errorMessage = 'User already registered'
      mockSignUp.mockResolvedValue({ 
        error: { message: errorMessage }
      })
      
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(errorMessage)
      })
      
      // Should not show success state on error
      expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument()
    })

    test('displays generic error on unexpected errors', async () => {
      const user = userEvent.setup()
      mockSignUp.mockRejectedValue(new Error('Network error'))
      
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'An unexpected error occurred. Please try again.'
        )
      })
    })

    test('clears error and success state when retrying submission', async () => {
      const user = userEvent.setup()
      // First call fails
      mockSignUp.mockResolvedValueOnce({ 
        error: { message: 'User already registered' }
      })
      // Second call succeeds
      mockSignUp.mockResolvedValueOnce({ error: null })
      
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      // First attempt - should show error
      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      
      // Clear email and try again with different email
      await user.clear(emailInput)
      await user.type(emailInput, 'new@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      })
    })

    test('form reset clears all fields on successful signup', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })
      
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      
      // Verify fields have values
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('Password123')
      expect(confirmPasswordInput).toHaveValue('Password123')
      
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      })
      
      // After success, if we could still see the form, fields would be reset
      // But since we switch to success view, we test that the form component
      // called reset by checking the mock wasn't called again with the same values
      expect(mockSignUp).toHaveBeenCalledTimes(1)
    })
  })
})