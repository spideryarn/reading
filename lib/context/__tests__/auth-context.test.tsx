import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/lib/context/auth-context'
import { createClient } from '@/lib/supabase/client'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { getTestNamespace, createTestEmail } from '@/lib/testing/test-isolation-utils'

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

// Test component that uses the auth context
function TestComponent({ testEmail }: { testEmail: string }) {
  const { user, session, loading, signIn, signUp, signOut } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <div data-testid="session">{session ? 'Has session' : 'No session'}</div>
      <button data-testid="sign-in" onClick={() => signIn(testEmail, 'password')}>
        Log in
      </button>
      <button data-testid="sign-up" onClick={() => signUp(testEmail, 'password')}>
        Register
      </button>
      <button data-testid="sign-out" onClick={() => signOut()}>
        Log out
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  const mockGetSession = jest.fn()
  const mockOnAuthStateChange = jest.fn()
  const mockSignInWithPassword = jest.fn()
  const mockSignUp = jest.fn()
  const mockSignOut = jest.fn()
  const mockUnsubscribe = jest.fn()

  // Create test namespace for this test suite
  const namespace = getTestNamespace('auth-context-test')
  const testEmail = createTestEmail(namespace)
  const existingEmail = createTestEmail(namespace, 'existing')
  const newEmail = createTestEmail(namespace, 'new')

  const mockSupabaseClient = {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  }

  const mockUser: User = {
    id: 'user-123',
    email: testEmail,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
  }

  const mockSession: Session = {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: mockUser,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Supabase client
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    
    // Mock onAuthStateChange to return a subscription object
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
  })

  describe('useAuth hook', () => {
    test('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        render(<TestComponent testEmail={testEmail} />)
      }).toThrow('useAuth must be used within an AuthProvider')
      
      consoleSpy.mockRestore()
    })
  })

  describe('AuthProvider initialization', () => {
    test('starts with loading state', () => {
      mockGetSession.mockReturnValue(
        new Promise(() => {}) // Never resolves to keep loading state
      )
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      expect(screen.getByTestId('user')).toHaveTextContent('No user')
      expect(screen.getByTestId('session')).toHaveTextContent('No session')
    })

    test('initializes with existing session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
        expect(screen.getByTestId('user')).toHaveTextContent(testEmail)
        expect(screen.getByTestId('session')).toHaveTextContent('Has session')
      })
    })

    test('initializes with no session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
        expect(screen.getByTestId('user')).toHaveTextContent('No user')
        expect(screen.getByTestId('session')).toHaveTextContent('No session')
      })
    })

    test('handles session initialization error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockGetSession.mockRejectedValue(new Error('Session error'))
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
        expect(screen.getByTestId('user')).toHaveTextContent('No user')
        expect(screen.getByTestId('session')).toHaveTextContent('No session')
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('Error getting initial session:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    test('sets up auth state change listener', () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      expect(mockOnAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    test('cleans up auth state change listener on unmount', () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })
      
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      
      unmount()
      
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('Auth state changes', () => {
    test('updates state when user signs in', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })
      
      let authStateCallback: (event: string, session: Session | null) => void
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      })
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
      })
      
      // Simulate auth state change
      act(() => {
        authStateCallback!('SIGNED_IN', mockSession)
      })
      
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('session')).toHaveTextContent('Has session')
    })

    test('updates state when user signs out', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })
      
      let authStateCallback: (event: string, session: Session | null) => void
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      })
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      // Wait for initial load with session
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(testEmail)
      })
      
      // Simulate sign out
      act(() => {
        authStateCallback!('SIGNED_OUT', null)
      })
      
      expect(screen.getByTestId('user')).toHaveTextContent('No user')
      expect(screen.getByTestId('session')).toHaveTextContent('No session')
    })
  })

  describe('Auth methods', () => {
    beforeEach(async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
      })
    })

    describe('signIn', () => {
      test('calls Supabase signInWithPassword with correct parameters', async () => {
        mockSignInWithPassword.mockResolvedValue({ error: null })
        
        const signInButton = screen.getByTestId('sign-in')
        await act(async () => {
          signInButton.click()
        })
        
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: testEmail,
          password: 'password',
        })
      })

      test('returns error from Supabase', async () => {
        const authError: AuthError = {
          name: 'AuthError',
          message: 'Invalid credentials',
        }
        mockSignInWithPassword.mockResolvedValue({ error: authError })
        
        function TestSignInError() {
          const { signIn } = useAuth()
          const [result, setResult] = React.useState<{ error: AuthError | null } | null>(null)
          
          React.useEffect(() => {
            signIn(testEmail, 'wrongpassword').then(setResult)
          }, [signIn])
          
          return <div data-testid="result">{result ? (result.error ? 'error' : 'success') : 'loading'}</div>
        }
        
        render(
          <AuthProvider>
            <TestSignInError />
          </AuthProvider>
        )
        
        await waitFor(() => {
          expect(screen.getByTestId('result')).toHaveTextContent('error')
        })
      })

      test('returns null error on success', async () => {
        mockSignInWithPassword.mockResolvedValue({ error: null })
        
        function TestSignInSuccess() {
          const { signIn } = useAuth()
          const [result, setResult] = React.useState<{ error: AuthError | null } | null>(null)
          
          React.useEffect(() => {
            signIn(testEmail, 'password').then(setResult)
          }, [signIn])
          
          return <div data-testid="result">{result ? (result.error ? 'error' : 'success') : 'loading'}</div>
        }
        
        render(
          <AuthProvider>
            <TestSignInSuccess />
          </AuthProvider>
        )
        
        await waitFor(() => {
          expect(screen.getByTestId('result')).toHaveTextContent('success')
        })
      })
    })

    describe('signUp', () => {
      test('calls Supabase signUp with correct parameters', async () => {
        mockSignUp.mockResolvedValue({ error: null })
        
        const signUpButton = screen.getByTestId('sign-up')
        await act(async () => {
          signUpButton.click()
        })
        
        expect(mockSignUp).toHaveBeenCalledWith({
          email: testEmail,
          password: 'password',
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
          },
        })
      })

      test('returns error from Supabase', async () => {
        const authError: AuthError = {
          name: 'AuthError',
          message: 'User already exists',
        }
        mockSignUp.mockResolvedValue({ error: authError })
        
        function TestSignUpError() {
          const { signUp } = useAuth()
          const [result, setResult] = React.useState<{ error: AuthError | null } | null>(null)
          
          React.useEffect(() => {
            signUp(existingEmail, 'password').then(setResult)
          }, [signUp])
          
          return <div data-testid="result">{result ? (result.error ? 'error' : 'success') : 'loading'}</div>
        }
        
        render(
          <AuthProvider>
            <TestSignUpError />
          </AuthProvider>
        )
        
        await waitFor(() => {
          expect(screen.getByTestId('result')).toHaveTextContent('error')
        })
      })

      test('returns null error on success', async () => {
        mockSignUp.mockResolvedValue({ error: null })
        
        function TestSignUpSuccess() {
          const { signUp } = useAuth()
          const [result, setResult] = React.useState<{ error: AuthError | null } | null>(null)
          
          React.useEffect(() => {
            signUp(newEmail, 'password').then(setResult)
          }, [signUp])
          
          return <div data-testid="result">{result ? (result.error ? 'error' : 'success') : 'loading'}</div>
        }
        
        render(
          <AuthProvider>
            <TestSignUpSuccess />
          </AuthProvider>
        )
        
        await waitFor(() => {
          expect(screen.getByTestId('result')).toHaveTextContent('success')
        })
      })
    })

    describe('signOut', () => {
      test('calls Supabase signOut', async () => {
        mockSignOut.mockResolvedValue({ error: null })
        
        const signOutButton = screen.getByTestId('sign-out')
        await act(async () => {
          signOutButton.click()
        })
        
        expect(mockSignOut).toHaveBeenCalled()
      })

      test('returns error from Supabase', async () => {
        const authError: AuthError = {
          name: 'AuthError',
          message: 'Network error',
        }
        mockSignOut.mockResolvedValue({ error: authError })
        
        function TestSignOutError() {
          const { signOut } = useAuth()
          const [result, setResult] = React.useState<{ error: AuthError | null } | null>(null)
          
          React.useEffect(() => {
            signOut().then(setResult)
          }, [signOut])
          
          return <div data-testid="result">{result ? (result.error ? 'error' : 'success') : 'loading'}</div>
        }
        
        render(
          <AuthProvider>
            <TestSignOutError />
          </AuthProvider>
        )
        
        await waitFor(() => {
          expect(screen.getByTestId('result')).toHaveTextContent('error')
        })
      })

      test('returns null error on success', async () => {
        mockSignOut.mockResolvedValue({ error: null })
        
        function TestSignOutSuccess() {
          const { signOut } = useAuth()
          const [result, setResult] = React.useState<{ error: AuthError | null } | null>(null)
          
          React.useEffect(() => {
            signOut().then(setResult)
          }, [signOut])
          
          return <div data-testid="result">{result ? (result.error ? 'error' : 'success') : 'loading'}</div>
        }
        
        render(
          <AuthProvider>
            <TestSignOutSuccess />
          </AuthProvider>
        )
        
        await waitFor(() => {
          expect(screen.getByTestId('result')).toHaveTextContent('success')
        })
      })
    })
  })

  describe('Session persistence', () => {
    test('maintains user state across re-renders', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })
      
      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(testEmail)
      })
      
      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      
      // Should still maintain the user state
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    test('loading state turns false after initial session check', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
      })
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      // Initially loading
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      
      // After session loads
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
      })
    })

    test('loading becomes false on auth state changes', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })
      
      let authStateCallback: (event: string, session: Session | null) => void
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      })
      
      render(
        <AuthProvider>
          <TestComponent testEmail={testEmail} />
        </AuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
      })
      
      // Simulate auth state change - loading should remain false
      act(() => {
        authStateCallback!('SIGNED_IN', mockSession)
      })
      
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded')
    })
  })
})