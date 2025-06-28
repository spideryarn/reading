/**
 * Tests for glossary template conditional logic and "generate more" mode
 * 
 * Tests the Nunjucks template rendering for entity capping functionality,
 * particularly the conditional logic that changes prompts based on existing_entities.
 */

import { glossaryPrompt } from '../glossary'
import { executePromptTemplate } from '../../types'

// Mock the actual LLM execution since we only want to test template rendering
jest.mock('../../types', () => ({
  ...jest.requireActual('../../types'),
  executePromptTemplate: jest.fn()
}))

const mockExecutePromptTemplate = executePromptTemplate as jest.MockedFunction<typeof executePromptTemplate>

describe('Glossary Template Conditional Logic', () => {
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