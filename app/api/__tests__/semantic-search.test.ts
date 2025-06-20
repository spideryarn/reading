/**
 * @jest-environment node
 */

/**
 * Tests for semantic search API endpoint
 */

import { testApiRoute } from '@/lib/testing/api-test-utils'
import { createTestUser } from '@/lib/testing/auth-test-utils'
import { getTestNamespace } from '@/lib/testing/test-isolation-utils'
import * as semanticSearchRoute from '../semantic-search/route'
import { createClient } from '@/lib/supabase/server'
import { setupCommonServiceMocks, createMockDocument } from '@/lib/testing/service-mocks'
import { executePromptWithUsage } from '@/lib/prompts/types'
import type { Database } from '@/lib/types/database'

// Mock the external dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/database/documents')
jest.mock('@/lib/services/database/ai-calls') 
jest.mock('@/lib/services/database/enhancements')
jest.mock('@/lib/prompts/types')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
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
  html_content: null,
  metadata: null,
  user_id: null,
  slug: null,
  ai_generated_description: null,
  uploaded_file_path: null,
  uploaded_file_type: null,
  original_filename: null
}

const sampleElements: Database['public']['Tables']['document_elements']['Row'][] = [
  {
    id: 'elem_h1_1',
    document_id: 'doc-123',
    parent_id: null,
    tag_name: 'h1',
    content: 'Introduction to Quantum Physics',
    attributes: {},
    position: 0,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'elem_p_2',
    document_id: 'doc-123',
    parent_id: 'elem_h1_1',
    tag_name: 'p',
    content: 'Quantum mechanics describes the physical properties of nature.',
    attributes: {},
    position: 1,
    level: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

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

describe('/api/semantic-search', () => {
  const namespace = getTestNamespace('semantic-search')
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
    
    const data = await response.json()
    
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
    
    const data = await response.json()
    
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
    
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('documentId is required for semantic search')
  })

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
    
    const data = await response.json()
    
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
    
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Document has no HTML content for semantic analysis')
  })

  it('should handle empty semantic search results', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument)
    mockDocumentService.getElements.mockResolvedValue(sampleElements)
    mockExecutePrompt.mockResolvedValue(JSON.stringify({ matches: [] }))
    
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
    
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.matches).toHaveLength(0)
    expect(data.stats.matchesFound).toBe(0)
  })

  it('should filter out invalid element IDs from LLM response', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument)
    mockDocumentService.getElements.mockResolvedValue(sampleElements)
    
    // LLM returns both valid and invalid element IDs
    const responseWithInvalidIds = JSON.stringify({
      matches: [
        {
          elementId: 'elem_p_2', // Valid
          confidence: 0.9,
          reasoning: 'Valid match',
          relevantText: 'Valid content'
        },
        {
          elementId: 'invalid_id', // Invalid
          confidence: 0.8,
          reasoning: 'Invalid match',
          relevantText: 'Invalid content'
        }
      ]
    })
    mockExecutePrompt.mockResolvedValue(responseWithInvalidIds)
    
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
    
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.matches).toHaveLength(1) // Only valid match
    expect(data.matches[0].elementId).toBe('elem_p_2')
  })

  it('should handle LLM errors gracefully', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument)
    mockDocumentService.getElements.mockResolvedValue(sampleElements)
    mockExecutePrompt.mockRejectedValue(new Error('LLM service unavailable'))
    
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
    
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBe('LLM service unavailable')
  })

  it('should handle malformed JSON from LLM', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument)
    mockDocumentService.getElements.mockResolvedValue(sampleElements)
    mockExecutePrompt.mockResolvedValue('Invalid JSON response')
    
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
    
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toContain('Unexpected token')
  })

  it('should strip markdown code blocks from LLM response', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument)
    mockDocumentService.getElements.mockResolvedValue(sampleElements)
    
    // LLM returns JSON wrapped in markdown code blocks
    const wrappedResponse = '```json\n' + sampleLLMResponse + '\n```'
    mockExecutePrompt.mockResolvedValue(wrappedResponse)
    
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
    
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.matches).toHaveLength(1)
  })
})