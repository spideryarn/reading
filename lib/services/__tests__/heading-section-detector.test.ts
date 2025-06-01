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
    it('should find section elements for a heading', () => {
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

    it('should stop at heading of equal level', () => {
      const elements: DocumentElement[] = [
        createElement('h2-1', 'h2', 'Section 1', 0),
        createElement('p-1', 'p', 'Content 1', 1),
        createElement('h2-2', 'h2', 'Section 2', 2),
        createElement('p-2', 'p', 'Content 2', 3),
      ]

      const section = getHeadingSectionElements(elements[0], elements)
      
      expect(section).toHaveLength(1)
      expect(section[0].id).toBe('p-1')
    })

    it('should stop at heading of higher level', () => {
      const elements: DocumentElement[] = [
        createElement('h2-1', 'h2', 'Section 1.1', 0),
        createElement('p-1', 'p', 'Content', 1),
        createElement('h3-1', 'h3', 'Subsection', 2),
        createElement('p-2', 'p', 'Sub content', 3),
        createElement('h1-1', 'h1', 'Chapter 2', 4),
        createElement('p-3', 'p', 'Chapter content', 5),
      ]

      const section = getHeadingSectionElements(elements[0], elements)
      
      expect(section).toHaveLength(3)
      expect(section[0].id).toBe('p-1')
      expect(section[1].id).toBe('h3-1')
      expect(section[2].id).toBe('p-2')
    })

    it('should return empty array for heading with no content', () => {
      const elements: DocumentElement[] = [
        createElement('h1-1', 'h1', 'Empty Chapter', 0),
        createElement('h1-2', 'h1', 'Next Chapter', 1),
      ]

      const section = getHeadingSectionElements(elements[0], elements)
      
      expect(section).toHaveLength(0)
    })

    it('should handle nested heading structures', () => {
      const elements: DocumentElement[] = [
        createElement('h1-1', 'h1', 'Chapter', 0),
        createElement('h2-1', 'h2', 'Section', 1),
        createElement('h3-1', 'h3', 'Subsection', 2),
        createElement('p-1', 'p', 'Content', 3),
        createElement('h4-1', 'h4', 'Sub-subsection', 4),
        createElement('p-2', 'p', 'More content', 5),
        createElement('h2-2', 'h2', 'Next Section', 6),
      ]

      const section = getHeadingSectionElements(elements[1], elements) // h2-1
      
      expect(section).toHaveLength(4)
      expect(section.map(e => e.id)).toEqual(['h3-1', 'p-1', 'h4-1', 'p-2'])
    })

    it('should throw error for non-heading element', () => {
      const elements: DocumentElement[] = [
        createElement('p-1', 'p', 'Paragraph', 0),
      ]

      expect(() => {
        getHeadingSectionElements(elements[0], elements)
      }).toThrow('Element must be a heading (h1-h6)')
    })

    it('should include elements with empty content', () => {
      const elements: DocumentElement[] = [
        createElement('h1-1', 'h1', 'Chapter', 0),
        createElement('p-1', 'p', '', 1), // Empty content
        createElement('div-1', 'div', '', 2), // Empty div
        createElement('p-2', 'p', 'Real content', 3),
      ]

      const section = getHeadingSectionElements(elements[0], elements)
      
      expect(section).toHaveLength(3)
      expect(section.map(e => e.id)).toEqual(['p-1', 'div-1', 'p-2'])
    })
  })

  describe('getHeadingAndSectionElements', () => {
    it('should return heading plus its section elements', () => {
      const elements: DocumentElement[] = [
        createElement('h1-1', 'h1', 'Chapter 1', 0),
        createElement('p-1', 'p', 'Content', 1),
        createElement('h1-2', 'h1', 'Chapter 2', 2),
      ]

      const result = getHeadingAndSectionElements(elements[0], elements)
      
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('h1-1')
      expect(result[1].id).toBe('p-1')
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

    it('should find correct parent in nested structure', () => {
      const elements: DocumentElement[] = [
        createElement('h1-1', 'h1', 'Chapter', 0),
        createElement('h2-1', 'h2', 'Section', 1),
        createElement('h3-1', 'h3', 'Subsection', 2),
        createElement('p-1', 'p', 'Content', 3),
      ]

      const parent = findParentHeading(elements[3], elements) // p-1
      
      expect(parent).not.toBeNull()
      expect(parent!.id).toBe('h3-1')
    })
  })

  describe('extractHeadingElements', () => {
    const mixedElements: DocumentElement[] = [
      createElement('h1-1', 'h1', 'Original Chapter', 0),
      createElement('p-1', 'p', 'Content', 1),
      createElement('h2-1', 'h2', 'AI Section', 2, { 'data-ai-generated': 'true' }),
      createElement('h2-2', 'h2', 'Original Section', 3),
      createElement('h3-1', 'h3', 'AI Subsection', 4, { 'data-ai-generated': 'true' }),
      createElement('div-1', 'div', 'Not a heading', 5),
    ]

    it('should extract all headings when no filter specified', () => {
      const headings = extractHeadingElements(mixedElements)
      
      expect(headings).toHaveLength(4)
      expect(headings.map(h => h.id)).toEqual(['h1-1', 'h2-1', 'h2-2', 'h3-1'])
    })

    it('should extract only AI-generated headings when filter is true', () => {
      const headings = extractHeadingElements(mixedElements, true)
      
      expect(headings).toHaveLength(2)
      expect(headings.map(h => h.id)).toEqual(['h2-1', 'h3-1'])
    })

    it('should extract only original headings when filter is false', () => {
      const headings = extractHeadingElements(mixedElements, false)
      
      expect(headings).toHaveLength(2)
      expect(headings.map(h => h.id)).toEqual(['h1-1', 'h2-2'])
    })

    it('should handle empty element array', () => {
      const headings = extractHeadingElements([])
      
      expect(headings).toHaveLength(0)
    })
  })
})