/**
 * HTML Text Extraction Utility
 * 
 * Provides robust HTML text extraction using DOM parsing instead of regex.
 * This ensures proper handling of nested tags, special characters, and edge cases.
 */

/**
 * Extracts clean, readable text from HTML content using DOM parsing.
 * 
 * This function safely converts HTML content to plain text by:
 * - Using DOMParser for proper HTML parsing (no regex vulnerabilities)
 * - Extracting textContent which handles nested tags correctly
 * - Normalizing and trimming whitespace consistently
 * - Handling server-side rendering gracefully
 * - Managing edge cases (empty, null, malformed HTML)
 * 
 * @param htmlContent - The HTML string to extract text from
 * @returns Clean, normalized plain text with excess whitespace removed
 * 
 * @example
 * ```typescript
 * const html = '<p>The <strong>important</strong> text</p>'
 * const text = extractCleanText(html) // Returns: "The important text"
 * 
 * const complex = '<div><h1>Title</h1><p>Para 1</p><p>Para 2</p></div>'
 * const text2 = extractCleanText(complex) // Returns: "Title Para 1 Para 2"
 * ```
 */
export function extractCleanText(htmlContent: string): string {
  // Handle empty or null input
  if (!htmlContent || typeof htmlContent !== 'string') {
    return ''
  }
  
  // Early return for strings that don't contain HTML tags
  if (!htmlContent.includes('<')) {
    return htmlContent.replace(/\s+/g, ' ').trim()
  }
  
  try {
    // Check if we're in a browser environment (DOMParser available)
    if (typeof DOMParser !== 'undefined') {
      // Browser environment - use DOMParser
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlContent, 'text/html')
      
      // Check for parser errors (malformed HTML)
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        // Fallback to regex if HTML is severely malformed
        console.warn('[extractCleanText] Malformed HTML detected, falling back to regex')
        return fallbackRegexExtraction(htmlContent)
      }
      
      // Remove script and style elements before extracting text
      const scripts = doc.querySelectorAll('script, style')
      scripts.forEach(element => element.remove())
      
      // Extract text content
      const textContent = doc.body ? doc.body.textContent || '' : ''
      
      // Normalize whitespace and trim
      return textContent.replace(/\s+/g, ' ').trim()
      
    } else {
      // Server-side environment or environments without DOMParser
      // Use regex fallback since jsdom causes bundle issues in client-side code
      console.warn('[extractCleanText] DOMParser not available, falling back to regex')
      return fallbackRegexExtraction(htmlContent)
    }
    
  } catch (error) {
    // DOM parsing failed - fallback to regex
    console.warn('[extractCleanText] DOM parsing failed, falling back to regex:', error)
    return fallbackRegexExtraction(htmlContent)
  }
}

/**
 * Fallback regex-based HTML tag removal.
 * Used when DOM parsing is not available or fails.
 * 
 * @param htmlContent - The HTML string to process
 * @returns Text with HTML tags removed using regex
 * @internal
 */
function fallbackRegexExtraction(htmlContent: string): string {
  // Enhanced regex fallback that handles common problematic tags
  return htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove style tags and content
    .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim()                  // Remove leading/trailing whitespace
}

/**
 * Type guard to check if text extraction is using DOM parsing or regex fallback.
 * Useful for testing and debugging.
 * 
 * @returns True if DOM parsing is available, false if using regex fallback
 */
export function isDOMParsingAvailable(): boolean {
  return typeof DOMParser !== 'undefined'
}