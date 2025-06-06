/**
 * @jest-environment node
 */
import { POST } from '../headings/route'
import { executePrompt } from '@/lib/prompts/types'
import * as cheerio from 'cheerio'
import { createMockRequest } from './test-helpers'

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
jest.mock('@/lib/prompts/templates/headings', () => ({
  headingsPrompt: {
    name: 'headings',
    description: 'Test headings prompt',
    schema: {},
    templatePath: 'test.njk',
    modelConfig: {}
  },
  headingsPromptInputSchema: {
    safeParse: jest.fn()
  },
  headingsResponseSchema: {
    parse: jest.fn()
  }
}))

const mockExecutePrompt = executePrompt as jest.MockedFunction<typeof executePrompt>

// Import after mocking to get mocked versions
import { headingsPromptInputSchema, headingsResponseSchema } from '@/lib/prompts/templates/headings'

// Mock the services after importing them
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockEnhancementService = {
  get: jest.fn(),
  storeHeadings: jest.fn(),
  delete: jest.fn()
}
const mockAiCallService = {
  startCall: jest.fn(),
  completeCall: jest.fn()
}

// Mock service constructors
;(EnhancementService as jest.Mock).mockImplementation(() => mockEnhancementService)
;(AiCallService as jest.Mock).mockImplementation(() => mockAiCallService)

describe('/api/headings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.LLM_PROVIDER
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    
    // Reset all service mocks to their defaults
    mockCreateClient.mockResolvedValue({} as any)
    mockEnhancementService.get.mockResolvedValue(null) // No cached headings by default
    mockEnhancementService.storeHeadings.mockResolvedValue({})
    mockEnhancementService.delete.mockResolvedValue(true)
    mockAiCallService.startCall.mockResolvedValue({ id: 'test-ai-call-id' })
    mockAiCallService.completeCall.mockResolvedValue({})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('successful responses', () => {
    it('should generate headings from HTML content', async () => {
      const mockHeadingsResponse = {
        headings: [
          { 
            before_html: '<p>Some content</p>',
            html: '<h2>Generated Heading</h2>',
            rationale: 'This section discusses...'
          },
          {
            before_html: '<p>More content</p>',
            html: '<h3>Sub Heading</h3>',
            rationale: 'This subsection covers...'
          }
        ]
      }
      
      const inputHtml = '<h1>Original Title</h1><p>Some content</p><p>More content</p>'
      
      // Mock validation success
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: inputHtml, documentId: 'test-doc-id' }
      })
      
      // Mock LLM response
      mockExecutePrompt.mockResolvedValueOnce(JSON.stringify(mockHeadingsResponse))
      
      // Mock response validation
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce(mockHeadingsResponse)

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: inputHtml, documentId: 'test-doc-id' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        ...mockHeadingsResponse,
        cached: false,
        enhancementId: null
      })
      
      // Verify that existing headings were removed before passing to LLM
      const executePromptCall = mockExecutePrompt.mock.calls[0]
      const cleanedHtml = executePromptCall[1].html_content
      const $ = cheerio.load(cleanedHtml)
      expect($('h1, h2, h3, h4, h5, h6').length).toBe(0)
      expect($('p').text()).toContain('Original Title') // Heading content preserved as paragraph
    })

    it('should remove all heading levels before processing', async () => {
      const inputHtml = `
        <h1>H1 Heading</h1>
        <h2>H2 Heading</h2>
        <h3>H3 Heading</h3>
        <h4>H4 Heading</h4>
        <h5>H5 Heading</h5>
        <h6>H6 Heading</h6>
        <p>Regular content</p>
      `
      
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: inputHtml }
      })
      
      mockExecutePrompt.mockResolvedValueOnce('{"headings": []}')
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({ headings: [] })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: inputHtml }
      })

      await POST(request)

      const executePromptCall = mockExecutePrompt.mock.calls[0]
      const cleanedHtml = executePromptCall[1].html_content
      const $ = cheerio.load(cleanedHtml)
      
      // All headings should be removed
      expect($('h1, h2, h3, h4, h5, h6').length).toBe(0)
      
      // Heading content should be preserved as paragraphs
      const paragraphs = $('p').map((_, el) => $(el).text()).get()
      expect(paragraphs).toContain('H1 Heading')
      expect(paragraphs).toContain('H2 Heading')
      expect(paragraphs).toContain('Regular content')
    })

    it('should handle empty headings correctly', async () => {
      const inputHtml = '<h1></h1><h2>   </h2><p>Content</p>'
      
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: inputHtml }
      })
      
      mockExecutePrompt.mockResolvedValueOnce('{"headings": []}')
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({ headings: [] })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: inputHtml }
      })

      await POST(request)

      const executePromptCall = mockExecutePrompt.mock.calls[0]
      const cleanedHtml = executePromptCall[1].html_content
      const $ = cheerio.load(cleanedHtml)
      
      // Empty headings should be removed entirely
      expect($('h1, h2').length).toBe(0)
      expect($('p').length).toBe(1) // Only the content paragraph remains
    })

    it('should strip markdown code blocks from LLM response', async () => {
      const mockHeadingsResponse = { headings: [] }
      
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
      })
      
      // Test various markdown formats
      const markdownResponses = [
        '```json\n{"headings": []}\n```',
        '```\n{"headings": []}\n```',
        '{"headings": []}```'
      ]
      
      for (const mdResponse of markdownResponses) {
        jest.clearAllMocks()
        ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
          success: true,
          data: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
        })
        mockExecutePrompt.mockResolvedValueOnce(mdResponse)
        ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce(mockHeadingsResponse)

        const request = createMockRequest('http://localhost:3000/api/headings', {
          method: 'POST',
          body: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({
          ...mockHeadingsResponse,
          cached: false,
          enhancementId: null
        })
      }
    })

    it('should work with different LLM providers', async () => {
      const providers = ['anthropic', 'google']
      
      for (const provider of providers) {
        process.env.LLM_PROVIDER = provider
        
        ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
          success: true,
          data: { html_content: `<p>Test with ${provider}</p>` }
        })
        
        mockExecutePrompt.mockResolvedValueOnce('{"headings": []}')
        ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({ headings: [] })

        const request = createMockRequest('http://localhost:3000/api/headings', {
          method: 'POST',
          body: { html_content: `<p>Test with ${provider}</p>` }
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      }
    })
  })

  describe('error cases', () => {
    it('should return 400 for invalid input', async () => {
      const mockError = {
        issues: [
          {
            path: ['html_content'],
            message: 'Required',
            received: 'undefined'
          }
        ]
      }
      
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: mockError
      })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { invalid: 'data' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid request body',
        details: mockError
      })
      expect(mockExecutePrompt).not.toHaveBeenCalled()
    })

    it('should return 500 when LLM fails', async () => {
      jest.clearAllMocks()
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
      })
      
      mockExecutePrompt.mockRejectedValueOnce(new Error('LLM API error'))

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to generate headings'
      })
    })

    it('should return 500 for invalid JSON from LLM', async () => {
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Test</p>' }
      })
      
      mockExecutePrompt.mockResolvedValueOnce('invalid json')

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: '<p>Test</p>' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to generate headings'
      })
    })

    it('should return 500 when response validation fails', async () => {
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Test</p>' }
      })
      
      mockExecutePrompt.mockResolvedValueOnce('{"invalid": "response"}')
      ;(headingsResponseSchema.parse as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid response schema')
      })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: '<p>Test</p>' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to generate headings'
      })
    })
  })

  describe('console logging', () => {
    it('should log heading hierarchy when successful', async () => {
      const mockHeadingsResponse = {
        headings: [
          { 
            before_html: '<p>Content 1</p>',
            html: '<h2>Main Section</h2>',
            rationale: 'Main topic'
          },
          {
            before_html: '<p>Content 2</p>',
            html: '<h3>Subsection</h3>',
            rationale: 'Subtopic'
          }
        ]
      }
      
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Content 1</p><p>Content 2</p>', documentId: 'test-doc-id' }
      })
      
      mockExecutePrompt.mockResolvedValueOnce(JSON.stringify(mockHeadingsResponse))
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce(mockHeadingsResponse)

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: '<p>Content 1</p><p>Content 2</p>', documentId: 'test-doc-id' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Check that console.log was called with hierarchy information
      // The mocked console.log captures the calls from the logHeadingsHierarchy function
      const consoleLogCalls = (console.log as jest.Mock).mock.calls
      const loggedStrings = consoleLogCalls.map(call => call[0])
      
      // Debug the actual logged strings
      console.log('DEBUG: All logged strings:', JSON.stringify(loggedStrings, null, 2))
      
      expect(loggedStrings.some(str => str.includes('=== Generated Headings ==='))).toBe(true)
      expect(loggedStrings.some(str => str.includes('H2: Main Section'))).toBe(true)
      expect(loggedStrings.some(str => str.includes('H3: Subsection'))).toBe(true)
      expect(loggedStrings.some(str => str.includes('Total headings generated: 2'))).toBe(true)
    })
  })
})