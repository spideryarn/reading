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

// Mock services
jest.mock('@/lib/services/database/enhancements', () => ({
  EnhancementService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    storeHeadings: jest.fn(),
    delete: jest.fn()
  }))
}))

jest.mock('@/lib/services/database/ai-calls', () => ({
  AiCallService: jest.fn().mockImplementation(() => ({
    startCallWithModelString: jest.fn(),
    completeCall: jest.fn(),
    failCall: jest.fn()
  }))
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
import { POST, GET, DELETE } from '../headings/route'
import * as cheerio from 'cheerio'
import { createMockRequest } from './test-helpers'
import type { MockSupabaseClient } from './test-types'
import { authTestScenarios, defaultTestUser } from '@/lib/testing/auth-test-helpers'

// Import services and mocked modules
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { headingsPromptInputSchema, headingsResponseSchema } from '@/lib/prompts/templates/headings'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockExecutePromptWithUsage = executePromptWithUsage as jest.MockedFunction<typeof executePromptWithUsage>

describe('AI-Generated Headings - Performance Tests', () => {
  let mockEnhancementService: EnhancementService
  let mockAiCallService: AiCallService

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    
    // Set up Supabase client mock
    mockCreateClient.mockResolvedValue({} as MockSupabaseClient)
    
    // Set up auth mock - default to authenticated user
    authTestScenarios.businessLogic()
    
    // Get mocked service instances
    mockEnhancementService = new EnhancementService({} as any)
    mockAiCallService = new AiCallService({} as any)
    
    // Set default mock return values
    jest.spyOn(mockEnhancementService, 'get').mockResolvedValue(null) // No cached headings by default
    jest.spyOn(mockEnhancementService, 'storeHeadings').mockResolvedValue({} as any)
    jest.spyOn(mockEnhancementService, 'delete').mockResolvedValue(true)
    jest.spyOn(mockAiCallService, 'startCallWithModelString').mockResolvedValue({ 
      id: 'test-ai-call-id',
      document_id: null,
      created_by: 'test-user-id',
      model_string: 'anthropic:claude-3-5-haiku:20241022',
      prompt_type: 'headings',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any)
    jest.spyOn(mockAiCallService, 'completeCall').mockResolvedValue({} as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Large Document Processing', () => {
    it('should handle documents up to 100KB efficiently', async () => {
      // Generate a large HTML document
      const largeHtml = generateLargeDocument(100 * 1024) // 100KB
      
      // Mock validation success
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: largeHtml, documentId: 'large-doc-id' }
      })
      
      // Mock LLM response
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: JSON.stringify({
          headings: generateMockHeadings(20) // 20 headings for large doc
        }),
        usage: {
          promptTokens: 25000,
          completionTokens: 1000,
          totalTokens: 26000
        },
        finishReason: 'stop'
      })
      
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({
        headings: generateMockHeadings(20)
      })

      const startTime = Date.now()
      
      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: largeHtml, documentId: 'large-doc-id' }
      })

      const response = await POST(request)
      const endTime = Date.now()
      
      // Should complete within 5 seconds
      expect(endTime - startTime).toBeLessThan(5000)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.headings).toHaveLength(20)
    })

    it('should reject documents larger than 500KB', async () => {
      // Generate a document that's too large
      const tooLargeHtml = generateLargeDocument(600 * 1024) // 600KB
      
      // Mock validation to reject large content
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: false,
        error: {
          issues: [{
            path: ['html_content'],
            message: 'Content too large',
            code: 'too_big'
          }]
        }
      })
      
      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: tooLargeHtml, documentId: 'huge-doc-id' }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid request body')
    })

    it('should efficiently process documents with many existing headings', async () => {
      // Create document with 100 existing headings
      const htmlWithManyHeadings = Array.from({ length: 100 }, (_, i) => 
        `<h${(i % 6) + 1}>Heading ${i}</h${(i % 6) + 1}><p>Content ${i}</p>`
      ).join('\n')
      
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: htmlWithManyHeadings, documentId: 'many-headings-doc' }
      })
      
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: JSON.stringify({ headings: generateMockHeadings(10) }),
        usage: { promptTokens: 5000, completionTokens: 500, totalTokens: 5500 },
        finishReason: 'stop'
      })
      
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({
        headings: generateMockHeadings(10)
      })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: htmlWithManyHeadings, documentId: 'many-headings-doc' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      // Verify all original headings were removed before processing
      const executePromptCall = mockExecutePromptWithUsage.mock.calls[0]
      const cleanedHtml = executePromptCall[1].html_content
      const $ = cheerio.load(cleanedHtml)
      expect($('h1, h2, h3, h4, h5, h6').length).toBe(0)
    })
  })

  describe('Cache Performance', () => {
    it('should return cached results instantly', async () => {
      const cachedHeadings = {
        id: 'enhancement-123',
        document_id: 'cached-doc-id',
        type: 'headings',
        subtype: 'default',
        content: {
          items: generateMockHeadings(5)
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Mock cache hit
      jest.spyOn(mockEnhancementService, 'get').mockResolvedValue(cachedHeadings as any)
      
      const startTime = Date.now()
      
      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { 
          html_content: '<p>Content</p>', 
          documentId: 'cached-doc-id' 
        }
      })

      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: '<p>Content</p>', documentId: 'cached-doc-id' }
      })

      const response = await POST(request)
      const endTime = Date.now()
      
      // Should return almost instantly (under 100ms)
      expect(endTime - startTime).toBeLessThan(100)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.cached).toBe(true)
      expect(data.enhancementId).toBe('enhancement-123')
      
      // LLM should not be called
      expect(mockExecutePromptWithUsage).not.toHaveBeenCalled()
    })

    it('should handle concurrent cache requests efficiently', async () => {
      // Mock cache storage
      jest.spyOn(mockEnhancementService, 'storeHeadings').mockImplementation(async () => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100))
        return { id: 'new-enhancement-id' } as any
      })
      
      // Create multiple concurrent requests for the same document
      const requests = Array.from({ length: 5 }, () => {
        ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
          success: true,
          data: { html_content: '<p>Content</p>', documentId: 'concurrent-doc' }
        })
        
        return createMockRequest('http://localhost:3000/api/headings', {
          method: 'POST',
          body: { html_content: '<p>Content</p>', documentId: 'concurrent-doc' }
        })
      })
      
      // Mock LLM responses for each request
      requests.forEach(() => {
        mockExecutePromptWithUsage.mockResolvedValueOnce({
          text: JSON.stringify({ headings: generateMockHeadings(3) }),
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          finishReason: 'stop'
        })
        ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({
          headings: generateMockHeadings(3)
        })
      })
      
      // Process all requests concurrently
      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // All should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
      
      // Cache storage should be called for each request (no deduplication in current implementation)
      expect(mockEnhancementService.storeHeadings).toHaveBeenCalledTimes(5)
    })
  })

  describe('Memory Usage', () => {
    it('should handle deeply nested HTML structures', async () => {
      // Create deeply nested HTML (100 levels deep)
      const deeplyNestedHtml = createDeeplyNestedHtml(100)
      
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: deeplyNestedHtml, documentId: 'nested-doc' }
      })
      
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: JSON.stringify({ headings: generateMockHeadings(5) }),
        usage: { promptTokens: 2000, completionTokens: 200, totalTokens: 2200 },
        finishReason: 'stop'
      })
      
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({
        headings: generateMockHeadings(5)
      })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: deeplyNestedHtml, documentId: 'nested-doc' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should process documents with many inline styles and attributes', async () => {
      // Create HTML with lots of attributes
      const htmlWithAttrs = Array.from({ length: 100 }, (_, i) => 
        `<p style="color: rgb(${i}, ${i}, ${i}); font-size: ${i}px; margin: ${i}px;" 
            class="class-${i}" id="id-${i}" data-index="${i}">
          Content ${i}
        </p>`
      ).join('\n')
      
      ;(headingsPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { html_content: htmlWithAttrs, documentId: 'attrs-doc' }
      })
      
      mockExecutePromptWithUsage.mockResolvedValueOnce({
        text: JSON.stringify({ headings: generateMockHeadings(8) }),
        usage: { promptTokens: 3000, completionTokens: 300, totalTokens: 3300 },
        finishReason: 'stop'
      })
      
      ;(headingsResponseSchema.parse as jest.Mock).mockReturnValueOnce({
        headings: generateMockHeadings(8)
      })

      const request = createMockRequest('http://localhost:3000/api/headings', {
        method: 'POST',
        body: { html_content: htmlWithAttrs, documentId: 'attrs-doc' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      // Verify attributes are preserved in cleaned HTML
      const executePromptCall = mockExecutePromptWithUsage.mock.calls[0]
      const cleanedHtml = executePromptCall[1].html_content
      expect(cleanedHtml).toContain('style=')
      expect(cleanedHtml).toContain('class=')
    })
  })
})

// Helper functions
function generateLargeDocument(sizeInBytes: number): string {
  const paragraphTemplate = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'
  const paragraphSize = paragraphTemplate.length
  const paragraphCount = Math.ceil(sizeInBytes / paragraphSize)
  return Array.from({ length: paragraphCount }, () => paragraphTemplate).join('\n')
}

function generateMockHeadings(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    before_html: `<p>Content before heading ${i}</p>`,
    html: `<h${(i % 3) + 2}>Generated Heading ${i}</h${(i % 3) + 2}>`,
    rationale: `This section discusses topic ${i}`
  }))
}

function createDeeplyNestedHtml(depth: number): string {
  let html = '<p>Content</p>'
  for (let i = 0; i < depth; i++) {
    html = `<div class="level-${i}">${html}</div>`
  }
  return html
}