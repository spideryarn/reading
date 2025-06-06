/**
 * Tests for semantic search prompt template
 */

import { 
  semanticSearchPrompt, 
  semanticSearchPromptInputSchema, 
  semanticSearchResponseSchema,
  semanticMatchSchema 
} from '../semantic-search'

describe('semantic search prompt template', () => {
  describe('input validation', () => {
    it('should accept valid input with required fields', () => {
      const validInput = {
        content: '[elem_h1_1] Introduction to Quantum Physics\n[elem_p_2] Quantum mechanics is fundamental.',
        query: 'quantum physics'
      }
      
      const result = semanticSearchPromptInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should accept optional documentId field', () => {
      const validInput = {
        content: '[elem_h1_1] Sample content',
        query: 'sample query',
        documentId: 'doc-123'
      }
      
      const result = semanticSearchPromptInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject empty content', () => {
      const invalidInput = {
        content: '',
        query: 'test query'
      }
      
      const result = semanticSearchPromptInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject empty query', () => {
      const invalidInput = {
        content: '[elem_h1_1] Sample content',
        query: ''
      }
      
      const result = semanticSearchPromptInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should reject missing required fields', () => {
      const invalidInput = {
        content: '[elem_h1_1] Sample content'
        // missing query
      }
      
      const result = semanticSearchPromptInputSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('response validation', () => {
    it('should accept valid response with matches', () => {
      const validResponse = {
        matches: [
          {
            elementId: 'elem_p_1_content',
            confidence: 0.9,
            reasoning: 'Directly discusses quantum physics fundamentals',
            relevantText: 'Quantum mechanics is fundamental to understanding physics'
          },
          {
            elementId: 'elem_h2_2_wave',
            confidence: 0.8,
            reasoning: 'Wave-particle duality is core quantum concept',
            relevantText: 'Wave-Particle Duality'
          }
        ]
      }
      
      const result = semanticSearchResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('should accept empty matches array', () => {
      const validResponse = {
        matches: []
      }
      
      const result = semanticSearchResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('should reject confidence values outside 0-1 range', () => {
      const invalidResponse = {
        matches: [
          {
            elementId: 'elem_p_1',
            confidence: 1.5, // Invalid: > 1
            reasoning: 'Test reasoning',
            relevantText: 'Test text'
          }
        ]
      }
      
      const result = semanticSearchResponseSchema.safeParse(invalidResponse)
      expect(result.success).toBe(false)
    })

    it('should reject matches with empty required fields', () => {
      const invalidResponse = {
        matches: [
          {
            elementId: '', // Invalid: empty
            confidence: 0.8,
            reasoning: 'Test reasoning',
            relevantText: 'Test text'
          }
        ]
      }
      
      const result = semanticSearchResponseSchema.safeParse(invalidResponse)
      expect(result.success).toBe(false)
    })
  })

  describe('semantic match schema', () => {
    it('should validate individual match objects', () => {
      const validMatch = {
        elementId: 'elem_p_1_content',
        confidence: 0.85,
        reasoning: 'Contains relevant semantic concepts',
        relevantText: 'This text is semantically relevant'
      }
      
      const result = semanticMatchSchema.safeParse(validMatch)
      expect(result.success).toBe(true)
    })

    it('should reject negative confidence values', () => {
      const invalidMatch = {
        elementId: 'elem_p_1_content',
        confidence: -0.1, // Invalid: negative
        reasoning: 'Test reasoning',
        relevantText: 'Test text'
      }
      
      const result = semanticMatchSchema.safeParse(invalidMatch)
      expect(result.success).toBe(false)
    })
  })

  describe('prompt template properties', () => {
    it('should have correct template configuration', () => {
      expect(semanticSearchPrompt.name).toBe('semantic-search')
      expect(semanticSearchPrompt.description).toBeDefined()
      expect(semanticSearchPrompt.schema).toBeDefined()
      expect(semanticSearchPrompt.templatePath).toBeDefined()
      expect(semanticSearchPrompt.modelConfig).toBeDefined()
      expect(semanticSearchPrompt.modelConfig?.maxTokens).toBe(4000)
      expect(semanticSearchPrompt.modelConfig?.temperature).toBe(0.3)
    })
  })
})