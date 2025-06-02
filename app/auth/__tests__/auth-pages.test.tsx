import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/auth/login/page'
import SignupPage from '@/app/auth/signup/page'
import AuthCodeErrorPage from '@/app/auth/auth-code-error/page'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  })),
}))

// Mock components to avoid complex dependencies
jest.mock('@/components/app-header', () => ({
  AppHeader: () => <header data-testid="app-header">App Header</header>,
}))

jest.mock('@/components/auth/login-form', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}))

jest.mock('@/components/auth/signup-form', () => ({
  SignupForm: () => <div data-testid="signup-form">Signup Form</div>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      return <div {...props}>{children}</div>
    }
    return <button {...props}>{children}</button>
  },
}))

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Authentication Pages', () => {
  describe('LoginPage', () => {
    test('renders login page with correct structure', () => {
      render(<LoginPage />)
      
      // Check page structure
      expect(screen.getByTestId('app-header')).toBeInTheDocument()
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      
      // Check heading and content
      expect(screen.getByRole('heading', { 
        name: /sign in to your account/i 
      })).toBeInTheDocument()
      
      // Check signup link
      expect(screen.getByRole('link', { 
        name: /create a new account/i 
      })).toBeInTheDocument()
      expect(screen.getByRole('link', { 
        name: /create a new account/i 
      })).toHaveAttribute('href', '/auth/signup')
    })

    test('has correct page structure and styling classes', () => {
      const { container } = render(<LoginPage />)
      
      // Check main layout classes
      const mainElement = container.querySelector('main')
      expect(mainElement).toHaveClass('flex', 'items-center', 'justify-center')
      
      // Check background styling
      const outerDiv = container.querySelector('.min-h-screen')
      expect(outerDiv).toHaveClass('bg-gray-50')
    })

    test('renders with accessible structure', () => {
      render(<LoginPage />)
      
      // Should have a main landmark
      expect(screen.getByRole('main')).toBeInTheDocument()
      
      // Should have proper heading hierarchy
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })
  })

  describe('SignupPage', () => {
    test('renders signup page with correct structure', () => {
      render(<SignupPage />)
      
      // Check page structure
      expect(screen.getByTestId('app-header')).toBeInTheDocument()
      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
      
      // Check heading and content
      expect(screen.getByRole('heading', { 
        name: /create your account/i 
      })).toBeInTheDocument()
      
      // Check login link
      expect(screen.getByRole('link', { 
        name: /sign in to your existing account/i 
      })).toBeInTheDocument()
      expect(screen.getByRole('link', { 
        name: /sign in to your existing account/i 
      })).toHaveAttribute('href', '/auth/login')
    })

    test('has correct page structure and styling classes', () => {
      const { container } = render(<SignupPage />)
      
      // Check main layout classes
      const mainElement = container.querySelector('main')
      expect(mainElement).toHaveClass('flex', 'items-center', 'justify-center')
      
      // Check background styling
      const outerDiv = container.querySelector('.min-h-screen')
      expect(outerDiv).toHaveClass('bg-gray-50')
    })

    test('renders with accessible structure', () => {
      render(<SignupPage />)
      
      // Should have a main landmark
      expect(screen.getByRole('main')).toBeInTheDocument()
      
      // Should have proper heading hierarchy
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })
  })

  describe('AuthCodeErrorPage', () => {
    test('renders error page with correct structure', () => {
      render(<AuthCodeErrorPage />)
      
      // Check page structure
      expect(screen.getByTestId('app-header')).toBeInTheDocument()
      
      // Check main heading
      expect(screen.getByRole('heading', { 
        name: /authentication error/i 
      })).toBeInTheDocument()
      
      // Check error description
      expect(screen.getByText(/there was a problem with your authentication link/i))
        .toBeInTheDocument()
    })

    test('displays error reasons list', () => {
      render(<AuthCodeErrorPage />)
      
      // Check that error reasons are displayed
      expect(screen.getByText(/the link has expired/i)).toBeInTheDocument()
      expect(screen.getByText(/the link has already been used/i)).toBeInTheDocument()
      expect(screen.getByText(/the link was corrupted or incomplete/i)).toBeInTheDocument()
    })

    test('renders action buttons with correct links', () => {
      render(<AuthCodeErrorPage />)
      
      // Check signup button
      const signupLink = screen.getByRole('link', { 
        name: /create a new account/i 
      })
      expect(signupLink).toBeInTheDocument()
      expect(signupLink).toHaveAttribute('href', '/auth/signup')
      
      // Check login button
      const loginLink = screen.getByRole('link', { 
        name: /sign in to existing account/i 
      })
      expect(loginLink).toBeInTheDocument()
      expect(loginLink).toHaveAttribute('href', '/auth/login')
      
      // Check homepage button
      const homeLink = screen.getByRole('link', { 
        name: /return to homepage/i 
      })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute('href', '/')
    })

    test('displays error icon and styling', () => {
      const { container } = render(<AuthCodeErrorPage />)
      
      // Check for error icon container
      const iconContainer = container.querySelector('.bg-red-100')
      expect(iconContainer).toBeInTheDocument()
      
      // Check for error icon SVG
      const errorIcon = container.querySelector('svg')
      expect(errorIcon).toBeInTheDocument()
      expect(errorIcon).toHaveClass('text-red-600')
    })

    test('has correct page structure and styling classes', () => {
      const { container } = render(<AuthCodeErrorPage />)
      
      // Check main layout classes
      const mainElement = container.querySelector('main')
      expect(mainElement).toHaveClass('flex', 'items-center', 'justify-center')
      
      // Check background styling
      const outerDiv = container.querySelector('.min-h-screen')
      expect(outerDiv).toHaveClass('bg-gray-50')
    })

    test('renders with accessible structure', () => {
      render(<AuthCodeErrorPage />)
      
      // Should have a main landmark
      expect(screen.getByRole('main')).toBeInTheDocument()
      
      // Should have proper heading hierarchy
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      
      // Links should be accessible
      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)
      links.forEach(link => {
        expect(link).toHaveAttribute('href')
      })
    })

    test('action buttons are interactive', async () => {
      const user = userEvent.setup()
      render(<AuthCodeErrorPage />)
      
      // Test that buttons are clickable (they're rendered as links wrapped in Button components)
      const signupLink = screen.getByRole('link', { name: /create a new account/i })
      const loginLink = screen.getByRole('link', { name: /sign in to existing account/i })
      const homeLink = screen.getByRole('link', { name: /return to homepage/i })
      
      // These should be clickable without throwing errors
      await user.hover(signupLink)
      await user.hover(loginLink)
      await user.hover(homeLink)
      
      expect(signupLink).toBeInTheDocument()
      expect(loginLink).toBeInTheDocument()
      expect(homeLink).toBeInTheDocument()
    })
  })

  describe('Cross-page consistency', () => {
    test('all auth pages use consistent layout structure', () => {
      const pages = [
        { component: LoginPage, name: 'LoginPage' },
        { component: SignupPage, name: 'SignupPage' },
        { component: AuthCodeErrorPage, name: 'AuthCodeErrorPage' },
      ]
      
      pages.forEach(({ component: Component, name }) => {
        const { container, unmount } = render(<Component />)
        
        // All should have min-h-screen bg-gray-50
        expect(container.querySelector('.min-h-screen.bg-gray-50')).toBeInTheDocument()
        
        // All should have app header
        expect(screen.getByTestId('app-header')).toBeInTheDocument()
        
        // All should have main element with centered content
        const main = screen.getByRole('main')
        expect(main).toHaveClass('flex', 'items-center', 'justify-center')
        
        // All should have max-w-md container
        expect(container.querySelector('.max-w-md')).toBeInTheDocument()
        
        unmount()
      })
    })

    test('all auth pages have proper heading structure', () => {
      const pages = [
        { component: LoginPage, expectedHeading: /sign in to your account/i },
        { component: SignupPage, expectedHeading: /create your account/i },
        { component: AuthCodeErrorPage, expectedHeading: /authentication error/i },
      ]
      
      pages.forEach(({ component: Component, expectedHeading }) => {
        const { unmount } = render(<Component />)
        
        // Should have h2 heading
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: expectedHeading })).toBeInTheDocument()
        
        unmount()
      })
    })
  })
})