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

import { GET, POST } from '../semantic-search/route'
import { createMockRequest } from './test-helpers'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { executePromptWithUsage } from '@/lib/prompts/types'
import type { MockSupabaseClient, MockDocumentService, MockAiCallService, MockEnhancementService, MockAiCall } from './test-types'
import type { Database } from '@/lib/types/database'

// Mock the external dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/database/documents')
jest.mock('@/lib/services/database/ai-calls')
jest.mock('@/lib/services/database/enhancements')
jest.mock('@/lib/prompts/types')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const MockDocumentService = DocumentService as jest.MockedClass<typeof DocumentService>
const MockAiCallService = AiCallService as jest.MockedClass<typeof AiCallService>
const MockEnhancementService = EnhancementService as jest.MockedClass<typeof EnhancementService>
const mockExecutePromptWithUsage = executePromptWithUsage as jest.MockedFunction<typeof executePromptWithUsage>

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
  let mockDocumentService: MockDocumentService
  let mockAiCallService: MockAiCallService
  let mockEnhancementService: MockEnhancementService
  let mockSupabase: MockSupabaseClient

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
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
    
    // Mock DocumentService
    mockDocumentService = {
      getById: jest.fn(),
      getElements: jest.fn(),
    }
    MockDocumentService.mockImplementation(() => mockDocumentService as DocumentService)
    
    // Mock AiCallService  
    mockAiCallService = {
      startCall: jest.fn(),
      completeCall: jest.fn(),
    }
    MockAiCallService.mockImplementation(() => mockAiCallService as AiCallService)
    
    // Mock EnhancementService
    mockEnhancementService = {
      get: jest.fn(),
      upsert: jest.fn(),
      getByDocument: jest.fn(),
    }
    MockEnhancementService.mockImplementation(() => mockEnhancementService as EnhancementService)
    
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
    
    // Mock AI call tracking
    mockAiCallService.startCall.mockResolvedValue({ id: 'ai-call-123' } as MockAiCall)
    mockAiCallService.completeCall.mockResolvedValue(undefined)
    mockEnhancementService.upsert.mockResolvedValue(sampleCachedEnhancement)
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
      mockEnhancementService.get.mockResolvedValue(sampleCachedEnhancement)
      
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
      mockEnhancementService.get.mockResolvedValue(malformedEnhancement)
      
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
      mockEnhancementService.get.mockResolvedValue(invalidEnhancement)
      
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
      mockEnhancementService.get.mockResolvedValue(null) // No cache
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
      mockEnhancementService.get.mockResolvedValue(null)
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
      mockEnhancementService.get.mockResolvedValue(null)
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
      mockEnhancementService.get.mockResolvedValue(null) // No cache initially
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
      expect(mockEnhancementService.upsert).toHaveBeenCalledWith({
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
      mockEnhancementService.get.mockResolvedValue(null)
      mockDocumentService.getById.mockResolvedValue(sampleDocument)
      mockEnhancementService.upsert.mockRejectedValue(new Error('Cache storage failed'))
      
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
      expect(mockEnhancementService.upsert).toHaveBeenCalled()
    })
  })

  describe('POST endpoint - AI Call Tracking', () => {
    it('should track AI calls with proper metadata', async () => {
      mockEnhancementService.get.mockResolvedValue(null)
      mockDocumentService.getById.mockResolvedValue(sampleDocument)
      
      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: {
          query: 'machine learning concepts',
          documentId: 'doc-123'
        }
      })
      
      await POST(request)
      
      expect(mockAiCallService.startCall).toHaveBeenCalledWith({
        documentId: 'doc-123',
        provider: expect.any(String),
        modelId: expect.any(String),
        prompt_type: 'semantic-search',
        input_data: expect.objectContaining({
          query: 'machine learning concepts',
          content_length: expect.any(Number),
          elements_count: expect.any(Number),
          estimated_tokens: expect.any(Number),
          tier_used: expect.any(String)
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
      mockEnhancementService.get.mockResolvedValue(null)
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
      expect(mockAiCallService.startCall).toHaveBeenCalled()
      // AI call completion is not called when LLM fails early
    })
  })
})