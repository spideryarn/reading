/**
 * Gemini Native PDF Processor Service
 * 
 * Handles PDF processing using Gemini's native PDF capabilities with bounding box extraction.
 * This is the core implementation for the v3 pipeline that leverages Gemini's unique
 * ability to extract bounding boxes from PDFs without converting to images.
 * 
 * Key features:
 * - Direct PDF processing without image conversion
 * - Automatic bounding box extraction in 0-1000 scale
 * - Coordinate normalization to 0-1 scale for downstream processing
 * - Token counting and validation before processing
 * - Finish reason checking to prevent silent truncation
 */

import { z } from 'zod'
import { executeMultimodalPromptWithUsage } from '@/lib/prompts/types'
import { pdfToHtmlV3GeminiNativePrompt } from '@/lib/prompts/templates/pdf-to-html-v3-gemini-native'
import { UPLOAD_LIMITS } from '@/lib/config/upload-limits'
import { createRequestLogger, createTimer } from '@/lib/services/logger'
import { boundingBoxSchema, ExtractedImage } from '@/lib/services/html-fragment-processor'
import { JSDOM } from 'jsdom'

// Schema for processing options
export const geminiNativePdfProcessorOptionsSchema = z.object({
  pdfBuffer: z.instanceof(Buffer).describe('PDF file buffer'),
  fileName: z.string().describe('Original PDF filename'),
  correlationId: z.string().describe('Request correlation ID for logging'),
  singlePageOnly: z.boolean().default(false).describe('Process only first page for cost control'),
  documentId: z.string().optional().describe('Document ID for future image extraction'),
  imageExtractionEnabled: z.boolean().default(true).describe('Enable image extraction (not yet implemented)')
})

export type GeminiNativePdfProcessorOptions = z.infer<typeof geminiNativePdfProcessorOptionsSchema>

// Schema for processing result
export const geminiNativePdfProcessorResultSchema = z.object({
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

export type GeminiNativePdfProcessorResult = z.infer<typeof geminiNativePdfProcessorResultSchema>

/**
 * Process a PDF using Gemini's native capabilities
 */
export async function processWithGeminiNative(
  options: GeminiNativePdfProcessorOptions
): Promise<GeminiNativePdfProcessorResult> {
  const logger = createRequestLogger('/services/gemini-native-pdf-processor', options.correlationId)
  const timer = createTimer(logger, 'gemini-native-pdf-processing')
  
  try {
    // Validate input
    const validatedOptions = geminiNativePdfProcessorOptionsSchema.parse(options)
    
    logger.info('Starting Gemini native PDF processing', {
      fileName: validatedOptions.fileName,
      bufferSize: validatedOptions.pdfBuffer.length,
      singlePageOnly: validatedOptions.singlePageOnly
    })
    
    // Check PDF size against Gemini-specific limit
    if (validatedOptions.pdfBuffer.length > UPLOAD_LIMITS.PDF_GEMINI_API_PROCESSING_LIMIT) {
      throw new Error(
        `PDF file too large for Gemini processing (max ${Math.round(UPLOAD_LIMITS.PDF_GEMINI_API_PROCESSING_LIMIT / 1024 / 1024)}MB)`
      )
    }
    
    // Check PDF header
    const pdfHeader = validatedOptions.pdfBuffer.subarray(0, 4).toString()
    if (pdfHeader !== '%PDF') {
      throw new Error('Invalid PDF file format')
    }
    
    const startTime = Date.now()
    
    // Execute Gemini prompt with v3 template
    logger.info('Sending PDF to Gemini with v3 prompt template')
    
    const result = await executeMultimodalPromptWithUsage(pdfToHtmlV3GeminiNativePrompt, {
      pdfBuffer: validatedOptions.pdfBuffer,
      fileName: validatedOptions.fileName,
      singlePageOnly: validatedOptions.singlePageOnly
    })
    
    const processingTimeMs = Date.now() - startTime
    
    // Check for output truncation
    if (result.finishReason === 'length') {
      throw new Error(
        'Document too large for processing. Gemini reached its token limit. ' +
        'Please try with a shorter document or enable single-page processing.'
      )
    }
    
    logger.info('Gemini processing completed', {
      tokensUsed: result.usage.totalTokens,
      processingTimeMs,
      finishReason: result.finishReason,
      htmlLength: result.text.length
    })
    
    // Extract and normalize bounding boxes
    const { normalizedHtml, extractedImages, warnings } = normalizeGeminiBoundingBoxes(
      result.text,
      logger
    )
    
    timer.end({
      tokensUsed: result.usage.totalTokens,
      imagesExtracted: extractedImages.length,
      warningsCount: warnings.length
    })
    
    return geminiNativePdfProcessorResultSchema.parse({
      html: normalizedHtml,
      extractedImages,
      usage: result.usage,
      finishReason: result.finishReason,
      processingTimeMs,
      warnings,
      rawResponse: result.rawResponse
    })
    
  } catch (error) {
    logger.error('Gemini native PDF processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    timer.end({ error: true })
    
    throw error
  }
}

/**
 * Normalize bounding boxes from Gemini's 0-1000 scale to 0-1 scale
 */
function normalizeGeminiBoundingBoxes(
  html: string,
  logger: ReturnType<typeof createRequestLogger>
): { normalizedHtml: string; extractedImages: ExtractedImage[]; warnings: string[] } {
  // --- NEW CONSTANTS & HELPERS ---
  const MIN_EDGE_NORMALISED = 0.02 // ~2% of page – ignore tiny artefacts
  const round = (n: number) => Number(n.toFixed(4))
  // ---------------------------------
  const warnings: string[] = []
  const extractedImages: ExtractedImage[] = []
  
  try {
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // Find all elements with bounding boxes
    const elementsWithBbox = document.querySelectorAll('[data-bbox]')
    
    logger.info('Found elements with bounding boxes', {
      count: elementsWithBbox.length
    })
    
    elementsWithBbox.forEach((element: Element, index: number) => {
      try {
        const bboxData = element.getAttribute('data-bbox')
        if (!bboxData) return
        
        // Parse coordinates (expecting four comma-separated numbers)
        const rawCoords = bboxData.split(',').map((coord: string) => parseFloat(coord.trim()))
        if (rawCoords.length !== 4 || rawCoords.some(isNaN)) {
          warnings.push(`Invalid bounding box format at element ${index}: ${bboxData}`)
          return
        }
        
        // Helper: map possible coordinate orders
        const mapCoords = (coords: number[], order: 'xy' | 'yx'): [number, number, number, number] =>
          order === 'xy'
            ? [coords[0]!, coords[1]!, coords[2]!, coords[3]!] // x1,y1,x2,y2 (prompt spec)
            : [coords[1]!, coords[0]!, coords[3]!, coords[2]!] // y,x order → convert to x,y
        
        // Try prompt-specified order first; if invalid geometry fall back to y,x order
        const tryOrders: ('xy' | 'yx')[] = ['xy', 'yx'] // Prioritise x,y,x,y order; YX used as fallback
        let mapped: [number, number, number, number] | null = null
        // We validated rawCoords length === 4 above, so mapped will always have 4 numeric entries.
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (const ord of tryOrders) {
          const [tX1, tY1, tX2, tY2] = mapCoords(rawCoords, ord)
          if (tX1 < tX2 && tY1 < tY2) {
            mapped = [tX1, tY1, tX2, tY2]
            break
          }
        }
        if (!mapped) {
          warnings.push(`Unable to resolve coordinate order at element ${index}: ${bboxData}`)
          return
        }
        
        // Normalise from 0-1000 → 0-1, round to 4dp
        // mapped is non-null here because earlier branch returns when null.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const [rawA, rawB, rawC, rawD] = mapped! as [number, number, number, number]
        const nx1 = round(rawA / 1000)
        const ny1 = round(rawB / 1000)
        const nx2 = round(rawC / 1000)
        const ny2 = round(rawD / 1000)
        
        // Validate range and minimum size
        if ([nx1, ny1, nx2, ny2].some((v: number) => v < 0 || v > 1)) {
          warnings.push(`Bounding box coordinates out of range at element ${index}: ${bboxData}`)
          return
        }
        if ((nx2 - nx1) < MIN_EDGE_NORMALISED || (ny2 - ny1) < MIN_EDGE_NORMALISED) {
          warnings.push(`Bounding box too small at element ${index}: width ${(nx2 - nx1).toFixed(4)}, height ${(ny2 - ny1).toFixed(4)}`)
          return
        }
        
        // Update element attribute with normalised coords (x1,y1,x2,y2)
        const normalisedBboxAttr = [nx1, ny1, nx2, ny2].join(',')
        element.setAttribute('data-bbox', normalisedBboxAttr)
        
        // Build bbox object for downstream
        const bbox = boundingBoxSchema.parse({ x1: nx1, y1: ny1, x2: nx2, y2: ny2 })
        
        // Determine element type and extract metadata
        let elementType: 'figure' | 'image' | 'diagram' | 'chart' = 'image'
        const tagName = element.tagName.toLowerCase()
        
        if (tagName === 'figure') {
          elementType = 'figure'
        } else if (element.classList.contains('diagram')) {
          elementType = 'diagram'
        } else if (element.classList.contains('chart')) {
          elementType = 'chart'
        } else if (tagName === 'table') {
          // Tables with bounding boxes might be charts
          elementType = 'chart'
        }
        
        // Extract caption and other metadata
        let caption: string | undefined
        let figureNumber: string | undefined
        
        if (tagName === 'table') {
          // For tables, look for caption element
          const tableCaption = element.querySelector('caption')
          caption = tableCaption?.textContent?.trim()
        } else {
          // For figures and other elements, look for figcaption
          const figcaption = element.querySelector('figcaption')
          caption = figcaption?.textContent?.trim()
        }
        
        // Extract figure number from caption
        if (caption) {
          const match = caption.match(/(?:Figure|Fig\.?|Table)\s+(\d+(?:\.\d+)?)/i)
          if (match) {
            figureNumber = match[1]
          }
        }
        
        // Generate element ID if not present
        let elementId = element.getAttribute('id')
        if (!elementId) {
          elementId = `${elementType}-${index + 1}`
          element.setAttribute('id', elementId)
        }
        
        extractedImages.push({
          elementId,
          bbox,
          figureNumber,
          caption,
          altText: undefined, // Will be populated during image extraction
          elementType
        })
        
      } catch (error) {
        warnings.push(`Failed to process bounding box at element ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
    
    logger.info('Bounding box normalization completed', {
      totalElements: elementsWithBbox.length,
      successfulExtractions: extractedImages.length,
      warningsCount: warnings.length
    })
    
    // Return the normalized HTML
    return {
      normalizedHtml: dom.serialize(),
      extractedImages,
      warnings
    }
    
  } catch (error) {
    logger.error('Failed to normalize bounding boxes', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    warnings.push(`Bounding box normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    // Return original HTML if normalization fails
    return {
      normalizedHtml: html,
      extractedImages: [],
      warnings
    }
  }
}

/**
 * Validate that a PDF can be processed with Gemini Native
 */
export function canProcessWithGeminiNative(pdfBuffer: Buffer): { 
  canProcess: boolean; 
  reason?: string 
} {
  // Check size limit
  if (pdfBuffer.length > UPLOAD_LIMITS.PDF_GEMINI_API_PROCESSING_LIMIT) {
    return {
      canProcess: false,
      reason: `PDF exceeds Gemini processing limit of ${Math.round(UPLOAD_LIMITS.PDF_GEMINI_API_PROCESSING_LIMIT / 1024 / 1024)}MB`
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