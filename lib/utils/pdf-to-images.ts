/**
 * PDF to Images Conversion using MuPDF.js
 * 
 * This module provides utilities for converting PDF pages to images using MuPDF.js.
 * It handles browser-only operations and provides base64-encoded images suitable
 * for vision-based AI processing.
 * 
 * Key features:
 * - PDF to page images conversion
 * - Configurable DPI/quality settings for token cost optimization
 * - Base64 output for immediate use in AI prompts
 * - Progress callback support for UI updates
 * - Memory management for large documents
 */

// This file must only be imported in browser environments
if (typeof window === 'undefined') {
  throw new Error('pdf-to-images.ts can only be used in browser environments')
}

/**
 * Error thrown when PDF to image conversion fails
 */
export class PDFToImagesError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'PDFToImagesError'
  }
}

/**
 * Configuration options for PDF to image conversion
 */
export interface PDFToImagesOptions {
  /** DPI/scale factor for image quality (1.0 = 72 DPI, 2.0 = 144 DPI) */
  scale?: number
  /** Output format: 'png' for lossless, 'jpeg' for smaller size */
  format?: 'png' | 'jpeg'
  /** JPEG quality (1-100, only used when format is 'jpeg') */
  jpegQuality?: number
  /** Whether to include alpha channel */
  alpha?: boolean
  /** Progress callback function (pageIndex, totalPages) => void */
  onProgress?: (pageIndex: number, totalPages: number) => void
}

/**
 * Result of single page conversion
 */
export interface PageImageResult {
  /** Zero-based page index */
  pageIndex: number
  /** Base64-encoded image data (includes data: prefix) */
  base64Image: string
  /** Image format used */
  format: 'png' | 'jpeg'
  /** Image dimensions */
  width: number
  height: number
}

/**
 * Result of PDF to images conversion
 */
export interface PDFToImagesResult {
  /** Array of page image results */
  pages: PageImageResult[]
  /** Total number of pages converted */
  totalPages: number
  /** Conversion summary */
  summary: {
    format: 'png' | 'jpeg'
    scale: number
    totalSizeBytes: number
    averageSizeBytes: number
  }
}

/**
 * Convert a single PDF page to base64 image using MuPDF.js
 * 
 * @param document - MuPDF Document instance
 * @param pageIndex - Zero-based page index
 * @param options - Conversion options
 * @returns Promise resolving to page image result
 */
async function convertPageToImage(
  document: import('mupdf').Document,
  pageIndex: number,
  options: Required<PDFToImagesOptions>
): Promise<PageImageResult> {
  const page = document.loadPage(pageIndex)
  
  try {
    // Create scaling matrix for DPI
    const mupdf = await import('mupdf')
    const matrix = mupdf.Matrix.scale(options.scale, options.scale)
    
    // Get default colorspace (RGB)
    const colorspace = mupdf.ColorSpace.DeviceRGB
    
    // Convert page to pixmap
    const pixmap = page.toPixmap(matrix, colorspace, options.alpha)
    
    try {
      // Get image data based on format
      let imageData: Uint8Array
      let mimeType: string
      
      if (options.format === 'jpeg') {
        imageData = pixmap.asJPEG(options.jpegQuality)
        mimeType = 'image/jpeg'
      } else {
        imageData = pixmap.asPNG()
        mimeType = 'image/png'
      }
      
      // Convert to base64
      const base64 = btoa(String.fromCharCode(...imageData))
      const base64Image = `data:${mimeType};base64,${base64}`
      
      // Get pixmap dimensions
      const width = pixmap.getWidth()
      const height = pixmap.getHeight()
      
      return {
        pageIndex,
        base64Image,
        format: options.format,
        width,
        height
      }
    } finally {
      // Clean up pixmap
      pixmap.destroy()
    }
  } finally {
    // Clean up page
    page.destroy()
  }
}

/**
 * Convert PDF file to page images using MuPDF.js (browser-only)
 * 
 * @param file - PDF file object from browser file input
 * @param options - Conversion options
 * @returns Promise resolving to conversion result
 * @throws PDFToImagesError if conversion fails
 * 
 * @example
 * ```typescript
 * if (typeof window !== 'undefined') {
 *   const { convertPDFToImages } = await import('./pdf-to-images')
 *   
 *   try {
 *     const result = await convertPDFToImages(file, {
 *       scale: 2.0,
 *       format: 'jpeg',
 *       jpegQuality: 85,
 *       onProgress: (page, total) => {
 *         console.log(`Processing page ${page + 1} of ${total}`)
 *       }
 *     })
 *     
 *     console.log(`Converted ${result.totalPages} pages`)
 *     result.pages.forEach(page => {
 *       console.log(`Page ${page.pageIndex}: ${page.width}x${page.height}`)
 *     })
 *   } catch (error) {
 *     console.error('PDF conversion failed:', error.message)
 *   }
 * }
 * ```
 */
export async function convertPDFToImages(
  file: File,
  options: PDFToImagesOptions = {}
): Promise<PDFToImagesResult> {
  // Set default options
  const opts: Required<PDFToImagesOptions> = {
    scale: options.scale ?? 2.0,
    format: options.format ?? 'png',
    jpegQuality: options.jpegQuality ?? 85,
    alpha: options.alpha ?? false,
    onProgress: options.onProgress ?? (() => {})
  }
  
  try {
    // Dynamic import of MuPDF.js
    const mupdf = await import('mupdf')
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Create MuPDF Document
    const document = mupdf.Document.openDocument(arrayBuffer)
    
    try {
      const totalPages = document.countPages()
      const pages: PageImageResult[] = []
      let totalSizeBytes = 0
      
      // Convert each page sequentially
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        // Call progress callback
        opts.onProgress(pageIndex, totalPages)
        
        // Convert page to image
        const pageResult = await convertPageToImage(document, pageIndex, opts)
        pages.push(pageResult)
        
        // Track total size (rough estimate from base64 length)
        totalSizeBytes += Math.round(pageResult.base64Image.length * 0.75) // base64 is ~33% larger
      }
      
      // Call final progress
      opts.onProgress(totalPages, totalPages)
      
      return {
        pages,
        totalPages,
        summary: {
          format: opts.format,
          scale: opts.scale,
          totalSizeBytes,
          averageSizeBytes: Math.round(totalSizeBytes / totalPages)
        }
      }
    } finally {
      // Clean up document
      document.destroy()
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new PDFToImagesError(
        `Failed to convert PDF to images: ${error.message}`,
        error
      )
    }
    throw new PDFToImagesError('Failed to convert PDF to images: Unknown error')
  }
}

/**
 * Convert PDF ArrayBuffer to page images using MuPDF.js (browser-only)
 * 
 * @param arrayBuffer - PDF data as ArrayBuffer
 * @param options - Conversion options
 * @returns Promise resolving to conversion result
 * @throws PDFToImagesError if conversion fails
 */
export async function convertPDFBufferToImages(
  arrayBuffer: ArrayBuffer,
  options: PDFToImagesOptions = {}
): Promise<PDFToImagesResult> {
  // Set default options
  const opts: Required<PDFToImagesOptions> = {
    scale: options.scale ?? 2.0,
    format: options.format ?? 'png',
    jpegQuality: options.jpegQuality ?? 85,
    alpha: options.alpha ?? false,
    onProgress: options.onProgress ?? (() => {})
  }
  
  try {
    // Dynamic import of MuPDF.js
    const mupdf = await import('mupdf')
    
    // Create MuPDF Document
    const document = mupdf.Document.openDocument(arrayBuffer)
    
    try {
      const totalPages = document.countPages()
      const pages: PageImageResult[] = []
      let totalSizeBytes = 0
      
      // Convert each page sequentially
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        // Call progress callback
        opts.onProgress(pageIndex, totalPages)
        
        // Convert page to image
        const pageResult = await convertPageToImage(document, pageIndex, opts)
        pages.push(pageResult)
        
        // Track total size (rough estimate from base64 length)
        totalSizeBytes += Math.round(pageResult.base64Image.length * 0.75) // base64 is ~33% larger
      }
      
      // Call final progress
      opts.onProgress(totalPages, totalPages)
      
      return {
        pages,
        totalPages,
        summary: {
          format: opts.format,
          scale: opts.scale,
          totalSizeBytes,
          averageSizeBytes: Math.round(totalSizeBytes / totalPages)
        }
      }
    } finally {
      // Clean up document
      document.destroy()
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new PDFToImagesError(
        `Failed to convert PDF buffer to images: ${error.message}`,
        error
      )
    }
    throw new PDFToImagesError('Failed to convert PDF buffer to images: Unknown error')
  }
}

/**
 * Get recommended conversion settings based on use case
 */
export function getRecommendedSettings(useCase: 'speed' | 'quality' | 'balanced'): PDFToImagesOptions {
  switch (useCase) {
    case 'speed':
      return {
        scale: 1.5,
        format: 'jpeg',
        jpegQuality: 70,
        alpha: false
      }
    case 'quality':
      return {
        scale: 3.0,
        format: 'png',
        alpha: false
      }
    case 'balanced':
    default:
      return {
        scale: 2.0,
        format: 'jpeg',
        jpegQuality: 85,
        alpha: false
      }
  }
}

/**
 * Estimate memory usage for PDF conversion
 * 
 * @param pageCount - Number of pages in PDF
 * @param options - Conversion options
 * @returns Estimated memory usage in bytes
 */
export function estimateMemoryUsage(
  pageCount: number, 
  options: PDFToImagesOptions = {}
): number {
  const scale = options.scale ?? 2.0
  const format = options.format ?? 'png'
  
  // Rough estimates for typical page sizes (8.5" x 11" at given scale)
  const widthPixels = Math.round(612 * scale) // 612pt = 8.5" at 72 DPI
  const heightPixels = Math.round(792 * scale) // 792pt = 11" at 72 DPI
  
  // Estimate bytes per page
  let bytesPerPage: number
  if (format === 'png') {
    // PNG: roughly 4 bytes per pixel (RGBA) with compression
    bytesPerPage = widthPixels * heightPixels * 2 // Compressed estimate
  } else {
    // JPEG: much smaller due to compression
    bytesPerPage = widthPixels * heightPixels * 0.5 // Compressed estimate
  }
  
  return Math.round(pageCount * bytesPerPage)
}