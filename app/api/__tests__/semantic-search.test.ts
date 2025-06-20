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
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { executePrompt } from '@/lib/prompts/types'
import type { MockSupabaseClient, MockDocumentService, MockAiCallService, MockAiCall } from './test-types'
import type { Database } from '@/lib/types/database'

// Mock the external dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/database/documents')
jest.mock('@/lib/services/database/ai-calls') 
jest.mock('@/lib/prompts/types')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const MockDocumentService = DocumentService as jest.MockedClass<typeof DocumentService>
const MockAiCallService = AiCallService as jest.MockedClass<typeof AiCallService>
const mockExecutePrompt = executePrompt as jest.MockedFunction<typeof executePrompt>

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
  
  let mockDocumentService: MockDocumentService
  let mockAiCallService: MockAiCallService
  let mockSupabase: MockSupabaseClient

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock Supabase client
    mockSupabase = {}
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
    
    // Mock successful LLM response by default
    mockExecutePrompt.mockResolvedValue(sampleLLMResponse)
    
    // Mock AI call tracking
    mockAiCallService.startCall.mockResolvedValue({ id: 'ai-call-123' } as MockAiCall)
    mockAiCallService.completeCall.mockResolvedValue(undefined)
  })

  it('should process valid semantic search request successfully', async () => {
    // Setup mocks
    mockDocumentService.getById.mockResolvedValue(sampleDocument)
    mockDocumentService.getElements.mockResolvedValue(sampleElements)
    
    // Execute
    const response = await testApiRoute({
      handler: POST,
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
    expect(data.aiCallId).toBe('ai-call-123')
  })

  it('should reject request with missing query', async () => {
    const response = await testApiRoute({
      handler: POST,
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
      handler: POST,
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
    mockDocumentService.getById.mockResolvedValue(null)
    
    const response = await testApiRoute({
      handler: POST,
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

  it('should return 404 for document with no elements', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument)
    mockDocumentService.getElements.mockResolvedValue([])
    
    const response = await testApiRoute({
      handler: POST,
      url: '/api/semantic-search',
      method: 'POST',
      body: {
        query: 'test query',
        documentId: 'doc-123'
      },
      user: testUser
    })
    
    const data = await response.json()
    
    expect(response.status).toBe(404)
    expect(data.error).toBe('No document elements found')
  })

  it('should handle empty semantic search results', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument)
    mockDocumentService.getElements.mockResolvedValue(sampleElements)
    mockExecutePrompt.mockResolvedValue(JSON.stringify({ matches: [] }))
    
    const response = await testApiRoute({
      handler: POST,
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
      handler: POST,
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
      handler: POST,
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
      handler: POST,
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
      handler: POST,
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