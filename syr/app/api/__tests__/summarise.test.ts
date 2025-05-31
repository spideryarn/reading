/**
 * @jest-environment node
 */
import { POST } from '../summarise/route'
import { executePrompt } from '@/lib/prompts/types'
import { getMaxTokensForGranularity, getGranularityInstruction } from '@/lib/prompts/templates/summarise'
import { createMockRequest } from './test-helpers'

// Mock the dependencies
jest.mock('@/lib/prompts/types')
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

describe('/api/summarise', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.LLM_PROVIDER
  })

  describe('successful responses', () => {
    it('should generate a summary with valid content', async () => {
      const mockSummary = 'This is a test summary of the content.'
      mockExecutePrompt.mockResolvedValueOnce(mockSummary)

      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: {
          content: 'This is some test content to summarise.'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ summary: mockSummary })
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
          granularity: 'high'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ summary: mockSummary })
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
          content: 'Test content for Anthropic'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ summary: mockSummary })
    })

    it('should work with Google provider', async () => {
      process.env.LLM_PROVIDER = 'google'
      const mockSummary = 'Summary from Google'
      mockExecutePrompt.mockResolvedValueOnce(mockSummary)

      const request = createMockRequest('http://localhost:3000/api/summarise', {
        method: 'POST',
        body: {
          content: 'Test content for Google'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ summary: mockSummary })
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
          content: 'Test content'
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