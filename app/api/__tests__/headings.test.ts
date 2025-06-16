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

// Mock the dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))
jest.mock('@/lib/config', () => ({
  getModelConfig: jest.fn(() => ({ provider: 'anthropic', modelId: 'claude-3-haiku' })),
  getModelForAICall: jest.fn(() => ({ 
    modelString: 'anthropic:claude-3-5-haiku:20241022',
    config: { provider: 'anthropic', modelId: 'claude-3-5-haiku', version: '20241022' }
  })),
  AI_CONFIG: { DEFAULT_MODEL: 'haiku' }
}))
jest.mock('@/lib/prompts/templates/headings', () => {
  const mockSafeParse = jest.fn()
  const mockParse = jest.fn()
  return {
    headingsPrompt: {
      name: 'headings',
      description: 'Test headings prompt',
      schema: {},
      templatePath: 'test.njk',
      modelConfig: {}
    },
    headingsPromptInputSchema: {
      safeParse: mockSafeParse
    },
    headingsResponseSchema: {
      parse: mockParse
    }
  }
})

// Mock services
jest.mock('@/lib/services/database/enhancements', () => ({
  EnhancementService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    storeHeadings: jest.fn(),
    delete: jest.fn()
  }))
}))

jest.mock('@/lib/services/database/ai-calls', () => {
  const mockStartCall = jest.fn()
  const mockCompleteCall = jest.fn()
  const mockFailCall = jest.fn()
  return {
    AiCallService: jest.fn().mockImplementation(() => ({
      startCallWithModelString: mockStartCall.mockResolvedValue({ 
        id: 'test-ai-call-id',
        document_id: null,
        created_by: 'test-user-id',
        model_string: 'anthropic:claude-3-5-haiku:20241022',
        prompt_type: 'headings',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }),
      completeCall: mockCompleteCall.mockResolvedValue({}),
      failCall: mockFailCall.mockResolvedValue({})
    }))
  }
})

jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  generateCorrelationId: jest.fn(() => 'test-correlation-id'),
  logAIOperation: jest.fn(),
  createTimer: jest.fn(() => ({ end: jest.fn() })),
  mutationLogger: {
    info: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/prompts/types', () => ({
  executePromptWithUsage: jest.fn()
}))

// Import route and helpers AFTER all mocks are set up
import { POST } from '../headings/route'
import * as cheerio from 'cheerio'
import { createMockRequest } from './test-helpers'
import type { MockSupabaseClient } from './test-types'
import { authTestScenarios } from '@/lib/testing/auth-test-helpers'
import { validateAuth } from '@/lib/auth/server-auth'

// Import services and mocked modules
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { headingsPromptInputSchema, headingsResponseSchema } from '@/lib/prompts/templates/headings'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockExecutePromptWithUsage = executePromptWithUsage as jest.MockedFunction<typeof executePromptWithUsage>
const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>

describe('/api/headings', () => {
  let mockEnhancementService: EnhancementService

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.LLM_PROVIDER
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    // Don't mock console.error so we can see errors
    // jest.spyOn(console, 'error').mockImplementation()
    
    // Setup default mock behavior for validation
    // Dynamic import required for Jest mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { headingsPromptInputSchema, headingsResponseSchema } = require('@/lib/prompts/templates/headings')
    headingsPromptInputSchema.safeParse.mockReturnValue({
      success: true,
      data: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
    })
    headingsResponseSchema.parse.mockReturnValue({
      headings: []
    })
    
    // Set up Supabase client mock
    mockCreateClient.mockResolvedValue({} as MockSupabaseClient)
    
    // Set up auth mock - default to authenticated user
    mockValidateAuth.mockResolvedValue(defaultTestUser)
    
    // Get mocked service instances
    mockEnhancementService = new EnhancementService({} as any)
    mockAiCallService = new AiCallService({} as any)
    
    // Set default mock return values
    jest.spyOn(mockEnhancementService, 'get').mockResolvedValue(null) // No cached headings by default
    jest.spyOn(mockEnhancementService, 'storeHeadings').mockResolvedValue({} as any)
    jest.spyOn(mockEnhancementService, 'delete').mockResolvedValue(true)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('successful responses', () => {
    it('should generate headings from HTML content', async () => {
      // Ensure auth is set up
      authTestScenarios.businessLogic()
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
      const mockSafeParse = headingsPromptInputSchema.safeParse as jest.Mock
      mockSafeParse.mockReturnValueOnce({
        success: true,
        data: { html_content: inputHtml, documentId: 'test-doc-id' }
      })
      
      // Mock LLM response
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: JSON.stringify(mockHeadingsResponse),
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300
        },
        finishReason: 'stop'
      })
      
      // Mock response validation
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce(mockHeadingsResponse)

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: inputHtml, documentId: 'test-doc-id' }
      })

      const response = await POST(request)
      const data = await response.json()

      if (response.status !== 200) {
        console.error('Response error:', JSON.stringify(data, null, 2))
        console.error('Response status:', response.status)
      }
      expect(response.status).toBe(200)
      expect(data).toEqual({
        ...mockHeadingsResponse,
        cached: false,
        enhancementId: null
      })
      
      // Verify that existing headings were removed before passing to LLM
      expect(mockExecutePromptWithUsage).toHaveBeenCalled()
      const executePromptCall = mockExecutePromptWithUsage.mock.calls[0]
      if (executePromptCall && executePromptCall[1]) {
        const cleanedHtml = executePromptCall[1].html_content
        const $ = cheerio.load(cleanedHtml)
        expect($('h1, h2, h3, h4, h5, h6').length).toBe(0)
        expect($('p').text()).toContain('Original Title') // Heading content preserved as paragraph
      }
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
      
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: '{"headings": []}',
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        finishReason: 'stop'
      })
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({ headings: [] })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: inputHtml }
      })

      await POST(request)

      const executePromptCall = mockExecutePromptWithUsage.mock.calls[0]
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
      
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: '{"headings": []}',
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        finishReason: 'stop'
      })
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({ headings: [] })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: inputHtml }
      })

      await POST(request)

      const executePromptCall = mockExecutePromptWithUsage.mock.calls[0]
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
        mockExecutePromptWithUsage.mockResolvedValueOnce({
          text: mdResponse,
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          finishReason: 'stop'
        })
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
        
        mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: '{"headings": []}',
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        finishReason: 'stop'
      })
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

  describe('authentication tests', () => {
    it('should return 401 when not authenticated', async () => {
      // Setup auth to fail
      authTestScenarios.authFailure('User not authenticated')

      // Mock validation to succeed (but it won't be reached)
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
      })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
      
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should check auth before input validation', async () => {
      // Setup auth to fail
      authTestScenarios.authFailure()

      // Don't set up validation mock - it shouldn't be called

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: {} // Invalid body that would normally trigger validation error
      })

      const response = await POST(request)
      // Should get 401 (auth error) instead of 400 (validation error)
      expect(response.status).toBe(401)
      
      // Verify that validation was never called
      expect(headingsPromptInputSchema.safeParse).not.toHaveBeenCalled()
    })

    afterEach(() => {
      // Reset auth to succeed for other tests
      authTestScenarios.businessLogic()
    })
  })

  describe('error cases', () => {
    it('should return 400 for invalid input', async () => {
      // Reset to default safeParse behavior
      // Dynamic import required for Jest mocking
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { headingsPromptInputSchema } = require('@/lib/prompts/templates/headings')
      headingsPromptInputSchema.safeParse.mockClear()
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
      expect(mockExecutePromptWithUsage).not.toHaveBeenCalled()
    })

    it('should return 500 when LLM fails', async () => {
      jest.clearAllMocks()
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
      })
      
      mockExecutePromptWithUsage.mockRejectedValueOnce(new Error('LLM API error'))

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
      // Dynamic import required for Jest mocking
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { headingsPromptInputSchema } = require('@/lib/prompts/templates/headings')
      headingsPromptInputSchema.safeParse.mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Test</p>', documentId: 'test-doc-id' }
      })
      
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: 'invalid json',
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        finishReason: 'stop'
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

    it('should return 500 when response validation fails', async () => {
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Test</p>' }
      })
      
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: '{"invalid": "response"}',
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        finishReason: 'stop'
      })
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
      
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: JSON.stringify(mockHeadingsResponse),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        finishReason: 'stop'
      })
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