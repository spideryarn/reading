/**
 * Image Resize Utility using Pica for Vision Processing
 * 
 * This module provides high-quality image resizing using Pica library
 * with Lanczos filtering for better quality than Canvas API, especially
 * important for academic documents with fine text and diagrams.
 */

'use client'

import Pica from 'pica'

// This file must only be imported in browser environments
if (typeof window === 'undefined') {
  throw new Error('image-resize-pica.ts can only be used in browser environments')
}

export interface ImageResizeOptions {
  /** Target maximum file size in bytes (default: 3.5MB to leave buffer) */
  maxSizeBytes?: number
  /** Output format */
  format?: 'jpeg' | 'png'
  /** JPEG quality (0-1) when format is jpeg */
  quality?: number
  /** Maximum dimension (width or height) in pixels */
  maxDimension?: number
  /** Preserve aspect ratio (default: true) */
  preserveAspectRatio?: boolean
  /** Use Web Worker for non-blocking resize (default: true) */
  useWebWorker?: boolean
  /** Number of tile rows for processing (default: auto) */
  tileRows?: number
}

export interface ImageResizeResult {
  /** Resized image as base64 data URL */
  base64Image: string
  /** Final dimensions */
  width: number
  height: number
  /** Original dimensions */
  originalWidth: number
  originalHeight: number
  /** Scale factor applied */
  scaleFactor: number
  /** Final size in bytes (estimated) */
  sizeBytes: number
  /** Whether resize was needed */
  wasResized: boolean
}

// Create a single Pica instance to reuse
const pica = new Pica({
  features: ['js', 'wasm', 'ww'], // Enable all features for best performance
  idle: 2048, // Idle timeout for workers
})

/**
 * Calculate the size of a base64 string in bytes
 */
export function calculateBase64SizeBytes(base64String: string): number {
  // Remove data URL prefix if present
  const base64Data = base64String.includes(',') 
    ? base64String.split(',')[1] 
    : base64String
  
  // Base64 encoding increases size by ~33%, so reverse that
  // Also account for padding
  if (!base64Data) return 0
  const padding = (base64Data.match(/=/g) || []).length
  return Math.floor((base64Data.length * 3) / 4) - padding
}

/**
 * Calculate optimal dimensions to fit within constraints
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension?: number,
  preserveAspectRatio = true
): { width: number; height: number; scaleFactor: number } {
  if (!maxDimension) {
    return { 
      width: originalWidth, 
      height: originalHeight, 
      scaleFactor: 1 
    }
  }

  if (!preserveAspectRatio) {
    return {
      width: Math.min(originalWidth, maxDimension),
      height: Math.min(originalHeight, maxDimension),
      scaleFactor: Math.min(maxDimension / originalWidth, maxDimension / originalHeight)
    }
  }

  // Calculate scale to fit within max dimension
  const scaleX = maxDimension / originalWidth
  const scaleY = maxDimension / originalHeight
  const scaleFactor = Math.min(scaleX, scaleY, 1) // Never upscale

  return {
    width: Math.floor(originalWidth * scaleFactor),
    height: Math.floor(originalHeight * scaleFactor),
    scaleFactor
  }
}

/**
 * Convert canvas to blob with format and quality options
 */
async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: 'jpeg' | 'png',
  quality: number
): Promise<Blob> {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  
  if ('convertToBlob' in canvas) {
    // OffscreenCanvas path
    return await canvas.convertToBlob({ type: mimeType, quality })
  } else {
    // Regular canvas path
    return new Promise((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        },
        mimeType,
        quality
      )
    })
  }
}

/**
 * Convert blob to base64 data URL
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Resize an image using Pica with high-quality Lanczos filtering
 */
export async function resizeImage(
  base64Image: string,
  options: ImageResizeOptions = {}
): Promise<ImageResizeResult> {
  const {
    maxSizeBytes = 3.5 * 1024 * 1024, // 3.5MB default
    format = 'jpeg',
    quality: initialQuality = 0.85,
    maxDimension = 2000, // Reasonable default for readability
    preserveAspectRatio = true,
    useWebWorker = true,
    tileRows
  } = options

  // Load the image
  const img = new Image()
  const loadPromise = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
  })
  img.src = base64Image
  await loadPromise

  const originalWidth = img.width
  const originalHeight = img.height
  
  // Check if original is already small enough
  const originalSize = calculateBase64SizeBytes(base64Image)
  if (originalSize <= maxSizeBytes) {
    return {
      base64Image,
      width: originalWidth,
      height: originalHeight,
      originalWidth,
      originalHeight,
      scaleFactor: 1,
      sizeBytes: originalSize,
      wasResized: false
    }
  }

  // Create source canvas
  const sourceCanvas = document.createElement('canvas')
  const sourceCtx = sourceCanvas.getContext('2d')
  if (!sourceCtx) throw new Error('Failed to get source canvas context')
  
  sourceCanvas.width = originalWidth
  sourceCanvas.height = originalHeight
  sourceCtx.drawImage(img, 0, 0)

  // Start with dimension-based scaling
  let currentDimensions = calculateOptimalDimensions(
    originalWidth,
    originalHeight,
    maxDimension,
    preserveAspectRatio
  )

  let currentQuality = initialQuality
  let attempts = 0
  const maxAttempts = 10
  let lastValidResult: string | null = null
  let lastValidSize = 0
  let lastValidDimensions = currentDimensions

  // Iteratively reduce quality/dimensions until we meet size constraint
  while (attempts < maxAttempts) {
    attempts++

    // Create destination canvas
    const destCanvas = useWebWorker && typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(currentDimensions.width, currentDimensions.height)
      : document.createElement('canvas')
    
    if (!useWebWorker || typeof OffscreenCanvas === 'undefined') {
      (destCanvas as HTMLCanvasElement).width = currentDimensions.width;
      (destCanvas as HTMLCanvasElement).height = currentDimensions.height
    }

    // Resize using Pica with high quality settings
    try {
      await pica.resize(sourceCanvas, destCanvas, {
        quality: 3, // Highest quality (Lanczos3)
        alpha: true,
        unsharpAmount: 0, // No additional sharpening for cleaner text
        unsharpRadius: 0,
        unsharpThreshold: 0,
        ...(tileRows ? { tileRows } : {})
      })

      // Convert to blob then to base64
      const blob = await canvasToBlob(destCanvas, format, currentQuality)
      const result = await blobToBase64(blob)
      const resultSize = calculateBase64SizeBytes(result)

      // Clean up destination canvas
      if ('width' in destCanvas) {
        (destCanvas as HTMLCanvasElement).width = 0;
        (destCanvas as HTMLCanvasElement).height = 0
      }

      if (resultSize <= maxSizeBytes) {
        // Success! Clean up and return
        sourceCanvas.width = 0
        sourceCanvas.height = 0
        
        return {
          base64Image: result,
          width: currentDimensions.width,
          height: currentDimensions.height,
          originalWidth,
          originalHeight,
          scaleFactor: currentDimensions.scaleFactor,
          sizeBytes: resultSize,
          wasResized: true
        }
      }

      // Store last valid result in case we can't meet the constraint
      lastValidResult = result
      lastValidSize = resultSize
      lastValidDimensions = { ...currentDimensions }
    } catch (error) {
      console.error('Pica resize error:', error)
      // Continue with next iteration
    }

    // Adjust for next iteration
    if (format === 'jpeg' && currentQuality > 0.5) {
      // First try reducing quality
      currentQuality = Math.max(0.5, currentQuality - 0.1)
    } else {
      // Then try reducing dimensions
      const reductionFactor = 0.85
      currentDimensions = {
        width: Math.floor(currentDimensions.width * reductionFactor),
        height: Math.floor(currentDimensions.height * reductionFactor),
        scaleFactor: currentDimensions.scaleFactor * reductionFactor
      }
      
      // Reset quality for new dimensions
      currentQuality = initialQuality
    }
  }

  // Clean up source canvas
  sourceCanvas.width = 0
  sourceCanvas.height = 0

  // If we couldn't meet the constraint, return the last result
  if (lastValidResult) {
    return {
      base64Image: lastValidResult,
      width: lastValidDimensions.width,
      height: lastValidDimensions.height,
      originalWidth,
      originalHeight,
      scaleFactor: lastValidDimensions.scaleFactor,
      sizeBytes: lastValidSize,
      wasResized: true
    }
  }

  throw new Error('Unable to resize image to meet size constraints')
}

/**
 * Batch resize multiple images with progress tracking
 */
export async function batchResizeImages(
  images: string[],
  options: ImageResizeOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<ImageResizeResult[]> {
  const results: ImageResizeResult[] = []
  
  for (let i = 0; i < images.length; i++) {
    try {
      const result = await resizeImage(images[i] ?? '', options)
      results.push(result)
      onProgress?.(i + 1, images.length)
    } catch (error) {
      // Re-throw with context
      throw new Error(`Failed to resize image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  return results
}

/**
 * Estimate the reduction needed to meet size constraints
 * Useful for showing warnings before processing
 */
export function estimateReductionNeeded(
  currentSizeBytes: number,
  targetSizeBytes: number
): {
  percentReduction: number
  estimatedQuality: number
  estimatedScaleFactor: number
} {
  const ratio = targetSizeBytes / currentSizeBytes
  
  // Rough estimates based on typical compression
  const percentReduction = Math.round((1 - ratio) * 100)
  const estimatedQuality = Math.max(0.5, Math.min(0.95, ratio * 1.2))
  const estimatedScaleFactor = Math.max(0.5, Math.sqrt(ratio))
  
  return {
    percentReduction,
    estimatedQuality,
    estimatedScaleFactor
  }
}