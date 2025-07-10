/**
 * Direct PDF Image Extraction Service
 * 
 * Extracts embedded JPEG/PNG images directly from PDF XObject streams without rasterization.
 * This is the primary approach for the pure JavaScript PDF processing solution,
 * providing fast extraction when PDFs contain embedded images (40-60% of academic PDFs).
 */

import { z } from 'zod'
import { PDFDocument, PDFName, PDFRawStream, PDFPage, PDFDict } from 'pdf-lib'
import { boundingBoxSchema, BoundingBox } from '@/lib/services/html-fragment-processor'
import { uploadImageAsset, getSignedDocumentUrl } from '@/lib/services/storage'
import { createRequestLogger } from '@/lib/services/logger'
import { 
  pdfRegionExtractionOptionsSchema, 
  PdfRegionExtractionOptions,
  PdfRegionExtractionResult 
} from '@/lib/services/pdf-image-extractor-server'

/**
 * Embedded image data with metadata
 */
interface EmbeddedImage {
  data: Uint8Array
  format: 'jpeg' | 'png' | 'unknown'
  pageIndex: number
  objectName: string
  width?: number
  height?: number
}

/**
 * Direct PDF image extractor class
 */
export class PdfImageDirectExtractor {
  private logger = createRequestLogger('/services/pdf-image-direct-extractor')

  /**
   * Extract a single bounding-box region from a PDF page using direct extraction when possible.
   * This method attempts to find and extract embedded images that match the given bounding box.
   * 
   * @throws {Error} When direct extraction is not possible (no matching embedded images)
   */
  async extractPdfRegionAndUpload(
    opts: PdfRegionExtractionOptions
  ): Promise<PdfRegionExtractionResult> {
    const options = pdfRegionExtractionOptionsSchema.parse(opts)
    const correlationId = `${options.documentId}-page${options.pageNumber}-${options.elementId}`
    
    this.logger.info('Starting direct PDF image extraction', { 
      pageNumber: options.pageNumber, 
      elementId: options.elementId,
      bbox: options.bbox 
    })

    try {
      // Load PDF document
      const pdfBytes = options.pdfBuffer instanceof Buffer 
        ? new Uint8Array(options.pdfBuffer) 
        : options.pdfBuffer
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const pages = pdfDoc.getPages()
      
      if (options.pageNumber > pages.length || options.pageNumber < 1) {
        throw new Error(`Page ${options.pageNumber} not found (document has ${pages.length} pages)`)
      }

      const page = pages[options.pageNumber - 1]!
      const { width: pageWidth, height: pageHeight } = page.getSize()

      // Extract all embedded images from the page
      const embeddedImages = await this.extractEmbeddedImages(page, options.pageNumber - 1)
      
      if (embeddedImages.length === 0) {
        throw new Error(`No embedded images found on page ${options.pageNumber}. Direct extraction not possible.`)
      }

      this.logger.info(`Found ${embeddedImages.length} embedded images`, { pageNumber: options.pageNumber })

      // Find the best matching image for the bounding box
      const matchedImage = this.findBestImageMatch(
        embeddedImages,
        options.bbox,
        { width: pageWidth, height: pageHeight }
      )

      if (!matchedImage) {
        throw new Error(
          `No embedded image matches the bounding box ${JSON.stringify(options.bbox)} on page ${options.pageNumber}. ` +
          `Found ${embeddedImages.length} images but none within the target region.`
        )
      }

      this.logger.info('Found matching embedded image', { 
        format: matchedImage.format,
        size: matchedImage.data.length 
      })

      // Create blob for upload
      const mimeType = matchedImage.format === 'jpeg' ? 'image/jpeg' : 
                      matchedImage.format === 'png' ? 'image/png' : 
                      'application/octet-stream'
      
      const blob = new Blob([matchedImage.data], { type: mimeType })

      // Upload to Supabase Storage
      const filename = `${String(options.pageNumber).padStart(3, '0')}_${options.elementId}.${matchedImage.format === 'unknown' ? 'bin' : matchedImage.format}`
      const uploadRes = await uploadImageAsset(
        blob,
        options.documentId,
        filename,
        mimeType
      )

      if (!uploadRes) {
        throw new Error('Upload to Supabase Storage failed (null result)')
      }

      // Generate signed URL (1 year expiry)
      const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60
      const signedUrl = await getSignedDocumentUrl(uploadRes.path, ONE_YEAR_SECONDS)

      // Calculate extracted region dimensions
      const extractedWidth = Math.floor((options.bbox.x2 - options.bbox.x1) * pageWidth)
      const extractedHeight = Math.floor((options.bbox.y2 - options.bbox.y1) * pageHeight)

      this.logger.info('Direct PDF image extraction successful', { 
        storagePath: uploadRes.path,
        method: 'direct'
      })

      return {
        storagePath: uploadRes.path,
        signedUrl,
        width: extractedWidth,
        height: extractedHeight,
        size: uploadRes.size
      }

    } catch (error) {
      this.logger.error('Direct extraction failed', { 
        error: error instanceof Error ? error.message : String(error),
        correlationId 
      })
      throw error
    }
  }

  /**
   * Extract all embedded images from a PDF page
   */
  private async extractEmbeddedImages(page: PDFPage, pageIndex: number): Promise<EmbeddedImage[]> {
    const images: EmbeddedImage[] = []
    const resources = page.node.Resources()
    
    if (!resources) {
      return images
    }

    const xObjects = resources.lookup(PDFName.of('XObject'))
    if (!xObjects || !(xObjects instanceof PDFDict)) {
      return images
    }

    // Iterate through XObjects
    const entries = xObjects.entries()
    for (const [nameObj, ref] of entries) {
      try {
        const xObject = page.node.context.lookup(ref)
        if (xObject instanceof PDFRawStream) {
          const subtype = xObject.dict.lookup(PDFName.of('Subtype'))
          
          if (subtype === PDFName.of('Image')) {
            const image = await this.extractImageData(xObject, nameObj.asString(), pageIndex)
            if (image) {
              images.push(image)
            }
          }
        }
      } catch (err) {
        this.logger.warn('Failed to extract image object', { 
          name: nameObj.asString(),
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    return images
  }

  /**
   * Extract image data from a PDF stream object
   */
  private async extractImageData(
    stream: PDFRawStream, 
    objectName: string,
    pageIndex: number
  ): Promise<EmbeddedImage | null> {
    const filter = stream.dict.lookup(PDFName.of('Filter'))
    let format: EmbeddedImage['format'] = 'unknown'
    
    // Determine image format from filter
    if (filter === PDFName.of('DCTDecode')) {
      format = 'jpeg'
    } else if (filter === PDFName.of('FlateDecode')) {
      // Could be PNG or other format - check ColorSpace and BitsPerComponent
      const colorSpace = stream.dict.lookup(PDFName.of('ColorSpace'))
      const bitsPerComponent = stream.dict.lookup(PDFName.of('BitsPerComponent'))
      
      // Simple heuristic: if it looks like it could be PNG-compatible
      if (colorSpace && bitsPerComponent) {
        format = 'png'
      }
    }

    // Get dimensions if available
    const width = stream.dict.lookup(PDFName.of('Width'))
    const height = stream.dict.lookup(PDFName.of('Height'))

    const embeddedImage: EmbeddedImage = {
      data: stream.contents,
      format,
      pageIndex,
      objectName
    }
    
    if (typeof width === 'number') {
      embeddedImage.width = width
    }
    
    if (typeof height === 'number') {
      embeddedImage.height = height
    }
    
    return embeddedImage
  }

  /**
   * Find the best matching embedded image for a given bounding box
   */
  private findBestImageMatch(
    images: EmbeddedImage[],
    targetBbox: BoundingBox,
    pageSize: { width: number; height: number }
  ): EmbeddedImage | null {
    // For now, use simple heuristics since we don't have content stream positions
    
    // If there's only one image, assume it's the target
    if (images.length === 1) {
      this.logger.info('Using single embedded image (heuristic match)')
      return images[0] || null
    }
    
    // If multiple images, try to use dimensions to guess
    if (images.length > 1) {
      // Sort by size (larger images more likely to be figures)
      const sortedImages = [...images].sort((a, b) => {
        const sizeA = (a.width || 0) * (a.height || 0)
        const sizeB = (b.width || 0) * (b.height || 0)
        return sizeB - sizeA
      })

      this.logger.warn(`Multiple images found (${images.length}), using largest as heuristic`)
      return sortedImages[0] || null
    }

    return null
  }
}

/**
 * Convenience function that matches the existing interface
 */
export async function extractPdfRegionAndUploadDirect(
  opts: PdfRegionExtractionOptions
): Promise<PdfRegionExtractionResult> {
  const extractor = new PdfImageDirectExtractor()
  return extractor.extractPdfRegionAndUpload(opts)
}