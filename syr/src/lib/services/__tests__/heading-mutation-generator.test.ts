import { generateHeadingMutation, extractHeadingsFromMutation } from '../heading-mutation-generator'
import { isInsertTransform, isRemoveTransform } from '../../types/mutation'

describe('heading-mutation-generator', () => {
  describe('generateHeadingMutation', () => {
    it('should generate a mutation with forward and reverse transforms', () => {
      const headings = [
        { id_of_after: 'para-1', html: '<h2>First Heading</h2>' },
        { id_of_after: 'para-3', html: '<h3>Second Heading</h3>' }
      ]
      
      const mutation = generateHeadingMutation(headings, 'test-doc-123')
      
      expect(mutation.id).toMatch(/^ai-headings-/)
      expect(mutation.type).toBe('insert-headings')
      expect(mutation.forward).toHaveLength(2)
      expect(mutation.reverse).toHaveLength(2)
      
      // Check forward transforms
      expect(isInsertTransform(mutation.forward[0])).toBe(true)
      expect(mutation.forward[0].afterId).toBe('para-1')
      expect(mutation.forward[0].content?.tag_name).toBe('h2')
      expect(mutation.forward[0].content?.content).toBe('First Heading')
      expect(mutation.forward[0].content?.attributes?.['data-ai-generated']).toBe('true')
      
      expect(isInsertTransform(mutation.forward[1])).toBe(true)
      expect(mutation.forward[1].afterId).toBe('para-3')
      expect(mutation.forward[1].content?.tag_name).toBe('h3')
      expect(mutation.forward[1].content?.content).toBe('Second Heading')
      
      // Check reverse transforms
      expect(isRemoveTransform(mutation.reverse[0])).toBe(true)
      expect(mutation.reverse[0].targetId).toMatch(/^ai-heading-test-doc-123-0/)
      expect(isRemoveTransform(mutation.reverse[1])).toBe(true)
      expect(mutation.reverse[1].targetId).toMatch(/^ai-heading-test-doc-123-1/)
    })

    it('should generate deterministic IDs for headings', () => {
      const headings = [
        { id_of_after: 'para-1', html: '<h2>Test Heading</h2>' }
      ]
      
      const mutation1 = generateHeadingMutation(headings, 'test-doc')
      const mutation2 = generateHeadingMutation(headings, 'test-doc')
      
      expect(mutation1.forward[0].content?.id).toBe(mutation2.forward[0].content?.id)
    })

    it('should extract text content from HTML correctly', () => {
      const headings = [
        { id_of_after: 'para-1', html: '<h2>Simple Text</h2>' },
        { id_of_after: 'para-2', html: '<h3>Text with <em>emphasis</em></h3>' },
        { id_of_after: 'para-3', html: '<h2>Text with <strong>bold</strong> and <a href="#">link</a></h2>' }
      ]
      
      const mutation = generateHeadingMutation(headings, 'test-doc')
      
      expect(mutation.forward[0].content?.content).toBe('Simple Text')
      expect(mutation.forward[1].content?.content).toBe('Text with emphasis')
      expect(mutation.forward[2].content?.content).toBe('Text with bold and link')
    })

    it('should handle empty headings array', () => {
      const mutation = generateHeadingMutation([], 'test-doc')
      
      expect(mutation.forward).toHaveLength(0)
      expect(mutation.reverse).toHaveLength(0)
      expect(mutation.metadata?.generatedHeadingCount).toBe(0)
    })

    it('should include metadata about the mutation', () => {
      const headings = [
        { id_of_after: 'para-1', html: '<h2>Heading 1</h2>' },
        { id_of_after: 'para-2', html: '<h3>Heading 2</h3>' },
        { id_of_after: 'para-3', html: '<h2>Heading 3</h2>' }
      ]
      
      const mutation = generateHeadingMutation(headings, 'test-doc')
      
      expect(mutation.metadata).toBeDefined()
      expect(mutation.metadata?.description).toBe('AI-generated semantic headings')
      expect(mutation.metadata?.generatedHeadingCount).toBe(3)
      expect(mutation.metadata?.originalHeadingCount).toBe(0)
    })

    it('should handle malformed HTML gracefully', () => {
      const headings = [
        { id_of_after: 'para-1', html: 'Not HTML at all' },
        { id_of_after: 'para-2', html: '<h2>Valid heading</h2>' },
        { id_of_after: 'para-3', html: '<h3 Incomplete HTML' }
      ]
      
      const mutation = generateHeadingMutation(headings, 'test-doc')
      
      // Should process all headings, using text content
      expect(mutation.forward).toHaveLength(3)
      expect(mutation.forward[0].content?.content).toBe('Not HTML at all')
      expect(mutation.forward[1].content?.content).toBe('Valid heading')
      expect(mutation.forward[2].content?.content).toBe('')
    })

    it('should handle special characters in heading text', () => {
      const headings = [
        { id_of_after: 'para-1', html: '<h2>Text with "quotes" & ampersands</h2>' },
        { id_of_after: 'para-2', html: "<h3>Text with 'single quotes'</h3>" },
        { id_of_after: 'para-3', html: '<h2>Text with <code>&lt;code&gt;</code></h2>' }
      ]
      
      const mutation = generateHeadingMutation(headings, 'test-doc')
      
      expect(mutation.forward[0].content?.content).toBe('Text with "quotes" & ampersands')
      expect(mutation.forward[1].content?.content).toBe("Text with 'single quotes'")
      expect(mutation.forward[2].content?.content).toBe('Text with <code>')
    })
  })

  describe('extractHeadingsFromMutation', () => {
    it('should extract headings from a mutation correctly', () => {
      const headings = [
        { id_of_after: 'para-1', html: '<h2>Section One</h2>' },
        { id_of_after: 'para-2', html: '<h3>Subsection</h3>' },
        { id_of_after: 'para-3', html: '<h4>Sub-subsection</h4>' }
      ]
      
      const mutation = generateHeadingMutation(headings, 'test-doc')
      const extracted = extractHeadingsFromMutation(mutation)
      
      expect(extracted).toHaveLength(3)
      
      expect(extracted[0].id).toMatch(/^ai-heading-test-doc-0/)
      expect(extracted[0].level).toBe(2)
      expect(extracted[0].text).toBe('Section One')
      
      expect(extracted[1].id).toMatch(/^ai-heading-test-doc-1/)
      expect(extracted[1].level).toBe(3)
      expect(extracted[1].text).toBe('Subsection')
      
      expect(extracted[2].id).toMatch(/^ai-heading-test-doc-2/)
      expect(extracted[2].level).toBe(4)
      expect(extracted[2].text).toBe('Sub-subsection')
    })

    it('should return empty array for non-heading mutations', () => {
      const mutation = {
        id: 'other-mutation',
        type: 'summarize-paragraphs',
        forward: [{
          action: 'replace' as const,
          targetId: 'para-1',
          content: { content: 'Summary' }
        }],
        reverse: []
      }
      
      const extracted = extractHeadingsFromMutation(mutation)
      
      expect(extracted).toHaveLength(0)
    })

    it('should skip non-insert transforms', () => {
      const mutation = {
        id: 'mixed-mutation',
        type: 'insert-headings',
        forward: [
          {
            action: 'insert' as const,
            afterId: 'para-1',
            content: {
              id: 'heading-1',
              tag_name: 'h2',
              content: 'Valid Heading',
              attributes: {}
            }
          },
          {
            action: 'replace' as const,
            targetId: 'para-2',
            content: { content: 'Not a heading' }
          }
        ],
        reverse: []
      }
      
      const extracted = extractHeadingsFromMutation(mutation)
      
      expect(extracted).toHaveLength(1)
      expect(extracted[0].text).toBe('Valid Heading')
    })

    it('should extract level from various heading tags', () => {
      const mutation = {
        id: 'heading-levels',
        type: 'insert-headings',
        forward: [
          {
            action: 'insert' as const,
            afterId: 'p1',
            content: { id: 'h1', tag_name: 'h1', content: 'H1', attributes: {} }
          },
          {
            action: 'insert' as const,
            afterId: 'p2',
            content: { id: 'h2', tag_name: 'h2', content: 'H2', attributes: {} }
          },
          {
            action: 'insert' as const,
            afterId: 'p3',
            content: { id: 'h3', tag_name: 'h3', content: 'H3', attributes: {} }
          },
          {
            action: 'insert' as const,
            afterId: 'p4',
            content: { id: 'h4', tag_name: 'h4', content: 'H4', attributes: {} }
          },
          {
            action: 'insert' as const,
            afterId: 'p5',
            content: { id: 'h5', tag_name: 'h5', content: 'H5', attributes: {} }
          },
          {
            action: 'insert' as const,
            afterId: 'p6',
            content: { id: 'h6', tag_name: 'h6', content: 'H6', attributes: {} }
          }
        ],
        reverse: []
      }
      
      const extracted = extractHeadingsFromMutation(mutation)
      
      expect(extracted).toHaveLength(6)
      expect(extracted.map(h => h.level)).toEqual([1, 2, 3, 4, 5, 6])
    })
  })
})