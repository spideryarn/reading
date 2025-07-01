/**
 * Image Caption Generation Service
 * 
 * Generates AI-powered captions and descriptions for extracted image regions
 * using the dedicated image caption generation prompt template.
 * 
 * Part of the vision-based PDF processing pipeline Stage 2.
 */

import { createRequestLogger } from '@/lib/services/logger'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { 
  imageCaptionPrompt, 
  imageCaptionOutputSchema,
  imageCaptionGenerationPromptInputSchema 
} from '@/lib/prompts/templates/image-caption-generation'
import { z } from 'zod'
import type { BoundingBox } from '@/lib/services/html-fragment-processor'

// Re-export types for external use
export type ImageCaptionInput = z.infer<typeof imageCaptionGenerationPromptInputSchema>
export type ImageCaptionOutput = z.infer<typeof imageCaptionOutputSchema>

// Schema for batch caption generation input
export const batchCaptionInputSchema = z.object({
  images: z.array(z.object({
    imageBase64: z.string().min(1),
    pageNumber: z.number().int().min(1),
    boundingBox: z.object({
      x1: z.number().min(0).max(1),
      y1: z.number().min(0).max(1),
      x2: z.number().min(0).max(1),
      y2: z.number().min(0).max(1)
    }),
    elementId: z.string().optional(),
    existingAltText: z.string().optional()
  })).min(1).max(10), // Limit batch size for performance
  documentContext: z.string().optional(),
  extractionPurpose: z.enum(['filename', 'alt_text', 'detailed_description']).default('filename')
})

// Schema for batch caption generation result
export const batchCaptionResultSchema = z.object({
  results: z.array(z.object({
    elementId: z.string().optional(),
    pageNumber: z.number().int().min(1),
    boundingBox: z.object({
      x1: z.number().min(0).max(1),
      y1: z.number().min(0).max(1),
      x2: z.number().min(0).max(1),
      y2: z.number().min(0).max(1)
    }),
    caption: z.object({
      caption: z.string().min(1).max(100),
      description: z.string().min(1).max(500),
      confidence: z.number().min(0).max(1),
      imageType: z.enum(['figure', 'table', 'equation', 'diagram', 'chart', 'graph', 'photo', 'illustration', 'other']),
      academicRelevance: z.enum(['high', 'medium', 'low'])
    }),
    processingTimeMs: z.number(),
    success: z.boolean(),
    error: z.string().optional()
  })),
  totalTimeMs: z.number(),
  successCount: z.number(),
  failureCount: z.number()
})

export type BatchCaptionInput = z.infer<typeof batchCaptionInputSchema>
export type BatchCaptionResult = z.infer<typeof batchCaptionResultSchema>

/**
 * Error thrown when image caption generation fails
 */
export class ImageCaptionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'ImageCaptionError'
  }
}

/**
 * Generate AI-powered caption for a single image region
 * 
 * @param input - Caption generation parameters
 * @returns Promise resolving to generated caption data
 * @throws ImageCaptionError if generation fails
 */
export async function generateImageCaption(
  input: ImageCaptionInput
): Promise<ImageCaptionOutput> {
  const logger = createRequestLogger('/services/image-caption-generator', `caption-${Date.now()}`)
  const startTime = Date.now()
  
  try {
    logger.info('Starting image caption generation', {
      pageNumber: input.pageNumber,
      extractionPurpose: input.extractionPurpose,
      hasDocumentContext: !!input.documentContext,
      boundingBox: input.boundingBox
    })
    
    // Call AI prompt template
    const result = await executePromptWithUsage(imageCaptionPrompt, input)
    
    // Validate response structure
    let parsedOutput: ImageCaptionOutput
    try {
      // Parse the text result as JSON
      const jsonResult = JSON.parse(result.text)
      parsedOutput = imageCaptionOutputSchema.parse(jsonResult)
    } catch (parseError) {
      throw new ImageCaptionError(
        `AI response validation failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}. Response: ${result.text}`
      )
    }
    
    const processingTimeMs = Date.now() - startTime
    
    logger.info('Image caption generation completed', {
      pageNumber: input.pageNumber,
      processingTimeMs,
      caption: parsedOutput.caption,
      confidence: parsedOutput.confidence,
      imageType: parsedOutput.imageType,
      academicRelevance: parsedOutput.academicRelevance
    })
    
    return parsedOutput
    
  } catch (error) {
    const processingTimeMs = Date.now() - startTime
    
    if (error instanceof ImageCaptionError) {
      logger.error('Image caption generation failed', {
        pageNumber: input.pageNumber,
        processingTimeMs,
        error: error.message
      })
      throw error
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected caption generation error', {
      pageNumber: input.pageNumber,
      processingTimeMs,
      error: errorMessage
    })
    
    throw new ImageCaptionError(`Caption generation failed: ${errorMessage}`, error instanceof Error ? error : undefined)
  }
}

/**
 * Generate captions for multiple images in batch
 * 
 * @param input - Batch caption generation parameters  
 * @returns Promise resolving to batch results
 */
export async function generateBatchCaptions(
  input: BatchCaptionInput
): Promise<BatchCaptionResult> {
  const logger = createRequestLogger('/services/image-caption-generator', `batch-${Date.now()}`)
  const startTime = Date.now()
  
  try {
    // Validate input
    const validatedInput = batchCaptionInputSchema.parse(input)
    
    logger.info('Starting batch caption generation', {
      imageCount: validatedInput.images.length,
      extractionPurpose: validatedInput.extractionPurpose,
      hasDocumentContext: !!validatedInput.documentContext
    })
    
    const results: BatchCaptionResult['results'] = []
    let successCount = 0
    let failureCount = 0
    
    // Process images sequentially to avoid overwhelming the AI service
    for (let i = 0; i < validatedInput.images.length; i++) {
      const imageInput = validatedInput.images[i]
      if (!imageInput) {
        throw new ImageCaptionError(`Image input at index ${i} is undefined`)
      }
      
      const imageStartTime = Date.now()
      
      try {
        const captionInput: ImageCaptionInput = {
          imageBase64: imageInput.imageBase64,
          pageNumber: imageInput.pageNumber,
          documentContext: validatedInput.documentContext,
          boundingBox: imageInput.boundingBox,
          extractionPurpose: validatedInput.extractionPurpose
        }
        
        const caption = await generateImageCaption(captionInput)
        
        results.push({
          elementId: imageInput.elementId,
          pageNumber: imageInput.pageNumber,
          boundingBox: imageInput.boundingBox,
          caption,
          processingTimeMs: Date.now() - imageStartTime,
          success: true
        })
        
        successCount++
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        logger.error('Individual caption generation failed', {
          imageIndex: i,
          pageNumber: imageInput.pageNumber,
          elementId: imageInput.elementId,
          error: errorMessage
        })
        
        results.push({
          elementId: imageInput.elementId,
          pageNumber: imageInput.pageNumber,
          boundingBox: imageInput.boundingBox,
          caption: {
            caption: '',
            description: '',
            confidence: 0,
            imageType: 'other',
            academicRelevance: 'low'
          },
          processingTimeMs: Date.now() - imageStartTime,
          success: false,
          error: errorMessage
        })
        
        failureCount++
        
        // Per coding principles: fail fast for any individual failure
        throw new ImageCaptionError(`Batch caption generation failed at image ${i + 1}: ${errorMessage}`)
      }
    }
    
    const totalTimeMs = Date.now() - startTime
    
    logger.info('Batch caption generation completed', {
      imageCount: validatedInput.images.length,
      successCount,
      failureCount,
      totalTimeMs,
      avgTimePerImage: Math.round(totalTimeMs / validatedInput.images.length)
    })
    
    return batchCaptionResultSchema.parse({
      results,
      totalTimeMs,
      successCount,
      failureCount
    })
    
  } catch (error) {
    const totalTimeMs = Date.now() - startTime
    
    if (error instanceof ImageCaptionError) {
      logger.error('Batch caption generation failed', {
        totalTimeMs,
        error: error.message
      })
      throw error
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected batch caption error', {
      totalTimeMs,
      error: errorMessage
    })
    
    throw new ImageCaptionError(`Batch caption generation failed: ${errorMessage}`, error instanceof Error ? error : undefined)
  }
}

/**
 * Generate caption with fallback to existing alt text
 * 
 * @param imageBase64 - Base64 image data
 * @param pageNumber - Page number for context
 * @param boundingBox - Image bounding box
 * @param existingAltText - Existing alt text as fallback
 * @param documentContext - Optional document context
 * @returns Promise resolving to caption (AI-generated or fallback)
 */
export async function generateCaptionWithFallback(
  imageBase64: string,
  pageNumber: number,
  boundingBox: BoundingBox,
  existingAltText?: string,
  documentContext?: string
): Promise<{ caption: string; source: 'ai' | 'alt_text' | 'fallback'; confidence: number }> {
  const logger = createRequestLogger('/services/image-caption-generator', `fallback-${Date.now()}`)
  
  try {
    // First, try AI caption generation
    const aiCaption = await generateImageCaption({
      imageBase64,
      pageNumber,
      documentContext,
      boundingBox,
      extractionPurpose: 'filename'
    })
    
    // Use AI caption if confidence is reasonable
    if (aiCaption.confidence >= 0.3 && aiCaption.caption.trim().length > 0) {
      logger.info('Using AI-generated caption', {
        pageNumber,
        caption: aiCaption.caption,
        confidence: aiCaption.confidence
      })
      
      return {
        caption: aiCaption.caption,
        source: 'ai',
        confidence: aiCaption.confidence
      }
    }
    
    logger.warn('AI caption has low confidence, falling back to alt text', {
      pageNumber,
      aiCaption: aiCaption.caption,
      aiConfidence: aiCaption.confidence
    })
    
  } catch (error) {
    logger.warn('AI caption generation failed, falling back to alt text', {
      pageNumber,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  // Fall back to existing alt text if available
  if (existingAltText && existingAltText.trim().length > 0) {
    logger.info('Using existing alt text as caption', {
      pageNumber,
      altText: existingAltText
    })
    
    return {
      caption: existingAltText.trim(),
      source: 'alt_text',
      confidence: 0.5 // Medium confidence for human-provided alt text
    }
  }
  
  // Final fallback: generic caption
  const fallbackCaption = `image-page-${pageNumber}`
  
  logger.info('Using fallback caption', {
    pageNumber,
    fallbackCaption
  })
  
  return {
    caption: fallbackCaption,
    source: 'fallback',
    confidence: 0.1 // Low confidence for generic caption
  }
}

/**
 * Validate caption generation capabilities
 */
export function validateCaptionEnvironment(): { supported: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check if prompt template is available
  try {
    if (typeof imageCaptionPrompt !== 'function') {
      errors.push('Image caption prompt template not available')
    }
  } catch (error) {
    errors.push('Failed to load image caption prompt template')
  }
  
  // Check if schemas are available
  try {
    imageCaptionOutputSchema.parse({
      caption: 'test',
      description: 'test',
      confidence: 0.5,
      imageType: 'other',
      academicRelevance: 'low'
    })
  } catch (error) {
    errors.push('Caption output schema validation failed')
  }
  
  return {
    supported: errors.length === 0,
    errors
  }
}