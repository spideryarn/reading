/**
 * WebAssembly-based PDF Renderer Service
 * 
 * Provides PDF rendering capabilities using unpdf with @napi-rs/canvas
 * to avoid native dependencies that cause issues on Vercel Serverless Functions.
 * This is the fallback approach when direct PDF image extraction is not possible.
 * 
 * Since pure JS canvas implementations are complex and unpdf expects a real Canvas API,
 * we use @napi-rs/canvas which is WebAssembly-based and Vercel-compatible.
 */

import { z } from 'zod'
import { renderPageAsImage } from 'unpdf'
import { Image } from 'imagescript'
import { boundingBoxSchema, BoundingBox } from '@/lib/services/html-fragment-processor'
import { uploadImageAssetServerSide, getSignedUrlServerSide } from '@/lib/services/storage-server'
import { createRequestLogger } from '@/lib/services/logger'
import { Blob } from 'buffer'
import { 
  pdfRegionExtractionOptionsSchema, 
  PdfRegionExtractionOptions,
  PdfRegionExtractionResult 
} from '@/lib/services/pdf-image-extractor-types'

/**
 * PDF renderer using WebAssembly-based canvas
 */
export class PdfRendererWasm {
  private logger = createRequestLogger('/services/pdf-renderer-wasm')

  /**
   * Extract a single bounding-box region from a PDF page using WASM rendering.
   * This method renders the PDF page and crops out the specified region.
   * 
   * @throws {Error} When rendering fails
   */
  async extractPdfRegionAndUpload(
    opts: PdfRegionExtractionOptions
  ): Promise<PdfRegionExtractionResult> {
    const options = pdfRegionExtractionOptionsSchema.parse(opts)
    const correlationId = `${options.documentId}-page${options.pageNumber}-${options.elementId}`
    
    this.logger.info('Starting WASM PDF rendering', { 
      pageNumber: options.pageNumber, 
      elementId: options.elementId,
      bbox: options.bbox,
      method: 'wasm-napi-canvas'
    })

    try {
      // Render page using unpdf with @napi-rs/canvas
      const pageImageArrBuf = await renderPageAsImage(
        new Uint8Array(options.pdfBuffer),
        options.pageNumber,
        {
          scale: options.scale,
          // Use @napi-rs/canvas which is WebAssembly-based
          canvasImport: async () => {
            // Dynamic import to reduce initial bundle size
            return await import('@napi-rs/canvas')
          }
        }
      )

      // Decode with ImageScript
      const pageImg = await Image.decode(new Uint8Array(pageImageArrBuf))

      // Compute pixel coords & crop
      const x = Math.floor(options.bbox.x1 * pageImg.width)
      const y = Math.floor(options.bbox.y1 * pageImg.height)
      const w = Math.floor((options.bbox.x2 - options.bbox.x1) * pageImg.width)
      const h = Math.floor((options.bbox.y2 - options.bbox.y1) * pageImg.height)

      if (w <= 0 || h <= 0) {
        throw new Error(`Invalid crop dimensions (${w}×${h}) for element ${options.elementId}`)
      }

      this.logger.info('Cropping region', { x, y, width: w, height: h })

      const cropped = pageImg.crop(x, y, w, h)

      // Encode the cropped image
      const encoded = options.outputFormat === 'png'
        ? await cropped.encode()
        : await cropped.encodeJPG(options.quality)

      // Create blob for upload
      const mimeType = options.outputFormat === 'png' ? 'image/png' : 'image/jpeg'
      const blob = new Blob([encoded], { type: mimeType })

      // Upload to Supabase Storage
      const filename = `${String(options.pageNumber).padStart(3, '0')}_${options.elementId}.${options.outputFormat}`
      const uploadRes = await uploadImageAssetServerSide(
        Buffer.from(encoded),
        options.documentId,
        filename,
        mimeType
      )

      // Generate signed URL (1 year expiry)
      const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60
      const signedUrl = await getSignedUrlServerSide(uploadRes.path, ONE_YEAR_SECONDS)

      this.logger.info('WASM PDF rendering successful', { 
        storagePath: uploadRes.path,
        method: 'wasm-napi-canvas',
        width: w,
        height: h
      })

      return {
        storagePath: uploadRes.path,
        signedUrl,
        width: w,
        height: h,
        size: uploadRes.size
      }

    } catch (error) {
      this.logger.error('WASM rendering failed', { 
        error: error instanceof Error ? error.message : String(error),
        correlationId 
      })
      throw error
    }
  }
}

/**
 * Convenience function that matches the existing interface
 */
export async function extractPdfRegionAndUploadWasm(
  opts: PdfRegionExtractionOptions
): Promise<PdfRegionExtractionResult> {
  const renderer = new PdfRendererWasm()
  return renderer.extractPdfRegionAndUpload(opts)
}