import { 
  getHeadingSectionElements, 
  getHeadingAndSectionElements,
  findParentHeading,
  extractHeadingElements
} from '../heading-section-detector'
import type { DocumentElement } from '@/lib/types/document'

// Helper to create a document element
function createElement(
  id: string,
  tag_name: string,
  content: string,
  position: number,
  attributes: Record<string, string> = {}
): DocumentElement {
  return {
    id,
    tag_name,
    content,
    position,
    parent_id: null,
    attributes
  }
}

describe('heading-section-detector', () => {
  describe('getHeadingSectionElements', () => {
    it('should find section elements for a heading until next same/higher level heading', () => {
      const elements: DocumentElement[] = [
        createElement('h1-1', 'h1', 'Chapter 1', 0),
        createElement('p-1', 'p', 'First paragraph', 1),
        createElement('p-2', 'p', 'Second paragraph', 2),
        createElement('h2-1', 'h2', 'Section 1.1', 3),
        createElement('p-3', 'p', 'Section content', 4),
        createElement('h1-2', 'h1', 'Chapter 2', 5),
      ]

      const section = getHeadingSectionElements(elements[0], elements)
      
      expect(section).toHaveLength(4)
      expect(section[0].id).toBe('p-1')
      expect(section[1].id).toBe('p-2')
      expect(section[2].id).toBe('h2-1')
      expect(section[3].id).toBe('p-3')
    })

    it('should throw error for non-heading element', () => {
      const elements: DocumentElement[] = [
        createElement('p-1', 'p', 'Paragraph', 0),
      ]

      expect(() => {
        getHeadingSectionElements(elements[0], elements)
      }).toThrow('Element must be a heading (h1-h6)')
    })
  })

  describe('findParentHeading', () => {
    it('should find the parent heading for an element', () => {
      const elements: DocumentElement[] = [
        createElement('h1-1', 'h1', 'Chapter', 0),
        createElement('p-1', 'p', 'Intro', 1),
        createElement('h2-1', 'h2', 'Section', 2),
        createElement('p-2', 'p', 'Content', 3),
      ]

      const parent = findParentHeading(elements[3], elements) // p-2
      
      expect(parent).not.toBeNull()
      expect(parent!.id).toBe('h2-1')
    })

    it('should return null for element before any headings', () => {
      const elements: DocumentElement[] = [
        createElement('p-1', 'p', 'Preface', 0),
        createElement('h1-1', 'h1', 'Chapter', 1),
      ]

      const parent = findParentHeading(elements[0], elements)
      
      expect(parent).toBeNull()
    })
  })

  describe('extractHeadingElements', () => {
    it('should extract and filter headings based on AI-generated attribute', () => {
      const mixedElements: DocumentElement[] = [
        createElement('h1-1', 'h1', 'Original Chapter', 0),
        createElement('p-1', 'p', 'Content', 1),
        createElement('h2-1', 'h2', 'AI Section', 2, { 'data-ai-generated': 'true' }),
        createElement('h2-2', 'h2', 'Original Section', 3),
        createElement('h3-1', 'h3', 'AI Subsection', 4, { 'data-ai-generated': 'true' }),
        createElement('div-1', 'div', 'Not a heading', 5),
      ]

      // All headings
      const allHeadings = extractHeadingElements(mixedElements)
      expect(allHeadings).toHaveLength(4)
      expect(allHeadings.map(h => h.id)).toEqual(['h1-1', 'h2-1', 'h2-2', 'h3-1'])

      // Only AI-generated
      const aiHeadings = extractHeadingElements(mixedElements, true)
      expect(aiHeadings).toHaveLength(2)
      expect(aiHeadings.map(h => h.id)).toEqual(['h2-1', 'h3-1'])

      // Only original
      const originalHeadings = extractHeadingElements(mixedElements, false)
      expect(originalHeadings).toHaveLength(2)
      expect(originalHeadings.map(h => h.id)).toEqual(['h1-1', 'h2-2'])
    })
  })
})