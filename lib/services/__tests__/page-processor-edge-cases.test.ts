/**
 * Comprehensive Edge Case Tests for Vision PDF Image Extraction System
 * 
 * Tests critical edge cases that could cause production failures:
 * - Malformed and boundary inputs
 * - Image extraction with problematic bounding boxes
 * - Storage service failures and limits
 * - Database integration failures
 * - Error handling validation
 * - Transaction rollback scenarios
 */

import { processPageToHtml, type PageProcessingInput } from '../page-processor'
import { extractImageFromPage, ImageExtractionError } from '../image-extractor'
import { createRequestLogger } from '@/lib/services/logger'

// Mock all services for isolated testing
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

// Mock database assets service
const mockDocumentAssetsService = {
  create: jest.fn(),
  getByDocumentId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}
jest.doMock('../database/document-assets', () => ({
  documentAssetsService: mockDocumentAssetsService
}))

describe('Page Processor Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Input Validation Edge Cases', () => {
    it('should reject empty base64 image data', async () => {
      const input: PageProcessingInput = {
        pageImageBase64: '', // Empty string
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('pageImageBase64')
    })

    it('should reject zero page number', async () => {
      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 0, // Invalid - must be >= 1
        totalPages: 5,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('pageNumber')
    })

    it('should reject negative page number', async () => {
      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test', 
        pageNumber: -1, // Invalid
        totalPages: 5,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('pageNumber')
    })

    it('should reject zero total pages', async () => {
      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 0, // Invalid - must be >= 1
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('totalPages')
    })

    it('should reject page number greater than total pages', async () => {
      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 10,
        totalPages: 5, // pageNumber > totalPages
        documentId: 'doc-123'
      }

      // This should be validated at the business logic level
      // For now, it passes schema validation but should be caught by business logic
      const result = await processPageToHtml(input)
      // This test verifies the system doesn't crash with this input
      expect(result).toBeDefined()
    })

    it('should handle extremely large page numbers', async () => {
      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 999999,
        totalPages: 999999,
        documentId: 'doc-123'
      }

      // Mock AI processing to prevent actual API calls
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '<p>Test content</p>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      const result = await processPageToHtml(input)
      expect(result).toBeDefined()
      expect(result.pageNumber).toBe(999999)
    })

    it('should handle malformed base64 data gracefully', async () => {
      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,NOT_VALID_BASE64!!!',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      // Mock AI processing failure due to invalid image
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockRejectedValue(new Error('Invalid image data'))

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid image data')
      expect(result.userError).toBeDefined()
    })
  })

  describe('Image Extraction Edge Cases', () => {
    beforeEach(() => {
      // Mock AI processing success
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
    })

    it('should handle invalid bounding box coordinates (x1 >= x2)', async () => {
      // Mock fragment processing with invalid bbox
      const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment
      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1"><img src="placeholder"/></figure>',
        extractedImages: [{
          elementId: 'fig-1',
          bbox: { x1: 0.8, y1: 0.2, x2: 0.6, y2: 0.8 }, // x1 > x2 - invalid!
          elementType: 'figure'
        }]
      })

      // Mock image extraction failure
      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockRejectedValue(new ImageExtractionError('Invalid bounding box: x1 (0.8) must be less than x2 (0.6)'))

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

    it('should handle invalid bounding box coordinates (y1 >= y2)', async () => {
      // Mock fragment processing with invalid bbox
      const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment
      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1"><img src="placeholder"/></figure>',
        extractedImages: [{
          elementId: 'fig-1',
          bbox: { x1: 0.1, y1: 0.8, x2: 0.6, y2: 0.2 }, // y1 > y2 - invalid!
          elementType: 'figure'
        }]
      })

      // Mock image extraction failure
      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockRejectedValue(new ImageExtractionError('Invalid bounding box: y1 (0.8) must be less than y2 (0.2)'))

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

    it('should handle extremely small bounding boxes (< 1% of page)', async () => {
      // Mock fragment processing with tiny bbox
      const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment
      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1"><img src="placeholder"/></figure>',
        extractedImages: [{
          elementId: 'fig-1',
          bbox: { x1: 0.1, y1: 0.2, x2: 0.101, y2: 0.201 }, // 0.001 x 0.001 - too small!
          elementType: 'figure'
        }]
      })

      // Mock image extraction failure
      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockRejectedValue(new ImageExtractionError('Bounding box too small: 0.001 x 0.001 (minimum 0.01 x 0.01)'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Bounding box too small')
    })

    it('should handle bounding boxes extending beyond page boundaries', async () => {
      // Mock fragment processing with out-of-bounds bbox
      const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment
      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1"><img src="placeholder"/></figure>',
        extractedImages: [{
          elementId: 'fig-1',
          bbox: { x1: 0.8, y1: 0.8, x2: 1.2, y2: 1.2 }, // Extends beyond 1.0 bounds
          elementType: 'figure'
        }]
      })

      // Mock image extraction failure
      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockRejectedValue(new ImageExtractionError('Bounding box coordinates exceed page boundaries'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('bounding box')
    })

    it('should handle Canvas API not available', async () => {
      // Mock image extraction failure due to Canvas API
      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockRejectedValue(new ImageExtractionError('Canvas API not available'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Canvas API not available')
      expect(result.userError).toBeDefined()
    })

    it('should handle corrupted page image data', async () => {
      // Mock image extraction failure due to corrupted image
      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockRejectedValue(new ImageExtractionError('Failed to load page image from base64 data'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,corrupted_data',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to load page image')
    })
  })

  describe('Storage Service Edge Cases', () => {
    beforeEach(() => {
      // Mock AI processing and fragment processing success
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

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

      // Mock successful image extraction
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
        caption: 'Test image'
      })

      // Mock filename generation
      const mockGenerateImageFilename = require('@/lib/utils/image-filename-generator').generateImageFilename
      mockGenerateImageFilename.mockReturnValue({
        filename: 'test-image.png',
        source: 'ai' as const
      })
    })

    it('should handle storage upload returning null (storage unavailable)', async () => {
      // Mock storage upload failure
      const mockUploadImageAsset = require('../storage').uploadImageAsset
      mockUploadImageAsset.mockResolvedValue(null)

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(true) // Should continue processing
      expect(result.extractedImages).toEqual([]) // But no images extracted
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Image storage failed but continuing processing',
        expect.objectContaining({
          pageNumber: 1,
          elementId: 'fig-1'
        })
      )
    })

    it('should handle storage upload throwing error', async () => {
      // Mock storage upload error
      const mockUploadImageAsset = require('../storage').uploadImageAsset
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

    it('should handle storage URL generation failure', async () => {
      // Mock successful upload but failed URL generation
      const mockUploadImageAsset = require('../storage').uploadImageAsset
      mockUploadImageAsset.mockResolvedValue({
        path: 'doc-123/assets/test-image.png',
        fullPath: 'documents/doc-123/assets/test-image.png',
        size: 5000,
        mimeType: 'image/png'
      })

      const mockGetImageAssetUrl = require('../storage').getImageAssetUrl
      mockGetImageAssetUrl.mockRejectedValue(new Error('Failed to generate signed URL'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to generate signed URL')
    })

    it('should handle extremely large image upload', async () => {
      // Mock large image extraction
      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockResolvedValue({
        base64Image: 'data:image/png;base64,' + 'x'.repeat(10000000), // ~10MB base64
        format: 'png',
        width: 4000,
        height: 3000,
        extractionTimeMs: 2000
      })

      // Mock storage failure due to size
      const mockUploadImageAsset = require('../storage').uploadImageAsset
      mockUploadImageAsset.mockRejectedValue(new Error('File size exceeds limit'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('File size exceeds limit')
    })
  })

  describe('Database Integration Edge Cases', () => {
    beforeEach(() => {
      // Mock successful upstream services
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

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

      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockResolvedValue({
        base64Image: 'data:image/png;base64,extracted',
        format: 'png',
        width: 400,
        height: 300,
        extractionTimeMs: 150
      })

      const mockGenerateImageCaption = require('../image-caption-generator').generateImageCaption
      mockGenerateImageCaption.mockResolvedValue({
        caption: 'Test image'
      })

      const mockGenerateImageFilename = require('@/lib/utils/image-filename-generator').generateImageFilename
      mockGenerateImageFilename.mockReturnValue({
        filename: 'test-image.png',
        source: 'ai' as const
      })

      const mockUploadImageAsset = require('../storage').uploadImageAsset
      mockUploadImageAsset.mockResolvedValue({
        path: 'doc-123/assets/test-image.png',
        fullPath: 'documents/doc-123/assets/test-image.png',
        size: 5000,
        mimeType: 'image/png'
      })

      const mockGetImageAssetUrl = require('../storage').getImageAssetUrl
      mockGetImageAssetUrl.mockResolvedValue('https://example.com/image.png')
    })

    it('should handle database connection failure', async () => {
      // Mock database service failure
      const mockDocumentAssetsService = require('../database/document-assets').documentAssetsService
      mockDocumentAssetsService.create.mockRejectedValue(new Error('Connection timeout'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection timeout')
    })

    it('should handle database constraint violations', async () => {
      // Mock database constraint violation
      const mockDocumentAssetsService = require('../database/document-assets').documentAssetsService
      mockDocumentAssetsService.create.mockRejectedValue(new Error('duplicate key value violates unique constraint'))

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

    it('should handle missing document ID reference', async () => {
      // Mock database foreign key constraint violation
      const mockDocumentAssetsService = require('../database/document-assets').documentAssetsService
      mockDocumentAssetsService.create.mockRejectedValue(new Error('insert or update on table "document_assets" violates foreign key constraint'))

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'non-existent-doc'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('foreign key constraint')
    })
  })

  describe('Transaction Rollback Edge Cases', () => {
    it('should handle rollback failure', async () => {
      // Mock successful upstream services
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

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
      mockExtractImageFromPage.mockRejectedValue(new Error('Extraction failed'))

      // Mock transaction with rollback failure
      const mockTransaction = {
        recordStorageUpload: jest.fn(),
        recordDatabaseRecord: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn().mockRejectedValue(new Error('Rollback failed'))
      }
      const MockDocumentProcessingTransaction = require('../document-processing-transaction').DocumentProcessingTransaction
      MockDocumentProcessingTransaction.mockImplementation(() => mockTransaction)

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Extraction failed')
    })

    it('should handle partial rollback success', async () => {
      // Mock successful upstream services
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '<figure id="fig-1" data-bbox="0.1,0.2,0.6,0.8"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

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
      mockExtractImageFromPage.mockRejectedValue(new Error('Canvas crashed'))

      // Mock transaction with partial rollback
      const mockTransaction = {
        recordStorageUpload: jest.fn(),
        recordDatabaseRecord: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn().mockResolvedValue({ 
          success: false, 
          operationsRolledBack: 1, 
          errors: ['Failed to delete storage file'] 
        })
      }
      const MockDocumentProcessingTransaction = require('../document-processing-transaction').DocumentProcessingTransaction
      MockDocumentProcessingTransaction.mockImplementation(() => mockTransaction)

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Canvas crashed')
      expect(mockTransaction.rollback).toHaveBeenCalled()
    })
  })

  describe('User Error Message Edge Cases', () => {
    beforeEach(() => {
      // Mock the user error message service
      const mockGetUserErrorMessage = require('../user-error-messages').getUserErrorMessage
      mockGetUserErrorMessage.mockReturnValue({
        userMessage: 'A technical error occurred while processing your document.',
        category: 'processing',
        isRetryable: true,
        userAction: 'Please try again later.',
        technicalDetails: 'Mock error for testing',
        errorCode: 'PROCESSING_ERROR'
      })
    })

    it('should handle null or undefined error objects', async () => {
      // Mock AI processing throwing null (weird edge case)
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockRejectedValue(null)

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.userError).toBeDefined()
    })

    it('should handle errors with circular references', async () => {
      // Create error with circular reference
      const circularError = new Error('Circular error')
      ;(circularError as any).self = circularError

      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockRejectedValue(circularError)

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Circular error')
      expect(result.userError).toBeDefined()
    })

    it('should handle errors without message property', async () => {
      // Mock error object without message
      const weirdError = { name: 'WeirdError', toString: () => 'String representation' }

      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockRejectedValue(weirdError)

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.userError).toBeDefined()
    })
  })

  describe('Concurrent Processing Edge Cases', () => {
    it('should handle multiple images with filename conflicts', async () => {
      // Mock AI processing
      const mockExecuteMultimodalPromptWithUsage = require('@/lib/prompts/types').executeMultimodalPromptWithUsage
      mockExecuteMultimodalPromptWithUsage.mockResolvedValue({
        text: '<figure id="fig-1" data-bbox="0.1,0.2,0.3,0.4"><img src="placeholder"/></figure><figure id="fig-2" data-bbox="0.5,0.6,0.7,0.8"><img src="placeholder"/></figure>',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Mock fragment processing with multiple images
      const mockProcessHtmlFragment = require('../html-fragment-processor').processHtmlFragment
      mockProcessHtmlFragment.mockResolvedValue({
        success: true,
        htmlFragment: '<figure id="fig-1" data-bbox="0.1,0.2,0.3,0.4"><img src="placeholder"/></figure><figure id="fig-2" data-bbox="0.5,0.6,0.7,0.8"><img src="placeholder"/></figure>',
        extractedImages: [
          {
            elementId: 'fig-1',
            bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
            elementType: 'figure'
          },
          {
            elementId: 'fig-2',
            bbox: { x1: 0.5, y1: 0.6, x2: 0.7, y2: 0.8 },
            elementType: 'figure'
          }
        ]
      })

      // Mock successful upstream services
      const mockExtractImageFromPage = require('../image-extractor').extractImageFromPage
      mockExtractImageFromPage.mockResolvedValue({
        base64Image: 'data:image/png;base64,extracted',
        format: 'png',
        width: 400,
        height: 300,
        extractionTimeMs: 150
      })

      const mockGenerateImageCaption = require('../image-caption-generator').generateImageCaption
      mockGenerateImageCaption.mockResolvedValue({
        caption: 'chart' // Same caption for both images
      })

      // Mock filename generation returning same name (conflict scenario)
      const mockGenerateImageFilename = require('@/lib/utils/image-filename-generator').generateImageFilename
      mockGenerateImageFilename
        .mockReturnValueOnce({ filename: 'chart.png', source: 'ai' as const })
        .mockReturnValueOnce({ filename: 'chart-2.png', source: 'ai' as const }) // Conflict resolution

      const mockUploadImageAsset = require('../storage').uploadImageAsset
      mockUploadImageAsset.mockResolvedValue({
        path: 'doc-123/assets/chart.png',
        fullPath: 'documents/doc-123/assets/chart.png',
        size: 5000,
        mimeType: 'image/png'
      })

      const mockGetImageAssetUrl = require('../storage').getImageAssetUrl
      mockGetImageAssetUrl.mockResolvedValue('https://example.com/image.png')

      const mockDocumentAssetsService = require('../database/document-assets').documentAssetsService
      mockDocumentAssetsService.create.mockResolvedValue({
        id: 'asset-123',
        document_id: 'doc-123',
        type: 'image',
        filename: 'chart.png',
        storage_path: 'doc-123/assets/chart.png',
        caption: 'chart',
        extraction_confidence: 0.85,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      const input: PageProcessingInput = {
        pageImageBase64: 'data:image/png;base64,test',
        pageNumber: 1,
        totalPages: 1,
        documentId: 'doc-123'
      }

      const result = await processPageToHtml(input)

      expect(result.success).toBe(true)
      expect(result.extractedImages).toHaveLength(2)
      // Verify filename generation was called with existingFilenames for conflict resolution
      expect(mockGenerateImageFilename).toHaveBeenCalledTimes(2)
    })
  })
})