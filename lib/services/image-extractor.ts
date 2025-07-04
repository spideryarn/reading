/**
 * Image Region Extraction Service
 * 
 * Extracts specific image regions from PDF page images using bounding box coordinates.
 * Uses HTML5 Canvas API for precise cropping and supports configurable output formats.
 * 
 * Part of the vision-based PDF processing pipeline Stage 2.
 */

import { createRequestLogger } from '@/lib/services/logger'
import { z } from 'zod'
import type { BoundingBox } from '@/lib/services/html-fragment-processor'

// Schema for image extraction input
export const imageExtractionInputSchema = z.object({
  pageImageBase64: z.string().min(1).describe('Base64 page image data (with or without data: prefix)'),
  pageNumber: z.number().int().min(1).describe('1-indexed page number for context'),
  boundingBox: z.object({
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1),
    x2: z.number().min(0).max(1),
    y2: z.number().min(0).max(1)
  }).describe('Normalized bounding box coordinates (0-1 scale)'),
  outputFormat: z.enum(['png', 'jpeg']).default('png').describe('Output image format'),
  quality: z.number().min(0.1).max(1.0).default(0.95).describe('Output quality for JPEG (0.1-1.0)')
})

// Schema for extraction result
export const imageExtractionResultSchema = z.object({
  base64Image: z.string().describe('Extracted image as base64 data URL'),
  format: z.enum(['png', 'jpeg']).describe('Output format used'),
  width: z.number().int().min(1).describe('Extracted image width in pixels'),
  height: z.number().int().min(1).describe('Extracted image height in pixels'),
  originalPageWidth: z.number().int().min(1).describe('Original page image width'),
  originalPageHeight: z.number().int().min(1).describe('Original page image height'),
  extractionTimeMs: z.number().describe('Time taken for extraction'),
  boundingBox: z.object({
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1),
    x2: z.number().min(0).max(1),
    y2: z.number().min(0).max(1)
  }).describe('Bounding box used for extraction')
})

export type ImageExtractionInput = z.infer<typeof imageExtractionInputSchema>
export type ImageExtractionResult = z.infer<typeof imageExtractionResultSchema>

/**
 * Error thrown when image extraction fails
 */
export class ImageExtractionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'ImageExtractionError'
  }
}

/**
 * Validate bounding box coordinates
 */
function validateBoundingBox(bbox: BoundingBox): void {
  if (bbox.x1 >= bbox.x2) {
    throw new ImageExtractionError(`Invalid bounding box: x1 (${bbox.x1}) must be less than x2 (${bbox.x2})`)
  }
  if (bbox.y1 >= bbox.y2) {
    throw new ImageExtractionError(`Invalid bounding box: y1 (${bbox.y1}) must be less than y2 (${bbox.y2})`)
  }
  
  // Check for minimum size (at least ~1% of page in each dimension, with floating point tolerance)
  const width = bbox.x2 - bbox.x1
  const height = bbox.y2 - bbox.y1
  const MIN_SIZE = 0.009 // Slightly less than 1% to handle floating point precision
  if (width < MIN_SIZE || height < MIN_SIZE) {
    throw new ImageExtractionError(`Bounding box too small: ${width.toFixed(3)} x ${height.toFixed(3)} (minimum ~0.01 x 0.01)`)
  }
}

/**
 * Load image from base64 data URL
 */
function loadImageFromBase64(base64Data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => resolve(img)
    img.onerror = () => reject(new ImageExtractionError('Failed to load page image from base64 data'))
    
    // Handle base64 data with or without data URL prefix
    const dataUrl = base64Data.startsWith('data:') 
      ? base64Data 
      : `data:image/png;base64,${base64Data}`
    
    img.src = dataUrl
  })
}

/**
 * Extract image region using Canvas API
 */
function extractImageRegion(
  sourceImage: HTMLImageElement,
  bbox: BoundingBox,
  outputFormat: 'png' | 'jpeg',
  quality: number
): { base64Image: string; width: number; height: number } {
  // Calculate pixel coordinates from normalized bounding box
  const sourceWidth = sourceImage.naturalWidth
  const sourceHeight = sourceImage.naturalHeight
  
  const x = Math.round(bbox.x1 * sourceWidth)
  const y = Math.round(bbox.y1 * sourceHeight)
  const width = Math.round((bbox.x2 - bbox.x1) * sourceWidth)
  const height = Math.round((bbox.y2 - bbox.y1) * sourceHeight)
  
  // Validate extracted dimensions
  if (width <= 0 || height <= 0) {
    throw new ImageExtractionError(`Invalid extraction dimensions: ${width} x ${height}`)
  }
  
  // Create canvas for extraction
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new ImageExtractionError('Failed to create canvas 2D context')
  }
  
  // Set canvas size to match extracted region
  canvas.width = width
  canvas.height = height
  
  try {
    // Draw the cropped region onto the canvas
    ctx.drawImage(
      sourceImage,
      x, y, width, height,  // Source region
      0, 0, width, height   // Destination region
    )
    
    // Convert to base64 data URL
    const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg'
    const base64Image = canvas.toDataURL(mimeType, quality)
    
    return {
      base64Image,
      width,
      height
    }
    
  } finally {
    // Clean up canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 0
    canvas.height = 0
  }
}

/**
 * Extract image region from PDF page image using bounding box coordinates
 * 
 * @param input - Extraction parameters
 * @returns Promise resolving to extracted image data
 * @throws ImageExtractionError if extraction fails
 */
export async function extractImageFromPage(
  input: ImageExtractionInput
): Promise<ImageExtractionResult> {
  const logger = createRequestLogger('/services/image-extractor', `extract-${Date.now()}`)
  const startTime = Date.now()
  
  // Validate runtime environment before doing any heavy work. This prevents the
  // server-side Vision pipeline (where browser APIs are unavailable) from
  // progressing to the unhelpful "Image is not defined" error and instead
  // surfaces a clear, actionable failure message.
  const envCheck = validateExtractionEnvironment()
  if (!envCheck.supported) {
    const msg = `Image extraction requires browser environment: ${envCheck.errors.join('; ')}`
    logger.error('Unsupported environment for image extraction', { errors: envCheck.errors })
    throw new ImageExtractionError(msg)
  }
  
  try {
    // Validate input
    const validatedInput = imageExtractionInputSchema.parse(input)
    
    logger.info('Starting image extraction', {
      pageNumber: validatedInput.pageNumber,
      boundingBox: validatedInput.boundingBox,
      outputFormat: validatedInput.outputFormat,
      quality: validatedInput.quality
    })
    
    // Validate bounding box
    validateBoundingBox(validatedInput.boundingBox)
    
    // Load source page image
    const sourceImage = await loadImageFromBase64(validatedInput.pageImageBase64)
    
    logger.info('Page image loaded', {
      pageNumber: validatedInput.pageNumber,
      originalWidth: sourceImage.naturalWidth,
      originalHeight: sourceImage.naturalHeight
    })
    
    // Extract image region
    const { base64Image, width, height } = extractImageRegion(
      sourceImage,
      validatedInput.boundingBox,
      validatedInput.outputFormat,
      validatedInput.quality
    )
    
    const extractionTimeMs = Date.now() - startTime
    
    logger.info('Image extraction completed', {
      pageNumber: validatedInput.pageNumber,
      extractedWidth: width,
      extractedHeight: height,
      extractionTimeMs,
      outputSizeBytes: Math.round(base64Image.length * 0.75) // Rough estimate
    })
    
    return imageExtractionResultSchema.parse({
      base64Image,
      format: validatedInput.outputFormat,
      width,
      height,
      originalPageWidth: sourceImage.naturalWidth,
      originalPageHeight: sourceImage.naturalHeight,
      extractionTimeMs,
      boundingBox: validatedInput.boundingBox
    })
    
  } catch (error) {
    const extractionTimeMs = Date.now() - startTime
    
    if (error instanceof ImageExtractionError) {
      logger.error('Image extraction failed', {
        pageNumber: input.pageNumber,
        extractionTimeMs,
        error: error.message
      })
      throw error
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected image extraction error', {
      pageNumber: input.pageNumber,
      extractionTimeMs,
      error: errorMessage
    })
    
    throw new ImageExtractionError(`Image extraction failed: ${errorMessage}`, error instanceof Error ? error : undefined)
  }
}

/**
 * Extract multiple image regions from a single page image
 * 
 * @param pageImageBase64 - Base64 page image data
 * @param pageNumber - Page number for context
 * @param regions - Array of bounding box regions to extract
 * @param options - Extraction options
 * @returns Promise resolving to array of extracted images
 */
export async function extractMultipleRegions(
  pageImageBase64: string,
  pageNumber: number,
  regions: Array<{ boundingBox: BoundingBox; outputFormat?: 'png' | 'jpeg'; quality?: number }>,
  options: { outputFormat?: 'png' | 'jpeg'; quality?: number } = {}
): Promise<ImageExtractionResult[]> {
  const logger = createRequestLogger('/services/image-extractor', `extract-multi-${Date.now()}`)
  const startTime = Date.now()
  
  logger.info('Starting batch image extraction', {
    pageNumber,
    regionCount: regions.length,
    defaultFormat: options.outputFormat || 'png',
    defaultQuality: options.quality || 0.95
  })
  
  // Load source image once for all extractions
  await loadImageFromBase64(pageImageBase64)
  
  const results: ImageExtractionResult[] = []
  
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i]!
    
    try {
      const input: ImageExtractionInput = {
        pageImageBase64,
        pageNumber,
        boundingBox: region.boundingBox,
        outputFormat: region.outputFormat || options.outputFormat || 'png',
        quality: region.quality || options.quality || 0.95
      }
      
      const result = await extractImageFromPage(input)
      results.push(result)
      
    } catch (error) {
      logger.error('Failed to extract region', {
        pageNumber,
        regionIndex: i,
        boundingBox: region.boundingBox,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      // Re-throw the error as fatal failures are required per coding principles
      throw error
    }
  }
  
  const totalTimeMs = Date.now() - startTime
  
  logger.info('Batch image extraction completed', {
    pageNumber,
    regionCount: regions.length,
    successCount: results.length,
    totalTimeMs,
    avgTimePerRegion: Math.round(totalTimeMs / regions.length)
  })
  
  return results
}

/**
 * Estimate memory usage for image extraction
 * 
 * @param pageWidth - Page image width in pixels
 * @param pageHeight - Page image height in pixels
 * @param regionCount - Number of regions to extract
 * @param outputFormat - Output format
 * @returns Estimated memory usage in bytes
 */
export function estimateExtractionMemoryUsage(
  pageWidth: number,
  pageHeight: number,
  regionCount: number,
  outputFormat: 'png' | 'jpeg' = 'png'
): number {
  // Estimate average region size (assume regions are ~10% of page area each)
  const avgRegionArea = (pageWidth * pageHeight) * 0.1
  
  // Estimate bytes per pixel based on format
  const bytesPerPixel = outputFormat === 'png' ? 4 : 1.5 // PNG: RGBA, JPEG: compressed
  
  const memoryPerRegion = avgRegionArea * bytesPerPixel
  const totalMemory = memoryPerRegion * regionCount
  
  // Add overhead for source image and canvas operations
  const overhead = (pageWidth * pageHeight * 4) * 1.5 // Source + canvas overhead
  
  return Math.round(totalMemory + overhead)
}

/**
 * Validate extraction capabilities in current environment
 */
export function validateExtractionEnvironment(): { supported: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    errors.push('Image extraction requires browser environment')
  }
  
  // Check Canvas API support
  if (typeof document === 'undefined' || !document.createElement) {
    errors.push('Canvas API not available')
  }
  
  // Test canvas creation
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      errors.push('Canvas 2D context not available')
    }
  } catch {
    errors.push('Canvas creation failed')
  }
  
  // Test Image constructor
  try {
    new Image()
  } catch (_error) {
    errors.push('Image constructor not available')
  }
  
  return {
    supported: errors.length === 0,
    errors
  }
}