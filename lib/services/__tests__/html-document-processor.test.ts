/**
 * Tests for Shared HTML Document Processing Pipeline
 * 
 * Validates the consolidated processing logic that eliminates duplication
 * across upload-pdf, extract-url, and upload-html APIs.
 */

import { 
  sanitizeAndExtractText, 
  generateUploadMetadata,
  handleSanitizationError,
  processHtmlToDocument
} from '../html-document-processor'
import { sanitizeAcademicContent } from '../../utils/html-sanitizer'
import { extractCleanText } from '../../utils/html-text-extraction'

// Mock dependencies
jest.mock('../../utils/html-sanitizer')
jest.mock('../../utils/html-text-extraction')

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => Promise.resolve({ data: [], error: null })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null }))
    }))
  }
}

// Mock DocumentService 
jest.mock('../../services/database/documents', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    createWithStorage: jest.fn(() => Promise.resolve({
      document: {
        id: 'test-doc-id',
        title: 'Test Document',
        slug: 'test-document',
        html_content: '<p>Test content</p>',
        plaintext_content: 'Test content',
        word_count: 2,
        created_at: new Date().toISOString()
      },
      storageResult: {
        path: 'test-storage-path',
        size: 1024,
        mimeType: 'text/html'
      }
    }))
  }))
}))

const mockSanitizeAcademicContent = sanitizeAcademicContent as jest.MockedFunction<typeof sanitizeAcademicContent>
const mockExtractCleanText = extractCleanText as jest.MockedFunction<typeof extractCleanText>

describe('HTML Document Processor', () => {
  // Test data
  const mockHtmlContent = '<p>Test content with <strong>formatting</strong></p>'
  const mockSanitizedHtml = '<p>Test content with <strong>formatting</strong></p>' // Sanitized version
  const mockPlaintext = 'Test content with formatting'
  
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock returns
    mockSanitizeAcademicContent.mockReturnValue(mockSanitizedHtml)
    mockExtractCleanText.mockReturnValue(mockPlaintext)
  })

  describe('sanitizeAndExtractText', () => {
    it('should sanitize HTML and extract plaintext successfully', async () => {
      const result = await sanitizeAndExtractText(mockHtmlContent, mockLogger as any, 'test-correlation')
      
      expect(mockSanitizeAcademicContent).toHaveBeenCalledWith(mockHtmlContent)
      expect(mockExtractCleanText).toHaveBeenCalledWith(mockSanitizedHtml)
      
      expect(result).toEqual({
        sanitizedHtml: mockSanitizedHtml,
        prettifiedHtml: mockSanitizedHtml, // Should be same as sanitized when prettification is disabled
        plaintext: mockPlaintext
      })
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-correlation',
          step: 'sanitization-complete'
        }),
        'HTML sanitization completed successfully'
      )
    })

    it('should handle sanitization errors correctly', async () => {
      const sanitizationError = new Error('Sanitization failed')
      mockSanitizeAcademicContent.mockImplementation(() => {
        throw sanitizationError
      })

      await expect(sanitizeAndExtractText(mockHtmlContent, mockLogger as any, 'test-correlation'))
        .rejects.toThrow('Content sanitization failed: Sanitization failed')
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-correlation',
          step: 'sanitization-failed',
          error: 'Sanitization failed'
        }),
        'HTML sanitization failed'
      )
    })

    it('should include prettification when feature flag is enabled', async () => {
      // Mock environment variable
      const originalEnv = process.env.ENABLE_HTML_PRETTIFICATION
      process.env.ENABLE_HTML_PRETTIFICATION = 'true'

      const result = await sanitizeAndExtractText(mockHtmlContent, mockLogger as any, 'test-correlation')
      
      expect(result.sanitizedHtml).toBe(mockSanitizedHtml)
      expect(result.prettifiedHtml).toBeDefined()
      expect(result.plaintext).toBe(mockPlaintext)
      
      // Should log prettification steps
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 'prettification-start'
        }),
        'Starting HTML prettification'
      )
      
      // Restore original environment
      process.env.ENABLE_HTML_PRETTIFICATION = originalEnv
    })

    it('should skip prettification when feature flag is disabled', async () => {
      // Ensure feature flag is disabled
      const originalEnv = process.env.ENABLE_HTML_PRETTIFICATION
      process.env.ENABLE_HTML_PRETTIFICATION = 'false'

      const result = await sanitizeAndExtractText(mockHtmlContent, mockLogger as any, 'test-correlation')
      
      expect(result.sanitizedHtml).toBe(mockSanitizedHtml)
      expect(result.prettifiedHtml).toBe(mockSanitizedHtml) // Should be identical when disabled
      expect(result.plaintext).toBe(mockPlaintext)
      
      // Should log skipped prettification
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 'prettification-skipped',
          prettificationEnabled: false
        }),
        'HTML prettification skipped (feature flag disabled)'
      )
      
      // Restore original environment
      process.env.ENABLE_HTML_PRETTIFICATION = originalEnv
    })
  })

  describe('generateUploadMetadata', () => {
    it('should generate metadata for PDF upload', () => {
      const result = generateUploadMetadata('pdf', 'ai-conversion', 'claude', {
        file_size_bytes: 1024,
        model_used: 'claude-4-sonnet'
      })
      
      expect(result).toEqual({
        extraction_method: 'ai-conversion',
        provider_used: 'claude',
        upload_source: 'pdf',
        file_size_bytes: 1024,
        model_used: 'claude-4-sonnet'
      })
    })

    it('should generate metadata for URL upload', () => {
      const result = generateUploadMetadata('url', 'readability', undefined, {
        content_size_kb: 15,
        extracted_size_kb: 8,
        content_type_detected: 'text/html',
        original_url: 'https://example.com'
      })
      
      expect(result).toEqual({
        extraction_method: 'readability',
        provider_used: null,
        upload_source: 'url',
        content_size_kb: 15,
        extracted_size_kb: 8,
        content_type_detected: 'text/html',
        original_url: 'https://example.com'
      })
    })

    it('should generate metadata for HTML upload', () => {
      const result = generateUploadMetadata('html-upload', 'as-is', undefined, {
        content_size_kb: 10,
        processed_size_kb: 8,
        processing_method: 'as-is'
      })
      
      expect(result).toEqual({
        extraction_method: 'as-is',
        provider_used: null,
        upload_source: 'html-upload',
        content_size_kb: 10,
        processed_size_kb: 8,
        processing_method: 'as-is'
      })
    })
  })

  describe('handleSanitizationError', () => {
    it('should handle "too large" sanitization errors', () => {
      const error = new Error('Content too large')
      const result = handleSanitizationError(error, 'pdf')
      
      expect(result).toEqual({
        message: 'PDF processing failed: Generated content is too large to process safely',
        status: 413
      })
    })

    it('should handle "invalid result" sanitization errors', () => {
      const error = new Error('Sanitization produced invalid result')
      const result = handleSanitizationError(error, 'url')
      
      expect(result).toEqual({
        message: 'Web page import failed: Content sanitization produced invalid results',
        status: 422
      })
    })

    it('should handle generic sanitization errors', () => {
      const error = new Error('Generic sanitization error')
      const result = handleSanitizationError(error, 'html-upload')
      
      expect(result).toEqual({
        message: 'HTML processing failed: Content could not be safely processed for security reasons',
        status: 422
      })
    })
  })

  describe('processHtmlToDocument', () => {
    it('should process HTML through complete pipeline successfully', async () => {
      const result = await processHtmlToDocument(
        mockHtmlContent,
        {
          title: 'Test Document',
          sourceUrl: null,
          isPublic: false,
          originalFile: new Blob(['test'], { type: 'text/html' }),
          filename: 'test.html',
          provider: 'claude',
          correlationId: 'test-correlation',
          aiCallId: 'test-ai-call'
        },
        {
          extractionMethod: 'ai-transcription',
          uploadSource: 'html-upload',
          logger: mockLogger as any,
          userId: 'test-user-id',
          supabase: mockSupabaseClient as any
        },
        {
          processing_time_ms: 1000,
          file_size_bytes: 1024
        }
      )
      
      expect(result.document).toBeDefined()
      expect(result.document.id).toBe('test-doc-id')
      expect(result.document.title).toBe('Test Document')
      expect(result.storageResult).toBeDefined()
      expect(result.storageResult?.path).toBe('test-storage-path')
      
      // Verify pipeline steps were called
      expect(mockSanitizeAcademicContent).toHaveBeenCalledWith(mockHtmlContent)
      expect(mockExtractCleanText).toHaveBeenCalledWith(mockSanitizedHtml) // prettifiedHtml equals sanitizedHtml when disabled
    })
  })

  describe('Integration with existing utilities', () => {
    it('should use extractCleanText instead of regex for text extraction', async () => {
      await sanitizeAndExtractText(mockHtmlContent, mockLogger as any, 'test-correlation')
      
      // Verify we're using the proper DOM-based extraction
      // Note: extractCleanText is called with prettified HTML (which equals sanitized HTML when prettification is disabled)
      expect(mockExtractCleanText).toHaveBeenCalledWith(mockSanitizedHtml)
      
      // Verify we're NOT using regex patterns (this test ensures we've moved away from duplicated regex code)
      expect(mockExtractCleanText).toHaveBeenCalledTimes(1)
    })

    it('should preserve all existing sanitization configuration', async () => {
      await sanitizeAndExtractText(mockHtmlContent, mockLogger as any, 'test-correlation')
      
      // Verify sanitization is called with the original HTML (no preprocessing)
      expect(mockSanitizeAcademicContent).toHaveBeenCalledWith(mockHtmlContent)
      
      // Should be called exactly once (no retry logic or modification)
      expect(mockSanitizeAcademicContent).toHaveBeenCalledTimes(1)
    })
  })
})