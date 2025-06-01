import { DocumentParser } from '../document-parser'

describe('DocumentParser', () => {
  let parser: DocumentParser

  beforeEach(() => {
    parser = new DocumentParser()
  })

  describe('parse', () => {
    it('should keep inline elements text within parent elements', () => {
      const html = `
        <body>
          <p>This is a paragraph with <em>emphasized</em> and <strong>bold</strong> text.</p>
        </body>
      `
      
      const elements = parser.parse(html, 'test-doc')
      
      // Should only have one element (the paragraph)
      expect(elements).toHaveLength(1)
      
      const paragraph = elements[0]
      expect(paragraph.tag_name).toBe('p')
      expect(paragraph.content).toBe('This is a paragraph with emphasized and bold text.')
    })

    it('should handle nested inline elements', () => {
      const html = `
        <body>
          <p>Text with <strong>bold and <em>emphasized</em></strong> content.</p>
        </body>
      `
      
      const elements = parser.parse(html, 'test-doc')
      
      expect(elements).toHaveLength(1)
      expect(elements[0].content).toBe('Text with bold and emphasized content.')
    })

    it('should process block elements as separate elements', () => {
      const html = `
        <body>
          <div>
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </div>
        </body>
      `
      
      const elements = parser.parse(html, 'test-doc')
      
      // Should have div and two paragraphs
      expect(elements).toHaveLength(3)
      
      const div = elements.find(el => el.tag_name === 'div')
      expect(div?.content).toBe('First paragraph\n\nSecond paragraph')
      
      const paragraphs = elements.filter(el => el.tag_name === 'p')
      expect(paragraphs).toHaveLength(2)
      expect(paragraphs[0].content).toBe('First paragraph')
      expect(paragraphs[1].content).toBe('Second paragraph')
    })

    it('should handle complex document with inline elements', () => {
      const html = `
        <body>
          <p>(A technical note: Some philosophers argue that even though there is a <em>conceptual</em> gap between 
          physical processes and experience, there need be no metaphysical gap, so that experience might 
          in a certain sense still be physical (e.g. Hill 1991; Levine 1983; Loar 1990). Usually this line of 
          argument is supported by an appeal to the notion of <em>a posteriori</em> necessity (Kripke 1980). I think 
          that this position rests on a misunderstanding of <em>a posteriori</em> necessity, however, or else requires 
          an entirely new sort of necessity that we have no reason to believe in; see Chalmers 1996 (also 
          Jackson 1994 and Lewis 1994) for details. In any case, this position still concedes an <em>explanatory</em> 
          gap between physical processes and experience. For example, the principles connecting the 
          physical and the experiential will not be derivable from the laws of physics, so such principles 
          must be taken as <em>explanatorily</em> fundamental. So even on this sort of view, the explanatory 
          structure of a theory of consciousness will be much as I have described.)</p>
        </body>
      `
      
      const elements = parser.parse(html, 'test-doc')
      
      expect(elements).toHaveLength(1)
      
      const paragraph = elements[0]
      expect(paragraph.tag_name).toBe('p')
      
      // Check that all the italicized words are included in the text
      expect(paragraph.content).toContain('conceptual')
      expect(paragraph.content).toContain('a posteriori')
      expect(paragraph.content).toContain('explanatory')
      expect(paragraph.content).toContain('explanatorily')
      
      // Should not have any separate elements for the em tags
      const emElements = elements.filter(el => el.tag_name === 'em')
      expect(emElements).toHaveLength(0)
    })

    it('should skip script and style elements', () => {
      const html = `
        <body>
          <p>Normal text</p>
          <script>console.log('test')</script>
          <style>p { color: red; }</style>
        </body>
      `
      
      const elements = parser.parse(html, 'test-doc')
      
      expect(elements).toHaveLength(1)
      expect(elements[0].tag_name).toBe('p')
    })
  })
})