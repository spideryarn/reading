import { z } from 'zod'
import { loadPromptTemplateFromCaller } from '@/lib/prompts/types'
import { JSDOM } from 'jsdom'

// Schema for assembly issues that need addressing
export const assemblyIssueSchema = z.object({
  type: z.enum(['error', 'warning', 'info']),
  message: z.string(),
  suggestion: z.string().optional(),
  pageNumber: z.number().optional(),
  element: z.string().optional()
})

// Schema for document metadata from assembly stage
export const documentMetadataSchema = z.object({
  totalPages: z.number().int().min(1),
  successfulPages: z.number().int().min(0),
  crossPageMerges: z.array(z.object({
    elementType: z.enum(['table', 'paragraph', 'list', 'section', 'figure']),
    sourcePageNumber: z.number().int(),
    targetPageNumber: z.number().int(),
    confidence: z.number().min(0).max(1)
  })),
  totalElements: z.number().int().min(0),
  documentStructure: z.object({
    headingCount: z.number().int().min(0),
    paragraphCount: z.number().int().min(0),
    tableCount: z.number().int().min(0),
    figureCount: z.number().int().min(0),
    listCount: z.number().int().min(0)
  })
})

// Schema for final document refinement input
export const finalDocumentRefinementInputSchema = z.object({
  htmlDocument: z.string().min(1).describe('Complete assembled HTML document for refinement'),
  fileName: z.string().optional().describe('Original document filename for context'),
  totalPages: z.number().int().min(1).describe('Total number of pages in original document'),
  documentMetadata: documentMetadataSchema.optional().describe('Metadata from document assembly stage'),
  assemblyIssues: z.array(assemblyIssueSchema).default([]).describe('Known issues from assembly that need addressing')
})

// Schema for individual edit operations
export const editOperationSchema = z.object({
  type: z.literal('replace').describe('Type of edit operation (currently only replace is supported)'),
  description: z.string().describe('Human-readable description of what this edit accomplishes'),
  old_text: z.string().min(1).describe('Exact text to find and replace - must be unique in document'),
  new_text: z.string().describe('Replacement text (can be empty for deletions)')
})

// Schema for quality assessment
export const qualityAssessmentSchema = z.object({
  overall_quality: z.enum(['needs_improvement', 'good', 'excellent']).describe('Overall document quality assessment'),
  structural_issues_fixed: z.number().int().min(0).describe('Number of structural HTML issues fixed'),
  cross_page_issues_fixed: z.number().int().min(0).describe('Number of cross-page element issues fixed'),
  academic_improvements: z.number().int().min(0).describe('Number of academic content improvements made'),
  critical_errors: z.number().int().min(0).describe('Number of critical errors that must be addressed'),
  remaining_concerns: z.array(z.string()).describe('Brief descriptions of any remaining quality concerns')
})

// Schema for rewrite recommendation
export const rewriteRecommendationSchema = z.object({
  should_rewrite: z.boolean().describe('Whether complete document rewrite is recommended'),
  reason: z.string().describe('Explanation for the rewrite recommendation')
})

// Schema for the expected JSON output from final refinement
export const finalDocumentRefinementOutputSchema = z.object({
  edit_operations: z.array(editOperationSchema).describe('Array of targeted edit operations to apply'),
  quality_assessment: qualityAssessmentSchema.describe('Assessment of document quality and improvements'),
  rewrite_recommendation: rewriteRecommendationSchema.describe('Recommendation on whether complete rewrite is needed')
})

// Type exports for use in services
export type AssemblyIssue = z.infer<typeof assemblyIssueSchema>
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>
export type FinalDocumentRefinementInput = z.infer<typeof finalDocumentRefinementInputSchema>
export type EditOperation = z.infer<typeof editOperationSchema>
export type QualityAssessment = z.infer<typeof qualityAssessmentSchema>
export type RewriteRecommendation = z.infer<typeof rewriteRecommendationSchema>
export type FinalDocumentRefinementOutput = z.infer<typeof finalDocumentRefinementOutputSchema>

// Create final document refinement prompt template with Claude Sonnet 4
export function createFinalDocumentRefinementPrompt() {
  return loadPromptTemplateFromCaller(
    'final-document-refinement.njk',
    finalDocumentRefinementInputSchema,
    {
      modelString: 'anthropic:claude-sonnet-4:20250514', // Use Claude Sonnet 4 for highest quality
      temperature: 0.1, // Low temperature for consistent, focused editing
      maxTokens: 64000, // High limit for complex documents and detailed edit operations
    }
  )
}

// Default export
export const finalDocumentRefinementPrompt = createFinalDocumentRefinementPrompt()

// Helper function to validate edit operations before applying them
export function validateEditOperations(
  editOperations: EditOperation[], 
  htmlDocument: string
): { valid: EditOperation[], invalid: { operation: EditOperation, reason: string }[] } {
  const valid: EditOperation[] = []
  const invalid: { operation: EditOperation, reason: string }[] = []
  
  // Parse HTML to search text content properly
  const dom = new JSDOM(htmlDocument)
  const body = dom.window.document.body
  if (!body) {
    throw new Error('Failed to validate edit operations: No <body> element found in HTML document')
  }
  const textContent = body.textContent || ''
  
  for (const operation of editOperations) {
    // Check if old_text exists in the document's text content
    const matchCount = countOccurrences(textContent, operation.old_text)
    
    if (matchCount === 0) {
      invalid.push({
        operation,
        reason: 'old_text not found in document'
      })
    } else if (matchCount > 1) {
      invalid.push({
        operation,
        reason: `old_text matches ${matchCount} times - not unique enough`
      })
    } else {
      valid.push(operation)
    }
  }
  
  return { valid, invalid }
}

// Helper function to count occurrences of a substring
function countOccurrences(text: string, searchString: string): number {
  if (!searchString) return 0
  let count = 0
  let position = 0
  while ((position = text.indexOf(searchString, position)) !== -1) {
    count++
    position += searchString.length
  }
  return count
}


// Helper function to apply validated edit operations
export function applyEditOperations(htmlDocument: string, editOperations: EditOperation[]): string {
  // Parse HTML to perform text replacements properly
  const dom = new JSDOM(htmlDocument)
  const document = dom.window.document
  
  if (!document.body && !document.documentElement) {
    throw new Error('Failed to apply edit operations: Invalid HTML document structure')
  }
  
  // Apply operations in sequence
  for (const operation of editOperations) {
    if (operation.type === 'replace') {
      // Walk through all text nodes and replace text
      replaceTextInDocument(document, operation.old_text, operation.new_text)
    }
  }
  
  return dom.serialize()
}

// Helper function to replace text in all text nodes of a document
function replaceTextInDocument(document: Document, oldText: string, newText: string): void {
  const walker = document.createTreeWalker(
    document.body || document.documentElement,
    NodeFilter.SHOW_TEXT,
    null
  )
  
  const textNodes: Text[] = []
  let node: Node | null
  
  // Collect all text nodes first to avoid modifying while iterating
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text)
  }
  
  // Replace text in each text node
  for (const textNode of textNodes) {
    if (textNode.nodeValue && textNode.nodeValue.includes(oldText)) {
      textNode.nodeValue = textNode.nodeValue.replace(oldText, newText)
    }
  }
}