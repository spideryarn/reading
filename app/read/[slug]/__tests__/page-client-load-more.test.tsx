/**
 * Integration tests for Load More functionality in DocumentPageClient
 * Tests the state management and API integration for incremental entity loading
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DocumentPageClient from '../page-client'
import { MutationProvider } from '@/lib/context/mutation-context'
import { getTestNamespace, getCleanupFunctions } from '@/lib/testing/test-isolation-utils'
import { createClient } from '@/lib/supabase/server'
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

// Mock the layout component
jest.mock('@/components/resizable-document-layout', () => ({
  ResizableDocumentLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-layout">{children}</div>
}))

// Mock API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Sample test data
const mockDocument: DocumentElement[] = [
  {
    id: 'el1',
    type: 'paragraph',
    position: 1,
    content: 'This is a test document with entities like quantum computing and artificial intelligence.',
    attributes: {},
    tag_name: 'p'
  }
]

const mockInitialEntities = [
  {
    name: 'Quantum Computing',
    ontology: 'concept',
    aliases: ['QC'],
    brief_explanation: 'Advanced computing technology',
    long_explanation: 'Detailed explanation of quantum computing'
  },
  {
    name: 'Artificial Intelligence',
    ontology: 'concept', 
    aliases: ['AI'],
    brief_explanation: 'Machine learning technology',
    long_explanation: 'Detailed explanation of AI'
  }
]

const mockAdditionalEntities = [
  {
    name: 'Machine Learning',
    ontology: 'concept',
    aliases: ['ML'],
    brief_explanation: 'Subset of AI',
    long_explanation: 'Detailed explanation of ML'
  }
]

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MutationProvider initialDocument={mockDocument}>
      {children}
    </MutationProvider>
  )
}

const defaultProps = {
  html: '<p>Test content</p>',
  documentId: 'test-doc-id',
  initialTitle: 'Test Document',
  slug: 'test-slug',
  storagePath: null,
  originalFileType: 'pdf',
  uploadMetadata: null,
  documentCreatedAt: '2025-01-01',
  documentSourceUrl: null,
  aiHeadingsGenerated: false,
  summaryGenerated: false,
  glossaryGenerated: false,
  ownerEmail: 'test@example.com',
  isPublic: false
}

describe('DocumentPageClient Load More Integration', () => {
  const namespace = getTestNamespace('page-client-load-more')
  let cleanup: ReturnType<typeof getCleanupFunctions>

  beforeEach(() => {
    jest.clearAllMocks()
    const supabase = createClient()
    cleanup = getCleanupFunctions(namespace, supabase)
  })

  afterAll(async () => {
    if (cleanup) {
      await cleanup.all()
    }
  })

  it('makes initial glossary request with entity limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: mockInitialEntities,
        cached: false
      })
    })

    render(
      <TestWrapper>
        <DocumentPageClient {...defaultProps} />
      </TestWrapper>
    )

    // Trigger glossary loading
    const generateButton = screen.getByText('Generate Glossary')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/glossary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: '<p>Test content</p>',
          documentId: 'test-doc-id',
          max_entities: 20 // Default entity limit
        })
      })
    })
  })

  it('shows Load More button when entities equal limit', async () => {
    // Mock response with exactly the limit (20 entities)
    const fullLimitEntities = Array.from({ length: 20 }, (_, i) => ({
      name: `Entity ${i + 1}`,
      ontology: 'concept',
      aliases: [`E${i + 1}`],
      brief_explanation: `Description ${i + 1}`,
      long_explanation: `Detailed description ${i + 1}`
    }))

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: fullLimitEntities,
        cached: false
      })
    })

    render(
      <TestWrapper>
        <DocumentPageClient {...defaultProps} />
      </TestWrapper>
    )

    // Generate initial glossary
    const generateButton = screen.getByText('Generate Glossary')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Load More Entries')).toBeInTheDocument()
    })
  })

  it('hides Load More button when entities less than limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: mockInitialEntities, // Only 2 entities (< 20 limit)
        cached: false
      })
    })

    render(
      <TestWrapper>
        <DocumentPageClient {...defaultProps} />
      </TestWrapper>
    )

    // Generate initial glossary
    const generateButton = screen.getByText('Generate Glossary')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.queryByText('Load More Entries')).not.toBeInTheDocument()
    })
  })

  it('makes Load More request with existing entities', async () => {
    // Mock initial response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: Array.from({ length: 20 }, (_, i) => ({
          name: `Entity ${i + 1}`,
          ontology: 'concept',
          aliases: [`E${i + 1}`],
          brief_explanation: `Description ${i + 1}`
        })),
        cached: false
      })
    })

    // Mock Load More response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: mockAdditionalEntities,
        cached: false
      })
    })

    render(
      <TestWrapper>
        <DocumentPageClient {...defaultProps} />
      </TestWrapper>
    )

    // Generate initial glossary
    const generateButton = screen.getByText('Generate Glossary')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Load More Entries')).toBeInTheDocument()
    })

    // Click Load More
    const loadMoreButton = screen.getByText('Load More Entries')
    fireEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/glossary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"max_entities":30') // MAX_ENTITIES_PER_REQUEST
      })
    })

    // Check that existing_entities was passed
    const secondCall = mockFetch.mock.calls[1]
    const secondCallBody = JSON.parse(secondCall[1].body)
    expect(secondCallBody.existing_entities).toHaveLength(20)
  })

  it('appends new entities to existing list', async () => {
    // Mock initial response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: mockInitialEntities,
        cached: false
      })
    })

    // Mock Load More response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: mockAdditionalEntities,
        cached: false
      })
    })

    render(
      <TestWrapper>
        <DocumentPageClient {...defaultProps} />
      </TestWrapper>
    )

    // Generate initial glossary
    const generateButton = screen.getByText('Generate Glossary')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Quantum Computing')).toBeInTheDocument()
      expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument()
    })

    // Click Load More
    const loadMoreButton = screen.getByText('Load More Entries')
    fireEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    })

    // Check that all entities are still displayed
    expect(screen.getByText('Quantum Computing')).toBeInTheDocument()
    expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument()
    expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    expect(screen.getByText('3 entries found')).toBeInTheDocument()
  })

  it('shows loading state during Load More request', async () => {
    // Mock initial response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: Array.from({ length: 20 }, (_, i) => ({
          name: `Entity ${i + 1}`,
          ontology: 'concept',
          aliases: [`E${i + 1}`],
          brief_explanation: `Description ${i + 1}`
        })),
        cached: false
      })
    })

    // Mock delayed Load More response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          entities: mockAdditionalEntities,
          cached: false
        })
      }), 100))
    )

    render(
      <TestWrapper>
        <DocumentPageClient {...defaultProps} />
      </TestWrapper>
    )

    // Generate initial glossary
    const generateButton = screen.getByText('Generate Glossary')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Load More Entries')).toBeInTheDocument()
    })

    // Click Load More
    const loadMoreButton = screen.getByText('Load More Entries')
    fireEvent.click(loadMoreButton)

    // Check loading state
    expect(screen.getByText('Loading More...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /loading more/i })).toBeDisabled()

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Load More Entries')).toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('handles Load More API errors gracefully', async () => {
    // Mock initial response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: Array.from({ length: 20 }, (_, i) => ({
          name: `Entity ${i + 1}`,
          ontology: 'concept',
          aliases: [`E${i + 1}`],
          brief_explanation: `Description ${i + 1}`
        })),
        cached: false
      })
    })

    // Mock failed Load More response
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    render(
      <TestWrapper>
        <DocumentPageClient {...defaultProps} />
      </TestWrapper>
    )

    // Generate initial glossary
    const generateButton = screen.getByText('Generate Glossary')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Load More Entries')).toBeInTheDocument()
    })

    // Click Load More
    const loadMoreButton = screen.getByText('Load More Entries')
    fireEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load more entries/)).toBeInTheDocument()
    })

    // Original entities should still be displayed
    expect(screen.getByText('Entity 1')).toBeInTheDocument()
  })

  it('resets Load More state when glossary is reset', async () => {
    // Mock initial response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        entities: Array.from({ length: 20 }, (_, i) => ({
          name: `Entity ${i + 1}`,
          ontology: 'concept',
          aliases: [`E${i + 1}`],
          brief_explanation: `Description ${i + 1}`
        })),
        cached: false
      })
    })

    // Mock reset response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({})
    })

    render(
      <TestWrapper>
        <DocumentPageClient {...defaultProps} />
      </TestWrapper>
    )

    // Generate initial glossary
    const generateButton = screen.getByText('Generate Glossary')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Load More Entries')).toBeInTheDocument()
    })

    // Reset glossary
    const resetButton = screen.getByLabelText(/reset/i)
    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(screen.queryByText('Load More Entries')).not.toBeInTheDocument()
    })
  })
})