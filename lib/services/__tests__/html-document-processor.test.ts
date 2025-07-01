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
import { getTestNamespace, createTestUser, getCleanupFunctions } from '@/lib/testing/test-isolation-utils'
import { RealRLSTestSetup } from '../database/__tests__/rls-test-helpers'
import { createClient } from '@/lib/supabase/server'

// Mock HTML utilities (keep these mocked as they're utility functions)
jest.mock('../../utils/html-sanitizer')
jest.mock('../../utils/html-text-extraction')

const mockSanitizeAcademicContent = sanitizeAcademicContent as jest.MockedFunction<typeof sanitizeAcademicContent>
const mockExtractCleanText = extractCleanText as jest.MockedFunction<typeof extractCleanText>

describe('HTML Document Processor', () => {
  const namespace = getTestNamespace('html-document-processor')
  let rlsSetup: RealRLSTestSetup
  let supabase: ReturnType<typeof createClient>
  let testUser: ReturnType<typeof createTestUser>
  
  const mockHtmlContent = '<p>Test content with <strong>formatting</strong></p>'
  const mockSanitizedHtml = '<p>Test content with <strong>formatting</strong></p>'
  const mockPlaintext = 'Test content with formatting'
  
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }

  beforeAll(async () => {
    rlsSetup = new RealRLSTestSetup()
    supabase = rlsSetup.getAdminClient()
    testUser = createTestUser(namespace)
    
    // Ensure test user profile exists
    await rlsSetup.createTestProfile({ 
      user_id: testUser.id,
      preferences: { display_name: 'HTML Processor Test User' }
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockSanitizeAcademicContent.mockReturnValue(mockSanitizedHtml)
    mockExtractCleanText.mockReturnValue(mockPlaintext)
  })

  afterEach(async () => {
    const cleanup = getCleanupFunctions(namespace, supabase)
    await cleanup.all()
  })

  afterAll(async () => {
    await rlsSetup.cleanup()
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
    it('should process HTML through complete pipeline successfully with real database', async () => {
      const result = await processHtmlToDocument(
        mockHtmlContent,
        {
          title: 'Test HTML Document',
          sourceUrl: null,
          isPublic: false,
          originalFile: new Blob(['test'], { type: 'text/html' }),
          filename: 'test.html',
          provider: 'claude',
          correlationId: `${namespace}-correlation`,
          aiCallId: null
        },
        {
          extractionMethod: 'ai-transcription',
          uploadSource: 'html-upload',
          logger: mockLogger as any,
          userId: testUser.id,
          supabase: supabase
        },
        {
          processing_time_ms: 1000,
          file_size_bytes: 1024
        }
      )
      
      expect(result.document).toBeDefined()
      expect(result.document.title).toBe('Test HTML Document')
      expect(result.document.created_by).toBe(testUser.id)
      expect(result.document.html_content).toBe(mockSanitizedHtml)
      expect(result.document.plaintext_content).toBe(mockPlaintext)

      // Verify the document was actually stored in the database
      const { data: storedDoc, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', result.document.id)
        .single()

      expect(error).toBeNull()
      expect(storedDoc.title).toBe('Test HTML Document')
      expect(storedDoc.created_by).toBe(testUser.id)
      expect(storedDoc.html_content).toBe(mockSanitizedHtml)
      expect(storedDoc.plaintext_content).toBe(mockPlaintext)
    })

    it('should handle document creation with upload metadata', async () => {
      const metadata = {
        extraction_method: 'ai-conversion',
        provider_used: 'claude',
        upload_source: 'pdf',
        file_size_bytes: 2048,
        processing_time_ms: 1500
      }

      const result = await processHtmlToDocument(
        mockHtmlContent,
        {
          title: 'PDF Converted Document',
          sourceUrl: null,
          isPublic: false,
          originalFile: new Blob(['pdf content'], { type: 'application/pdf' }),
          filename: 'test.pdf',
          provider: 'claude',
          correlationId: `${namespace}-pdf-correlation`,
          aiCallId: null
        },
        {
          extractionMethod: 'ai-conversion',
          uploadSource: 'pdf',
          logger: mockLogger as any,
          userId: testUser.id,
          supabase: supabase
        },
        metadata
      )

      expect(result.document).toBeDefined()
      expect(result.document.upload_metadata).toEqual(expect.objectContaining({
        extraction_method: 'ai-conversion',
        provider_used: 'claude',
        upload_source: 'pdf'
      }))

      // Verify metadata was stored correctly
      const { data: storedDoc, error } = await supabase
        .from('documents')
        .select('upload_metadata')
        .eq('id', result.document.id)
        .single()

      expect(error).toBeNull()
      expect(storedDoc.upload_metadata).toEqual(expect.objectContaining({
        extraction_method: 'ai-conversion',
        provider_used: 'claude',
        upload_source: 'pdf',
        file_size_bytes: 2048
      }))
    })
  })
})