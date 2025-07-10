/**
 * WebAssembly-based PDF Renderer using pdfium-wasm
 * 
 * This module provides PDF rendering without native dependencies,
 * suitable for Vercel deployment. It serves as a fallback when
 * direct image extraction is not possible.
 */

import { z } from 'zod'
import type { BoundingBox } from './html-fragment-processor'

// Type definitions for pdfium-wasm (not fully typed)
interface PdfiumModule {
  loadDocument(data: Uint8Array): Promise<PdfiumDocument>
  destroy(): void
}

interface PdfiumDocument {
  getPageCount(): number
  getPage(index: number): PdfiumPage
  close(): void
}

interface PdfiumPage {
  getWidth(): number
  getHeight(): number
  render(options: {
    scale?: number
    rotation?: number
    flags?: number
  }): PdfiumBitmap
  close(): void
}

interface PdfiumBitmap {
  width: number
  height: number
  toArrayBuffer(format: 'png' | 'jpeg', quality?: number): ArrayBuffer
  destroy(): void
}

// Lazy-loaded module reference
let pdfiumInstance: PdfiumModule | null = null
let initializationPromise: Promise<PdfiumModule> | null = null

/**
 * Initialize pdfium-wasm module (lazy loaded)
 */
async function initializePdfium(): Promise<PdfiumModule> {
  if (pdfiumInstance) return pdfiumInstance
  
  if (initializationPromise) return initializationPromise
  
  initializationPromise = (async () => {
    try {
      // Dynamic import to avoid loading until needed
      const { createPdfiumModule } = await import('pdfium-wasm')
      
      // Load WASM module
      pdfiumInstance = await createPdfiumModule({
        wasmUrl: '/pdfium.wasm', // Must be served from public directory
        workerUrl: '/pdfium.worker.js' // Optional worker for better performance
      })
      
      return pdfiumInstance
    } catch (error) {
      initializationPromise = null
      throw new Error(`Failed to initialize pdfium-wasm: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })()
  
  return initializationPromise
}

export const wasmRenderResultSchema = z.object({
  success: z.boolean(),
  method: z.literal('wasm-render'),
  images: z.array(z.object({
    elementId: z.string(),
    data: z.instanceof(Uint8Array),
    format: z.enum(['png', 'jpeg']),
    bbox: z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number()
    }),
    width: z.number(),
    height: z.number()
  })),
  renderTime: z.number(),
  errors: z.array(z.string())
})

export type WasmRenderResult = z.infer<typeof wasmRenderResultSchema>

/**
 * Render PDF page and extract regions using pdfium-wasm
 */
export async function renderWithPdfiumWasm(
  pdfBuffer: Buffer,
  pageNumber: number,
  regions: Array<{
    elementId: string
    bbox: BoundingBox
  }>,
  options: {
    scale?: number
    format?: 'png' | 'jpeg'
    quality?: number
  } = {}
): Promise<WasmRenderResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const images: WasmRenderResult['images'] = []
  
  const {
    scale = 2.0,
    format = 'png',
    quality = 0.95
  } = options
  
  let pdfium: PdfiumModule | null = null
  let document: PdfiumDocument | null = null
  let page: PdfiumPage | null = null
  let bitmap: PdfiumBitmap | null = null
  
  try {
    // Initialize pdfium
    pdfium = await initializePdfium()
    
    // Load document
    document = await pdfium.loadDocument(new Uint8Array(pdfBuffer))
    const pageCount = document.getPageCount()
    
    if (pageNumber < 1 || pageNumber > pageCount) {
      throw new Error(`Invalid page number: ${pageNumber} (document has ${pageCount} pages)`)
    }
    
    // Get page (0-indexed)
    page = document.getPage(pageNumber - 1)
    const pageWidth = page.getWidth()
    const pageHeight = page.getHeight()
    
    // Render full page
    bitmap = page.render({
      scale,
      rotation: 0,
      flags: 0x01 | 0x02 // FPDF_ANNOT | FPDF_LCD_TEXT
    })
    
    // Get full page image data
    const fullPageBuffer = bitmap.toArrayBuffer(format, quality)
    const fullPageData = new Uint8Array(fullPageBuffer)
    
    // Extract regions
    for (const region of regions) {
      try {
        const croppedData = await cropImageRegion(
          fullPageData,
          bitmap.width,
          bitmap.height,
          region.bbox,
          format
        )
        
        images.push({
          elementId: region.elementId,
          data: croppedData,
          format,
          bbox: region.bbox,
          width: Math.round((region.bbox.x2 - region.bbox.x1) * bitmap.width),
          height: Math.round((region.bbox.y2 - region.bbox.y1) * bitmap.height)
        })
      } catch (cropError) {
        errors.push(`Failed to crop region ${region.elementId}: ${cropError instanceof Error ? cropError.message : 'Unknown error'}`)
      }
    }
    
    return {
      success: images.length > 0,
      method: 'wasm-render',
      images,
      renderTime: Date.now() - startTime,
      errors
    }
  } catch (error) {
    return {
      success: false,
      method: 'wasm-render',
      images: [],
      renderTime: Date.now() - startTime,
      errors: [`PDF rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    }
  } finally {
    // Clean up resources
    bitmap?.destroy()
    page?.close()
    document?.close()
  }
}

/**
 * Crop a region from the full page image
 * 
 * Note: This is a simplified version. In production, you'd want to use
 * a proper image processing library or implement more efficient cropping.
 */
async function cropImageRegion(
  fullPageData: Uint8Array,
  pageWidth: number,
  pageHeight: number,
  bbox: BoundingBox,
  format: 'png' | 'jpeg'
): Promise<Uint8Array> {
  // This would need a proper implementation using an image processing library
  // For now, return the full image as a placeholder
  // 
  // In production, you could use:
  // - Sharp (if available in your environment)
  // - Jimp (pure JS but slower)
  // - Canvas API (if available)
  
  // Placeholder: return full image
  return fullPageData
}

/**
 * Render a single page to base64 for vision processing
 */
export async function renderPageForVision(
  pdfBuffer: Buffer,
  pageNumber: number,
  options: {
    scale?: number
    maxSize?: number // Max size in bytes
  } = {}
): Promise<{
  base64Image: string
  width: number
  height: number
  scale: number
}> {
  const { scale: requestedScale = 2.0, maxSize = 3.5 * 1024 * 1024 } = options
  
  let currentScale = requestedScale
  let attempts = 0
  const maxAttempts = 5
  
  while (attempts < maxAttempts) {
    attempts++
    
    const result = await renderWithPdfiumWasm(
      pdfBuffer,
      pageNumber,
      [], // No regions, render full page
      {
        scale: currentScale,
        format: 'jpeg',
        quality: 0.85
      }
    )
    
    if (!result.success || result.images.length === 0) {
      throw new Error('Failed to render page')
    }
    
    const imageData = result.images[0].data
    const base64 = `data:image/jpeg;base64,${Buffer.from(imageData).toString('base64')}`
    
    // Check size
    const sizeBytes = Math.round(base64.length * 0.75) // Rough estimate
    
    if (sizeBytes <= maxSize) {
      return {
        base64Image: base64,
        width: result.images[0].width,
        height: result.images[0].height,
        scale: currentScale
      }
    }
    
    // Reduce scale for next attempt
    currentScale *= 0.8
  }
  
  throw new Error(`Unable to render page within size limit after ${maxAttempts} attempts`)
}

/**
 * Clean up pdfium instance (call on app shutdown)
 */
export function cleanupPdfium(): void {
  if (pdfiumInstance) {
    pdfiumInstance.destroy()
    pdfiumInstance = null
    initializationPromise = null
  }
}