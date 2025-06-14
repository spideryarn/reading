/**
 * HTML Prettification Utility for Academic Content
 * 
 * Provides consistent HTML formatting using js-beautify with academic-focused configuration.
 * Designed specifically for post-sanitization prettification of scholarly content.
 * 
 * Key Academic Content Considerations:
 * - Mathematical notation (MathML) requires precise whitespace preservation
 * - Code blocks must maintain exact indentation
 * - Citations depend on specific inline spacing
 * - Publisher-specific markup needs compatibility (arXiv, IEEE, PubMed)
 */

import { html as beautifyHtml } from 'js-beautify'

/**
 * Academic-focused js-beautify configuration
 * 
 * Based on research findings documented in planning/250614b_html_prettification_post_sanitization.md:
 * - Preserves whitespace-sensitive elements critical for academic content
 * - Avoids line wrapping that could break inline citations
 * - Protects mathematical notation from indentation changes
 * - Maintains code block formatting integrity
 */
const ACADEMIC_PRETTIFICATION_CONFIG = {
  // Indentation settings for readable, consistent structure
  indent_size: 2,                    // Consistent, readable indentation
  indent_char: ' ',                  // Spaces over tabs for consistency
  indent_with_tabs: false,
  
  // Whitespace preservation (critical for academic content)
  preserve_newlines: true,           // Maintain author's line break intent
  max_preserve_newlines: 2,          // Limit excessive blank lines
  wrap_line_length: 0,               // No line wrapping to avoid breaking inline elements
  
  // Academic content preservation - DO NOT FORMAT these elements
  content_unformatted: [
    // Core whitespace-sensitive elements
    'pre', 'code', 'math',
    'script', 'style',
    
    // MathML notation elements (require exact spacing)
    'mi', 'mo', 'mn', 'mrow', 'mfrac', 'msub', 'msup', 'msubsup',
    'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd',
    'semantics', 'annotation', 'annotation-xml',
    
    // Citation and reference elements (spacing-sensitive)
    'cite', 'var', 'kbd', 'samp'
  ],
  
  // Inline elements that should not be reformatted
  inline: [
    'a', 'abbr', 'acronym', 'b', 'bdi', 'bdo', 'big', 'br', 'button',
    'cite', 'code', 'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label',
    'map', 'mark', 'meter', 'noscript', 'object', 'output', 'progress',
    'q', 'ruby', 's', 'samp', 'script', 'select', 'small', 'span',
    'strong', 'sub', 'sup', 'textarea', 'time', 'tt', 'u', 'var',
    'wbr', 'text',
    // MathML inline elements
    'mi', 'mn', 'mo', 'ms', 'mtext'
  ],
  
  // Additional formatting controls
  unformatted: [],                   // Use content_unformatted instead
  indent_inner_html: false,          // Avoid extra indentation of html/body
  indent_body_inner_html: true,      // But do indent body contents
  indent_head_inner_html: true,      // Indent head contents for readability
  
  // Block-level elements (allow formatting)
  extra_liners: ['head', 'body', 'html'],
  
  // Void elements (self-closing tags)
  void_elements: [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]
}

/**
 * Prettifies HTML content with academic-focused formatting
 * 
 * @param htmlContent - Sanitized HTML content to prettify
 * @returns Prettified HTML with consistent formatting
 * @throws Error if prettification fails
 * 
 * @example
 * ```typescript
 * const uglyHtml = '<p><cite>Smith et al.</cite>shows<math><mi>x</mi></math>equals<code>result</code></p>'
 * const prettyHtml = prettifyAcademicHtml(uglyHtml)
 * // Result: Properly indented with preserved citation spacing and math/code content
 * ```
 */
export function prettifyAcademicHtml(htmlContent: string): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    throw new Error('Invalid HTML content: must be a non-empty string')
  }
  
  try {
    const prettifiedHtml = beautifyHtml(htmlContent, ACADEMIC_PRETTIFICATION_CONFIG)
    
    // Validate that prettification didn't corrupt the content
    if (!prettifiedHtml || prettifiedHtml.length === 0) {
      throw new Error('Prettification resulted in empty content')
    }
    
    return prettifiedHtml
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during prettification'
    throw new Error(`HTML prettification failed: ${errorMessage}`)
  }
}

/**
 * Safely prettifies HTML with fallback to original content
 * 
 * @param htmlContent - Sanitized HTML content to prettify
 * @param logger - Optional logger for error reporting
 * @param correlationId - Optional correlation ID for logging
 * @returns Prettified HTML on success, original HTML on failure
 * 
 * @example
 * ```typescript
 * const result = prettifyAcademicHtmlSafe(htmlContent, logger, 'req-123')
 * // Always returns valid HTML, logs errors without throwing
 * ```
 */
export function prettifyAcademicHtmlSafe(
  htmlContent: string,
  logger?: { warn: (data: any, message: string) => void },
  correlationId?: string
): string {
  try {
    return prettifyAcademicHtml(htmlContent)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown prettification error'
    
    if (logger) {
      logger.warn({
        step: 'prettification-failed',
        error: errorMessage,
        correlationId,
        contentLength: htmlContent.length,
        fallbackToOriginal: true
      }, 'HTML prettification failed, using original content')
    }
    
    // Return original content as fallback
    return htmlContent
  }
}

/**
 * Gets the current prettification configuration
 * 
 * @returns Copy of the academic prettification configuration
 */
export function getAcademicPrettificationConfig() {
  return { ...ACADEMIC_PRETTIFICATION_CONFIG }
}

/**
 * Validates if content appears to be academic (contains academic markers)
 * 
 * @param htmlContent - HTML content to analyze
 * @returns True if content contains academic markers
 */
export function isAcademicContent(htmlContent: string): boolean {
  const academicMarkers = [
    /<math/i,                 // Mathematical notation
    /<cite/i,                 // Citations
    /<code/i,                 // Code blocks
    /<pre/i,                  // Preformatted content
    /arXiv/i,                 // arXiv papers
    /doi:/i,                  // DOI identifiers
    /et al\./i,               // Academic citations
    /@article|@inproceedings|@book/i  // BibTeX patterns
  ]
  
  return academicMarkers.some(pattern => pattern.test(htmlContent))
}