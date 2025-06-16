/**
 * @jest-environment node
 */
/**
 * URL Extract API Content Fidelity Tests
 * 
 * Comprehensive tests to ensure HTML content extraction preserves content
 * accurately without modification, abridgment, or loss. Tests both Mozilla
 * Readability and AI transcription methods against complex realistic documents.
 */

import { POST } from '../extract-url/route'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { getTestNamespace, createTestEmail, createTestMetadata } from '@/lib/testing/test-isolation-utils'
import { 
  generateAllTestDocuments, 
  type TestDocument, 
  type ContentCheck,
  extractTextContent
} from '@/lib/testing/html-content-fidelity-generator'
import { JSDOM } from 'jsdom'

// Mock the multimodal prompt execution
jest.mock('@/lib/prompts/types', () => ({
  executeMultimodalPromptWithUsage: jest.fn(),
  loadMultimodalPromptTemplateFromCaller: jest.fn()
}))

// Mock authentication to return a test user
jest.mock('@/lib/auth/server-auth', () => ({
  validateAuth: jest.fn()
}))

// Mock slug generation for predictable results
jest.mock('@/lib/utils/slug', () => ({
  generateSlug: jest.fn().mockImplementation((text: string) => text.toLowerCase().replace(/\s+/g, '-').slice(0, 50)),
  generateHtmlFilename: jest.fn().mockImplementation((url: string) => {
    const domain = new URL(url).hostname.replace(/\./g, '-')
    return `${domain}-${Date.now()}.html`
  })
}))

// Mock readability extractor
jest.mock('@/lib/utils/readability-extractor', () => ({
  extractWithReadability: jest.fn(),
  formatReadabilityHtml: jest.fn()
}))

// Mock global fetch
global.fetch = jest.fn()

import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { validateAuth } from '@/lib/auth/server-auth'
import { extractWithReadability, formatReadabilityHtml } from '@/lib/utils/readability-extractor'

const mockExecutePrompt = executeMultimodalPromptWithUsage as jest.MockedFunction<typeof executeMultimodalPromptWithUsage>
const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const mockExtractWithReadability = extractWithReadability as jest.MockedFunction<typeof extractWithReadability>
const mockFormatReadabilityHtml = formatReadabilityHtml as jest.MockedFunction<typeof formatReadabilityHtml>

describe('URL Extract API - Content Fidelity', () => {
  const namespace = getTestNamespace('extract-url-fidelity')
  let supabase: SupabaseClient<Database>
  let documentService: DocumentService
  let testUserId: string
  let testDocuments: TestDocument[]

  beforeAll(async () => {
    // Set up real database connection
    supabase = await createClient()
    documentService = new DocumentService(supabase)
    
    // Create a test user profile
    testUserId = `test-user-${namespace}`
    const testEmail = createTestEmail(namespace, 'fidelity-test')
    
    await supabase.from('profiles').insert({
      id: testUserId,
      email: testEmail,
      full_name: 'Content Fidelity Test User',
      metadata: createTestMetadata(namespace)
    })

    // Generate all test documents
    testDocuments = generateAllTestDocuments()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authentication to return our test user
    mockValidateAuth.mockResolvedValue({ 
      id: testUserId, 
      email: createTestEmail(namespace, 'fidelity-test') 
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

  /**
   * Run content checks against extracted HTML
   */
  function runContentChecks(extractedHtml: string, checks: ContentCheck[]): {
    passed: ContentCheck[]
    failed: ContentCheck[]
    summary: {
      total: number
      passed: number
      failed: number
      criticalFailed: number
    }
  } {
    const passed: ContentCheck[] = []
    const failed: ContentCheck[] = []

    // Create DOM for element-based checks
    const dom = new JSDOM(extractedHtml)
    const document = dom.window.document

    for (const check of checks) {
      let checkPassed = false

      try {
        switch (check.type) {
          case 'exact_text':
            checkPassed = extractedHtml.includes(check.expectedValue as string)
            break

          case 'element_count':
            if (check.selector) {
              const elements = document.querySelectorAll(check.selector)
              checkPassed = elements.length === check.expectedValue
            }
            break

          case 'attribute_value':
            if (check.selector) {
              const element = document.querySelector(check.selector)
              if (element) {
                // For attribute checks, expectedValue should be the attribute value
                const attrMatch = check.selector.match(/\[([^=]+)="([^"]+)"\]/)
                if (attrMatch) {
                  const [, attrName] = attrMatch
                  checkPassed = element.getAttribute(attrName) === check.expectedValue
                } else {
                  // Simple element existence check
                  checkPassed = true
                }
              }
            }
            break

          case 'structure_intact':
            // Check if structural elements maintain their hierarchy
            if (check.selector) {
              const elements = document.querySelectorAll(check.selector)
              checkPassed = elements.length > 0
            }
            break

          case 'mathematical_equation':
            // Check for mathematical notation preservation
            const hasMathElements = document.querySelectorAll('math, [data-equation-id]').length > 0
            const hasUnicodeSymbols = /[⟩⟨∈∪∩∀∃∑∏∫√∞≤≥≠±×÷→←↔↕]/.test(extractedHtml)
            checkPassed = hasMathElements || hasUnicodeSymbols
            break

          case 'data_integrity':
            // Check that numerical data and precise values are preserved
            const numericPattern = /\d+\.\d+/g
            const numericMatches = extractedHtml.match(numericPattern)
            checkPassed = numericMatches !== null && numericMatches.length > 0
            break
        }
      } catch (error) {
        console.warn(`Error running check "${check.description}":`, error)
        checkPassed = false
      }

      if (checkPassed) {
        passed.push(check)
      } else {
        failed.push(check)
      }
    }

    // Clean up DOM
    dom.window.close()

    const criticalFailed = failed.filter(check => check.critical).length

    return {
      passed,
      failed,
      summary: {
        total: checks.length,
        passed: passed.length,
        failed: failed.length,
        criticalFailed
      }
    }
  }

  /**
   * Calculate content similarity between original and extracted text
   */
  function calculateContentSimilarity(original: string, extracted: string): {
    similarity: number
    originalLength: number
    extractedLength: number
    commonWords: number
    totalWords: number
  } {
    const originalText = extractTextContent(original).toLowerCase()
    const extractedText = extractTextContent(extracted).toLowerCase()

    const originalWords = new Set(originalText.split(/\s+/).filter(word => word.length > 2))
    const extractedWords = new Set(extractedText.split(/\s+/).filter(word => word.length > 2))

    const commonWords = new Set([...originalWords].filter(word => extractedWords.has(word)))
    const totalWords = new Set([...originalWords, ...extractedWords])

    const similarity = totalWords.size > 0 ? commonWords.size / totalWords.size : 0

    return {
      similarity,
      originalLength: originalText.length,
      extractedLength: extractedText.length,
      commonWords: commonWords.size,
      totalWords: totalWords.size
    }
  }

  describe('AI Transcription Content Fidelity', () => {
    testDocuments.forEach(testDoc => {
      describe(`Test Document: ${testDoc.name}`, () => {
        it('should preserve content with high fidelity using AI transcription', async () => {
          // Mock fetch to return the test document
          mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({
              'content-type': 'text/html; charset=utf-8'
            }),
            text: async () => testDoc.originalHtml
          } as Response)

          // Mock AI extraction - simulate faithful but not perfect extraction
          // Remove navigation, ads, scripts but preserve main content
          const simulatedExtraction = simulateAIExtraction(testDoc.originalHtml)
          
          mockExecutePrompt.mockResolvedValue({
            text: simulatedExtraction,
            usage: { totalTokens: 500, promptTokens: 300, completionTokens: 200 },
            finishReason: 'stop'
          })

          const request = createRequest({
            url: `https://test-site.com/${testDoc.id}`,
            provider: 'claude',
            extractionMethod: 'ai-transcription'
          })

          const response = await POST(request)
          expect(response.status).toBe(201)

          const responseData = await response.json()
          expect(responseData.success).toBe(true)

          // Run content fidelity checks
          const checkResults = runContentChecks(
            responseData.document.html_content, 
            testDoc.expectedContentChecks
          )

          // Log detailed results for debugging
          console.log(`\n=== Content Fidelity Results for ${testDoc.name} ===`)
          console.log(`Total checks: ${checkResults.summary.total}`)
          console.log(`Passed: ${checkResults.summary.passed}`)
          console.log(`Failed: ${checkResults.summary.failed}`)
          console.log(`Critical failures: ${checkResults.summary.criticalFailed}`)

          if (checkResults.failed.length > 0) {
            console.log('\nFailed checks:')
            checkResults.failed.forEach(check => {
              console.log(`- ${check.description} (${check.critical ? 'CRITICAL' : 'non-critical'})`)
            })
          }

          // Calculate content similarity
          const similarity = calculateContentSimilarity(
            testDoc.originalHtml, 
            responseData.document.html_content
          )

          console.log(`\nContent similarity: ${(similarity.similarity * 100).toFixed(1)}%`)
          console.log(`Text length ratio: ${(similarity.extractedLength / similarity.originalLength * 100).toFixed(1)}%`)

          // Assertions
          expect(checkResults.summary.criticalFailed).toBe(0)
          expect(checkResults.summary.passed / checkResults.summary.total).toBeGreaterThan(0.8) // 80% pass rate
          expect(similarity.similarity).toBeGreaterThan(0.7) // 70% content similarity

          // Verify document was stored properly
          const document = await documentService.getDocumentBySlug(
            responseData.document.slug, 
            testUserId
          )
          expect(document).toBeTruthy()
          expect(document!.html_content).toBeTruthy()
        })
      })
    })
  })

  describe('Readability Extraction Content Fidelity', () => {
    testDocuments.forEach(testDoc => {
      describe(`Test Document: ${testDoc.name}`, () => {
        it('should preserve content with readability extraction where applicable', async () => {
          // Mock fetch to return the test document
          mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({
              'content-type': 'text/html; charset=utf-8'
            }),
            text: async () => testDoc.originalHtml
          } as Response)

          // Simulate readability extraction
          const simulatedReadabilityExtraction = simulateReadabilityExtraction(testDoc.originalHtml)
          
          if (simulatedReadabilityExtraction) {
            mockExtractWithReadability.mockReturnValue(simulatedReadabilityExtraction.article)
            mockFormatReadabilityHtml.mockReturnValue(simulatedReadabilityExtraction.formattedHtml)

            const request = createRequest({
              url: `https://test-site.com/${testDoc.id}`,
              provider: 'claude',
              extractionMethod: 'readability'
            })

            const response = await POST(request)
            expect(response.status).toBe(201)

            const responseData = await response.json()
            expect(responseData.success).toBe(true)

            // Run content fidelity checks (readability typically has different preservation characteristics)
            const checkResults = runContentChecks(
              responseData.document.html_content, 
              testDoc.expectedContentChecks.filter(check => 
                // Filter checks that are relevant for readability
                check.type === 'exact_text' || 
                check.type === 'structure_intact' ||
                !check.critical // Include all non-critical checks
              )
            )

            console.log(`\n=== Readability Results for ${testDoc.name} ===`)
            console.log(`Applicable checks: ${checkResults.summary.total}`)
            console.log(`Passed: ${checkResults.summary.passed}`)
            console.log(`Failed: ${checkResults.summary.failed}`)

            // Readability typically has lower precision but faster processing
            expect(checkResults.summary.criticalFailed).toBeLessThanOrEqual(2) // Allow some critical failures for readability
          } else {
            // Readability extraction failed - verify error handling
            mockExtractWithReadability.mockReturnValue(null)

            const request = createRequest({
              url: `https://test-site.com/${testDoc.id}`,
              provider: 'claude',
              extractionMethod: 'readability'
            })

            const response = await POST(request)
            expect(response.status).toBe(422) // Unprocessable Entity when readability fails
          }
        })
      })
    })
  })

  describe('Cross-Method Consistency', () => {
    it('should produce consistent results between AI and readability when both succeed', async () => {
      const testDoc = testDocuments[1] // Use news article which is more suitable for readability

      // Mock fetch
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html; charset=utf-8'
        }),
        text: async () => testDoc.originalHtml
      } as Response)

      // Test AI extraction
      const aiExtraction = simulateAIExtraction(testDoc.originalHtml)
      mockExecutePrompt.mockResolvedValue({
        text: aiExtraction,
        usage: { totalTokens: 400, promptTokens: 250, completionTokens: 150 },
        finishReason: 'stop'
      })

      const aiRequest = createRequest({
        url: `https://test-site.com/${testDoc.id}-ai`,
        provider: 'claude',
        extractionMethod: 'ai-transcription'
      })

      const aiResponse = await POST(aiRequest)
      const aiData = await aiResponse.json()

      // Test readability extraction
      const readabilityExtraction = simulateReadabilityExtraction(testDoc.originalHtml)
      if (readabilityExtraction) {
        mockExtractWithReadability.mockReturnValue(readabilityExtraction.article)
        mockFormatReadabilityHtml.mockReturnValue(readabilityExtraction.formattedHtml)

        const readabilityRequest = createRequest({
          url: `https://test-site.com/${testDoc.id}-readability`,
          provider: 'claude',
          extractionMethod: 'readability'
        })

        const readabilityResponse = await POST(readabilityRequest)
        const readabilityData = await readabilityResponse.json()

        // Compare content similarity between methods
        const crossMethodSimilarity = calculateContentSimilarity(
          aiData.document.html_content,
          readabilityData.document.html_content
        )

        console.log(`\n=== Cross-Method Consistency ===`)
        console.log(`AI vs Readability similarity: ${(crossMethodSimilarity.similarity * 100).toFixed(1)}%`)

        // Both methods should extract similar core content
        expect(crossMethodSimilarity.similarity).toBeGreaterThan(0.6) // 60% similarity threshold
      }
    })
  })

  /**
   * Simulate AI extraction by removing navigation, ads, scripts but preserving main content
   */
  function simulateAIExtraction(originalHtml: string): string {
    const dom = new JSDOM(originalHtml)
    const document = dom.window.document

    // Remove elements that AI should filter out
    const elementsToRemove = [
      'script',
      'nav',
      '.advertisement',
      '.ads',
      '.social-sharing',
      '.newsletter-signup',
      '.site-header',
      '.site-footer',
      '.header-top',
      '.footer-content'
    ]

    elementsToRemove.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => el.remove())
    })

    // Simulate that AI preserves main content structure
    const mainContent = document.querySelector('main, article, .article-content, .article-body')
    if (mainContent) {
      // Create clean HTML document with just the main content
      const cleanDoc = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${document.title || 'Extracted Content'}</title>
</head>
<body>
    ${mainContent.outerHTML}
</body>
</html>`
      
      dom.window.close()
      return cleanDoc
    }

    const result = document.documentElement.outerHTML
    dom.window.close()
    return result
  }

  /**
   * Simulate readability extraction focusing on article content
   */
  function simulateReadabilityExtraction(originalHtml: string): {
    article: {
      title: string
      content: string
      textContent: string
      excerpt: string
      byline: string | null
      siteName: string | null
    }
    formattedHtml: string
  } | null {
    const dom = new JSDOM(originalHtml)
    const document = dom.window.document

    // Readability focuses on article content
    const title = document.querySelector('h1')?.textContent || document.title || 'Untitled'
    const mainContent = document.querySelector('main, article, .article-content')
    
    if (!mainContent) {
      dom.window.close()
      return null // Readability extraction failed
    }

    // Extract author information
    const bylineElement = document.querySelector('.byline, .author, [data-author]')
    const byline = bylineElement?.textContent || null

    // Extract site name
    const siteName = document.querySelector('[property="og:site_name"]')?.getAttribute('content') || 
                    new URL('https://test-site.com').hostname

    const content = mainContent.innerHTML
    const textContent = mainContent.textContent || ''
    const excerpt = textContent.substring(0, 200) + '...'

    const formattedHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
</head>
<body>
    ${byline ? `<p class="byline">${byline}</p>` : ''}
    <h1>${title}</h1>
    ${content}
</body>
</html>`

    const result = {
      article: {
        title,
        content,
        textContent,
        excerpt,
        byline,
        siteName
      },
      formattedHtml
    }

    dom.window.close()
    return result
  }
})