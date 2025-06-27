/**
 * Tests for Page Processing Service
 * 
 * Tests the vision-based PDF page processing functionality including
 * single page processing, batch processing, error handling, and retry logic.
 */

import { 
  processPageToHtml,
  processPagesBatch,
  generatePreviousPageSummary,
  validatePageResults,
  PROCESSING_CONFIGS,
  type PageProcessingInput,
  type PageProcessingResult,
  type BatchProcessingConfig
} from '../page-processor'

// Mock the multimodal prompt execution
jest.mock('@/lib/prompts/types', () => ({
  executeMultimodalPromptWithUsage: jest.fn()
}))

// Mock the prompt template
jest.mock('@/lib/prompts/templates/page-to-html-fragment', () => ({
  createPageToHtmlFragmentPrompt: jest.fn(),
  pageToHtmlFragmentPrompt: {
    name: 'page-to-html-fragment',
    templatePath: '/mock/path/page-to-html-fragment.njk'
  }
}))

// Mock the logger
jest.mock('@/lib/services/logger', () => ({
  createRequestLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })
}))

import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { createPageToHtmlFragmentPrompt } from '@/lib/prompts/templates/page-to-html-fragment'

const mockExecutePrompt = executeMultimodalPromptWithUsage as jest.MockedFunction<typeof executeMultimodalPromptWithUsage>
const mockCreatePrompt = createPageToHtmlFragmentPrompt as jest.MockedFunction<typeof createPageToHtmlFragmentPrompt>

describe('Page Processor Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockCreatePrompt.mockReturnValue({
      name: 'page-to-html-fragment',
      description: 'Mock prompt template',
      schema: {} as any,
      templatePath: '/mock/path/page-to-html-fragment.njk'
    })
  })

  describe('processPageToHtml', () => {
    const mockInput: PageProcessingInput = {
      pageImageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      pageNumber: 1,
      totalPages: 5,
      fileName: 'test-document.pdf',
      documentContext: 'Academic research paper on machine learning'
    }

    it('should successfully process a page to HTML', async () => {
      const mockResult = {
        text: '<div class="page-1"><h2>Introduction</h2><p>This is page content.</p></div>',
        usage: {
          promptTokens: 1500,
          completionTokens: 800,
          totalTokens: 2300,
          reasoningTokens: 100
        },
        finishReason: 'stop'
      }
      
      // Add small delay to simulate processing time
      mockExecutePrompt.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return mockResult
      })

      const result = await processPageToHtml(mockInput)

      expect(result.success).toBe(true)
      expect(result.pageNumber).toBe(1)
      expect(result.htmlFragment).toBe(mockResult.text)
      expect(result.tokenUsage).toEqual(mockResult.usage)
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
      expect(result.error).toBeUndefined()
    })

    it('should handle processing errors gracefully', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('API rate limit exceeded'))

      const result = await processPageToHtml(mockInput)

      expect(result.success).toBe(false)
      expect(result.pageNumber).toBe(1)
      expect(result.htmlFragment).toBe('')
      expect(result.error).toBe('API rate limit exceeded')
      expect(result.tokenUsage.totalTokens).toBe(0)
    })

    it('should validate input schema', async () => {
      const invalidInput = {
        pageImageBase64: '', // Invalid - empty string
        pageNumber: 0, // Invalid - must be >= 1
        totalPages: 5
      } as PageProcessingInput

      const result = await processPageToHtml(invalidInput)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('String must contain at least 1 character')
    })

    it('should use specified provider', async () => {
      const mockResult = {
        text: '<div>Content</div>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop'
      }
      
      mockExecutePrompt.mockResolvedValue(mockResult)

      await processPageToHtml(mockInput, 'claude')

      expect(mockCreatePrompt).toHaveBeenCalledWith('claude')
    })

    it('should include optional context fields when provided', async () => {
      const inputWithContext = {
        ...mockInput,
        previousPageSummary: 'Previous page discussed methodology',
        documentContext: 'Research paper on neural networks'
      }

      const mockResult = {
        text: '<div>Content with context</div>',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        finishReason: 'stop'
      }
      
      mockExecutePrompt.mockResolvedValue(mockResult)

      const result = await processPageToHtml(inputWithContext)

      expect(result.success).toBe(true)
      expect(mockExecutePrompt).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          previousPageSummary: 'Previous page discussed methodology',
          documentContext: 'Research paper on neural networks'
        })
      )
    })
  })

  describe('processPagesBatch', () => {
    const mockPages: PageProcessingInput[] = [
      {
        pageImageBase64: 'base64-page1',
        pageNumber: 1,
        totalPages: 3,
        fileName: 'test.pdf'
      },
      {
        pageImageBase64: 'base64-page2',
        pageNumber: 2,
        totalPages: 3,
        fileName: 'test.pdf'
      },
      {
        pageImageBase64: 'base64-page3',
        pageNumber: 3,
        totalPages: 3,
        fileName: 'test.pdf'
      }
    ]

    const mockConfig: BatchProcessingConfig = {
      concurrencyLimit: 2,
      provider: 'gemini',
      retryAttempts: 2,
      retryDelayMs: 100
    }

    it('should process multiple pages in batch', async () => {
      const mockResult = {
        text: '<div>Page content</div>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop'
      }
      
      mockExecutePrompt.mockResolvedValue(mockResult)

      const results = await processPagesBatch(mockPages, mockConfig)

      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
      expect(results.map(r => r.pageNumber)).toEqual([1, 2, 3])
    })

    it('should process pages in batches according to concurrency limit', async () => {
      const callOrder: number[] = []
      
      mockExecutePrompt.mockImplementation(async () => {
        callOrder.push(Date.now())
        
        // Small delay to ensure timing
        await new Promise(resolve => setTimeout(resolve, 10))
        
        return {
          text: '<div>Content</div>',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          finishReason: 'stop'
        }
      })

      const results = await processPagesBatch(mockPages, mockConfig)

      // Should complete all pages
      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
      
      // Should have called the mock function for each page
      expect(callOrder).toHaveLength(3)
    })

    it('should report progress during processing', async () => {
      const progressCallbacks: Array<{completed: number, total: number, currentPage: number}> = []
      
      const onProgress = (completed: number, total: number, currentPage: number) => {
        progressCallbacks.push({ completed, total, currentPage })
      }

      mockExecutePrompt.mockResolvedValue({
        text: '<div>Content</div>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop'
      })

      await processPagesBatch(mockPages, mockConfig, onProgress)

      expect(progressCallbacks).toHaveLength(3)
      expect(progressCallbacks[0]).toMatchObject({ completed: 1, total: 3 })
      expect(progressCallbacks[1]).toMatchObject({ completed: 2, total: 3 })
      expect(progressCallbacks[2]).toMatchObject({ completed: 3, total: 3 })
    })

    it('should handle retry logic for failed pages', async () => {
      let callCount = 0
      mockExecutePrompt.mockImplementation(async () => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Temporary failure')
        }
        return {
          text: '<div>Success after retry</div>',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          finishReason: 'stop'
        }
      })

      const results = await processPagesBatch([mockPages[0]], mockConfig)

      expect(results[0].success).toBe(true)
      expect(callCount).toBe(3) // Initial + 2 retries
    })

    it('should report errors during processing', async () => {
      const errorCallbacks: Array<{pageNumber: number, error: Error, retryAttempt: number}> = []
      
      const onError = (pageNumber: number, error: Error, retryAttempt: number) => {
        errorCallbacks.push({ pageNumber, error, retryAttempt })
      }

      let callCount = 0
      mockExecutePrompt.mockImplementation(async () => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Retryable error')
        }
        return {
          text: '<div>Success</div>',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          finishReason: 'stop'
        }
      })

      await processPagesBatch([mockPages[0]], mockConfig, undefined, onError)

      expect(errorCallbacks).toHaveLength(2)
      expect(errorCallbacks[0]).toMatchObject({ pageNumber: 1, retryAttempt: 1 })
      expect(errorCallbacks[1]).toMatchObject({ pageNumber: 1, retryAttempt: 2 })
    })
  })

  describe('PROCESSING_CONFIGS', () => {
    it('should provide predefined configurations', () => {
      expect(PROCESSING_CONFIGS.fast).toEqual({
        concurrencyLimit: 10,
        provider: 'gemini',
        retryAttempts: 2,
        retryDelayMs: 1000
      })

      expect(PROCESSING_CONFIGS.quality).toEqual({
        concurrencyLimit: 5,
        provider: 'claude',
        retryAttempts: 3,
        retryDelayMs: 2000
      })

      expect(PROCESSING_CONFIGS.balanced).toEqual({
        concurrencyLimit: 8,
        provider: 'gemini',
        retryAttempts: 3,
        retryDelayMs: 1500
      })
    })
  })

  describe('generatePreviousPageSummary', () => {
    it('should generate summary from HTML content', () => {
      const htmlContent = '<div><h2>Introduction</h2><p>This research investigates machine learning algorithms for natural language processing. The study focuses on transformer architectures.</p></div>'
      
      const summary = generatePreviousPageSummary(htmlContent)
      
      expect(summary).toBeDefined()
      expect(summary).toContain('Previous page:')
      expect(summary).toContain('This research investigates machine learning algorithms')
    })

    it('should return undefined for null input', () => {
      const summary = generatePreviousPageSummary(null)
      expect(summary).toBeUndefined()
    })

    it('should return undefined for very short content', () => {
      const htmlContent = '<div><p>Yes.</p></div>'
      
      const summary = generatePreviousPageSummary(htmlContent)
      expect(summary).toBeUndefined()
    })

    it('should handle malformed HTML gracefully', () => {
      const htmlContent = '<div><p>Some content without closing tag'
      
      const summary = generatePreviousPageSummary(htmlContent)
      expect(summary).toBeDefined()
      expect(summary).toContain('Some content without closing tag')
    })
  })

  describe('validatePageResults', () => {
    it('should validate successful results', () => {
      const results: PageProcessingResult[] = [
        {
          pageNumber: 1,
          htmlFragment: '<div>Page 1 content</div>',
          processingTimeMs: 1000,
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          success: true
        },
        {
          pageNumber: 2,
          htmlFragment: '<div>Page 2 content</div>',
          processingTimeMs: 1200,
          tokenUsage: { promptTokens: 120, completionTokens: 60, totalTokens: 180 },
          success: true
        }
      ]

      const validation = validatePageResults(results)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.warnings).toHaveLength(0)
    })

    it('should detect failed pages', () => {
      const results: PageProcessingResult[] = [
        {
          pageNumber: 1,
          htmlFragment: '<div>Page 1 content</div>',
          processingTimeMs: 1000,
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          success: true
        },
        {
          pageNumber: 2,
          htmlFragment: '',
          processingTimeMs: 500,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          success: false,
          error: 'Processing failed'
        }
      ]

      const validation = validatePageResults(results)

      expect(validation.isValid).toBe(true) // Still valid, just has warnings
      expect(validation.warnings).toContain('1 pages failed processing: 2')
    })

    it('should detect empty HTML fragments', () => {
      const results: PageProcessingResult[] = [
        {
          pageNumber: 1,
          htmlFragment: '   ',
          processingTimeMs: 1000,
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          success: true
        }
      ]

      const validation = validatePageResults(results)

      expect(validation.warnings).toContain('1 pages produced empty HTML: 1')
    })

    it('should detect slow processing times', () => {
      const results: PageProcessingResult[] = [
        {
          pageNumber: 1,
          htmlFragment: '<div>Content</div>',
          processingTimeMs: 65000, // Over 60 seconds
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          success: true
        }
      ]

      const validation = validatePageResults(results)

      expect(validation.warnings).toContain('1 pages took over 60 seconds: 1')
    })

    it('should handle missing pages gracefully', () => {
      // Create results with gaps in page numbers
      const results: PageProcessingResult[] = [
        {
          pageNumber: 1,
          htmlFragment: '<div>Page 1</div>',
          processingTimeMs: 1000,
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          success: true
        },
        {
          pageNumber: 3, // Missing page 2
          htmlFragment: '<div>Page 3</div>',
          processingTimeMs: 1000,
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          success: true
        }
      ]

      const validation = validatePageResults(results)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Missing result for page 2')
    })
  })
})