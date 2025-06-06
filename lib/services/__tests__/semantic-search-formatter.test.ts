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
    it('should format simple document elements correctly', () => {
      const elements: DocumentElement[] = [
        createMockElement({
          id: 'elem_h1_1',
          content: 'Introduction to Quantum Physics',
          tag_name: 'h1',
          position: 0
        }),
        createMockElement({
          id: 'elem_p_2',
          content: 'Quantum mechanics describes the physical properties of nature.',
          tag_name: 'p',
          position: 1
        })
      ]

      const result = formatDocumentForSemanticSearch(elements)
      
      const expectedOutput = [
        '[elem_h1_1] Introduction to Quantum Physics',
        '[elem_p_2] Quantum mechanics describes the physical properties of nature.'
      ].join('\n')
      
      expect(result).toBe(expectedOutput)
    })

    it('should filter out elements with empty content', () => {
      const elements: DocumentElement[] = [
        createMockElement({
          id: 'elem_h1_1',
          content: 'Valid heading',
          position: 0
        }),
        createMockElement({
          id: 'elem_div_2',
          content: '',
          position: 1
        }),
        createMockElement({
          id: 'elem_p_3',
          content: '   ', // Only whitespace
          position: 2
        }),
        createMockElement({
          id: 'elem_p_4',
          content: 'Valid paragraph',
          position: 3
        })
      ]

      const result = formatDocumentForSemanticSearch(elements)
      
      const expectedOutput = [
        '[elem_h1_1] Valid heading',
        '[elem_p_4] Valid paragraph'
      ].join('\n')
      
      expect(result).toBe(expectedOutput)
    })

    it('should sort elements by position', () => {
      const elements: DocumentElement[] = [
        createMockElement({
          id: 'elem_p_3',
          content: 'Third element',
          position: 2
        }),
        createMockElement({
          id: 'elem_h1_1',
          content: 'First element',
          position: 0
        }),
        createMockElement({
          id: 'elem_p_2',
          content: 'Second element',
          position: 1
        })
      ]

      const result = formatDocumentForSemanticSearch(elements)
      
      const expectedOutput = [
        '[elem_h1_1] First element',
        '[elem_p_2] Second element',
        '[elem_p_3] Third element'
      ].join('\n')
      
      expect(result).toBe(expectedOutput)
    })

    it('should handle elements with markdown formatting', () => {
      const elements: DocumentElement[] = [
        createMockElement({
          id: 'elem_p_1',
          content: 'This has **bold text** and *italic text*.',
          position: 0
        })
      ]

      const result = formatDocumentForSemanticSearch(elements)
      expect(result).toBe('[elem_p_1] This has **bold text** and *italic text*.')
    })

    it('should return empty string for empty input', () => {
      const result = formatDocumentForSemanticSearch([])
      expect(result).toBe('')
    })
  })

  describe('validateSemanticSearchElementIds', () => {
    const elements: DocumentElement[] = [
      createMockElement({ id: 'elem_h1_1' }),
      createMockElement({ id: 'elem_p_2' }),
      createMockElement({ id: 'elem_p_3' })
    ]

    it('should return valid element IDs that exist in document', () => {
      const llmElementIds = ['elem_h1_1', 'elem_p_3']
      const result = validateSemanticSearchElementIds(elements, llmElementIds)
      
      expect(result).toEqual(['elem_h1_1', 'elem_p_3'])
    })

    it('should filter out invalid element IDs', () => {
      const llmElementIds = ['elem_h1_1', 'invalid_id', 'elem_p_2', 'another_invalid']
      const result = validateSemanticSearchElementIds(elements, llmElementIds)
      
      expect(result).toEqual(['elem_h1_1', 'elem_p_2'])
    })

    it('should handle empty input arrays', () => {
      expect(validateSemanticSearchElementIds([], [])).toEqual([])
      expect(validateSemanticSearchElementIds(elements, [])).toEqual([])
      expect(validateSemanticSearchElementIds([], ['elem_h1_1'])).toEqual([])
    })

    it('should warn about invalid element IDs', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      const llmElementIds = ['elem_h1_1', 'invalid_id']
      validateSemanticSearchElementIds(elements, llmElementIds)
      
      expect(consoleSpy).toHaveBeenCalledWith('[SemanticSearch] LLM returned invalid element ID: invalid_id')
      
      consoleSpy.mockRestore()
    })
  })

  describe('getDocumentStats', () => {
    it('should calculate correct statistics', () => {
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
          id: 'elem_p_3',
          content: 'Second paragraph.',
          tag_name: 'p'
        }),
        createMockElement({
          id: 'elem_div_4',
          content: '', // Empty content
          tag_name: 'div'
        })
      ]

      const stats = getDocumentStats(elements)
      
      expect(stats.totalElements).toBe(4)
      expect(stats.meaningfulElements).toBe(3) // Excludes empty content
      expect(stats.totalCharacters).toBe(5 + 33 + 18) // Sum of content lengths: "Title" + "First paragraph..." + "Second paragraph."
      expect(stats.averageCharactersPerElement).toBe(Math.round(56 / 3))
      expect(stats.tagDistribution).toEqual({
        h1: 1,
        p: 2
      })
    })

    it('should handle empty input', () => {
      const stats = getDocumentStats([])
      
      expect(stats.totalElements).toBe(0)
      expect(stats.meaningfulElements).toBe(0)
      expect(stats.totalCharacters).toBe(0)
      expect(stats.averageCharactersPerElement).toBe(0)
      expect(stats.tagDistribution).toEqual({})
    })
  })

  describe('estimateTokenCount', () => {
    it('should estimate token count correctly', () => {
      const annotatedContent = '[elem_h1_1] Introduction to Quantum Physics\n[elem_p_2] Quantum mechanics describes the physical properties.'
      const query = 'quantum physics'
      
      const result = estimateTokenCount(annotatedContent, query)
      
      // Rough calculation: 
      // Content: ~105 chars / 4 = ~26 tokens
      // Query: ~14 chars / 4 = ~3 tokens  
      // Template overhead: 500 tokens
      // Total: ~529 tokens
      expect(result).toBeGreaterThan(525)
      expect(result).toBeLessThan(535)
    })

    it('should handle empty inputs', () => {
      const result = estimateTokenCount('', '')
      expect(result).toBe(500) // Just template overhead
    })

    it('should scale with content size', () => {
      const shortContent = '[elem_p_1] Short'
      const longContent = shortContent.repeat(10)
      const query = 'test'
      
      const shortTokens = estimateTokenCount(shortContent, query)
      const longTokens = estimateTokenCount(longContent, query)
      
      expect(longTokens).toBeGreaterThan(shortTokens)
    })
  })
})