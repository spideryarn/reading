import { load } from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import TurndownService from 'turndown'
import type { DocumentElement } from '@/lib/types/document'
import { assignDeterministicIds, getBodyWithIds } from './deterministicId'

export class DocumentParser {
  // Define inline elements that should be kept within their parent's text content
  // Based on HTML5 phrasing content and default CSS display values
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements
  private static INLINE_ELEMENTS = new Set([
    // Text-level semantic elements
    'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn',
    'em', 'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp',
    'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
    // Form elements (inline by default)
    'button', 'input', 'label', 'meter', 'output', 'progress', 'select', 'textarea',
    // Media elements (inline-block by default, but should be kept inline for text extraction)
    'audio', 'canvas', 'embed', 'iframe', 'img', 'map', 'object', 'picture', 'svg', 'video',
    // Deprecated but still encountered
    'acronym', 'big', 'font', 'strike', 'tt',
    // Script elements (included to skip them, handled separately)
    'script', 'noscript', 'style',
    // Other inline elements
    'slot', 'template'
  ])

  // Create a single TurndownService instance for performance
  private turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
  })

  /**
   * Converts HTML to Markdown format for better structured text processing.
   * 
   * @param html - Raw HTML string
   * @returns Markdown-formatted text with preserved structure
   * 
   * @example
   * // Before:
   * `<h1>Title</h1><p>First paragraph with <strong>bold text</strong>.</p><p>Second paragraph.</p>`
   * 
   * // After:
   * `# Title\n\nFirst paragraph with **bold text**.\n\nSecond paragraph.`
   */
  convertToMarkdown(html: string): string {
    return this.turndownService.turndown(html)
  }

  parse(html: string, documentId: string): DocumentElement[] {
    // First, assign deterministic IDs to all elements
    const htmlWithIds = assignDeterministicIds(html)
    const $ = load(htmlWithIds)
    const elements: DocumentElement[] = []
    let position = 0

    const processElement = (
      element: any,
      parentId: string | null,
      level: number
    ) => {
      const $el = $(element)
      const tagName = element.name || 'text'
      
      if (tagName === 'script' || tagName === 'style') {
        return
      }

      // Use the deterministic ID if present, otherwise generate a UUID
      const id = $el.attr('id') || uuidv4()
      const attributes: Record<string, string> = {}
      
      if (element.attribs) {
        Object.entries(element.attribs).forEach(([key, value]) => {
          // Skip the ID attribute since we're using it as the element ID
          if (key !== 'id') {
            attributes[key] = value as string
          }
        })
      }

      // For block elements, extract content while preserving inline formatting
      let textContent = ''
      if (tagName === 'text' || DocumentParser.INLINE_ELEMENTS.has(tagName)) {
        // For inline elements or text nodes, just get direct text
        textContent = $el.contents()
          .filter(function() {
            return this.type === 'text'
          })
          .text()
          .trim()
      } else {
        // For block elements, get HTML content and convert to Markdown to preserve formatting
        // Get the inner HTML of the element
        const innerHtml = $el.html() || ''
        
        // Convert to Markdown, which preserves emphasis and other formatting
        textContent = this.turndownService.turndown(innerHtml).trim()
      }

      // Only get block-level children (skip inline elements as they're included in text)
      const blockChildren = $el.children().filter((_, child) => {
        return !DocumentParser.INLINE_ELEMENTS.has(child.name)
      })

      if (textContent || blockChildren.length > 0) {
        elements.push({
          id,
          document_id: documentId,
          parent_id: parentId,
          tag_name: tagName,
          content: textContent,
          attributes,
          position: position++,
          level,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        // Only process block-level children as separate elements
        blockChildren.each((_, child) => {
          processElement(child, id, level + 1)
        })
      }
    }

    $('body').children().each((_, element) => {
      processElement(element, null, 0)
    })

    return elements
  }
}