/**
 * @jest-environment node
 */
/**
 * URL Extract API Sanitization Integration Tests
 * 
 * Minimal integration tests verifying that sanitization is properly applied 
 * during URL extraction flow. Core sanitization logic is tested in
 * lib/utils/__tests__/html-sanitizer.test.ts
 */

import { POST } from '../extract-url/route'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { getTestNamespace, createTestEmail, createTestMetadata } from '@/lib/testing/test-isolation-utils'

// Mock the multimodal prompt execution
jest.mock('@/lib/prompts/types', () => ({
  executeMultimodalPromptWithUsage: jest.fn(),
  loadMultimodalPromptTemplateFromCaller: jest.fn()
}))

// Mock authentication to return a test user
jest.mock('@/lib/auth/server-auth', () => ({
  validateAuth: jest.fn()
}))

// Mock slug generation
jest.mock('@/lib/utils/slug', () => ({
  generateSlug: jest.fn().mockImplementation((text: string) => text.toLowerCase().replace(/\s+/g, '-').slice(0, 50)),
  generateHtmlFilename: jest.fn().mockImplementation((url: string) => {
    const domain = new URL(url).hostname.replace(/\./g, '-')
    return `${domain}-${Date.now()}.html`
  })
}))

// Mock global fetch for URL content fetching
global.fetch = jest.fn()

import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { validateAuth } from '@/lib/auth/server-auth'

const mockExecutePrompt = executeMultimodalPromptWithUsage as jest.MockedFunction<typeof executeMultimodalPromptWithUsage>
const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('URL Extract API - Sanitization Integration', () => {
  const namespace = getTestNamespace('extract-url-sanitization')
  let supabase: SupabaseClient<Database>
  let documentService: DocumentService
  let testUserId: string

  beforeAll(async () => {
    // Set up real database connection
    supabase = await createClient()
    documentService = new DocumentService(supabase)
    
    // Create a test user profile
    testUserId = `test-user-${namespace}`
    const testEmail = createTestEmail(namespace, 'extract-test')
    
    await supabase.from('profiles').insert({
      id: testUserId,
      email: testEmail,
      full_name: 'Extract Test User',
      metadata: createTestMetadata(namespace)
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authentication to return our test user
    mockValidateAuth.mockResolvedValue({ id: testUserId, email: createTestEmail(namespace, 'extract-test') })
    
    // Default successful fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: async () => '<html><body><p>Original webpage content</p></body></html>'
    } as Response)
    
    // Default successful mock for AI processing
    mockExecutePrompt.mockResolvedValue({
      text: '<html><body><p>Extracted clean content</p></body></html>',
      usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
      finishReason: 'stop'
    })
  })

  afterAll(async () => {
    // Clean up test data
    await supabase.from('documents').delete().eq('user_id', testUserId)
    await supabase.from('ai_calls').delete().contains('input_data', { test_namespace: namespace })
    await supabase.from('profiles').delete().eq('id', testUserId)
  })

  const createRequest = (body: Record<string, unknown>): Request => {
    return new Request('http://localhost:3000/api/extract-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
  }

  describe('Integration - Basic Sanitization Flow', () => {
    it('should apply sanitization to AI-extracted content and store sanitized HTML', async () => {
      // AI extraction returns content with both safe academic and dangerous elements
      const extractedContent = `
        <html>
        <body>
          <article>
            <h1>Research Article</h1>
            <p>Academic content</p>
            <script>console.log('dangerous')</script>
            <math><mi>x</mi><mo>=</mo><mn>1</mn></math>
          </article>
        </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => '<html><body>Original webpage</body></html>'
      } as Response)

      mockExecutePrompt.mockResolvedValue({
        text: extractedContent,
        usage: { totalTokens: 150, promptTokens: 100, completionTokens: 50 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://research-journal.org/article-123',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)

      // Verify sanitization occurred (script removed, math preserved)
      expect(responseData.document.html_content).not.toContain('<script>')
      expect(responseData.document.html_content).toContain('<math>')
      expect(responseData.document.html_content).toContain('Academic content')

      // Verify database storage by checking the document was created successfully
      expect(responseData.document.id).toBeTruthy()
      expect(responseData.document.slug).toBeTruthy()
    })

    it('should apply sanitization to readability-extracted content', async () => {
      const readabilityContent = `
        <article>
          <h1>Academic Paper</h1>
          <p>Research content</p>
          <script>maliciousCode()</script>
          <table data-table-id="methods">
            <thead><tr><th>Method</th><th>Accuracy</th></tr></thead>
            <tbody><tr><td>Bayesian</td><td>0.95</td></tr></tbody>
          </table>
        </article>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => `<html><body>${readabilityContent}</body></html>`
      } as Response)

      // Mock readability extraction
      jest.doMock('@/lib/utils/readability-extractor', () => ({
        extractWithReadability: jest.fn().mockReturnValue({
          title: 'Academic Paper',
          content: readabilityContent,
          textContent: 'Academic Paper Research content',
          siteName: 'Academic Site',
          byline: 'Author Name'
        }),
        formatReadabilityHtml: jest.fn().mockReturnValue(readabilityContent)
      }))

      const request = createRequest({
        url: 'https://academic-site.edu/paper',
        provider: 'claude',
        extractionMethod: 'readability'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const sanitizedHtml = responseData.document.html_content

      // Verify malicious content is removed while academic content is preserved
      expect(sanitizedHtml).not.toContain('<script>')
      expect(sanitizedHtml).not.toContain('maliciousCode')
      expect(sanitizedHtml).toContain('Academic Paper')
      expect(sanitizedHtml).toContain('data-table-id="methods"')
    })
  })

  describe('Integration - Sanitization Error Handling', () => {
    it('should return 422 error when sanitization fails', async () => {
      // Mock sanitizeAcademicContent to throw an error
      jest.doMock('@/lib/utils/html-sanitizer', () => ({
        sanitizeAcademicContent: jest.fn().mockImplementation(() => {
          throw new Error('Sanitization failed due to corrupted HTML structure')
        })
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => '<html><body>Content</body></html>'
      } as Response)

      mockExecutePrompt.mockResolvedValue({
        text: '<html><body>Extracted content</body></html>',
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://example.com/corrupted',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const response = await POST(request)
      expect(response.status).toBe(422)

      const errorText = await response.text()
      expect(errorText).toContain('Content could not be safely processed')
    })

    it('should return 413 error when extracted content is too large', async () => {
      // Mock sanitizer to throw size limit error
      jest.doMock('@/lib/utils/html-sanitizer', () => ({
        sanitizeAcademicContent: jest.fn().mockImplementation(() => {
          throw new Error('HTML content too large (55MB). Maximum size is 50MB')
        })
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => '<html><body>Small original</body></html>'
      } as Response)

      // Mock AI extraction returning very large content
      const largeContent = '<html><body>' + 'A'.repeat(55 * 1024 * 1024) + '</body></html>'
      mockExecutePrompt.mockResolvedValue({
        text: largeContent,
        usage: { totalTokens: 1000, promptTokens: 800, completionTokens: 200 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://example.com/large-extraction',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const response = await POST(request)
      expect(response.status).toBe(413)

      const errorText = await response.text()
      expect(errorText).toContain('too large to process safely')
    })
  })

  describe('Integration - Database Storage with Sanitization', () => {
    it('should store sanitized HTML with proper metadata and AI call tracking', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => '<html><body>Original webpage</body></html>'
      } as Response)

      mockExecutePrompt.mockResolvedValue({
        text: '<html><body><article><p>AI extracted content</p></article></body></html>',
        usage: { totalTokens: 120, promptTokens: 80, completionTokens: 40 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://example.edu/research',
        provider: 'gemini',
        extractionMethod: 'ai-transcription'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const documentId = responseData.document.id

      // Get document with AI call relationship
      const { data: dbDocument } = await supabase
        .from('documents')
        .select('*, ai_calls(*)')
        .eq('id', documentId)
        .single()

      expect(dbDocument).toBeTruthy()
      expect(dbDocument.upload_ai_call_id).toBeTruthy()
      expect(dbDocument.ai_calls).toBeTruthy()
      expect(dbDocument.ai_calls.prompt_type).toBe('url-to-html')

      // Verify metadata includes extraction info
      expect(dbDocument.upload_metadata).toMatchObject({
        extraction_method: 'ai-transcription',
        upload_source: 'url',
        provider_used: 'gemini'
      })
    })

    it('should handle readability extraction without creating AI call records', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => '<html><body>Webpage content</body></html>'
      } as Response)

      // Mock readability extraction
      jest.doMock('@/lib/utils/readability-extractor', () => ({
        extractWithReadability: jest.fn().mockReturnValue({
          title: 'Readability Extracted Title',
          content: '<h1>Readability Extracted Title</h1><p>Content extracted by readability</p>',
          textContent: 'Readability content text',
          siteName: 'Test Site',
          byline: 'Test Author'
        }),
        formatReadabilityHtml: jest.fn().mockReturnValue('<article><h1>Readability Extracted Title</h1><p>Content extracted by readability</p></article>')
      }))

      const request = createRequest({
        url: 'https://news-site.com/article',
        provider: 'claude',
        extractionMethod: 'readability'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const documentId = responseData.document.id

      // Get document from database
      const { data: dbDocument } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      expect(dbDocument).toBeTruthy()
      expect(dbDocument.upload_ai_call_id).toBeNull() // No AI call for readability
      expect(dbDocument.html_content).toContain('Readability Extracted Title')
      expect(dbDocument.upload_metadata.extraction_method).toBe('readability')
    })
  })
})