/**
 * @jest-environment node
 */
/**
 * PDF Upload API Sanitization Integration Tests
 * 
 * Comprehensive tests for storage-time HTML sanitization in the PDF upload API.
 * Tests the full flow from PDF upload through AI processing, sanitization, 
 * and database storage with real database integration.
 */

import { POST } from '../upload-pdf/route'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { getTestNamespace, createTestEmail, createTestMetadata } from '@/lib/testing/test-isolation-utils'
import type { MockFileArrayBuffer, MockFormDataRequest } from './test-types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

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
  generateSlug: jest.fn().mockImplementation((text: string) => text.toLowerCase().replace(/\s+/g, '-').slice(0, 50))
}))

import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { validateAuth } from '@/lib/auth/server-auth'

const mockExecutePrompt = executeMultimodalPromptWithUsage as jest.MockedFunction<typeof executeMultimodalPromptWithUsage>
const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>

describe('PDF Upload API - Sanitization Integration', () => {
  const namespace = getTestNamespace('upload-pdf-sanitization')
  let supabase: SupabaseClient<Database>
  let documentService: DocumentService
  let testUserId: string

  beforeAll(async () => {
    // Set up real database connection
    supabase = await createClient()
    documentService = new DocumentService(supabase)
    
    // Create a test user profile
    testUserId = `test-user-${namespace}`
    const testEmail = createTestEmail(namespace, 'upload-test')
    
    await supabase.from('profiles').insert({
      id: testUserId,
      email: testEmail,
      full_name: 'Upload Test User',
      metadata: createTestMetadata(namespace)
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authentication to return our test user
    mockValidateAuth.mockResolvedValue({ id: testUserId, email: createTestEmail(namespace, 'upload-test') })
    
    // Default successful mock for Claude processing
    mockExecutePrompt.mockResolvedValue({
      text: '<html><body><p>Clean content</p></body></html>',
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

  const createFormData = (filename: string, content: Buffer, mimeType: string = 'application/pdf') => {
    const formData = new FormData()
    const file = new File([content], filename, { type: mimeType })
    
    // Mock the arrayBuffer method that Jest's File doesn't have
    ;(file as MockFileArrayBuffer).arrayBuffer = jest.fn().mockResolvedValue(content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength))
    
    formData.append('pdf', file)
    return formData
  }

  const createRequest = (formData: FormData): Request => {
    const request = new Request('http://localhost:3000/api/upload-pdf', {
      method: 'POST',
      body: formData
    })
    
    // Add the formData method that Jest doesn't provide by default
    ;(request as MockFormDataRequest).formData = jest.fn().mockResolvedValue(formData)
    
    return request
  }

  describe('Academic Content Preservation During Sanitization', () => {
    it('should preserve MathML and academic formatting in sanitized HTML', async () => {
      const academicContent = `
        <!DOCTYPE html>
        <html>
        <head><title>Academic Paper</title></head>
        <body>
          <article>
            <h1>Research Paper</h1>
            <p>This equation demonstrates the relationship:</p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
              <mrow>
                <mi>E</mi>
                <mo>=</mo>
                <mi>m</mi>
                <msup>
                  <mi>c</mi>
                  <mn>2</mn>
                </msup>
              </mrow>
            </math>
            <figure data-figure-id="fig1">
              <figcaption>
                <strong>Figure 1:</strong> Scientific diagram
                <cite data-ref="citation1">(Smith et al., 2024)</cite>
              </figcaption>
            </figure>
            <table data-table-id="results1">
              <thead>
                <tr>
                  <th colspan="2">Results</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-condition="control">Control</td>
                  <td>4.23 ± 0.45</td>
                </tr>
              </tbody>
            </table>
          </article>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: academicContent,
        usage: { totalTokens: 200, promptTokens: 100, completionTokens: 100 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\nacademic content')
      const formData = createFormData('academic-paper.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)

      // Verify sanitized content preserves academic elements
      const sanitizedHtml = responseData.document.html_content
      expect(sanitizedHtml).toContain('<math')
      expect(sanitizedHtml).toContain('<mrow>')
      expect(sanitizedHtml).toContain('<msup>')
      expect(sanitizedHtml).toContain('<figure')
      expect(sanitizedHtml).toContain('data-figure-id="fig1"')
      expect(sanitizedHtml).toContain('<cite')
      expect(sanitizedHtml).toContain('data-ref="citation1"')
      expect(sanitizedHtml).toContain('colspan="2"')
      expect(sanitizedHtml).toContain('data-condition="control"')

      // Verify document was stored in database with sanitized content
      const document = await documentService.getDocumentBySlug(responseData.document.slug, testUserId)
      expect(document).toBeTruthy()
      expect(document!.html_content).toContain('<math')
      expect(document!.html_content).toContain('<figure')
    })

    it('should preserve complex table structures with academic metadata', async () => {
      const complexTableContent = `
        <html>
        <body>
          <table data-table-id="stats-table">
            <caption>
              <strong>Table 2:</strong> Statistical analysis of experimental data
            </caption>
            <thead>
              <tr>
                <th rowspan="2">Variable</th>
                <th colspan="3">Group A</th>
                <th colspan="3">Group B</th>
              </tr>
              <tr>
                <th>Mean</th>
                <th>SD</th>
                <th>p-value</th>
                <th>Mean</th>
                <th>SD</th>
                <th>p-value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-variable="height">Height (cm)</td>
                <td>175.2</td>
                <td>8.4</td>
                <td>&lt; 0.001</td>
                <td>172.8</td>
                <td>9.1</td>
                <td>0.023</td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: complexTableContent,
        usage: { totalTokens: 150, promptTokens: 75, completionTokens: 75 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\ntable content')
      const formData = createFormData('statistical-table.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const sanitizedHtml = responseData.document.html_content

      // Verify complex table structure is preserved
      expect(sanitizedHtml).toContain('data-table-id="stats-table"')
      expect(sanitizedHtml).toContain('<caption>')
      expect(sanitizedHtml).toContain('rowspan="2"')
      expect(sanitizedHtml).toContain('colspan="3"')
      expect(sanitizedHtml).toContain('data-variable="height"')
      expect(sanitizedHtml).toContain('&lt; 0.001') // HTML entities preserved
    })
  })

  describe('XSS Prevention and Malicious Content Removal', () => {
    it('should remove script tags and event handlers while preserving content', async () => {
      const maliciousContent = `
        <html>
        <body>
          <h1>Research Paper</h1>
          <p>Safe academic content here.</p>
          <script>alert('XSS attack!')</script>
          <p onclick="maliciousFunction()">Click here for results</p>
          <img src="test.jpg" onerror="alert('Another XSS')" alt="Figure 1" />
          <div onload="stealData()">More content</div>
          <iframe src="javascript:alert('XSS')"></iframe>
          <p>More safe content.</p>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: maliciousContent,
        usage: { totalTokens: 180, promptTokens: 90, completionTokens: 90 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\nmalicious content')
      const formData = createFormData('suspicious.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const sanitizedHtml = responseData.document.html_content

      // Verify malicious elements are removed
      expect(sanitizedHtml).not.toContain('<script>')
      expect(sanitizedHtml).not.toContain('alert(')
      expect(sanitizedHtml).not.toContain('onclick')
      expect(sanitizedHtml).not.toContain('onerror')
      expect(sanitizedHtml).not.toContain('onload')
      expect(sanitizedHtml).not.toContain('<iframe')
      expect(sanitizedHtml).not.toContain('javascript:')

      // Verify safe content is preserved
      expect(sanitizedHtml).toContain('Research Paper')
      expect(sanitizedHtml).toContain('Safe academic content')
      expect(sanitizedHtml).toContain('More safe content')
      expect(sanitizedHtml).toContain('alt="Figure 1"') // Safe attributes preserved

      // Verify database storage
      const document = await documentService.getDocumentBySlug(responseData.document.slug, testUserId)
      expect(document!.html_content).not.toContain('<script>')
      expect(document!.html_content).toContain('Safe academic content')
    })

    it('should handle multiple XSS attack vectors', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')" />',
        '<a href="javascript:alert(\'xss\')">link</a>',
        '<div onclick="alert(\'xss\')">click</div>',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
        '<object data="data:text/html,<script>alert(\'xss\')</script>"></object>',
        '<svg onload="alert(\'xss\')"><circle r="5"/></svg>',
        '<form><input type="text" onfocus="alert(\'xss\')" /></form>'
      ]

      const maliciousHtml = `
        <html>
        <body>
          <h1>Test Document</h1>
          <p>Before attacks</p>
          ${xssPayloads.join('\n')}
          <p>After attacks</p>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: maliciousHtml,
        usage: { totalTokens: 200, promptTokens: 100, completionTokens: 100 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\nmultiple xss')
      const formData = createFormData('xss-test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const sanitizedHtml = responseData.document.html_content

      // Verify all XSS vectors are neutralized
      expect(sanitizedHtml).not.toContain('alert(')
      expect(sanitizedHtml).not.toContain('javascript:')
      expect(sanitizedHtml).not.toContain('<script>')
      expect(sanitizedHtml).not.toContain('<iframe')
      expect(sanitizedHtml).not.toContain('<object')
      expect(sanitizedHtml).not.toContain('<form')
      expect(sanitizedHtml).not.toContain('onerror')
      expect(sanitizedHtml).not.toContain('onclick')
      expect(sanitizedHtml).not.toContain('onfocus')
      expect(sanitizedHtml).not.toContain('onload')

      // Verify safe content remains
      expect(sanitizedHtml).toContain('Test Document')
      expect(sanitizedHtml).toContain('Before attacks')
      expect(sanitizedHtml).toContain('After attacks')
    })
  })

  describe('Sanitization Error Handling', () => {
    it('should return 422 error when sanitization fails', async () => {
      // Mock sanitizeAcademicContent to throw an error
      const originalSanitize = jest.requireActual('@/lib/utils/html-sanitizer').sanitizeAcademicContent
      jest.doMock('@/lib/utils/html-sanitizer', () => ({
        sanitizeAcademicContent: jest.fn().mockImplementation(() => {
          throw new Error('Sanitization failed due to invalid content structure')
        })
      }))

      mockExecutePrompt.mockResolvedValue({
        text: '<html><body>Content</body></html>',
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(422)

      const errorText = await response.text()
      expect(errorText).toContain('Content could not be safely processed')

      // Restore original implementation
      jest.doMock('@/lib/utils/html-sanitizer', () => ({
        sanitizeAcademicContent: originalSanitize
      }))
    })

    it('should return 413 error when content is too large for sanitization', async () => {
      // Mock sanitizer to throw size limit error
      jest.doMock('@/lib/utils/html-sanitizer', () => ({
        sanitizeAcademicContent: jest.fn().mockImplementation(() => {
          throw new Error('HTML content too large (60MB). Maximum size is 50MB')
        })
      }))

      // Mock very large content
      const largeContent = '<html><body>' + 'A'.repeat(60 * 1024 * 1024) + '</body></html>'
      mockExecutePrompt.mockResolvedValue({
        text: largeContent,
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\nlarge content')
      const formData = createFormData('large.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(413)

      const errorText = await response.text()
      expect(errorText).toContain('too large to process safely')
    })
  })

  describe('Database Storage Integration', () => {
    it('should store sanitized HTML in html_content field', async () => {
      const originalContent = `
        <html>
        <body>
          <h1>Test Paper</h1>
          <p>Academic content</p>
          <script>console.log('should be removed')</script>
          <math><mi>x</mi></math>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: originalContent,
        usage: { totalTokens: 120, promptTokens: 60, completionTokens: 60 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\ntest content')
      const formData = createFormData('storage-test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const documentId = responseData.document.id

      // Verify document in database
      const { data: dbDocument } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      expect(dbDocument).toBeTruthy()
      expect(dbDocument.html_content).toBeTruthy()
      
      // Verify sanitization occurred (script removed, math preserved)
      expect(dbDocument.html_content).not.toContain('<script>')
      expect(dbDocument.html_content).toContain('<math>')
      expect(dbDocument.html_content).toContain('Academic content')

      // Verify metadata includes sanitization info
      expect(dbDocument.upload_metadata).toMatchObject({
        extraction_method: 'ai-transcription',
        upload_source: 'pdf'
      })
    })

    it('should maintain referential integrity with AI calls', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: '<html><body><p>Test content</p></body></html>',
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\nintegrity test')
      const formData = createFormData('integrity-test.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const documentId = responseData.document.id

      // Get document from database
      const { data: dbDocument } = await supabase
        .from('documents')
        .select('*, ai_calls(*)')
        .eq('id', documentId)
        .single()

      expect(dbDocument).toBeTruthy()
      expect(dbDocument.upload_ai_call_id).toBeTruthy()
      expect(dbDocument.ai_calls).toBeTruthy()
      expect(dbDocument.ai_calls.prompt_type).toBe('pdf-to-html')
      expect(dbDocument.ai_calls.usage).toMatchObject({
        totalTokens: 100,
        promptTokens: 50,
        completionTokens: 50
      })
    })
  })

  describe('Performance and Size Limits', () => {
    it('should handle large but valid HTML content', async () => {
      // Create content that's large but within limits (5MB)
      const largeValidContent = `
        <html>
        <body>
          <article>
            <h1>Large Research Paper</h1>
            <p>${'Academic text content. '.repeat(100000)}</p>
            <math><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></math>
          </article>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: largeValidContent,
        usage: { totalTokens: 500, promptTokens: 250, completionTokens: 250 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\nlarge valid content')
      const formData = createFormData('large-valid.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.document.html_content).toContain('Large Research Paper')
      expect(responseData.document.html_content).toContain('<math>')
    })

    it('should preserve academic content while removing non-essential elements', async () => {
      const mixedContent = `
        <html>
        <head>
          <style>body { color: red; }</style>
          <script>analytics.track()</script>
        </head>
        <body>
          <nav>Navigation</nav>
          <main>
            <article>
              <h1>Research Title</h1>
              <p>Important academic content</p>
              <math><mi>x</mi><mo>=</mo><mn>42</mn></math>
              <figure>
                <img src="diagram.svg" alt="Important diagram" />
                <figcaption>Figure 1: Critical results</figcaption>
              </figure>
            </article>
          </main>
          <footer>Footer content</footer>
          <script>moreAnalytics()</script>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: mixedContent,
        usage: { totalTokens: 200, promptTokens: 100, completionTokens: 100 },
        finishReason: 'stop'
      })

      const pdfContent = Buffer.from('%PDF-1.4\nmixed content')
      const formData = createFormData('mixed-content.pdf', pdfContent)
      const request = createRequest(formData)

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const sanitizedHtml = responseData.document.html_content

      // Academic content should be preserved
      expect(sanitizedHtml).toContain('Research Title')
      expect(sanitizedHtml).toContain('Important academic content')
      expect(sanitizedHtml).toContain('<math>')
      expect(sanitizedHtml).toContain('<figure>')
      expect(sanitizedHtml).toContain('<figcaption>')
      expect(sanitizedHtml).toContain('alt="Important diagram"')

      // Non-academic/dangerous content should be removed
      expect(sanitizedHtml).not.toContain('<script>')
      expect(sanitizedHtml).not.toContain('analytics')
      expect(sanitizedHtml).not.toContain('<style>') // Inline styles removed
    })
  })
})