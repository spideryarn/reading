/**
 * Image Resize Utility for Vision Processing
 * 
 * This module provides utilities for resizing images to meet size constraints
 * while preserving quality for AI vision processing. It's designed to ensure
 * page images stay under the 4MB Vercel limit while maintaining readability.
 */

'use client'

// This file must only be imported in browser environments
if (typeof window === 'undefined') {
  throw new Error('image-resize.ts can only be used in browser environments')
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
 * Resize an image using Canvas API with iterative quality reduction
 * to meet size constraints
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
    preserveAspectRatio = true
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

  // Iteratively reduce quality/dimensions until we meet size constraint
  while (attempts < maxAttempts) {
    attempts++

    // Create canvas with current dimensions
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')

    canvas.width = currentDimensions.width
    canvas.height = currentDimensions.height

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw scaled image
    ctx.drawImage(
      img,
      0, 0,
      canvas.width, canvas.height
    )

    // Convert to base64
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const result = canvas.toDataURL(mimeType, currentQuality)
    const resultSize = calculateBase64SizeBytes(result)

    // Clean up canvas
    canvas.width = 0
    canvas.height = 0

    if (resultSize <= maxSizeBytes) {
      // Success!
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

    // Adjust for next iteration
    if (format === 'jpeg' && currentQuality > 0.5) {
      // First try reducing quality
      currentQuality -= 0.1
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

  // If we couldn't meet the constraint, return the last result
  if (lastValidResult) {
    return {
      base64Image: lastValidResult,
      width: currentDimensions.width,
      height: currentDimensions.height,
      originalWidth,
      originalHeight,
      scaleFactor: currentDimensions.scaleFactor,
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
      const result = await resizeImage(images[i], options)
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