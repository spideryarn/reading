/**
 * Semantic Search Document Formatter
 * 
 * Converts DocumentElement arrays to annotated text format for LLM semantic analysis.
 * The annotated format preserves element ID mapping while providing clean text content
 * for semantic understanding.
 */

import type { DocumentElement } from '@/lib/types/document'

/**
 * Convert document elements to annotated format for semantic search.
 * 
 * Format: [element_id] text_content
 * 
 * @param elements - Array of DocumentElement objects sorted by position
 * @returns Annotated text string with one line per element
 * 
 * @example
 * Input: [
 *   { id: 'elem_h1_1', content: 'Introduction to Quantum Physics', tag_name: 'h1', ... },
 *   { id: 'elem_p_2', content: 'Quantum mechanics describes...', tag_name: 'p', ... }
 * ]
 * 
 * Output:
 * "[elem_h1_1] Introduction to Quantum Physics\n[elem_p_2] Quantum mechanics describes..."
 */
export function formatDocumentForSemanticSearch(elements: DocumentElement[]): string {
  // Filter out elements with no meaningful content
  const meaningfulElements = elements.filter(element => {
    const content = element.content?.trim()
    return content && content.length > 0
  })

  // Sort by position to maintain document order
  const sortedElements = meaningfulElements.sort((a, b) => a.position - b.position)

  // Convert to annotated format
  const annotatedLines = sortedElements.map(element => {
    const cleanContent = element.content.trim()
    return `[${element.id}] ${cleanContent}`
  })

  return annotatedLines.join('\n')
}

/**
 * Parse element IDs from semantic search LLM response to ensure they exist in the document.
 * 
 * @param elements - Original document elements array
 * @param llmElementIds - Element IDs returned by the LLM
 * @returns Array of validated element IDs that exist in the document
 */
export function validateSemanticSearchElementIds(
  elements: DocumentElement[], 
  llmElementIds: string[]
): string[] {
  const validElementIds = new Set(elements.map(el => el.id))
  
  return llmElementIds.filter(id => {
    const isValid = validElementIds.has(id)
    if (!isValid) {
      console.warn(`[SemanticSearch] LLM returned invalid element ID: ${id}`)
    }
    return isValid
  })
}

/**
 * Get document statistics for debugging and monitoring.
 * 
 * @param elements - Array of DocumentElement objects
 * @returns Statistics about the document structure
 */
export function getDocumentStats(elements: DocumentElement[]) {
  const meaningfulElements = elements.filter(el => el.content?.trim())
  const totalCharacters = meaningfulElements.reduce((sum, el) => sum + el.content.length, 0)
  
  const tagCounts = meaningfulElements.reduce((counts, el) => {
    counts[el.tag_name] = (counts[el.tag_name] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  return {
    totalElements: elements.length,
    meaningfulElements: meaningfulElements.length,
    totalCharacters,
    averageCharactersPerElement: Math.round(totalCharacters / meaningfulElements.length) || 0,
    tagDistribution: tagCounts
  }
}

/**
 * Estimate token count for LLM input (rough approximation).
 * Uses the common approximation of ~4 characters per token for English text.
 * 
 * @param annotatedContent - The formatted document content
 * @param query - The search query
 * @returns Estimated token count
 */
export function estimateTokenCount(annotatedContent: string, query: string): number {
  const CHARS_PER_TOKEN = 4 // Rough approximation for English
  const templateOverhead = 500 // Estimated tokens for prompt template structure
  
  const contentTokens = Math.ceil(annotatedContent.length / CHARS_PER_TOKEN)
  const queryTokens = Math.ceil(query.length / CHARS_PER_TOKEN)
  
  return contentTokens + queryTokens + templateOverhead
}