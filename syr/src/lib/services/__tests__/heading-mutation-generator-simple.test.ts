// Mock the deterministic ID function to avoid Cheerio dependency
jest.mock('@/lib/services/deterministicId', () => ({
  generateContentBasedId: jest.fn((docId: string, type: string, content: string) => {
    // Simple mock that returns a predictable ID with syr- prefix
    // Now includes the full content string which will contain the insertion point
    return `syr-mock-id-${docId}-${type}-${content.substring(0, 20).replace(/[:\s]/g, '-')}`
  })
}))

import { generateHeadingMutation, extractHeadingsFromMutation } from '@/lib/services/heading-mutation-generator'
import { isInsertTransform, isRemoveTransform } from '@/lib/types/mutation'

describe('heading-mutation-generator (simplified)', () => {
  describe('generateHeadingMutation', () => {
    it('should generate a mutation with forward and reverse transforms', () => {
      const headings = [
        { id_of_after: 'para-1', html: '<h2>First Heading</h2>' },
        { id_of_after: 'para-3', html: '<h3>Second Heading</h3>' }
      ]
      
      const mutation = generateHeadingMutation({ headings, documentId: 'test-doc-123' })
      
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
      
      // Check reverse transforms
      expect(isRemoveTransform(mutation.reverse[0])).toBe(true)
      // The ID now includes the insertion point (truncated at 20 chars in mock) and syr- prefix
      expect(mutation.reverse[0].targetId).toBe('syr-mock-id-test-doc-123-heading-First-Heading-after-')
    })

    it('should handle empty headings array', () => {
      const mutation = generateHeadingMutation({ headings: [], documentId: 'test-doc' })
      
      expect(mutation.forward).toHaveLength(0)
      expect(mutation.reverse).toHaveLength(0)
      expect(mutation.metadata?.generatedHeadingCount).toBe(0)
    })

    it('should throw error for malformed HTML', () => {
      const headings = [
        { id_of_after: 'para-1', html: 'Not HTML at all' }
      ]
      
      expect(() => generateHeadingMutation({ headings, documentId: 'test-doc' }))
        .toThrow('Invalid heading HTML format')
    })
  })

  describe('extractHeadingsFromMutation', () => {
    it('should extract headings from a mutation correctly', () => {
      const headings = [
        { id_of_after: 'para-1', html: '<h2>Section One</h2>' },
        { id_of_after: 'para-2', html: '<h3>Subsection</h3>' }
      ]
      
      const mutation = generateHeadingMutation({ headings, documentId: 'test-doc' })
      const extracted = extractHeadingsFromMutation(mutation)
      
      expect(extracted).toHaveLength(2)
      expect(extracted[0].level).toBe(2)
      expect(extracted[0].text).toBe('Section One')
      expect(extracted[1].level).toBe(3)
      expect(extracted[1].text).toBe('Subsection')
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
  })
})