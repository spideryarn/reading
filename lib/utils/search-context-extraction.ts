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
  _caseSensitive: boolean = false
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
  
  if (sorted.length === 0) {
    return merged
  }
  
  let current = sorted[0]!
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    if (!next) continue
    
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

/**
 * Generates tooltip content showing the full paragraph with intelligent truncation.
 * 
 * For tooltips, we want to show more context than the snippet - ideally the whole
 * paragraph unless it's extremely long, in which case we truncate intelligently.
 * 
 * @param fullText - The complete text of the element (e.g., full paragraph)
 * @param query - The search query/term 
 * @param maxLength - Maximum length before truncation (default: 500)
 * @param caseSensitive - Whether to perform case-sensitive matching (default: false)
 * @returns Tooltip text content, potentially truncated with ellipsis
 * 
 * @example
 * ```typescript
 * const paragraph = "This is a very long paragraph that discusses fundamental concepts..."
 * const tooltip = generateTooltipContent(paragraph, "fundamental", 200)
 * // Returns full paragraph if under 200 chars, or intelligently truncated version
 * ```
 */
export function generateTooltipContent(
  fullText: string,
  query: string,
  maxLength: number = 500,
  caseSensitive: boolean = false
): string {
  if (!fullText || !query) {
    return ''
  }
  
  // If the full text is short enough, return it as-is
  if (fullText.length <= maxLength) {
    return fullText.trim()
  }
  
  // Find the first match to center the truncation around
  const searchText = caseSensitive ? fullText : fullText.toLowerCase()
  const searchQuery = caseSensitive ? query : query.toLowerCase()
  const matchIndex = searchText.indexOf(searchQuery)
  
  if (matchIndex === -1) {
    // No match found, just truncate from the beginning
    return fullText.substring(0, maxLength - 3).trim() + '...'
  }
  
  // Calculate how much context we can show around the match
  const queryLength = query.length
  const halfMaxLength = Math.floor((maxLength - 20) / 2) // Reserve space for ellipsis
  
  let start = Math.max(0, matchIndex - halfMaxLength)
  let end = Math.min(fullText.length, matchIndex + queryLength + halfMaxLength)
  
  // Adjust to try to end on word boundaries
  if (start > 0) {
    // Find the first word boundary after start
    const wordBoundaryMatch = fullText.substring(start).match(/\s/)
    if (wordBoundaryMatch && wordBoundaryMatch.index !== undefined && wordBoundaryMatch.index < 50) {
      start = start + wordBoundaryMatch.index + 1
    }
  }
  
  if (end < fullText.length) {
    // Find the last word boundary before end
    const beforeEnd = fullText.substring(0, end)
    const lastSpaceIndex = beforeEnd.lastIndexOf(' ')
    if (lastSpaceIndex > end - 50) {
      end = lastSpaceIndex
    }
  }
  
  let result = fullText.substring(start, end).trim()
  
  // Add ellipsis if we truncated
  if (start > 0) {
    result = '...' + result
  }
  if (end < fullText.length) {
    result = result + '...'
  }
  
  return result
}