/**
 * Tests for User-Friendly Error Message Service
 * 
 * Verifies conversion of technical errors to user-friendly messages
 * with appropriate categorization and actionability.
 */

import { 
  UserErrorMessageService, 
  getUserErrorMessage, 
  formatUserError,
  ErrorCategory,
  type UserErrorInfo,
  type ErrorContext
} from '../user-error-messages'

describe('UserErrorMessageService', () => {
  let service: UserErrorMessageService

  beforeEach(() => {
    service = new UserErrorMessageService()
  })

  describe('Storage Errors', () => {
    it('should handle storage bucket not found error', () => {
      const error = 'Storage bucket "documents" not found. Run storage setup first.'
      const result = service.convertError(error)

      expect(result.userMessage).toBe('Document storage is temporarily unavailable. Please try again in a few minutes.')
      expect(result.category).toBe(ErrorCategory.STORAGE)
      expect(result.isRetryable).toBe(true)
      expect(result.userAction).toContain('Wait a few minutes')
      expect(result.errorCode).toBe('STORAGE_UNAVAILABLE')
    })

    it('should handle permission denied errors', () => {
      const error = 'Storage access denied: insufficient permissions'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('permission issue')
      expect(result.category).toBe(ErrorCategory.STORAGE)
      expect(result.isRetryable).toBe(false)
      expect(result.userAction).toContain('Contact support')
      expect(result.errorCode).toBe('STORAGE_PERMISSION_DENIED')
    })

    it('should handle file already exists error', () => {
      const error = 'Asset Already Exists at path: doc-123/assets/test.png'
      const context: ErrorContext = { filename: 'test.png' }
      const result = service.convertError(error, context)

      expect(result.userMessage).toContain('test.png')
      expect(result.userMessage).toContain('already exists')
      expect(result.category).toBe(ErrorCategory.STORAGE)
      expect(result.isRetryable).toBe(true)
      expect(result.errorCode).toBe('STORAGE_FILE_EXISTS')
    })

    it('should handle storage quota exceeded error', () => {
      const error = 'Storage quota exceeded: 10GB limit reached'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('capacity limit reached')
      expect(result.category).toBe(ErrorCategory.QUOTA)
      expect(result.isRetryable).toBe(false)
      expect(result.userAction).toContain('upgrade')
      expect(result.errorCode).toBe('STORAGE_QUOTA_EXCEEDED')
    })

    it('should handle generic storage errors', () => {
      const error = 'Upload failed: unknown storage error'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('Unable to save document images')
      expect(result.category).toBe(ErrorCategory.STORAGE)
      expect(result.isRetryable).toBe(true)
      expect(result.errorCode).toBe('STORAGE_GENERIC_ERROR')
    })
  })

  describe('Image Extraction Errors', () => {
    it('should handle invalid bounding box coordinates', () => {
      const error = 'Invalid bounding box: x1 (0.5) must be less than x2 (0.3)'
      const context: ErrorContext = { pageNumber: 5 }
      const result = service.convertError(error, context)

      expect(result.userMessage).toContain('page 5')
      expect(result.userMessage).toContain('invalid image coordinates')
      expect(result.category).toBe(ErrorCategory.PROCESSING)
      expect(result.isRetryable).toBe(true)
      expect(result.errorCode).toBe('IMAGE_INVALID_COORDINATES')
    })

    it('should handle image too small error', () => {
      const error = 'Bounding box too small: 0.005 x 0.003 (minimum 0.01 x 0.01)'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('too small to extract')
      expect(result.category).toBe(ErrorCategory.PROCESSING)
      expect(result.isRetryable).toBe(false)
      expect(result.userAction).toContain('not a problem')
      expect(result.errorCode).toBe('IMAGE_TOO_SMALL')
    })

    it('should handle failed to load image error', () => {
      const error = 'Failed to load page image from base64 data'
      const context: ErrorContext = { pageNumber: 3 }
      const result = service.convertError(error, context)

      expect(result.userMessage).toContain('page 3')
      expect(result.userMessage).toContain('Unable to read image data')
      expect(result.category).toBe(ErrorCategory.PROCESSING)
      expect(result.isRetryable).toBe(true)
      expect(result.errorCode).toBe('IMAGE_LOAD_FAILED')
    })

    it('should handle canvas memory allocation errors', () => {
      const error = 'Canvas memory allocation failed: image too large'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('very large images')
      expect(result.userMessage).toContain('processing limits')
      expect(result.category).toBe(ErrorCategory.PROCESSING)
      expect(result.isRetryable).toBe(false)
      expect(result.errorCode).toBe('IMAGE_SIZE_LIMIT')
    })

    it('should handle generic image extraction errors', () => {
      const error = 'Unknown image processing error occurred'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('Unable to extract images')
      expect(result.userMessage).toContain('text will still be processed')
      expect(result.category).toBe(ErrorCategory.PROCESSING)
      expect(result.isRetryable).toBe(true)
      expect(result.errorCode).toBe('IMAGE_EXTRACTION_FAILED')
    })
  })

  describe('AI Caption Generation Errors', () => {
    it('should handle AI service timeout', () => {
      const error = 'AI caption generation timed out after 30 seconds'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('taking longer than expected')
      expect(result.category).toBe(ErrorCategory.SYSTEM)
      expect(result.isRetryable).toBe(true)
      expect(result.userAction).toContain('Wait a moment')
      expect(result.errorCode).toBe('AI_TIMEOUT')
    })

    it('should handle AI service unavailable', () => {
      const error = 'AI model service unavailable: maintenance in progress'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('AI image analysis service is temporarily unavailable')
      expect(result.category).toBe(ErrorCategory.SYSTEM)
      expect(result.isRetryable).toBe(true)
      expect(result.userAction).toContain('Try again later')
      expect(result.errorCode).toBe('AI_SERVICE_UNAVAILABLE')
    })

    it('should handle rate limiting errors', () => {
      const error = 'Rate limit exceeded: too many requests per minute'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('Too many AI requests')
      expect(result.category).toBe(ErrorCategory.QUOTA)
      expect(result.isRetryable).toBe(true)
      expect(result.userAction).toContain('Wait 30 seconds')
      expect(result.errorCode).toBe('AI_RATE_LIMITED')
    })

    it('should handle generic AI caption errors', () => {
      const error = 'Caption generation failed: unknown AI error'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('Unable to generate image descriptions')
      expect(result.userMessage).toContain('generic names')
      expect(result.category).toBe(ErrorCategory.PROCESSING)
      expect(result.isRetryable).toBe(true)
      expect(result.errorCode).toBe('AI_CAPTION_FAILED')
    })
  })

  describe('Database Errors', () => {
    it('should handle database connection errors', () => {
      const error = 'Database connection failed: network timeout'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('Database connection issue')
      expect(result.category).toBe(ErrorCategory.SYSTEM)
      expect(result.isRetryable).toBe(true)
      expect(result.userAction).toContain('Check your internet connection')
      expect(result.errorCode).toBe('DATABASE_CONNECTION_FAILED')
    })

    it('should handle constraint violation errors', () => {
      const error = 'Unique constraint violation: duplicate storage_path'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('data conflicts')
      expect(result.category).toBe(ErrorCategory.PROCESSING)
      expect(result.isRetryable).toBe(true)
      expect(result.errorCode).toBe('DATABASE_CONSTRAINT_VIOLATION')
    })

    it('should handle generic database errors', () => {
      const error = 'Unknown database error occurred'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('Database error occurred')
      expect(result.category).toBe(ErrorCategory.SYSTEM)
      expect(result.isRetryable).toBe(true)
      expect(result.errorCode).toBe('DATABASE_GENERIC_ERROR')
    })
  })

  describe('Network Errors', () => {
    it('should handle network connection errors', () => {
      const error = 'Network fetch failed: connection refused'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('Network connection issue')
      expect(result.category).toBe(ErrorCategory.SYSTEM)
      expect(result.isRetryable).toBe(true)
      expect(result.userAction).toContain('Check your internet connection')
      expect(result.errorCode).toBe('NETWORK_ERROR')
    })
  })

  describe('Input Validation Errors', () => {
    it('should handle file size exceeded errors', () => {
      const error = 'File size 50MB exceeds maximum allowed size of 10MB'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('file is too large')
      expect(result.category).toBe(ErrorCategory.INPUT)
      expect(result.isRetryable).toBe(false)
      expect(result.userAction).toContain('Reduce your PDF file size')
      expect(result.errorCode).toBe('FILE_TOO_LARGE')
    })

    it('should handle invalid file type errors', () => {
      const error = 'File type image/jpeg is not allowed. Allowed types: application/pdf'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('File type not supported')
      expect(result.category).toBe(ErrorCategory.INPUT)
      expect(result.isRetryable).toBe(false)
      expect(result.userAction).toContain('Convert your document to PDF')
      expect(result.errorCode).toBe('INVALID_FILE_TYPE')
    })

    it('should handle generic validation errors', () => {
      const error = 'Schema validation failed: invalid field format'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('Invalid file format')
      expect(result.category).toBe(ErrorCategory.INPUT)
      expect(result.isRetryable).toBe(false)
      expect(result.errorCode).toBe('INPUT_VALIDATION_FAILED')
    })
  })

  describe('Quota Errors', () => {
    it('should handle quota exceeded errors', () => {
      const error = 'Monthly usage quota exceeded: 100/100 documents processed'
      const result = service.convertError(error)

      expect(result.userMessage).toContain('Usage limit reached')
      expect(result.category).toBe(ErrorCategory.QUOTA)
      expect(result.isRetryable).toBe(true)
      expect(result.userAction).toContain('upgrade your account')
      expect(result.errorCode).toBe('QUOTA_EXCEEDED')
    })
  })

  describe('Generic Errors', () => {
    it('should handle unknown errors with context', () => {
      const error = 'Completely unknown error type'
      const context: ErrorContext = { operation: 'PDF processing' }
      const result = service.convertError(error, context)

      expect(result.userMessage).toContain('PDF processing')
      expect(result.category).toBe(ErrorCategory.SYSTEM)
      expect(result.isRetryable).toBe(true)
      expect(result.userAction).toContain('contact support')
      expect(result.errorCode).toBe('GENERIC_ERROR')
    })

    it('should handle Error objects', () => {
      const error = new Error('Test error message')
      const result = service.convertError(error)

      expect(result.technicalDetails).toBe('Test error message')
      expect(result.category).toBe(ErrorCategory.SYSTEM)
      expect(result.errorCode).toBe('GENERIC_ERROR')
    })
  })

  describe('Context Handling', () => {
    it('should include page number in relevant error messages', () => {
      const error = 'Image extraction failed'
      const context: ErrorContext = { pageNumber: 7 }
      const result = service.convertError(error, context)

      expect(result.userMessage).toContain('7') // Page number should be included
    })

    it('should include filename in relevant error messages', () => {
      const error = 'File already exists'
      const context: ErrorContext = { filename: 'my-chart.png' }
      const result = service.convertError(error, context)

      expect(result.userMessage).toContain('my-chart.png')
    })

    it('should handle context with multiple fields', () => {
      const error = 'Processing failed'
      const context: ErrorContext = {
        pageNumber: 3,
        documentId: 'doc-123',
        filename: 'diagram.png',
        operation: 'image extraction',
        processingStage: 'vision pipeline'
      }
      const result = service.convertError(error, context)

      expect(result.technicalDetails).toBe('Processing failed')
      expect(result.userMessage).toBeDefined()
      expect(result.category).toBeDefined()
    })
  })

  describe('Utility Functions', () => {
    it('should provide convenient getUserErrorMessage function', () => {
      const error = 'Storage bucket not found'
      const result = getUserErrorMessage(error)

      expect(result.userMessage).toContain('storage is temporarily unavailable')
      expect(result.category).toBe(ErrorCategory.STORAGE)
    })

    it('should format user error messages correctly', () => {
      const errorInfo: UserErrorInfo = {
        userMessage: 'Test error occurred.',
        category: ErrorCategory.SYSTEM,
        isRetryable: true,
        userAction: 'Try again later.',
        errorCode: 'TEST_ERROR'
      }

      const formatted = formatUserError(errorInfo)
      expect(formatted).toBe('Test error occurred. Try again later.')
    })

    it('should format user error without action', () => {
      const errorInfo: UserErrorInfo = {
        userMessage: 'Test error occurred.',
        category: ErrorCategory.SYSTEM,
        isRetryable: true,
        errorCode: 'TEST_ERROR'
      }

      const formatted = formatUserError(errorInfo)
      expect(formatted).toBe('Test error occurred.')
    })
  })

  describe('Error Detection', () => {
    it('should correctly categorize mixed error types', () => {
      const storageError = 'Storage upload failed: bucket not accessible'
      const imageError = 'Image extraction failed: invalid coordinates'
      const aiError = 'AI caption generation timeout'

      expect(service.convertError(storageError).category).toBe(ErrorCategory.STORAGE)
      expect(service.convertError(imageError).category).toBe(ErrorCategory.PROCESSING)
      expect(service.convertError(aiError).category).toBe(ErrorCategory.SYSTEM)
    })

    it('should prioritize specific error types over generic ones', () => {
      // This error could be categorized as storage or image, should prioritize storage
      const error = 'Storage failed during image upload'
      const result = service.convertError(error)

      expect(result.category).toBe(ErrorCategory.STORAGE)
    })
  })
})