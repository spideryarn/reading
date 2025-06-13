/**
 * Search Context Extraction Utility
 * 
 * Provides intelligent context extraction around search matches to generate
 * meaningful snippets that show the actual search terms in context.
 */

/**
 * Extracts contextual text around a search match within a larger text string.
 * 
 * This function finds the actual match position and extracts surrounding context
 * with intelligent word boundary handling and ellipsis placement.
 * 
 * @param text - The full text to search within
 * @param query - The search query/term to find
 * @param matchIndex - The character index where the match starts in the text
 * @param contextChars - Number of characters to include before and after the match (default: 50)
 * @param caseSensitive - Whether to perform case-sensitive matching (default: false)
 * @returns Contextual snippet with ellipsis if truncated
 * 
 * @example
 * ```typescript
 * const text = "This is a long document with many words and concepts. The fundamental principle here is important."
 * const context = extractMatchContext(text, "fundamental", 63, 30)
 * // Returns: "...words and concepts. The fundamental principle here is..."
 * ```
 */
export function extractMatchContext(
  text: string, 
  query: string, 
  matchIndex: number, 
  contextChars: number = 50,
  caseSensitive: boolean = false
): string {
  // Handle empty or invalid input
  if (!text || !query || matchIndex < 0) {
    return ''
  }
  
  // Ensure match index is within text bounds
  if (matchIndex >= text.length) {
    return ''
  }
  
  // Calculate context boundaries
  const queryLength = query.length
  const start = Math.max(0, matchIndex - contextChars)
  const end = Math.min(text.length, matchIndex + queryLength + contextChars)
  
  // Extract the raw context
  let context = text.substring(start, end)
  
  // Smart word boundary handling - try to start and end on word boundaries
  // if we're not at the absolute start/end of the text
  if (start > 0) {
    // Find the first word boundary after the start position
    const wordBoundaryMatch = context.match(/\s/)
    if (wordBoundaryMatch && wordBoundaryMatch.index !== undefined && wordBoundaryMatch.index < contextChars / 2) {
      // Only trim if the word boundary is reasonably close to the start
      context = context.substring(wordBoundaryMatch.index + 1)
    }
    // Add ellipsis since we're truncating from the start
    context = '...' + context
  }
  
  if (end < text.length) {
    // Find the last word boundary before the end position
    const reversedContext = context.split('').reverse().join('')
    const wordBoundaryMatch = reversedContext.match(/\s/)
    if (wordBoundaryMatch && wordBoundaryMatch.index !== undefined && wordBoundaryMatch.index < contextChars / 2) {
      // Only trim if the word boundary is reasonably close to the end
      const trimPosition = context.length - wordBoundaryMatch.index - 1
      context = context.substring(0, trimPosition)
    }
    // Add ellipsis since we're truncating from the end
    context = context + '...'
  }
  
  return context.trim()
}

/**
 * Finds all match positions for a query within a text string.
 * 
 * @param text - The text to search within
 * @param query - The search query/term to find
 * @param caseSensitive - Whether to perform case-sensitive matching (default: false)
 * @returns Array of match start positions
 * 
 * @example
 * ```typescript
 * const text = "The cat sat on the mat. The cat was happy."
 * const positions = findAllMatchPositions(text, "cat")
 * // Returns: [4, 28] (positions where "cat" appears)
 * ```
 */
export function findAllMatchPositions(
  text: string, 
  query: string, 
  caseSensitive: boolean = false
): number[] {
  if (!text || !query) {
    return []
  }
  
  const searchText = caseSensitive ? text : text.toLowerCase()
  const searchQuery = caseSensitive ? query : query.toLowerCase()
  const positions: number[] = []
  
  let index = 0
  while (index < searchText.length) {
    const matchIndex = searchText.indexOf(searchQuery, index)
    if (matchIndex === -1) {
      break
    }
    positions.push(matchIndex)
    index = matchIndex + 1 // Move past this match to find overlapping matches
  }
  
  return positions
}

/**
 * Extracts multiple context snippets for all matches of a query within text.
 * 
 * @param text - The text to search within
 * @param query - The search query/term to find
 * @param contextChars - Number of characters to include before and after each match (default: 50) 
 * @param caseSensitive - Whether to perform case-sensitive matching (default: false)
 * @returns Array of context objects with text and match position
 * 
 * @example
 * ```typescript
 * const text = "The cat sat on the mat. The cat was happy."
 * const contexts = extractAllMatchContexts(text, "cat", 10)
 * // Returns: [
 * //   { text: "The cat sat on...", matchIndex: 4 },
 * //   { text: "...mat. The cat was happy.", matchIndex: 28 }
 * // ]
 * ```
 */
export function extractAllMatchContexts(
  text: string,
  query: string,
  contextChars: number = 50,
  caseSensitive: boolean = false
): Array<{ text: string; matchIndex: number }> {
  const positions = findAllMatchPositions(text, query, caseSensitive)
  
  return positions.map(matchIndex => ({
    text: extractMatchContext(text, query, matchIndex, contextChars, caseSensitive),
    matchIndex
  }))
}

/**
 * Merges overlapping context snippets to avoid duplicate content.
 * 
 * @param contexts - Array of context objects to merge
 * @param query - The search query (used to calculate overlap)
 * @returns Array of merged context objects
 */
export function mergeOverlappingContexts(
  contexts: Array<{ text: string; matchIndex: number }>,
  query: string
): Array<{ text: string; matchIndex: number }> {
  if (contexts.length <= 1) {
    return contexts
  }
  
  // Sort by match index
  const sorted = [...contexts].sort((a, b) => a.matchIndex - b.matchIndex)
  const merged: Array<{ text: string; matchIndex: number }> = []
  
  let current = sorted[0]
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    
    // Check if contexts overlap significantly
    // This is a simple heuristic - in practice, could be more sophisticated
    const gap = next.matchIndex - (current.matchIndex + query.length)
    
    if (gap < 100) { // If matches are close together, merge them
      // Create a merged context (simplified approach)
      current = {
        text: current.text + ' ... ' + next.text,
        matchIndex: current.matchIndex
      }
    } else {
      merged.push(current)
      current = next
    }
  }
  
  merged.push(current)
  return merged
}