/**
 * Unified markdown processing pipeline for HTML string output.
 * 
 * This utility provides a proper unified/remark/rehype pipeline for converting
 * markdown to HTML, replacing the fragile regex-based implementations.
 * 
 * Features:
 * - GitHub Flavored Markdown support via remark-gfm
 * - XSS protection through proper HTML sanitization
 * - Robust parsing that handles edge cases
 * - TypeScript type safety
 * 
 * Used for tooltips, dynamic content injection, and programmatic HTML generation.
 * For React components, prefer using MarkdownTextPrimitive from @assistant-ui/react-markdown.
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

// Create a reusable processor instance for performance
const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, {
    // Security: don't allow raw HTML in markdown
    allowDangerousHtml: false
  })
  .use(rehypeStringify)

/**
 * Convert markdown content to HTML string.
 * 
 * @param content - The markdown content to convert
 * @returns HTML string, empty string for null/undefined/empty input
 * 
 * @example
 * ```typescript
 * const html = markdownToHtml('**Bold** and *italic* text')
 * // Returns: '<p><strong>Bold</strong> and <em>italic</em> text</p>'
 * ```
 */
export function markdownToHtml(content: string): string {
  // Handle edge cases
  if (!content || typeof content !== 'string') {
    return ''
  }
  
  // Trim whitespace to avoid unnecessary paragraph wrapping
  const trimmedContent = content.trim()
  if (!trimmedContent) {
    return ''
  }
  
  try {
    // Process the markdown through the unified pipeline
    const result = markdownProcessor.processSync(trimmedContent)
    return String(result)
  } catch (error) {
    // Graceful fallback: return original content as escaped HTML if processing fails
    console.warn('Markdown processing failed, falling back to plain text:', error)
    return escapeHtml(trimmedContent)
  }
}

/**
 * Simple HTML escaping for fallback scenarios.
 * Used when markdown processing fails.
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  }
  
  return text.replace(/[&<>"']/g, (match) => htmlEscapes[match] || match)
}