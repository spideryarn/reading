/**
 * @jest-environment node
 */
import { POST as ChatPOST } from '../chat/route'
import { POST as SummarisePOST } from '../summarise/route'
import { POST as GlossaryPOST } from '../glossary/route'
import { createMockRequest } from './test-helpers'

// ========== API TOOLS INTEGRATION TESTS ==========

// Mock dependencies
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))
jest.mock('@/lib/services/database/enhancements')
jest.mock('@/lib/services/database/ai-calls')
jest.mock('@/lib/config', () => ({
  getModelConfig: jest.fn(() => ({ provider: 'anthropic', modelId: 'claude-3-haiku' })),
  AI_CONFIG: { DEFAULT_MODEL: 'haiku' }
}))

// Import mocked modules
import { executePrompt } from '@/lib/prompts/types'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'

const mockExecutePrompt = executePrompt as jest.MockedFunction<typeof executePrompt>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// Mock services
const mockEnhancementService = {
  get: jest.fn(),
  storeSummary: jest.fn(),
  storeGlossary: jest.fn(),
  delete: jest.fn()
}

const mockAiCallService = {
  startCall: jest.fn(),
  completeCall: jest.fn(),
  failCall: jest.fn()
}

const mockSupabaseClient: any = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  }))
}

describe('Tool API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    ;(EnhancementService as jest.Mock).mockImplementation(() => mockEnhancementService)
    ;(AiCallService as jest.Mock).mockImplementation(() => mockAiCallService)
    
    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    })
    
    // Mock document lookup
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'test-doc-id',
              title: 'Test Document',
              content: '<h1>Test</h1><p>Test content</p>',
              user_id: 'test-user-id'
            },
            error: null
          })
        })
      })
    })
  })

  // ========== CHAT API TESTS ==========
  describe('Chat API', () => {
    beforeEach(() => {
      // Mock chat prompt validation
      jest.mock('@/lib/prompts/templates/chat', () => ({
        chatPromptInputSchema: {
          safeParse: jest.fn(() => ({
            success: true,
            data: {
              messages: [{ role: 'user', content: 'Test question' }],
              documentContext: 'Test document context'
            }
          }))
        }
      }))
    })

    it('should process chat request successfully', async () => {
      // Mock LLM response
      mockExecutePrompt.mockResolvedValue({
        text: 'This is a test response about the document.',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Mock AI call tracking
      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'What is this document about?' }],
          documentContext: 'Test document context'
        }
      })

      const response = await ChatPOST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.message).toBe('This is a test response about the document.')
      expect(data.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      })
    })

    it('should handle chat validation errors', async () => {
      const chatPromptInputSchema = jest.requireMock('@/lib/prompts/templates/chat').chatPromptInputSchema
      chatPromptInputSchema.safeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: 'Invalid input' }] }
      })

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [],
          documentContext: ''
        }
      })

      const response = await ChatPOST(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Request validation failed')
    })

    it('should handle LLM errors gracefully', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('LLM service unavailable'))
      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id',
        messages: [{ role: 'user', content: 'Test question' }],
        documentContext: 'Test context'
      })

      const response = await ChatPOST(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to process chat message')
      expect(mockAiCallService.failCall).toHaveBeenCalledWith('test-ai-call-id', 'LLM service unavailable')
    })
  })

  // ========== SUMMARISE API TESTS ==========
  describe('Summarise API', () => {
    beforeEach(() => {
      // Mock summarise template
      jest.mock('@/lib/prompts/templates/summarise', () => ({
        ...jest.requireActual('@/lib/prompts/templates/summarise'),
        summarisePrompt: {
          name: 'summarise',
          description: 'Test summarise prompt',
          schema: {},
          templatePath: 'test.njk',
          modelConfig: { maxTokens: 200 }
        }
      }))
    })

    it('should generate summary successfully', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: 'This document discusses artificial intelligence and machine learning concepts.',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 }
      })

      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')
      mockEnhancementService.get.mockResolvedValue(null) // No cached summary

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id',
        granularity: 'medium'
      })

      const response = await SummarisePOST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.summary).toBe('This document discusses artificial intelligence and machine learning concepts.')
      expect(data.granularity).toBe('medium')
      expect(data.usage).toEqual({
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300
      })

      // Should store summary
      expect(mockEnhancementService.storeSummary).toHaveBeenCalledWith(
        'test-doc-id',
        'medium',
        expect.objectContaining({
          summary: 'This document discusses artificial intelligence and machine learning concepts.'
        })
      )
    })

    it('should return cached summary when available', async () => {
      const cachedSummary = {
        summary: 'Cached summary content',
        granularity: 'medium',
        cached: true
      }

      mockEnhancementService.get.mockResolvedValue(cachedSummary)

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id',
        granularity: 'medium'
      })

      const response = await SummarisePOST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual(cachedSummary)
      expect(mockExecutePrompt).not.toHaveBeenCalled()
    })

    it('should handle different granularity levels', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: 'Brief summary for high granularity',
        usage: { promptTokens: 150, completionTokens: 50, totalTokens: 200 }
      })

      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')
      mockEnhancementService.get.mockResolvedValue(null)

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id',
        granularity: 'high'
      })

      const response = await SummarisePOST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.granularity).toBe('high')
      expect(data.summary).toBe('Brief summary for high granularity')
    })

    it('should handle summarise errors', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('Document too long for summarisation'))
      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')
      mockEnhancementService.get.mockResolvedValue(null)

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id',
        granularity: 'medium'
      })

      const response = await SummarisePOST(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to generate summary')
      expect(mockAiCallService.failCall).toHaveBeenCalledWith(
        'test-ai-call-id',
        'Document too long for summarisation'
      )
    })
  })

  // ========== GLOSSARY API TESTS ==========
  describe('Glossary API', () => {
    beforeEach(() => {
      // Mock glossary template
      jest.mock('@/lib/prompts/templates/glossary', () => ({
        glossaryPrompt: {
          name: 'glossary',
          description: 'Test glossary prompt',
          schema: {},
          templatePath: 'test.njk',
          modelConfig: { maxTokens: 400 }
        }
      }))
    })

    it('should generate glossary successfully', async () => {
      const mockGlossaryResponse = {
        entities: [
          {
            name: 'Artificial Intelligence',
            ontology: 'concept',
            aliases: ['AI'],
            brief_explanation: 'The simulation of human intelligence processes by machines.'
          },
          {
            name: 'Machine Learning',
            ontology: 'concept',
            aliases: ['ML'],
            brief_explanation: 'A method of data analysis that automates analytical model building.'
          }
        ]
      }

      mockExecutePrompt.mockResolvedValue({
        text: JSON.stringify(mockGlossaryResponse),
        usage: { promptTokens: 300, completionTokens: 200, totalTokens: 500 }
      })

      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')
      mockEnhancementService.get.mockResolvedValue(null) // No cached glossary

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id'
      })

      const response = await GlossaryPOST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.entities).toHaveLength(2)
      expect(data.entities[0].name).toBe('Artificial Intelligence')
      expect(data.entities[1].name).toBe('Machine Learning')
      expect(data.usage).toEqual({
        promptTokens: 300,
        completionTokens: 200,
        totalTokens: 500
      })

      // Should store glossary
      expect(mockEnhancementService.storeGlossary).toHaveBeenCalledWith(
        'test-doc-id',
        expect.objectContaining({
          entities: mockGlossaryResponse.entities
        })
      )
    })

    it('should return cached glossary when available', async () => {
      const cachedGlossary = {
        entities: [
          {
            name: 'Cached Entity',
            ontology: 'concept',
            aliases: [],
            brief_explanation: 'A cached glossary entry.'
          }
        ],
        cached: true
      }

      mockEnhancementService.get.mockResolvedValue(cachedGlossary)

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id'
      })

      const response = await GlossaryPOST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual(cachedGlossary)
      expect(mockExecutePrompt).not.toHaveBeenCalled()
    })

    it('should handle empty glossary results', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: JSON.stringify({ entities: [] }),
        usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250 }
      })

      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')
      mockEnhancementService.get.mockResolvedValue(null)

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id'
      })

      const response = await GlossaryPOST(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.entities).toEqual([])
    })

    it('should handle malformed glossary JSON', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: 'Invalid JSON response',
        usage: { promptTokens: 100, completionTokens: 25, totalTokens: 125 }
      })

      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')
      mockEnhancementService.get.mockResolvedValue(null)

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id'
      })

      const response = await GlossaryPOST(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to generate glossary')
      expect(mockAiCallService.failCall).toHaveBeenCalled()
    })

    it('should handle glossary generation errors', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('Token limit exceeded'))
      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')
      mockEnhancementService.get.mockResolvedValue(null)

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id'
      })

      const response = await GlossaryPOST(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to generate glossary')
      expect(mockAiCallService.failCall).toHaveBeenCalledWith(
        'test-ai-call-id',
        'Token limit exceeded'
      )
    })
  })

  // ========== AUTHENTICATION & AUTHORIZATION TESTS ==========
  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id',
        messages: [{ role: 'user', content: 'Test' }]
      })

      const response = await ChatPOST(request)
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('User not authenticated')
    })

    it('should reject requests for documents not owned by user', async () => {
      // Mock document owned by different user
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-doc-id',
                title: 'Test Document',
                content: '<h1>Test</h1>',
                user_id: 'different-user-id'
              },
              error: null
            })
          })
        })
      })

      const request = createMockRequest('POST', {
        documentId: 'test-doc-id',
        messages: [{ role: 'user', content: 'Test' }]
      })

      const response = await ChatPOST(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toBe('Access denied to this document')
    })

    it('should handle missing documents', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // Not found
            })
          })
        })
      })

      const request = createMockRequest('POST', {
        documentId: 'non-existent-doc',
        messages: [{ role: 'user', content: 'Test' }]
      })

      const response = await ChatPOST(request)
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error).toBe('Document not found')
    })
  })
})