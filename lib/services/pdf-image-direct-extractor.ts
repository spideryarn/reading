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
import { uploadImageAssetServerSide, getSignedUrlServerSide } from '@/lib/services/storage-server'
import { createRequestLogger } from '@/lib/services/logger'
import { 
  pdfRegionExtractionOptionsSchema, 
  PdfRegionExtractionOptions,
  PdfRegionExtractionResult 
} from '@/lib/services/pdf-image-extractor-types'

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
 * Image match result with confidence score
 */
interface ImageMatchResult {
  image: EmbeddedImage
  confidence: number
  reason: string
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
      const matchResult = this.findBestImageMatch(
        embeddedImages,
        options.bbox,
        { width: pageWidth, height: pageHeight }
      )

      if (!matchResult) {
        throw new Error(
          `No embedded image matches the bounding box ${JSON.stringify(options.bbox)} on page ${options.pageNumber}. ` +
          `Found ${embeddedImages.length} images but none within the target region.`
        )
      }

      const matchedImage = matchResult.image

      this.logger.info('Found matching embedded image', { 
        format: matchedImage.format,
        size: matchedImage.data.length,
        confidence: matchResult.confidence,
        matchReason: matchResult.reason
      })

      // Create blob for upload
      const mimeType = matchedImage.format === 'jpeg' ? 'image/jpeg' : 
                      matchedImage.format === 'png' ? 'image/png' : 
                      'application/octet-stream'
      
      const blob = new Blob([matchedImage.data], { type: mimeType })

      // Upload to Supabase Storage
      const filename = `${String(options.pageNumber).padStart(3, '0')}_${options.elementId}.${matchedImage.format === 'unknown' ? 'bin' : matchedImage.format}`
      const uploadRes = await uploadImageAssetServerSide(
        blob,
        options.documentId,
        filename,
        mimeType
      )

      // Generate signed URL (1 year expiry)
      const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60
      const signedUrl = await getSignedUrlServerSide(uploadRes.path, ONE_YEAR_SECONDS)

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
  ): ImageMatchResult | null {
    // Calculate expected dimensions from bounding box
    const expectedWidth = (targetBbox.x2 - targetBbox.x1) * pageSize.width
    const expectedHeight = (targetBbox.y2 - targetBbox.y1) * pageSize.height
    const expectedArea = expectedWidth * expectedHeight
    
    // If there's only one image, check if it could plausibly match
    if (images.length === 1) {
      const image = images[0]!
      let confidence = 0.5 // Base confidence for single image
      
      if (image.width && image.height) {
        // Calculate dimension similarity
        const actualArea = image.width * image.height
        const areaRatio = Math.min(actualArea, expectedArea) / Math.max(actualArea, expectedArea)
        confidence = 0.3 + (areaRatio * 0.7) // 30% base + up to 70% for size match
      }
      
      this.logger.info('Single embedded image match', { 
        confidence,
        expectedDimensions: { width: expectedWidth, height: expectedHeight },
        actualDimensions: { width: image.width, height: image.height }
      })
      
      if (confidence < 0.4) {
        this.logger.warn('Low confidence match for single image', { confidence })
      }
      
      return { 
        image, 
        confidence, 
        reason: 'Single image on page' 
      }
    }
    
    // If multiple images, score each one
    if (images.length > 1) {
      const scoredImages = images.map(image => {
        let confidence = 0
        let reason = 'Multiple images'
        
        if (image.width && image.height) {
          // Aspect ratio similarity (0-1)
          const expectedAspect = expectedWidth / expectedHeight
          const actualAspect = image.width / image.height
          const aspectRatio = Math.min(expectedAspect, actualAspect) / Math.max(expectedAspect, actualAspect)
          
          // Area similarity (0-1)
          const actualArea = image.width * image.height
          const areaRatio = Math.min(actualArea, expectedArea) / Math.max(actualArea, expectedArea)
          
          // Combined confidence (weighted average)
          confidence = (aspectRatio * 0.6) + (areaRatio * 0.4)
          
          // Boost confidence for very close matches
          if (aspectRatio > 0.95 && areaRatio > 0.9) {
            confidence = Math.min(confidence * 1.2, 0.95)
            reason = 'Close dimension match'
          }
        } else {
          // No dimensions available - use size heuristic
          confidence = 0.3 // Low confidence
          reason = 'No dimensions available'
        }
        
        return { image, confidence, reason }
      })
      
      // Sort by confidence
      scoredImages.sort((a, b) => b.confidence - a.confidence)
      const best = scoredImages[0]
      
      if (best) {
        this.logger.info(`Selected from ${images.length} images`, {
          confidence: best.confidence,
          reason: best.reason,
          expectedDimensions: { width: expectedWidth, height: expectedHeight },
          actualDimensions: { width: best.image.width, height: best.image.height }
        })
        
        if (best.confidence < 0.5) {
          this.logger.warn('Low confidence match for best image', { 
            confidence: best.confidence,
            totalImages: images.length 
          })
        }
        
        return best
      }
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