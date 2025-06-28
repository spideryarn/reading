/**
 * HTML Fragment Validation Service for Vision-Based PDF Pipeline
 * 
 * This service provides comprehensive validation for HTML fragments and
 * assembled documents, ensuring structural integrity, academic formatting
 * compliance, and cross-page element consistency.
 * 
 * Part of the vision-based PDF processing pipeline Stage 4.
 */

import { createRequestLogger } from '@/lib/services/logger'
import { type ProcessedFragment } from '@/lib/services/html-fragment-processor'
import { type AssembledDocument } from '@/lib/services/html-assembler'
import { z } from 'zod'
import { JSDOM } from 'jsdom'

// Schema for validation configuration
export const validationConfigSchema = z.object({
  strictMode: z.boolean().default(false).describe('Enable strict validation rules'),
  validateAccessibility: z.boolean().default(true).describe('Check accessibility compliance'),
  validateAcademicStructure: z.boolean().default(true).describe('Validate academic document structure'),
  validateCrossPageElements: z.boolean().default(true).describe('Check cross-page element consistency'),
  maxElementsPerPage: z.number().int().min(1).default(1000).describe('Maximum elements allowed per page'),
  minContentLength: z.number().int().min(0).default(50).describe('Minimum content length per page'),
  allowedTags: z.array(z.string()).optional().describe('Whitelist of allowed HTML tags')
})

// Schema for validation result
export const validationResultSchema = z.object({
  isValid: z.boolean(),
  validationTimeMs: z.number(),
  elementCount: z.number(),
  contentLength: z.number(),
  structuralIssues: z.array(z.object({
    type: z.enum(['error', 'warning', 'info']),
    message: z.string(),
    element: z.string().optional(),
    pageNumber: z.number().int().optional(),
    suggestion: z.string().optional()
  })),
  accessibilityIssues: z.array(z.object({
    type: z.enum(['error', 'warning', 'info']),
    message: z.string(),
    element: z.string().optional(),
    wcagLevel: z.enum(['A', 'AA', 'AAA']).optional()
  })),
  academicIssues: z.array(z.object({
    type: z.enum(['error', 'warning', 'info']),
    message: z.string(),
    element: z.string().optional(),
    category: z.enum(['figures', 'tables', 'citations', 'equations', 'structure']).optional()
  })),
  performanceMetrics: z.object({
    domComplexity: z.number(),
    nestingDepth: z.number(),
    duplicateIds: z.array(z.string()),
    brokenReferences: z.array(z.string())
  }),
  summary: z.object({
    totalIssues: z.number(),
    criticalIssues: z.number(),
    warningIssues: z.number(),
    infoIssues: z.number()
  })
})

export type ValidationConfig = z.infer<typeof validationConfigSchema>
export type ValidationResult = z.infer<typeof validationResultSchema>

type StructuralIssue = {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  pageNumber?: number;
  suggestion?: string;
}

type AccessibilityIssue = {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  wcagLevel?: 'A' | 'AA' | 'AAA';
}

type AcademicIssue = {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
}

// Standard academic HTML tags allowed in fragments
const ACADEMIC_ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'figure', 'figcaption', 'img',
  'blockquote', 'cite', 'q',
  'strong', 'em', 'b', 'i', 'u', 'small', 'mark',
  'sup', 'sub', 'code', 'pre', 'kbd', 'samp', 'var',
  'abbr', 'acronym', 'dfn',
  'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main',
  'a', 'br', 'hr',
  'math', 'mi', 'mo', 'mn', 'mrow', 'msup', 'msub', 'mfrac', 'msqrt', 'mroot',
  'svg', 'path', 'circle', 'rect', 'line', 'polygon', 'text'
]

/**
 * Validate a single HTML fragment
 */
export async function validateHtmlFragment(
  fragment: ProcessedFragment,
  config: Partial<ValidationConfig> = {}
): Promise<ValidationResult> {
  const logger = createRequestLogger('/services/html-fragment-validator', `validation-${Date.now()}`)
  const startTime = Date.now()
  
  try {
    const validatedConfig = validationConfigSchema.parse(config || {})
    
    logger.info('Starting fragment validation', {
      pageNumber: fragment.pageNumber,
      fragmentLength: fragment.htmlFragment.length,
      config: validatedConfig
    })
    
    const dom = new JSDOM(fragment.htmlFragment)
    const document = dom.window.document
    
    const structuralIssues: StructuralIssue[] = []
    const accessibilityIssues: AccessibilityIssue[] = []
    const academicIssues: AcademicIssue[] = []
    
    // Basic structural validation
    validateBasicStructure(document, fragment.pageNumber, structuralIssues, validatedConfig)
    
    // Accessibility validation
    if (validatedConfig.validateAccessibility) {
      validateAccessibility(document, fragment.pageNumber, accessibilityIssues, validatedConfig)
    }
    
    // Academic structure validation
    if (validatedConfig.validateAcademicStructure) {
      validateAcademicStructure(document, fragment.pageNumber, academicIssues, validatedConfig)
    }
    
    // Performance metrics
    const performanceMetrics = calculatePerformanceMetrics(document, fragment.pageNumber)
    
    // Content analysis
    const elementCount = document.querySelectorAll('*').length
    const contentLength = document.body?.textContent?.length || document.documentElement.textContent?.length || 0
    
    // Summary statistics
    const totalIssues = structuralIssues.length + accessibilityIssues.length + academicIssues.length
    const criticalIssues = [...structuralIssues, ...accessibilityIssues, ...academicIssues]
      .filter(issue => issue.type === 'error').length
    const warningIssues = [...structuralIssues, ...accessibilityIssues, ...academicIssues]
      .filter(issue => issue.type === 'warning').length
    const infoIssues = [...structuralIssues, ...accessibilityIssues, ...academicIssues]
      .filter(issue => issue.type === 'info').length
    
    const validationTimeMs = Date.now() - startTime
    const isValid = criticalIssues === 0
    
    logger.info('Fragment validation completed', {
      pageNumber: fragment.pageNumber,
      validationTimeMs,
      isValid,
      totalIssues,
      criticalIssues,
      elementCount,
      contentLength
    })
    
    return validationResultSchema.parse({
      isValid,
      validationTimeMs,
      elementCount,
      contentLength,
      structuralIssues,
      accessibilityIssues,
      academicIssues,
      performanceMetrics,
      summary: {
        totalIssues,
        criticalIssues,
        warningIssues,
        infoIssues
      }
    })
    
  } catch (error) {
    const validationTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
    
    logger.error('Fragment validation failed', {
      pageNumber: fragment.pageNumber,
      validationTimeMs,
      error: errorMessage
    })
    
    return validationResultSchema.parse({
      isValid: false,
      validationTimeMs,
      elementCount: 0,
      contentLength: 0,
      structuralIssues: [{
        type: 'error',
        message: `Validation failed: ${errorMessage}`,
        pageNumber: fragment.pageNumber
      }],
      accessibilityIssues: [],
      academicIssues: [],
      performanceMetrics: {
        domComplexity: 0,
        nestingDepth: 0,
        duplicateIds: [],
        brokenReferences: []
      },
      summary: {
        totalIssues: 1,
        criticalIssues: 1,
        warningIssues: 0,
        infoIssues: 0
      }
    })
  }
}

/**
 * Validate basic HTML structure
 */
function validateBasicStructure(
  document: Document,
  pageNumber: number,
  issues: StructuralIssue[],
  config: ValidationConfig
): void {
  // Check for valid HTML elements
  const allElements = document.querySelectorAll('*')
  const elementCount = allElements.length
  
  if (elementCount > config.maxElementsPerPage) {
    issues.push({
      type: 'warning',
      message: `Page has ${elementCount} elements, exceeding recommended maximum of ${config.maxElementsPerPage}`,
      pageNumber,
      suggestion: 'Consider breaking content into smaller sections'
    })
  }
  
  // Check for invalid/unknown tags if allowedTags is specified
  if (config.allowedTags) {
    const allowedTagsSet = new Set(config.allowedTags.map(tag => tag.toLowerCase()))
    allElements.forEach((element, index) => {
      const tagName = element.tagName.toLowerCase()
      if (!allowedTagsSet.has(tagName)) {
        issues.push({
          type: config.strictMode ? 'error' : 'warning',
          message: `Invalid HTML tag: ${tagName}`,
          element: `${tagName}[${index}]`,
          pageNumber,
          suggestion: 'Use semantic HTML tags appropriate for academic content'
        })
      }
    })
  }
  
  // Check for empty elements
  const emptyElements = Array.from(allElements).filter(el => {
    const hasContent = (el.textContent?.trim().length || 0) > 0
    const hasImages = el.querySelector('img')
    const isSelfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link'].includes(el.tagName.toLowerCase())
    return !hasContent && !hasImages && !isSelfClosing
  })
  
  if (emptyElements.length > 0) {
    issues.push({
      type: 'warning',
      message: `Found ${emptyElements.length} empty elements`,
      pageNumber,
      suggestion: 'Remove empty elements or add meaningful content'
    })
  }
  
  // Check content length
  const textContent = document.body?.textContent?.trim() || document.documentElement.textContent?.trim() || ''
  if (textContent.length < config.minContentLength) {
    issues.push({
      type: textContent.length === 0 ? 'error' : 'warning',
      message: `Insufficient content: ${textContent.length} characters (minimum: ${config.minContentLength})`,
      pageNumber,
      suggestion: 'Ensure all page content was extracted properly'
    })
  }
  
  // Check heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  if (headings.length > 0) {
    const levels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)))
    const maxLevel = Math.max(...levels)
    const minLevel = Math.min(...levels)
    
    if (maxLevel - minLevel > 3) {
      issues.push({
        type: 'warning',
        message: `Heading hierarchy spans ${maxLevel - minLevel + 1} levels (h${minLevel} to h${maxLevel})`,
        pageNumber,
        suggestion: 'Consider flattening heading hierarchy for better readability'
      })
    }
  }
}

/**
 * Validate accessibility compliance
 */
function validateAccessibility(
  document: Document,
  pageNumber: number,
  issues: AccessibilityIssue[],
  _config: ValidationConfig
): void {
  // Check images for alt text
  const images = document.querySelectorAll('img')
  images.forEach((img, index) => {
    if (!img.getAttribute('alt')) {
      issues.push({
        type: 'error',
        message: 'Image missing alt attribute',
        element: `img[${index}]`,
        pageNumber,
        wcagLevel: 'A'
      })
    } else if (img.getAttribute('alt')?.trim() === '') {
      issues.push({
        type: 'warning',
        message: 'Image has empty alt attribute',
        element: `img[${index}]`,
        pageNumber,
        wcagLevel: 'A'
      })
    }
  })
  
  // Check tables for headers
  const tables = document.querySelectorAll('table')
  tables.forEach((table, index) => {
    const hasHeaderRow = table.querySelector('thead, th')
    if (!hasHeaderRow) {
      issues.push({
        type: 'warning',
        message: 'Table missing header row or header cells',
        element: `table[${index}]`,
        pageNumber,
        wcagLevel: 'A'
      })
    }
    
    const hasCaption = table.querySelector('caption')
    if (!hasCaption) {
      issues.push({
        type: 'info',
        message: 'Table missing caption',
        element: `table[${index}]`,
        pageNumber,
        wcagLevel: 'AA'
      })
    }
  })
  
  // Check figures for captions
  const figures = document.querySelectorAll('figure')
  figures.forEach((figure, index) => {
    const hasCaption = figure.querySelector('figcaption')
    if (!hasCaption) {
      issues.push({
        type: 'warning',
        message: 'Figure missing caption',
        element: `figure[${index}]`,
        pageNumber,
        wcagLevel: 'AA'
      })
    }
  })
  
  // Check for proper link text
  const links = document.querySelectorAll('a[href]')
  links.forEach((link, index) => {
    const linkText = link.textContent?.trim()
    if (!linkText || linkText.length < 2) {
      issues.push({
        type: 'error',
        message: 'Link has insufficient or missing text',
        element: `a[${index}]`,
        pageNumber,
        wcagLevel: 'A'
      })
    }
  })
}

/**
 * Validate academic document structure
 */
function validateAcademicStructure(
  document: Document,
  pageNumber: number,
  issues: AcademicIssue[],
  _config: ValidationConfig
): void {
  // Check for proper citation formatting
  const citations = document.querySelectorAll('.citation, cite')
  citations.forEach((cite, index) => {
    const citeText = cite.textContent?.trim()
    if (!citeText || citeText.length < 3) {
      issues.push({
        type: 'warning',
        message: 'Citation element has insufficient content',
        element: `cite[${index}]`,
        pageNumber,
        category: 'citations'
      })
    }
  })
  
  // Check figure numbering consistency
  const figureRefs = document.querySelectorAll('.figure-ref, [class*="figure"]')
  const figureNumbers = new Set<string>()
  figureRefs.forEach((ref, index) => {
    const figText = ref.textContent?.trim()
    const figMatch = figText?.match(/Figure\s+(\d+(?:\.\d+)?)/i)
    if (figMatch && figMatch[1]) {
      const figNum = figMatch[1]
      if (figureNumbers.has(figNum)) {
        issues.push({
          type: 'warning',
          message: `Duplicate figure number: ${figNum}`,
          element: `figure-ref[${index}]`,
          pageNumber,
          category: 'figures'
        })
      }
      figureNumbers.add(figNum)
    }
  })
  
  // Check equation formatting
  const equations = document.querySelectorAll('.equation-number, [class*="equation"]')
  equations.forEach((eq, index) => {
    const eqText = eq.textContent?.trim()
    if (eqText && !eqText.match(/\(\d+(?:\.\d+)?\)/)) {
      issues.push({
        type: 'info',
        message: 'Equation number format may not follow standard conventions',
        element: `equation[${index}]`,
        pageNumber,
        category: 'equations'
      })
    }
  })
  
  // Check table structure
  const tables = document.querySelectorAll('table')
  tables.forEach((table, index) => {
    const rows = table.querySelectorAll('tr')
    const cellCounts = Array.from(rows).map(row => row.querySelectorAll('td, th').length)
    const maxCells = Math.max(...cellCounts)
    const minCells = Math.min(...cellCounts)
    
    if (maxCells !== minCells) {
      issues.push({
        type: 'warning',
        message: `Table has inconsistent row lengths (${minCells}-${maxCells} cells)`,
        element: `table[${index}]`,
        pageNumber,
        category: 'tables'
      })
    }
  })
  
  // Check for academic sections
  const commonSections = ['abstract', 'introduction', 'methodology', 'results', 'conclusion', 'bibliography']
  const foundSections = new Set<string>()
  
  commonSections.forEach(section => {
    const sectionElement = document.querySelector(`.${section}, [class*="${section}"]`)
    if (sectionElement) {
      foundSections.add(section)
    }
  })
  
  if (pageNumber === 1 && foundSections.size === 0) {
    issues.push({
      type: 'info',
      message: 'First page does not contain identifiable academic sections',
      pageNumber,
      category: 'structure'
    })
  }
}

/**
 * Calculate performance and complexity metrics
 */
function calculatePerformanceMetrics(
  document: Document,
  _pageNumber: number
): {
  domComplexity: number
  nestingDepth: number
  duplicateIds: string[]
  brokenReferences: string[]
} {
  const allElements = document.querySelectorAll('*')
  const domComplexity = allElements.length
  
  // Calculate maximum nesting depth
  let maxDepth = 0
  allElements.forEach(element => {
    let depth = 0
    let current = element.parentElement
    while (current) {
      depth++
      current = current.parentElement
    }
    maxDepth = Math.max(maxDepth, depth)
  })
  
  // Find duplicate IDs
  const ids = new Map<string, number>()
  const duplicateIds: string[] = []
  
  allElements.forEach(element => {
    const id = element.getAttribute('id')
    if (id) {
      const count = ids.get(id) || 0
      ids.set(id, count + 1)
      if (count === 1) {
        duplicateIds.push(id)
      }
    }
  })
  
  // Find broken references (links/references to non-existent IDs)
  const brokenReferences: string[] = []
  const existingIds = new Set(Array.from(ids.keys()))
  
  const refs = document.querySelectorAll('[href^="#"], [data-ref]')
  refs.forEach(ref => {
    const href = ref.getAttribute('href')
    const dataRef = ref.getAttribute('data-ref')
    const targetId = href?.substring(1) || dataRef
    
    if (targetId && !existingIds.has(targetId)) {
      brokenReferences.push(targetId)
    }
  })
  
  return {
    domComplexity,
    nestingDepth: maxDepth,
    duplicateIds,
    brokenReferences
  }
}

/**
 * Validate assembled document
 */
export async function validateAssembledDocument(
  assembledDoc: AssembledDocument,
  config: Partial<ValidationConfig> = {}
): Promise<ValidationResult> {
  const logger = createRequestLogger('/services/html-fragment-validator', `validation-${Date.now()}`)
  const startTime = Date.now()
  
  try {
    const validatedConfig = validationConfigSchema.parse(config || {})
    
    logger.info('Starting assembled document validation', {
      documentLength: assembledDoc.htmlDocument.length,
      totalPages: assembledDoc.documentMetadata.totalPages,
      config: validatedConfig
    })
    
    const dom = new JSDOM(assembledDoc.htmlDocument)
    const document = dom.window.document
    
    const structuralIssues: StructuralIssue[] = []
    const accessibilityIssues: AccessibilityIssue[] = []
    const academicIssues: AcademicIssue[] = []
    
    // Validate complete document structure
    validateCompleteDocumentStructure(document, structuralIssues, validatedConfig)
    
    // Cross-page validation
    if (validatedConfig.validateCrossPageElements) {
      validateCrossPageConsistency(document, assembledDoc, structuralIssues)
    }
    
    // Standard validations
    validateBasicStructure(document, 0, structuralIssues, validatedConfig)
    
    if (validatedConfig.validateAccessibility) {
      validateAccessibility(document, 0, accessibilityIssues, validatedConfig)
    }
    
    if (validatedConfig.validateAcademicStructure) {
      validateAcademicStructure(document, 0, academicIssues, validatedConfig)
    }
    
    const performanceMetrics = calculatePerformanceMetrics(document, 0)
    const elementCount = document.querySelectorAll('*').length
    const contentLength = document.body?.textContent?.length || 0
    
    const totalIssues = structuralIssues.length + accessibilityIssues.length + academicIssues.length
    const criticalIssues = [...structuralIssues, ...accessibilityIssues, ...academicIssues]
      .filter(issue => issue.type === 'error').length
    const warningIssues = [...structuralIssues, ...accessibilityIssues, ...academicIssues]
      .filter(issue => issue.type === 'warning').length
    const infoIssues = totalIssues - criticalIssues - warningIssues
    
    const validationTimeMs = Date.now() - startTime
    const isValid = criticalIssues === 0
    
    logger.info('Assembled document validation completed', {
      validationTimeMs,
      isValid,
      totalIssues,
      criticalIssues,
      elementCount,
      contentLength
    })
    
    return validationResultSchema.parse({
      isValid,
      validationTimeMs,
      elementCount,
      contentLength,
      structuralIssues,
      accessibilityIssues,
      academicIssues,
      performanceMetrics,
      summary: {
        totalIssues,
        criticalIssues,
        warningIssues,
        infoIssues
      }
    })
    
  } catch (error) {
    const validationTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
    
    logger.error('Assembled document validation failed', {
      validationTimeMs,
      error: errorMessage
    })
    
    return validationResultSchema.parse({
      isValid: false,
      validationTimeMs,
      elementCount: 0,
      contentLength: 0,
      structuralIssues: [{
        type: 'error',
        message: `Document validation failed: ${errorMessage}`
      }],
      accessibilityIssues: [],
      academicIssues: [],
      performanceMetrics: {
        domComplexity: 0,
        nestingDepth: 0,
        duplicateIds: [],
        brokenReferences: []
      },
      summary: {
        totalIssues: 1,
        criticalIssues: 1,
        warningIssues: 0,
        infoIssues: 0
      }
    })
  }
}

/**
 * Validate complete document structure
 */
function validateCompleteDocumentStructure(
  document: Document,
  issues: StructuralIssue[],
  _config: ValidationConfig
): void {
  // Check for proper HTML5 document structure
  if (!document.doctype) {
    issues.push({
      type: 'error',
      message: 'Document missing DOCTYPE declaration'
    })
  }
  
  if (!document.querySelector('html[lang]')) {
    issues.push({
      type: 'warning',
      message: 'Document missing language declaration'
    })
  }
  
  if (!document.querySelector('head title')) {
    issues.push({
      type: 'warning',
      message: 'Document missing title element'
    })
  }
  
  // Check for semantic structure
  const hasMainContent = document.querySelector('main, [role="main"], body > div, body > section')
  if (!hasMainContent) {
    issues.push({
      type: 'warning',
      message: 'Document lacks clear main content structure'
    })
  }
}

/**
 * Validate cross-page element consistency
 */
function validateCrossPageConsistency(
  document: Document,
  assembledDoc: AssembledDocument,
  issues: StructuralIssue[]
): void {
  // Check for cross-page table continuations
  const tableContinuations = document.querySelectorAll('*:contains("TABLE_CONTINUES")')
  if (tableContinuations.length % 2 !== 0) {
    issues.push({
      type: 'warning',
      message: 'Unmatched table continuation markers found'
    })
  }
  
  // Check for cross-page paragraph continuations
  const paragraphContinuations = document.querySelectorAll('*:contains("PARAGRAPH_CONTINUES")')
  if (paragraphContinuations.length % 2 !== 0) {
    issues.push({
      type: 'warning',
      message: 'Unmatched paragraph continuation markers found'
    })
  }
  
  // Validate cross-page merges from metadata
  assembledDoc.documentMetadata.crossPageMerges.forEach((merge, index) => {
    if (merge.confidence < 0.5) {
      issues.push({
        type: 'warning',
        message: `Low confidence cross-page merge: ${merge.elementType} from page ${merge.sourcePageNumber} to ${merge.targetPageNumber}`,
        element: `cross-page-merge[${index}]`
      })
    }
  })
}

/**
 * Batch validate multiple fragments
 */
export async function validateFragmentsBatch(
  fragments: ProcessedFragment[],
  config: Partial<ValidationConfig> = {}
): Promise<ValidationResult[]> {
  const logger = createRequestLogger('/services/html-fragment-validator', `validation-${Date.now()}`)
  
  logger.info('Starting batch fragment validation', {
    fragmentCount: fragments.length
  })
  
  const results = await Promise.all(
    fragments.map(fragment => validateHtmlFragment(fragment, config))
  )
  
  logger.info('Batch fragment validation completed', {
    fragmentCount: fragments.length,
    validCount: results.filter(r => r.isValid).length
  })
  
  return results
}