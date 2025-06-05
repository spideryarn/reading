/**
 * @jest-environment node
 */
import { POST } from '../chat/route'
import { generateText } from 'ai'
import { getModel } from '@/lib/services/llm-provider'
import { chatPromptInputSchema } from '@/lib/prompts/templates/chat'
import { createMockRequest } from './test-helpers'

// Mock the dependencies
jest.mock('ai')
jest.mock('@/lib/services/llm-provider')
jest.mock('@/lib/prompts/templates/chat', () => ({
  chatPromptInputSchema: {
    safeParse: jest.fn()
  }
}))

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>
const mockGetModel = getModel as jest.MockedFunction<typeof getModel>

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.LLM_PROVIDER
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('successful responses', () => {
    it('should generate a chat response with valid input', async () => {
      const mockMessages = [
        { role: 'user', content: 'What is the main topic of this document?' }
      ]
      const mockDocumentContext = 'This document discusses AI and machine learning.'
      const mockResponse = 'The main topic of this document is artificial intelligence and machine learning.'
      
      // Mock validation success
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: mockDocumentContext }
      })
      
      // Mock model
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      // Mock AI generation
      mockGenerateText.mockResolvedValueOnce({
        text: mockResponse,
        finishReason: 'stop',
        usage: { totalTokens: 100 }
      } as any)

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: mockMessages,
          documentContext: mockDocumentContext
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        response: mockResponse,
        timestamp: expect.any(String)
      })
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: mockModel,
        messages: expect.arrayContaining([
          { role: 'system', content: expect.stringContaining('You are an AI assistant') },
          { role: 'user', content: 'What is the main topic of this document?' }
        ]),
        maxTokens: expect.any(Number),
        temperature: 0
      })
    })

    it('should handle multi-turn conversations', async () => {
      const mockMessages = [
        { role: 'user', content: 'What is AI?' },
        { role: 'assistant', content: 'AI stands for Artificial Intelligence.' },
        { role: 'user', content: 'Can you elaborate?' }
      ]
      const mockDocumentContext = 'This document covers AI concepts.'
      const mockResponse = 'Artificial Intelligence refers to computer systems that can perform tasks that typically require human intelligence.'
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: mockDocumentContext }
      })
      
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockResolvedValueOnce({
        text: mockResponse,
        finishReason: 'stop',
        usage: { totalTokens: 150 }
      } as any)

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: mockMessages,
          documentContext: mockDocumentContext
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        response: mockResponse,
        timestamp: expect.any(String)
      })
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: mockModel,
        messages: expect.arrayContaining([
          { role: 'system', content: expect.stringContaining('You are an AI assistant') },
          { role: 'user', content: 'What is AI?' },
          { role: 'assistant', content: 'AI stands for Artificial Intelligence.' },
          { role: 'user', content: 'Can you elaborate?' }
        ]),
        maxTokens: expect.any(Number),
        temperature: 0
      })
    })

    it('should work without document context', async () => {
      const mockMessages = [
        { role: 'user', content: 'Hello' }
      ]
      const mockResponse = 'Hello! How can I help you analyze the document?'
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: undefined }
      })
      
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockResolvedValueOnce({
        text: mockResponse,
        finishReason: 'stop',
        usage: { totalTokens: 50 }
      } as any)

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: mockMessages
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        response: mockResponse,
        timestamp: expect.any(String)
      })
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: expect.stringContaining('No document context provided') }
          ])
        })
      )
    })

    it('should work with Anthropic provider', async () => {
      process.env.LLM_PROVIDER = 'anthropic'
      process.env.ANTHROPIC_API_KEY = 'test-key'
      
      const mockMessages = [{ role: 'user', content: 'Test with Anthropic' }]
      const mockResponse = 'Response from Anthropic'
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: 'Test context' }
      })
      
      const mockModel = { id: 'claude-3-haiku' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockResolvedValueOnce({
        text: mockResponse,
        finishReason: 'stop',
        usage: { totalTokens: 100 }
      } as any)

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages, documentContext: 'Test context' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.response).toBe(mockResponse)
      expect(mockGetModel).toHaveBeenCalled()
    })

    it('should work with Google provider', async () => {
      process.env.LLM_PROVIDER = 'google'
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
      
      const mockMessages = [{ role: 'user', content: 'Test with Google' }]
      const mockResponse = 'Response from Google'
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: 'Test context' }
      })
      
      const mockModel = { id: 'gemini-1.5-flash' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockResolvedValueOnce({
        text: mockResponse,
        finishReason: 'stop',
        usage: { totalTokens: 100 }
      } as any)

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages, documentContext: 'Test context' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.response).toBe(mockResponse)
      expect(mockGetModel).toHaveBeenCalled()
    })
  })

  describe('error cases', () => {
    it('should return 400 for invalid input', async () => {
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: {
          issues: [
            {
              path: ['messages'],
              message: 'Required',
              received: 'undefined'
            },
            {
              path: ['documentContext'],
              message: 'Invalid type',
              received: 'undefined'
            }
          ]
        }
      })

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { invalid: 'data' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid request format',
        details: {
          message: 'Request validation failed',
          issues: [
            {
              path: 'messages',
              message: 'Required',
              received: 'undefined'
            },
            {
              path: 'documentContext',
              message: 'Invalid type',
              received: 'undefined'
            }
          ]
        },
        code: 'VALIDATION_ERROR'
      })
      expect(mockGenerateText).not.toHaveBeenCalled()
    })

    it('should return 400 for empty messages array', async () => {
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: {
          issues: [
            {
              path: ['messages'],
              message: 'Array must contain at least 1 element(s)',
              received: '[]'
            }
          ]
        }
      })

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: [] }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request format')
    })

    it('should return 500 for API key errors', async () => {
      const mockMessages = [{ role: 'user', content: 'Test' }]
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: 'Test' }
      })
      
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockRejectedValueOnce(new Error('401 Unauthorized: Invalid API key'))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'API configuration error',
        details: 'The Anthropic API key is missing or invalid. Please check server configuration.',
        code: 'API_KEY_ERROR'
      })
    })

    it('should return 429 for rate limit errors', async () => {
      const mockMessages = [{ role: 'user', content: 'Test' }]
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: 'Test' }
      })
      
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockRejectedValueOnce(new Error('429 Too Many Requests: Rate limit exceeded'))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data).toEqual({
        error: 'Rate limit exceeded',
        details: 'Too many requests to the AI service. Please wait a moment before trying again.',
        code: 'RATE_LIMIT_ERROR'
      })
    })

    it('should return 500 for model configuration errors', async () => {
      const mockMessages = [{ role: 'user', content: 'Test' }]
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: 'Test' }
      })
      
      mockGetModel.mockImplementationOnce(() => {
        throw new Error('Invalid model: claude-999')
      })

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Model configuration error',
        details: 'AI model issue: Invalid model: claude-999',
        code: 'MODEL_ERROR'
      })
    })

    it('should return 503 for network errors', async () => {
      const mockMessages = [{ role: 'user', content: 'Test' }]
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: 'Test' }
      })
      
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockRejectedValueOnce(new Error('fetch failed: network error'))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data).toEqual({
        error: 'Network error',
        details: 'Failed to connect to AI service. Please check your internet connection.',
        code: 'NETWORK_ERROR'
      })
    })

    it('should return 500 for unknown errors', async () => {
      const mockMessages = [{ role: 'user', content: 'Test' }]
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: 'Test' }
      })
      
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockRejectedValueOnce(new Error('Something unexpected happened'))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to process chat message',
        details: 'Something unexpected happened',
        code: 'UNKNOWN_ERROR'
      })
    })

    it('should handle JSON parsing errors in request body', async () => {
      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })

    it('should handle non-Error objects thrown', async () => {
      const mockMessages = [{ role: 'user', content: 'Test' }]
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: 'Test' }
      })
      
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      // Throw a non-Error object
      mockGenerateText.mockRejectedValueOnce('String error')

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to process chat message',
        details: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      })
    })
  })

  describe('logging', () => {
    it('should log conversation processing details', async () => {
      const mockMessages = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Response' },
        { role: 'user', content: 'Second message' }
      ]
      const mockDocumentContext = 'Document content'
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: mockDocumentContext }
      })
      
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockResolvedValueOnce({
        text: 'Test response',
        finishReason: 'stop',
        usage: { totalTokens: 100 }
      } as any)

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages, documentContext: mockDocumentContext }
      })

      await POST(request)

      expect(console.log).toHaveBeenCalledWith(
        '[Chat API] Processing conversation:',
        expect.objectContaining({
          messageCount: 3,
          documentContextLength: mockDocumentContext.length,
          timestamp: expect.any(String)
        })
      )

      expect(console.log).toHaveBeenCalledWith(
        '[Chat API] Response generated successfully:',
        expect.objectContaining({
          responseLength: 'Test response'.length,
          timestamp: expect.any(String)
        })
      )
    })

    it('should log error details', async () => {
      const mockMessages = [{ role: 'user', content: 'Test' }]
      const testError = new Error('Test error')
      testError.stack = 'Error stack trace'
      
      ;(chatPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { messages: mockMessages, documentContext: 'Test' }
      })
      
      const mockModel = { id: 'test-model' }
      mockGetModel.mockReturnValueOnce(mockModel as any)
      
      mockGenerateText.mockRejectedValueOnce(testError)

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: mockMessages }
      })

      await POST(request)

      expect(console.error).toHaveBeenCalledWith(
        '[Chat API] Error occurred:',
        expect.objectContaining({
          timestamp: expect.any(String),
          error: expect.objectContaining({
            name: 'Error',
            message: 'Test error',
            stack: 'Error stack trace'
          })
        })
      )
    })
  })
})