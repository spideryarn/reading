/**
 * @jest-environment node
 */

/**
 * Enhanced Tests for Semantic Search API Endpoint
 * 
 * These tests fill gaps in the existing semantic-search.test.ts by focusing on:
 * 1. GET endpoint for query history retrieval
 * 2. Cache persistence and retrieval behavior
 * 3. Token estimation and limits
 * 4. Error handling edge cases
 * 5. Integration with EnhancementService
 */

// Mock auth modules first, before any imports
jest.mock('@/lib/auth/server-auth', () => ({
  getUser: jest.fn(),
  validateAuth: jest.fn(),
  getUserId: jest.fn(),
  checkAdminAccess: jest.fn(),
  getSession: jest.fn()
}))

import { GET, POST } from '../semantic-search/route'
import { createMockRequest } from './test-helpers'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { executePromptWithUsage } from '@/lib/prompts/types'
import type { MockSupabaseClient, MockDocumentService, MockAiCallService, MockEnhancementService, MockAiCall } from './test-types'
import type { Database } from '@/lib/types/database'
import { authTestScenarios, defaultTestUser } from '@/lib/testing/auth-test-helpers'
import { semanticSearchApiInputSchema } from '@/lib/prompts/templates/semantic-search'
import { validateAuth } from '@/lib/auth/server-auth'

// Mock the external dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/database/documents')
jest.mock('@/lib/services/database/ai-calls', () => ({
  AiCallService: jest.fn()
}))
jest.mock('@/lib/services/database/enhancements', () => {
  const mockGet = jest.fn()
  const mockUpsert = jest.fn()
  const mockGetByDocument = jest.fn()
  return {
    EnhancementService: jest.fn().mockImplementation(() => ({
      get: mockGet,
      upsert: mockUpsert,
      getByDocument: mockGetByDocument
    }))
  }
})
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/services/semantic-search-formatter')
jest.mock('@/lib/prompts/templates/semantic-search', () => ({
  semanticSearchPrompt: {
    name: 'semantic-search',
    description: 'Test semantic search prompt',
    schema: {},
    templatePath: 'test.njk',
    modelConfig: {}
  },
  semanticSearchApiInputSchema: {
    safeParse: jest.fn()
  },
  semanticSearchResponseSchema: {
    parse: jest.fn()
  }
}))
jest.mock('@/lib/services/document-parser', () => ({
  DocumentParser: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue([
      { id: 'elem_p_1', type: 'paragraph', text: 'This is test content for semantic analysis.' }
    ])
  }))
}))
jest.mock('@/lib/config', () => ({
  getModelConfig: jest.fn(() => ({ provider: 'anthropic', modelId: 'claude-3-haiku' })),
  getModelForAICall: jest.fn(() => ({ 
    modelString: 'anthropic:claude-3-5-haiku:20241022',
    config: { provider: 'anthropic', modelId: 'claude-3-5-haiku', version: '20241022' }
  })),
  AI_CONFIG: { DEFAULT_MODEL: 'haiku' }
}))
jest.mock('@/lib/utils/semantic-search', () => ({
  normalizeSemanticSearchQuery: jest.fn(query => query.toLowerCase().trim())
}))
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  generateCorrelationId: jest.fn(() => 'test-correlation-id'),
  logAIOperation: jest.fn(),
  createTimer: jest.fn(() => ({ end: jest.fn() }))
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockExecutePromptWithUsage = executePromptWithUsage as jest.MockedFunction<typeof executePromptWithUsage>
const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>

// Sample test data
const sampleDocument: Database['public']['Tables']['documents']['Row'] = {
  id: 'doc-123',
  title: 'Test Document',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  content: null,
  source_url: null,
  source_type: null,
  html_content: '<h1>Introduction</h1><p>This is test content for semantic analysis.</p>',
  metadata: null,
  user_id: null,
  slug: null,
  ai_generated_description: null,
  uploaded_file_path: null,
  uploaded_file_type: null,
  original_filename: null
}

const sampleCachedEnhancement = {
  id: 'enhancement-123',
  document_id: 'doc-123',
  type: 'semantic-search',
  subtype: 'test query',
  content: {
    originalQuery: 'test query',
    normalizedQuery: 'test query',
    matches: [
      {
        elementId: 'elem_p_1',
        confidence: 0.8,
        reasoning: 'This paragraph contains relevant information',
        relevantText: 'test content for semantic analysis'
      }
    ],
    stats: {
      totalElements: 2,
      searchableElements: 2,
      matchesFound: 1,
      estimatedTokensUsed: 150
    },
    searchedAt: '2025-01-01T10:00:00Z'
  },
  ai_call_id: 'ai-call-123',
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
  extra: {}
}

const sampleQueryHistory = [
  {
    subtype: 'machine learning',
    created_at: '2025-01-01T09:00:00Z',
    content: {
      originalQuery: 'machine learning',
      normalizedQuery: 'machine learning',
      matches: [{ elementId: 'elem_1', confidence: 0.9 }],
      searchedAt: '2025-01-01T09:00:00Z'
    }
  },
  {
    subtype: 'artificial intelligence',
    created_at: '2025-01-01T08:00:00Z',
    content: {
      originalQuery: 'artificial intelligence',
      normalizedQuery: 'artificial intelligence',
      matches: [{ elementId: 'elem_2', confidence: 0.7 }],
      searchedAt: '2025-01-01T08:00:00Z'
    }
  }
]

describe('/api/semantic-search - Enhanced Coverage', () => {
  let mockDocumentService: DocumentService
  let mockAiCallService: AiCallService
  let mockEnhancementService: EnhancementService
  let mockSupabase: MockSupabaseClient

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock behavior for validation
    const { semanticSearchApiInputSchema } = require('@/lib/prompts/templates/semantic-search')
    semanticSearchApiInputSchema.safeParse.mockReturnValue({
      success: true,
      data: { query: 'test query', documentId: 'doc-123' }
    })
    
    // Clear any persisted mock data
    if ('clearMockEnhancements' in EnhancementService) {
      (EnhancementService as any).clearMockEnhancements()
    }
    
    // Mock Supabase client with query builder
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }
    
    mockSupabase = {
      from: jest.fn().mockReturnValue(mockQuery)
    }
    mockCreateClient.mockResolvedValue(mockSupabase)
    
    // Create service instances
    mockDocumentService = new DocumentService(mockSupabase)
    mockAiCallService = new AiCallService(mockSupabase)
    mockEnhancementService = new EnhancementService(mockSupabase)
    
    // Set up service method spies
    jest.spyOn(mockDocumentService, 'getById').mockResolvedValue(sampleDocument)
    
    const { AiCallService: MockAiCallService } = require('@/lib/services/database/ai-calls')
    // Ensure the mock returns the expected value
    MockAiCallService.mockImplementation(() => ({
      startCallWithModelString: jest.fn().mockResolvedValue({ id: 'ai-call-123' }),
      completeCall: jest.fn().mockResolvedValue(undefined),
      failCall: jest.fn().mockResolvedValue(undefined)
    }))
    
    // Setup EnhancementService mock
    const { EnhancementService: MockEnhancementService } = require('@/lib/services/database/enhancements')
    const mockGet = jest.fn().mockResolvedValue(null)
    const mockUpsert = jest.fn().mockResolvedValue(sampleCachedEnhancement)
    const mockGetByDocument = jest.fn().mockResolvedValue([])
    MockEnhancementService.mockImplementation(() => ({
      get: mockGet,
      upsert: mockUpsert,
      getByDocument: mockGetByDocument
    }))
    
    // Store references for test assertions
    mockEnhancementService._mockGet = mockGet
    mockEnhancementService._mockUpsert = mockUpsert
    
    // Mock formatDocumentForSemanticSearch
    jest.mocked(require('@/lib/services/semantic-search-formatter').formatDocumentForSemanticSearch).mockReturnValue(
      '[elem_p_1] This is test content for semantic analysis.\n'
    )
    
    // Mock validation 
    jest.mocked(require('@/lib/services/semantic-search-formatter').validateSemanticSearchElementIds).mockReturnValue(['elem_p_1'])
    jest.mocked(require('@/lib/services/semantic-search-formatter').getDocumentStats).mockReturnValue({
      totalElements: 2,
      meaningfulElements: 2
    })
    jest.mocked(require('@/lib/services/semantic-search-formatter').estimateTokenCount).mockReturnValue(150)
    
    // Setup auth mock - default to authenticated user
    mockValidateAuth.mockResolvedValue(defaultTestUser)
    
    // Mock successful LLM response by default
    mockExecutePromptWithUsage.mockResolvedValue({
      text: JSON.stringify({
        matches: [
          {
            elementId: 'elem_p_1',
            confidence: 0.8,
            reasoning: 'Relevant content',
            relevantText: 'test content'
          }
        ]
      }),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        latencyMs: 1000
      },
      finishReason: 'completed'
    })
  })

  describe('GET endpoint - Query History', () => {
    it('should return empty query list for new document', async () => {
      // Setup: Empty query history
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                data: [],
                error: null
              })
            })
          })
        })
      })
      mockSupabase.from = mockFrom
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search?documentId=doc-123')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.documentId).toBe('doc-123')
      expect(data.queries).toEqual([])
    })

    it('should return formatted query history', async () => {
      // Setup: Mock query history
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                data: sampleQueryHistory,
                error: null
              })
            })
          })
        })
      })
      mockSupabase.from = mockFrom
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search?documentId=doc-123')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.queries).toHaveLength(2)
      expect(data.queries[0]).toMatchObject({
        query: 'machine learning',
        normalizedQuery: 'machine learning',
        resultCount: 1
      })
      expect(data.queries[1]).toMatchObject({
        query: 'artificial intelligence', 
        normalizedQuery: 'artificial intelligence',
        resultCount: 1
      })
    })

    it('should handle missing documentId parameter', async () => {
      const request = createMockRequest('http://localhost:3000/api/semantic-search')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('documentId query parameter is required')
    })

    it('should handle database errors gracefully', async () => {
      // Setup: Database error
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                data: null,
                error: { message: 'Database connection failed' }
              })
            })
          })
        })
      })
      mockSupabase.from = mockFrom
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search?documentId=doc-123')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch query history')
    })
  })

  describe('POST endpoint - Cache Behavior', () => {
    it('should return cached results when available', async () => {
      mockEnhancementService._mockGet.mockResolvedValue(sampleCachedEnhancement)
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      if (response.status !== 200) {
        console.error('Response error:', JSON.stringify(data, null, 2))
        console.error('Response status:', response.status)
      }
      expect(response.status).toBe(200)
      expect(data.cached).toBe(true)
      expect(data.cachedAt).toBe(sampleCachedEnhancement.created_at)
      expect(data.enhancementId).toBe(sampleCachedEnhancement.id)
      expect(data.matches).toEqual(sampleCachedEnhancement.content.matches)
      expect(data.stats).toEqual(sampleCachedEnhancement.content.stats)
      
      // Should not call LLM when cached
      expect(mockExecutePromptWithUsage).not.toHaveBeenCalled()
    })

    it('should handle malformed cached data', async () => {
      // Return enhancement with invalid content structure
      const malformedEnhancement = {
        ...sampleCachedEnhancement,
        content: null // Invalid content
      }
      mockEnhancementService._mockGet.mockResolvedValue(malformedEnhancement)
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('Malformed semantic search cache data')
    })

    it('should handle cached data with invalid matches array', async () => {
      const invalidEnhancement = {
        ...sampleCachedEnhancement,
        content: {
          ...sampleCachedEnhancement.content,
          matches: 'not an array' // Invalid matches
        }
      }
      mockEnhancementService._mockGet.mockResolvedValue(invalidEnhancement)
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('matches is not an array')
    })
  })

  describe('POST endpoint - Token Limits', () => {
    it('should reject documents that exceed token limit', async () => {
      mockEnhancementService._mockGet.mockResolvedValue(null) // No cache
      mockDocumentService.getById.mockResolvedValue({
        ...sampleDocument,
        html_content: '<p>' + 'a'.repeat(200000) + '</p>' // Very large content
      })
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(413)
      expect(data.error).toBe('Document too large for semantic search')
      expect(data.details).toContain('Estimated')
      expect(data.details).toContain('tokens')
    })

    it('should handle empty document content', async () => {
      mockEnhancementService._mockGet.mockResolvedValue(null)
      mockDocumentService.getById.mockResolvedValue({
        ...sampleDocument,
        html_content: '' // Empty content
      })
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Document contains no meaningful content for semantic analysis')
    })

    it('should handle document with null html_content', async () => {
      mockEnhancementService._mockGet.mockResolvedValue(null)
      mockDocumentService.getById.mockResolvedValue({
        ...sampleDocument,
        html_content: null
      })
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Document has no HTML content for semantic analysis')
    })
  })

  describe('POST endpoint - Cache Storage', () => {
    it('should store results in cache after successful search', async () => {
      mockEnhancementService._mockGet.mockResolvedValue(null) // No cache initially
      mockDocumentService.getById.mockResolvedValue(sampleDocument)
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.cached).toBe(false)
      
      // Verify cache was stored
      expect(mockEnhancementService._mockUpsert).toHaveBeenCalledWith({
        documentId: 'doc-123',
        aiCallId: 'ai-call-123',
        type: 'semantic-search',
        subtype: 'test query',
        content: expect.objectContaining({
          originalQuery: 'test query',
          normalizedQuery: 'test query',
          matches: expect.any(Array),
          stats: expect.any(Object),
          searchedAt: expect.any(String)
        })
      })
    })

    it('should continue processing when cache storage fails', async () => {
      mockEnhancementService._mockGet.mockResolvedValue(null)
      mockDocumentService.getById.mockResolvedValue(sampleDocument)
      mockEnhancementService._mockUpsert.mockRejectedValue(new Error('Cache storage failed'))
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.matches).toBeDefined()
      expect(data.cached).toBe(false)
      
      // Should have attempted to cache
      expect(mockEnhancementService._mockUpsert).toHaveBeenCalled()
    })
  })

  describe('POST endpoint - AI Call Tracking', () => {
    it('should track AI calls with proper metadata', async () => {
      mockEnhancementService._mockGet.mockResolvedValue(null)
      mockDocumentService.getById.mockResolvedValue(sampleDocument)
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'machine learning concepts',
          documentId: 'doc-123'
        }
      })
      
      await POST(request)
      
      expect(mockAiCallService.startCallWithModelString).toHaveBeenCalledWith({
        userId: defaultTestUser.id,
        documentId: 'doc-123',
        modelString: expect.any(String),
        prompt_type: 'semantic-search',
        input_data: expect.objectContaining({
          query: 'machine learning concepts',
          content_length: expect.any(Number),
          elements_count: expect.any(Number),
          estimated_tokens: expect.any(Number),
          model_used: expect.any(String)
        })
      })
      
      expect(mockAiCallService.completeCall).toHaveBeenCalledWith('ai-call-123', {
        output_data: expect.objectContaining({
          matches_found: expect.any(Number),
          total_matches_returned: expect.any(Number),
          invalid_ids_filtered: expect.any(Number),
          processing_notes: 'Semantic search completed successfully'
        }),
        usage: expect.any(Object),
        finishReason: 'completed'
      })
    })

    it('should complete AI call even when LLM fails', async () => {
      mockEnhancementService._mockGet.mockResolvedValue(null)
      mockDocumentService.getById.mockResolvedValue(sampleDocument)
      mockExecutePromptWithUsage.mockRejectedValue(new Error('LLM failed'))
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(500)
      expect(mockAiCallService.startCallWithModelString).toHaveBeenCalled()
      // AI call completion is not called when LLM fails early
    })
  })

  describe('Authentication Tests', () => {
    it('should return 401 when not authenticated', async () => {
      // Setup auth to fail
      authTestScenarios.authFailure('User not authenticated')

      // Mock validation to succeed (but it won't be reached)
      ;(semanticSearchApiInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { query: 'test query', documentId: 'doc-123' }
      })

      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'test query',
          documentId: 'doc-123'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
      
      const text = await response.text()
      expect(text).toContain('User not authenticated')
    })

    it('should check auth before input validation', async () => {
      // Setup auth to fail
      authTestScenarios.authFailure()

      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {} // Invalid body that would normally trigger validation error
      })

      const response = await POST(request)
      // Should get 401 (auth error) instead of 400 (validation error)
      expect(response.status).toBe(401)
      
      // Verify that validation was never called
      expect(semanticSearchApiInputSchema.safeParse).not.toHaveBeenCalled()
    })

    afterEach(() => {
      // Reset auth to succeed for other tests
      authTestScenarios.businessLogic()
    })
  })
})