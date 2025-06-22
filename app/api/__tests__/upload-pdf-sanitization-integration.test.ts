/**
 * @jest-environment node
 */
/**
 * PDF Upload API Sanitization Integration Tests
 * 
 * Minimal integration tests verifying that sanitization is properly applied 
 * during PDF upload flow. Core sanitization logic is tested in
 * lib/utils/__tests__/html-sanitizer.test.ts
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

  describe('Integration - Basic Sanitization Flow', () => {
    it('should apply sanitization to AI-extracted PDF content and store sanitized HTML', async () => {
      // AI extraction returns content with both safe academic and dangerous elements
      const extractedContent = `
        <html>
        <body>
          <article>
            <h1>Research Paper</h1>
            <p>Academic content</p>
            <script>console.log('dangerous')</script>
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
          </article>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: extractedContent,
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

      // Verify sanitization occurred (script removed, academic content preserved)
      const sanitizedHtml = responseData.document.html_content
      expect(sanitizedHtml).not.toContain('<script>')
      expect(sanitizedHtml).toContain('<math')
      expect(sanitizedHtml).toContain('<figure')
      expect(sanitizedHtml).toContain('data-figure-id="fig1"')
      expect(sanitizedHtml).toContain('Academic content')

      // Verify database storage by checking the document was created successfully
      expect(responseData.document.id).toBeTruthy()
      expect(responseData.document.slug).toBeTruthy()
    })

    it('should remove malicious content while preserving safe academic elements', async () => {
      const maliciousContent = `
        <html>
        <body>
          <h1>Research Paper</h1>
          <p>Safe academic content here.</p>
          <script>alert('XSS attack!')</script>
          <p onclick="maliciousFunction()">Click here for results</p>
          <img src="test.jpg" onerror="alert('Another XSS')" alt="Figure 1" />
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
      expect(sanitizedHtml).not.toContain('<iframe')
      expect(sanitizedHtml).not.toContain('javascript:')

      // Verify safe content is preserved
      expect(sanitizedHtml).toContain('Research Paper')
      expect(sanitizedHtml).toContain('Safe academic content')
      expect(sanitizedHtml).toContain('More safe content')
      expect(sanitizedHtml).toContain('alt="Figure 1"') // Safe attributes preserved
    })
  })

  describe('Integration - Sanitization Error Handling', () => {
    it('should return 422 error when sanitization fails', async () => {
      // Mock sanitizeAcademicContent to throw an error
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

  describe('Integration - Database Storage with Sanitization', () => {
    it('should store sanitized HTML with proper metadata and AI call tracking', async () => {
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

      // Verify document in database with AI call relationship
      const { data: dbDocument } = await supabase
        .from('documents')
        .select('*, ai_calls(*)')
        .eq('id', documentId)
        .single()

      expect(dbDocument).toBeTruthy()
      expect(dbDocument.html_content).toBeTruthy()
      
      // Verify sanitization occurred (script removed, math preserved)
      expect(dbDocument.html_content).not.toContain('<script>')
      expect(dbDocument.html_content).toContain('<math>')
      expect(dbDocument.html_content).toContain('Academic content')

      // Verify AI call integration
      expect(dbDocument.upload_ai_call_id).toBeTruthy()
      expect(dbDocument.ai_calls).toBeTruthy()
      expect(dbDocument.ai_calls.prompt_type).toBe('pdf-to-html')

      // Verify metadata includes sanitization info
      expect(dbDocument.upload_metadata).toMatchObject({
        extraction_method: 'ai-transcription',
        upload_source: 'pdf'
      })
    })
  })
})