/**
 * @jest-environment node
 */
import { POST } from '../summarise/route'
import { executePrompt } from '@/lib/prompts/types'
import { getMaxTokensForGranularity, getGranularityInstruction } from '@/lib/prompts/templates/summarise'
import { createMockRequest } from './test-helpers'
import type { MockSupabaseClient } from './test-types'

// Mock the dependencies
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
jest.mock('@/lib/prompts/templates/summarise', () => ({
  ...jest.requireActual('@/lib/prompts/templates/summarise'),
  summarisePrompt: {
    name: 'summarise',
    description: 'Test summarise prompt',
    schema: {},
    templatePath: 'test.njk',
    modelConfig: {
      maxTokens: 200
    }
  }
}))

const mockExecutePrompt = executePrompt as jest.MockedFunction<typeof executePrompt>

// Mock the services after importing them
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockEnhancementService = {
  get: jest.fn(),
  storeSummary: jest.fn(),
  delete: jest.fn()
}
const mockAiCallService = {
  startCall: jest.fn(),
  completeCall: jest.fn(),
  failCall: jest.fn()
}

// Mock service constructors
;(EnhancementService as jest.Mock).mockImplementation(() => mockEnhancementService)
;(AiCallService as jest.Mock).mockImplementation(() => mockAiCallService)

describe('/api/summarise', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.LLM_PROVIDER
    
    // Set up database service mocks
    mockCreateClient.mockResolvedValue({} as MockSupabaseClient)
    mockEnhancementService.get.mockResolvedValue(null) // No cached summary by default
    mockEnhancementService.storeSummary.mockResolvedValue({})
    mockEnhancementService.delete.mockResolvedValue(true)
    mockAiCallService.startCall.mockResolvedValue({ id: 'test-ai-call-id' })
    mockAiCallService.completeCall.mockResolvedValue({})
    mockAiCallService.failCall.mockResolvedValue({})
  })

  describe('successful responses', () => {
    it('should generate a summary with valid content', async () => {
      const mockSummary = 'This is a test summary of the content.'
      mockExecutePrompt.mockResolvedValueOnce(mockSummary)

      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: {
          content: 'This is some test content to summarise.',
          documentId: 'test-doc-id'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ 
        summary: mockSummary,
        aiCallId: 'test-ai-call-id',
        cached: false
      })
      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          modelConfig: expect.objectContaining({
            maxTokens: 200
          })
        }),
        {
          content: 'This is some test content to summarise.',
          granularity: getGranularityInstruction(undefined)
        }
      )
    })

    it('should handle different granularity levels', async () => {
      const mockSummary = 'This is a detailed summary.'
      mockExecutePrompt.mockResolvedValueOnce(mockSummary)

      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: {
          content: 'Test content',
          granularity: 'high',
          documentId: 'test-doc-id'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ 
        summary: mockSummary,
        aiCallId: 'test-ai-call-id',
        cached: false
      })
      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          modelConfig: expect.objectContaining({
            maxTokens: getMaxTokensForGranularity('high')
          })
        }),
        {
          content: 'Test content',
          granularity: getGranularityInstruction('high')
        }
      )
    })

    it('should work with Anthropic provider', async () => {
      process.env.LLM_PROVIDER = 'anthropic'
      const mockSummary = 'Summary from Anthropic'
      mockExecutePrompt.mockResolvedValueOnce(mockSummary)

      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: {
          content: 'Test content for Anthropic',
          documentId: 'test-doc-id'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ 
        summary: mockSummary,
        aiCallId: 'test-ai-call-id',
        cached: false
      })
    })

    it('should work with Google provider', async () => {
      process.env.LLM_PROVIDER = 'google'
      const mockSummary = 'Summary from Google'
      mockExecutePrompt.mockResolvedValueOnce(mockSummary)

      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: {
          content: 'Test content for Google',
          documentId: 'test-doc-id'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ 
        summary: mockSummary,
        aiCallId: 'test-ai-call-id',
        cached: false
      })
    })
  })

  describe('error cases', () => {
    it('should return 400 for missing content', async () => {
      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: {}
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Content is required and must be a string'
      })
      expect(mockExecutePrompt).not.toHaveBeenCalled()
    })

    it('should return 400 for non-string content', async () => {
      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: {
          content: 123
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Content is required and must be a string'
      })
      expect(mockExecutePrompt).not.toHaveBeenCalled()
    })

    it('should return 500 when LLM fails', async () => {
      mockExecutePrompt.mockRejectedValueOnce(new Error('LLM API error'))

      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: {
          content: 'Test content',
          documentId: 'test-doc-id'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to generate summary'
      })
    })

    it('should handle invalid JSON in request body', async () => {
      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })
  })
})