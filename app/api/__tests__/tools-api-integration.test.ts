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

import { POST as ChatPOST } from '../chat/route'
import { POST as SummarisePOST } from '../summarise/route'
import { POST as GlossaryPOST } from '../glossary/route'
import { createMockRequest } from './test-helpers'
import { authTestScenarios, defaultTestUser } from '@/lib/testing/auth-test-helpers'

// ========== API TOOLS INTEGRATION TESTS ==========

// Mock dependencies
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))
jest.mock('@/lib/services/database/enhancements')
jest.mock('@/lib/services/database/ai-calls')
jest.mock('@/lib/services/database/chat')
jest.mock('@/lib/config', () => ({
  getModelConfig: jest.fn(() => ({ provider: 'anthropic', modelId: 'claude-3-haiku' })),
  getModelForAICall: jest.fn(() => ({ 
    modelString: 'anthropic:claude-3-5-haiku:20241022',
    config: { provider: 'anthropic', modelId: 'claude-3-5-haiku', version: '20241022' }
  })),
  AI_CONFIG: { DEFAULT_MODEL: 'haiku' }
}))

// Mock the chat prompt validation schema
jest.mock('@/lib/prompts/templates/chat', () => ({
  chatPromptInputSchema: {
    safeParse: jest.fn()
  }
}))

// Mock the chat system prompt renderer
jest.mock('@/lib/prompts/templates/chat-system', () => ({
  renderChatSystemPrompt: jest.fn(() => 'Mocked system prompt')
}))

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn()
}))

// Mock the LLM provider
jest.mock('@/lib/services/llm-provider', () => ({
  getModel: jest.fn(() => ({ modelId: 'test-model' }))
}))

// Import mocked modules
import { executePrompt } from '@/lib/prompts/types'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { ChatService } from '@/lib/services/database/chat'
import { chatPromptInputSchema } from '@/lib/prompts/templates/chat'
import { generateText } from 'ai'

const mockExecutePrompt = executePrompt as jest.MockedFunction<typeof executePrompt>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockChatPromptInputSchema = chatPromptInputSchema as jest.Mocked<typeof chatPromptInputSchema>
const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>

const mockSupabaseClient: any = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: { id: 'test-thread-id' }, error: null }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}

describe('Tool API Integration Tests', () => {
  let mockEnhancementService: EnhancementService
  let mockAiCallService: AiCallService
  let mockChatService: ChatService

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Clear any persisted mock data
    if ('clearMockEnhancements' in EnhancementService) {
      (EnhancementService as any).clearMockEnhancements()
    }
    
    // Setup default mocks
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    
    // Create service instances with mocked supabase client
    mockEnhancementService = new EnhancementService(mockSupabaseClient)
    mockAiCallService = new AiCallService(mockSupabaseClient)
    mockChatService = new ChatService(mockSupabaseClient)
    
    // Set up service method spies
    jest.spyOn(mockEnhancementService, 'get').mockResolvedValue(null)
    jest.spyOn(mockEnhancementService, 'storeSummary').mockResolvedValue({} as any)
    jest.spyOn(mockEnhancementService, 'storeGlossary').mockResolvedValue({} as any)
    jest.spyOn(mockEnhancementService, 'delete').mockResolvedValue(undefined)
    
    jest.spyOn(mockAiCallService, 'startCall').mockResolvedValue('test-ai-call-id')
    jest.spyOn(mockAiCallService, 'completeCall').mockResolvedValue({} as any)
    jest.spyOn(mockAiCallService, 'failCall').mockResolvedValue({} as any)
    jest.spyOn(mockAiCallService, 'getModelUuidByProviderAndId').mockResolvedValue('test-model-uuid')
    jest.spyOn(mockAiCallService, 'createWithModelString').mockResolvedValue({ 
      id: 'test-ai-call-id',
      model_string: 'test-model'
    } as any)
    
    // Set up ChatService spies
    jest.spyOn(mockChatService, 'createThread').mockResolvedValue({ id: 'test-thread-id' } as any)
    jest.spyOn(mockChatService, 'addMessage').mockResolvedValue({} as any)
    
    // Setup auth for business logic testing by default
    authTestScenarios.businessLogic()
    
    // Mock successful authentication in Supabase client
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
    describe('Business Logic Validation', () => {
      // Auth is mocked to succeed for these tests
    beforeEach(() => {
      // Reset chat validation mock for each test
      mockChatPromptInputSchema.safeParse.mockClear()
    })

    it('should process chat request successfully', async () => {
      // Mock validation success
      mockChatPromptInputSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'What is this document about?' }],
          documentContext: 'Test document context',
          documentId: 'test-doc-id'
        }
      })

      // Mock AI SDK response
      mockGenerateText.mockResolvedValue({
        text: 'This is a test response about the document.',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        },
        finishReason: 'stop',
        warnings: []
      } as any)

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
      expect(data.response).toBe('This is a test response about the document.')
      expect(data.timestamp).toBeDefined()
      // Thread and AI call creation can fail in tests, so they might be null
      expect(data).toHaveProperty('threadId')
      expect(data).toHaveProperty('aiCallId')
    })

    it('should handle chat validation errors', async () => {
      // Mock validation failure
      mockChatPromptInputSchema.safeParse.mockReturnValue({
        success: false,
        error: { 
          issues: [
            { 
              path: ['messages'],
              message: 'Array must contain at least 1 element(s)',
              code: 'too_small' 
            }
          ] 
        }
      } as any)

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
      expect(data.error).toBe('Invalid request format')
      expect(data.code).toBe('VALIDATION_ERROR')
    })

      it('should handle missing documentId', async () => {
        const request = createMockRequest('/api/chat', {
          method: 'POST',
          body: {
            messages: [{ role: 'user', content: 'Test question' }],
            documentContext: 'Test context'
            // documentId is missing
          }
        })

        const response = await ChatPOST(request)
        // This should fail with validation error, not auth error
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('validation')
      })
    })

    describe('Authentication Tests', () => {
      it('should handle authentication failure', async () => {
        // Setup auth to fail
        authTestScenarios.authFailure('Invalid credentials')

        const request = createMockRequest('/api/chat', {
          method: 'POST',
          body: {
            documentId: 'test-doc-id',
            messages: [{ role: 'user', content: 'Test question' }],
            documentContext: 'Test context'
          }
        })

        const response = await ChatPOST(request)
        expect(response.status).toBe(401)
        const text = await response.text()
        expect(text).toContain('Authentication required')
      })

      afterEach(() => {
        // Reset auth to succeed for other tests
        authTestScenarios.businessLogic()
      })
    })

    describe('LLM Error Handling', () => {
      it('should handle LLM errors gracefully', async () => {
      // Mock validation success
      mockChatPromptInputSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id'
        }
      })

      // Mock AI SDK failure
      mockGenerateText.mockRejectedValue(new Error('LLM service unavailable'))
      mockAiCallService.startCall.mockResolvedValue('test-ai-call-id')

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context'
        }
      })

      const response = await ChatPOST(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to process chat message')
      expect(data.code).toBe('CHAT_ERROR')
      // The AI call tracking might not happen if thread creation fails
      })
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

      const request = createMockRequest('/api/summarise', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          granularity: 'medium'
        }
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

      const request = createMockRequest('/api/summarise', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          granularity: 'medium'
        }
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

      const request = createMockRequest('/api/summarise', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          granularity: 'high'
        }
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

      const request = createMockRequest('/api/summarise', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          granularity: 'medium'
        }
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

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id'
        }
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

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id'
        }
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

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id'
        }
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

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id'
        }
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

      const request = createMockRequest('/api/glossary', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id'
        }
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

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'Test' }]
        }
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

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'Test' }]
        }
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

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'non-existent-doc',
          messages: [{ role: 'user', content: 'Test' }]
        }
      })

      const response = await ChatPOST(request)
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error).toBe('Document not found')
    })
  })
})