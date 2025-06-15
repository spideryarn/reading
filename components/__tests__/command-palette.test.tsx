/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { CommandPalette } from '../command-palette'
import { useAuth } from '@/lib/context/auth-context'
import { useDocumentCommunication, useDocumentSlug } from '@/lib/context/document-communication-context'
import { getTestNamespace, createTestEmail } from '@/lib/testing/test-isolation-utils'

// Mock Next.js useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock auth context
jest.mock('@/lib/context/auth-context', () => ({
  useAuth: jest.fn(),
}))

// Mock document communication context
jest.mock('@/lib/context/document-communication-context', () => ({
  useDocumentCommunication: jest.fn(),
  useDocumentSlug: jest.fn(),
}))

// Mock shadcn/ui command components
jest.mock('@/components/ui/command', () => ({
  CommandDialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => (
    open ? (
      <div data-testid="command-dialog" role="dialog">
        <button onClick={() => onOpenChange(false)} data-testid="close-dialog">Close</button>
        {children}
      </div>
    ) : null
  ),
  CommandInput: ({ placeholder, ...props }: { placeholder?: string; [key: string]: unknown }) => (
    <input data-testid="command-input" placeholder={placeholder} {...props} />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children, heading }: { children: React.ReactNode; heading?: string }) => (
    <div data-testid="command-group">
      {heading && <div data-testid="group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect, ...props }: any) => (
    <button data-testid="command-item" onClick={onSelect} {...props}>
      {children}
    </button>
  ),
  CommandShortcut: ({ children }: any) => (
    <span data-testid="command-shortcut">{children}</span>
  ),
}))

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  Article: ({ size, className }: any) => (
    <span data-testid="icon-article" data-size={size} className={className} />
  ),
  Robot: ({ size, className }: any) => (
    <span data-testid="icon-robot" data-size={size} className={className} />
  ),
  ListBullets: ({ size, className }: any) => (
    <span data-testid="icon-list-bullets" data-size={size} className={className} />
  ),
  ChatCircle: ({ size, className }: any) => (
    <span data-testid="icon-chat-circle" data-size={size} className={className} />
  ),
  BookOpen: ({ size, className }: any) => (
    <span data-testid="icon-book-open" data-size={size} className={className} />
  ),
  MagnifyingGlass: ({ size, className }: any) => (
    <span data-testid="icon-magnifying-glass" data-size={size} className={className} />
  ),
  House: ({ size, className }: any) => (
    <span data-testid="icon-house" data-size={size} className={className} />
  ),
  Upload: ({ size, className }: any) => (
    <span data-testid="icon-upload" data-size={size} className={className} />
  ),
  Gear: ({ size, className }: any) => (
    <span data-testid="icon-gear" data-size={size} className={className} />
  ),
  User: ({ size, className }: any) => (
    <span data-testid="icon-user" data-size={size} className={className} />
  ),
  SignIn: ({ size, className }: any) => (
    <span data-testid="icon-sign-in" data-size={size} className={className} />
  ),
  UserPlus: ({ size, className }: any) => (
    <span data-testid="icon-user-plus" data-size={size} className={className} />
  ),
  SignOut: ({ size, className }: any) => (
    <span data-testid="icon-sign-out" data-size={size} className={className} />
  ),
  TwitterLogo: ({ size, className }: any) => (
    <span data-testid="icon-twitter-logo" data-size={size} className={className} />
  ),
  FileText: ({ size, className }: any) => (
    <span data-testid="icon-file-text" data-size={size} className={className} />
  ),
}))

describe('CommandPalette', () => {
  const namespace = getTestNamespace('command-palette')
  const mockRouter = {
    push: jest.fn(),
  }

  const mockDocumentActions = {
    setActiveTab: jest.fn(),
  }

  const mockSignOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useDocumentCommunication as jest.Mock).mockReturnValue({
      actions: mockDocumentActions,
    })
    ;(useDocumentSlug as jest.Mock).mockReturnValue(null) // Default: no document context

    // Mock platform detection to default to non-Mac
    Object.defineProperty(window, 'navigator', {
      value: {
        platform: 'Win32',
      },
      writable: true,
    })
  })

  describe('Component Rendering', () => {
    it('should not render dialog when closed', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
    })

    it('should render command input and placeholder when dialog is open', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)

      // Open dialog with Ctrl+K
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      expect(screen.getByTestId('command-dialog')).toBeInTheDocument()
      expect(screen.getByTestId('command-input')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should open/close dialog with Ctrl+K on Windows/Linux', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)

      // Initially closed
      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()

      // Open with Ctrl+K
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
      expect(screen.getByTestId('command-dialog')).toBeInTheDocument()

      // Close with Ctrl+K again
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
    })

    it('should open/close dialog with Cmd+K on Mac', () => {
      // Mock Mac platform
      Object.defineProperty(window, 'navigator', {
        value: {
          platform: 'MacIntel',
        },
        writable: true,
      })

      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)

      // Initially closed
      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()

      // Open with Cmd+K (metaKey on Mac)
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      expect(screen.getByTestId('command-dialog')).toBeInTheDocument()

      // Close with Cmd+K again
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
    })

    it('should not open with wrong modifier key', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)

      // Try with wrong modifier (should not open on Windows)
      fireEvent.keyDown(document, { key: 'k', metaKey: true })
      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()

      // Try with alt key
      fireEvent.keyDown(document, { key: 'k', altKey: true })
      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
    })

    it('should execute navigation tab shortcuts', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)

      // Test Ctrl+1 for original tab
      fireEvent.keyDown(document, { key: '1', ctrlKey: true })
      expect(mockDocumentActions.setActiveTab).toHaveBeenCalledWith('original')

      // Test Ctrl+2 for ai-generated tab
      fireEvent.keyDown(document, { key: '2', ctrlKey: true })
      expect(mockDocumentActions.setActiveTab).toHaveBeenCalledWith('ai-generated')

      // Test Ctrl+3 for summary tab
      fireEvent.keyDown(document, { key: '3', ctrlKey: true })
      expect(mockDocumentActions.setActiveTab).toHaveBeenCalledWith('summary')

      // Test Ctrl+4 for chat tab
      fireEvent.keyDown(document, { key: '4', ctrlKey: true })
      expect(mockDocumentActions.setActiveTab).toHaveBeenCalledWith('chat')

      // Test Ctrl+5 for glossary tab
      fireEvent.keyDown(document, { key: '5', ctrlKey: true })
      expect(mockDocumentActions.setActiveTab).toHaveBeenCalledWith('glossary')

      // Test Ctrl+6 for search tab
      fireEvent.keyDown(document, { key: '6', ctrlKey: true })
      expect(mockDocumentActions.setActiveTab).toHaveBeenCalledWith('search')
    })

    it('should execute app navigation shortcuts', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)

      // Test Ctrl+D for documents
      fireEvent.keyDown(document, { key: 'd', ctrlKey: true })
      expect(mockRouter.push).toHaveBeenCalledWith('/read')

      // Test Ctrl+U for upload
      fireEvent.keyDown(document, { key: 'u', ctrlKey: true })
      expect(mockRouter.push).toHaveBeenCalledWith('/upload')

      // Test Ctrl+, for settings
      fireEvent.keyDown(document, { key: ',', ctrlKey: true })
      expect(mockRouter.push).toHaveBeenCalledWith('/settings')
    })
  })

  describe('App Navigation Commands', () => {
    it('should render app navigation commands', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Check app navigation commands are present
      expect(screen.getByText('Documents List')).toBeInTheDocument()
      expect(screen.getByText('Upload Document')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()

      // Check shortcuts are displayed
      expect(screen.getByText('Ctrl+D')).toBeInTheDocument()
      expect(screen.getByText('Ctrl+U')).toBeInTheDocument()
      expect(screen.getByText('Ctrl+,')).toBeInTheDocument()
    })

    it('should execute app navigation commands when clicked', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Click documents command
      const documentsCommand = screen.getByText('Documents List').closest('[data-testid="command-item"]')
      fireEvent.click(documentsCommand!)

      expect(mockRouter.push).toHaveBeenCalledWith('/read')

      // Dialog should close after command execution
      await waitFor(() => {
        expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
      })
    })

    it('should show Mac shortcuts on Mac platform', () => {
      // Mock Mac platform
      Object.defineProperty(window, 'navigator', {
        value: {
          platform: 'MacIntel',
        },
        writable: true,
      })

      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', metaKey: true })

      // Check Mac-style shortcuts are displayed
      expect(screen.getByText('⌘+D')).toBeInTheDocument()
      expect(screen.getByText('⌘+U')).toBeInTheDocument()
      expect(screen.getByText('⌘+,')).toBeInTheDocument()
    })
  })

  describe('Authentication-Dependent Commands', () => {
    it('should show login/signup commands for unauthenticated users', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Should show auth commands for unauthenticated users
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()

      // Should NOT show authenticated user commands
      expect(screen.queryByText('Profile')).not.toBeInTheDocument()
      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
    })

    it('should show profile/logout commands for authenticated users', () => {
      const mockUser = { id: '123', email: createTestEmail(namespace, 'authenticated') }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Should show commands for authenticated users
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Sign Out')).toBeInTheDocument()

      // Should NOT show unauthenticated user commands
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
      expect(screen.queryByText('Sign Up')).not.toBeInTheDocument()
    })

    it('should execute auth commands correctly', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Click sign in command
      const signInCommand = screen.getByText('Sign In').closest('[data-testid="command-item"]')
      fireEvent.click(signInCommand!)

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')

      // Reopen dialog to test sign up
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Click sign up command
      const signUpCommand = screen.getByText('Sign Up').closest('[data-testid="command-item"]')
      fireEvent.click(signUpCommand!)

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/signup')
    })

    it('should execute logout command correctly', async () => {
      const mockUser = { id: '123', email: createTestEmail(namespace, 'logout') }
      mockSignOut.mockResolvedValue({ error: null })

      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Click sign out command
      const signOutCommand = screen.getByText('Sign Out').closest('[data-testid="command-item"]')
      fireEvent.click(signOutCommand!)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
        expect(mockRouter.push).toHaveBeenCalledWith('/')
      })
    })

    it('should handle logout error gracefully', async () => {
      const mockUser = { id: '123', email: createTestEmail(namespace, 'logout-error') }
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSignOut.mockResolvedValue({ error: { message: 'Logout failed' } })

      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Click sign out command
      const signOutCommand = screen.getByText('Sign Out').closest('[data-testid="command-item"]')
      fireEvent.click(signOutCommand!)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
        expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', { message: 'Logout failed' })
        // Should not navigate on error
        expect(mockRouter.push).not.toHaveBeenCalledWith('/')
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Navigation Tab Commands', () => {
    it('should render navigation tab commands', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Check navigation tab commands are present
      expect(screen.getByText('Original Document')).toBeInTheDocument()
      expect(screen.getByText('AI-Generated Document')).toBeInTheDocument()
      expect(screen.getByText('Summary')).toBeInTheDocument()
      expect(screen.getByText('Chat')).toBeInTheDocument()
      expect(screen.getByText('Glossary')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()

      // Check icons are rendered
      expect(screen.getByTestId('icon-article')).toBeInTheDocument()
      expect(screen.getByTestId('icon-robot')).toBeInTheDocument()
      expect(screen.getByTestId('icon-list-bullets')).toBeInTheDocument()
      expect(screen.getByTestId('icon-chat-circle')).toBeInTheDocument()
      expect(screen.getByTestId('icon-book-open')).toBeInTheDocument()
      expect(screen.getByTestId('icon-magnifying-glass')).toBeInTheDocument()
    })

    it('should execute navigation tab commands when clicked', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Click original document command
      const originalCommand = screen.getByText('Original Document').closest('[data-testid="command-item"]')
      fireEvent.click(originalCommand!)

      expect(mockDocumentActions.setActiveTab).toHaveBeenCalledWith('original')

      // Dialog should close after command execution
      await waitFor(() => {
        expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Command Categories', () => {
    it('should group commands by category with correct headings', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Check category headings are present
      expect(screen.getByText('Navigation')).toBeInTheDocument()
      expect(screen.getByText('App Navigation')).toBeInTheDocument()
      expect(screen.getByText('Account')).toBeInTheDocument()
    })

    it('should display commands in correct priority order', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      const headings = screen.getAllByTestId('group-heading')
      
      // Check that categories are in priority order (Navigation, App Navigation, Account)
      expect(headings[0]).toHaveTextContent('Navigation')
      expect(headings[1]).toHaveTextContent('App Navigation')
      expect(headings[2]).toHaveTextContent('Account')
    })
  })

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // Create a fresh mock router that throws synchronously
      const errorMockRouter = {
        push: jest.fn().mockImplementation(() => {
          throw new Error('Navigation failed')
        }),
      }
      ;(useRouter as jest.Mock).mockReturnValue(errorMockRouter)

      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Click documents command
      const documentsCommand = screen.getByText('Documents List').closest('[data-testid="command-item"]')
      fireEvent.click(documentsCommand!)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Navigation error:', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle logout errors with try-catch', async () => {
      const mockUser = { id: '123', email: createTestEmail(namespace, 'logout-catch') }
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSignOut.mockRejectedValue(new Error('Network error'))

      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      // Click sign out command
      const signOutCommand = screen.getByText('Sign Out').closest('[data-testid="command-item"]')
      fireEvent.click(signOutCommand!)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Dialog Interaction', () => {
    it('should close dialog when close button is clicked', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
      expect(screen.getByTestId('command-dialog')).toBeInTheDocument()

      // Click close button
      fireEvent.click(screen.getByTestId('close-dialog'))
      expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
    })

    it('should close dialog after command execution', async () => {
      // Reset mock router to working state for this test
      const workingMockRouter = {
        push: jest.fn().mockResolvedValue(undefined),
      }
      ;(useRouter as jest.Mock).mockReturnValue(workingMockRouter)

      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
      expect(screen.getByTestId('command-dialog')).toBeInTheDocument()

      // Execute a command
      const documentsCommand = screen.getByText('Documents List').closest('[data-testid="command-item"]')
      fireEvent.click(documentsCommand!)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should render with proper ARIA roles', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)
      
      // Open dialog
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should prevent default keyboard event behavior', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })

      render(<CommandPalette />)

      // Create a spy on preventDefault
      const preventDefaultSpy = jest.fn()
      
      // Create a custom event with the spy
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      })
      
      // Mock preventDefault on the event
      Object.defineProperty(keydownEvent, 'preventDefault', {
        value: preventDefaultSpy,
        writable: true,
      })

      // Dispatch the event
      document.dispatchEvent(keydownEvent)
      
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Document-Specific Commands', () => {
    it('should not show document commands when no document context', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: '1', email: createTestEmail(namespace, 'no-doc-context') },
        signOut: mockSignOut,
      })
      ;(useDocumentSlug as jest.Mock).mockReturnValue(null)

      render(<CommandPalette open={true} />)

      // Should not find document-specific commands
      expect(screen.queryByText('View as Tweet Thread')).not.toBeInTheDocument()
      expect(screen.queryByText('View Original')).not.toBeInTheDocument()
    })

    it('should show document commands when document context exists', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: '1', email: createTestEmail(namespace, 'with-doc-context') },
        signOut: mockSignOut,
      })
      ;(useDocumentSlug as jest.Mock).mockReturnValue('test-document-slug')

      render(<CommandPalette open={true} />)

      // Should find document-specific commands
      expect(screen.getByText('View as Tweet Thread')).toBeInTheDocument()
      expect(screen.getByText('View Original')).toBeInTheDocument()
    })

    it('should execute document commands with correct navigation', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: { id: '1', email: createTestEmail(namespace, 'doc-navigation') },
        signOut: mockSignOut,
      })
      ;(useDocumentSlug as jest.Mock).mockReturnValue('test-document-slug')

      // Mock window.open for View Original command
      const mockWindowOpen = jest.fn()
      Object.defineProperty(window, 'open', {
        value: mockWindowOpen,
        writable: true,
      })

      render(<CommandPalette open={true} />)

      // Click tweet thread command
      const tweetCommand = screen.getByText('View as Tweet Thread')
      fireEvent.click(tweetCommand)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/read/test-document-slug/tweets')
      })

      // Clear mocks and test original document command
      jest.clearAllMocks()
      ;(useRouter as jest.Mock).mockReturnValue(mockRouter)

      // Click view original command
      const originalCommand = screen.getByText('View Original')
      fireEvent.click(originalCommand)

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith('/api/read/test-document-slug/original', '_blank', 'noopener,noreferrer')
      })
    })
  })
})