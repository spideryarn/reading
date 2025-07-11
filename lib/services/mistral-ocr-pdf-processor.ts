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
import { responseFormatFromZodObject } from '@mistralai/mistralai/extra/structChat.js'
import { createRequestLogger, createTimer } from '@/lib/services/logger'
import { boundingBoxSchema, ExtractedImage } from '@/lib/services/html-fragment-processor'
import { marked } from 'marked'
import { JSDOM } from 'jsdom'
import { PdfRegionExtractionOptions } from '@/lib/services/pdf-image-extractor-types'
import { extractPdfRegionAndUpload } from '@/lib/services/pdf-image-extractor-hybrid'

// Schema for processing options
export const mistralOcrProcessorOptionsSchema = z.object({
  pdfBuffer: z.instanceof(Buffer).describe('PDF file buffer'),
  fileName: z.string().describe('Original PDF filename'),
  correlationId: z.string().describe('Request correlation ID for logging'),
  singlePageOnly: z.boolean().default(false).describe('Process only first page for cost control'),
  documentId: z.string().describe('Document ID'),
  imageExtractionEnabled: z.boolean().default(true).describe('Enable image extraction'),
  extractionMethod: z.enum(['auto', 'direct', 'napi', 'wasm', 'legacy']).default('legacy').describe('PDF image extraction method')
})

export type MistralOcrProcessorOptions = z.infer<typeof mistralOcrProcessorOptionsSchema>

// Annotation schema for bbox annotations (minimal for now)
const imageAnnotationSchema = z.object({
  image_type: z.enum(['figure', 'chart', 'diagram', 'table', 'photo']).optional(),
  short_description: z.string().optional(),
  caption: z.string().optional(),
  contains_text: z.boolean().optional()
})

// Schema for Mistral image data
// Mistral sometimes omits bounding box coordinates for decorative images.
// Make the coordinate fields optional so that we can validate the page object
// without throwing and then skip such images during processing.
const mistralImageSchema = z.object({
  id: z.string(),
  topLeftX: z.number().optional(),
  topLeftY: z.number().optional(),
  bottomRightX: z.number().optional(),
  bottomRightY: z.number().optional(),
  image_base64: z.string().optional()
})

// Schema for Mistral page data (clean, no legacy fields)
const mistralPageSchema = z.object({
  index: z.number(),
  markdown: z.string(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    dpi: z.number().optional(),
  }),
  images: z.array(mistralImageSchema),
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
    elementType: z.enum(['figure', 'image', 'diagram', 'chart']),
    storagePath: z.string().optional(),
    signedUrl: z.string().optional(),
    fileSize: z.number().optional()
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
  
  // Declare savedEnv in outer scope for error handling
  let savedEnv: Record<string, string | undefined> = {}
  
  try {
    // Validate input
    const validatedOptions = mistralOcrProcessorOptionsSchema.parse(options)
    
    logger.info('Starting Mistral OCR PDF processing', {
      fileName: validatedOptions.fileName,
      bufferSize: validatedOptions.pdfBuffer.length,
      singlePageOnly: validatedOptions.singlePageOnly,
      extractionMethod: validatedOptions.extractionMethod,
      imageExtractionEnabled: validatedOptions.imageExtractionEnabled
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
    
    logger.info('Sending PDF to Mistral OCR API (with bbox annotations)')
    
    // Call Mistral OCR API
    const ocrResponse = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: dataUri
      },
      includeImageBase64: false, // Avoid large payload – bbox coords come with annotations
      bboxAnnotationFormat: responseFormatFromZodObject(imageAnnotationSchema)
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
    // Totals for final summary
    let totalImages = 0
    let imagesProcessed = 0
    let imagesSkipped = 0
    const elementUrlMap: Record<string, string> = {}
    let totalStorageBytes = 0
    
    if (!ocrResponse.pages || ocrResponse.pages.length === 0) {
      throw new Error('Mistral OCR returned no pages; cannot extract content')
    }
    
    // Configure extraction method once, outside the loops
    savedEnv = {
      PDF_DIRECT_EXTRACTION: process.env.PDF_DIRECT_EXTRACTION,
      PDF_USE_NAPI_CANVAS: process.env.PDF_USE_NAPI_CANVAS,
      PDF_USE_WASM_FALLBACK: process.env.PDF_USE_WASM_FALLBACK
    }
    
    // Always use hybrid extractor (legacy mode removed to eliminate skia-canvas dependency)
    // If legacy behavior is needed, the hybrid extractor can be configured via environment variables
    
    // Configure environment variables for hybrid extractor if not using legacy
    if (validatedOptions.extractionMethod !== 'legacy') {
      // Set env vars based on extraction method
      process.env.PDF_DIRECT_EXTRACTION = 'true'
      process.env.PDF_USE_NAPI_CANVAS = 'true'
      process.env.PDF_USE_WASM_FALLBACK = 'true'
      
      if (validatedOptions.extractionMethod === 'direct') {
        process.env.PDF_USE_NAPI_CANVAS = 'false'
        process.env.PDF_USE_WASM_FALLBACK = 'false'
      } else if (validatedOptions.extractionMethod === 'napi') {
        process.env.PDF_DIRECT_EXTRACTION = 'false'
        process.env.PDF_USE_WASM_FALLBACK = 'false'
      } else if (validatedOptions.extractionMethod === 'wasm') {
        process.env.PDF_DIRECT_EXTRACTION = 'false'
        process.env.PDF_USE_NAPI_CANVAS = 'false'
      }
      // 'auto' keeps all methods enabled
      
      // Log the extraction method being used
      logger.info('PDF extraction method configured', {
        extractionMethod: validatedOptions.extractionMethod,
        directEnabled: process.env.PDF_DIRECT_EXTRACTION,
        napiEnabled: process.env.PDF_USE_NAPI_CANVAS,  
        wasmEnabled: process.env.PDF_USE_WASM_FALLBACK
      })
    }

    for (const page of ocrResponse.pages) {
      // Validate page structure (throws on failure)
      const validatedPage = mistralPageSchema.parse(page)

      // Respect single-page mode
      if (validatedOptions.singlePageOnly && validatedPage.index > 0) {
        break
      }

      // --- Extract markdown text ---
      const pageText = validatedPage.markdown
      combinedMarkdown += pageText + '\n\n'

      // --- Page dimensions ---
      const dims = validatedPage.dimensions

      // --- Log page-level image statistics ---
      const imagesWithBBox = validatedPage.images.filter(img =>
        img.topLeftX != null &&
        img.topLeftY != null &&
        img.bottomRightX != null &&
        img.bottomRightY != null
      )
      const imagesMissingBBox = validatedPage.images.length - imagesWithBBox.length

      logger.info('Page image summary', {
        pageIndex: validatedPage.index,
        imageCount: validatedPage.images.length,
        imagesWithBBox: imagesWithBBox.length,
        imagesMissingBBox
      })

      // Update global counters
      totalImages += validatedPage.images.length

      // --- Process images with bounding boxes ---
      for (const image of validatedPage.images) {
        // Pick coordinate names in either snake_case or camelCase
        const tlx = image.topLeftX
        const tly = image.topLeftY
        const brx = image.bottomRightX
        const bry = image.bottomRightY

        if (tlx == null || tly == null || brx == null || bry == null) {
          warnings.push(`Image ${image.id} missing bounding box coordinates, skipping`)
          logger.warn('Skipping image without bounding box', {
            pageIndex: validatedPage.index,
            imageId: image.id,
            has_topLeftX: tlx != null,
            has_topLeftY: tly != null,
            has_bottomRightX: brx != null,
            has_bottomRightY: bry != null
          })
          imagesSkipped += 1
          continue
        }

        try {
          const x1 = tlx / dims.width
          const y1 = tly / dims.height
          const x2 = brx / dims.width
          const y2 = bry / dims.height

          // Validate normalized coordinates
          if ([x1, y1, x2, y2].some((v) => v < 0 || v > 1)) {
            warnings.push(`Image ${image.id} has coordinates out of range`)
            continue
          }

          // Minimum size threshold (2% of page)
          const MIN_SIZE = 0.02
          if (x2 - x1 < MIN_SIZE || y2 - y1 < MIN_SIZE) {
            warnings.push(`Image ${image.id} too small, skipping`)
            continue
          }

          const bbox = boundingBoxSchema.parse({
            x1: Number(x1.toFixed(4)),
            y1: Number(y1.toFixed(4)),
            x2: Number(x2.toFixed(4)),
            y2: Number(y2.toFixed(4)),
          })

          const elementId = `figure-${validatedPage.index}-${image.id}`

          const imageMeta: any = {
            elementId,
            bbox,
            elementType: 'figure',
            figureNumber: undefined,
            caption: undefined,
            altText: undefined
          }

          if (validatedOptions.imageExtractionEnabled) {
            // NOTE: Image extraction is a critical part of the v3 pipeline.  If it fails we want
            // the entire request to fail so the user can see and report the error, rather than
            // silently falling back to a broken <img src="img-x.jpeg"> placeholder that renders
            // as a 404.  Therefore we *do not* swallow errors here.
            
            const regionRes = await extractPdfRegionAndUpload({
              pdfBuffer: validatedOptions.pdfBuffer,
              documentId: validatedOptions.documentId,
              pageNumber: validatedPage.index + 1,
              elementId,
              bbox,
              outputFormat: 'png',
              quality: 0.95,
              scale: 2
            } as PdfRegionExtractionOptions)

            elementUrlMap[elementId] = regionRes.signedUrl
            imageMeta.storagePath = regionRes.storagePath
            imageMeta.signedUrl = regionRes.signedUrl
            imageMeta.fileSize = regionRes.size
            totalStorageBytes += regionRes.size
          }

          extractedImages.push(imageMeta)
          imagesProcessed += 1
        } catch (err) {
          // Fail fast – escalate the error so that the entire upload fails and the user is
          // immediately aware that image extraction is broken.
          throw err
        }
      }
    }
    
    // Restore original env vars after all extraction is complete
    if (validatedOptions.extractionMethod !== 'legacy') {
      Object.entries(savedEnv).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key]
        } else {
          process.env[key] = value
        }
      })
    }

    // Fail fast if we received no text
    if (combinedMarkdown.trim().length === 0) {
      throw new Error('Mistral OCR returned no markdown content for the supplied PDF')
    }
    
    // Log final summary before HTML conversion
    logger.info('Mistral OCR image processing summary', {
      totalImages,
      imagesProcessed,
      imagesSkipped,
      warningsCount: warnings.length
    })

    // Convert Markdown to HTML
    const html = markdownToHtml(combinedMarkdown)
    
    // Add bounding box data attributes to HTML
    let htmlWithBboxes = addBoundingBoxesToHtml(html, extractedImages, logger)
    
    // Inject src URLs for extracted images
    if (validatedOptions.imageExtractionEnabled && Object.keys(elementUrlMap).length > 0) {
      htmlWithBboxes = injectImageUrls(htmlWithBboxes, elementUrlMap, logger)
    }
    
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
    
    // Restore env vars on error as well
    if (Object.keys(savedEnv).length > 0) {
      Object.entries(savedEnv).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key]
        } else {
          process.env[key] = value
        }
      })
    }
    
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

function injectImageUrls(html: string, urlMap: Record<string, string>, logger: ReturnType<typeof createRequestLogger>): string {
  try {
    const dom = new JSDOM(html)
    const document = dom.window.document

    Object.entries(urlMap).forEach(([elementId, url]) => {
      const figure = document.getElementById(elementId)
      const img = figure?.querySelector('img')
      if (img) {
        img.setAttribute('src', url)
      }
    })

    return dom.serialize()
  } catch (e) {
    logger.error('Failed to inject image URLs', { error: e instanceof Error ? e.message : 'unknown' })
    return html
  }
}