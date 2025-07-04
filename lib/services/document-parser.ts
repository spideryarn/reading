import { load } from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import type { Element } from 'domhandler'
import type { DocumentElement } from '@/lib/types/document'
import { assignDeterministicIds } from './deterministicId'

export class DocumentParser {
  // Define inline elements that should be kept within their parent's text content
  // Based on HTML5 phrasing content and default CSS display values
  // Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements
  public static INLINE_ELEMENTS = new Set([
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

  parse(html: string, documentId: string): DocumentElement[] {
    // First, assign deterministic IDs to all elements
    const htmlWithIds = assignDeterministicIds(html)
    const $ = load(htmlWithIds)
    const elements: DocumentElement[] = []
    let position = 0

    const processElement = (
      element: Element,
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

      // Extract content based on element type
      let textContent = ''
      if (tagName === 'text') {
        // For text nodes, get the direct text
        textContent = (element as Element & { data?: string }).data?.trim() || ''
      } else if (DocumentParser.INLINE_ELEMENTS.has(tagName)) {
        // For inline elements, get text content only
        textContent = $el.text().trim()
      } else {
        // For block elements, only get direct text content and inline elements
        // Clone the element to avoid modifying the original
        const $clone = $el.clone()
        
        // Remove all block-level children from the clone
        $clone.children().each((_, child) => {
          if (!DocumentParser.INLINE_ELEMENTS.has(child.name)) {
            $(child).remove()
          }
        })
        
        // Get the remaining HTML (just text and inline elements)
        const innerHtml = $clone.html() || ''
        textContent = innerHtml.trim()
      }

      // Only get block-level children (skip inline elements as they're included in text)
      const blockChildren = $el.children().filter((_, child) => {
        return !DocumentParser.INLINE_ELEMENTS.has(child.name)
      })

      // -------------------------------------------------------------------
      // Always include the current element in the output **even if** it has
      // no text content and no block-level children.  Some elements act only
      // as structural anchors (e.g. empty paragraphs that serve as insertion
      // points for AI-generated headings).  Excluding them causes downstream
      // mutations that reference their IDs to fail validation.
      // -------------------------------------------------------------------

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

      // Only process block-level children as separate elements so that inline
      // descendants remain part of their parent's text content.
      blockChildren.each((_, child) => {
        processElement(child, id, level + 1)
      })
    }

    $('body').children().each((_, element) => {
      processElement(element, null, 0)
    })

    return elements
  }
}