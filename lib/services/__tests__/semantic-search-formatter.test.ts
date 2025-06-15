/**
 * Tests for semantic search document formatter
 */

import {
  formatDocumentForSemanticSearch,
  validateSemanticSearchElementIds,
  getDocumentStats,
  estimateTokenCount
} from '../semantic-search-formatter'
import type { DocumentElement } from '@/lib/types/document'

// Helper function to create mock DocumentElement
function createMockElement(overrides: Partial<DocumentElement> = {}): DocumentElement {
  return {
    id: 'elem_p_1',
    document_id: 'doc-123',
    parent_id: null,
    tag_name: 'p',
    content: 'Sample content text',
    attributes: {},
    position: 0,
    level: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides
  }
}

describe('semantic search document formatter', () => {
  describe('formatDocumentForSemanticSearch', () => {
    it('should format document elements with ID prefixes and filter empty content', () => {
      const elements: DocumentElement[] = [
        createMockElement({
          id: 'elem_h1_1',
          content: 'Introduction to Quantum Physics',
          tag_name: 'h1',
          position: 0
        }),
        createMockElement({
          id: 'elem_div_2',
          content: '',
          position: 1
        }),
        createMockElement({
          id: 'elem_p_3',
          content: 'Quantum mechanics describes the physical properties.',
          tag_name: 'p',
          position: 2
        })
      ]

      const result = formatDocumentForSemanticSearch(elements)
      
      const expectedOutput = [
        '[elem_h1_1] Introduction to Quantum Physics',
        '[elem_p_3] Quantum mechanics describes the physical properties.'
      ].join('\n')
      
      expect(result).toBe(expectedOutput)
    })
  })

  describe('validateSemanticSearchElementIds', () => {
    it('should validate and filter element IDs against document elements', () => {
      const elements: DocumentElement[] = [
        createMockElement({ id: 'elem_h1_1' }),
        createMockElement({ id: 'elem_p_2' }),
        createMockElement({ id: 'elem_p_3' })
      ]

      const llmElementIds = ['elem_h1_1', 'invalid_id', 'elem_p_3']
      const result = validateSemanticSearchElementIds(elements, llmElementIds)
      
      expect(result).toEqual(['elem_h1_1', 'elem_p_3'])
    })
  })

  describe('getDocumentStats', () => {
    it('should calculate document statistics correctly', () => {
      const elements: DocumentElement[] = [
        createMockElement({
          id: 'elem_h1_1',
          content: 'Title',
          tag_name: 'h1'
        }),
        createMockElement({
          id: 'elem_p_2',
          content: 'First paragraph with some content.',
          tag_name: 'p'
        }),
        createMockElement({
          id: 'elem_div_3',
          content: '', // Empty content
          tag_name: 'div'
        })
      ]

      const stats = getDocumentStats(elements)
      
      expect(stats.totalElements).toBe(3)
      expect(stats.meaningfulElements).toBe(2) // Excludes empty content
      expect(stats.totalCharacters).toBe(5 + 34) // "Title" + "First paragraph..."
      expect(stats.averageCharactersPerElement).toBe(Math.round(39 / 2))
      expect(stats.tagDistribution).toEqual({
        h1: 1,
        p: 1
      })
    })
  })
})