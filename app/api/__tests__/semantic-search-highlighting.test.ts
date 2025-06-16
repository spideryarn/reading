/**
 * @jest-environment node
 */

// Mock auth modules first, before any imports
jest.mock('@/lib/auth/server-auth', () => ({
  getUser: jest.fn(),
  validateAuth: jest.fn(),
  getUserId: jest.fn(),
  checkAdminAccess: jest.fn(),
  getSession: jest.fn()
}))

// Mock the external dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/database/documents')
jest.mock('@/lib/services/database/ai-calls')
jest.mock('@/lib/services/database/enhancements')
jest.mock('@/lib/prompts/types')

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

jest.mock('@/lib/services/document-parser')
jest.mock('@/lib/config', () => ({
  getModelForAICall: jest.fn(() => ({ 
    modelString: 'anthropic:claude-3-5-haiku:20241022',
    config: { provider: 'anthropic', modelId: 'claude-3-5-haiku', version: '20241022' }
  }))
}))

jest.mock('@/lib/utils/semantic-search', () => ({
  normalizeSemanticSearchQuery: jest.fn((query) => query.toLowerCase().trim())
}))

jest.mock('@/lib/services/semantic-search-formatter', () => ({
  formatDocumentForSemanticSearch: jest.fn(),
  validateSemanticSearchElementIds: jest.fn((matches) => matches),
  getDocumentStats: jest.fn(() => ({ totalElements: 10, searchableElements: 8 })),
  estimateTokenCount: jest.fn(() => 1500)
}))

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

// Import route and helpers AFTER all mocks are set up
import { POST } from '../semantic-search/route'
import { createMockRequest } from './test-helpers'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { executePromptWithUsage } from '@/lib/prompts/types'
import type { MockSupabaseClient } from './test-types'
import type { Database } from '@/lib/types/database'
import { authTestScenarios } from '@/lib/testing/auth-test-helpers'
import { semanticSearchApiInputSchema, semanticSearchResponseSchema } from '@/lib/prompts/templates/semantic-search'
import { formatDocumentForSemanticSearch } from '@/lib/services/semantic-search-formatter'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockExecutePromptWithUsage = executePromptWithUsage as jest.MockedFunction<typeof executePromptWithUsage>

describe('Semantic Search - Highlighting Accuracy Tests', () => {
  let mockDocumentService: DocumentService
  let mockAiCallService: AiCallService
  let mockEnhancementService: EnhancementService
  let mockSupabase: MockSupabaseClient

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up auth mock - default to authenticated user
    authTestScenarios.businessLogic()
    
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
    jest.spyOn(mockDocumentService, 'getById').mockResolvedValue(null)
    jest.spyOn(mockAiCallService, 'startCall').mockResolvedValue({ id: 'ai-call-123' } as any)
    jest.spyOn(mockAiCallService, 'completeCall').mockResolvedValue(undefined as any)
    jest.spyOn(mockEnhancementService, 'get').mockResolvedValue(null)
    jest.spyOn(mockEnhancementService, 'upsert').mockResolvedValue({} as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Exact Match Highlighting', () => {
    it('should accurately highlight exact phrase matches', async () => {
      const document: Database['public']['Tables']['documents']['Row'] = {
        id: 'doc-123',
        title: 'Machine Learning Fundamentals',
        html_content: `
          <h1>Introduction to Machine Learning</h1>
          <p id="p1">Machine learning is a subset of artificial intelligence that enables systems to learn from data.</p>
          <p id="p2">Deep learning is a type of machine learning based on neural networks.</p>
          <p id="p3">Traditional programming differs from machine learning approaches.</p>
        `,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: null,
        source_url: null,
        source_type: null,
        metadata: null,
        user_id: null,
        slug: null,
        ai_generated_description: null,
        uploaded_file_path: null,
        uploaded_file_type: null,
        original_filename: null
      }

      jest.spyOn(mockDocumentService, 'getById').mockResolvedValue(document)
      
      // Mock formatDocumentForSemanticSearch
      ;(formatDocumentForSemanticSearch as jest.Mock).mockReturnValue({
        elements: [
          { id: 'p1', text: 'Machine learning is a subset of artificial intelligence that enables systems to learn from data.' },
          { id: 'p2', text: 'Deep learning is a type of machine learning based on neural networks.' },
          { id: 'p3', text: 'Traditional programming differs from machine learning approaches.' }
        ]
      })

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

      ;(semanticSearchApiInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { query: 'machine learning', documentId: 'doc-123' }
      })

      ;(semanticSearchResponseSchema.parse as jest.Mock).mockReturnValue({
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
      })

      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: { query: 'machine learning', documentId: 'doc-123' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
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
      const document: Database['public']['Tables']['documents']['Row'] = {
        id: 'doc-123',
        title: 'AI Concepts',
        html_content: `
          <p id="p1">ARTIFICIAL INTELLIGENCE is transforming industries.</p>
          <p id="p2">Artificial Intelligence applications are diverse.</p>
          <p id="p3">The field of artificial intelligence continues to grow.</p>
        `,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: null,
        source_url: null,
        source_type: null,
        metadata: null,
        user_id: null,
        slug: null,
        ai_generated_description: null,
        uploaded_file_path: null,
        uploaded_file_type: null,
        original_filename: null
      }

      jest.spyOn(mockDocumentService, 'getById').mockResolvedValue(document)
      
      ;(formatDocumentForSemanticSearch as jest.Mock).mockReturnValue({
        elements: [
          { id: 'p1', text: 'ARTIFICIAL INTELLIGENCE is transforming industries.' },
          { id: 'p2', text: 'Artificial Intelligence applications are diverse.' },
          { id: 'p3', text: 'The field of artificial intelligence continues to grow.' }
        ]
      })

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

      ;(semanticSearchApiInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { query: 'artificial intelligence', documentId: 'doc-123' }
      })

      ;(semanticSearchResponseSchema.parse as jest.Mock).mockReturnValue({
        matches: [
          { elementId: 'p1', confidence: 0.9, reasoning: 'Uppercase match', relevantText: 'ARTIFICIAL INTELLIGENCE' },
          { elementId: 'p2', confidence: 0.9, reasoning: 'Title case match', relevantText: 'Artificial Intelligence' },
          { elementId: 'p3', confidence: 0.9, reasoning: 'Lowercase match', relevantText: 'artificial intelligence' }
        ]
      })

      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: { query: 'artificial intelligence', documentId: 'doc-123' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.matches).toHaveLength(3)
      // All matches should have equal confidence for case variations
      expect(data.matches[0].confidence).toBe(data.matches[1].confidence)
      expect(data.matches[1].confidence).toBe(data.matches[2].confidence)
    })
  })

  describe('Semantic Match Highlighting', () => {
    it('should highlight semantically related content', async () => {
      const document: Database['public']['Tables']['documents']['Row'] = {
        id: 'doc-123',
        title: 'AI and ML Guide',
        html_content: `
          <p id="p1">Neural networks form the foundation of deep learning systems.</p>
          <p id="p2">Supervised learning requires labeled training data.</p>
          <p id="p3">Classification algorithms predict discrete categories.</p>
          <p id="p4">Regression models predict continuous values.</p>
        `,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: null,
        source_url: null,
        source_type: null,
        metadata: null,
        user_id: null,
        slug: null,
        ai_generated_description: null,
        uploaded_file_path: null,
        uploaded_file_type: null,
        original_filename: null
      }

      jest.spyOn(mockDocumentService, 'getById').mockResolvedValue(document)
      
      ;(formatDocumentForSemanticSearch as jest.Mock).mockReturnValue({
        elements: [
          { id: 'p1', text: 'Neural networks form the foundation of deep learning systems.' },
          { id: 'p2', text: 'Supervised learning requires labeled training data.' },
          { id: 'p3', text: 'Classification algorithms predict discrete categories.' },
          { id: 'p4', text: 'Regression models predict continuous values.' }
        ]
      })

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
            },
            {
              elementId: 'p4',
              confidence: 0.68,
              reasoning: 'Regression models are a type of AI model',
              relevantText: 'Regression models predict continuous values'
            }
          ]
        }),
        usage: { promptTokens: 400, completionTokens: 120, totalTokens: 520 },
        finishReason: 'stop'
      })

      ;(semanticSearchApiInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { query: 'AI models', documentId: 'doc-123' }
      })

      ;(semanticSearchResponseSchema.parse as jest.Mock).mockReturnValue({
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
          },
          {
            elementId: 'p4',
            confidence: 0.68,
            reasoning: 'Regression models are a type of AI model',
            relevantText: 'Regression models predict continuous values'
          }
        ]
      })

      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: { query: 'AI models', documentId: 'doc-123' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.matches).toHaveLength(3)
      
      // Verify semantic matches don't necessarily contain the exact query
      const match1 = data.matches.find((m: any) => m.elementId === 'p1')
      expect(match1.relevantText).not.toContain('AI models')
      expect(match1.reasoning).toContain('Neural networks are a type of AI model')
    })

    it('should handle synonym matching', async () => {
      const document: Database['public']['Tables']['documents']['Row'] = {
        id: 'doc-123',
        title: 'Computing Concepts',
        html_content: `
          <p id="p1">Computers process information using algorithms.</p>
          <p id="p2">These machines execute instructions sequentially.</p>
          <p id="p3">Digital devices store data in binary format.</p>
        `,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: null,
        source_url: null,
        source_type: null,
        metadata: null,
        user_id: null,
        slug: null,
        ai_generated_description: null,
        uploaded_file_path: null,
        uploaded_file_type: null,
        original_filename: null
      }

      jest.spyOn(mockDocumentService, 'getById').mockResolvedValue(document)
      
      ;(formatDocumentForSemanticSearch as jest.Mock).mockReturnValue({
        elements: [
          { id: 'p1', text: 'Computers process information using algorithms.' },
          { id: 'p2', text: 'These machines execute instructions sequentially.' },
          { id: 'p3', text: 'Digital devices store data in binary format.' }
        ]
      })

      // Query for "computers" should match synonyms like "machines" and "devices"
      mockExecutePromptWithUsage.mockResolvedValue({
        text: JSON.stringify({
          matches: [
            {
              elementId: 'p1',
              confidence: 0.95,
              reasoning: 'Direct match: contains "computers"',
              relevantText: 'Computers process information'
            },
            {
              elementId: 'p2',
              confidence: 0.80,
              reasoning: 'Synonym match: "machines" refers to computers',
              relevantText: 'These machines execute instructions'
            },
            {
              elementId: 'p3',
              confidence: 0.75,
              reasoning: 'Related concept: "digital devices" includes computers',
              relevantText: 'Digital devices store data'
            }
          ]
        }),
        usage: { promptTokens: 350, completionTokens: 110, totalTokens: 460 },
        finishReason: 'stop'
      })

      ;(semanticSearchApiInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { query: 'computers', documentId: 'doc-123' }
      })

      ;(semanticSearchResponseSchema.parse as jest.Mock).mockReturnValue({
        matches: [
          {
            elementId: 'p1',
            confidence: 0.95,
            reasoning: 'Direct match: contains "computers"',
            relevantText: 'Computers process information'
          },
          {
            elementId: 'p2',
            confidence: 0.80,
            reasoning: 'Synonym match: "machines" refers to computers',
            relevantText: 'These machines execute instructions'
          },
          {
            elementId: 'p3',
            confidence: 0.75,
            reasoning: 'Related concept: "digital devices" includes computers',
            relevantText: 'Digital devices store data'
          }
        ]
      })

      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: { query: 'computers', documentId: 'doc-123' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.matches).toHaveLength(3)
      
      // Verify synonym matching
      const synonymMatch = data.matches.find((m: any) => m.elementId === 'p2')
      expect(synonymMatch.reasoning).toContain('machines')
      expect(synonymMatch.confidence).toBeLessThan(0.95) // Lower than exact match
    })
  })

  describe('Edge Cases and Accuracy', () => {
    it('should handle overlapping matches correctly', async () => {
      const document: Database['public']['Tables']['documents']['Row'] = {
        id: 'doc-123',
        title: 'Overlapping Content',
        html_content: `
          <p id="p1">Machine learning and deep learning are related fields.</p>
          <p id="p2">Deep learning is a subset of machine learning.</p>
        `,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: null,
        source_url: null,
        source_type: null,
        metadata: null,
        user_id: null,
        slug: null,
        ai_generated_description: null,
        uploaded_file_path: null,
        uploaded_file_type: null,
        original_filename: null
      }

      jest.spyOn(mockDocumentService, 'getById').mockResolvedValue(document)
      
      ;(formatDocumentForSemanticSearch as jest.Mock).mockReturnValue({
        elements: [
          { id: 'p1', text: 'Machine learning and deep learning are related fields.' },
          { id: 'p2', text: 'Deep learning is a subset of machine learning.' }
        ]
      })

      // Query for both terms should highlight both occurrences
      mockExecutePromptWithUsage.mockResolvedValue({
        text: JSON.stringify({
          matches: [
            {
              elementId: 'p1',
              confidence: 0.90,
              reasoning: 'Contains both search terms',
              relevantText: 'Machine learning and deep learning'
            },
            {
              elementId: 'p2',
              confidence: 0.92,
              reasoning: 'Contains both terms with relationship context',
              relevantText: 'Deep learning is a subset of machine learning'
            }
          ]
        }),
        usage: { promptTokens: 300, completionTokens: 80, totalTokens: 380 },
        finishReason: 'stop'
      })

      ;(semanticSearchApiInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { query: 'machine learning deep learning', documentId: 'doc-123' }
      })

      ;(semanticSearchResponseSchema.parse as jest.Mock).mockReturnValue({
        matches: [
          {
            elementId: 'p1',
            confidence: 0.90,
            reasoning: 'Contains both search terms',
            relevantText: 'Machine learning and deep learning'
          },
          {
            elementId: 'p2',
            confidence: 0.92,
            reasoning: 'Contains both terms with relationship context',
            relevantText: 'Deep learning is a subset of machine learning'
          }
        ]
      })

      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: { query: 'machine learning deep learning', documentId: 'doc-123' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.matches).toHaveLength(2)
      
      // Both paragraphs should be matched
      const matchedIds = data.matches.map((m: any) => m.elementId)
      expect(matchedIds).toContain('p1')
      expect(matchedIds).toContain('p2')
    })

    it('should filter out low-confidence matches', async () => {
      const document: Database['public']['Tables']['documents']['Row'] = {
        id: 'doc-123',
        title: 'Various Topics',
        html_content: `
          <p id="p1">The weather today is sunny.</p>
          <p id="p2">Machine learning revolutionizes data analysis.</p>
          <p id="p3">Cooking requires patience and practice.</p>
        `,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: null,
        source_url: null,
        source_type: null,
        metadata: null,
        user_id: null,
        slug: null,
        ai_generated_description: null,
        uploaded_file_path: null,
        uploaded_file_type: null,
        original_filename: null
      }

      jest.spyOn(mockDocumentService, 'getById').mockResolvedValue(document)
      
      ;(formatDocumentForSemanticSearch as jest.Mock).mockReturnValue({
        elements: [
          { id: 'p1', text: 'The weather today is sunny.' },
          { id: 'p2', text: 'Machine learning revolutionizes data analysis.' },
          { id: 'p3', text: 'Cooking requires patience and practice.' }
        ]
      })

      // Only return high-confidence matches
      mockExecutePromptWithUsage.mockResolvedValue({
        text: JSON.stringify({
          matches: [
            {
              elementId: 'p2',
              confidence: 0.95,
              reasoning: 'Direct match for machine learning',
              relevantText: 'Machine learning revolutionizes data analysis'
            }
            // Low confidence matches for p1 and p3 are filtered out
          ]
        }),
        usage: { promptTokens: 250, completionTokens: 60, totalTokens: 310 },
        finishReason: 'stop'
      })

      ;(semanticSearchApiInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { query: 'machine learning', documentId: 'doc-123' }
      })

      ;(semanticSearchResponseSchema.parse as jest.Mock).mockReturnValue({
        matches: [
          {
            elementId: 'p2',
            confidence: 0.95,
            reasoning: 'Direct match for machine learning',
            relevantText: 'Machine learning revolutionizes data analysis'
          }
        ]
      })

      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: { query: 'machine learning', documentId: 'doc-123' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.matches).toHaveLength(1)
      expect(data.matches[0].elementId).toBe('p2')
      expect(data.matches[0].confidence).toBeGreaterThan(0.9)
    })

    it('should handle special characters in queries', async () => {
      const document: Database['public']['Tables']['documents']['Row'] = {
        id: 'doc-123',
        title: 'Programming Languages',
        html_content: `
          <p id="p1">C++ is a powerful object-oriented language.</p>
          <p id="p2">The .NET framework supports multiple languages.</p>
          <p id="p3">Regular expressions use special characters like * and +.</p>
        `,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: null,
        source_url: null,
        source_type: null,
        metadata: null,
        user_id: null,
        slug: null,
        ai_generated_description: null,
        uploaded_file_path: null,
        uploaded_file_type: null,
        original_filename: null
      }

      jest.spyOn(mockDocumentService, 'getById').mockResolvedValue(document)
      
      ;(formatDocumentForSemanticSearch as jest.Mock).mockReturnValue({
        elements: [
          { id: 'p1', text: 'C++ is a powerful object-oriented language.' },
          { id: 'p2', text: 'The .NET framework supports multiple languages.' },
          { id: 'p3', text: 'Regular expressions use special characters like * and +.' }
        ]
      })

      mockExecutePromptWithUsage.mockResolvedValue({
        text: JSON.stringify({
          matches: [
            {
              elementId: 'p1',
              confidence: 0.95,
              reasoning: 'Exact match for C++',
              relevantText: 'C++ is a powerful'
            }
          ]
        }),
        usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250 },
        finishReason: 'stop'
      })

      ;(semanticSearchApiInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: { query: 'C++', documentId: 'doc-123' }
      })

      ;(semanticSearchResponseSchema.parse as jest.Mock).mockReturnValue({
        matches: [
          {
            elementId: 'p1',
            confidence: 0.95,
            reasoning: 'Exact match for C++',
            relevantText: 'C++ is a powerful'
          }
        ]
      })

      const request = createMockRequest('http://localhost:3000/api/semantic-search', {
        method: 'POST',
        body: { query: 'C++', documentId: 'doc-123' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.matches).toHaveLength(1)
      expect(data.matches[0].relevantText).toContain('C++')
    })
  })
})