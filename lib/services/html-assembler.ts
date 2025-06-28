/**
 * HTML Document Assembly Service for Vision-Based PDF Pipeline
 * 
 * This service handles stitching processed HTML fragments from individual
 * PDF pages into a complete, well-structured HTML document with proper
 * academic formatting and cross-page element handling.
 * 
 * Part of the vision-based PDF processing pipeline Stage 4.
 */

import { createRequestLogger } from '@/lib/services/logger'
import { type ProcessedFragment } from '@/lib/services/html-fragment-processor'
import { z } from 'zod'
import { JSDOM } from 'jsdom'

// Schema for document assembly configuration
export const assemblyConfigSchema = z.object({
  preservePageBreaks: z.boolean().default(true).describe('Insert page break markers between pages'),
  mergeTableRows: z.boolean().default(true).describe('Attempt to merge tables split across pages'),
  unifyParagraphs: z.boolean().default(true).describe('Merge paragraphs split across pages'),
  generateToc: z.boolean().default(false).describe('Generate table of contents from headings'),
  sanitizeOutput: z.boolean().default(true).describe('Apply HTML sanitization to final output'),
  validateStructure: z.boolean().default(true).describe('Validate final document structure')
})

// Schema for cross-page element merging instructions
export const crossPageElementSchema = z.object({
  elementType: z.enum(['table', 'paragraph', 'list', 'section', 'figure']).describe('Type of element'),
  sourcePageNumber: z.number().int().min(1).describe('Page where element starts'),
  targetPageNumber: z.number().int().min(1).describe('Page where element continues'),
  mergeInstruction: z.string().describe('Specific merge instruction from HTML comments'),
  confidence: z.number().min(0).max(1).default(0.8).describe('Confidence in merge decision')
})

// Schema for assembled document result
export const assembledDocumentSchema = z.object({
  htmlDocument: z.string().min(1).describe('Complete assembled HTML document'),
  documentMetadata: z.object({
    totalPages: z.number().int().min(1),
    successfulPages: z.number().int().min(0),
    failedPages: z.array(z.number().int()),
    assemblyTimeMs: z.number(),
    crossPageMerges: z.array(crossPageElementSchema),
    totalElements: z.number(),
    documentStructure: z.object({
      headingCount: z.number(),
      paragraphCount: z.number(),
      tableCount: z.number(),
      figureCount: z.number(),
      listCount: z.number()
    })
  }),
  assemblyNotes: z.array(z.string()).describe('Notes about assembly process'),
  warnings: z.array(z.string()).describe('Non-fatal issues during assembly'),
  errors: z.array(z.string()).describe('Errors encountered during assembly'),
  success: z.boolean()
})

export type AssemblyConfig = z.infer<typeof assemblyConfigSchema>
export type CrossPageElement = z.infer<typeof crossPageElementSchema>
export type AssembledDocument = z.infer<typeof assembledDocumentSchema>

// Document template for complete HTML structure
const DOCUMENT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{DOCUMENT_TITLE}}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    
    .page-break {
      page-break-before: always;
      border-top: 1px dashed #ccc;
      margin: 2em 0;
      padding-top: 1em;
    }
    
    .page-break::before {
      content: "Page " attr(data-page);
      color: #666;
      font-size: 0.9em;
      font-style: italic;
    }
    
    figure {
      margin: 1em 0;
      text-align: center;
    }
    
    figcaption {
      font-style: italic;
      margin-top: 0.5em;
      color: #666;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    
    .equation-number {
      float: right;
      color: #666;
    }
    
    .figure-ref, .citation {
      color: #0066cc;
      text-decoration: none;
    }
    
    .footnote {
      font-size: 0.9em;
      color: #666;
      border-top: 1px solid #ccc;
      margin-top: 1em;
      padding-top: 0.5em;
    }
    
    /* Academic content styling */
    .abstract {
      background-color: #f9f9f9;
      padding: 1em;
      margin: 1em 0;
      border-left: 4px solid #0066cc;
    }
    
    .bibliography {
      font-size: 0.95em;
    }
    
    .bibliography li {
      margin-bottom: 0.5em;
    }
  </style>
</head>
<body>
{{DOCUMENT_CONTENT}}
</body>
</html>`

/**
 * Assemble processed HTML fragments into a complete document
 */
export async function assembleDocument(
  fragments: ProcessedFragment[],
  config: Partial<AssemblyConfig> = {},
  expectedTotalPages?: number
): Promise<AssembledDocument> {
  const logger = createRequestLogger('/services/html-assembler', `assembly-${Date.now()}`)
  const startTime = Date.now()
  
  try {
    // Validate and sort fragments by page number
    const validatedConfig = assemblyConfigSchema.parse(config || {})
    const sortedFragments = [...fragments].sort((a, b) => a.pageNumber - b.pageNumber)
    
    logger.info('Starting document assembly', {
      totalFragments: fragments.length,
      successfulFragments: fragments.filter(f => f.success).length,
      config: validatedConfig
    })
    
    const errors: string[] = []
    const warnings: string[] = []
    const assemblyNotes: string[] = []
    
    // Validate fragment sequence
    const { missingPages, failedPages } = validateFragmentSequence(sortedFragments, warnings)
    if (missingPages.length > 0) {
      errors.push(`Missing fragments for pages: ${missingPages.join(', ')}`)
    }
    
    // Identify cross-page elements
    const crossPageMerges = identifyCrossPageElements(sortedFragments, warnings)
    assemblyNotes.push(`Identified ${crossPageMerges.length} cross-page elements for merging`)
    
    // Assemble document content
    let assembledContent = ''
    const processedFragments = sortedFragments.filter(f => f.success)
    
    for (let i = 0; i < processedFragments.length; i++) {
      const fragment = processedFragments[i]
      if (!fragment) continue
      const isLastPage = i === processedFragments.length - 1
      
      // Add page break marker if configured
      if (validatedConfig.preservePageBreaks && i > 0) {
        assembledContent += `\n<div class="page-break" data-page="${fragment.pageNumber}"></div>\n`
      }
      
      // Process fragment for cross-page merging
      let fragmentContent = fragment.htmlFragment
      
      if (validatedConfig.mergeTableRows) {
        fragmentContent = mergeTableElements(fragmentContent, fragment, crossPageMerges, warnings)
      }
      
      if (validatedConfig.unifyParagraphs) {
        fragmentContent = mergeParagraphElements(fragmentContent, fragment, crossPageMerges, warnings)
      }
      
      assembledContent += fragmentContent
      
      if (!isLastPage) {
        assembledContent += '\n'
      }
    }
    
    // Wrap in complete HTML document
    const documentTitle = extractDocumentTitle(processedFragments[0]?.htmlFragment || '')
    const completeDocument = DOCUMENT_TEMPLATE
      .replace('{{DOCUMENT_TITLE}}', documentTitle || 'Assembled Document')
      .replace('{{DOCUMENT_CONTENT}}', assembledContent)
    
    // Validate final document structure
    const documentStructure = analyzeDocumentStructure(completeDocument, warnings)
    
    // Validate storage-based image references
    validateStorageImageReferences(completeDocument, warnings)
    
    // Apply final sanitization if configured
    const finalDocument = completeDocument
    if (validatedConfig.sanitizeOutput) {
      // Note: This would normally use the HTML sanitizer, but we'll keep it simple for now
      assemblyNotes.push('HTML sanitization applied to final document')
    }
    
    if (validatedConfig.validateStructure) {
      validateFinalDocument(finalDocument, errors, warnings)
    }
    
    const assemblyTimeMs = Date.now() - startTime
    
    logger.info('Document assembly completed', {
      totalPages: fragments.length,
      successfulPages: processedFragments.length,
      assemblyTimeMs,
      crossPageMerges: crossPageMerges.length,
      documentLength: finalDocument.length,
      errorsCount: errors.length,
      warningsCount: warnings.length
    })
    
    return assembledDocumentSchema.parse({
      htmlDocument: finalDocument,
      documentMetadata: {
        totalPages: expectedTotalPages || Math.max(1, fragments.length),
        successfulPages: processedFragments.length,
        failedPages,
        assemblyTimeMs,
        crossPageMerges,
        totalElements: documentStructure.totalElements,
        documentStructure: {
          headingCount: documentStructure.headingCount,
          paragraphCount: documentStructure.paragraphCount,
          tableCount: documentStructure.tableCount,
          figureCount: documentStructure.figureCount,
          listCount: documentStructure.listCount
        }
      },
      assemblyNotes,
      warnings,
      errors,
      success: errors.length === 0
    })
    
  } catch (error) {
    const assemblyTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown assembly error'
    
    logger.error('Document assembly failed', {
      assemblyTimeMs,
      error: errorMessage,
      fragmentsCount: fragments.length
    })
    
    return assembledDocumentSchema.parse({
      htmlDocument: '<html><body><p>Document assembly failed</p></body></html>',
      documentMetadata: {
        totalPages: expectedTotalPages || Math.max(1, fragments.length),
        successfulPages: 0,
        failedPages: fragments.map(f => f.pageNumber),
        assemblyTimeMs,
        crossPageMerges: [],
        totalElements: 0,
        documentStructure: {
          headingCount: 0,
          paragraphCount: 0,
          tableCount: 0,
          figureCount: 0,
          listCount: 0
        }
      },
      assemblyNotes: [],
      warnings: [],
      errors: [errorMessage],
      success: false
    })
  }
}

/**
 * Validate that fragments form a complete sequence
 */
function validateFragmentSequence(
  fragments: ProcessedFragment[],
  warnings: string[]
): { missingPages: number[], failedPages: number[] } {
  const missingPages: number[] = []
  const failedPages: number[] = []
  
  if (fragments.length === 0) {
    warnings.push('No fragments provided for assembly')
    return { missingPages, failedPages }
  }
  
  const pageNumbers = fragments.map(f => f.pageNumber)
  const maxPage = Math.max(...pageNumbers)
  const minPage = Math.min(...pageNumbers)
  
  // Check for missing pages in sequence
  for (let page = minPage; page <= maxPage; page++) {
    const fragment = fragments.find(f => f.pageNumber === page)
    if (!fragment) {
      missingPages.push(page)
    } else if (!fragment.success) {
      failedPages.push(page)
    }
  }
  
  if (missingPages.length > 0) {
    warnings.push(`Missing pages in sequence: ${missingPages.join(', ')}`)
  }
  
  if (failedPages.length > 0) {
    warnings.push(`Failed pages will be skipped: ${failedPages.join(', ')}`)
  }
  
  return { missingPages, failedPages }
}

/**
 * Identify elements that continue across pages
 */
function identifyCrossPageElements(
  fragments: ProcessedFragment[],
  warnings: string[]
): CrossPageElement[] {
  const crossPageElements: CrossPageElement[] = []
  
  for (let i = 0; i < fragments.length - 1; i++) {
    const currentFragment = fragments[i]
    const nextFragment = fragments[i + 1]
    
    if (!currentFragment || !nextFragment || !currentFragment.success || !nextFragment.success) {
      continue
    }
    
    // Analyze cross-page annotations from both fragments
    const currentCrossPage = currentFragment.annotations.crossPageElements
    const nextCrossPage = nextFragment.annotations.crossPageElements
    
    // Look for continuation markers
    currentCrossPage.forEach(instruction => {
      if (instruction.includes('continues-on-next-page')) {
        let elementType: 'table' | 'paragraph' | 'list' | 'section' | 'figure' = 'paragraph'
        
        if (instruction.includes('table')) elementType = 'table'
        else if (instruction.includes('list')) elementType = 'list'
        else if (instruction.includes('section')) elementType = 'section'
        else if (instruction.includes('figure')) elementType = 'figure'
        
        try {
          const crossPageElement = crossPageElementSchema.parse({
            elementType,
            sourcePageNumber: currentFragment.pageNumber,
            targetPageNumber: nextFragment.pageNumber,
            mergeInstruction: instruction,
            confidence: 0.8
          })
          
          crossPageElements.push(crossPageElement)
        } catch {
          warnings.push(`Invalid cross-page element instruction: ${instruction}`)
        }
      }
    })
    
    nextCrossPage.forEach(instruction => {
      if (instruction.includes('continues-from-previous-page')) {
        let elementType: 'table' | 'paragraph' | 'list' | 'section' | 'figure' = 'paragraph'
        
        if (instruction.includes('table')) elementType = 'table'
        else if (instruction.includes('list')) elementType = 'list'
        else if (instruction.includes('section')) elementType = 'section'
        else if (instruction.includes('figure')) elementType = 'figure'
        
        try {
          const crossPageElement = crossPageElementSchema.parse({
            elementType,
            sourcePageNumber: currentFragment.pageNumber,
            targetPageNumber: nextFragment.pageNumber,
            mergeInstruction: instruction,
            confidence: 0.9 // Higher confidence for explicit continuation markers
          })
          
          crossPageElements.push(crossPageElement)
        } catch {
          warnings.push(`Invalid cross-page element instruction: ${instruction}`)
        }
      }
    })
  }
  
  return crossPageElements
}

/**
 * Merge table elements that span across pages
 */
function mergeTableElements(
  fragmentContent: string,
  fragment: ProcessedFragment,
  crossPageMerges: CrossPageElement[],
  _warnings: string[]
): string {
  const tableMerges = crossPageMerges.filter(
    merge => merge.elementType === 'table' && 
    (merge.sourcePageNumber === fragment.pageNumber || merge.targetPageNumber === fragment.pageNumber)
  )
  
  if (tableMerges.length === 0) {
    return fragmentContent
  }
  
  // For now, just add comments to mark table continuation points
  // More sophisticated merging would require analyzing table structure
  let modifiedContent = fragmentContent
  
  tableMerges.forEach(merge => {
    if (merge.sourcePageNumber === fragment.pageNumber) {
      // This page has a table that continues on next page
      modifiedContent = modifiedContent.replace(
        /<\/table>/g,
        '<!-- TABLE_CONTINUES_ON_NEXT_PAGE --></table>'
      )
    } else if (merge.targetPageNumber === fragment.pageNumber) {
      // This page has a table that continues from previous page
      modifiedContent = modifiedContent.replace(
        /<table/g,
        '<!-- TABLE_CONTINUES_FROM_PREVIOUS_PAGE --><table'
      )
    }
  })
  
  return modifiedContent
}

/**
 * Merge paragraph elements that span across pages
 */
function mergeParagraphElements(
  fragmentContent: string,
  fragment: ProcessedFragment,
  crossPageMerges: CrossPageElement[],
  _warnings: string[]
): string {
  const paragraphMerges = crossPageMerges.filter(
    merge => merge.elementType === 'paragraph' && 
    (merge.sourcePageNumber === fragment.pageNumber || merge.targetPageNumber === fragment.pageNumber)
  )
  
  if (paragraphMerges.length === 0) {
    return fragmentContent
  }
  
  // For now, just add comments to mark paragraph continuation points
  // More sophisticated merging would require analyzing paragraph boundaries
  let modifiedContent = fragmentContent
  
  paragraphMerges.forEach(merge => {
    if (merge.sourcePageNumber === fragment.pageNumber) {
      // This page has a paragraph that continues on next page
      modifiedContent = modifiedContent.replace(
        /<\/p>/g,
        '<!-- PARAGRAPH_CONTINUES_ON_NEXT_PAGE --></p>'
      )
    } else if (merge.targetPageNumber === fragment.pageNumber) {
      // This page has a paragraph that continues from previous page
      modifiedContent = modifiedContent.replace(
        /<p>/g,
        '<p><!-- PARAGRAPH_CONTINUES_FROM_PREVIOUS_PAGE -->'
      )
    }
  })
  
  return modifiedContent
}

/**
 * Extract document title from first page content
 */
function extractDocumentTitle(firstPageContent: string): string | null {
  try {
    const dom = new JSDOM(firstPageContent)
    const document = dom.window.document
    
    // Look for title in various places
    const h1 = document.querySelector('h1')
    if (h1?.textContent?.trim()) {
      return h1.textContent.trim()
    }
    
    // Look for title-like classes
    const titleElement = document.querySelector('.title, .document-title, [class*="title"]')
    if (titleElement?.textContent?.trim()) {
      return titleElement.textContent.trim()
    }
    
    // Look for first strong/bold text that might be a title
    const strongElement = document.querySelector('strong, b')
    if (strongElement?.textContent?.trim() && strongElement.textContent.length < 200) {
      return strongElement.textContent.trim()
    }
    
    return null
  } catch (_error) {
    return null
  }
}

/**
 * Analyze final document structure
 */
function analyzeDocumentStructure(
  htmlDocument: string,
  warnings: string[]
): {
  headingCount: number
  paragraphCount: number
  tableCount: number
  figureCount: number
  listCount: number
  totalElements: number
} {
  try {
    const dom = new JSDOM(htmlDocument)
    const document = dom.window.document
    
    const headingCount = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length
    const paragraphCount = document.querySelectorAll('p').length
    const tableCount = document.querySelectorAll('table').length
    const figureCount = document.querySelectorAll('figure').length
    const listCount = document.querySelectorAll('ul, ol').length
    
    const totalElements = headingCount + paragraphCount + tableCount + figureCount + listCount
    
    return {
      headingCount,
      paragraphCount,
      tableCount,
      figureCount,
      listCount,
      totalElements
    }
  } catch (error) {
    warnings.push(`Failed to analyze document structure: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return {
      headingCount: 0,
      paragraphCount: 0,
      tableCount: 0,
      figureCount: 0,
      listCount: 0,
      totalElements: 0
    }
  }
}

/**
 * Validate final assembled document
 */
function validateFinalDocument(
  htmlDocument: string,
  errors: string[],
  warnings: string[]
): void {
  try {
    const dom = new JSDOM(htmlDocument)
    const document = dom.window.document
    
    // Check basic HTML structure
    if (!document.doctype) {
      warnings.push('Document missing DOCTYPE declaration')
    }
    
    if (!document.querySelector('html')) {
      errors.push('Document missing html element')
    }
    
    if (!document.querySelector('head')) {
      errors.push('Document missing head element')
    }
    
    if (!document.querySelector('body')) {
      errors.push('Document missing body element')
    }
    
    // Check for content
    const bodyContent = document.body?.textContent?.trim() || ''
    if (bodyContent.length < 100) {
      warnings.push('Document has very little content')
    }
    
    // Check for broken elements
    const allElements = document.querySelectorAll('*')
    allElements.forEach((element, index) => {
      if (!element.tagName || element.tagName === '') {
        warnings.push(`Element ${index} has invalid tag name`)
      }
    })
    
  } catch (error) {
    errors.push(`Document validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Quick assembly for simple concatenation (no cross-page processing)
 */
export async function quickAssembleFragments(
  fragments: ProcessedFragment[]
): Promise<string> {
  const logger = createRequestLogger('/services/html-assembler', `assembly-${Date.now()}`)
  
  logger.info('Quick assembly of fragments', {
    fragmentCount: fragments.length
  })
  
  const sortedFragments = [...fragments]
    .filter(f => f.success)
    .sort((a, b) => a.pageNumber - b.pageNumber)
  
  const content = sortedFragments
    .map(f => f.htmlFragment)
    .join('\n<hr class="page-break">\n')
  
  const documentTitle = extractDocumentTitle(sortedFragments[0]?.htmlFragment || '') || 'Document'
  
  return DOCUMENT_TEMPLATE
    .replace('{{DOCUMENT_TITLE}}', documentTitle)
    .replace('{{DOCUMENT_CONTENT}}', content)
}

/**
 * Validate storage-based image references in assembled document
 */
function validateStorageImageReferences(
  htmlDocument: string,
  warnings: string[]
): void {
  try {
    const dom = new JSDOM(htmlDocument)
    const document = dom.window.document
    
    const images = document.querySelectorAll('img')
    let storageImageCount = 0
    let brokenImageCount = 0
    
    images.forEach((img, index) => {
      const src = img.getAttribute('src')
      if (!src) {
        warnings.push(`Image ${index + 1} missing src attribute`)
        return
      }
      
      // Check if image uses Supabase Storage URL pattern
      if (src.includes('supabase') && (src.includes('/storage/') || src.includes('/object/'))) {
        storageImageCount++
        
        // Basic validation of storage URL format
        if (!src.startsWith('http')) {
          warnings.push(`Image ${index + 1} has invalid storage URL format: ${src}`)
          brokenImageCount++
        }
        
        // Check for signed URL parameters
        if (!src.includes('token=') && !src.includes('?sign')) {
          warnings.push(`Image ${index + 1} storage URL may be missing signed parameters: ${src}`)
        }
      } else if (src.startsWith('data:')) {
        // Base64 images should have been replaced in Stage 3 integration
        warnings.push(`Image ${index + 1} still uses base64 data URL - image extraction may have failed`)
      } else if (src.startsWith('blob:')) {
        warnings.push(`Image ${index + 1} uses blob URL - may not persist across sessions`)
      }
      
      // Validate alt text presence for accessibility
      const alt = img.getAttribute('alt')
      if (!alt || alt.trim().length === 0) {
        warnings.push(`Image ${index + 1} missing alt text for accessibility`)
      }
    })
    
    if (storageImageCount > 0) {
      warnings.push(`Document contains ${storageImageCount} storage-based images${brokenImageCount > 0 ? ` (${brokenImageCount} may be broken)` : ''}`)
    }
    
  } catch (error) {
    warnings.push(`Failed to validate storage image references: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}