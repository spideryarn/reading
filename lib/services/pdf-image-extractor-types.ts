import { z } from 'zod'
import { boundingBoxSchema } from '@/lib/services/html-fragment-processor'

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
  signedUrl: string   // Signed URL that can be injected into HTML
  width: number
  height: number
  size: number        // File size in bytes
}