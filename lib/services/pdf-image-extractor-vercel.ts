/**
 * Vercel-compatible PDF Image Extractor Service
 * 
 * Uses @napi-rs/canvas instead of skia-canvas to avoid NODE_MODULE_VERSION
 * errors on Vercel Serverless Functions. This is a drop-in replacement for
 * the original pdf-image-extractor-server.ts that works in serverless environments.
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
 * Extract a single bounding-box region from a PDF page using @napi-rs/canvas.
 * This is a Vercel-compatible version of the extraction function.
 */
export async function extractPdfRegionAndUploadVercel(
  opts: PdfRegionExtractionOptions
): Promise<PdfRegionExtractionResult> {
  const options = pdfRegionExtractionOptionsSchema.parse(opts)
  const logger = createRequestLogger('/services/pdf-image-extractor-vercel', `page-${options.pageNumber}-${options.elementId}`)
  logger.info('Starting PDF region extraction (Vercel-compatible)', { 
    page: options.pageNumber, 
    elementId: options.elementId,
    method: 'napi-rs-canvas'
  })

  try {
    // 1️⃣ Render page → bitmap PNG (ArrayBuffer)
    const pageImageArrBuf = await renderPageAsImage(
      new Uint8Array(options.pdfBuffer),
      options.pageNumber,
      {
        scale: options.scale,
        // Use @napi-rs/canvas which is WebAssembly-based and Vercel-compatible
        canvasImport: async () => {
          return await import('@napi-rs/canvas')
        }
      }
    )

    // 2️⃣ Decode with ImageScript
    const pageImg = await Image.decode(new Uint8Array(pageImageArrBuf))

    // 3️⃣ Compute pixel coords & crop
    const x = Math.floor(options.bbox.x1 * pageImg.width)
    const y = Math.floor(options.bbox.y1 * pageImg.height)
    const w = Math.floor((options.bbox.x2 - options.bbox.x1) * pageImg.width)
    const h = Math.floor((options.bbox.y2 - options.bbox.y1) * pageImg.height)

    if (w <= 0 || h <= 0) {
      throw new Error(`Invalid crop dimensions (${w}×${h}) for element ${options.elementId}`)
    }

    const cropped = pageImg.crop(x, y, w, h)

    // 4️⃣ Encode
    const encoded = options.outputFormat === 'png'
      ? await cropped.encode()
      : await cropped.encodeJPG(options.quality)

    // 5️⃣ Upload to Supabase Storage
    const filename = `${String(options.pageNumber).padStart(3, '0')}_${options.elementId}.${options.outputFormat}`
    const uploadRes = await uploadImageAssetServerSide(
      Buffer.from(encoded),
      options.documentId,
      filename,
      options.outputFormat === 'png' ? 'image/png' : 'image/jpeg'
    )

    // Generate a signed URL (1 year expiry)
    const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60
    const signedUrl = await getSignedUrlServerSide(uploadRes.path, ONE_YEAR_SECONDS)

    logger.info('PDF region extraction done (Vercel-compatible)', { 
      storagePath: uploadRes.path, 
      width: w, 
      height: h,
      method: 'napi-rs-canvas'
    })

    return {
      storagePath: uploadRes.path,
      signedUrl,
      width: w,
      height: h,
      size: uploadRes.size
    }
  } catch (error) {
    logger.error('PDF extraction failed (Vercel-compatible)', { 
      error: error instanceof Error ? error.message : String(error),
      page: options.pageNumber,
      elementId: options.elementId
    })
    throw error
  }
}