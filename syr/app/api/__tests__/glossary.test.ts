/**
 * @jest-environment node
 */
import { POST } from '../glossary/route'
import { executePrompt } from '@/lib/prompts/types'
import { glossaryPrompt } from '@/lib/prompts/templates/glossary'
const { createMockRequest } = require('./test-helpers.js')

// Mock the dependencies
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/prompts/templates/glossary', () => ({
  glossaryPrompt: {
    name: 'glossary',
    description: 'Test glossary prompt',
    schema: {},
    templatePath: 'test.njk',
    modelConfig: {}
  },
  glossaryPromptInputSchema: {
    safeParse: jest.fn(),
    parse: jest.fn()
  },
  glossaryResponseSchema: {
    parse: jest.fn()
  }
}))

const mockExecutePrompt = executePrompt as jest.MockedFunction<typeof executePrompt>

// Import after mocking to get mocked versions
import { glossaryPromptInputSchema, glossaryResponseSchema } from '@/lib/prompts/templates/glossary'

describe('/api/glossary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.LLM_PROVIDER
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('successful responses', () => {
    it('should generate glossary entities from content', async () => {
      const mockGlossaryResponse = {
        entities: [
          { name: 'Test Entity', description: 'A test entity description' },
          { name: 'Another Entity', description: 'Another test description' }
        ]
      }
      
      // Mock validation success
      ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { content: 'Test content with entities' }
      })
      
      // Mock LLM response
      mockExecutePrompt.mockResolvedValueOnce(JSON.stringify(mockGlossaryResponse))
      
      // Mock response validation
      ;(glossaryResponseSchema.parse as jest.Mock).mockReturnValueOnce(mockGlossaryResponse)

      const request = createMockRequest('http://localhost:3000/api/glossary', {
        method: 'POST',
        body: {
          content: 'Test content with entities'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockGlossaryResponse)
      expect(mockExecutePrompt).toHaveBeenCalledWith(glossaryPrompt, {
        content: 'Test content with entities',
        already_entities: undefined
      })
    })

    it('should handle already_entities parameter', async () => {
      const existingEntities = ['Entity1', 'Entity2']
      const mockGlossaryResponse = {
        entities: [
          { name: 'New Entity', description: 'A new entity not in the list' }
        ]
      }
      
      ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { content: 'Test content', already_entities: existingEntities }
      })
      
      mockExecutePrompt.mockResolvedValueOnce(JSON.stringify(mockGlossaryResponse))
      ;(glossaryResponseSchema.parse as jest.Mock).mockReturnValueOnce(mockGlossaryResponse)

      const request = createMockRequest('http://localhost:3000/api/glossary', {
        method: 'POST',
        body: {
          content: 'Test content',
          already_entities: existingEntities
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockGlossaryResponse)
      expect(mockExecutePrompt).toHaveBeenCalledWith(glossaryPrompt, {
        content: 'Test content',
        already_entities: existingEntities
      })
    })

    it('should truncate very long content', async () => {
      const longContent = 'x'.repeat(60000) // Over the 50000 char limit
      const expectedTruncated = 'x'.repeat(50000) + '\n\n[Content truncated for processing...]'
      
      ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { content: longContent }
      })
      
      mockExecutePrompt.mockResolvedValueOnce('{"entities": []}')
      ;(glossaryResponseSchema.parse as jest.Mock).mockReturnValueOnce({ entities: [] })

      const request = createMockRequest('http://localhost:3000/api/glossary', {
        method: 'POST',
        body: { content: longContent }
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockExecutePrompt).toHaveBeenCalledWith(glossaryPrompt, {
        content: expectedTruncated,
        already_entities: undefined
      })
    })

    it('should strip markdown code blocks from LLM response', async () => {
      const mockGlossaryResponse = { entities: [] }
      
      ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { content: 'Test' }
      })
      
      // Test various markdown formats
      const markdownResponses = [
        '```json\n{"entities": []}\n```',
        '```\n{"entities": []}\n```',
        '{"entities": []}```'
      ]
      
      for (const mdResponse of markdownResponses) {
        jest.clearAllMocks()
        ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
          success: true,
          data: { content: 'Test' }
        })
        mockExecutePrompt.mockResolvedValueOnce(mdResponse)
        ;(glossaryResponseSchema.parse as jest.Mock).mockReturnValueOnce(mockGlossaryResponse)

        const request = createMockRequest('http://localhost:3000/api/glossary', {
          method: 'POST',
          body: { content: 'Test' }
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual(mockGlossaryResponse)
      }
    })

    it('should work with different LLM providers', async () => {
      const providers = ['anthropic', 'google']
      
      for (const provider of providers) {
        process.env.LLM_PROVIDER = provider
        
        ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
          success: true,
          data: { content: `Test with ${provider}` }
        })
        
        mockExecutePrompt.mockResolvedValueOnce('{"entities": []}')
        ;(glossaryResponseSchema.parse as jest.Mock).mockReturnValueOnce({ entities: [] })

        const request = createMockRequest('http://localhost:3000/api/glossary', {
          method: 'POST',
          body: { content: `Test with ${provider}` }
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      }
    })
  })

  describe('error cases', () => {
    it('should return 400 for invalid input', async () => {
      ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: { message: 'Invalid input' }
      })

      const request = createMockRequest('http://localhost:3000/api/glossary', {
        method: 'POST',
        body: { invalid: 'data' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid request body',
        details: { message: 'Invalid input' }
      })
      expect(mockExecutePrompt).not.toHaveBeenCalled()
    })

    it('should return 500 when LLM fails', async () => {
      jest.clearAllMocks()
      ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { content: 'Test content' }
      })
      
      mockExecutePrompt.mockRejectedValueOnce(new Error('LLM API error'))

      const request = createMockRequest('http://localhost:3000/api/glossary', {
        method: 'POST',
        body: { content: 'Test content' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to generate glossary'
      })
    })

    it('should return 500 for invalid JSON from LLM', async () => {
      ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { content: 'Test' }
      })
      
      mockExecutePrompt.mockResolvedValueOnce('invalid json')

      const request = createMockRequest('http://localhost:3000/api/glossary', {
        method: 'POST',
        body: { content: 'Test' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to generate glossary'
      })
    })

    it('should return 500 when response validation fails', async () => {
      ;(glossaryPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { content: 'Test' }
      })
      
      mockExecutePrompt.mockResolvedValueOnce('{"invalid": "response"}')
      ;(glossaryResponseSchema.parse as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid response schema')
      })

      const request = createMockRequest('http://localhost:3000/api/glossary', {
        method: 'POST',
        body: { content: 'Test' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to generate glossary'
      })
    })
  })
})