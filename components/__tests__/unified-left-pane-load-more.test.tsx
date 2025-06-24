/**
 * Tests for Load More functionality in UnifiedLeftPane glossary tab
 * Tests the new state management and UI components for incremental entity loading
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UnifiedLeftPane } from '../unified-left-pane'
import { DocumentCommunicationProvider } from '@/lib/context/document-communication-context'
import { MutationProvider } from '@/lib/context/mutation-context'
import type { DocumentElement } from '@/lib/types/document'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock auth context
jest.mock('@/lib/context/auth-context', () => ({
  useAuth: jest.fn().mockReturnValue({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
  }),
}))

// Mock document communication context
const mockDocumentCommunication = {
  actions: {
    scrollToElement: jest.fn(),
    highlightElement: jest.fn(),
    removeHighlight: jest.fn(),
    loadGlossary: jest.fn(),
    resetGlossary: jest.fn(),
    updateSearch: jest.fn(),
    submitSearch: jest.fn(),
    setActiveTab: jest.fn(),
  },
  state: {
    activeTabId: 'glossary',
    searchTerm: '',
    searchResults: [],
    isSearching: false,
    glossarySearchTerm: '',
  }
}

// Create minimal mock component wrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MutationProvider initialDocument={mockElements}>
      <DocumentCommunicationProvider value={mockDocumentCommunication as any}>
        {children}
      </DocumentCommunicationProvider>
    </MutationProvider>
  )
}

// Sample test data
const mockElements: DocumentElement[] = [
  {
    id: 'el1',
    type: 'paragraph',
    position: 1,
    content: 'This is a test document with some entities mentioned.',
    attributes: {},
    tag_name: 'p'
  }
]

const mockEntities = [
  {
    name: 'Entity 1',
    ontology: 'concept' as const,
    aliases: ['E1'],
    brief_explanation: 'First entity',
    long_explanation: 'Detailed explanation of first entity'
  },
  {
    name: 'Entity 2', 
    ontology: 'person' as const,
    aliases: ['E2'],
    brief_explanation: 'Second entity',
    long_explanation: 'Detailed explanation of second entity'
  }
]

const defaultProps = {
  content: 'Test content',
  elements: mockElements,
  documentId: 'test-doc-id',
  markdownContent: '# Test Document',
  glossaryEntities: mockEntities,
  isLoadingGlossary: false,
  showGlossary: true,
  glossaryError: null,
  glossaryCached: false,
  onHeadingClick: jest.fn(),
  onLoadGlossary: jest.fn(),
  onResetGlossary: jest.fn(),
  documentContext: 'Test document context',
  documentTitle: 'Test Document',
  documentCreatedAt: '2025-01-01',
  documentSourceUrl: null,
  aiHeadingsGenerated: false,
  summaryGenerated: false,
  glossaryGenerated: true,
  slug: 'test-slug',
  storagePath: null,
  originalFileType: 'pdf',
  uploadMetadata: null,
  isPublic: false
}

describe('UnifiedLeftPane Load More Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows Load More button when hasMoreEntities is true', () => {
    const mockOnLoadMore = jest.fn()
    
    render(
      <TestWrapper>
        <UnifiedLeftPane
          {...defaultProps}
          hasMoreEntities={true}
          isLoadingMoreGlossary={false}
          onLoadMoreGlossary={mockOnLoadMore}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Load More Entries')).toBeInTheDocument()
  })

  it('hides Load More button when hasMoreEntities is false', () => {
    render(
      <TestWrapper>
        <UnifiedLeftPane
          {...defaultProps}
          hasMoreEntities={false}
          isLoadingMoreGlossary={false}
          onLoadMoreGlossary={jest.fn()}
        />
      </TestWrapper>
    )

    expect(screen.queryByText('Load More Entries')).not.toBeInTheDocument()
  })

  it('hides Load More button when onLoadMoreGlossary is not provided', () => {
    render(
      <TestWrapper>
        <UnifiedLeftPane
          {...defaultProps}
          hasMoreEntities={true}
          isLoadingMoreGlossary={false}
        />
      </TestWrapper>
    )

    expect(screen.queryByText('Load More Entries')).not.toBeInTheDocument()
  })

  it('shows loading state when isLoadingMoreGlossary is true', () => {
    render(
      <TestWrapper>
        <UnifiedLeftPane
          {...defaultProps}
          hasMoreEntities={true}
          isLoadingMoreGlossary={true}
          onLoadMoreGlossary={jest.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Loading More...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onLoadMoreGlossary when Load More button is clicked', async () => {
    const mockOnLoadMore = jest.fn()
    
    render(
      <TestWrapper>
        <UnifiedLeftPane
          {...defaultProps}
          hasMoreEntities={true}
          isLoadingMoreGlossary={false}
          onLoadMoreGlossary={mockOnLoadMore}
        />
      </TestWrapper>
    )

    const loadMoreButton = screen.getByText('Load More Entries')
    fireEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(mockOnLoadMore).toHaveBeenCalledTimes(1)
    })
  })

  it('disables Load More button during loading', () => {
    render(
      <TestWrapper>
        <UnifiedLeftPane
          {...defaultProps}
          hasMoreEntities={true}
          isLoadingMoreGlossary={true}
          onLoadMoreGlossary={jest.fn()}
        />
      </TestWrapper>
    )

    const button = screen.getByRole('button', { name: /loading more/i })
    expect(button).toBeDisabled()
  })

  it('displays correct entity count in header', () => {
    render(
      <TestWrapper>
        <UnifiedLeftPane
          {...defaultProps}
          glossaryEntities={mockEntities}
          hasMoreEntities={true}
          isLoadingMoreGlossary={false}
          onLoadMoreGlossary={jest.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText('2 entries found')).toBeInTheDocument()
  })

  it('shows Load More button below the entity list', () => {
    render(
      <TestWrapper>
        <UnifiedLeftPane
          {...defaultProps}
          hasMoreEntities={true}
          isLoadingMoreGlossary={false}
          onLoadMoreGlossary={jest.fn()}
        />
      </TestWrapper>
    )

    // Check that entities are displayed
    expect(screen.getByText('Entity 1')).toBeInTheDocument()
    expect(screen.getByText('Entity 2')).toBeInTheDocument()
    
    // Check that Load More button is displayed after entities
    expect(screen.getByText('Load More Entries')).toBeInTheDocument()
  })

  it('works correctly when no entities exist yet', () => {
    render(
      <TestWrapper>
        <UnifiedLeftPane
          {...defaultProps}
          glossaryEntities={[]}
          hasMoreEntities={true}
          isLoadingMoreGlossary={false}
          onLoadMoreGlossary={jest.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText('0 entries found')).toBeInTheDocument()
    expect(screen.queryByText('Load More Entries')).not.toBeInTheDocument()
  })
})