/**
 * Consolidated semantic search tests
 * 
 * This file combines tests for:
 * 1. Query normalization utility (simple string trimming)
 * 2. Prompt template schema validation
 */

import { normalizeSemanticSearchQuery } from '../semantic-search'
import { 
  semanticSearchPrompt, 
  semanticSearchPromptInputSchema, 
  semanticSearchResponseSchema
} from '../../prompts/templates/semantic-search'

describe('semantic search utilities and schemas', () => {
  describe('normalizeSemanticSearchQuery', () => {
    // This function just calls .trim() - keeping only essential tests
    it('should trim whitespace', () => {
      expect(normalizeSemanticSearchQuery('  hello world  ')).toBe('hello world')
      expect(normalizeSemanticSearchQuery('\t\nhello\n\t')).toBe('hello')
      expect(normalizeSemanticSearchQuery('')).toBe('')
      expect(normalizeSemanticSearchQuery('   ')).toBe('')
    })

    it('should preserve content and be idempotent', () => {
      const query = 'What is consciousness?'
      expect(normalizeSemanticSearchQuery(query)).toBe(query)
      expect(normalizeSemanticSearchQuery(normalizeSemanticSearchQuery('  ' + query + '  '))).toBe(query)
    })
  })

  describe('semantic search prompt schemas', () => {
    describe('input validation', () => {
      it('should accept valid input', () => {
        const validInput = {
          content: '[elem_h1_1] Introduction\n[elem_p_2] Content.',
          query: 'introduction'
        }
        
        const result = semanticSearchPromptInputSchema.safeParse(validInput)
        expect(result.success).toBe(true)
      })

      it('should reject invalid input', () => {
        const emptyContent = { content: '', query: 'test' }
        const emptyQuery = { content: 'content', query: '' }
        const missingField = { content: 'content' }
        
        expect(semanticSearchPromptInputSchema.safeParse(emptyContent).success).toBe(false)
        expect(semanticSearchPromptInputSchema.safeParse(emptyQuery).success).toBe(false)
        expect(semanticSearchPromptInputSchema.safeParse(missingField).success).toBe(false)
      })
    })

    describe('response validation', () => {
      it('should accept valid matches', () => {
        const validResponse = {
          matches: [
            {
              elementId: 'elem_p_1',
              confidence: 0.9,
              reasoning: 'Directly relevant',
              relevantText: 'Relevant content'
            }
          ]
        }
        
        expect(semanticSearchResponseSchema.safeParse(validResponse).success).toBe(true)
        expect(semanticSearchResponseSchema.safeParse({ matches: [] }).success).toBe(true)
      })

      it('should reject invalid confidence values', () => {
        const invalidResponse = {
          matches: [{
            elementId: 'elem_p_1',
            confidence: 1.5, // > 1
            reasoning: 'Test',
            relevantText: 'Test'
          }]
        }
        
        expect(semanticSearchResponseSchema.safeParse(invalidResponse).success).toBe(false)
      })
    })

    it('should have correct template configuration', () => {
      expect(semanticSearchPrompt.name).toBe('semantic-search')
      expect(semanticSearchPrompt.modelConfig?.temperature).toBe(0.3)
    })
  })
})