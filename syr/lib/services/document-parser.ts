import { load } from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import TurndownService from 'turndown'
import type { DocumentElement } from '@/lib/types/document'
import { assignDeterministicIds, getBodyWithIds } from './deterministicId'

export class DocumentParser {
  // Define inline elements that should be kept within their parent's text content
  private static INLINE_ELEMENTS = new Set([
    'a', 'abbr', 'acronym', 'b', 'bdo', 'big', 'br', 'button', 'cite', 'code',
    'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map', 'object', 'q',
    'samp', 'script', 'select', 'small', 'span', 'strong', 'sub', 'sup',
    'textarea', 'tt', 'u', 'var'
  ])

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
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced'
    })
    
    return turndownService.turndown(html)
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

      // For block elements, extract all text content including inline elements
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
        // For block elements, get all text including from inline children
        textContent = $el.text().trim()
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