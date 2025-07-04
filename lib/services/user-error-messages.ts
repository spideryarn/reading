/**
 * User-Friendly Error Message Abstraction Layer
 * 
 * Converts technical error messages into user-friendly, actionable messages
 * for the vision PDF image extraction pipeline.
 * 
 * Follows the principle of providing clear error messages per coding guidelines.
 */

import { createRequestLogger } from '@/lib/services/logger'

export interface UserErrorInfo {
  userMessage: string
  category: 'storage' | 'processing' | 'input' | 'system' | 'quota'
  isRetryable: boolean
  userAction?: string
  technicalDetails?: string
  errorCode?: string
}

export interface ErrorContext {
  pageNumber?: number
  documentId?: string
  filename?: string
  operation?: string
  processingStage?: string
}

/**
 * Error categories for user messaging
 */
export enum ErrorCategory {
  STORAGE = 'storage',
  PROCESSING = 'processing', 
  INPUT = 'input',
  SYSTEM = 'system',
  QUOTA = 'quota'
}

/**
 * Convert technical errors to user-friendly messages
 */
export class UserErrorMessageService {
  private logger = createRequestLogger('/services/user-error-messages')

  /**
   * Convert a technical error to a user-friendly error message
   */
  convertError(
    error: Error | string,
    context: ErrorContext = {}
  ): UserErrorInfo {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'string' ? undefined : error.stack
    
    this.logger.info('Converting error to user-friendly message', {
      errorMessage,
      context,
      errorType: typeof error === 'string' ? 'string' : error.constructor.name
    })

    // Check in order of specificity - most specific patterns first
    
    // Quota/rate limiting errors (very specific)
    if (this.isQuotaError(errorMessage)) {
      return this.handleQuotaError(errorMessage, context)
    }

    // File/input validation errors (specific patterns)
    if (this.isInputValidationError(errorMessage)) {
      return this.handleInputValidationError(errorMessage, context)
    }

    // Storage-related errors (specific storage operations)
    if (this.isStorageError(errorMessage)) {
      return this.handleStorageError(errorMessage, context)
    }

    // Image extraction errors (specific image processing)
    if (this.isImageExtractionError(errorMessage)) {
      return this.handleImageExtractionError(errorMessage, context)
    }

    // Caption generation errors (specific AI operations)
    if (this.isCaptionGenerationError(errorMessage)) {
      return this.handleCaptionGenerationError(errorMessage)
    }

    // Database errors (specific database operations)
    if (this.isDatabaseError(errorMessage)) {
      return this.handleDatabaseError(errorMessage)
    }

    // Network/timeout errors (last specific check before generic)
    if (this.isNetworkError(errorMessage)) {
      return this.handleNetworkError(errorMessage, context)
    }

    // Generic system error fallback
    return this.handleGenericError(errorMessage, context, errorStack)
  }

  /**
   * Handle storage-related errors
   */
  private handleStorageError(errorMessage: string, context: ErrorContext): UserErrorInfo {
    // Storage service unavailable
    if (errorMessage.includes('Storage bucket') && errorMessage.includes('not found')) {
      return {
        userMessage: 'Document storage is temporarily unavailable. Please try again in a few minutes.',
        category: ErrorCategory.STORAGE,
        isRetryable: true,
        userAction: 'Wait a few minutes and try uploading your document again.',
        technicalDetails: errorMessage,
        errorCode: 'STORAGE_UNAVAILABLE'
      }
    }

    // Permission denied
    if (errorMessage.includes('permission') || errorMessage.includes('access denied') || errorMessage.includes('unauthorized')) {
      return {
        userMessage: 'Unable to save document images due to a permission issue. Please contact support.',
        category: ErrorCategory.STORAGE,
        isRetryable: false,
        userAction: 'Contact support for assistance with this storage permission issue.',
        technicalDetails: errorMessage,
        errorCode: 'STORAGE_PERMISSION_DENIED'
      }
    }

    // File already exists
    if (errorMessage.includes('already exists') || errorMessage.includes('Asset Already Exists')) {
      const filename = context.filename || 'file'
      return {
        userMessage: `An image with the name "${filename}" already exists. Please try uploading again.`,
        category: ErrorCategory.STORAGE,
        isRetryable: true,
        userAction: 'Try uploading your document again. The system will generate a new filename.',
        technicalDetails: errorMessage,
        errorCode: 'STORAGE_FILE_EXISTS'
      }
    }

    // Storage capacity/quota exceeded
    if (errorMessage.includes('quota') || errorMessage.includes('capacity') || errorMessage.includes('storage limit')) {
      return {
        userMessage: 'Storage capacity limit reached. Please contact support to increase your storage allowance.',
        category: ErrorCategory.QUOTA,
        isRetryable: false,
        userAction: 'Contact support to upgrade your account storage capacity.',
        technicalDetails: errorMessage,
        errorCode: 'STORAGE_QUOTA_EXCEEDED'
      }
    }

    // Generic storage error
    return {
      userMessage: 'Unable to save document images. Please check your internet connection and try again.',
      category: ErrorCategory.STORAGE,
      isRetryable: true,
      userAction: 'Check your internet connection and try uploading again. Contact support if the problem persists.',
      technicalDetails: errorMessage,
      errorCode: 'STORAGE_GENERIC_ERROR'
    }
  }

  /**
   * Handle image extraction errors
   */
  private handleImageExtractionError(errorMessage: string, context: ErrorContext): UserErrorInfo {
    // Invalid bounding box coordinates
    if (errorMessage.includes('Invalid bounding box') || errorMessage.includes('coordinates')) {
      const pageNumber = context.pageNumber || 'unknown'
      return {
        userMessage: `Unable to extract an image from page ${pageNumber} due to invalid image coordinates.`,
        category: ErrorCategory.PROCESSING,
        isRetryable: true,
        userAction: 'Try uploading your document again. If this continues, the PDF may have corrupted image data.',
        technicalDetails: errorMessage,
        errorCode: 'IMAGE_INVALID_COORDINATES'
      }
    }

    // Image too small
    if (errorMessage.includes('too small') || errorMessage.includes('minimum')) {
      return {
        userMessage: 'An image in your document is too small to extract clearly.',
        category: ErrorCategory.PROCESSING,
        isRetryable: false,
        userAction: 'This is usually not a problem - the document will still be processed without this tiny image.',
        technicalDetails: errorMessage,
        errorCode: 'IMAGE_TOO_SMALL'
      }
    }

    // Failed to load image
    if (errorMessage.includes('Failed to load') || errorMessage.includes('image data')) {
      const pageNumber = context.pageNumber || 'unknown'
      return {
        userMessage: `Unable to read image data from page ${pageNumber} of your document.`,
        category: ErrorCategory.PROCESSING,
        isRetryable: true,
        userAction: 'This may be due to a corrupted PDF. Try re-saving your PDF and uploading again.',
        technicalDetails: errorMessage,
        errorCode: 'IMAGE_LOAD_FAILED'
      }
    }

    // Canvas/memory errors
    if (errorMessage.includes('canvas') || errorMessage.includes('memory') || errorMessage.includes('allocation')) {
      return {
        userMessage: 'Your document contains very large images that exceed processing limits.',
        category: ErrorCategory.PROCESSING,
        isRetryable: false,
        userAction: 'Try reducing the image size in your PDF or contact support for assistance with large documents.',
        technicalDetails: errorMessage,
        errorCode: 'IMAGE_SIZE_LIMIT'
      }
    }

    // Generic image extraction error
    const pageInfo = context.pageNumber ? ` from page ${context.pageNumber}` : ''
    return {
      userMessage: `Unable to extract images${pageInfo} from your document. The document text will still be processed.`,
      category: ErrorCategory.PROCESSING,
      isRetryable: true,
      userAction: 'Try uploading again. If images are important, ensure your PDF contains clear, non-corrupted images.',
      technicalDetails: errorMessage,
      errorCode: 'IMAGE_EXTRACTION_FAILED'
    }
  }

  /**
   * Handle AI caption generation errors
   */
  private handleCaptionGenerationError(errorMessage: string): UserErrorInfo {
    // AI service timeout
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return {
        userMessage: 'AI image analysis is taking longer than expected. Please try again.',
        category: ErrorCategory.SYSTEM,
        isRetryable: true,
        userAction: 'Wait a moment and try uploading your document again.',
        technicalDetails: errorMessage,
        errorCode: 'AI_TIMEOUT'
      }
    }

    // AI service unavailable
    if (errorMessage.includes('AI service unavailable') || errorMessage.includes('AI model service unavailable') || errorMessage.includes('service unavailable')) {
      return {
        userMessage: 'AI image analysis service is temporarily unavailable. Your document will be processed without image descriptions.',
        category: ErrorCategory.SYSTEM,
        isRetryable: true,
        userAction: 'Try again later for full image analysis, or proceed with basic document processing.',
        technicalDetails: errorMessage,
        errorCode: 'AI_SERVICE_UNAVAILABLE'
      }
    }


    // Generic AI error
    return {
      userMessage: 'Unable to generate image descriptions. Images will be saved with generic names.',
      category: ErrorCategory.PROCESSING,
      isRetryable: true,
      userAction: 'Your document will still be processed successfully. Try again for better image names.',
      technicalDetails: errorMessage,
      errorCode: 'AI_CAPTION_FAILED'
    }
  }

  /**
   * Handle database errors
   */
  private handleDatabaseError(errorMessage: string): UserErrorInfo {
    // Connection issues
    if (errorMessage.includes('connection') || errorMessage.includes('network')) {
      return {
        userMessage: 'Database connection issue. Please check your internet connection and try again.',
        category: ErrorCategory.SYSTEM,
        isRetryable: true,
        userAction: 'Check your internet connection and try again in a few minutes.',
        technicalDetails: errorMessage,
        errorCode: 'DATABASE_CONNECTION_FAILED'
      }
    }

    // Constraint violations
    if (errorMessage.includes('constraint') || errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
      return {
        userMessage: 'Document data conflicts with existing records. Please try uploading again.',
        category: ErrorCategory.PROCESSING,
        isRetryable: true,
        userAction: 'Try uploading your document again. If this persists, contact support.',
        technicalDetails: errorMessage,
        errorCode: 'DATABASE_CONSTRAINT_VIOLATION'
      }
    }

    // Generic database error
    return {
      userMessage: 'Database error occurred while saving your document. Please try again.',
      category: ErrorCategory.SYSTEM,
      isRetryable: true,
      userAction: 'Try uploading your document again. Contact support if the problem continues.',
      technicalDetails: errorMessage,
      errorCode: 'DATABASE_GENERIC_ERROR'
    }
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(errorMessage: string, context: ErrorContext): UserErrorInfo {
    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('fetch')) {
      return {
        userMessage: 'Network connection issue. Please check your internet connection and try again.',
        category: ErrorCategory.SYSTEM,
        isRetryable: true,
        userAction: 'Check your internet connection and try again. If on a slow connection, wait for better connectivity.',
        technicalDetails: errorMessage,
        errorCode: 'NETWORK_ERROR'
      }
    }

    return this.handleGenericError(errorMessage, context)
  }

  /**
   * Handle input validation errors
   */
  private handleInputValidationError(errorMessage: string, _context: ErrorContext): UserErrorInfo {
    // File size errors
    if (errorMessage.includes('size') && (errorMessage.includes('exceeds') || errorMessage.includes('too large'))) {
      return {
        userMessage: 'Your file is too large to process. Please use a smaller PDF file.',
        category: ErrorCategory.INPUT,
        isRetryable: false,
        userAction: 'Reduce your PDF file size by compressing images or splitting into smaller documents.',
        technicalDetails: errorMessage,
        errorCode: 'FILE_TOO_LARGE'
      }
    }

    // File type errors
    if (errorMessage.includes('type') && (errorMessage.includes('not allowed') || errorMessage.includes('invalid'))) {
      return {
        userMessage: 'File type not supported. Please use a valid PDF file.',
        category: ErrorCategory.INPUT,
        isRetryable: false,
        userAction: 'Convert your document to PDF format and try again.',
        technicalDetails: errorMessage,
        errorCode: 'INVALID_FILE_TYPE'
      }
    }

    // Generic validation error
    return {
      userMessage: 'Invalid file format or content. Please check your PDF file and try again.',
      category: ErrorCategory.INPUT,
      isRetryable: false,
      userAction: 'Ensure your file is a valid, non-corrupted PDF and try uploading again.',
      technicalDetails: errorMessage,
      errorCode: 'INPUT_VALIDATION_FAILED'
    }
  }

  /**
   * Handle quota/rate limiting errors
   */
  private handleQuotaError(errorMessage: string, _context: ErrorContext): UserErrorInfo {
    // Rate limiting errors
    if (/rate.*limit|too many requests|requests per/i.test(errorMessage)) {
      return {
        userMessage: 'Too many AI requests at once. Please wait a moment before trying again.',
        category: ErrorCategory.QUOTA,
        isRetryable: true,
        userAction: 'Wait 30 seconds and try uploading your document again.',
        technicalDetails: errorMessage,
        errorCode: 'AI_RATE_LIMITED'
      }
    }

    // Usage quota exceeded
    return {
      userMessage: 'Usage limit reached. Please wait before trying again or upgrade your account.',
      category: ErrorCategory.QUOTA,
      isRetryable: true,
      userAction: 'Wait a few minutes and try again, or contact support to upgrade your account.',
      technicalDetails: errorMessage,
      errorCode: 'QUOTA_EXCEEDED'
    }
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(errorMessage: string, context: ErrorContext, _errorStack?: string): UserErrorInfo {
    const operation = context.operation || 'document processing'
    return {
      userMessage: `An unexpected error occurred during ${operation}. Please try again.`,
      category: ErrorCategory.SYSTEM,
      isRetryable: true,
      userAction: 'Try again in a few minutes. If the problem persists, please contact support.',
      technicalDetails: errorMessage,
      errorCode: 'GENERIC_ERROR'
    }
  }

  // Error detection helper methods - ordered by specificity
  private isQuotaError(message: string): boolean {
    // Only rate limiting and usage quotas, NOT storage quotas
    return (/rate.*limit|too many requests|requests per|monthly.*usage.*quota.*exceeded/i.test(message)) &&
           !/storage/i.test(message)
  }

  private isInputValidationError(message: string): boolean {
    // Be specific about file validation errors vs storage errors
    return /(file.*size.*exceed|size.*exceed.*maximum|file.*too large)|file type.*not (allowed|supported)|validation.*failed|invalid.*format|invalid.*schema/i.test(message)
  }

  private isStorageError(message: string): boolean {
    // Include storage quotas specifically
    return /(storage|bucket).*not found|storage.*unavailable|asset.*already exists|upload.*failed|download.*failed|storage.*quota|storage.*capacity/i.test(message) ||
           /permission.*denied|access.*denied|unauthorized/i.test(message) && /storage|upload|download|bucket/i.test(message) ||
           /file.*already.*exists|storage.*failed/i.test(message)
  }

  private isImageExtractionError(message: string): boolean {
    return /invalid.*bounding.*box|bounding.*box.*coordinates|bounding.*box.*too small|image.*too small|failed.*to.*load.*image|canvas.*memory|image.*extract|image.*processing.*error/i.test(message)
  }

  private isCaptionGenerationError(message: string): boolean {
    // Be very specific about AI/caption operations only
    return /caption.*generation.*failed|AI.*caption.*generation.*timed.*out|AI.*model.*service.*unavailable|AI.*service.*unavailable/i.test(message) ||
           (/caption|description|generate/i.test(message) && /AI.*error|unknown.*AI/i.test(message))
  }

  private isDatabaseError(message: string): boolean {
    return /database.*connection|database.*error|constraint.*violation|unique.*constraint|foreign.*key|sql.*error/i.test(message)
  }

  private isNetworkError(message: string): boolean {
    // Be specific about network connectivity, not just any "request"
    return /network.*connection|connection.*refused|network.*fetch.*failed|connection.*timeout/i.test(message) &&
           !/rate.*limit|too many requests/i.test(message) // Exclude rate limiting
  }
}

// Export singleton instance
export const userErrorMessageService = new UserErrorMessageService()

/**
 * Convenience function to convert error to user message
 */
export function getUserErrorMessage(
  error: Error | string,
  context: ErrorContext = {}
): UserErrorInfo {
  return userErrorMessageService.convertError(error, context)
}

/**
 * Format user error for display
 */
export function formatUserError(errorInfo: UserErrorInfo): string {
  let message = errorInfo.userMessage
  
  if (errorInfo.userAction) {
    message += ` ${errorInfo.userAction}`
  }
  
  return message
}