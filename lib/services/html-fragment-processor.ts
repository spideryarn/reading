/**
 * HTML Fragment Post-Processing Service for Vision-Based PDF Pipeline
 * 
 * This service handles post-processing of HTML fragments generated from individual
 * PDF page images, including base64 image extraction, class annotation, and
 * validation for document assembly.
 * 
 * Part of the vision-based PDF processing pipeline Stage 4.
 */

import { createRequestLogger } from '@/lib/services/logger'
import { assignPageAwareIds } from '@/lib/services/deterministicId'
import { z } from 'zod'
import { JSDOM } from 'jsdom'

// Schema for bounding box coordinates
export const boundingBoxSchema = z.object({
  x1: z.number().min(0).max(1).describe('Left coordinate (normalized 0-1)'),
  y1: z.number().min(0).max(1).describe('Top coordinate (normalized 0-1)'),  
  x2: z.number().min(0).max(1).describe('Right coordinate (normalized 0-1)'),
  y2: z.number().min(0).max(1).describe('Bottom coordinate (normalized 0-1)')
})

// Schema for extracted image data
export const extractedImageSchema = z.object({
  elementId: z.string().describe('Element ID containing the image'),
  bbox: boundingBoxSchema.describe('Bounding box coordinates'),
  figureNumber: z.string().optional().describe('Figure number if available'),
  caption: z.string().optional().describe('Figure caption text'),
  altText: z.string().optional().describe('Alt text description'),
  elementType: z.enum(['figure', 'image', 'diagram', 'chart']).describe('Type of visual element')
})

// Schema for page annotation metadata
export const pageAnnotationSchema = z.object({
  pageNumber: z.number().int().min(1).describe('Page number'),
  columnCount: z.number().int().min(1).max(3).default(1).describe('Number of columns detected'),
  contentSections: z.array(z.string()).describe('Content section types found'),
  crossPageElements: z.array(z.string()).describe('Elements that continue across pages')
})

// Schema for processed fragment result
export const processedFragmentSchema = z.object({
  pageNumber: z.number().int().min(1),
  htmlFragment: z.string().min(1).describe('Processed HTML fragment'),
  extractedImages: z.array(extractedImageSchema).describe('Images found in fragment'),
  annotations: pageAnnotationSchema.describe('Page-level annotations'),
  assignedIds: z.array(z.string()).describe('IDs assigned to elements'),
  processingTimeMs: z.number(),
  success: z.boolean(),
  errors: z.array(z.string()).describe('Processing errors encountered'),
  warnings: z.array(z.string()).describe('Non-fatal issues encountered')
})

export type BoundingBox = z.infer<typeof boundingBoxSchema>
export type ExtractedImage = z.infer<typeof extractedImageSchema>
export type PageAnnotation = z.infer<typeof pageAnnotationSchema>
export type ProcessedFragment = z.infer<typeof processedFragmentSchema>

// Input schema for fragment processing
export const fragmentProcessingInputSchema = z.object({
  htmlFragment: z.string().min(1).describe('Raw HTML fragment from page processing'),
  pageNumber: z.number().int().min(1).describe('1-indexed page number'),
  totalPages: z.number().int().min(1).describe('Total pages in document'),
  existingIds: z.set(z.string()).default(new Set()).describe('IDs already used in document'),
  fileName: z.string().optional().describe('Original filename for context'),
  pageImageBase64: z.string().optional().describe('Original page image for reference')
})

export type FragmentProcessingInput = z.infer<typeof fragmentProcessingInputSchema>

/**
 * Process a single HTML fragment from page-level AI processing
 */
export async function processHtmlFragment(
  input: FragmentProcessingInput
): Promise<ProcessedFragment> {
  const logger = createRequestLogger('/services/html-fragment-processor', `fragment-${Date.now()}`)
  const startTime = Date.now()
  
  try {
    // Validate input
    const validatedInput = fragmentProcessingInputSchema.parse(input)
    logger.info('Processing HTML fragment', {
      pageNumber: validatedInput.pageNumber,
      totalPages: validatedInput.totalPages,
      hasFileName: !!validatedInput.fileName,
      hasPageImage: !!validatedInput.pageImageBase64,
      existingIdsCount: validatedInput.existingIds.size,
      fragmentLength: validatedInput.htmlFragment.length
    })
    
    const errors: string[] = []
    const warnings: string[] = []
    
    // Parse HTML fragment
    const dom = new JSDOM(validatedInput.htmlFragment)
    const document = dom.window.document
    
    // Extract images with bounding boxes
    const extractedImages = extractImagesFromFragment(document, validatedInput.pageNumber, warnings)
    
    // Add page-specific annotations
    const annotations = analyzePageStructure(document, validatedInput.pageNumber, warnings)
    
    // Assign deterministic IDs to elements
    const processedHtml = assignPageAwareIds(
      validatedInput.htmlFragment,
      validatedInput.pageNumber,
      validatedInput.existingIds
    )
    
    // Extract assigned IDs for tracking
    const processedDom = new JSDOM(processedHtml)
    const assignedIds = extractAssignedIds(processedDom.window.document)
    
    // Validate the processed fragment
    validateFragmentStructure(processedDom.window.document, errors, warnings)
    
    const processingTimeMs = Date.now() - startTime
    
    logger.info('HTML fragment processing completed', {
      pageNumber: validatedInput.pageNumber,
      processingTimeMs,
      extractedImagesCount: extractedImages.length,
      assignedIdsCount: assignedIds.length,
      errorsCount: errors.length,
      warningsCount: warnings.length
    })
    
    return processedFragmentSchema.parse({
      pageNumber: validatedInput.pageNumber,
      htmlFragment: processedHtml,
      extractedImages,
      annotations,
      assignedIds,
      processingTimeMs,
      success: errors.length === 0,
      errors,
      warnings
    })
    
  } catch (error) {
    const processingTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error('HTML fragment processing failed', {
      pageNumber: input.pageNumber,
      processingTimeMs,
      error: errorMessage
    })
    
    return processedFragmentSchema.parse({
      pageNumber: Math.max(1, input.pageNumber),
      htmlFragment: input.htmlFragment || '',
      extractedImages: [],
      annotations: {
        pageNumber: Math.max(1, input.pageNumber),
        columnCount: 1,
        contentSections: [],
        crossPageElements: []
      },
      assignedIds: [],
      processingTimeMs,
      success: false,
      errors: [errorMessage],
      warnings: []
    })
  }
}

/**
 * Extract images and their bounding boxes from HTML fragment
 */
function extractImagesFromFragment(
  document: Document,
  pageNumber: number,
  warnings: string[]
): ExtractedImage[] {
  const images: ExtractedImage[] = []
  
  // Find all elements with bounding box data attributes
  const elementsWithBbox = document.querySelectorAll('[data-bbox]')
  
  elementsWithBbox.forEach((element, index) => {
    try {
      const bboxData = element.getAttribute('data-bbox')
      if (!bboxData) return
      
      // Parse bounding box coordinates
      const coords = bboxData.split(',').map(coord => parseFloat(coord.trim()))
      if (coords.length !== 4 || coords.some(isNaN)) {
        warnings.push(`Invalid bounding box format on page ${pageNumber}: ${bboxData}`)
        return
      }
      
      const bbox = boundingBoxSchema.parse({
        x1: coords[0],
        y1: coords[1], 
        x2: coords[2],
        y2: coords[3]
      })
      
      // Determine element type
      let elementType: 'figure' | 'image' | 'diagram' | 'chart' = 'image'
      if (element.tagName.toLowerCase() === 'figure') {
        elementType = 'figure'
      } else if (element.classList.contains('diagram')) {
        elementType = 'diagram'
      } else if (element.classList.contains('chart')) {
        elementType = 'chart'
      }
      
      // Extract figure information
      const figureNumber = extractFigureNumber(element)
      const caption = extractFigureCaption(element)
      const altText = extractAltText(element)
      
      // Generate or use existing element ID
      let elementId = element.getAttribute('id')
      if (!elementId) {
        elementId = `page-${pageNumber}-figure-${index + 1}`
        element.setAttribute('id', elementId)
      }
      
      const extractedImage = extractedImageSchema.parse({
        elementId,
        bbox,
        figureNumber,
        caption,
        altText,
        elementType
      })
      
      images.push(extractedImage)
      
    } catch (error) {
      warnings.push(`Failed to extract image on page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
  
  return images
}

/**
 * Analyze page structure and add annotations
 */
function analyzePageStructure(
  document: Document,
  pageNumber: number,
  warnings: string[]
): PageAnnotation {
  try {
    // Detect column layout
    const columnElements = document.querySelectorAll('[class*="column"]')
    const columnCount = Math.max(1, new Set(Array.from(columnElements).map(el => {
      const classes = el.className.split(' ')
      return classes.find(cls => cls.includes('column'))
    })).size)
    
    // Extract content section types
    const contentSections = new Set<string>()
    const sectionElements = document.querySelectorAll('[class*="abstract"], [class*="introduction"], [class*="methodology"], [class*="conclusion"], [class*="bibliography"]')
    sectionElements.forEach(el => {
      const classes = el.className.split(' ')
      classes.forEach(cls => {
        if (['abstract', 'introduction', 'methodology', 'conclusion', 'bibliography'].some(section => cls.includes(section))) {
          contentSections.add(cls)
        }
      })
    })
    
    // Find cross-page elements from HTML comments
    const crossPageElements: string[] = []
    const htmlContent = document.documentElement.outerHTML
    const crossPageComments = htmlContent.match(/<!--\s*(continues-[^>]+|table-continues[^>]+|figure-reference[^>]+)\s*-->/g) || []
    crossPageComments.forEach(comment => {
      const content = comment.replace(/<!--\s*/, '').replace(/\s*-->/, '').trim()
      crossPageElements.push(content)
    })
    
    return pageAnnotationSchema.parse({
      pageNumber,
      columnCount,
      contentSections: Array.from(contentSections),
      crossPageElements
    })
    
  } catch (error) {
    warnings.push(`Failed to analyze page structure for page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return pageAnnotationSchema.parse({
      pageNumber,
      columnCount: 1,
      contentSections: [],
      crossPageElements: []
    })
  }
}

/**
 * Extract assigned element IDs from processed HTML
 */
function extractAssignedIds(document: Document): string[] {
  const ids: string[] = []
  const elementsWithId = document.querySelectorAll('[id]')
  
  elementsWithId.forEach(element => {
    const id = element.getAttribute('id')
    if (id) {
      ids.push(id)
    }
  })
  
  return ids
}

/**
 * Validate HTML fragment structure and content
 */
function validateFragmentStructure(
  document: Document,
  errors: string[],
  warnings: string[]
): void {
  try {
    // Check for proper semantic structure
    // Headings check removed as it was unused - can be added back if needed
    const tables = document.querySelectorAll('table')
    const figures = document.querySelectorAll('figure')
    
    // Validate table structure
    tables.forEach((table, index) => {
      const hasHeader = table.querySelector('thead, th')
      const hasBody = table.querySelector('tbody, td')
      
      if (!hasHeader && !hasBody) {
        errors.push(`Table ${index + 1} has no header or body content`)
      }
    })
    
    // Validate figure structure
    figures.forEach((figure, index) => {
      const hasCaption = figure.querySelector('figcaption')
      const hasBbox = figure.hasAttribute('data-bbox')
      
      if (!hasCaption) {
        warnings.push(`Figure ${index + 1} missing caption`)
      }
      
      if (!hasBbox) {
        warnings.push(`Figure ${index + 1} missing bounding box data`)
      }
    })
    
    // Check for empty content
    const textContent = document.body?.textContent?.trim() || document.documentElement.textContent?.trim() || ''
    if (textContent.length < 10) {
      warnings.push('Fragment contains very little text content')
    }
    
  } catch (error) {
    errors.push(`Fragment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract figure number from element or its children
 */
function extractFigureNumber(element: Element): string | undefined {
  // Look for figure reference spans
  const figRef = element.querySelector('.figure-ref, [class*="figure"]')
  if (figRef?.textContent) {
    const match = figRef.textContent.match(/Figure\s+(\d+(?:\.\d+)?)/i)
    if (match) {
      return match[1]
    }
  }
  
  // Look in classes for figure numbers
  const classes = element.className.split(' ')
  for (const cls of classes) {
    const match = cls.match(/figure-(\d+(?:-\d+)?)/i)
    if (match && match[1]) {
      return match[1].replace('-', '.')
    }
  }
  
  return undefined
}

/**
 * Extract figure caption text
 */
function extractFigureCaption(element: Element): string | undefined {
  const caption = element.querySelector('figcaption')
  if (caption?.textContent) {
    return caption.textContent.trim()
  }
  
  // Look for caption in nearby elements
  const nextElement = element.nextElementSibling
  if (nextElement?.classList.contains('caption')) {
    const captionText = nextElement.textContent?.trim()
    return captionText || undefined
  }
  
  return undefined
}

/**
 * Extract alt text from images in element
 */
function extractAltText(element: Element): string | undefined {
  const img = element.querySelector('img')
  if (img?.alt) {
    return img.alt.trim()
  }
  
  // Generate descriptive alt text from content
  const textContent = element.textContent?.trim()
  if (textContent && textContent.length > 10 && textContent.length < 200) {
    return textContent
  }
  
  return undefined
}

/**
 * Process multiple fragments in batch
 */
export async function processFragmentsBatch(
  fragments: FragmentProcessingInput[]
): Promise<ProcessedFragment[]> {
  const logger = createRequestLogger('/services/html-fragment-processor', `fragment-${Date.now()}`)
  const startTime = Date.now()
  
  logger.info('Starting batch fragment processing', {
    totalFragments: fragments.length
  })
  
  const results: ProcessedFragment[] = []
  const globalIds = new Set<string>()
  
  // Process fragments sequentially to maintain ID uniqueness
  for (const fragment of fragments) {
    const updatedFragment = {
      ...fragment,
      existingIds: new Set([...Array.from(fragment.existingIds), ...Array.from(globalIds)])
    }
    
    const result = await processHtmlFragment(updatedFragment)
    
    // Update global ID tracking
    result.assignedIds.forEach(id => globalIds.add(id))
    
    results.push(result)
  }
  
  const totalTime = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  
  logger.info('Batch fragment processing completed', {
    totalFragments: fragments.length,
    successCount,
    failureCount: fragments.length - successCount,
    totalTimeMs: totalTime,
    avgTimePerFragment: Math.round(totalTime / fragments.length)
  })
  
  return results
}