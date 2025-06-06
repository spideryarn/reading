/**
 * Tests for semantic search API endpoint
 */

import { POST } from '../semantic-search/route'
import { createMockRequest } from './test-helpers'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { executePrompt } from '@/lib/prompts/types'

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
const sampleDocument = {
  id: 'doc-123',
  title: 'Test Document',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

const sampleElements = [
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
  let mockDocumentService: jest.Mocked<DocumentService>
  let mockAiCallService: jest.Mocked<AiCallService>
  let mockSupabase: any

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
    } as any
    MockDocumentService.mockImplementation(() => mockDocumentService)
    
    // Mock AiCallService  
    mockAiCallService = {
      startCall: jest.fn(),
      completeCall: jest.fn(),
    } as any
    MockAiCallService.mockImplementation(() => mockAiCallService)
    
    // Mock successful LLM response by default
    mockExecutePrompt.mockResolvedValue(sampleLLMResponse)
    
    // Mock AI call tracking
    mockAiCallService.startCall.mockResolvedValue({ id: 'ai-call-123' } as any)
    mockAiCallService.completeCall.mockResolvedValue(undefined)
  })

  it('should process valid semantic search request successfully', async () => {
    // Setup mocks
    mockDocumentService.getById.mockResolvedValue(sampleDocument as any)
    mockDocumentService.getElements.mockResolvedValue(sampleElements as any)
    
    // Create request
    const request = createMockRequest('http://localhost:3000/api/semantic-search', {
      method: 'POST',
      body: {
        query: 'quantum physics',
        documentId: 'doc-123'
      }
    })
    
    // Execute
    const response = await POST(request)
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
    const request = createMockRequest('http://localhost:3000/api/semantic-search', {
      method: 'POST',
      body: {
        documentId: 'doc-123'
        // missing query
      }
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request body')
  })

  it('should reject request with missing documentId', async () => {
    const request = createMockRequest('http://localhost:3000/api/semantic-search', {
      method: 'POST',
      body: {
        query: 'quantum physics'
        // missing documentId
      }
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(400)
    expect(data.error).toBe('documentId is required for semantic search')
  })

  it('should return 404 for non-existent document', async () => {
    mockDocumentService.getById.mockResolvedValue(null)
    
    const request = createMockRequest('http://localhost:3000/api/semantic-search', {
      method: 'POST',
      body: {
        query: 'test query',
        documentId: 'nonexistent-doc'
      }
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(404)
    expect(data.error).toBe('Document not found')
  })

  it('should return 404 for document with no elements', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument as any)
    mockDocumentService.getElements.mockResolvedValue([])
    
    const request = createMockRequest('http://localhost:3000/api/semantic-search', {
      method: 'POST',
      body: {
        query: 'test query',
        documentId: 'doc-123'
      }
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(404)
    expect(data.error).toBe('No document elements found')
  })

  it('should handle empty semantic search results', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument as any)
    mockDocumentService.getElements.mockResolvedValue(sampleElements as any)
    mockExecutePrompt.mockResolvedValue(JSON.stringify({ matches: [] }))
    
    const request = createMockRequest('http://localhost:3000/api/semantic-search', {
      method: 'POST',
      body: {
        query: 'irrelevant query',
        documentId: 'doc-123'
      }
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.matches).toHaveLength(0)
    expect(data.stats.matchesFound).toBe(0)
  })

  it('should filter out invalid element IDs from LLM response', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument as any)
    mockDocumentService.getElements.mockResolvedValue(sampleElements as any)
    
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
    expect(data.matches).toHaveLength(1) // Only valid match
    expect(data.matches[0].elementId).toBe('elem_p_2')
  })

  it('should handle LLM errors gracefully', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument as any)
    mockDocumentService.getElements.mockResolvedValue(sampleElements as any)
    mockExecutePrompt.mockRejectedValue(new Error('LLM service unavailable'))
    
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
    expect(data.error).toBe('LLM service unavailable')
  })

  it('should handle malformed JSON from LLM', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument as any)
    mockDocumentService.getElements.mockResolvedValue(sampleElements as any)
    mockExecutePrompt.mockResolvedValue('Invalid JSON response')
    
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
    expect(data.error).toContain('Unexpected token')
  })

  it('should strip markdown code blocks from LLM response', async () => {
    mockDocumentService.getById.mockResolvedValue(sampleDocument as any)
    mockDocumentService.getElements.mockResolvedValue(sampleElements as any)
    
    // LLM returns JSON wrapped in markdown code blocks
    const wrappedResponse = '```json\n' + sampleLLMResponse + '\n```'
    mockExecutePrompt.mockResolvedValue(wrappedResponse)
    
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
    expect(data.matches).toHaveLength(1)
  })
})