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

jest.mock('ai', () => ({
  generateText: jest.fn()
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

// Import route and helpers AFTER all mocks are set up
import { POST } from '../route'
import { createMockRequest } from '../../__tests__/test-helpers'
import { defaultTestUser } from '@/lib/testing/auth-test-helpers'

// Import mocked modules
import { createClient } from '@/lib/supabase/server'
import { ChatService } from '@/lib/services/database/chat'
import { chatPromptInputSchema } from '@/lib/prompts/templates/chat'
import { generateText } from 'ai'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockChatPromptInputSchema = chatPromptInputSchema as jest.Mocked<typeof chatPromptInputSchema>
const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>

describe('Chat API - Auth vs Validation Testing', () => {
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
    
    // Setup default auth mock - chat API now uses validateAuth
    // Dynamic import required for Jest mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateAuth } = require('@/lib/auth/server-auth')
    validateAuth.mockResolvedValue(defaultTestUser)
    
    // Services are already mocked at module level
  })

  describe('Input Validation Tests (Auth Succeeds)', () => {
    it('should return 400 for missing messages', async () => {
      // Mock validation to fail
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

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid request format')
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for missing documentId', async () => {
      mockChatPromptInputSchema.safeParse.mockReturnValue({
        success: false,
        error: { 
          issues: [
            { 
              path: ['documentId'],
              message: 'Required',
              code: 'invalid_type' 
            }
          ] 
        }
      } as any)

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Test' }],
          documentContext: 'Test context'
          // documentId is missing
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid request format')
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid message format', async () => {
      mockChatPromptInputSchema.safeParse.mockReturnValue({
        success: false,
        error: { 
          issues: [
            { 
              path: ['messages', 0, 'role'],
              message: 'Invalid enum value',
              code: 'invalid_enum_value' 
            }
          ] 
        }
      } as any)

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'invalid-role', content: 'Test' }],
          documentContext: 'Test context'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid request format')
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Authentication Tests', () => {
    it('should handle missing user gracefully', async () => {
      // Chat API uses getUser which returns {user, error} - it doesn't throw
      // Dynamic import required for Jest mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getUser } = require('@/lib/auth/server-auth')
      getUser.mockResolvedValue({ user: null, error: new Error('Not authenticated') })

      // Mock validation to succeed
      mockChatPromptInputSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id'
        }
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
      // Chat API doesn't require auth, so it should still work
      expect(response.status).toBe(200)
      
      // Verify user was null in logging
      // Dynamic import required for Jest mocking
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createRequestLogger } = require('@/lib/services/logger')
      const loggerCalls = createRequestLogger.mock.calls
      expect(loggerCalls.length).toBeGreaterThan(0)
    })

    it('should require authentication', async () => {
      // Chat API now requires authentication
      // Dynamic import required for Jest mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateAuth } = require('@/lib/auth/server-auth')
      validateAuth.mockRejectedValue(new Error('Authentication required'))

      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          documentId: 'test-doc-id',
          messages: [{ role: 'user', content: 'Test' }],
          documentContext: 'Test context'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Business Logic with Valid Auth', () => {
    it('should process chat message successfully', async () => {
      // Mock validation success
      mockChatPromptInputSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id'
        }
      })

      // Mock AI response
      mockGenerateText.mockResolvedValue({
        text: 'This is a test response about the document.',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
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
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.response).toBe('This is a test response about the document.')
      expect(data.timestamp).toBeDefined()
    })

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

  describe('Error Priority Testing', () => {
    it('should validate input regardless of auth status', async () => {
      // Chat API doesn't require auth, so validation always happens
      // Dynamic import required for Jest mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getUser } = require('@/lib/auth/server-auth')
      getUser.mockResolvedValue({ user: null, error: null })

      // Mock validation to fail
      mockChatPromptInputSchema.safeParse.mockReturnValue({
        success: false,
        error: { 
          issues: [
            { 
              path: ['messages'],
              message: 'Invalid',
              code: 'invalid' 
            }
          ] 
        }
      } as any)

      // Send request with invalid input
      const request = createMockRequest('/api/chat', {
        method: 'POST',
        body: {
          // Invalid body that would normally trigger validation error
          messages: [],
          // missing documentId
        }
      })

      const response = await POST(request)
      // Should get 400 (validation error) since chat doesn't enforce auth
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid request format')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing thread creation gracefully', async () => {
      // Mock validation success
      mockChatPromptInputSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          messages: [{ role: 'user', content: 'Test question' }],
          documentContext: 'Test context',
          documentId: 'test-doc-id',
          threadId: undefined // No existing thread
        }
      })

      // Mock thread creation failure
      const mockChatService = new ChatService(mockSupabaseClient)
      jest.spyOn(mockChatService, 'createThread').mockRejectedValue(new Error('DB error'))

      // Mock AI response success
      mockGenerateText.mockResolvedValue({
        text: 'Response despite thread creation failure',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
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
      // Should still succeed even if thread creation fails
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.response).toBe('Response despite thread creation failure')
      expect(data.threadId).toBe('none') // Fallback value
    })
  })
})