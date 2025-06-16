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

import { POST } from '../route'
import { createMockRequest } from '../../__tests__/test-helpers'
import { authTestScenarios } from '@/lib/testing/auth-test-helpers'

// Mock other dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

jest.mock('@/lib/services/database/ai-calls', () => ({
  AiCallService: jest.fn().mockImplementation(() => ({
    startCallWithModelString: jest.fn().mockResolvedValue({ id: 'test-ai-call-id' }),
    completeCall: jest.fn(),
    startCall: jest.fn().mockResolvedValue('test-ai-call-id'),
    failCall: jest.fn()
  }))
}))

jest.mock('@/lib/services/database/documents', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    createWithStorage: jest.fn(),
    update: jest.fn()
  }))
}))

jest.mock('@/lib/utils/content-type-detection', () => ({
  detectAndAnalyzeContent: jest.fn(),
  isPdfContentType: jest.fn()
}))

jest.mock('@/lib/services/html-document-processor', () => ({
  processHtmlToDocument: jest.fn(),
  handleSanitizationError: jest.fn()
}))

jest.mock('@/lib/prompts/types', () => ({
  executeMultimodalPromptWithUsage: jest.fn(),
  loadMultimodalPromptTemplateFromCaller: jest.fn(() => ({
    name: 'mock-prompt',
    template: 'mock-template',
    schema: {}
  }))
}))

jest.mock('@/lib/prompts/templates/url-to-html', () => ({
  createUrlToHtmlPrompt: jest.fn(() => ({
    name: 'url-to-html',
    template: 'mock-template',
    schema: {}
  }))
}))

jest.mock('@/lib/prompts/templates/pdf-to-html-direct', () => ({
  createPdfToHtmlPrompt: jest.fn(() => ({
    name: 'pdf-to-html',
    template: 'mock-template',
    schema: {}
  }))
}))

jest.mock('@/lib/config', () => ({
  getModelForAICall: jest.fn(() => ({ 
    modelString: 'anthropic:claude-3-5-haiku:20241022',
    config: { provider: 'anthropic', modelId: 'claude-3-5-haiku', version: '20241022' }
  })),
  URL_EXTRACTION_CONFIG: {
    FETCH_TIMEOUT_MS: 30000,
    MAX_HTML_SIZE_BYTES: 10 * 1024 * 1024,
    DEFAULT_USER_AGENT: 'Mozilla/5.0',
    ERROR_MESSAGES: {
      INVALID_URL: 'Invalid URL format or protocol. Please provide a valid HTTP or HTTPS URL.',
      FETCH_FAILED: 'Failed to fetch webpage content',
      TIMEOUT: 'Request timeout',
      NETWORK_ERROR: 'Network error',
      SIZE_LIMIT: 'Content too large',
      JAVASCRIPT_REQUIRED: 'This webpage requires JavaScript',
      READABILITY_FAILED: 'Failed to extract content using Readability'
    }
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

jest.mock('@/lib/utils/readability-extractor', () => ({
  extractWithReadability: jest.fn(),
  formatReadabilityHtml: jest.fn()
}))

jest.mock('@/lib/utils/slug', () => ({
  generateHtmlFilename: jest.fn(() => 'test-file.html')
}))

// Import mocked modules
import { createClient } from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { detectAndAnalyzeContent } from '@/lib/utils/content-type-detection'
import { processHtmlToDocument } from '@/lib/services/html-document-processor'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockDetectContent = detectAndAnalyzeContent as jest.MockedFunction<typeof detectAndAnalyzeContent>
const mockProcessHtml = processHtmlToDocument as jest.MockedFunction<typeof processHtmlToDocument>
const mockExecutePrompt = executeMultimodalPromptWithUsage as jest.MockedFunction<typeof executeMultimodalPromptWithUsage>

describe('Extract URL API - Auth vs Validation Testing', () => {
  const mockSupabaseClient: any = {
    auth: {
      getUser: jest.fn()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockCreateClient.mockResolvedValue(mockSupabaseClient)
    
    // Setup auth for business logic testing by default
    authTestScenarios.businessLogic()
    
    // AiCallService is already mocked at module level
  })

  describe('Input Validation Tests (Auth Succeeds)', () => {
    it('should return 400 for missing URL', async () => {
      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          // url is missing
          provider: 'claude'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const text = await response.text()
      expect(text).toContain('Invalid URL')
    })

    it('should return 400 for invalid URL format', async () => {
      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'not-a-valid-url',
          provider: 'claude'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const text = await response.text()
      expect(text).toContain('Invalid URL')
    })

    it('should return 400 for invalid provider', async () => {
      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'https://example.com',
          provider: 'invalid-provider'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const text = await response.text()
      expect(text).toContain('Invalid provider')
    })

    it('should return 400 for invalid extraction method', async () => {
      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'https://example.com',
          provider: 'claude',
          extractionMethod: 'invalid-method'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const text = await response.text()
      expect(text).toContain('Invalid extraction method')
    })

    it('should return 501 for AI DOM method', async () => {
      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'https://example.com',
          provider: 'claude',
          extractionMethod: 'ai-dom'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(501)
      
      const text = await response.text()
      expect(text).toContain('experimental feature')
    })

    it('should return 400 for unsupported content type', async () => {
      mockDetectContent.mockResolvedValue({
        contentType: 'application/zip',
        isPdf: false,
        isHtml: false,
        isSupported: false,
        errorMessage: 'Unsupported content type: application/zip',
        suggestedAction: 'Please provide a PDF or HTML URL'
      })

      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'https://example.com/file.zip',
          provider: 'claude'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const text = await response.text()
      expect(text).toContain('Unsupported content type')
    })
  })

  describe('Authentication Tests', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Setup auth to fail
      authTestScenarios.authFailure('User not authenticated')

      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'https://example.com',
          provider: 'claude'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
      
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should return 401 for invalid credentials', async () => {
      // Setup auth to fail with specific error
      authTestScenarios.authFailure('Authentication failed: Invalid credentials')

      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'https://example.com',
          provider: 'claude'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
      
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    afterEach(() => {
      // Reset auth to succeed for other tests
      authTestScenarios.businessLogic()
    })
  })

  describe('Business Logic with Valid Auth', () => {
    it('should process URL successfully when authenticated', async () => {
      // Mock content detection for HTML
      mockDetectContent.mockResolvedValue({
        contentType: 'text/html',
        isPdf: false,
        isHtml: true,
        isSupported: true
      })

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: jest.fn().mockResolvedValue('<html><body>Test content</body></html>')
      })

      // Mock AI extraction
      mockExecutePrompt.mockResolvedValue({
        text: '<h1>Extracted Content</h1><p>Test</p>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Mock document processing
      mockProcessHtml.mockResolvedValue({
        document: {
          id: 'test-doc-id',
          title: 'Test Document',
          slug: 'test-document',
          source_url: 'https://example.com',
          html_content: '<h1>Test</h1>',
          plaintext_content: 'Test',
          word_count: 100,
          created_at: new Date().toISOString()
        },
        storageResult: null
      })

      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'https://example.com',
          provider: 'claude',
          extractionMethod: 'ai-transcription'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.document).toBeDefined()
      expect(data.document.id).toBe('test-doc-id')
    })

    it('should handle fetch failures gracefully', async () => {
      mockDetectContent.mockResolvedValue({
        contentType: 'text/html',
        isPdf: false,
        isHtml: true,
        isSupported: true
      })

      // Mock fetch failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'https://example.com',
          provider: 'claude'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const text = await response.text()
      expect(text).toContain('Network error')
    })
  })

  describe('Error Priority Testing', () => {
    it('should check auth before input validation', async () => {
      // Setup auth to fail
      authTestScenarios.authFailure()

      // Send request with invalid input that would normally trigger 400
      const request = createMockRequest('/api/extract-url', {
        method: 'POST',
        body: {
          url: 'not-a-valid-url', // Invalid URL
          provider: 'invalid-provider' // Invalid provider
        }
      })

      const response = await POST(request)
      // Should get 401 (auth error) instead of 400 (validation error)
      expect(response.status).toBe(401)
      
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })
  })
})