/**
 * Direct PDF Image Extraction without Canvas
 * 
 * This module extracts embedded images directly from PDF streams without
 * rendering, avoiding native dependencies. Works for PDFs with embedded
 * JPEG/PNG images but not for vector graphics or text-as-paths.
 */

import { PDFDocument, PDFName, PDFRawStream, PDFDict, PDFArray, PDFNumber } from 'pdf-lib'
import { z } from 'zod'

export const directExtractionResultSchema = z.object({
  success: z.boolean(),
  method: z.literal('direct'),
  images: z.array(z.object({
    pageNumber: z.number(),
    imageIndex: z.number(),
    data: z.instanceof(Uint8Array),
    format: z.enum(['jpeg', 'png', 'unknown']),
    width: z.number(),
    height: z.number(),
    // Position in PDF coordinates (bottom-left origin)
    pdfBbox: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }).optional(),
    // Normalized position (top-left origin, 0-1 range)
    normalizedBbox: z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number()
    }).optional()
  })),
  totalImagesFound: z.number(),
  extractedCount: z.number(),
  errors: z.array(z.string())
})

export type DirectExtractionResult = z.infer<typeof directExtractionResultSchema>

interface ImageResource {
  name: string
  stream: PDFRawStream
  width: number
  height: number
  format: 'jpeg' | 'png' | 'unknown'
}

/**
 * Extract embedded images from a PDF without rendering
 * 
 * @param pdfBuffer - PDF file buffer
 * @param options - Extraction options
 * @returns Extraction result with embedded images
 */
export async function extractEmbeddedImages(
  pdfBuffer: Buffer,
  options: {
    pageNumbers?: number[] // Specific pages to extract from (1-indexed)
    includePositions?: boolean // Try to determine image positions
  } = {}
): Promise<DirectExtractionResult> {
  const errors: string[] = []
  const images: DirectExtractionResult['images'] = []
  
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { 
      ignoreEncryption: true,
      throwOnInvalidObject: false 
    })
    
    const pageCount = pdfDoc.getPageCount()
    const pagesToProcess = options.pageNumbers || 
      Array.from({ length: pageCount }, (_, i) => i + 1)
    
    let totalImagesFound = 0
    
    // First, collect all image resources from the PDF
    const imageResources = await collectImageResources(pdfDoc)
    totalImagesFound = imageResources.size
    
    // Process each page to find image placements
    for (const pageNum of pagesToProcess) {
      if (pageNum < 1 || pageNum > pageCount) {
        errors.push(`Invalid page number: ${pageNum}`)
        continue
      }
      
      try {
        const page = pdfDoc.getPage(pageNum - 1) // 0-indexed
        const pageImages = await extractImagesFromPage(
          page,
          pageNum,
          imageResources,
          options.includePositions || false
        )
        
        images.push(...pageImages)
      } catch (pageError) {
        errors.push(`Page ${pageNum}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`)
      }
    }
    
    return {
      success: images.length > 0,
      method: 'direct',
      images,
      totalImagesFound,
      extractedCount: images.length,
      errors
    }
  } catch (error) {
    return {
      success: false,
      method: 'direct',
      images: [],
      totalImagesFound: 0,
      extractedCount: 0,
      errors: [`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    }
  }
}

/**
 * Collect all image resources from the PDF
 */
async function collectImageResources(pdfDoc: PDFDocument): Promise<Map<string, ImageResource>> {
  const resources = new Map<string, ImageResource>()
  
  // Iterate through all indirect objects
  pdfDoc.context.indirectObjects.forEach((pdfObject, ref) => {
    if (pdfObject instanceof PDFRawStream) {
      const dict = pdfObject.dict
      const subtype = dict.get(PDFName.of('Subtype'))
      
      if (subtype?.toString() === '/Image') {
        const width = dict.get(PDFName.of('Width'))
        const height = dict.get(PDFName.of('Height'))
        
        if (width instanceof PDFNumber && height instanceof PDFNumber) {
          const filter = dict.get(PDFName.of('Filter'))
          let format: 'jpeg' | 'png' | 'unknown' = 'unknown'
          
          if (filter) {
            const filterName = filter.toString()
            if (filterName === '/DCTDecode') {
              format = 'jpeg'
            } else if (filterName === '/FlateDecode') {
              // Could be PNG or other format
              const predictor = dict.get(PDFName.of('DecodeParms'))?.get(PDFName.of('Predictor'))
              if (predictor && predictor.toString() !== '1') {
                format = 'png'
              }
            }
          }
          
          const name = ref.objectNumber + '_' + ref.generationNumber
          resources.set(name, {
            name,
            stream: pdfObject,
            width: width.asNumber(),
            height: height.asNumber(),
            format
          })
        }
      }
    }
  })
  
  return resources
}

/**
 * Extract images from a specific page
 */
async function extractImagesFromPage(
  page: any, // PDFPage type
  pageNumber: number,
  imageResources: Map<string, ImageResource>,
  includePositions: boolean
): Promise<DirectExtractionResult['images']> {
  const images: DirectExtractionResult['images'] = []
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  
  // Get page resources
  const resources = page.node.get(PDFName.of('Resources'))
  if (!resources) return images
  
  const xobjects = resources.get(PDFName.of('XObject'))
  if (!xobjects || !(xobjects instanceof PDFDict)) return images
  
  // Process each XObject
  let imageIndex = 0
  const entries = Array.from(xobjects.entries())
  
  for (const [nameObj, valueObj] of entries) {
    try {
      const xobject = page.node.context.lookup(valueObj)
      if (!xobject || !(xobject instanceof PDFRawStream)) continue
      
      const subtype = xobject.dict.get(PDFName.of('Subtype'))
      if (subtype?.toString() !== '/Image') continue
      
      // Find matching image resource
      const ref = valueObj.toString().match(/(\d+) (\d+) R/)
      if (!ref) continue
      
      const resourceKey = ref[1] + '_' + ref[2]
      const imageResource = imageResources.get(resourceKey)
      if (!imageResource) continue
      
      // Extract image data
      const imageData = imageResource.stream.contents
      
      // Create image entry
      const image: DirectExtractionResult['images'][0] = {
        pageNumber,
        imageIndex: imageIndex++,
        data: imageData,
        format: imageResource.format,
        width: imageResource.width,
        height: imageResource.height
      }
      
      // Try to find position if requested
      if (includePositions) {
        // This is simplified - real implementation would need to:
        // 1. Parse content streams
        // 2. Track graphics state transformations
        // 3. Find where this specific image is placed
        
        // For now, we'll add a placeholder
        image.normalizedBbox = {
          x1: 0,
          y1: 0,
          x2: 1,
          y2: 1
        }
      }
      
      images.push(image)
    } catch (err) {
      // Skip problematic images
      console.warn(`Failed to extract image: ${err}`)
    }
  }
  
  return images
}

/**
 * Check if direct extraction is likely to work for a PDF
 * 
 * @param pdfBuffer - PDF file buffer
 * @returns Percentage of pages with extractable images (0-100)
 */
export async function assessDirectExtractionViability(
  pdfBuffer: Buffer
): Promise<{
  viabilityScore: number // 0-100
  totalPages: number
  pagesWithImages: number
  totalImages: number
  imageFormats: Record<string, number>
}> {
  try {
    const result = await extractEmbeddedImages(pdfBuffer, {
      includePositions: false
    })
    
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const totalPages = pdfDoc.getPageCount()
    
    // Count pages with images
    const pagesWithImages = new Set(result.images.map(img => img.pageNumber)).size
    
    // Count image formats
    const imageFormats: Record<string, number> = {}
    result.images.forEach(img => {
      imageFormats[img.format] = (imageFormats[img.format] || 0) + 1
    })
    
    // Calculate viability score
    const viabilityScore = Math.round((pagesWithImages / totalPages) * 100)
    
    return {
      viabilityScore,
      totalPages,
      pagesWithImages,
      totalImages: result.totalImagesFound,
      imageFormats
    }
  } catch (error) {
    return {
      viabilityScore: 0,
      totalPages: 0,
      pagesWithImages: 0,
      totalImages: 0,
      imageFormats: {}
    }
  }
}

/**
 * Match extracted images with OCR bounding boxes
 * 
 * This is a placeholder for the logic that would match extracted images
 * with the bounding boxes returned by Mistral OCR.
 */
export function matchImagesWithBoundingBoxes(
  extractedImages: DirectExtractionResult['images'],
  ocrBoundingBoxes: Array<{
    elementId: string
    bbox: { x1: number; y1: number; x2: number; y2: number }
  }>
): Array<{
  elementId: string
  imageData: Uint8Array
  format: 'jpeg' | 'png' | 'unknown'
}> {
  // TODO: Implement matching logic based on position overlap
  // For now, return empty array
  return []
}