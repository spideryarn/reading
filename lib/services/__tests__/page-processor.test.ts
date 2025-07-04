/**
 * Comprehensive Tests for Page Processing Service
 * 
 * Tests the vision-based PDF page processing functionality including:
 * - Core page processing with AI vision models
 * - Batch processing with concurrency control and retry logic
 * - Image extraction and storage integration
 * - Input validation and error handling
 * - Edge cases and failure scenarios
 * - User error message generation
 * 
 * Consolidated from multiple test files to reduce duplication while maintaining
 * comprehensive coverage of all critical functionality.
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
import { createRequestLogger } from '@/lib/services/logger'

// Mock all services for isolated testing
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/prompts/templates/page-to-html-fragment')
jest.mock('@/lib/services/logger')
jest.mock('../html-fragment-processor')
jest.mock('../image-extractor')
jest.mock('../image-caption-generator')
jest.mock('../storage')
jest.mock('@/lib/utils/image-filename-generator')
jest.mock('../user-error-messages')
jest.mock('../database/document-assets')
jest.mock('../document-processing-transaction')

// Centralized mock setup
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

const mockDocumentAssetsService = {
  create: jest.fn(),
  getByDocumentId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

const mockTransaction = {
  recordStorageUpload: jest.fn(),
  recordDatabaseRecord: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn().mockResolvedValue({ success: true, operationsRolledBack: 0, errors: [] })
}

// Mock implementations
;(createRequestLogger as jest.Mock).mockReturnValue(mockLogger)

jest.doMock('../database/document-assets', () => ({
  documentAssetsService: mockDocumentAssetsService
}))

const MockDocumentProcessingTransaction = require('../document-processing-transaction').DocumentProcessingTransaction
MockDocumentProcessingTransaction.mockImplementation(() => mockTransaction)

describe('Page Processor Service', () => {
  const mockExecutePrompt = require('@/lib/prompts/types').executeMultimodalPromptWithUsage as jest.Mock
  const mockCreatePrompt = require('@/lib/prompts/templates/page-to-html-fragment').createPageToHtmlFragmentPrompt as jest.Mock
  const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment as jest.Mock
  const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage as jest.Mock
  const mockGenerateImageCaption = require('../image-caption-generator').generateImageCaption as jest.Mock
  const mockGenerateImageFilename = require('@/lib/utils/image-filename-generator').generateImageFilename as jest.Mock
  const mockUploadImageAsset = require('../storage').uploadImageAsset as jest.Mock
  const _mockGetImageAssetUrl = require('../storage').getImageAssetUrl as jest.Mock
  const mockGetUserErrorMessage = require('../user-error-messages').getUserErrorMessage as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockCreatePrompt.mockReturnValue({
      name: 'page-to-html-fragment',
      description: 'Mock prompt template',
      schema: {} as any,
      templatePath: '/mock/path/page-to-html-fragment.njk'
    })

    mockGetUserErrorMessage.mockReturnValue({
      userMessage: 'A technical error occurred while processing your document.',
      category: 'processing',
      isRetryable: true,
      userAction: 'Please try again later.',
      technicalDetails: 'Mock error for testing',
      errorCode: 'PROCESSING_ERROR'
    })
  })

  describe('Core Functionality', () => {
    const mockInput: PageProcessingInput = {
      pageImageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      pageNumber: 1,
      totalPages: 5,
      fileName: 'test-document.pdf',
      documentContext: 'Academic research paper on machine learning'
    }

    describe('processPageToHtml', () => {
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
        
        mockExecutePrompt.mockResolvedValue(mockResult)

        const result = await processPageToHtml(mockInput)

        expect(result.success).toBe(true)
        expect(result.pageNumber).toBe(1)
        expect(result.htmlFragment).toBe(mockResult.text)
        expect(result.tokenUsage).toEqual(mockResult.usage)
        expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
        expect(result.error).toBeUndefined()
        expect(result.extractedImages).toEqual([])
      })

      it('should process page without image extraction when documentId is missing', async () => {
        mockExecutePrompt.mockResolvedValue({
          text: '<p>Test page content</p>',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
        })

        const inputWithoutDocId = { ...mockInput }
        delete (inputWithoutDocId as any).documentId

        const result = await processPageToHtml(inputWithoutDocId)

        expect(result.success).toBe(true)
        expect(result.htmlFragment).toBe('<p>Test page content</p>')
        expect(result.extractedImages).toEqual([])
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Processing page to HTML with image extraction',
          expect.objectContaining({
            hasDocumentId: false,
            imageExtractionEnabled: false
          })
        )
      })

      it('should use specified provider', async () => {
        mockExecutePrompt.mockResolvedValue({
          text: '<div>Content</div>',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          finishReason: 'stop'
        })

        await processPageToHtml(mockInput, 'claude')

        expect(mockCreatePrompt).toHaveBeenCalledWith('claude')
      })

      it('should include optional context fields when provided', async () => {
        const inputWithContext = {
          ...mockInput,
          previousPageSummary: 'Previous page discussed methodology',
          documentContext: 'Research paper on neural networks'
        }

        mockExecutePrompt.mockResolvedValue({
          text: '<div>Content with context</div>',
          usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
          finishReason: 'stop'
        })

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

    describe('Batch Processing', () => {
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
        mockExecutePrompt.mockResolvedValue({
          text: '<div>Page content</div>',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          finishReason: 'stop'
        })

        const results = await processPagesBatch(mockPages, mockConfig)

        expect(results).toHaveLength(3)
        expect(results.every(r => r.success)).toBe(true)
        expect(results.map(r => r.pageNumber)).toEqual([1, 2, 3])
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

    describe('Processing Configurations', () => {
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
  })


  describe('Image Extraction Integration', () => {

    it('should enable image extraction when documentId is provided', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: '<p>Test content with image references</p>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Mock HTML fragment processing to return no images for simplicity
      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<p>Test content with image references</p>',
        extractedImages: []
      })

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 5,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(true)
      expect(result.extractedImages).toEqual([])
      expect(mockProcessHtmlFragment).toHaveBeenCalledWith(
        expect.objectContaining({
          pageImageBase64: input.pageImageBase64
        })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing page to HTML with image extraction',
        expect.objectContaining({
          hasDocumentId: true,
          imageExtractionEnabled: true
        })
      )
    })

    it('should handle storage upload failure gracefully', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        extractedImages: [{
          elementId: 'fig-1',
          bbox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
          elementType: 'figure'
        }]
      })

      mockExtractImageFromPage.mockResolvedValue({
        base64Image: 'data:image/png;base64,extracted',
        format: 'png'
      })

      mockGenerateImageCaption.mockResolvedValue({
        caption: 'Test image'
      })

      mockGenerateImageFilename.mockReturnValue({
        filename: 'test-image.png',
        source: 'ai' as const
      })

      // Mock storage upload failure (returns null)
      mockUploadImageAsset.mockResolvedValue(null)

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 5,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(true)
      expect(result.extractedImages).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Image storage failed but continuing processing',
        expect.objectContaining({
          pageNumber: 1,
          elementId: 'fig-1'
        })
      )
    })

    it('should fail fatally on image extraction errors with rollback', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        extractedImages: [{
          elementId: 'fig-1',
          bbox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
          elementType: 'figure'
        }]
      })

      // Mock image extraction failure
      mockExtractImageFromPage.mockRejectedValue(new Error('Canvas API not available'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 5,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Image extraction failed for page 1')
      expect(result.extractedImages).toEqual([])
      expect(result.userError).toBeDefined()
      expect(mockTransaction.rollback).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Image extraction failed fatally, performing rollback',
        expect.objectContaining({
          pageNumber: 1,
          elementId: 'fig-1',
          error: 'Canvas API not available'
        })
      )
    })
  })

  describe('Input Validation and Error Handling', () => {
    it('should validate input schema and reject invalid data', async () => {
      const invalidInput = {
        pageImageBase64: '', // Invalid - empty string
        pageNumber: 0, // Invalid - must be >= 1
        totalPages: 0 // Invalid - must be >= 1
      } as PageProcessingInput

      const result = await processPageToHtml(invalidInput)

      expect(result.success).toBe(false)
      expect(result.error).toContain('pageImageBase64')
      expect(result.userError).toBeDefined()
    })

    it('should handle AI processing errors gracefully', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('API rate limit exceeded'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 5
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.pageNumber).toBe(1)
      expect(result.htmlFragment).toBe('')
      expect(result.error).toBe('API rate limit exceeded')
      expect(result.tokenUsage.totalTokens).toBe(0)
      expect(result.userError).toBeDefined()
    })

    it('should include user-friendly error messages in failed results', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('Network connection failed'))

      mockGetUserErrorMessage.mockReturnValue({
        userMessage: 'Network connection issue. Please check your internet connection and try again.',
        category: 'system',
        isRetryable: true,
        userAction: 'Check your internet connection and try again.',
        technicalDetails: 'Network connection failed',
        errorCode: 'NETWORK_ERROR'
      })

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 2,
        totalPages: 5
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.userError?.category).toBe('system')
      expect(result.userError?.userMessage).toContain('Network connection issue')
      expect(result.userError?.isRetryable).toBe(true)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Page processing failed',
        expect.objectContaining({
          pageNumber: 2,
          error: 'Network connection failed',
          userError: expect.objectContaining({
            category: 'system'
          })
        })
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed base64 data gracefully', async () => {
      mockExecutePrompt.mockRejectedValue(new Error('Invalid image data'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,NOT_VALID_BASE64!!!',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid image data')
      expect(result.userError).toBeDefined()
    })

    it('should handle invalid bounding box coordinates', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: '<figure id="fig-1"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1"><img src="placeholder"/></figure>',
        extractedImages: [{
          elementId: 'fig-1',
          bbox: { x1: 0.8, y1: 0.2, x2: 0.6, y2: 0.8 }, // x1 > x2 - invalid!
          elementType: 'figure'
        }]
      })

      mockExtractImageFromPage.mockRejectedValue(new Error('Invalid bounding box: x1 (0.8) must be less than x2 (0.6)'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid bounding box')
    })

    it('should handle storage service failures', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: '<figure id="fig-1"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1"><img src="placeholder"/></figure>',
        extractedImages: [{
          elementId: 'fig-1',
          bbox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
          elementType: 'figure'
        }]
      })

      mockExtractImageFromPage.mockResolvedValue({
        base64Image: 'data:image/png;base64,extracted',
        format: 'png'
      })

      mockGenerateImageCaption.mockResolvedValue({
        caption: 'Test image'
      })

      mockGenerateImageFilename.mockReturnValue({
        filename: 'test-image.png',
        source: 'ai' as const
      })

      // Mock storage failure
      mockUploadImageAsset.mockRejectedValue(new Error('Storage quota exceeded'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Storage quota exceeded')
    })

    it('should handle database constraint violations', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: '<p>Simple content</p>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Mock database constraint violation during asset creation
      mockProcessHtmlFragment.mockRejectedValue(new Error('duplicate key value violates unique constraint'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('duplicate key value violates unique constraint')
    })

    it('should handle complex extraction scenarios gracefully', async () => {
      mockExecutePrompt.mockResolvedValue({
        text: '<p>Content with complex image scenarios</p>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Mock fragment processing to return multiple images
      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<p>Content with complex image scenarios</p>',
        extractedImages: [
          {
            elementId: 'img-1',
            bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
            elementType: 'img'
          },
          {
            elementId: 'img-2',
            bbox: { x1: 0.5, y1: 0.6, x2: 0.7, y2: 0.8 },
            elementType: 'img'
          }
        ]
      })

      // Mock storage failure to test graceful handling
      mockExtractImageFromPage.mockRejectedValue(new Error('Complex extraction scenario'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Complex extraction scenario')
      expect(result.extractedImages).toEqual([])
    })
  })

  describe('Utility Functions', () => {
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
            extractedImages: [],
            success: true
          },
          {
            pageNumber: 2,
            htmlFragment: '<div>Page 2 content</div>',
            processingTimeMs: 1200,
            tokenUsage: { promptTokens: 120, completionTokens: 60, totalTokens: 180 },
            extractedImages: [],
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
            extractedImages: [],
            success: true
          },
          {
            pageNumber: 2,
            htmlFragment: '',
            processingTimeMs: 500,
            tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            extractedImages: [],
            success: false,
            error: 'Processing failed'
          }
        ]

        const validation = validatePageResults(results)

        expect(validation.isValid).toBe(true) // Still valid, just has warnings
        expect(validation.warnings).toContain('1 pages failed processing: 2')
      })

      it('should detect missing pages', () => {
        const results: PageProcessingResult[] = [
          {
            pageNumber: 1,
            htmlFragment: '<div>Page 1</div>',
            processingTimeMs: 1000,
            tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
            extractedImages: [],
            success: true
          },
          {
            pageNumber: 3, // Missing page 2
            htmlFragment: '<div>Page 3</div>',
            processingTimeMs: 1000,
            tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
            extractedImages: [],
            success: true
          }
        ]

        const validation = validatePageResults(results)

        expect(validation.isValid).toBe(false)
        expect(validation.errors).toContain('Missing result for page 2')
      })

      it('should detect empty HTML fragments', () => {
        const results: PageProcessingResult[] = [
          {
            pageNumber: 1,
            htmlFragment: '   ',
            processingTimeMs: 1000,
            tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
            extractedImages: [],
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
            extractedImages: [],
            success: true
          }
        ]

        const validation = validatePageResults(results)

        expect(validation.warnings).toContain('1 pages took over 60 seconds: 1')
      })
    })
  })
})