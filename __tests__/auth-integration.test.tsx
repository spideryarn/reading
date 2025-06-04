/**
 * High-value authentication integration tests
 * 
 * These tests focus on user-facing functionality and provide good coverage
 * of core auth flows with minimal code. They test integration between
 * components rather than implementation details.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { SignupForm } from '@/components/auth/signup-form'
import { ProfileDropdown } from '@/components/auth/profile-dropdown'
import { AppHeader } from '@/components/app-header'
import { AuthProvider } from '@/lib/context/auth-context'
import { requireAuth } from '@/lib/auth/route-protection'
import { createClient } from '@/lib/supabase/client'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  redirect: jest.fn(),
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
  Button: ({ children, disabled, onClick, asChild, ...props }: any) => {
    if (asChild) {
      return <div {...props}>{children}</div>
    }
    return <button disabled={disabled} onClick={onClick} {...props}>{children}</button>
  },
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
})

describe('Authentication Integration Tests', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()
  const mockGet = jest.fn()
  const mockSignInWithPassword = jest.fn()
  const mockSignUp = jest.fn()
  const mockSignOut = jest.fn()
  const mockGetSession = jest.fn()
  const mockOnAuthStateChange = jest.fn()

  const mockSupabaseClient = {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock router
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
    
    // Mock search params
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: mockGet.mockReturnValue(null),
    })
    
    // Mock Supabase client
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    
    // Mock auth state change subscription
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
  })

  describe('Login Form Validation', () => {
    test('prevents submission with invalid email format', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      // Form validation should prevent submission
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    test('prevents submission with short password', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123') // Too short
      await user.click(submitButton)
      
      // Form validation should prevent submission
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    test('allows submission with valid credentials', async () => {
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
  })

  describe('Signup Form Validation', () => {
    test('prevents submission when passwords do not match', async () => {
      const user = userEvent.setup()
      render(<SignupForm />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'DifferentPassword')
      await user.click(submitButton)
      
      // Form validation should prevent submission
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    test('allows submission with valid data and matching passwords', async () => {
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

  describe('Profile Dropdown Functionality', () => {
    test('displays user email and handles dropdown toggle', async () => {
      const user = userEvent.setup()
      
      render(<ProfileDropdown user={mockUser} />)
      
      // Should display user email
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      
      // Click to open dropdown
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      // Should show profile link and logout button
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    test('handles logout functionality', async () => {
      const user = userEvent.setup()
      mockSignOut.mockResolvedValue({ error: null })
      
      render(<ProfileDropdown user={mockUser} />)
      
      // Open dropdown
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      // Click logout
      const logoutButton = screen.getByText('Log out')
      await user.click(logoutButton)
      
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })

  describe('App Header Auth Integration', () => {
    test('shows login/register buttons when user is not authenticated', () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      
      const TestWrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )
      
      render(
        <TestWrapper>
          <AppHeader title="Test Page" />
        </TestWrapper>
      )
      
      // Should show login and register buttons
      expect(screen.getByText('Log in')).toBeInTheDocument()
      expect(screen.getByText('Register')).toBeInTheDocument()
    })

    test('shows profile dropdown when user is authenticated', async () => {
      mockGetSession.mockResolvedValue({ 
        data: { session: { user: mockUser } } 
      })
      
      const TestWrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )
      
      render(
        <TestWrapper>
          <AppHeader title="Test Page" />
        </TestWrapper>
      )
      
      // Wait for auth context to load
      await waitFor(() => {
        expect(screen.queryByText('Log in')).not.toBeInTheDocument()
      })
      
      // Should show user email (from profile dropdown)
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  describe('Route Protection Server-Side', () => {
    // Mock Next.js server modules for route protection
    beforeEach(() => {
      jest.doMock('next/headers', () => ({
        cookies: jest.fn(),
      }))
      
      jest.doMock('@supabase/ssr', () => ({
        createServerClient: jest.fn(),
      }))
      
      jest.doMock('next/navigation', () => ({
        redirect: jest.fn(),
      }))
    })

    test('requireAuth redirects unauthenticated users', async () => {
      const { redirect } = await import('next/navigation')
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockUnauthenticatedClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockUnauthenticatedClient)
      
      await requireAuth()
      
      expect(redirect).toHaveBeenCalledWith('/auth/login')
    })

    test('requireAuth allows authenticated users through', async () => {
      const { redirect } = await import('next/navigation')
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockAuthenticatedClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockAuthenticatedClient)
      
      const result = await requireAuth()
      
      expect(result).toBe(mockUser)
      expect(redirect).not.toHaveBeenCalled()
    })

    test('requireAuth preserves return URL in redirect', async () => {
      const { redirect } = await import('next/navigation')
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      
      const mockCookieStore = {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      }
      
      const mockUnauthenticatedClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      }
      
      ;(cookies as jest.Mock).mockResolvedValue(mockCookieStore)
      ;(createServerClient as jest.Mock).mockReturnValue(mockUnauthenticatedClient)
      
      await requireAuth({ returnTo: '/documents/test-doc' })
      
      expect(redirect).toHaveBeenCalledWith('/auth/login?next=%2Fdocuments%2Ftest-doc')
    })
  })

  describe('Authentication Error Handling', () => {
    test('login form displays Supabase error messages', async () => {
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
    })

    test('signup form displays Supabase error messages', async () => {
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
    })

    test('profile dropdown handles logout errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSignOut.mockRejectedValue(new Error('Network error'))
      
      render(<ProfileDropdown user={mockUser} />)
      
      // Open dropdown and click logout
      const trigger = screen.getByRole('button')
      await user.click(trigger)
      
      const logoutButton = screen.getByText('Log out')
      await user.click(logoutButton)
      
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalledWith('Sign out error:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
    })
  })
})