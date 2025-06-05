import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnifiedLeftPane } from '../unified-left-pane'
import type { DocumentElement } from '@/lib/types/document'

// Mock Mark.js
jest.mock('mark.js', () => {
  return jest.fn().mockImplementation(() => {
    const highlights: HTMLElement[] = []
    return {
      mark: jest.fn((searchTerm, options) => {
        // Simulate finding matches
        const container = document.getElementById('document-viewer')
        if (!container) return
        
        // Find all elements with data-element-id
        const elements = container.querySelectorAll('[data-element-id]')
        elements.forEach((element) => {
          const text = element.textContent || ''
          if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
            // Simulate highlighting by calling the each callback
            if (options.each) {
              const mockHighlight = document.createElement('mark')
              mockHighlight.textContent = searchTerm
              options.each(mockHighlight)
            }
          }
        })
        
        // Call done callback
        if (options.done) {
          options.done()
        }
      }),
      unmark: jest.fn(() => {
        highlights.forEach(h => h.remove())
        highlights.length = 0
      })
    }
  })
})

// Mock the debounce function to execute immediately in tests
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any) => fn
}))

describe('UnifiedLeftPane Search Functionality', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'heading-1',
      tag_name: 'h1',
      content: 'Introduction to Consciousness',
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
    }
  ]

  const defaultProps = {
    content: '<html>Test content</html>',
    elements: mockElements,
    documentId: 'test-doc',
    markdownContent: '# Test Document',
    glossaryEntities: [],
    isLoadingGlossary: false,
    showGlossary: false,
    glossaryError: null,
    glossaryCached: false,
    onHeadingClick: jest.fn(),
    onLoadGlossary: jest.fn(),
    onScrollToEntity: jest.fn(),
    documentContext: 'Test document context'
  }

  beforeEach(() => {
    // Create a mock document viewer container
    const container = document.createElement('div')
    container.id = 'document-viewer'
    
    // Add mock elements
    mockElements.forEach(element => {
      const el = document.createElement('div')
      el.setAttribute('data-element-id', element.id)
      el.setAttribute('data-element-tag', element.tag_name)
      el.textContent = element.content || ''
      container.appendChild(el)
    })
    
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    jest.clearAllMocks()
  })

  it('should initialize Mark.js on mount', () => {
    const Mark = require('mark.js')
    render(<UnifiedLeftPane {...defaultProps} />)
    
    expect(Mark).toHaveBeenCalledWith(document.getElementById('document-viewer'))
  })

  it('should perform search when text is entered', async () => {
    const user = userEvent.setup()
    render(<UnifiedLeftPane {...defaultProps} />)
    
    // Switch to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'consciousness')
    
    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText(/results found/)).toBeInTheDocument()
    })
  })

  it('should clear highlights when search is cleared', async () => {
    const user = userEvent.setup()
    const Mark = require('mark.js')
    const mockMarkInstance = new Mark()
    
    render(<UnifiedLeftPane {...defaultProps} />)
    
    // Switch to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'consciousness')
    
    // Wait for search
    await waitFor(() => {
      expect(mockMarkInstance.mark).toHaveBeenCalled()
    })
    
    // Clear search
    await user.clear(searchInput)
    
    // Verify unmark was called
    expect(mockMarkInstance.unmark).toHaveBeenCalled()
  })

  it('should handle empty search queries', async () => {
    const user = userEvent.setup()
    render(<UnifiedLeftPane {...defaultProps} />)
    
    // Switch to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Type whitespace
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, '   ')
    
    // Should not show results
    expect(screen.queryByText(/results found/)).not.toBeInTheDocument()
  })

  it('should navigate to element when search result is clicked', async () => {
    const user = userEvent.setup()
    render(<UnifiedLeftPane {...defaultProps} />)
    
    // Switch to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'consciousness')
    
    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText(/results found/)).toBeInTheDocument()
    })
    
    // Click on a result
    const firstResult = screen.getByText(/Introduction to Consciousness/)
    fireEvent.click(firstResult)
    
    // Verify navigation callback was called
    expect(defaultProps.onHeadingClick).toHaveBeenCalled()
  })

  it('should show loading state during search', async () => {
    const user = userEvent.setup()
    render(<UnifiedLeftPane {...defaultProps} />)
    
    // Switch to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'test')
    
    // Should show loading state briefly
    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument()
    })
  })

  it('should handle no results found', async () => {
    const user = userEvent.setup()
    render(<UnifiedLeftPane {...defaultProps} />)
    
    // Switch to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'xyz123notfound')
    
    // Should show no results message
    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })

  it('should count multiple matches in the same element', async () => {
    const user = userEvent.setup()
    
    // Update mock element to have multiple occurrences
    const elementsWithDuplicates = [
      {
        id: 'para-1',
        tag_name: 'p',
        content: 'The problem of consciousness is a hard problem indeed',
        position: 0,
        parent_id: null,
        attributes: {}
      }
    ]
    
    render(<UnifiedLeftPane {...defaultProps} elements={elementsWithDuplicates} />)
    
    // Switch to search tab
    const searchTab = screen.getByText('Search')
    fireEvent.click(searchTab)
    
    // Search for "problem"
    const searchInput = screen.getByPlaceholderText('Search document...')
    await user.type(searchInput, 'problem')
    
    // Should show match count
    await waitFor(() => {
      expect(screen.getByText(/matches/)).toBeInTheDocument()
    })
  })
})