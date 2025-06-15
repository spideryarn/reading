/**
 * Tests for Shared HTML Document Processing Pipeline
 * 
 * Core tests for the consolidated processing logic.
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
  const mockHtmlContent = '<p>Test content with <strong>formatting</strong></p>'
  const mockSanitizedHtml = '<p>Test content with <strong>formatting</strong></p>'
  const mockPlaintext = 'Test content with formatting'
  
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
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
        prettifiedHtml: mockSanitizedHtml,
        plaintext: mockPlaintext
      })
    })

    it('should handle sanitization errors correctly', async () => {
      const sanitizationError = new Error('Sanitization failed')
      mockSanitizeAcademicContent.mockImplementation(() => {
        throw sanitizationError
      })

      await expect(sanitizeAndExtractText(mockHtmlContent, mockLogger as any, 'test-correlation'))
        .rejects.toThrow('Content sanitization failed: Sanitization failed')
    })
  })

  describe('generateUploadMetadata', () => {
    it('should generate metadata for different upload sources', () => {
      const pdfResult = generateUploadMetadata('pdf', 'ai-conversion', 'claude', {
        file_size_bytes: 1024,
        model_used: 'claude-4-sonnet'
      })
      
      expect(pdfResult).toEqual({
        extraction_method: 'ai-conversion',
        provider_used: 'claude',
        upload_source: 'pdf',
        file_size_bytes: 1024,
        model_used: 'claude-4-sonnet'
      })
    })
  })

  describe('handleSanitizationError', () => {
    it('should map error messages to appropriate status codes', () => {
      const tooLargeError = new Error('Content too large')
      const result = handleSanitizationError(tooLargeError, 'pdf')
      
      expect(result).toEqual({
        message: 'PDF processing failed: Generated content is too large to process safely',
        status: 413
      })
    })
  })

  describe('processHtmlToDocument', () => {
    it('should process HTML through complete pipeline successfully', async () => {
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
    })
  })
})