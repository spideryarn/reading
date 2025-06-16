// Mozilla Readability extraction utility
// Provides fast, reliable article extraction from HTML content
// Used as an alternative to LLM-based extraction for better speed and accuracy

import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

/**
 * Extract main article content from HTML using Mozilla Readability
 * @param html - Raw HTML content
 * @param url - Source URL for better extraction context (can be filename for uploaded files)
 * @returns Extracted article content or null if extraction fails
 */
export function extractWithReadability(html: string, url: string): {
  title: string
  content: string
  textContent: string
  excerpt: string
  byline: string | null
  siteName: string | null
} | null {
  try {
    // JSDOM requires a valid URL, so if we get a filename or invalid URL,
    // we create a mock URL for local file processing
    let validUrl: string
    try {
      // Test if the provided url is valid
      new URL(url)
      validUrl = url
    } catch {
      // If not a valid URL (e.g., filename), create a mock local URL
      validUrl = `file://localhost/${url}`
    }
    
    // Create a DOM from the HTML
    const dom = new JSDOM(html, {
      url: validUrl,
      // Disable script execution for security
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    })
    
    // Use Readability to parse the article
    const reader = new Readability(dom.window.document, {
      // Log errors to console for debugging
      debug: false,
      // Maximum number of elements to parse
      maxElemsToParse: 0, // 0 means no limit
      // Number of top candidates to consider
      nbTopCandidates: 5,
      // Minimum score required for content to be considered
      charThreshold: 500,
    })
    
    const article = reader.parse()
    
    // Clean up DOM to free memory
    dom.window.close()
    
    if (!article) {
      return null
    }
    
    // Convert Readability's content to clean HTML
    // Readability returns content as HTML string
    return {
      title: article.title || '',
      content: article.content, // This is already HTML
      textContent: article.textContent || '',
      excerpt: article.excerpt || '',
      byline: article.byline,
      siteName: article.siteName,
    }
  } catch (error) {
    console.error('Readability extraction error:', error)
    return null
  }
}

/**
 * Clean and format HTML content from Readability output
 * Ensures consistent structure and removes unnecessary elements
 */
export function formatReadabilityHtml(
  article: NonNullable<ReturnType<typeof extractWithReadability>>
): string {
  // Create a complete HTML document with the extracted content
  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(article.title)}</title>
</head>
<body>
    ${article.byline ? `<p class="byline">By ${escapeHtml(article.byline)}</p>` : ''}
    <h1>${escapeHtml(article.title)}</h1>
    ${article.content}
</body>
</html>`
  
  return html
}

/**
 * Simple HTML escaping for text content
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}