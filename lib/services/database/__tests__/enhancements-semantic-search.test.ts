/**
 * Tests for EnhancementService - Semantic Search Functionality
 * 
 * These tests focus specifically on semantic search cache persistence:
 * 1. EnhancementService.upsert() for semantic search results
 * 2. Cache retrieval and validation
 * 3. Proper storage of confidence scores and reasoning
 * 4. Query normalization and subtype handling
 */

import { EnhancementService } from '../enhancements'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
} as unknown as SupabaseClient<Database>

describe('EnhancementService - Semantic Search', () => {
  let enhancementService: EnhancementService
  let mockQuery: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create mock query builder
    mockQuery = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    }
    
    ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQuery)
    enhancementService = new EnhancementService(mockSupabaseClient)
  })

  describe('Semantic Search Cache Storage', () => {
    const semanticSearchContent = {
      originalQuery: 'machine learning algorithms',
      normalizedQuery: 'machine learning algorithms',
      matches: [
        {
          elementId: 'elem_p_1',
          confidence: 0.9,
          reasoning: 'Discusses ML algorithms directly',
          relevantText: 'Machine learning algorithms require training data'
        },
        {
          elementId: 'elem_p_2', 
          confidence: 0.7,
          reasoning: 'Mentions neural networks',
          relevantText: 'Neural networks are a subset of machine learning'
        }
      ],
      stats: {
        totalElements: 10,
        searchableElements: 8,
        matchesFound: 2,
        estimatedTokensUsed: 350
      },
      searchedAt: '2025-01-01T10:00:00Z'
    }

    it('should store semantic search results with proper structure', async () => {
      const mockEnhancement = {
        id: 'enhancement-123',
        document_id: 'doc-123',
        ai_call_id: 'ai-call-456',
        type: 'semantic-search',
        subtype: 'machine learning algorithms',
        content: semanticSearchContent,
        extra: {},
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      }
      
      mockQuery.single.mockResolvedValue({ data: mockEnhancement, error: null })
      
      const result = await enhancementService.upsert({
        documentId: 'doc-123',
        aiCallId: 'ai-call-456',
        type: 'semantic-search',
        subtype: 'machine learning algorithms',
        content: semanticSearchContent
      })
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('document_enhancements')
      expect(mockQuery.upsert).toHaveBeenCalledWith({
        document_id: 'doc-123',
        ai_call_id: 'ai-call-456',
        type: 'semantic-search',
        subtype: 'machine learning algorithms',
        content: semanticSearchContent,
        extra: {}
      }, {
        onConflict: 'document_id,type,subtype'
      })
      
      expect(result).toEqual(mockEnhancement)
    })

    it('should handle upsert conflicts for duplicate queries', async () => {
      const duplicateContent = {
        originalQuery: 'artificial intelligence',
        normalizedQuery: 'artificial intelligence',
        matches: [],
        stats: { matchesFound: 0 },
        searchedAt: '2025-01-01T11:00:00Z'
      }
      
      const updatedEnhancement = {
        id: 'enhancement-123',
        document_id: 'doc-123',
        ai_call_id: 'ai-call-789',
        type: 'semantic-search',
        subtype: 'artificial intelligence',
        content: duplicateContent,
        extra: {},
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T11:00:00Z'
      }
      
      mockQuery.single.mockResolvedValue({ data: updatedEnhancement, error: null })
      
      const result = await enhancementService.upsert({
        documentId: 'doc-123',
        aiCallId: 'ai-call-789',
        type: 'semantic-search',
        subtype: 'artificial intelligence',
        content: duplicateContent
      })
      
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          document_id: 'doc-123',
          type: 'semantic-search',
          subtype: 'artificial intelligence'
        }),
        { onConflict: 'document_id,type,subtype' }
      )
      
      expect(result.updated_at).toBe('2025-01-01T11:00:00Z')
    })

    it('should handle upsert errors gracefully', async () => {
      mockQuery.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database constraint violation' }
      })
      
      await expect(enhancementService.upsert({
        documentId: 'doc-123',
        aiCallId: 'ai-call-456',
        type: 'semantic-search',
        subtype: 'test query',
        content: semanticSearchContent
      })).rejects.toThrow('Failed to upsert enhancement: Database constraint violation')
    })
  })

  describe('Semantic Search Cache Retrieval', () => {
    const cachedEnhancement = {
      id: 'enhancement-123',
      document_id: 'doc-123',
      ai_call_id: 'ai-call-456',
      type: 'semantic-search',
      subtype: 'neural networks',
      content: {
        originalQuery: 'neural networks',
        normalizedQuery: 'neural networks',
        matches: [
          {
            elementId: 'elem_h1_1',
            confidence: 0.95,
            reasoning: 'Section title about neural networks',
            relevantText: 'Introduction to Neural Networks'
          }
        ],
        stats: {
          totalElements: 5,
          searchableElements: 4,
          matchesFound: 1,
          estimatedTokensUsed: 200
        },
        searchedAt: '2025-01-01T10:00:00Z'
      },
      extra: {},
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      ai_calls: {
        id: 'ai-call-456',
        provider: 'anthropic',
        model_id: 'claude-3-sonnet',
        usage: { totalTokens: 200 }
      }
    }

    it('should retrieve cached semantic search results', async () => {
      mockQuery.maybeSingle.mockResolvedValue({ data: cachedEnhancement, error: null })
      
      const result = await enhancementService.get(
        'doc-123',
        'semantic-search',
        'neural networks'
      )
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('document_enhancements')
      expect(mockQuery.select).toHaveBeenCalledWith('*, ai_calls(*, ai_models(*))')
      expect(mockQuery.eq).toHaveBeenCalledWith('document_id', 'doc-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'semantic-search')
      expect(mockQuery.eq).toHaveBeenCalledWith('subtype', 'neural networks')
      
      expect(result).toEqual(cachedEnhancement)
    })

    it('should return null for non-existent cache entries', async () => {
      mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
      
      const result = await enhancementService.get(
        'doc-123',
        'semantic-search',
        'nonexistent query'
      )
      
      expect(result).toBeNull()
    })

    it('should handle invalid UUID format', async () => {
      const result = await enhancementService.get(
        'invalid-uuid',
        'semantic-search',
        'test query'
      )
      
      expect(result).toBeNull()
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('should handle database errors during retrieval', async () => {
      mockQuery.maybeSingle.mockResolvedValue({ 
        data: null, 
        error: { message: 'Connection timeout' }
      })
      
      await expect(enhancementService.get(
        'doc-123',
        'semantic-search',
        'test query'
      )).rejects.toThrow('Failed to fetch enhancement: Connection timeout')
    })
  })

  describe('Query Normalization and Subtype Handling', () => {
    it('should use normalized query as subtype', async () => {
      const content = {
        originalQuery: 'What is Machine Learning?',
        normalizedQuery: 'machine learning',
        matches: [],
        stats: { matchesFound: 0 },
        searchedAt: '2025-01-01T10:00:00Z'
      }
      
      mockQuery.single.mockResolvedValue({ 
        data: { id: 'enhancement-123' }, 
        error: null 
      })
      
      await enhancementService.upsert({
        documentId: 'doc-123',
        aiCallId: 'ai-call-456',
        type: 'semantic-search',
        subtype: 'machine learning', // normalized version
        content
      })
      
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          subtype: 'machine learning'
        }),
        { onConflict: 'document_id,type,subtype' }
      )
    })

    it('should handle special characters in query normalization', async () => {
      const content = {
        originalQuery: 'AI & ML: What\'s the difference?',
        normalizedQuery: 'ai ml difference',
        matches: [],
        stats: { matchesFound: 0 },
        searchedAt: '2025-01-01T10:00:00Z'
      }
      
      mockQuery.single.mockResolvedValue({ 
        data: { id: 'enhancement-123' }, 
        error: null 
      })
      
      await enhancementService.upsert({
        documentId: 'doc-123',
        aiCallId: 'ai-call-456',
        type: 'semantic-search',
        subtype: 'ai ml difference',
        content
      })
      
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          subtype: 'ai ml difference'
        }),
        { onConflict: 'document_id,type,subtype' }
      )
    })
  })

  describe('Data Validation and Integrity', () => {
    it('should store confidence scores as numbers', async () => {
      const content = {
        originalQuery: 'test',
        normalizedQuery: 'test',
        matches: [
          {
            elementId: 'elem_1',
            confidence: 0.85, // Should remain as number
            reasoning: 'Test reasoning',
            relevantText: 'Test text'
          }
        ],
        stats: { matchesFound: 1 },
        searchedAt: '2025-01-01T10:00:00Z'
      }
      
      mockQuery.single.mockResolvedValue({ 
        data: { id: 'enhancement-123', content }, 
        error: null 
      })
      
      const result = await enhancementService.upsert({
        documentId: 'doc-123',
        aiCallId: 'ai-call-456',
        type: 'semantic-search',
        subtype: 'test',
        content
      })
      
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            matches: expect.arrayContaining([
              expect.objectContaining({
                confidence: 0.85
              })
            ])
          })
        }),
        { onConflict: 'document_id,type,subtype' }
      )
    })

    it('should preserve all semantic search metadata', async () => {
      const content = {
        originalQuery: 'deep learning',
        normalizedQuery: 'deep learning',
        matches: [
          {
            elementId: 'elem_1',
            confidence: 0.92,
            reasoning: 'Contains deep learning concepts',
            relevantText: 'Deep learning is a subset of machine learning'
          }
        ],
        stats: {
          totalElements: 15,
          searchableElements: 12,
          matchesFound: 1,
          estimatedTokensUsed: 420
        },
        searchedAt: '2025-01-01T10:00:00Z'
      }
      
      mockQuery.single.mockResolvedValue({ 
        data: { id: 'enhancement-123', content }, 
        error: null 
      })
      
      await enhancementService.upsert({
        documentId: 'doc-123',
        aiCallId: 'ai-call-456',
        type: 'semantic-search',
        subtype: 'deep learning',
        content
      })
      
      const storedContent = (mockQuery.upsert as jest.Mock).mock.calls[0][0].content
      
      expect(storedContent).toEqual(content)
      expect(storedContent.stats).toEqual({
        totalElements: 15,
        searchableElements: 12,
        matchesFound: 1,
        estimatedTokensUsed: 420
      })
    })
  })

  describe('Cache Expiration and Management', () => {
    it('should support checking if semantic search cache exists', async () => {
      mockQuery.maybeSingle.mockResolvedValue({ 
        data: { id: 'enhancement-123' }, 
        error: null 
      })
      
      const exists = await enhancementService.exists(
        'doc-123',
        'semantic-search',
        'machine learning'
      )
      
      expect(exists).toBe(true)
      expect(mockQuery.eq).toHaveBeenCalledWith('document_id', 'doc-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'semantic-search')
      expect(mockQuery.eq).toHaveBeenCalledWith('subtype', 'machine learning')
    })

    it('should support deleting semantic search cache', async () => {
      const mockDelete = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockDelete)
      mockDelete.delete.mockResolvedValue({ error: null })
      
      await enhancementService.delete(
        'doc-123',
        'semantic-search',
        'outdated query'
      )
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('document_enhancements')
      expect(mockDelete.delete).toHaveBeenCalled()
      expect(mockDelete.eq).toHaveBeenCalledWith('document_id', 'doc-123')
      expect(mockDelete.eq).toHaveBeenCalledWith('type', 'semantic-search')
      expect(mockDelete.eq).toHaveBeenCalledWith('subtype', 'outdated query')
    })
  })
})