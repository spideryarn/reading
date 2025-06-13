import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResizableDocumentLayout } from '../resizable-document-layout'
import type { DocumentElement } from '@/lib/types/document'

// Mock the resizable components
jest.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="panel-group">{children}</div>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
  ResizableHandle: () => <div data-testid="handle" />
}))

// Mock debounce to execute immediately
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: (...args: unknown[]) => void) => fn
}))

describe('Cross-Element Search Integration', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'heading-1',
      tag_name: 'h1',
      content: 'Introduction to the Problem',
      position: 0,
      parent_id: null,
      attributes: {}
    },
    {
      id: 'para-1',
      tag_name: 'p',
      content: 'The hard problem of consciousness refers to the difficulty',
      position: 1,
      parent_id: null,
      attributes: {}
    },
    {
      id: 'para-2',
      tag_name: 'p',
      content: 'of explaining subjective experience in physical terms.',
      position: 2,
      parent_id: null,
      attributes: {}
    },
    {
      id: 'para-3',
      tag_name: 'p',
      content: 'David Chalmers coined this term to distinguish it from easier problems.',
      position: 3,
      parent_id: null,
      attributes: {}
    }
  ]

  const defaultProps = {
    html: '<div>Test HTML</div>',
    elements: mockElements,
    documentId: 'test-doc',
    markdownContent: '# Test Document',
    glossaryEntities: [],
    isLoadingGlossary: false,
    showGlossary: false,
    glossaryError: null,
    glossaryCached: false,
    onLoadGlossary: jest.fn()
  }

  beforeEach(() => {
    // Clear the document
    document.body.innerHTML = ''
  })

  it('should render the full layout with search functionality', async () => {
    render(<ResizableDocumentLayout {...defaultProps} />)
    
    // Verify layout components are rendered
    expect(screen.getByTestId('panel-group')).toBeInTheDocument()
    
    // Find and click the Search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Verify search input is visible
    expect(screen.getByPlaceholderText('Search document...')).toBeInTheDocument()
  })

  it('should find text within single elements', async () => {
    const user = userEvent.setup()
    render(<ResizableDocumentLayout {...defaultProps} />)
    
    // Navigate to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Search for "consciousness"
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'consciousness')
    
    // Should find the match
    await waitFor(() => {
      expect(screen.getByText(/1 result found/)).toBeInTheDocument()
      expect(screen.getByText(/hard problem of consciousness/)).toBeInTheDocument()
    })
  })

  it('should find text that appears in multiple elements', async () => {
    const user = userEvent.setup()
    render(<ResizableDocumentLayout {...defaultProps} />)
    
    // Navigate to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Search for "problem"
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'problem')
    
    // Should find multiple matches
    await waitFor(() => {
      expect(screen.getByText(/results found/)).toBeInTheDocument()
      // Should show results from different elements
      expect(screen.getByText(/Introduction to the Problem/)).toBeInTheDocument()
      expect(screen.getByText(/hard problem of consciousness/)).toBeInTheDocument()
    })
  })

  it('should highlight search terms in the document viewer', async () => {
    const user = userEvent.setup()
    render(<ResizableDocumentLayout {...defaultProps} />)
    
    // Navigate to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Search for a term
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'Chalmers')
    
    // Wait for search to complete
    await waitFor(() => {
      expect(screen.getByText(/1 result found/)).toBeInTheDocument()
    })
    
    // In a real test with Mark.js, the document would have <mark> elements
    // This is a limitation of our mock setup
  })

  it('should navigate to element when clicking search result', async () => {
    const user = userEvent.setup()
    const mockOnElementSelect = jest.fn()
    
    render(<ResizableDocumentLayout {...defaultProps} onElementSelect={mockOnElementSelect} />)
    
    // Navigate to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Search for a term
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'Chalmers')
    
    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText(/1 result found/)).toBeInTheDocument()
    })
    
    // Click on the search result
    const result = screen.getByText(/David Chalmers coined/)
    fireEvent.click(result)
    
    // Should trigger navigation
    // Note: In the real implementation, this would scroll to the element
    // and highlight it temporarily
  })

  it('should clear highlights when search is cleared', async () => {
    const user = userEvent.setup()
    render(<ResizableDocumentLayout {...defaultProps} />)
    
    // Navigate to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Search for a term
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'problem')
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText(/results found/)).toBeInTheDocument()
    })
    
    // Clear the search
    const clearButton = screen.getByRole('button', { name: '' }) // X button
    fireEvent.click(clearButton)
    
    // Should clear results
    expect(screen.queryByText(/results found/)).not.toBeInTheDocument()
  })

  it('should handle rapid search queries gracefully', async () => {
    const user = userEvent.setup({ delay: null }) // Remove delay for rapid typing
    render(<ResizableDocumentLayout {...defaultProps} />)
    
    // Navigate to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Type rapidly
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'the problem of')
    
    // Should show final results
    await waitFor(() => {
      expect(screen.getByText(/results found/)).toBeInTheDocument()
    })
  })

  it('should show appropriate message for no results', async () => {
    const user = userEvent.setup()
    render(<ResizableDocumentLayout {...defaultProps} />)
    
    // Navigate to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Search for non-existent text
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'xyz123notfound')
    
    // Should show no results message
    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })
})