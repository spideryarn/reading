/**
 * Mistral OCR PDF Processor Service
 * 
 * Handles PDF processing using Mistral's OCR API with image bounding box extraction.
 * This provides an alternative to Gemini Native for the v3 pipeline with superior
 * text extraction quality and competitive pricing.
 * 
 * Key features:
 * - Direct PDF processing with OCR
 * - Image bounding box extraction in pixel coordinates
 * - Markdown to HTML conversion
 * - Coordinate normalization from pixels to 0-1 scale
 * - Page-based processing with metadata
 */

import { z } from 'zod'
import { Mistral } from '@mistralai/mistralai'
import { UPLOAD_LIMITS } from '@/lib/config/upload-limits'
import { createRequestLogger, createTimer } from '@/lib/services/logger'
import { boundingBoxSchema, ExtractedImage } from '@/lib/services/html-fragment-processor'
import { marked } from 'marked'
import { JSDOM } from 'jsdom'

// Schema for processing options
export const mistralOcrProcessorOptionsSchema = z.object({
  pdfBuffer: z.instanceof(Buffer).describe('PDF file buffer'),
  fileName: z.string().describe('Original PDF filename'),
  correlationId: z.string().describe('Request correlation ID for logging'),
  singlePageOnly: z.boolean().default(false).describe('Process only first page for cost control')
})

export type MistralOcrProcessorOptions = z.infer<typeof mistralOcrProcessorOptionsSchema>

// Schema for Mistral image data
const mistralImageSchema = z.object({
  id: z.string(),
  top_left_x: z.number(),
  top_left_y: z.number(),
  bottom_right_x: z.number(),
  bottom_right_y: z.number(),
  image_base64: z.string().optional()
})

// Schema for Mistral page data
const mistralPageSchema = z.object({
  index: z.number(),
  content: z.string(),
  dpi: z.number().optional(),
  height: z.number(),
  width: z.number(),
  images: z.array(mistralImageSchema)
})

// Schema for processing result
export const mistralOcrProcessorResultSchema = z.object({
  html: z.string().describe('Processed HTML with bounding boxes'),
  extractedImages: z.array(z.object({
    elementId: z.string(),
    bbox: boundingBoxSchema,
    figureNumber: z.string().optional(),
    caption: z.string().optional(),
    altText: z.string().optional(),
    elementType: z.enum(['figure', 'image', 'diagram', 'chart'])
  })).describe('Images with normalized bounding boxes'),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number()
  }),
  finishReason: z.string(),
  processingTimeMs: z.number(),
  warnings: z.array(z.string()).default([]),
  rawResponse: z.record(z.unknown()).optional().describe('Raw API response for comprehensive logging')
})

export type MistralOcrProcessorResult = z.infer<typeof mistralOcrProcessorResultSchema>

/**
 * Convert Mistral's Markdown output to HTML
 */
function markdownToHtml(markdown: string): string {
  // Configure marked for clean HTML output
  marked.setOptions({
    breaks: true,
    gfm: true,
    pedantic: false
  })
  
  return marked.parse(markdown) as string
}

/**
 * Process a PDF using Mistral's OCR capabilities
 */
export async function processWithMistralOcr(
  options: MistralOcrProcessorOptions
): Promise<MistralOcrProcessorResult> {
  const logger = createRequestLogger('/services/mistral-ocr-pdf-processor', options.correlationId)
  const timer = createTimer(logger, 'mistral-ocr-pdf-processing')
  
  try {
    // Validate input
    const validatedOptions = mistralOcrProcessorOptionsSchema.parse(options)
    
    logger.info('Starting Mistral OCR PDF processing', {
      fileName: validatedOptions.fileName,
      bufferSize: validatedOptions.pdfBuffer.length,
      singlePageOnly: validatedOptions.singlePageOnly
    })
    
    // Check PDF size against Mistral limit (50MB)
    const MISTRAL_PDF_LIMIT = 50 * 1024 * 1024 // 50MB
    if (validatedOptions.pdfBuffer.length > MISTRAL_PDF_LIMIT) {
      throw new Error(
        `PDF file too large for Mistral processing (max 50MB)`
      )
    }
    
    // Check PDF header
    const pdfHeader = validatedOptions.pdfBuffer.subarray(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      throw new Error('Invalid PDF file format')
    }
    
    // Initialize Mistral client
    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable not set')
    }
    
    const client = new Mistral({ apiKey })
    
    const startTime = Date.now()
    
    // Convert PDF to base64 for Mistral API
    const base64Pdf = validatedOptions.pdfBuffer.toString('base64')
    const dataUri = `data:application/pdf;base64,${base64Pdf}`
    
    logger.info('Sending PDF to Mistral OCR API')
    
    // Call Mistral OCR API
    const ocrResponse = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: dataUri
      },
      includeImageBase64: false // We don't need the base64 images for now
    })
    
    const processingTimeMs = Date.now() - startTime
    
    logger.info('Mistral OCR processing completed', {
      pageCount: ocrResponse.pages?.length || 0,
      processingTimeMs
    })
    
    // Process pages and combine into single HTML document
    let combinedMarkdown = ''
    const extractedImages: ExtractedImage[] = []
    const warnings: string[] = []
    
    if (ocrResponse.pages) {
      for (const page of ocrResponse.pages) {
        try {
          // Validate page data
          const validatedPage = mistralPageSchema.parse(page)
          
          // Add page content
          if (validatedOptions.singlePageOnly && validatedPage.index > 0) {
            break
          }
          
          combinedMarkdown += validatedPage.content + '\n\n'
          
          // Process images with bounding boxes
          validatedPage.images.forEach((image, imgIndex) => {
            try {
              // Normalize coordinates from pixel to 0-1 scale
              const x1 = image.top_left_x / validatedPage.width
              const y1 = image.top_left_y / validatedPage.height
              const x2 = image.bottom_right_x / validatedPage.width
              const y2 = image.bottom_right_y / validatedPage.height
              
              // Validate normalized coordinates
              if ([x1, y1, x2, y2].some(v => v < 0 || v > 1)) {
                warnings.push(`Image ${image.id} has coordinates out of range`)
                return
              }
              
              // Check minimum size (2% of page)
              const MIN_SIZE = 0.02
              if ((x2 - x1) < MIN_SIZE || (y2 - y1) < MIN_SIZE) {
                warnings.push(`Image ${image.id} too small, skipping`)
                return
              }
              
              // Create bounding box
              const bbox = boundingBoxSchema.parse({
                x1: Number(x1.toFixed(4)),
                y1: Number(y1.toFixed(4)),
                x2: Number(x2.toFixed(4)),
                y2: Number(y2.toFixed(4))
              })
              
              // Generate element ID
              const elementId = `figure-${validatedPage.index}-${imgIndex + 1}`
              
              extractedImages.push({
                elementId,
                bbox,
                elementType: 'figure', // Default to figure, could be enhanced with classification
                figureNumber: undefined, // Could extract from surrounding text
                caption: undefined, // Could extract from surrounding text
                altText: undefined
              })
              
            } catch (error) {
              warnings.push(`Failed to process image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
          })
          
        } catch (error) {
          warnings.push(`Failed to process page ${page.index}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }
    
    // Convert Markdown to HTML
    const html = markdownToHtml(combinedMarkdown)
    
    // Add bounding box data attributes to HTML
    const htmlWithBboxes = addBoundingBoxesToHtml(html, extractedImages, logger)
    
    // Calculate token usage estimate (Mistral charges per page, but we'll estimate tokens for consistency)
    const pageCount = validatedOptions.singlePageOnly ? 1 : (ocrResponse.pages?.length || 0)
    const estimatedTokens = pageCount * 1000 // Rough estimate: 1000 tokens per page
    
    timer.end({
      pageCount,
      imagesExtracted: extractedImages.length,
      warningsCount: warnings.length
    })
    
    return mistralOcrProcessorResultSchema.parse({
      html: htmlWithBboxes,
      extractedImages,
      usage: {
        promptTokens: estimatedTokens,
        completionTokens: 0, // OCR doesn't have completion tokens
        totalTokens: estimatedTokens
      },
      finishReason: 'complete',
      processingTimeMs,
      warnings,
      rawResponse: ocrResponse as Record<string, unknown>
    })
    
  } catch (error) {
    logger.error('Mistral OCR PDF processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    timer.end({ error: true })
    
    throw error
  }
}

/**
 * Add bounding box data attributes to HTML elements
 */
function addBoundingBoxesToHtml(
  html: string,
  extractedImages: ExtractedImage[],
  logger: ReturnType<typeof createRequestLogger>
): string {
  if (extractedImages.length === 0) {
    return html
  }
  
  try {
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // Find all images in the HTML
    const images = document.querySelectorAll('img')
    
    logger.info('Adding bounding boxes to HTML', {
      imageCount: images.length,
      extractedImageCount: extractedImages.length
    })
    
    // Match extracted images to HTML images (simple approach - could be enhanced)
    images.forEach((img: Element, index: number) => {
      if (index < extractedImages.length) {
        const extractedImage = extractedImages[index]
        if (extractedImage) {
          // Create figure wrapper with bounding box
          const figure = document.createElement('figure')
          figure.setAttribute('id', extractedImage.elementId)
          figure.setAttribute('data-bbox', `${extractedImage.bbox.x1},${extractedImage.bbox.y1},${extractedImage.bbox.x2},${extractedImage.bbox.y2}`)
          figure.className = extractedImage.elementType
          
          // Wrap image in figure
          img.parentNode?.insertBefore(figure, img)
          figure.appendChild(img)
        }
      }
    })
    
    return dom.serialize()
    
  } catch (error) {
    logger.error('Failed to add bounding boxes to HTML', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    // Return original HTML if enhancement fails
    return html
  }
}

/**
 * Check if Mistral OCR is available (API key is set)
 */
export function isMistralOcrAvailable(): boolean {
  return !!process.env.MISTRAL_API_KEY
}

/**
 * Validate that a PDF can be processed with Mistral OCR
 */
export function canProcessWithMistralOcr(pdfBuffer: Buffer): { 
  canProcess: boolean; 
  reason?: string 
} {
  // Check if API key is available
  if (!isMistralOcrAvailable()) {
    return {
      canProcess: false,
      reason: 'Mistral API key not configured'
    }
  }
  
  // Check size limit (50MB)
  const MISTRAL_PDF_LIMIT = 50 * 1024 * 1024
  if (pdfBuffer.length > MISTRAL_PDF_LIMIT) {
    return {
      canProcess: false,
      reason: `PDF exceeds Mistral processing limit of 50MB`
    }
  }
  
  // Check PDF header
  const pdfHeader = pdfBuffer.subarray(0, 4).toString()
  if (pdfHeader !== '%PDF') {
    return {
      canProcess: false,
      reason: 'Invalid PDF file format'
    }
  }
  
  return { canProcess: true }
}