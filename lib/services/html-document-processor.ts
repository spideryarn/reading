/**
 * Shared HTML Document Processing Pipeline
 * 
 * Consolidates post-HTML-generation processing logic that was duplicated across
 * upload-pdf, extract-url, and upload-html APIs. This service handles the common
 * flow: HTML → Sanitization → Prettification → Text Extraction → Document Creation.
 * 
 * Eliminates 150-240 lines of duplicated code while adding consistent HTML prettification
 * controlled by the ENABLE_HTML_PRETTIFICATION feature flag.
 */

import { DocumentService } from '@/lib/services/database/documents'
import { sanitizeAcademicContent } from '@/lib/utils/html-sanitizer'
import { extractCleanText } from '@/lib/utils/html-text-extraction'
import { prettifyAcademicHtmlSafe } from '@/lib/utils/html-prettifier'
import { generateSlug } from '@/lib/utils/slug'
import { sanitizeDocumentTitle } from '@/lib/utils/document-title'
import type { Logger } from '@/lib/services/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Processing metadata required for document creation
 */
export interface ProcessingMetadata {
  title: string
  sourceUrl?: string
  isPublic: boolean
  originalFile?: File | Blob
  filename?: string
  provider?: string
  correlationId: string
  aiCallId?: string
}

/**
 * Processing options for pipeline configuration
 */
export interface ProcessingOptions {
  extractionMethod: string
  uploadSource: 'pdf' | 'url' | 'url-pdf' | 'html-upload'
  logger: Logger
  userId: string
  supabase: SupabaseClient
}

/**
 * Additional metadata fields specific to each upload source
 */
export interface AdditionalMetadata {
  // PDF-specific fields
  file_size_bytes?: number
  model_used?: string
  
  // URL-specific fields
  content_size_kb?: number
  extracted_size_kb?: number
  content_type_detected?: string
  original_url?: string
  
  // HTML-specific fields
  processed_size_kb?: number
  processing_method?: string
}

/**
 * Result of HTML processing pipeline
 */
export interface ProcessedDocument {
  document: any // Database document record
  storageResult?: any // Storage upload result
}

/**
 * Result of sanitization, prettification, and text extraction step
 */
export interface SanitizedContent {
  sanitizedHtml: string
  prettifiedHtml: string
  plaintext: string
}

/**
 * Main HTML document processing pipeline
 * 
 * Handles the complete flow from raw HTML to stored document:
 * 1. HTML sanitization for security
 * 2. HTML prettification for consistency (if enabled via feature flag)
 * 3. Plain text extraction for search/analysis
 * 4. Document metadata generation
 * 5. Database storage with file upload
 * 
 * @param htmlContent - Raw HTML content to process
 * @param metadata - Document metadata and configuration
 * @param options - Processing options and dependencies
 * @param additionalMetadata - Source-specific metadata fields
 * @returns Processed document with storage information
 */
export async function processHtmlToDocument(
  htmlContent: string,
  metadata: ProcessingMetadata,
  options: ProcessingOptions,
  additionalMetadata: AdditionalMetadata = {}
): Promise<ProcessedDocument> {
  const { logger, userId, extractionMethod, uploadSource, supabase } = options
  const { correlationId, sourceUrl, isPublic, originalFile, filename, aiCallId } = metadata

  // Sanitize the document title first
  const sanitizedTitle = sanitizeDocumentTitle(metadata.title)

  // Step 1: Sanitize HTML content and extract plaintext
  logger.info({
    correlationId,
    step: 'html-sanitization',
    contentLength: htmlContent.length,
    originalTitle: metadata.title,
    sanitizedTitle
  }, 'Starting HTML sanitization and text extraction')

  const { sanitizedHtml, prettifiedHtml, plaintext } = await sanitizeAndExtractText(
    htmlContent, 
    logger, 
    correlationId
  )

  // Step 2: Generate document slug and metadata
  logger.info({
    correlationId,
    step: 'document-preparation',
    sanitizedLength: sanitizedHtml.length,
    plaintextLength: plaintext.length,
    wordCount: plaintext.split(/\s+/).length
  }, 'Preparing document for storage')

  const slug = generateSlug(sanitizedTitle)
  const wordCount = plaintext.split(/\s+/).length

  // Step 3: Generate upload metadata with source-specific fields
  const uploadMetadata = generateUploadMetadata(
    uploadSource,
    extractionMethod,
    metadata.provider,
    additionalMetadata
  )

  // Step 4: Create document with storage integration
  logger.info({
    correlationId,
    step: 'document-creation',
    slug,
    wordCount,
    hasOriginalFile: !!originalFile
  }, 'Creating document with storage integration')

  const documentService = new DocumentService(supabase)

  const { document, storageResult } = await documentService.createWithStorage(
    userId,
    {
      title: sanitizedTitle,
      html_content: prettifiedHtml,
      plaintext_content: plaintext,
      slug,
      source_url: sourceUrl || null,
      is_public: isPublic,
      word_count: wordCount
    },
    originalFile,
    filename || 'document',
    uploadMetadata,
    aiCallId
  )

  logger.info({
    correlationId,
    step: 'document-created',
    documentId: document.id,
    documentSlug: document.slug,
    hasStorageResult: !!storageResult
  }, 'Document processing pipeline completed successfully')

  return {
    document,
    storageResult
  }
}

/**
 * Sanitize HTML content, prettify if enabled, and extract clean plaintext
 * 
 * Consolidates the sanitization + prettification + text extraction logic that was duplicated
 * across all three upload APIs. The flow is: Sanitization → Prettification → Text Extraction.
 * Uses proper DOM-based text extraction instead of regex patterns.
 * 
 * @param htmlContent - Raw HTML content to process
 * @param logger - Logger for tracking processing steps
 * @param correlationId - Request correlation ID for tracking
 * @returns Sanitized HTML, prettified HTML, and extracted plaintext
 */
export async function sanitizeAndExtractText(
  htmlContent: string,
  logger: Logger,
  correlationId: string
): Promise<SanitizedContent> {
  // Step 1: Sanitize HTML content for security (always applied)
  let sanitizedHtml: string
  try {
    sanitizedHtml = sanitizeAcademicContent(htmlContent)
    logger.info({
      correlationId,
      step: 'sanitization-complete',
      sanitizedLength: sanitizedHtml.length,
      originalLength: htmlContent.length,
      contentReduction: Math.round((1 - sanitizedHtml.length / htmlContent.length) * 100)
    }, 'HTML sanitization completed successfully')
  } catch (sanitizationError) {
    logger.error({
      correlationId,
      step: 'sanitization-failed',
      error: sanitizationError instanceof Error ? sanitizationError.message : 'Unknown sanitization error',
      originalLength: htmlContent.length
    }, 'HTML sanitization failed')
    throw new Error(`Content sanitization failed: ${sanitizationError instanceof Error ? sanitizationError.message : 'Unknown sanitization error'}`)
  }

  // Step 2: Prettify HTML if enabled via feature flag
  const prettificationEnabled = process.env.ENABLE_HTML_PRETTIFICATION === 'true'
  let prettifiedHtml: string
  
  if (prettificationEnabled) {
    logger.info({
      correlationId,
      step: 'prettification-start',
      sanitizedLength: sanitizedHtml.length,
      prettificationEnabled: true
    }, 'Starting HTML prettification')

    const prettificationStartTime = Date.now()
    prettifiedHtml = prettifyAcademicHtmlSafe(sanitizedHtml, logger, correlationId)
    const prettificationTime = Date.now() - prettificationStartTime

    logger.info({
      correlationId,
      step: 'prettification-complete',
      prettificationTimeMs: prettificationTime,
      prettifiedLength: prettifiedHtml.length,
      sizeChange: prettifiedHtml.length - sanitizedHtml.length,
      isIdentical: prettifiedHtml === sanitizedHtml
    }, 'HTML prettification completed')
  } else {
    // Prettification disabled - use sanitized HTML as-is
    prettifiedHtml = sanitizedHtml
    logger.info({
      correlationId,
      step: 'prettification-skipped',
      prettificationEnabled: false
    }, 'HTML prettification skipped (feature flag disabled)')
  }

  // Step 3: Extract clean plaintext using proper DOM parsing (not regex)
  logger.info({
    correlationId,
    step: 'text-extraction',
    sourceLength: prettifiedHtml.length
  }, 'Starting plaintext extraction from processed HTML')

  const plaintext = extractCleanText(prettifiedHtml)
  
  logger.info({
    correlationId,
    step: 'text-extraction-complete',
    plaintextLength: plaintext.length,
    wordCount: plaintext.split(/\s+/).length
  }, 'Plaintext extraction completed successfully')

  return {
    sanitizedHtml,
    prettifiedHtml,
    plaintext
  }
}

/**
 * Generate upload metadata with source-specific fields
 * 
 * Creates standardized metadata structure while preserving source-specific
 * variations that were present in the original APIs.
 * 
 * @param uploadSource - Source type of the upload
 * @param extractionMethod - Method used to process content
 * @param provider - AI provider used (if applicable)
 * @param additionalFields - Source-specific metadata fields
 * @returns Standardized upload metadata object
 */
export function generateUploadMetadata(
  uploadSource: 'pdf' | 'url' | 'url-pdf' | 'html-upload',
  extractionMethod: string,
  provider?: string,
  additionalFields: AdditionalMetadata = {}
): Record<string, any> {
  // Base metadata common to all sources
  const baseMetadata = {
    extraction_method: extractionMethod,
    provider_used: provider || null,
    upload_source: uploadSource
  }

  // Merge with source-specific fields
  return {
    ...baseMetadata,
    ...additionalFields
  }
}

/**
 * Create standardized error for processing failures
 * 
 * Provides consistent error handling patterns that were duplicated across APIs
 * while preserving source-specific error context.
 * 
 * @param step - Processing step where error occurred
 * @param error - Original error object
 * @param context - Additional context for debugging
 * @returns Standardized error with enhanced context
 */
export function createProcessingError(
  step: string,
  error: unknown,
  context: Record<string, any> = {}
): Error {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const contextInfo = Object.keys(context).length > 0 
    ? ` (Context: ${JSON.stringify(context)})`
    : ''
  
  return new Error(`Processing failed at ${step}: ${errorMessage}${contextInfo}`)
}

/**
 * Standard error handling for sanitization failures
 * 
 * Provides the specialized error response logic that was duplicated across
 * all three APIs for sanitization-related failures.
 * 
 * @param error - Sanitization error
 * @param uploadSource - Source of the upload for context
 * @returns HTTP response details for the error
 */
export function handleSanitizationError(
  error: Error,
  uploadSource: string
): { message: string; status: number } {
  const sourceContext = {
    'pdf': 'PDF processing',
    'url': 'Web page import',
    'url-pdf': 'PDF URL processing',
    'html-upload': 'HTML processing'
  }[uploadSource] || 'Processing'

  if (error.message.includes('too large')) {
    return {
      message: `${sourceContext} failed: Generated content is too large to process safely`,
      status: 413
    }
  }
  
  if (error.message.includes('invalid result')) {
    return {
      message: `${sourceContext} failed: Content sanitization produced invalid results`,
      status: 422
    }
  }
  
  return {
    message: `${sourceContext} failed: Content could not be safely processed for security reasons`,
    status: 422
  }
}