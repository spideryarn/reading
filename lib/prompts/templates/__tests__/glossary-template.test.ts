/**
 * Tests for glossary template with real LLM integration
 * 
 * Tests the glossary prompt template with actual LLM calls using test-tier models
 * to ensure the prompt generates valid responses and the template logic works correctly.
 * Uses cheaper Gemini Flash model to stay within test budget.
 */

// Load test environment with cheaper model
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: '.env.test' })

// Unmock the prompts module and LLM provider to use real LLM calls
jest.unmock('@/lib/prompts/types')
jest.unmock('@/lib/services/llm-provider')
jest.unmock('@ai-sdk/anthropic')
jest.unmock('@ai-sdk/google')
jest.unmock('ai')

import { glossaryPrompt } from '../glossary'
import { executePromptWithUsage } from '../../types'

// Use real LLM execution for service mock elimination
// Real integration test - guarded behind env flag to prevent accidental runs
const SHOULD_RUN_REAL_LLM = process.env.NODE_ENV === 'test' && process.env.ANTHROPIC_API_KEY

export const maybeRunRealLLMTest = SHOULD_RUN_REAL_LLM ? describe : describe.skip

// Mock tests (legacy) - can be removed once real LLM tests are proven stable
describe.skip('Glossary Template Conditional Logic (Legacy Mock Tests)', () => {
  // Mock setup for legacy tests
  const mockExecutePromptTemplate = jest.fn()
  
  beforeEach(() => {
    mockExecutePromptTemplate.mockClear()
    // Mock successful template rendering without LLM execution
    mockExecutePromptTemplate.mockImplementation(async (template, input) => {
      // Return a mock response that includes the rendered prompt for testing
      return {
        renderedPrompt: `Mocked template rendering for: ${JSON.stringify(input)}`,
        // These won't be used in template tests but required for type compatibility
        text: 'mock response',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, reasoningTokens: 0 },
        finishReason: 'stop'
      }
    })
  })

  describe('Initial Generation Mode (no existing entities)', () => {
    it('should render initial generation prompt with default entity limit', async () => {
      const input = {
        content: 'Document content for entity extraction...',
        max_entities: 20
      }

      await executePromptTemplate(glossaryPrompt, input)

      // Verify template was called with correct parameters
      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          content: input.content,
          max_entities: 20,
          existing_entities: undefined
        })
      )
    })

    it('should handle undefined max_entities (uses template default)', async () => {
      const input = {
        content: 'Document content without explicit limit...'
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          content: input.content,
          max_entities: undefined,
          existing_entities: undefined
        })
      )
    })

    it('should pass through legacy already_entities parameter', async () => {
      const input = {
        content: 'Document content with legacy entities...',
        already_entities: [
          { name: 'Legacy Entity 1', aliases: ['LE1'] },
          { name: 'Legacy Entity 2', aliases: ['LE2', 'Legacy2'] }
        ]
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          content: input.content,
          already_entities: input.already_entities,
          existing_entities: undefined
        })
      )
    })
  })

  describe('Generate More Mode (with existing entities)', () => {
    const existingEntities = [
      {
        name: 'Existing Entity 1',
        ontology: 'concept' as const,
        aliases: ['EE1'],
        brief_explanation: 'First existing entity'
      },
      {
        name: 'Existing Entity 2',
        ontology: 'person' as const,
        aliases: ['EE2'],
        brief_explanation: 'Second existing entity',
        long_explanation: 'Detailed explanation of the second entity'
      }
    ]

    it('should render generate more prompt with existing entities', async () => {
      const input = {
        content: 'Document content for additional entities...',
        max_entities: 15,
        existing_entities: existingEntities
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          content: input.content,
          max_entities: 15,
          existing_entities: existingEntities
        })
      )
    })

    it('should handle empty existing_entities array', async () => {
      const input = {
        content: 'Document content with empty existing entities...',
        max_entities: 10,
        existing_entities: []
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          content: input.content,
          max_entities: 10,
          existing_entities: []
        })
      )
    })

    it('should combine existing_entities with legacy already_entities', async () => {
      const input = {
        content: 'Document content with both entity types...',
        max_entities: 25,
        existing_entities: existingEntities,
        already_entities: [
          { name: 'Legacy Entity', aliases: ['LE'] }
        ]
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          content: input.content,
          max_entities: 25,
          existing_entities: existingEntities,
          already_entities: input.already_entities
        })
      )
    })
  })

  describe('Template Configuration', () => {
    it('should have appropriate model configuration for entity generation', () => {
      expect(glossaryPrompt.name).toBe('glossary')
      expect(glossaryPrompt.description).toContain('entity')
      expect(glossaryPrompt.templatePath).toBe('glossary.njk')
      expect(glossaryPrompt.modelConfig).toBeDefined()
      expect(glossaryPrompt.modelConfig?.maxTokens).toBe(8000) // Should work with Haiku
      expect(glossaryPrompt.modelConfig?.temperature).toBe(0.3) // Lower temp for consistent extraction
    })

    it('should use input schema for validation', () => {
      expect(glossaryPrompt.schema).toBeDefined()
      
      // Test valid input passes schema
      const validInput = {
        content: 'Test content',
        max_entities: 20,
        existing_entities: [
          { name: 'Test Entity', aliases: ['TE'] }
        ]
      }
      
      const result = glossaryPrompt.schema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject invalid input through schema', () => {
      const invalidInput = {
        content: '', // Empty content should fail
        max_entities: -5 // Negative should fail
      }
      
      const result = glossaryPrompt.schema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })

  describe('Entity Limit Handling', () => {
    it('should pass through small entity limits', async () => {
      const input = {
        content: 'Document content for small limit...',
        max_entities: 5
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          max_entities: 5
        })
      )
    })

    it('should pass through large entity limits', async () => {
      const input = {
        content: 'Document content for large limit...',
        max_entities: 100
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          max_entities: 100
        })
      )
    })

    it('should handle entity limits with existing entities context', async () => {
      const input = {
        content: 'Document content with limit and context...',
        max_entities: 30,
        existing_entities: [
          {
            name: 'Context Entity',
            ontology: 'concept' as const,
            aliases: ['CE'],
            brief_explanation: 'Provides context for additional generation'
          }
        ]
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          max_entities: 30,
          existing_entities: expect.arrayContaining([
            expect.objectContaining({
              name: 'Context Entity'
            })
          ])
        })
      )
    })
  })

  describe('Complex Entity Objects', () => {
    it('should handle entities with all optional fields', async () => {
      const complexEntities = [
        {
          name: 'Complex Entity',
          ontology: 'event' as const,
          aliases: ['CE', 'Complex'],
          brief_explanation: 'A complex entity with all fields',
          long_explanation: 'Detailed explanation with **markdown** formatting',
          datetime: '2023-01-01T12:00:00Z',
          url: 'https://example.com/complex-entity',
          extra: { custom_field: 'custom_value', score: 95 }
        }
      ]

      const input = {
        content: 'Document content with complex entities...',
        max_entities: 20,
        existing_entities: complexEntities
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          existing_entities: expect.arrayContaining([
            expect.objectContaining({
              name: 'Complex Entity',
              ontology: 'event',
              aliases: ['CE', 'Complex'],
              brief_explanation: 'A complex entity with all fields',
              long_explanation: 'Detailed explanation with **markdown** formatting',
              datetime: '2023-01-01T12:00:00Z',
              url: 'https://example.com/complex-entity',
              extra: { custom_field: 'custom_value', score: 95 }
            })
          ])
        })
      )
    })

    it('should handle entities with minimal required fields only', async () => {
      const minimalEntities = [
        {
          name: 'Minimal Entity',
          ontology: 'other' as const,
          aliases: [],
          brief_explanation: 'Minimal entity with only required fields'
        }
      ]

      const input = {
        content: 'Document content with minimal entities...',
        max_entities: 10,
        existing_entities: minimalEntities
      }

      await executePromptTemplate(glossaryPrompt, input)

      expect(mockExecutePromptTemplate).toHaveBeenCalledWith(
        glossaryPrompt,
        expect.objectContaining({
          existing_entities: expect.arrayContaining([
            expect.objectContaining({
              name: 'Minimal Entity',
              ontology: 'other',
              aliases: [],
              brief_explanation: 'Minimal entity with only required fields'
            })
          ])
        })
      )
    })
  })
})

// Real LLM integration tests using test-tier models
maybeRunRealLLMTest('Glossary Template - Real LLM Integration', () => {
  // Test timeout for LLM calls (30 seconds)
  const LLM_TIMEOUT = 30000

  describe('Real LLM Execution', () => {
    it('should generate valid entities from real document content using Gemini Flash', async () => {
      const testContent = `
        Machine learning is a subset of artificial intelligence (AI) that enables computers to learn 
        and make decisions from data without being explicitly programmed. Neural networks are a key 
        component of deep learning, inspired by the structure of biological neurons in the brain.
        
        Convolutional Neural Networks (CNNs) are particularly effective for image recognition tasks,
        while Recurrent Neural Networks (RNNs) excel at processing sequential data like text and speech.
        The transformer architecture, introduced in 2017, revolutionized natural language processing
        with models like BERT and GPT becoming state-of-the-art for various NLP tasks.
      `

      const input = {
        content: testContent,
        max_entities: 8 // Keep small for cost efficiency
      }

      const result = await executePromptWithUsage(glossaryPrompt, input)

      // Validate response structure
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('usage')
      expect(result.usage.totalTokens).toBeGreaterThan(0)
      expect(result.usage.totalTokens).toBeLessThan(4000) // Gemini Flash efficiency check

      // Parse and validate the generated entities
      const entities = JSON.parse(result.text)
      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBeGreaterThan(0)
      expect(entities.length).toBeLessThanOrEqual(8)

      // Validate entity structure
      entities.forEach((entity: any) => {
        expect(entity).toHaveProperty('name')
        expect(entity).toHaveProperty('ontology')
        expect(entity).toHaveProperty('aliases')
        expect(entity).toHaveProperty('brief_explanation')
        expect(typeof entity.name).toBe('string')
        expect(entity.name.length).toBeGreaterThan(0)
        expect(Array.isArray(entity.aliases)).toBe(true)
        expect(typeof entity.brief_explanation).toBe('string')
      })

      // Check that some expected ML concepts are captured
      const entityNames = entities.map((e: any) => e.name.toLowerCase())
      const hasMLConcepts = entityNames.some(name => 
        name.includes('machine learning') || 
        name.includes('neural network') || 
        name.includes('artificial intelligence')
      )
      expect(hasMLConcepts).toBe(true)
    }, LLM_TIMEOUT)

    it('should handle generate more mode with existing entities', async () => {
      const testContent = `
        Supervised learning algorithms require labeled training data to learn patterns and make predictions.
        Common supervised learning tasks include classification and regression. Unsupervised learning,
        in contrast, finds patterns in data without labeled examples, including clustering and 
        dimensionality reduction techniques like Principal Component Analysis (PCA).
      `

      const existingEntities = [
        {
          name: 'Machine Learning',
          ontology: 'concept' as const,
          aliases: ['ML'],
          brief_explanation: 'A subset of AI that enables computers to learn from data'
        }
      ]

      const input = {
        content: testContent,
        max_entities: 5,
        existing_entities: existingEntities
      }

      const result = await executePromptWithUsage(glossaryPrompt, input)

      // Validate response
      expect(result.usage.totalTokens).toBeGreaterThan(0)
      
      const entities = JSON.parse(result.text)
      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBeGreaterThan(0)

      // Should generate new entities, not duplicate existing ones
      const entityNames = entities.map((e: any) => e.name.toLowerCase())
      const hasDuplicateML = entityNames.some(name => 
        name.includes('machine learning') && name === 'machine learning'
      )
      expect(hasDuplicateML).toBe(false)

      // Should capture concepts from the new content
      const hasSupervised = entityNames.some(name => 
        name.includes('supervised') || name.includes('classification') || name.includes('regression')
      )
      expect(hasSupervised).toBe(true)
    }, LLM_TIMEOUT)

    it('should respect token usage limits for cost efficiency', async () => {
      const shortContent = 'Neural networks process information using interconnected nodes called neurons.'

      const input = {
        content: shortContent,
        max_entities: 3
      }

      const result = await executePromptWithUsage(glossaryPrompt, input)

      // Check cost efficiency - Gemini Flash should use fewer tokens
      expect(result.usage.promptTokens).toBeLessThan(1500)
      expect(result.usage.completionTokens).toBeLessThan(500)
      expect(result.usage.totalTokens).toBeLessThan(2000)

      // Validate basic functionality
      const entities = JSON.parse(result.text)
      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBeGreaterThan(0)
      expect(entities.length).toBeLessThanOrEqual(3)
    }, LLM_TIMEOUT)
  })

  describe('Template Configuration Validation', () => {
    it('should use appropriate model configuration for real execution', () => {
      expect(glossaryPrompt.name).toBe('glossary')
      expect(glossaryPrompt.description).toContain('entity')
      expect(glossaryPrompt.templatePath).toBe('glossary.njk')
      expect(glossaryPrompt.modelConfig).toBeDefined()
      
      // Should be configured for cost-efficient token usage
      expect(glossaryPrompt.modelConfig?.maxTokens).toBe(8000)
      expect(glossaryPrompt.modelConfig?.temperature).toBe(0.3)
    })

    it('should validate input schema correctly for real calls', () => {
      const validInput = {
        content: 'Test content with actual text for entity extraction',
        max_entities: 5,
        existing_entities: []
      }
      
      const result = glossaryPrompt.schema.safeParse(validInput)
      expect(result.success).toBe(true)

      const invalidInput = {
        content: '', // Empty content
        max_entities: -1 // Invalid number
      }
      
      const invalidResult = glossaryPrompt.schema.safeParse(invalidInput)
      expect(invalidResult.success).toBe(false)
    })
  })
})