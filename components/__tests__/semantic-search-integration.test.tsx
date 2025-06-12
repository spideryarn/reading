/**
 * Integration Tests for Semantic Search
 * 
 * These tests verify the complete semantic search flow:
 * 1. UI interaction with API endpoints
 * 2. Cache behavior in real scenarios
 * 3. Error handling across UI and API layers
 * 4. Query history management
 * 5. Mark.js integration for highlighting
 */

import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './test-wrapper'
import userEvent from '@testing-library/user-event'
import { UnifiedLeftPane } from '../unified-left-pane'
import type { DocumentElement } from '@/lib/types/document'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock Mark.js with semantic search highlighting capability
jest.mock('mark.js', () => {
  return jest.fn().mockImplementation(() => {
    const highlights: HTMLElement[] = []
    return {
      mark: jest.fn((searchTerm, options) => {
        const container = document.getElementById('document-viewer')
        if (!container) return
        
        // For semantic search, highlight based on element IDs
        if (options.semanticElementIds) {
          options.semanticElementIds.forEach((elementId: string) => {
            const element = container.querySelector(`[data-element-id="${elementId}"]`)
            if (element) {
              const mark = document.createElement('mark')
              mark.className = 'semantic-highlight'
              mark.textContent = element.textContent || ''
              highlights.push(mark)
              
              if (options.each) {
                options.each(mark)
              }
            }
          })
        }
        
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

describe('Semantic Search Integration', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'heading-1',
      tag_name: 'h1',
      content: 'Artificial Intelligence Overview',
      position: 0,
      parent_id: null,
      attributes: {}
    },
    {
      id: 'para-1',
      tag_name: 'p',
      content: 'Machine learning is a subset of artificial intelligence that enables computers to learn',
      position: 1,
      parent_id: null,
      attributes: {}
    },
    {
      id: 'para-2',
      tag_name: 'p',
      content: 'Deep neural networks have revolutionized many AI applications',
      position: 2,
      parent_id: null,
      attributes: {}
    },
    {
      id: 'para-3',
      tag_name: 'p',
      content: 'Natural language processing is another important area of AI research',
      position: 3,
      parent_id: null,
      attributes: {}
    }
  ]

  const defaultProps = {
    content: '<html>Test content</html>',
    elements: mockElements,
    documentId: 'test-doc-integration',
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
    
    // Create mock document viewer container
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
  })

  describe('Complete Semantic Search Flow', () => {
    it('should perform complete semantic search workflow', async () => {
      const user = userEvent.setup()
      
      const mockQueryHistory = {
        documentId: 'test-doc-integration',
        queries: [
          {
            query: 'artificial intelligence',
            normalizedQuery: 'artificial intelligence',
            searchedAt: '2025-01-01T09:00:00Z',
            resultCount: 2
          }
        ]
      }
      
      const mockSearchResponse = {
        matches: [
          {
            elementId: 'heading-1',
            confidence: 0.95,
            reasoning: 'Direct mention of artificial intelligence in title',
            relevantText: 'Artificial Intelligence Overview'
          },
          {
            elementId: 'para-1',
            confidence: 0.8,
            reasoning: 'Discusses machine learning as subset of AI',
            relevantText: 'Machine learning is a subset of artificial intelligence'
          }
        ],
        query: 'machine learning and AI',
        documentId: 'test-doc-integration',
        stats: {
          totalElements: 4,
          searchableElements: 4,
          matchesFound: 2,
          estimatedTokensUsed: 300
        },
        aiCallId: 'ai-call-integration-123',
        cached: false
      }
      
      // Mock API calls in sequence
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQueryHistory
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockQueryHistory,
            queries: [...mockQueryHistory.queries, {
              query: 'machine learning and AI',
              normalizedQuery: 'machine learning ai',
              searchedAt: '2025-01-01T10:00:00Z',
              resultCount: 2
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // 1. Switch to search tab
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      // 2. Switch to semantic search mode
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // 3. Verify query history was fetched
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/semantic-search?documentId=${encodeURIComponent('test-doc-integration')}`
        )
      })
      
      // 4. Type search query
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'machine learning and AI')
      
      // 5. Trigger semantic search
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // 6. Verify semantic search API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/semantic-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: 'machine learning and AI',
            documentId: 'test-doc-integration'
          })
        })
      })
      
      // 7. Verify results are displayed with confidence scores
      await waitFor(() => {
        expect(screen.getByText(/95%/)).toBeInTheDocument()
        expect(screen.getByText(/80%/)).toBeInTheDocument()
        expect(screen.getByText('Direct mention of artificial intelligence in title')).toBeInTheDocument()
        expect(screen.getByText('Discusses machine learning as subset of AI')).toBeInTheDocument()
      })
      
      // 8. Verify query history was refreshed
      expect(global.fetch).toHaveBeenCalledTimes(3) // history, search, refresh history
    })

    it('should handle cached results correctly', async () => {
      const user = userEvent.setup()
      
      const cachedResponse = {
        matches: [
          {
            elementId: 'para-2',
            confidence: 0.9,
            reasoning: 'Discusses neural networks',
            relevantText: 'Deep neural networks have revolutionized'
          }
        ],
        query: 'neural networks',
        documentId: 'test-doc-integration',
        stats: {
          totalElements: 4,
          searchableElements: 4,
          matchesFound: 1,
          estimatedTokensUsed: 200
        },
        aiCallId: 'ai-call-cached-123',
        cached: true,
        cachedAt: '2025-01-01T08:00:00Z',
        enhancementId: 'enhancement-cached-123'
      }
      
      // Mock API calls
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-integration', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => cachedResponse
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to semantic search and perform search
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'neural networks')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Verify cached indicator is shown
      await waitFor(() => {
        expect(screen.getByText(/cached/i)).toBeInTheDocument()
        expect(screen.getByText(/90%/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully across the flow', async () => {
      const user = userEvent.setup()
      
      // Mock query history fetch success, but search failure
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-integration', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ 
            error: 'Document too large for semantic search',
            details: 'Estimated 60000 tokens, maximum is 50000'
          })
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Perform semantic search
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'test query')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/Document too large for semantic search/)).toBeInTheDocument()
      })
      
      // Should clear previous results
      expect(screen.queryByText(/results found/)).not.toBeInTheDocument()
    })

    it('should handle network errors', async () => {
      const user = userEvent.setup()
      
      // Mock network failure
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-integration', queries: [] })
        })
        .mockRejectedValueOnce(new Error('Network error'))
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Perform semantic search
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'test query')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Should display generic error message
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument()
      })
    })
  })

  describe('Query History Integration', () => {
    it('should integrate query history with search execution', async () => {
      const user = userEvent.setup()
      
      const queryHistory = {
        documentId: 'test-doc-integration',
        queries: [
          {
            query: 'machine learning',
            normalizedQuery: 'machine learning',
            searchedAt: '2025-01-01T09:00:00Z',
            resultCount: 2
          },
          {
            query: 'deep learning',
            normalizedQuery: 'deep learning',
            searchedAt: '2025-01-01T08:00:00Z',
            resultCount: 1
          }
        ]
      }
      
      const searchResponse = {
        matches: [
          {
            elementId: 'para-1',
            confidence: 0.9,
            reasoning: 'Contains machine learning reference',
            relevantText: 'Machine learning is a subset'
          }
        ],
        query: 'machine learning',
        documentId: 'test-doc-integration',
        stats: { matchesFound: 1 },
        aiCallId: 'ai-call-123',
        cached: true
      }
      
      // Mock API calls
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => queryHistory
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchResponse
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to semantic search
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Wait for history to load and start typing to show dropdown
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/semantic-search?documentId=${encodeURIComponent('test-doc-integration')}`
        )
      })
      
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'machine')
      
      // Should show filtered history
      await waitFor(() => {
        expect(screen.getByText('machine learning')).toBeInTheDocument()
        expect(screen.queryByText('deep learning')).not.toBeInTheDocument() // filtered out
      })
      
      // Click on history item
      const historyItem = screen.getByText('machine learning')
      await user.click(historyItem)
      
      // Should trigger search for that query
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/semantic-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: 'machine learning',
            documentId: 'test-doc-integration'
          })
        })
      })
      
      // Should show results
      await waitFor(() => {
        expect(screen.getByText(/90%/)).toBeInTheDocument()
      })
    })
  })

  describe('Mark.js Integration', () => {
    it('should clear text highlights when switching to semantic search', async () => {
      const user = userEvent.setup()
      const Mark = require('mark.js')
      const mockMarkInstance = new Mark()
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Start with text search
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'artificial')
      
      // Wait for text search to complete
      await waitFor(() => {
        expect(mockMarkInstance.mark).toHaveBeenCalled()
      })
      
      // Switch to semantic search
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Should clear text highlights
      expect(mockMarkInstance.unmark).toHaveBeenCalled()
    })

    it('should handle semantic search highlighting', async () => {
      const user = userEvent.setup()
      const Mark = require('mark.js')
      const mockMarkInstance = new Mark()
      
      // Mock semantic search response
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: 'test-doc-integration', queries: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            matches: [
              {
                elementId: 'para-1',
                confidence: 0.9,
                reasoning: 'Relevant content',
                relevantText: 'Machine learning content'
              }
            ],
            query: 'machine learning',
            documentId: 'test-doc-integration',
            stats: { matchesFound: 1 },
            aiCallId: 'ai-call-123',
            cached: false
          })
        })
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Perform semantic search
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'machine learning')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Should display results
      await waitFor(() => {
        expect(screen.getByText(/90%/)).toBeInTheDocument()
      })
      
      // Mark.js should not be called for semantic highlighting (different approach)
      expect(mockMarkInstance.mark).not.toHaveBeenCalledWith(
        'machine learning',
        expect.any(Object)
      )
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should show loading states during API calls', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response
      let resolveHistoryCall: (value: any) => void
      let resolveSearchCall: (value: any) => void
      
      const historyPromise = new Promise(resolve => {
        resolveHistoryCall = resolve
      })
      const searchPromise = new Promise(resolve => {
        resolveSearchCall = resolve
      })
      
      ;(global.fetch as jest.Mock)
        .mockReturnValueOnce(historyPromise)
        .mockReturnValueOnce(searchPromise)
      
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />)
      
      // Switch to semantic search
      const searchTab = screen.getByText('Search')
      fireEvent.click(searchTab)
      
      const semanticToggle = screen.getByRole('button', { name: /semantic search/i })
      await user.click(semanticToggle)
      
      // Should show loading for history
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
      
      // Resolve history call
      resolveHistoryCall({
        ok: true,
        json: async () => ({ documentId: 'test-doc-integration', queries: [] })
      })
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })
      
      // Start search
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'test')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      
      // Should show searching state
      expect(screen.getByText(/searching/i)).toBeInTheDocument()
      
      // Resolve search call
      resolveSearchCall({
        ok: true,
        json: async () => ({
          matches: [],
          query: 'test',
          documentId: 'test-doc-integration',
          stats: { matchesFound: 0 },
          aiCallId: 'ai-call-123',
          cached: false
        })
      })
      
      await waitFor(() => {
        expect(screen.queryByText(/searching/i)).not.toBeInTheDocument()
      })
    })
  })
})