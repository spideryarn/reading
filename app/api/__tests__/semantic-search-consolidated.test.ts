/**
 * @jest-environment node
 */

/**
 * Consolidated tests for semantic search API endpoint
 * Combines basic functionality, highlighting accuracy, and error handling tests
 * Fixed response.json() issue from original files
 */

import { testApiRoute } from '@/lib/testing/api-test-utils'
import { createTestUser } from '@/lib/testing/auth-test-utils'
import { getTestNamespace } from '@/lib/testing/test-isolation-utils'
import * as semanticSearchRoute from '../semantic-search/route'
import { createClient } from '@/lib/supabase/server'
import { setupCommonServiceMocks, createMockDocument } from '@/lib/testing/service-mocks'
import { executePromptWithUsage } from '@/lib/prompts/types'
import type { Database } from '@/lib/types/database'
import { createMockRequest } from './test-helpers'
import { authTestScenarios } from '@/lib/testing/auth-test-helpers'

// Mock the external dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/database/documents')
jest.mock('@/lib/services/database/ai-calls') 
jest.mock('@/lib/services/database/enhancements')
jest.mock('@/lib/prompts/types')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockExecutePromptWithUsage = executePromptWithUsage as jest.MockedFunction<typeof executePromptWithUsage>

// Sample test data
const sampleLLMResponse = JSON.stringify({
  matches: [
    {
      elementId: 'elem_p_2',
      confidence: 0.9,
      reasoning: 'Directly discusses quantum mechanics',
      relevantText: 'Quantum mechanics describes the physical properties'
    }
  ]
})

describe('Semantic Search API', () => {
  const namespace = getTestNamespace('semantic-search-consolidated')
  const testUser = createTestUser(namespace)

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock Supabase client with enhancement query support
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null })
    }
    mockCreateClient.mockResolvedValue(mockSupabase as any)
    
    // Mock successful LLM response by default
    mockExecutePromptWithUsage.mockResolvedValue({
      text: sampleLLMResponse,
      usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
      finishReason: 'stop'
    })
  })

  describe('Basic Search Functionality', () => {
    it('should process valid semantic search request successfully', async () => {
      // Setup service mocks
      const { aiCallService, enhancementService, documentService } = setupCommonServiceMocks()
      
      // Setup specific mocks for this test
      const mockDocument = createMockDocument({
        id: 'doc-123',
        html_content: '<h1 id="elem_h1_1">Introduction to Quantum Physics</h1><p id="elem_p_2">Quantum mechanics describes the physical properties of nature.</p>'
      })
      
      jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)
      jest.spyOn(enhancementService, 'get').mockResolvedValue(null) // No cached results
      
      // Execute
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'quantum physics',
          documentId: 'doc-123'
        },
        user: testUser
      })
      
      const data = response.body // Fixed: was response.json()
      
      // Verify response
      expect(response.status).toBe(200)
      expect(data.matches).toHaveLength(1)
      expect(data.matches[0]).toMatchObject({
        elementId: 'elem_p_2',
        confidence: 0.9,
        reasoning: 'Directly discusses quantum mechanics',
        relevantText: 'Quantum mechanics describes the physical properties'
      })
      expect(data.query).toBe('quantum physics')
      expect(data.documentId).toBe('doc-123')
      expect(data.stats).toBeDefined()
      expect(data.aiCallId).toBe('mock-ai-call-id')
    })

    it('should handle empty semantic search results', async () => {
      const { documentService } = setupCommonServiceMocks()
      
      const mockDocument = createMockDocument({
        id: 'doc-123',
        html_content: '<p id="p1">Some unrelated content.</p>'
      })
      
      jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)
      
      mockExecutePromptWithUsage.mockResolvedValue({
        text: JSON.stringify({ matches: [] }),
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
        finishReason: 'stop'
      })
      
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'irrelevant query',
          documentId: 'doc-123'
        },
        user: testUser
      })
      
      const data = response.body // Fixed: was response.json()
      
      expect(response.status).toBe(200)
      expect(data.matches).toHaveLength(0)
      expect(data.stats.matchesFound).toBe(0)
    })

    it('should strip markdown code blocks from LLM response', async () => {
      const { documentService } = setupCommonServiceMocks()
      
      const mockDocument = createMockDocument({
        id: 'doc-123',
        html_content: '<p id="elem_p_2">Quantum mechanics describes the physical properties of nature.</p>'
      })
      
      jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)
      
      // LLM returns JSON wrapped in markdown code blocks
      const wrappedResponse = '```json\n' + sampleLLMResponse + '\n```'
      mockExecutePromptWithUsage.mockResolvedValue({
        text: wrappedResponse,
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
        finishReason: 'stop'
      })
      
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        },
        user: testUser
      })
      
      const data = response.body // Fixed: was response.json()
      
      expect(response.status).toBe(200)
      expect(data.matches).toHaveLength(1)
    })
  })

  describe('Input Validation', () => {
    it('should reject request with missing query', async () => {
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          documentId: 'doc-123'
          // missing query
        },
        user: testUser
      })
      
      const data = response.body // Fixed: was response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })

    it('should reject request with missing documentId', async () => {
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'quantum physics'
          // missing documentId
        },
        user: testUser
      })
      
      const data = response.body // Fixed: was response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('documentId is required for semantic search')
    })
  })

  describe('Document Handling', () => {
    it('should return 404 for non-existent document', async () => {
      // Setup service mocks
      const { documentService } = setupCommonServiceMocks()
      
      // Setup mocks for non-existent document
      jest.spyOn(documentService, 'getById').mockResolvedValue(null)
      
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'nonexistent-doc'
        },
        user: testUser
      })
      
      const data = response.body // Fixed: was response.json()
      
      expect(response.status).toBe(404)
      expect(data.error).toBe('Document not found')
    })

    it('should return 400 for document with no HTML content', async () => {
      // Setup service mocks
      const { documentService } = setupCommonServiceMocks()
      
      // Mock document without HTML content
      const emptyDocument = createMockDocument({
        id: 'doc-123',
        html_content: null
      })
      jest.spyOn(documentService, 'getById').mockResolvedValue(emptyDocument)
      
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        },
        user: testUser
      })
      
      const data = response.body // Fixed: was response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Document has no HTML content for semantic analysis')
    })
  })

  describe('Highlighting Functionality', () => {
    it('should highlight exact phrase matches with proper confidence ordering', async () => {
      const { documentService } = setupCommonServiceMocks()
      
      const mockDocument = createMockDocument({
        id: 'doc-123',
        html_content: `
          <p id="p1">Machine learning is a subset of artificial intelligence that enables systems to learn from data.</p>
          <p id="p2">Deep learning is a type of machine learning based on neural networks.</p>
          <p id="p3">Traditional programming differs from machine learning approaches.</p>
        `
      })
      
      jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)
      
      // Mock LLM response with exact matches
      mockExecutePromptWithUsage.mockResolvedValue({
        text: JSON.stringify({
          matches: [
            {
              elementId: 'p1',
              confidence: 0.95,
              reasoning: 'Exact match: contains the phrase "machine learning"',
              relevantText: 'Machine learning is a subset of artificial intelligence'
            },
            {
              elementId: 'p2',
              confidence: 0.90,
              reasoning: 'Contains "machine learning" in context of deep learning',
              relevantText: 'type of machine learning based on neural networks'
            },
            {
              elementId: 'p3',
              confidence: 0.80,
              reasoning: 'Mentions "machine learning" in comparison context',
              relevantText: 'differs from machine learning approaches'
            }
          ]
        }),
        usage: { promptTokens: 500, completionTokens: 150, totalTokens: 650 },
        finishReason: 'stop'
      })

      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'machine learning',
          documentId: 'doc-123'
        },
        user: testUser
      })

      const data = response.body // Fixed: was response.json()
      
      expect(response.status).toBe(200)
      expect(data.matches).toHaveLength(3)
      
      // Verify all matches contain the search term
      data.matches.forEach((match: any) => {
        expect(match.relevantText.toLowerCase()).toContain('machine learning')
      })
      
      // Verify confidence ordering
      expect(data.matches[0].confidence).toBeGreaterThan(data.matches[1].confidence)
      expect(data.matches[1].confidence).toBeGreaterThan(data.matches[2].confidence)
    })

    it('should handle case-insensitive matching', async () => {
      const { documentService } = setupCommonServiceMocks()
      
      const mockDocument = createMockDocument({
        id: 'doc-123',
        html_content: `
          <p id="p1">ARTIFICIAL INTELLIGENCE is transforming industries.</p>
          <p id="p2">Artificial Intelligence applications are diverse.</p>
          <p id="p3">The field of artificial intelligence continues to grow.</p>
        `
      })
      
      jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)
      
      mockExecutePromptWithUsage.mockResolvedValue({
        text: JSON.stringify({
          matches: [
            { elementId: 'p1', confidence: 0.9, reasoning: 'Uppercase match', relevantText: 'ARTIFICIAL INTELLIGENCE' },
            { elementId: 'p2', confidence: 0.9, reasoning: 'Title case match', relevantText: 'Artificial Intelligence' },
            { elementId: 'p3', confidence: 0.9, reasoning: 'Lowercase match', relevantText: 'artificial intelligence' }
          ]
        }),
        usage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 },
        finishReason: 'stop'
      })

      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'artificial intelligence',
          documentId: 'doc-123'
        },
        user: testUser
      })

      const data = response.body // Fixed: was response.json()

      expect(response.status).toBe(200)
      expect(data.matches).toHaveLength(3)
      // All matches should have equal confidence for case variations
      expect(data.matches[0].confidence).toBe(data.matches[1].confidence)
      expect(data.matches[1].confidence).toBe(data.matches[2].confidence)
    })

    it('should highlight semantically related content', async () => {
      const { documentService } = setupCommonServiceMocks()
      
      const mockDocument = createMockDocument({
        id: 'doc-123',
        html_content: `
          <p id="p1">Neural networks form the foundation of deep learning systems.</p>
          <p id="p2">Supervised learning requires labeled training data.</p>
          <p id="p3">Classification algorithms predict discrete categories.</p>
        `
      })
      
      jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)

      // Query: "AI models" should match semantically related content
      mockExecutePromptWithUsage.mockResolvedValue({
        text: JSON.stringify({
          matches: [
            {
              elementId: 'p1',
              confidence: 0.75,
              reasoning: 'Neural networks are a type of AI model',
              relevantText: 'Neural networks form the foundation'
            },
            {
              elementId: 'p3',
              confidence: 0.70,
              reasoning: 'Classification algorithms are AI models',
              relevantText: 'Classification algorithms predict discrete categories'
            }
          ]
        }),
        usage: { promptTokens: 400, completionTokens: 120, totalTokens: 520 },
        finishReason: 'stop'
      })

      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'AI models',
          documentId: 'doc-123'
        },
        user: testUser
      })

      const data = response.body // Fixed: was response.json()

      expect(response.status).toBe(200)
      expect(data.matches).toHaveLength(2)
      
      // Verify semantic matches don't necessarily contain the exact query
      const match1 = data.matches.find((m: any) => m.elementId === 'p1')
      expect(match1.relevantText).not.toContain('AI models')
      expect(match1.reasoning).toContain('Neural networks are a type of AI model')
    })

    it('should handle special characters in queries', async () => {
      const { documentService } = setupCommonServiceMocks()
      
      const mockDocument = createMockDocument({
        id: 'doc-123',
        html_content: '<p id="p1">C++ is a powerful object-oriented language.</p>'
      })
      
      jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)

      mockExecutePromptWithUsage.mockResolvedValue({
        text: JSON.stringify({
          matches: [{
            elementId: 'p1',
            confidence: 0.95,
            reasoning: 'Exact match for C++',
            relevantText: 'C++ is a powerful'
          }]
        }),
        usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250 },
        finishReason: 'stop'
      })

      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'C++',
          documentId: 'doc-123'
        },
        user: testUser
      })

      const data = response.body // Fixed: was response.json()

      expect(response.status).toBe(200)
      expect(data.matches).toHaveLength(1)
      expect(data.matches[0].relevantText).toContain('C++')
    })
  })

  describe('Error Handling', () => {
    it('should handle LLM errors gracefully', async () => {
      const { documentService } = setupCommonServiceMocks()
      
      const mockDocument = createMockDocument({
        id: 'doc-123',
        html_content: '<p id="elem_p_2">Test content</p>'
      })
      
      jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)
      mockExecutePromptWithUsage.mockRejectedValue(new Error('LLM service unavailable'))
      
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        },
        user: testUser
      })
      
      const data = response.body // Fixed: was response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('LLM service unavailable')
    })

    it('should handle malformed JSON from LLM', async () => {
      const { documentService } = setupCommonServiceMocks()
      
      const mockDocument = createMockDocument({
        id: 'doc-123',
        html_content: '<p id="elem_p_2">Test content</p>'
      })
      
      jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)
      mockExecutePromptWithUsage.mockResolvedValue({
        text: 'Invalid JSON response',
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
        finishReason: 'stop'
      })
      
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        },
        user: testUser
      })
      
      const data = response.body // Fixed: was response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('Unexpected token')
    })
  })

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await testApiRoute({
        handler: semanticSearchRoute,
        url: '/api/semantic-search',
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        },
        authScenario: 'unauthenticated'
      })
      
      expect(response.status).toBe(401)
    })
  })
})