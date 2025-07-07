import { z } from 'zod'
import { renderPageAsImage } from 'unpdf'
import { Image } from 'imagescript'
import { boundingBoxSchema, BoundingBox } from '@/lib/services/html-fragment-processor'
import { uploadImageAsset, getPublicDocumentUrl } from '@/lib/services/storage'
import { createRequestLogger } from '@/lib/services/logger'
import { Blob } from 'buffer'

/**
 * Options for extracting a single region from a PDF.
 */
export const pdfRegionExtractionOptionsSchema = z.object({
  pdfBuffer: z.instanceof(Buffer),
  documentId: z.string().uuid().describe('Supabase document ID – used for storage path'),
  pageNumber: z.number().int().min(1).describe('1-indexed page number'),
  elementId: z.string().describe('HTML element ID (used for filename)'),
  bbox: boundingBoxSchema,
  outputFormat: z.enum(['png', 'jpeg']).default('png'),
  quality: z.number().min(0.3).max(1.0).default(0.95),
  scale: z.number().min(0.5).max(4).default(2) // Render scale factor – trade-off quality vs perf
})

export type PdfRegionExtractionOptions = z.infer<typeof pdfRegionExtractionOptionsSchema>

export interface PdfRegionExtractionResult {
  storagePath: string // Supabase path (documents bucket)
  publicUrl: string   // Public/Signed URL that can be injected into HTML
  width: number
  height: number
}

/**
 * Extract a single bounding-box region from a PDF page, upload it to Supabase Storage and
 * return the storage path + public URL.
 */
export async function extractPdfRegionAndUpload (
  opts: PdfRegionExtractionOptions
): Promise<PdfRegionExtractionResult> {
  const options = pdfRegionExtractionOptionsSchema.parse(opts)
  const logger = createRequestLogger('/services/pdf-image-extractor-server', `page-${options.pageNumber}-${options.elementId}`)
  logger.info('Starting PDF region extraction', { page: options.pageNumber, elementId: options.elementId })

  // 1️⃣ Render page → bitmap PNG (ArrayBuffer)
  const pageImageArrBuf = await renderPageAsImage(
    new Uint8Array(options.pdfBuffer),
    options.pageNumber,
    {
      scale: options.scale
      // NOTE: We use default serverless PDF.js bundle from unpdf so no canvas import is required.
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
  const uploadRes = await uploadImageAsset(
    new Blob([encoded], { type: options.outputFormat === 'png' ? 'image/png' : 'image/jpeg' }),
    options.documentId,
    filename,
    options.outputFormat === 'png' ? 'image/png' : 'image/jpeg'
  )

  if (!uploadRes) {
    throw new Error('Upload to Supabase Storage failed (null result)')
  }

  const publicUrl = getPublicDocumentUrl(uploadRes.path)

  logger.info('PDF region extraction done', { storagePath: uploadRes.path, width: w, height: h })

  return {
    storagePath: uploadRes.path,
    publicUrl,
    width: w,
    height: h
  }
}

/**
 * Extract multiple regions (possibly across multiple pages). Convenience wrapper.
 */
export async function extractPdfRegionsAndUpload (
  regions: Array<Omit<PdfRegionExtractionOptions, 'pdfBuffer' | 'documentId' | 'outputFormat' | 'quality' | 'scale'>>,
  shared: {
    pdfBuffer: Buffer
    documentId: string
    outputFormat?: 'png' | 'jpeg'
    quality?: number
    scale?: number
  }
): Promise<Record<string /* elementId */, PdfRegionExtractionResult>> {
  const results: Record<string, PdfRegionExtractionResult> = {}

  for (const region of regions) {
    const res = await extractPdfRegionAndUpload({
      ...shared,
      ...region,
      outputFormat: shared.outputFormat || 'png',
      quality: shared.quality ?? 0.95,
      scale: shared.scale ?? 2
    } as PdfRegionExtractionOptions)
    results[region.elementId] = res
  }
  return results
} 