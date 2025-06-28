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
  createPageToHtmlFragmentPrompt,
  pageToHtmlFragmentPromptInputSchema 
} from '@/lib/prompts/templates/page-to-html-fragment'
import { z } from 'zod'

// Schema for page processing input
export const pageProcessingInputSchema = z.object({
  pageImageBase64: z.string().min(1).describe('Base64 encoded page image'),
  pageNumber: z.number().int().min(1).describe('1-indexed page number'),
  totalPages: z.number().int().min(1).describe('Total pages in document'),
  fileName: z.string().optional().describe('Original filename for context'),
  documentContext: z.string().optional().describe('Overall document context (title, authors, subject)'),
  previousPageSummary: z.string().optional().describe('Summary of previous page content for continuity')
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
  success: z.boolean(),
  error: z.string().optional()
})

export type PageProcessingInput = z.infer<typeof pageProcessingInputSchema>
export type PageProcessingResult = z.infer<typeof pageProcessingResultSchema>

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
 * Process a single page image to HTML fragment
 */
export async function processPageToHtml(
  input: PageProcessingInput,
  provider: 'claude' | 'gemini' = 'gemini'
): Promise<PageProcessingResult> {
  const logger = createRequestLogger()
  const startTime = Date.now()
  
  try {
    // Validate input
    const validatedInput = pageProcessingInputSchema.parse(input)
    logger.info('Processing page to HTML', {
      pageNumber: validatedInput.pageNumber,
      totalPages: validatedInput.totalPages,
      provider,
      hasFileName: !!validatedInput.fileName,
      hasContext: !!validatedInput.documentContext,
      hasPreviousSummary: !!validatedInput.previousPageSummary
    })
    
    // Get the appropriate prompt template
    const promptTemplate = createPageToHtmlFragmentPrompt(provider)
    
    // Execute the multimodal prompt
    const result = await executeMultimodalPromptWithUsage(promptTemplate, validatedInput)
    
    const processingTimeMs = Date.now() - startTime
    
    logger.info('Page processing completed', {
      pageNumber: validatedInput.pageNumber,
      processingTimeMs,
      tokenUsage: result.usage,
      htmlLength: result.text.length
    })
    
    return pageProcessingResultSchema.parse({
      pageNumber: validatedInput.pageNumber,
      htmlFragment: result.text,
      processingTimeMs,
      tokenUsage: result.usage,
      success: true
    })
    
  } catch (error) {
    const processingTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error('Page processing failed', {
      pageNumber: input.pageNumber,
      processingTimeMs,
      error: errorMessage,
      provider
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
      success: false,
      error: errorMessage
    })
  }
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
  const chunks: Array<Promise<PageProcessingResult>[]> = []
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