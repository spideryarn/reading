/**
 * @jest-environment node
 */
/**
 * Cross-API Sanitization Consistency Tests
 * 
 * Tests to ensure both upload-pdf and extract-url APIs apply identical
 * sanitization rules and produce consistent results. This validates that
 * storage-time sanitization works uniformly across all content input methods.
 */

import { POST as uploadPdfPost } from '../upload-pdf/route'
import { POST as extractUrlPost } from '../extract-url/route'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { sanitizeAcademicContent } from '@/lib/utils/html-sanitizer'
import { getTestNamespace, createTestEmail, createTestMetadata } from '@/lib/testing/test-isolation-utils'
import type { MockFileArrayBuffer, MockFormDataRequest } from './test-types'

// Mock dependencies
jest.mock('@/lib/prompts/types', () => ({
  executeMultimodalPromptWithUsage: jest.fn(),
  loadMultimodalPromptTemplateFromCaller: jest.fn()
}))

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

global.fetch = jest.fn()

import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { validateAuth } from '@/lib/auth/server-auth'

const mockExecutePrompt = executeMultimodalPromptWithUsage as jest.MockedFunction<typeof executeMultimodalPromptWithUsage>
const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Cross-API Sanitization Consistency', () => {
  const namespace = getTestNamespace('cross-api-sanitization')
  let supabase: any
  let documentService: DocumentService
  let testUserId: string

  beforeAll(async () => {
    // Set up real database connection
    supabase = await createClient()
    documentService = new DocumentService(supabase)
    
    // Create a test user profile
    testUserId = `test-user-${namespace}`
    const testEmail = createTestEmail(namespace, 'cross-test')
    
    await supabase.from('profiles').insert({
      id: testUserId,
      email: testEmail,
      full_name: 'Cross-API Test User',
      metadata: createTestMetadata(namespace)
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authentication to return our test user
    mockValidateAuth.mockResolvedValue({ id: testUserId, email: createTestEmail(namespace, 'cross-test') })
    
    // Default successful fetch mock for URL extraction
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: async () => '<html><body><p>Original webpage content</p></body></html>'
    } as Response)
  })

  afterAll(async () => {
    // Clean up test data
    await supabase.from('documents').delete().eq('user_id', testUserId)
    await supabase.from('ai_calls').delete().contains('input_data', { test_namespace: namespace })
    await supabase.from('profiles').delete().eq('id', testUserId)
  })

  const createPdfFormData = (filename: string, content: Buffer): FormData => {
    const formData = new FormData()
    const file = new File([content], filename, { type: 'application/pdf' })
    
    ;(file as MockFileArrayBuffer).arrayBuffer = jest.fn().mockResolvedValue(content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength))
    
    formData.append('pdf', file)
    return formData
  }

  const createPdfRequest = (formData: FormData): Request => {
    const request = new Request('http://localhost:3000/api/upload-pdf', {
      method: 'POST',
      body: formData
    })
    
    ;(request as MockFormDataRequest).formData = jest.fn().mockResolvedValue(formData)
    
    return request
  }

  const createUrlRequest = (body: any): Request => {
    return new Request('http://localhost:3000/api/extract-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
  }

  describe('Identical Sanitization Results', () => {
    it('should produce identical sanitized output for same academic content', async () => {
      const academicContent = `
        <!DOCTYPE html>
        <html>
        <head><title>Research Paper</title></head>
        <body>
          <article>
            <h1>Quantum Mechanics Study</h1>
            <p>This research examines quantum mechanical properties.</p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
              <mrow>
                <mi>ψ</mi>
                <mo>=</mo>
                <mfrac>
                  <mn>1</mn>
                  <msqrt>
                    <mn>2</mn>
                  </msqrt>
                </mfrac>
                <mrow>
                  <mo>(</mo>
                  <mi>|0⟩</mi>
                  <mo>+</mo>
                  <mi>|1⟩</mi>
                  <mo>)</mo>
                </mrow>
              </mrow>
            </math>
            <figure data-figure-id="quantum-state">
              <figcaption>
                <strong>Figure 1:</strong> Quantum superposition state
                <cite data-ref="bell1964">(Bell, 1964)</cite>
              </figcaption>
            </figure>
            <table data-table-id="measurements">
              <thead>
                <tr>
                  <th colspan="2">Quantum Measurements</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-state="spin-up">↑</td>
                  <td>0.707</td>
                </tr>
                <tr>
                  <td data-state="spin-down">↓</td>
                  <td>0.707</td>
                </tr>
              </tbody>
            </table>
          </article>
        </body>
        </html>
      `

      // Both APIs should return the same content when given identical input
      mockExecutePrompt.mockResolvedValue({
        text: academicContent,
        usage: { totalTokens: 200, promptTokens: 100, completionTokens: 100 },
        finishReason: 'stop'
      })

      // Test PDF upload API
      const pdfContent = Buffer.from('%PDF-1.4\ntest academic content')
      const pdfFormData = createPdfFormData('quantum-paper.pdf', pdfContent)
      const pdfRequest = createPdfRequest(pdfFormData)

      const pdfResponse = await uploadPdfPost(pdfRequest)
      expect(pdfResponse.status).toBe(201)
      const pdfData = await pdfResponse.json()

      // Test URL extraction API
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => academicContent
      } as Response)

      const urlRequest = createUrlRequest({
        url: 'https://quantum-research.edu/paper',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const urlResponse = await extractUrlPost(urlRequest)
      expect(urlResponse.status).toBe(201)
      const urlData = await urlResponse.json()

      // Both should produce identical sanitized HTML
      expect(pdfData.document.html_content).toEqual(urlData.document.html_content)

      // Verify academic content is preserved in both
      const pdfSanitized = pdfData.document.html_content
      const urlSanitized = urlData.document.html_content

      expect(pdfSanitized).toContain('<math')
      expect(pdfSanitized).toContain('<mfrac>')
      expect(pdfSanitized).toContain('data-figure-id="quantum-state"')
      expect(pdfSanitized).toContain('data-ref="bell1964"')
      expect(pdfSanitized).toContain('colspan="2"')
      expect(pdfSanitized).toContain('data-state="spin-up"')

      expect(urlSanitized).toContain('<math')
      expect(urlSanitized).toContain('<mfrac>')
      expect(urlSanitized).toContain('data-figure-id="quantum-state"')
      expect(urlSanitized).toContain('data-ref="bell1964"')
      expect(urlSanitized).toContain('colspan="2"')
      expect(urlSanitized).toContain('data-state="spin-up"')
    })

    it('should handle identical XSS attack vectors consistently', async () => {
      const maliciousContent = `
        <html>
        <body>
          <h1>Research Paper with Embedded Attacks</h1>
          <p>Legitimate research introduction.</p>
          <script>alert('XSS attack from both APIs')</script>
          <div onclick="alert('Click attack')">Interactive content</div>
          <img src="image.jpg" onerror="alert('Image error attack')" alt="Research diagram" />
          <iframe src="javascript:alert('Frame attack')">Fallback</iframe>
          <object data="data:text/html,<script>alert('Object attack')</script>"></object>
          <form action="https://attacker.com" method="post">
            <input type="hidden" name="data" value="stolen" />
            <button onclick="alert('Button attack')">Submit</button>
          </form>
          <p>Legitimate research conclusion.</p>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: maliciousContent,
        usage: { totalTokens: 180, promptTokens: 120, completionTokens: 60 },
        finishReason: 'stop'
      })

      // Test PDF upload API
      const pdfContent = Buffer.from('%PDF-1.4\nmalicious content')
      const pdfFormData = createPdfFormData('malicious.pdf', pdfContent)
      const pdfRequest = createPdfRequest(pdfFormData)

      const pdfResponse = await uploadPdfPost(pdfRequest)
      expect(pdfResponse.status).toBe(201)
      const pdfData = await pdfResponse.json()

      // Test URL extraction API
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => maliciousContent
      } as Response)

      const urlRequest = createUrlRequest({
        url: 'https://malicious-research.com/paper',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const urlResponse = await extractUrlPost(urlRequest)
      expect(urlResponse.status).toBe(201)
      const urlData = await urlResponse.json()

      // Both should produce identical sanitized HTML
      expect(pdfData.document.html_content).toEqual(urlData.document.html_content)

      // Verify identical XSS removal in both
      const pdfSanitized = pdfData.document.html_content
      const urlSanitized = urlData.document.html_content

      // Both should remove all dangerous elements
      for (const sanitized of [pdfSanitized, urlSanitized]) {
        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain('alert(')
        expect(sanitized).not.toContain('onclick')
        expect(sanitized).not.toContain('onerror')
        expect(sanitized).not.toContain('<iframe')
        expect(sanitized).not.toContain('<object')
        expect(sanitized).not.toContain('<form')
        expect(sanitized).not.toContain('<input')
        expect(sanitized).not.toContain('<button')
        expect(sanitized).not.toContain('javascript:')

        // Both should preserve legitimate content
        expect(sanitized).toContain('Research Paper with Embedded Attacks')
        expect(sanitized).toContain('Legitimate research introduction')
        expect(sanitized).toContain('Legitimate research conclusion')
        expect(sanitized).toContain('alt="Research diagram"')
      }
    })
  })

  describe('Consistent Error Handling', () => {
    it('should return identical error responses for sanitization failures', async () => {
      // Mock sanitizer to throw an error for both APIs
      const originalSanitize = jest.requireActual('@/lib/utils/html-sanitizer').sanitizeAcademicContent
      jest.doMock('@/lib/utils/html-sanitizer', () => ({
        sanitizeAcademicContent: jest.fn().mockImplementation(() => {
          throw new Error('Sanitization failed due to corrupted content structure')
        })
      }))

      const problematicContent = '<html><body>Content that causes sanitization to fail</body></html>'

      mockExecutePrompt.mockResolvedValue({
        text: problematicContent,
        usage: { totalTokens: 100, promptTokens: 50, completionTokens: 50 },
        finishReason: 'stop'
      })

      // Test PDF upload API
      const pdfContent = Buffer.from('%PDF-1.4\nproblematic content')
      const pdfFormData = createPdfFormData('problematic.pdf', pdfContent)
      const pdfRequest = createPdfRequest(pdfFormData)

      const pdfResponse = await uploadPdfPost(pdfRequest)
      expect(pdfResponse.status).toBe(422)
      const pdfError = await pdfResponse.text()

      // Test URL extraction API
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => problematicContent
      } as Response)

      const urlRequest = createUrlRequest({
        url: 'https://problematic-site.com/content',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const urlResponse = await extractUrlPost(urlRequest)
      expect(urlResponse.status).toBe(422)
      const urlError = await urlResponse.text()

      // Both should return same error status and similar messages
      expect(pdfResponse.status).toBe(urlResponse.status)
      expect(pdfError).toContain('Content could not be safely processed')
      expect(urlError).toContain('Content could not be safely processed')

      // Restore original implementation
      jest.doMock('@/lib/utils/html-sanitizer', () => ({
        sanitizeAcademicContent: originalSanitize
      }))
    })

    it('should handle content size limit errors consistently', async () => {
      // Mock sanitizer to throw size limit error
      jest.doMock('@/lib/utils/html-sanitizer', () => ({
        sanitizeAcademicContent: jest.fn().mockImplementation(() => {
          throw new Error('HTML content too large (55MB). Maximum size is 50MB')
        })
      }))

      const oversizedContent = '<html><body>' + 'A'.repeat(55 * 1024 * 1024) + '</body></html>'

      mockExecutePrompt.mockResolvedValue({
        text: oversizedContent,
        usage: { totalTokens: 1000, promptTokens: 800, completionTokens: 200 },
        finishReason: 'stop'
      })

      // Test PDF upload API
      const pdfContent = Buffer.from('%PDF-1.4\noversized content')
      const pdfFormData = createPdfFormData('oversized.pdf', pdfContent)
      const pdfRequest = createPdfRequest(pdfFormData)

      const pdfResponse = await uploadPdfPost(pdfRequest)
      expect(pdfResponse.status).toBe(413)
      const pdfError = await pdfResponse.text()

      // Test URL extraction API
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => '<html><body>Original content</body></html>'
      } as Response)

      const urlRequest = createUrlRequest({
        url: 'https://large-content-site.com/massive-page',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const urlResponse = await extractUrlPost(urlRequest)
      expect(urlResponse.status).toBe(413)
      const urlError = await urlResponse.text()

      // Both should return 413 status
      expect(pdfResponse.status).toBe(urlResponse.status)
      expect(pdfError).toContain('too large to process safely')
      expect(urlError).toContain('too large to process safely')
    })
  })

  describe('Database Storage Consistency', () => {
    it('should store sanitized content with identical structure in database', async () => {
      const testContent = `
        <html>
        <body>
          <article>
            <h1>Cross-API Consistency Test</h1>
            <p>This content tests database storage consistency.</p>
            <script>console.log('should be removed')</script>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
              <mrow>
                <mi>x</mi>
                <mo>=</mo>
                <mn>42</mn>
              </mrow>
            </math>
            <table data-test="consistency">
              <tr>
                <td colspan="2">Test Data</td>
              </tr>
            </table>
          </article>
        </body>
        </html>
      `

      mockExecutePrompt.mockResolvedValue({
        text: testContent,
        usage: { totalTokens: 150, promptTokens: 100, completionTokens: 50 },
        finishReason: 'stop'
      })

      // Test PDF upload API
      const pdfContent = Buffer.from('%PDF-1.4\nconsistency test')
      const pdfFormData = createPdfFormData('consistency-test.pdf', pdfContent)
      const pdfRequest = createPdfRequest(pdfFormData)

      const pdfResponse = await uploadPdfPost(pdfRequest)
      expect(pdfResponse.status).toBe(201)
      const pdfData = await pdfResponse.json()

      // Test URL extraction API
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => testContent
      } as Response)

      const urlRequest = createUrlRequest({
        url: 'https://consistency-test.edu/paper',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const urlResponse = await extractUrlPost(urlRequest)
      expect(urlResponse.status).toBe(201)
      const urlData = await urlResponse.json()

      // Get both documents from database
      const { data: pdfDoc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', pdfData.document.id)
        .single()

      const { data: urlDoc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', urlData.document.id)
        .single()

      expect(pdfDoc).toBeTruthy()
      expect(urlDoc).toBeTruthy()

      // Both should have identical sanitized content structure
      expect(pdfDoc.html_content).toEqual(urlDoc.html_content)

      // Verify sanitization occurred identically
      for (const doc of [pdfDoc, urlDoc]) {
        expect(doc.html_content).not.toContain('<script>')
        expect(doc.html_content).toContain('<math')
        expect(doc.html_content).toContain('data-test="consistency"')
        expect(doc.html_content).toContain('colspan="2"')
        expect(doc.html_content).toContain('Cross-API Consistency Test')
      }

      // Verify different upload metadata but same content treatment
      expect(pdfDoc.upload_metadata.upload_source).toBe('pdf')
      expect(urlDoc.upload_metadata.upload_source).toBe('url')
      expect(pdfDoc.upload_metadata.extraction_method).toBe('ai-transcription')
      expect(urlDoc.upload_metadata.extraction_method).toBe('ai-transcription')
    })
  })

  describe('Direct Sanitizer Consistency', () => {
    it('should produce identical results when calling sanitizer directly', () => {
      const testCases = [
        // Academic content with potential XSS
        `<article>
          <h1>Research</h1>
          <script>attack()</script>
          <math><mi>x</mi></math>
          <p onclick="malicious()">Text</p>
        </article>`,
        
        // Complex table with dangerous attributes
        `<table data-safe="yes" onclick="dangerous()">
          <thead>
            <tr>
              <th colspan="2" onload="attack()">Headers</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-value="safe">Data</td>
              <td><script>evil()</script>More data</td>
            </tr>
          </tbody>
        </table>`,
        
        // MathML with embedded scripts
        `<math xmlns="http://www.w3.org/1998/Math/MathML">
          <mrow>
            <mi>E</mi>
            <mo>=</mo>
            <script>malicious()</script>
            <msup>
              <mi>mc</mi>
              <mn onclick="attack()">2</mn>
            </msup>
          </mrow>
        </math>`,
        
        // Figures with citations and XSS
        `<figure data-fig="test">
          <script>stealData()</script>
          <figcaption onclick="xss()">
            <strong>Figure 1:</strong> Description
            <cite data-ref="valid" onclick="malicious()">Citation</cite>
          </figcaption>
        </figure>`
      ]

      for (const testHtml of testCases) {
        // Call sanitizer multiple times - should always return identical results
        const result1 = sanitizeAcademicContent(testHtml)
        const result2 = sanitizeAcademicContent(testHtml)
        const result3 = sanitizeAcademicContent(testHtml)

        expect(result1).toEqual(result2)
        expect(result2).toEqual(result3)

        // All should remove scripts and dangerous event handlers
        expect(result1).not.toContain('<script>')
        expect(result1).not.toContain('onclick')
        expect(result1).not.toContain('onload')
        expect(result1).not.toContain('attack()')
        expect(result1).not.toContain('malicious()')
        expect(result1).not.toContain('evil()')
        expect(result1).not.toContain('stealData()')
        expect(result1).not.toContain('xss()')

        // Should preserve academic elements and safe attributes
        if (testHtml.includes('<math')) {
          expect(result1).toContain('<math')
        }
        if (testHtml.includes('data-safe="yes"')) {
          expect(result1).toContain('data-safe="yes"')
        }
        if (testHtml.includes('data-ref="valid"')) {
          expect(result1).toContain('data-ref="valid"')
        }
        if (testHtml.includes('colspan="2"')) {
          expect(result1).toContain('colspan="2"')
        }
      }
    })

    it('should handle edge cases consistently', () => {
      const edgeCases = [
        '', // Empty string
        '<html></html>', // Minimal HTML
        '<script></script>', // Pure script tag
        '<p>Safe text only</p>', // Safe content only
        'Plain text without tags', // No HTML tags
        '<div data-test="value">Content</div>', // Safe attributes only
        '<math><mrow><mi>x</mi></mrow></math>', // Pure MathML
        '&lt;script&gt;alert()&lt;/script&gt;' // Encoded dangerous content
      ]

      for (const testCase of edgeCases) {
        // Multiple calls should be consistent
        const result1 = sanitizeAcademicContent(testCase)
        const result2 = sanitizeAcademicContent(testCase)

        expect(result1).toEqual(result2)

        // Verify no dangerous content survives even in edge cases
        expect(result1).not.toContain('alert(')
        expect(result1).not.toContain('javascript:')
        
        // Empty input should return empty output
        if (testCase === '') {
          expect(result1).toBe('')
        }
      }
    })
  })
})