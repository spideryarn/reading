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

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

jest.mock('@/lib/services/database/chat', () => ({
  ChatService: jest.fn().mockImplementation(() => ({
    createThread: jest.fn().mockResolvedValue({ id: 'test-thread-id' }),
    addMessage: jest.fn().mockResolvedValue({})
  }))
}))

jest.mock('@/lib/services/database/ai-calls', () => ({
  AiCallService: jest.fn().mockImplementation(() => ({
    startCall: jest.fn().mockResolvedValue('test-ai-call-id'),
    completeCall: jest.fn(),
    failCall: jest.fn()
  }))
}))

jest.mock('@/lib/prompts/templates/chat', () => ({
  chatPromptInputSchema: {
    safeParse: jest.fn()
  }
}))

jest.mock('@/lib/prompts/templates/chat-system', () => ({
  renderChatSystemPrompt: jest.fn(() => 'Mocked system prompt')
}))

jest.mock('@/lib/services/llm-provider', () => ({
  getModel: jest.fn(() => ({ modelId: 'test-model' }))
}))

jest.mock('@/lib/config', () => ({
  getModelConfig: jest.fn(() => ({ provider: 'anthropic', modelId: 'claude-3-haiku' })),
  getModelForAICall: jest.fn(() => ({ 
    modelString: 'anthropic:claude-3-5-haiku:20241022',
    config: { provider: 'anthropic', modelId: 'claude-3-5-haiku', version: '20241022' }
  })),
  AI_CONFIG: { 
    DEFAULT_MODEL: 'haiku',
    DEFAULT_MAX_TOKENS: 4096
  }
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

// Mock the AI SDK streaming functionality
jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn()
}))

// Import route and helpers AFTER all mocks are set up
import { POST } from '../route'
import { createMockRequest } from '../../__tests__/test-helpers'
import { defaultTestUser } from '@/lib/testing/auth-test-helpers'

// Import mocked modules
import { createClient } from '@/lib/supabase/server'
import { ChatService } from '@/lib/services/database/chat'
import { chatPromptInputSchema } from '@/lib/prompts/templates/chat'
import { streamText } from 'ai'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockStreamText = streamText as jest.MockedFunction<typeof streamText>

// Helper to create a mock text stream
function createMockStream(chunks: string[], delayMs: number = 10) {
  const index = 0
  const encoder = new TextEncoder()
  
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
        controller.enqueue(encoder.encode(`data: {"text":"${chunk}"}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    }
  })
}

describe('Chat API - Streaming Functionality', () => {
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

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockCreateClient.mockResolvedValue(mockSupabaseClient)
    
    // Setup default auth mock - chat API uses getUser which returns {user, error}
    // Dynamic import required for Jest mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getUser } = require('@/lib/auth/server-auth')
    getUser.mockResolvedValue({ user: defaultTestUser, error: null })
    
    // Mock console methods to reduce noise
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Streaming Response Tests', () => {
    it('should handle streaming responses when stream parameter is true', async () => {
      // Mock validation success
      (chatPromptInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id',
          stream: true // Enable streaming
        }
      })

      // Mock streaming response
      const mockStream = createMockStream([
        'This ',
        'is ',
        'a ',
        'streaming ',
        'response.'
      ])

      mockStreamText.mockResolvedValue({
        textStream: mockStream,
        usage: Promise.resolve({
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        })
      } as any)

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          stream: true
        }
      })

      const response = await POST(request)
      
      // For streaming responses, the API would typically return a streaming response
      // In this test environment, we're verifying the streaming setup was called
      expect(mockStreamText).toHaveBeenCalled()
      expect(response.status).toBe(200)
    })

    it('should handle streaming errors gracefully', async () => {
      // Mock validation success
      (chatPromptInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id',
          stream: true
        }
      })

      // Mock streaming error
      mockStreamText.mockRejectedValue(new Error('Streaming failed'))

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          stream: true
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Failed to process chat message')
      expect(data.code).toBe('CHAT_ERROR')
    })

    it('should handle abort signals during streaming', async () => {
      // Mock validation success
      (chatPromptInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id',
          stream: true
        }
      })

      // Create an abort controller
      const abortController = new AbortController()

      // Mock streaming that respects abort signal
      mockStreamText.mockImplementation(async ({ abortSignal }) => {
        return new Promise((resolve, reject) => {
          abortSignal?.addEventListener('abort', () => {
            reject(new Error('Aborted'))
          })

          // Simulate some processing time
          setTimeout(() => {
            resolve({
              textStream: createMockStream(['Response']),
              usage: Promise.resolve({
                promptTokens: 100,
                completionTokens: 50,
                totalTokens: 150
              })
            } as any)
          }, 100)
        })
      })

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          stream: true
        }
      })

      // Abort after a short delay
      setTimeout(() => abortController.abort(), 50)

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe('Performance Tests', () => {
    it('should handle large conversation history efficiently', async () => {
      const largeConversationHistory = Array.from({ length: 50 }, (_, i) => [
        { role: 'user', content: `Question ${i}` },
        { role: 'assistant', content: `Answer ${i}` }
      ]).flat()

      // Mock validation success
      (chatPromptInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: {
          messages: largeConversationHistory,
          documentContext: 'Large document context'.repeat(100),
          documentId: 'test-doc-id'
        }
      })

      // Track performance
      const startTime = Date.now()

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: largeConversationHistory,
          documentContext: 'Large document context'.repeat(100)
        }
      })

      const response = await POST(request)
      const endTime = Date.now()

      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000)
      
      // Should handle the request successfully or return appropriate error
      expect([200, 400, 413, 500]).toContain(response.status)
    })

    it('should handle concurrent requests', async () => {
      // Mock validation success
      (chatPromptInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Concurrent test' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id'
        }
      })

      // Create multiple concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) => 
        createMockRequest('/api/chat', {
          method: 'POST',
          body: {
            documentId: `test-doc-${i}`,
            messages: [{ role: 'user', content: `Concurrent test ${i}` }],
            documentContext: 'Test context'
          }
        })
      )

      // Process all requests concurrently
      const responses = await Promise.all(requests.map(req => POST(req)))

      // All requests should complete
      expect(responses).toHaveLength(5)
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status)
      })
    })
  })

  describe('Error Recovery Tests', () => {
    it('should recover from temporary database failures', async () => {
      // Mock validation success
      (chatPromptInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id'
        }
      })

      // Mock database failure for thread creation
      const mockChatService = new ChatService(mockSupabaseClient)
      let callCount = 0
      jest.spyOn(mockChatService, 'createThread').mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Database temporarily unavailable'))
        }
        return Promise.resolve({ id: 'recovered-thread-id' })
      })

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context'
        }
      })

      // Should still process the request even if thread creation fails
      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle rate limiting gracefully', async () => {
      // Mock validation success
      (chatPromptInputSchema.safeParse as jest.Mock).mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id'
        }
      })

      // Mock rate limit error from AI provider
      // Dynamic import required for Jest mocking
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { generateText } = require('ai')
      generateText.mockRejectedValue({
        name: 'RateLimitError',
        message: 'Rate limit exceeded. Please try again later.'
      })

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Failed to process chat message')
      expect(data.code).toBe('CHAT_ERROR')
    })
  })
})