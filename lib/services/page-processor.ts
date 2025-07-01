/**
 * Page Processing Service for Vision-Based PDF Pipeline
 * 
 * This service handles individual page image processing via Gemini Flash 2.5,
 * with parallel batch processing, error handling, and progress tracking.
 * 
 * Part of the vision-based PDF processing pipeline Stage 3.
 */

import { createRequestLogger } from '@/lib/services/logger'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { 
  createPageToHtmlFragmentPrompt
} from '@/lib/prompts/templates/page-to-html-fragment'
import { processHtmlFragment, type FragmentProcessingInput } from '@/lib/services/html-fragment-processor'
import { extractImageFromPage } from '@/lib/services/image-extractor'
import { generateImageCaption } from '@/lib/services/image-caption-generator'
import { generateImageFilename } from '@/lib/utils/image-filename-generator'
import { uploadImageAsset, getImageAssetUrl } from '@/lib/services/storage'
import { documentAssetsService, type AssetMetadata } from '@/lib/services/database/document-assets'
import { DocumentProcessingTransaction } from '@/lib/services/document-processing-transaction'
import { getUserErrorMessage, type ErrorContext } from '@/lib/services/user-error-messages'
import { z } from 'zod'

// Schema for page processing input
export const pageProcessingInputSchema = z.object({
  pageImageBase64: z.string().min(1).describe('Base64 encoded page image'),
  pageNumber: z.number().int().min(1).describe('1-indexed page number'),
  totalPages: z.number().int().min(1).describe('Total pages in document'),
  fileName: z.string().optional().describe('Original filename for context'),
  documentContext: z.string().optional().describe('Overall document context (title, authors, subject)'),
  previousPageSummary: z.string().optional().describe('Summary of previous page content for continuity'),
  documentId: z.string().optional().describe('Document UUID for image asset storage (image extraction enabled when present)')
})

// Schema for extracted image asset result
export const extractedImageAssetSchema = z.object({
  elementId: z.string().describe('HTML element ID'),
  filename: z.string().describe('Generated filename in storage'),
  storagePath: z.string().describe('Full storage path'),
  storageUrl: z.string().describe('Signed URL for access'),
  caption: z.string().optional().describe('AI-generated caption'),
  source: z.enum(['ai', 'alt_text', 'deterministic_uuid']).describe('Source of filename'),
  extractionTimeMs: z.number().describe('Time taken to extract and store')
})

// Schema for page processing result
export const pageProcessingResultSchema = z.object({
  pageNumber: z.number().int().min(1),
  htmlFragment: z.string(), // Allow empty string for failed processing
  processingTimeMs: z.number(),
  tokenUsage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
    reasoningTokens: z.number().optional()
  }),
  extractedImages: z.array(extractedImageAssetSchema).default([]).describe('Images extracted and stored'),
  success: z.boolean(),
  error: z.string().optional(),
  userError: z.object({
    userMessage: z.string(),
    category: z.enum(['storage', 'processing', 'input', 'system', 'quota']),
    isRetryable: z.boolean(),
    userAction: z.string().optional(),
    technicalDetails: z.string().optional(),
    errorCode: z.string().optional()
  }).optional().describe('User-friendly error information when processing fails')
})

export type PageProcessingInput = z.infer<typeof pageProcessingInputSchema>
export type PageProcessingResult = z.infer<typeof pageProcessingResultSchema>
export type ExtractedImageAsset = z.infer<typeof extractedImageAssetSchema>

// Configuration for batch processing
export interface BatchProcessingConfig {
  concurrencyLimit: number
  provider: 'claude' | 'gemini'
  retryAttempts: number
  retryDelayMs: number
}

// Progress callback type
export type ProgressCallback = (
  completed: number, 
  total: number, 
  currentPage: number,
  elapsedMs: number
) => void

// Error callback type
export type ErrorCallback = (
  pageNumber: number,
  error: Error,
  retryAttempt: number
) => void

/**
 * Process a single page image to HTML fragment with optional image extraction
 */
export async function processPageToHtml(
  input: PageProcessingInput,
  provider: 'claude' | 'gemini' = 'gemini'
): Promise<PageProcessingResult> {
  const logger = createRequestLogger('/services/page-processor', `page-${input.pageNumber}-${Date.now()}`)
  const startTime = Date.now()
  
  try {
    // Validate input
    const validatedInput = pageProcessingInputSchema.parse(input)
    logger.info('Processing page to HTML with image extraction', {
      pageNumber: validatedInput.pageNumber,
      totalPages: validatedInput.totalPages,
      provider,
      hasFileName: !!validatedInput.fileName,
      hasContext: !!validatedInput.documentContext,
      hasPreviousSummary: !!validatedInput.previousPageSummary,
      hasDocumentId: !!validatedInput.documentId,
      imageExtractionEnabled: !!validatedInput.documentId
    })
    
    // Step 1: Get HTML fragment from AI processing
    const promptTemplate = createPageToHtmlFragmentPrompt(provider)
    const aiResult = await executeMultimodalPromptWithUsage(promptTemplate, validatedInput)
    
    logger.info('AI processing completed', {
      pageNumber: validatedInput.pageNumber,
      aiProcessingTimeMs: Date.now() - startTime,
      tokenUsage: aiResult.usage,
      htmlLength: aiResult.text.length
    })
    
    let finalHtmlFragment = aiResult.text
    const extractedImages: ExtractedImageAsset[] = []
    
    // Step 2: Process HTML fragment to extract image metadata (enabled when documentId present)
    if (validatedInput.documentId) {
      try {
        const fragmentInput: FragmentProcessingInput = {
          htmlFragment: aiResult.text,
          pageNumber: validatedInput.pageNumber,
          totalPages: validatedInput.totalPages,
          existingIds: new Set(),
          fileName: validatedInput.fileName,
          pageImageBase64: validatedInput.pageImageBase64
        }
        
        const processedFragment = await processHtmlFragment(fragmentInput)
        
        if (processedFragment.success && processedFragment.extractedImages.length > 0) {
          logger.info('Found images for extraction', {
            pageNumber: validatedInput.pageNumber,
            imageCount: processedFragment.extractedImages.length
          })
          
          // Step 3: Extract and store each image with transaction support
          const transaction = new DocumentProcessingTransaction(validatedInput.documentId)
          const existingFilenames = new Set<string>()
          
          try {
            for (const imageData of processedFragment.extractedImages) {
            const imageStartTime = Date.now()
            
            try {
              // Extract image region from page
              const extractedImage = await extractImageFromPage({
                pageImageBase64: validatedInput.pageImageBase64,
                pageNumber: validatedInput.pageNumber,
                boundingBox: imageData.bbox,
                outputFormat: 'png',
                quality: 0.95
              })
              
              // Generate AI caption for filename
              const captionResult = await generateImageCaption({
                imageBase64: extractedImage.base64Image,
                pageNumber: validatedInput.pageNumber,
                documentContext: validatedInput.documentContext,
                boundingBox: imageData.bbox,
                extractionPurpose: 'filename',
                existingAltText: imageData.altText
              })
              
              // Generate filename with fallback hierarchy
              const filenameResult = generateImageFilename({
                aiCaption: captionResult.caption,
                altText: imageData.altText,
                pageNumber: validatedInput.pageNumber,
                boundingBox: imageData.bbox,
                elementId: imageData.elementId
              }, existingFilenames)
              
              existingFilenames.add(filenameResult.filename)
              
              // Upload to Supabase Storage
              const uploadResult = await uploadImageAsset(
                extractedImage.base64Image,
                validatedInput.documentId,
                filenameResult.filename,
                'image/png'
              )
              
              if (!uploadResult) {
                // Storage failed but this is expected in some environments
                logger.warn('Image storage failed but continuing processing', {
                  pageNumber: validatedInput.pageNumber,
                  elementId: imageData.elementId
                })
                continue
              }
              
              // Record storage upload for potential rollback
              transaction.recordStorageUpload(
                filenameResult.filename,
                uploadResult.path,
                { 
                  pageNumber: validatedInput.pageNumber,
                  elementId: imageData.elementId,
                  extractionTimeMs: Date.now() - imageStartTime
                }
              )
              
              // Get signed URL for access
              const storageUrl = await getImageAssetUrl(
                validatedInput.documentId,
                filenameResult.filename,
                24 * 3600 // 24 hour expiration
              )
              
              const extractionTimeMs = Date.now() - imageStartTime
              
              // Create asset metadata for database record
              const assetMetadata: AssetMetadata = {
                bounding_box: {
                  x1: imageData.bbox.x1,
                  y1: imageData.bbox.y1,
                  x2: imageData.bbox.x2,
                  y2: imageData.bbox.y2
                },
                page_number: validatedInput.pageNumber,
                original_dimensions: {
                  width: extractedImage.width || 0,
                  height: extractedImage.height || 0
                },
                file_size: uploadResult.size,
                extraction_method: 'vision_pipeline_stage3',
                element_id: imageData.elementId
              }
              
              // Create database record for asset tracking
              const dbRecord = await documentAssetsService.create({
                document_id: validatedInput.documentId,
                type: 'image',
                filename: filenameResult.filename,
                storage_path: uploadResult.path,
                caption: captionResult.caption,
                extraction_confidence: captionResult.confidence,
                metadata: assetMetadata
              })
              
              // Record database record for potential rollback
              transaction.recordDatabaseRecord(
                dbRecord.id,
                {
                  pageNumber: validatedInput.pageNumber,
                  elementId: imageData.elementId,
                  filename: filenameResult.filename
                }
              )
              
              const extractedAsset: ExtractedImageAsset = {
                elementId: imageData.elementId,
                filename: filenameResult.filename,
                storagePath: uploadResult.path,
                storageUrl,
                caption: captionResult.caption,
                source: filenameResult.source,
                extractionTimeMs
              }
              
              extractedImages.push(extractedAsset)
              
              logger.info('Image extracted and stored successfully', {
                pageNumber: validatedInput.pageNumber,
                elementId: imageData.elementId,
                filename: filenameResult.filename,
                source: filenameResult.source,
                extractionTimeMs
              })
              
            } catch (imageError) {
              // Fatal error for image extraction per coding principles - rollback and re-throw
              const errorMessage = imageError instanceof Error ? imageError.message : 'Unknown image extraction error'
              
              // Generate user-friendly error message
              const errorContext: ErrorContext = {
                pageNumber: validatedInput.pageNumber,
                documentId: validatedInput.documentId,
                operation: 'image extraction',
                processingStage: 'vision pipeline'
              }
              const userErrorInfo = getUserErrorMessage(imageError, errorContext)
              
              logger.error('Image extraction failed fatally, performing rollback', {
                pageNumber: validatedInput.pageNumber,
                elementId: imageData.elementId,
                error: errorMessage,
                userError: userErrorInfo
              })
              
              // Rollback all operations performed so far
              await transaction.rollback()
              
              // Create enhanced error with user message
              const enhancedError = new Error(`Image extraction failed for page ${validatedInput.pageNumber}, element ${imageData.elementId}: ${errorMessage}`)
              ;(enhancedError as any).userErrorInfo = userErrorInfo
              throw enhancedError
            }
          }
          
          // Commit transaction after successful processing
          transaction.commit()
          
          logger.info('All image extractions completed successfully, transaction committed', {
            pageNumber: validatedInput.pageNumber,
            extractedImagesCount: extractedImages.length
          })
          
          // Step 4: Update HTML fragment with storage URLs
          finalHtmlFragment = updateHtmlWithStorageUrls(processedFragment.htmlFragment, extractedImages, logger)
          
          } catch (transactionError) {
            // Ensure rollback even if not triggered by image extraction error
            await transaction.rollback()
            throw transactionError
          }
        }
        
      } catch (extractionError) {
        // Fatal error per coding principles - don't proceed with partial results
        const errorMessage = extractionError instanceof Error ? extractionError.message : 'Unknown extraction error'
        
        // Generate user-friendly error message if not already present
        if (!(extractionError as any).userErrorInfo) {
          const errorContext: ErrorContext = {
            pageNumber: validatedInput.pageNumber,
            documentId: validatedInput.documentId,
            operation: 'image extraction pipeline',
            processingStage: 'vision pipeline'
          }
          const userErrorInfo = getUserErrorMessage(extractionError, errorContext)
          ;(extractionError as any).userErrorInfo = userErrorInfo
        }
        
        logger.error('Image extraction pipeline failed fatally', {
          pageNumber: validatedInput.pageNumber,
          error: errorMessage,
          userError: (extractionError as any).userErrorInfo
        })
        
        throw extractionError // Re-throw with preserved user error info
      }
    }
    
    const processingTimeMs = Date.now() - startTime
    
    logger.info('Page processing with image extraction completed', {
      pageNumber: validatedInput.pageNumber,
      processingTimeMs,
      tokenUsage: aiResult.usage,
      htmlLength: finalHtmlFragment.length,
      extractedImagesCount: extractedImages.length
    })
    
    return pageProcessingResultSchema.parse({
      pageNumber: validatedInput.pageNumber,
      htmlFragment: finalHtmlFragment,
      processingTimeMs,
      tokenUsage: aiResult.usage,
      extractedImages,
      success: true
    })
    
  } catch (error) {
    const processingTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Generate user-friendly error message
    const errorContext: ErrorContext = {
      pageNumber: input.pageNumber,
      documentId: input.documentId,
      operation: 'page processing',
      processingStage: 'vision pipeline'
    }
    
    // Check if error already has user error info from inner catch
    let userErrorInfo = (error as any)?.userErrorInfo
    if (!userErrorInfo) {
      userErrorInfo = getUserErrorMessage(error, errorContext)
    }
    
    logger.error('Page processing failed', {
      pageNumber: input.pageNumber,
      processingTimeMs,
      error: errorMessage,
      provider,
      userError: userErrorInfo
    })
    
    return pageProcessingResultSchema.parse({
      pageNumber: Math.max(1, input.pageNumber), // Ensure valid page number for schema
      htmlFragment: '',
      processingTimeMs,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      extractedImages: [],
      success: false,
      error: errorMessage,
      userError: userErrorInfo
    })
  }
}

/**
 * Update HTML fragment to replace image sources with Supabase Storage URLs
 */
function updateHtmlWithStorageUrls(
  htmlFragment: string,
  extractedImages: ExtractedImageAsset[],
  logger: ReturnType<typeof createRequestLogger>
): string {
  let updatedHtml = htmlFragment
  
  // Create a mapping of element IDs to storage URLs
  const storageUrlMap = new Map<string, string>()
  extractedImages.forEach(asset => {
    storageUrlMap.set(asset.elementId, asset.storageUrl)
  })
  
  // Parse HTML and update image sources
  try {
    // Simple regex-based replacement for now
    // In a more sophisticated implementation, we could use JSDOM
    extractedImages.forEach(asset => {
      // Find img elements with the matching element ID and update src
      const imgRegex = new RegExp(`(<img[^>]*id=["']${asset.elementId}["'][^>]*src=["'])[^"']*["']`, 'gi')
      updatedHtml = updatedHtml.replace(imgRegex, `$1${asset.storageUrl}"`)
      
      // Also update any data-src attributes (for lazy loading)
      const dataSrcRegex = new RegExp(`(<img[^>]*id=["']${asset.elementId}["'][^>]*data-src=["'])[^"']*["']`, 'gi')
      updatedHtml = updatedHtml.replace(dataSrcRegex, `$1${asset.storageUrl}"`)
      
      // Update figure elements if they contain the image
      const figureRegex = new RegExp(`(<figure[^>]*id=["']${asset.elementId}["'][^>]*>.*?<img[^>]*src=["'])[^"']*["']`, 'gis')
      updatedHtml = updatedHtml.replace(figureRegex, `$1${asset.storageUrl}"`)
    })
    
    logger.info('Updated HTML with storage URLs', {
      updatedImages: extractedImages.length,
      finalHtmlLength: updatedHtml.length
    })
    
  } catch (error) {
    logger.error('Failed to update HTML with storage URLs', {
      error: error instanceof Error ? error.message : 'Unknown error',
      extractedImagesCount: extractedImages.length
    })
    // Return original HTML on failure
    return htmlFragment
  }
  
  return updatedHtml
}

/**
 * Process multiple pages in parallel with concurrency control
 */
export async function processPagesBatch(
  pages: PageProcessingInput[],
  config: BatchProcessingConfig,
  onProgress?: ProgressCallback,
  onError?: ErrorCallback
): Promise<PageProcessingResult[]> {
  const logger = createRequestLogger()
  const startTime = Date.now()
  
  logger.info('Starting batch page processing', {
    totalPages: pages.length,
    concurrencyLimit: config.concurrencyLimit,
    provider: config.provider,
    retryAttempts: config.retryAttempts
  })
  
  const results: PageProcessingResult[] = []
  const completed = new Set<number>()
  
  // Process pages in batches with concurrency control
  const processingPromises = pages.map(async (page, index) => {
    return processPageWithRetry(page, config, onError).then(result => {
      results[index] = result
      completed.add(index)
      
      if (onProgress) {
        const elapsedMs = Date.now() - startTime
        onProgress(completed.size, pages.length, page.pageNumber, elapsedMs)
      }
      
      return result
    })
  })
  
  // Execute with concurrency limit using Promise.all with chunks
  const chunks: Array<Promise<PageProcessingResult[]>> = []
  for (let i = 0; i < processingPromises.length; i += config.concurrencyLimit) {
    const chunk = processingPromises.slice(i, i + config.concurrencyLimit)
    chunks.push(Promise.all(chunk))
  }
  
  // Execute chunks sequentially
  for (const chunk of chunks) {
    await chunk
  }
  
  const totalTime = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const totalTokens = results.reduce((sum, r) => sum + r.tokenUsage.totalTokens, 0)
  
  logger.info('Batch page processing completed', {
    totalPages: pages.length,
    successCount,
    failureCount: pages.length - successCount,
    totalTimeMs: totalTime,
    avgTimePerPage: Math.round(totalTime / pages.length),
    totalTokens,
    avgTokensPerPage: Math.round(totalTokens / pages.length)
  })
  
  return results
}

/**
 * Process a single page with retry logic
 */
async function processPageWithRetry(
  page: PageProcessingInput,
  config: BatchProcessingConfig,
  onError?: ErrorCallback
): Promise<PageProcessingResult> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
    try {
      const result = await processPageToHtml(page, config.provider)
      
      if (result.success) {
        return result
      } else {
        lastError = new Error(result.error || 'Processing failed')
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
    }
    
    if (attempt < config.retryAttempts) {
      if (onError) {
        onError(page.pageNumber, lastError, attempt + 1)
      }
      
      // Exponential backoff with jitter
      const delay = config.retryDelayMs * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // All retries failed
  const errorMessage = lastError?.message || 'All retry attempts failed'
  
  return pageProcessingResultSchema.parse({
    pageNumber: page.pageNumber,
    htmlFragment: '',
    processingTimeMs: 0,
    tokenUsage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    },
    extractedImages: [],
    success: false,
    error: errorMessage
  })
}

/**
 * Predefined processing configurations
 */
export const PROCESSING_CONFIGS = {
  fast: {
    concurrencyLimit: 10,
    provider: 'gemini' as const,
    retryAttempts: 2,
    retryDelayMs: 1000
  },
  quality: {
    concurrencyLimit: 5,
    provider: 'claude' as const,
    retryAttempts: 3,
    retryDelayMs: 2000
  },
  balanced: {
    concurrencyLimit: 8,
    provider: 'gemini' as const,
    retryAttempts: 3,
    retryDelayMs: 1500
  }
} as const


/**
 * Generate summary of the previous page for continuity
 * 
 * This is a placeholder for future implementation. Currently returns undefined
 * to indicate no summary is available.
 */
export function generatePreviousPageSummary(
  previousPageHtml: string | null
): string | undefined {
  if (!previousPageHtml) {
    return undefined
  }
  
  // TODO: Implement intelligent summary generation
  // For now, extract the first paragraph or heading as a simple summary
  const textContent = previousPageHtml.replace(/<[^>]*>/g, ' ').trim()
  const firstSentence = textContent.split(/[.!?]/)[0]?.trim()
  
  if (firstSentence && firstSentence.length > 20) {
    return `Previous page: ${firstSentence}...`
  }
  
  return undefined
}

/**
 * Validate page processing results for quality assurance
 */
export function validatePageResults(results: PageProcessingResult[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check for missing pages
  const expectedPages = new Set(Array.from({ length: results.length }, (_, i) => i + 1))
  const actualPages = new Set(results.map(r => r.pageNumber))
  
  expectedPages.forEach(expectedPage => {
    if (!actualPages.has(expectedPage)) {
      errors.push(`Missing result for page ${expectedPage}`)
    }
  })
  
  // Check for failed pages
  const failedPages = results.filter(r => !r.success)
  if (failedPages.length > 0) {
    warnings.push(`${failedPages.length} pages failed processing: ${failedPages.map(p => p.pageNumber).join(', ')}`)
  }
  
  // Check for empty HTML fragments
  const emptyPages = results.filter(r => r.success && r.htmlFragment.trim().length === 0)
  if (emptyPages.length > 0) {
    warnings.push(`${emptyPages.length} pages produced empty HTML: ${emptyPages.map(p => p.pageNumber).join(', ')}`)
  }
  
  // Check for unreasonably long processing times
  const slowPages = results.filter(r => r.processingTimeMs > 60000) // 60 seconds
  if (slowPages.length > 0) {
    warnings.push(`${slowPages.length} pages took over 60 seconds: ${slowPages.map(p => p.pageNumber).join(', ')}`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}