import { render, screen } from '@testing-library/react'
import { redirect } from 'next/navigation'
import ProfilePage from '@/app/auth/profile/page'
import { getUser } from '@/lib/auth/server-auth'
import { createClient } from '@/lib/supabase/server'
import { ProfileService } from '@/lib/services/database/profiles'
import { DocumentService } from '@/lib/services/database/documents'
import type { User } from '@supabase/supabase-js'
import type { Profile, Document } from '@/lib/types/database'

// Mock Next.js redirect
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// Mock server auth
jest.mock('@/lib/auth/server-auth', () => ({
  getUser: jest.fn(),
}))

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock database services
jest.mock('@/lib/services/database/profiles', () => ({
  ProfileService: jest.fn(),
}))

jest.mock('@/lib/services/database/documents', () => ({
  DocumentService: jest.fn(),
}))

// Mock UI components to avoid complex dependencies
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={`card ${className || ''}`} {...props}>{children}</div>
  ),
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

// Mock Phosphor icons
jest.mock('@phosphor-icons/react/dist/ssr', () => ({
  ArrowLeft: ({ size }: any) => <svg data-testid="arrow-left-icon" width={size} height={size} />,
  FileText: ({ size }: any) => <svg data-testid="file-text-icon" width={size} height={size} />,
  Clock: ({ size }: any) => <svg data-testid="clock-icon" width={size} height={size} />,
  Globe: ({ size }: any) => <svg data-testid="globe-icon" width={size} height={size} />,
}))

describe('ProfilePage', () => {
  const mockGetUser = getUser as jest.MockedFunction<typeof getUser>
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
  const MockProfileService = ProfileService as jest.MockedClass<typeof ProfileService>
  const MockDocumentService = DocumentService as jest.MockedClass<typeof DocumentService>

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
  }

  const mockProfile: Profile = {
    id: 'profile-123',
    user_id: 'user-123',
    display_name: 'John Doe',
    preferences: { theme: 'light' },
    created_at: '2024-01-02T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  }

  const mockDocuments: Document[] = [
    {
      id: 'doc-1',
      slug: 'test-document-1',
      title: 'Test Document 1',
      description: 'A test document for testing',
      html_content: '<p>Test content</p>',
      word_count: 150,
      is_public: true,
      created_by: 'user-123',
      created_at: '2024-01-03T00:00:00.000Z',
      updated_at: '2024-01-03T00:00:00.000Z',
    },
    {
      id: 'doc-2',
      slug: 'test-document-2',
      title: 'Test Document 2',
      description: null,
      html_content: '<p>More test content</p>',
      word_count: 250,
      is_public: false,
      created_by: 'user-123',
      created_at: '2024-01-04T00:00:00.000Z',
      updated_at: '2024-01-04T00:00:00.000Z',
    },
  ]

  const mockSupabaseClient = {}
  const mockProfileService = {
    getByUserId: jest.fn(),
  }
  const mockDocumentService = {
    getByUserId: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset redirect mock to default (no throw)
    mockRedirect.mockImplementation(() => {})
    
    // Mock createClient to return a resolved promise
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any)
    
    // Mock service constructors
    MockProfileService.mockImplementation(() => mockProfileService as any)
    MockDocumentService.mockImplementation(() => mockDocumentService as any)
    
    // Spy on console.error to verify error logging
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Authentication checks', () => {
    it('should redirect to login when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ user: null, error: null })
      // Mock redirect to throw to simulate Next.js behaviour
      mockRedirect.mockImplementation(() => {
        throw new Error('NEXT_REDIRECT')
      })

      await expect(ProfilePage()).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login?next=/auth/profile')
      expect(mockCreateClient).not.toHaveBeenCalled()
    })

    it('should redirect to login when authentication fails', async () => {
      mockGetUser.mockResolvedValue({ user: null, error: 'Authentication failed' })
      // Mock redirect to throw to simulate Next.js behaviour
      mockRedirect.mockImplementation(() => {
        throw new Error('NEXT_REDIRECT')
      })

      await expect(ProfilePage()).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login?next=/auth/profile')
      expect(mockCreateClient).not.toHaveBeenCalled()
    })
  })

  describe('Server client creation', () => {
    it('should create Supabase client when user is authenticated', async () => {
      mockGetUser.mockResolvedValue({ user: mockUser, error: null })
      mockProfileService.getByUserId.mockResolvedValue(mockProfile)
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      render(await ProfilePage())

      expect(mockCreateClient).toHaveBeenCalledTimes(1)
      expect(MockProfileService).toHaveBeenCalledWith(mockSupabaseClient)
      expect(MockDocumentService).toHaveBeenCalledWith(mockSupabaseClient)
    })

    it('should handle server client creation errors gracefully', async () => {
      mockGetUser.mockResolvedValue({ user: mockUser, error: null })
      mockCreateClient.mockRejectedValue(new Error('Database connection failed'))

      await expect(ProfilePage()).rejects.toThrow('Database connection failed')
    })

    it('should await createClient properly (regression test)', async () => {
      mockGetUser.mockResolvedValue({ user: mockUser, error: null })
      mockProfileService.getByUserId.mockResolvedValue(mockProfile)
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      // Create a promise that tracks if it was awaited
      let clientResolved = false
      const clientPromise = Promise.resolve(mockSupabaseClient).then((client) => {
        clientResolved = true
        return client
      })
      mockCreateClient.mockReturnValue(clientPromise as any)

      render(await ProfilePage())

      // Verify the promise was actually resolved (awaited)
      expect(clientResolved).toBe(true)
      expect(MockProfileService).toHaveBeenCalledWith(mockSupabaseClient)
    })
  })

  describe('Profile data loading', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ user: mockUser, error: null })
    })

    it('should call profile service with correct user ID', async () => {
      mockProfileService.getByUserId.mockResolvedValue(mockProfile)
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      render(await ProfilePage())

      expect(mockProfileService.getByUserId).toHaveBeenCalledWith('user-123')
    })

    it('should handle missing profile gracefully', async () => {
      mockProfileService.getByUserId.mockResolvedValue(null)
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      render(await ProfilePage())

      expect(screen.getByText('Not set')).toBeInTheDocument()
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('should handle profile service errors', async () => {
      mockProfileService.getByUserId.mockRejectedValue(new Error('Profile fetch failed'))
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      await expect(ProfilePage()).rejects.toThrow('Profile fetch failed')
    })
  })

  describe('Documents data loading', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ user: mockUser, error: null })
      mockProfileService.getByUserId.mockResolvedValue(mockProfile)
    })

    it('should call document service with correct parameters', async () => {
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      render(await ProfilePage())

      expect(mockDocumentService.getByUserId).toHaveBeenCalledWith('user-123', { limit: 10 })
    })

    it('should handle document service errors', async () => {
      mockDocumentService.getByUserId.mockRejectedValue(new Error('Documents fetch failed'))

      await expect(ProfilePage()).rejects.toThrow('Documents fetch failed')
    })
  })

  describe('Page rendering with data', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ user: mockUser, error: null })
      mockProfileService.getByUserId.mockResolvedValue(mockProfile)
    })

    it('should render profile information correctly', async () => {
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      render(await ProfilePage())

      // Check profile information
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Account Information')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('1 January 2024')).toBeInTheDocument() // User created date
      expect(screen.getByText('2 January 2024')).toBeInTheDocument() // Profile created date
    })

    it('should render empty documents state correctly', async () => {
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      render(await ProfilePage())

      expect(screen.getByText('Your Documents')).toBeInTheDocument()
      expect(screen.getByText('0 documents')).toBeInTheDocument()
      expect(screen.getByText('No documents yet')).toBeInTheDocument()
      expect(screen.getByText('Upload Your First Document')).toBeInTheDocument()
    })

    it('should render documents list correctly', async () => {
      mockDocumentService.getByUserId.mockResolvedValue({ 
        documents: mockDocuments, 
        hasMore: false 
      })

      render(await ProfilePage())

      // Check documents section
      expect(screen.getByText('Your Documents')).toBeInTheDocument()
      expect(screen.getByText('2 documents')).toBeInTheDocument()
      
      // Check first document
      expect(screen.getByText('Test Document 1')).toBeInTheDocument()
      expect(screen.getByText('A test document for testing')).toBeInTheDocument()
      expect(screen.getByText('03/01/2024')).toBeInTheDocument()
      expect(screen.getByText('150 words')).toBeInTheDocument()
      expect(screen.getByText('Public')).toBeInTheDocument()
      
      // Check second document
      expect(screen.getByText('Test Document 2')).toBeInTheDocument()
      expect(screen.getByText('04/01/2024')).toBeInTheDocument()
      expect(screen.getByText('250 words')).toBeInTheDocument()
      expect(screen.getByText('Private')).toBeInTheDocument()
      
      // Document description is null for second document, should not crash
      expect(screen.queryByText('null')).not.toBeInTheDocument()
    })

    it('should show pagination message when limit reached', async () => {
      const tenDocuments = Array.from({ length: 10 }, (_, i) => ({
        ...mockDocuments[0],
        id: `doc-${i + 1}`,
        title: `Document ${i + 1}`,
      }))

      mockDocumentService.getByUserId.mockResolvedValue({ 
        documents: tenDocuments, 
        hasMore: false 
      })

      render(await ProfilePage())

      expect(screen.getByText('Showing your 10 most recent documents')).toBeInTheDocument()
    })
  })

  describe('Navigation elements', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ user: mockUser, error: null })
      mockProfileService.getByUserId.mockResolvedValue(mockProfile)
      mockDocumentService.getByUserId.mockResolvedValue({ documents: mockDocuments, hasMore: false })
    })

    it('should render navigation links correctly', async () => {
      render(await ProfilePage())

      // Check back to home link
      const backLink = screen.getByRole('link', { name: /back to home/i })
      expect(backLink).toBeInTheDocument()
      expect(backLink).toHaveAttribute('href', '/')

      // Check document view links
      const viewLinks = screen.getAllByRole('link', { name: /view/i })
      expect(viewLinks).toHaveLength(2)
      expect(viewLinks[0]).toHaveAttribute('href', '/documents/test-document-1')
      expect(viewLinks[1]).toHaveAttribute('href', '/documents/test-document-2')

      // Check document title links
      const titleLinks = screen.getAllByRole('link', { name: /test document/i })
      expect(titleLinks).toHaveLength(2)

      // Check share link (only for public documents)
      const shareLinks = screen.getAllByRole('link', { name: /share/i })
      expect(shareLinks).toHaveLength(1)
      expect(shareLinks[0]).toHaveAttribute('href', '/documents/test-document-1/share')
    })

    it('should render upload link for empty state', async () => {
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      render(await ProfilePage())

      const uploadLink = screen.getByRole('link', { name: /upload your first document/i })
      expect(uploadLink).toBeInTheDocument()
      expect(uploadLink).toHaveAttribute('href', '/')
    })
  })

  describe('Accessibility and structure', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ user: mockUser, error: null })
      mockProfileService.getByUserId.mockResolvedValue(mockProfile)
      mockDocumentService.getByUserId.mockResolvedValue({ documents: mockDocuments, hasMore: false })
    })

    it('should have proper heading hierarchy', async () => {
      render(await ProfilePage())

      // Check main heading
      expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
      
      // Check section headings
      expect(screen.getByRole('heading', { level: 2, name: 'Account Information' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Your Documents' })).toBeInTheDocument()
    })

    it('should have semantic HTML structure', async () => {
      const { container } = render(await ProfilePage())

      // Check for proper semantic elements
      expect(container.querySelector('h1')).toBeInTheDocument()
      expect(container.querySelector('h2')).toBeInTheDocument()
      expect(screen.getAllByRole('link')).toHaveLength(6) // Back + 2 title + 2 view + 1 share links
    })

    it('should render icons with proper accessibility', async () => {
      render(await ProfilePage())

      // Check for icon elements
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument() // At least one file icon
      expect(screen.getAllByTestId('clock-icon')).toHaveLength(2)
      expect(screen.getAllByTestId('globe-icon')).toHaveLength(2)
    })
  })

  describe('Error scenarios', () => {
    it('should handle concurrent service errors', async () => {
      mockGetUser.mockResolvedValue({ user: mockUser, error: null })
      mockProfileService.getByUserId.mockRejectedValue(new Error('Profile error'))
      mockDocumentService.getByUserId.mockRejectedValue(new Error('Documents error'))

      // Should throw the first error encountered
      await expect(ProfilePage()).rejects.toThrow('Profile error')
    })

    it('should handle authentication edge cases', async () => {
      // User object exists but is malformed (no id)
      const malformedUser = { ...mockUser, id: undefined as any }
      mockGetUser.mockResolvedValue({ user: malformedUser, error: null })
      mockProfileService.getByUserId.mockResolvedValue(null)
      mockDocumentService.getByUserId.mockResolvedValue({ documents: [], hasMore: false })

      // Should render successfully (services handle invalid UUIDs gracefully)
      render(await ProfilePage())
      
      // Should show profile page but with empty data
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Not set')).toBeInTheDocument() // display_name fallback
      expect(screen.getByText('0 documents')).toBeInTheDocument()
    })
  })
})