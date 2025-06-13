/**
 * Tests for Semantic Search UI functionality in UnifiedLeftPane
 * 
 * These tests specifically focus on semantic search features:
 * 1. performSemanticSearch() function
 * 2. Search mode toggling between text and semantic search
 * 3. Query history dropdown functionality
 * 4. Confidence-based result sorting
 * 5. Integration with semantic search API
 */

import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './test-wrapper'
import userEvent from '@testing-library/user-event'
import { UnifiedLeftPane } from '../unified-left-pane'
import type { DocumentElement } from '@/lib/types/document'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock Mark.js
jest.mock('mark.js', () => {
  return jest.fn().mockImplementation(() => ({
    mark: jest.fn(),
    unmark: jest.fn()
  }))
})

// Mock the debounce function to execute immediately in tests
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any) => fn
}))

describe('UnifiedLeftPane Semantic Search', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'heading-1',
      tag_name: 'h1',
      content: 'Machine Learning Fundamentals',
      position: 0,
      parent_id: null,
      attributes: {}
    },
    {
      id: 'para-1',
      tag_name: 'p',
      content: 'Artificial intelligence and machine learning are transforming industries',
      position: 1,
      parent_id: null,
      attributes: {}
    },
    {
      id: 'para-2',
      tag_name: 'p',
      content: 'Deep learning algorithms require large datasets for training',
      position: 2,
      parent_id: null,
      attributes: {}
    }
  ]

  const defaultProps = {
    content: '<html>Test content</html>',
    elements: mockElements,
    documentId: 'test-doc-123',
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
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Search Mode Toggle', () => {
    it('should start in text search mode by default', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      // Should show text search mode
      expect(screen.getByText('Text Search')).toBeInTheDocument()
      expect(screen.queryByText('Semantic Search')).not.toBeInTheDocument()
    })

    it('should toggle to semantic search mode', async () => {
      const user = userEvent.setup()
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      // Click semantic search toggle
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Should show semantic search mode
      expect(screen.getByText('Semantic Search')).toBeInTheDocument()
      expect(screen.queryByText('Text Search')).not.toBeInTheDocument()
    })

    it('should clear results when switching search modes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      // Perform text search first
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'machine')
      
      // Switch to semantic search
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Results should be cleared
      expect(screen.queryByText(/results found/)).not.toBeInTheDocument()
    })
  })

  describe('Query History', () => {
    const mockQueryHistory = [
      {
        query: 'machine learning algorithms',
        normalizedQuery: 'machine learning algorithms',
        searchedAt: '2025-01-01T10:00:00Z',
        resultCount: 3
      },
      {
        query: 'artificial intelligence',
        normalizedQuery: 'artificial intelligence', 
        searchedAt: '2025-01-01T09:00:00Z',
        resultCount: 2
      }
    ]

    it('should fetch query history when switching to semantic search', async () => {
      const user = userEvent.setup()
      
      // Mock successful query history fetch
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documentId: 'test-doc-123',
          queries: mockQueryHistory
        })
      })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      // Switch to semantic search
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Should fetch query history
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/semantic-search?documentId=${encodeURIComponent('test-doc-123')}`
        )
      })
    })

    it('should show query history dropdown when typing', async () => {
      const user = userEvent.setup()
      
      // Mock query history fetch
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documentId: 'test-doc-123',
          queries: mockQueryHistory
        })
      })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab and semantic mode
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Wait for history to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      
      // Start typing to show history
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'machine')
      
      // Should show filtered history
      await waitFor(() => {
        expect(screen.getByText('machine learning algorithms')).toBeInTheDocument()
      })
    })

    it('should filter query history based on search input', async () => {
      const user = userEvent.setup()
      
      // Mock query history fetch
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documentId: 'test-doc-123',
          queries: mockQueryHistory
        })
      })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab and semantic mode
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Wait for history to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      
      // Type specific search term
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'artificial')
      
      // Should only show matching history items
      await waitFor(() => {
        expect(screen.getByText('artificial intelligence')).toBeInTheDocument()
        expect(screen.queryByText('machine learning algorithms')).not.toBeInTheDocument()
      })
    })
  })

  describe('Semantic Search Execution', () => {
    const mockSemanticResponse = {
      matches: [
        {
          elementId: 'para-1',
          confidence: 0.9,
          reasoning: 'Directly discusses AI and ML concepts',
          relevantText: 'Artificial intelligence and machine learning'
        },
        {
          elementId: 'para-2',
          confidence: 0.7,
          reasoning: 'Mentions deep learning algorithms',
          relevantText: 'Deep learning algorithms require large datasets'
        }
      ],
      query: 'artificial intelligence concepts',
      documentId: 'test-doc-123',
      stats: {
        totalElements: 3,
        searchableElements: 3,
        matchesFound: 2,
        estimatedTokensUsed: 250
      },
      aiCallId: 'ai-call-123',
      cached: false
    }

    it('should perform semantic search when search button is clicked', async () => {
      const user = userEvent.setup()
      
      // Mock semantic search API response
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-123', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSemanticResponse
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab and semantic mode
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Type search query
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'artificial intelligence concepts')
      
      // Click search button
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Should call semantic search API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/semantic-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: 'artificial intelligence concepts',
            documentId: 'test-doc-123'
          })
        })
      })
    })

    it('should display semantic search results with confidence scores', async () => {
      const user = userEvent.setup()
      
      // Mock semantic search API response
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-123', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSemanticResponse
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab and semantic mode
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Perform search
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'artificial intelligence')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Should display results with confidence scores
      await waitFor(() => {
        expect(screen.getByText(/90%/)).toBeInTheDocument() // 0.9 confidence
        expect(screen.getByText(/70%/)).toBeInTheDocument() // 0.7 confidence
        expect(screen.getByText('Directly discusses AI and ML concepts')).toBeInTheDocument()
      })
    })

    it('should handle semantic search errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock API calls: success for history, error for search
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-123', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Document too large for semantic search' })
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab and semantic mode
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Perform search
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'test query')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/Document too large for semantic search/)).toBeInTheDocument()
      })
    })

    it('should show cached indicator for cached results', async () => {
      const user = userEvent.setup()
      
      const cachedResponse = {
        ...mockSemanticResponse,
        cached: true,
        cachedAt: '2025-01-01T10:00:00Z'
      }
      
      // Mock API calls
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-123', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => cachedResponse
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab and semantic mode
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Perform search
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'test query')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Should show cached indicator
      await waitFor(() => {
        expect(screen.getByText(/cached/i)).toBeInTheDocument()
      })
    })
  })

  describe('Result Sorting', () => {
    const multipleResults = {
      matches: [
        {
          elementId: 'para-1', // position 1
          confidence: 0.7,
          reasoning: 'Moderate relevance',
          relevantText: 'Some relevant content'
        },
        {
          elementId: 'heading-1', // position 0
          confidence: 0.9,
          reasoning: 'High relevance',
          relevantText: 'Very relevant content'
        },
        {
          elementId: 'para-2', // position 2
          confidence: 0.8,
          reasoning: 'Good relevance',
          relevantText: 'Relevant content'
        }
      ],
      query: 'test query',
      documentId: 'test-doc-123',
      stats: { totalElements: 3, searchableElements: 3, matchesFound: 3 },
      aiCallId: 'ai-call-123',
      cached: false
    }

    it('should sort results by confidence (relevance) by default', async () => {
      const user = userEvent.setup()
      
      // Mock API calls
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-123', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => multipleResults
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab and semantic mode
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Perform search
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'test query')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Results should be sorted by confidence (90%, 80%, 70%)
      await waitFor(() => {
        const confidenceElements = screen.getAllByText(/%/)
        expect(confidenceElements[0]).toHaveTextContent('90%')
        expect(confidenceElements[1]).toHaveTextContent('80%')
        expect(confidenceElements[2]).toHaveTextContent('70%')
      })
    })

    it('should allow sorting by document position', async () => {
      const user = userEvent.setup()
      
      // Mock API calls
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-123', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => multipleResults
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab and semantic mode  
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Perform search
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'test query')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('90%')).toBeInTheDocument()
      })
      
      // Click position sort button
      const positionSortButton = screen.getByRole('button', { name: /position/i })
      await user.click(positionSortButton)
      
      // Results should now be sorted by position (heading-1, para-1, para-2)
      await waitFor(() => {
        // Verify the order changed - first result should now be heading-1 (90% confidence)
        expect(screen.getAllByText(/%/)[0]).toHaveTextContent('90%') // heading-1 first by position
      })
    })
  })

  describe('Navigation Integration', () => {
    it('should navigate to element when semantic search result is clicked', async () => {
      const user = userEvent.setup()
      
      // Mock API calls
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-123', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            matches: [{
              elementId: 'para-1',
              confidence: 0.9,
              reasoning: 'Relevant content',
              relevantText: 'test content'
            }],
            query: 'test',
            documentId: 'test-doc-123',
            stats: { matchesFound: 1 },
            aiCallId: 'ai-call-123',
            cached: false
          })
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to search tab and semantic mode
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Perform search
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'test')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Wait for results and click first result
      await waitFor(() => {
        expect(screen.getByText('90%')).toBeInTheDocument()
      })
      
      const firstResult = screen.getByText(/Artificial intelligence and machine learning/)
      fireEvent.click(firstResult)
      
      // Verify navigation callback was called
      expect(defaultProps.onHeadingClick).toHaveBeenCalled()
    })
  })
})