import { load } from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import type { DocumentElement } from '@/lib/types/document'

export class DocumentParser {
  parse(html: string, documentId: string): DocumentElement[] {
    const $ = load(html)
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

      const id = uuidv4()
      const attributes: Record<string, string> = {}
      
      if (element.attribs) {
        Object.entries(element.attribs).forEach(([key, value]) => {
          attributes[key] = value as string
        })
      }

      const textContent = $el.contents()
        .filter(function() {
          return this.type === 'text'
        })
        .text()
        .trim()

      if (textContent || $el.children().length > 0) {
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

        $el.children().each((_, child) => {
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