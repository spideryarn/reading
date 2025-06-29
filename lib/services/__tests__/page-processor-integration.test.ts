/**
 * Integration Tests for Page Processor with Image Extraction (Stage 3)
 * 
 * Tests the complete integration of image extraction pipeline
 * within the page processing workflow.
 */

import { processPageToHtml, type PageProcessingInput } from '../page-processor'
import { createRequestLogger } from '@/lib/services/logger'

// Mock all image processing services for isolated testing
jest.mock('../image-extractor')
jest.mock('../image-caption-generator')
jest.mock('../storage')
jest.mock('../html-fragment-processor')
jest.mock('@/lib/utils/image-filename-generator')
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/services/logger')
jest.mock('../user-error-messages')
jest.mock('../database/document-assets')
jest.mock('../document-processing-transaction')

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}
;(createRequestLogger as jest.Mock).mockReturnValue(mockLogger)

describe('Page Processor Integration with Image Extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process page without image extraction when disabled', async () => {
    // Mock AI processing
    const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
    mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
      text: '<p>Test page content</p>',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    })

    const input: PageProcessingInput = {
      pageImageBase64: 'data:image/png;base64,test',
      pageNumber: 1,
      totalPages: 5,
      documentContext: 'Test Document',
      enableImageExtraction: false // Disabled
    }

    const result = await processPageToHtml(input)

    expect(result.success).toBe(true)
    expect(result.htmlFragment).toBe('<p>Test page content</p>')
    expect(result.extractedImages).toEqual([])
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Processing page to HTML with image extraction',
      expect.objectContaining({
        pageNumber: 1,
        enableImageExtraction: false,
        hasDocumentId: false
      })
    )
  })

  it('should skip image extraction when documentId is missing', async () => {
    // Mock AI processing
    const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
    mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
      text: '<p>Test page content</p>',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    })

    const input: PageProcessingInput = {
      pageImageBase64: 'data:image/png;base64,test',
      pageNumber: 1,
      totalPages: 5,
      enableImageExtraction: true, // Enabled
      // documentId: undefined - Missing document ID
    }

    const result = await processPageToHtml(input)

    expect(result.success).toBe(true)
    expect(result.extractedImages).toEqual([])
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Processing page to HTML with image extraction',
      expect.objectContaining({
        enableImageExtraction: true,
        hasDocumentId: false
      })
    )
  })

  it('should process image extraction when enabled with document ID', async () => {
    // Mock AI processing
    const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
    mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
      text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder" alt="test image"/><figcaption>Test Figure</figcaption></figure>',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    })

    // Mock fragment processing
    const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment
    mockProcessHtmlFragment.mockResolvedValue({
      success: true,
      htmlFragment: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder" alt="test image"/><figcaption>Test Figure</figcaption></figure>',
      extractedImages: [{
        elementId: 'fig-1',
        bbox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
        altText: 'test image',
        caption: 'Test Figure',
        elementType: 'figure'
      }]
    })

    // Mock image extraction
    const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
    mockExtractImageFromPage.mockResolvedValue({
      base64Image: 'data:image/png;base64,extracted',
      format: 'png',
      width: 400,
      height: 300,
      extractionTimeMs: 150
    })

    // Mock caption generation
    const mockGenerateImageCaption = require('../image-caption-generator').generateImageCaption
    mockGenerateImageCaption.mockResolvedValue({
      caption: 'Neural network diagram',
      confidence: 0.85
    })

    // Mock filename generation
    const mockGenerateImageFilename = require('@/lib/utils/image-filename-generator').generateImageFilename
    mockGenerateImageFilename.mockReturnValue({
      filename: 'neural-network-diagram.png',
      source: 'ai' as const
    })

    // Mock storage upload
    const mockUploadImageAsset = require('../storage').uploadImageAsset
    mockUploadImageAsset.mockResolvedValue({
      path: 'doc-123/assets/neural-network-diagram.png',
      fullPath: 'documents/doc-123/assets/neural-network-diagram.png',
      size: 5000,
      mimeType: 'image/png'
    })

    // Mock storage URL generation
    const mockGetImageAssetUrl = require('../storage').getImageAssetUrl
    mockGetImageAssetUrl.mockResolvedValue('https://supabase.example.com/storage/v1/object/sign/documents/doc-123/assets/neural-network-diagram.png?token=abc123')

    const input: PageProcessingInput = {
      pageImageBase64: 'data:image/png;base64,test',
      pageNumber: 1,
      totalPages: 5,
      documentId: 'doc-123',
      enableImageExtraction: true
    }

    const result = await processPageToHtml(input)

    expect(result.success).toBe(true)
    expect(result.extractedImages).toHaveLength(1)
    expect(result.extractedImages[0]).toMatchObject({
      elementId: 'fig-1',
      filename: 'neural-network-diagram.png',
      storagePath: 'doc-123/assets/neural-network-diagram.png',
      storageUrl: expect.stringContaining('supabase.example.com'),
      caption: 'Neural network diagram',
      source: 'ai'
    })

    // Verify all services were called correctly
    expect(mockProcessHtmlFragment).toHaveBeenCalled()
    expect(mockExtractImageFromPage).toHaveBeenCalled()
    expect(mockGenerateImageCaption).toHaveBeenCalled()
    expect(mockUploadImageAsset).toHaveBeenCalled()
    expect(mockGetImageAssetUrl).toHaveBeenCalled()
  })

  it('should handle storage upload failure gracefully', async () => {
    // Mock AI processing
    const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
    mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
      text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    })

    // Mock fragment processing
    const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment
    mockProcessHtmlFragment.mockResolvedValue({
      success: true,
      htmlFragment: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
      extractedImages: [{
        elementId: 'fig-1',
        bbox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
        elementType: 'figure'
      }]
    })

    // Mock image extraction
    const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
    mockExtractImageFromPage.mockResolvedValue({
      base64Image: 'data:image/png;base64,extracted',
      format: 'png'
    })

    // Mock caption generation
    const mockGenerateImageCaption = require('../image-caption-generator').generateImageCaption
    mockGenerateImageCaption.mockResolvedValue({
      caption: 'Test image'
    })

    // Mock filename generation
    const mockGenerateImageFilename = require('@/lib/utils/image-filename-generator').generateImageFilename
    mockGenerateImageFilename.mockReturnValue({
      filename: 'test-image.png',
      source: 'ai' as const
    })

    // Mock storage upload failure (returns null as expected in some environments)
    const mockUploadImageAsset = require('../storage').uploadImageAsset
    mockUploadImageAsset.mockResolvedValue(null)

    const input: PageProcessingInput = {
      pageImageBase64: 'data:image/png;base64,test',
      pageNumber: 1,
      totalPages: 5,
      documentId: 'doc-123',
      enableImageExtraction: true
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

  it('should fail fatally on image extraction errors', async () => {
    // Mock AI processing
    const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
    mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
      text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    })

    // Mock fragment processing
    const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment
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
    const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
    mockExtractImageFromPage.mockRejectedValue(new Error('Canvas API not available'))

    const input: PageProcessingInput = {
      pageImageBase64: 'data:image/png;base64,test',
      pageNumber: 1,
      totalPages: 5,
      documentId: 'doc-123',
      enableImageExtraction: true
    }

    const result = await processPageToHtml(input)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Image extraction failed for page 1')
    expect(result.extractedImages).toEqual([])
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Image extraction failed fatally',
      expect.objectContaining({
        pageNumber: 1,
        elementId: 'fig-1',
        error: 'Canvas API not available'
      })
    )
  })

  it('should validate input schema correctly', async () => {
    const invalidInput = {
      pageImageBase64: '', // Invalid - empty string
      pageNumber: 0, // Invalid - must be >= 1
      totalPages: 0 // Invalid - must be >= 1
    } as PageProcessingInput

    const result = await processPageToHtml(invalidInput)

    expect(result.success).toBe(false)
    expect(result.error).toContain('pageImageBase64')
  })

  describe('User Error Message Integration', () => {
    beforeEach(() => {
      // Mock the user error message service
      const mockGetUserErrorMessage = require('../user-error-messages').getUserErrorMessage
      mockGetUserErrorMessage.mockReturnValue({
        userMessage: 'Unable to process the image due to a technical issue.',
        category: 'processing',
        isRetryable: true,
        userAction: 'Please try uploading your document again.',
        technicalDetails: 'Canvas API not available',
        errorCode: 'IMAGE_PROCESSING_FAILED'
      })
    })

    it('should include user-friendly error messages in failed results', async () => {
      // Mock AI processing
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Mock fragment processing
      const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment
      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        extractedImages: [{
          elementId: 'fig-1',
          bbox: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.8 },
          elementType: 'figure'
        }]
      })

      // Mock transaction
      const mockTransaction = {
        recordStorageUpload: jest.fn(),
        recordDatabaseRecord: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn().mockResolvedValue({ success: true, operationsRolledBack: 0, errors: [] })
      }
      const MockDocumentProcessingTransaction = require('../document-processing-transaction').DocumentProcessingTransaction
      MockDocumentProcessingTransaction.mockImplementation(() => mockTransaction)

      // Mock image extraction failure
      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockRejectedValue(new Error('Canvas API not available'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 2,
        totalPages: 5,
        documentId: 'doc-456',
        enableImageExtraction: true
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Image extraction failed for page 2')
      expect(result.userError).toBeDefined()
      expect(result.userError?.userMessage).toBe('Unable to process the image due to a technical issue.')
      expect(result.userError?.category).toBe('processing')
      expect(result.userError?.isRetryable).toBe(true)
      expect(result.userError?.userAction).toBe('Please try uploading your document again.')
      expect(result.userError?.errorCode).toBe('IMAGE_PROCESSING_FAILED')

      // Verify getUserErrorMessage was called with correct context
      const mockGetUserErrorMessage = require('../user-error-messages').getUserErrorMessage
      expect(mockGetUserErrorMessage).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          pageNumber: 2,
          documentId: 'doc-456',
          operation: 'page processing',
          processingStage: 'vision pipeline'
        })
      )

      // Verify transaction rollback was called
      expect(mockTransaction.rollback).toHaveBeenCalled()
    })

    it('should include user error in logs when processing fails', async () => {
      // Mock AI processing failure
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockRejectedValue(new Error('AI service timeout'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 3,
        totalPages: 5,
        documentId: 'doc-789'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.userError).toBeDefined()
      
      // Verify error was logged with user error info
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Page processing failed',
        expect.objectContaining({
          pageNumber: 3,
          error: 'AI service timeout',
          userError: expect.objectContaining({
            userMessage: 'Unable to process the image due to a technical issue.',
            category: 'processing'
          })
        })
      )
    })

    it('should generate user error info for generic processing failures', async () => {
      // Mock a generic processing failure
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockRejectedValue(new Error('Network connection failed'))

      // Update mock to return network error type
      const mockGetUserErrorMessage = require('../user-error-messages').getUserErrorMessage
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
        pageNumber: 4,
        totalPages: 5
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.userError?.category).toBe('system')
      expect(result.userError?.userMessage).toContain('Network connection issue')
      expect(result.userError?.isRetryable).toBe(true)
    })
  })
})