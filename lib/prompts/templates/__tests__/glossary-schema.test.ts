/**
 * Unit tests for glossary prompt schema validation
 * 
 * Tests the Zod schema validation for entity capping functionality,
 * including max_entities and existing_entities parameters that support
 * timeout mitigation and "generate more" functionality.
 */

import { 
  entitySchema, 
  glossaryResponseSchema, 
  glossaryPromptInputSchema 
} from '../glossary'

describe('Glossary Schema Validation', () => {
  describe('entitySchema', () => {
    const validEntity = {
      name: 'Test Entity',
      ontology: 'concept' as const,
      aliases: ['Test', 'Entity'],
      brief_explanation: 'A test entity for validation'
    }

    it('should validate a minimal valid entity', () => {
      const result = entitySchema.safeParse(validEntity)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Entity')
        expect(result.data.ontology).toBe('concept')
        expect(result.data.aliases).toEqual(['Test', 'Entity'])
        expect(result.data.brief_explanation).toBe('A test entity for validation')
      }
    })

    it('should validate entity with all optional fields', () => {
      const fullEntity = {
        ...validEntity,
        long_explanation: 'A detailed explanation with **markdown** formatting',
        datetime: '2023-01-01',
        url: 'https://example.com/entity',
        extra: { custom_field: 'custom_value' }
      }

      const result = entitySchema.safeParse(fullEntity)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.long_explanation).toBe('A detailed explanation with **markdown** formatting')
        expect(result.data.datetime).toBe('2023-01-01')
        expect(result.data.url).toBe('https://example.com/entity')
        expect(result.data.extra).toEqual({ custom_field: 'custom_value' })
      }
    })

    it('should validate all supported ontology types', () => {
      const ontologyTypes = [
        'person', 'place', 'date', 'theme', 'event', 
        'reference', 'object', 'organization', 'concept', 
        'definition', 'other'
      ]

      ontologyTypes.forEach(ontology => {
        const entity = { ...validEntity, ontology }
        const result = entitySchema.safeParse(entity)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid ontology types', () => {
      const invalidEntity = { ...validEntity, ontology: 'invalid_type' }
      const result = entitySchema.safeParse(invalidEntity)
      expect(result.success).toBe(false)
    })

    it('should reject entity missing required fields', () => {
      const requiredFields = ['name', 'ontology', 'aliases', 'brief_explanation']
      
      requiredFields.forEach(field => {
        const incompleteEntity = { ...validEntity }
        delete incompleteEntity[field as keyof typeof incompleteEntity]
        
        const result = entitySchema.safeParse(incompleteEntity)
        expect(result.success).toBe(false)
      })
    })

    it('should reject invalid URL format', () => {
      const entityWithInvalidUrl = { ...validEntity, url: 'not-a-url' }
      const result = entitySchema.safeParse(entityWithInvalidUrl)
      expect(result.success).toBe(false)
    })
  })

  describe('glossaryResponseSchema', () => {
    it('should validate response with entities array', () => {
      const validResponse = {
        entities: [
          {
            name: 'Entity 1',
            ontology: 'concept' as const,
            aliases: ['E1'],
            brief_explanation: 'First entity'
          },
          {
            name: 'Entity 2',
            ontology: 'person' as const,
            aliases: ['E2'],
            brief_explanation: 'Second entity'
          }
        ]
      }

      const result = glossaryResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.entities).toHaveLength(2)
        expect(result.data.entities[0].name).toBe('Entity 1')
        expect(result.data.entities[1].name).toBe('Entity 2')
      }
    })

    it('should validate empty entities array', () => {
      const emptyResponse = { entities: [] }
      const result = glossaryResponseSchema.safeParse(emptyResponse)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.entities).toHaveLength(0)
      }
    })

    it('should reject response without entities field', () => {
      const invalidResponse = { other_field: 'value' }
      const result = glossaryResponseSchema.safeParse(invalidResponse)
      expect(result.success).toBe(false)
    })

    it('should reject response with invalid entities', () => {
      const responseWithInvalidEntity = {
        entities: [
          {
            name: 'Valid Entity',
            ontology: 'concept' as const,
            aliases: ['Valid'],
            brief_explanation: 'Valid entity'
          },
          {
            // Missing required fields
            name: 'Invalid Entity'
          }
        ]
      }

      const result = glossaryResponseSchema.safeParse(responseWithInvalidEntity)
      expect(result.success).toBe(false)
    })
  })

  describe('glossaryPromptInputSchema - Entity Capping Features', () => {
    const validInput = {
      content: 'Document content to analyze for entities',
      documentId: '123e4567-e89b-12d3-a456-426614174000'
    }

    describe('basic validation', () => {
      it('should validate minimal valid input', () => {
        const result = glossaryPromptInputSchema.safeParse(validInput)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.content).toBe(validInput.content)
          expect(result.data.documentId).toBe(validInput.documentId)
        }
      })

      it('should reject empty content', () => {
        const invalidInput = { ...validInput, content: '' }
        const result = glossaryPromptInputSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })

      it('should reject invalid UUID for documentId', () => {
        const invalidInput = { ...validInput, documentId: 'not-a-uuid' }
        const result = glossaryPromptInputSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })

      it('should allow missing documentId for backward compatibility', () => {
        const inputWithoutDocId = { content: validInput.content }
        const result = glossaryPromptInputSchema.safeParse(inputWithoutDocId)
        expect(result.success).toBe(true)
      })
    })

    describe('max_entities parameter (entity capping)', () => {
      it('should validate positive max_entities', () => {
        const inputWithMaxEntities = { ...validInput, max_entities: 25 }
        const result = glossaryPromptInputSchema.safeParse(inputWithMaxEntities)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.max_entities).toBe(25)
        }
      })

      it('should allow max_entities to be undefined (uses default)', () => {
        const result = glossaryPromptInputSchema.safeParse(validInput)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.max_entities).toBeUndefined()
        }
      })

      it('should reject zero max_entities', () => {
        const invalidInput = { ...validInput, max_entities: 0 }
        const result = glossaryPromptInputSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })

      it('should reject negative max_entities', () => {
        const invalidInput = { ...validInput, max_entities: -5 }
        const result = glossaryPromptInputSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })

      it('should reject non-integer max_entities', () => {
        const invalidInput = { ...validInput, max_entities: 25.5 }
        const result = glossaryPromptInputSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })

      it('should reject non-number max_entities', () => {
        const invalidInput = { ...validInput, max_entities: 'twenty-five' }
        const result = glossaryPromptInputSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })
    })

    describe('existing_entities parameter (generate more mode)', () => {
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
          long_explanation: 'Detailed explanation',
          url: 'https://example.com/entity2'
        }
      ]

      it('should validate input with existing_entities array', () => {
        const inputWithExisting = { ...validInput, existing_entities: existingEntities }
        const result = glossaryPromptInputSchema.safeParse(inputWithExisting)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.existing_entities).toHaveLength(2)
          expect(result.data.existing_entities![0].name).toBe('Existing Entity 1')
          expect(result.data.existing_entities![1].name).toBe('Existing Entity 2')
        }
      })

      it('should validate input with empty existing_entities array', () => {
        const inputWithEmptyExisting = { ...validInput, existing_entities: [] }
        const result = glossaryPromptInputSchema.safeParse(inputWithEmptyExisting)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.existing_entities).toHaveLength(0)
        }
      })

      it('should allow existing_entities to be undefined', () => {
        const result = glossaryPromptInputSchema.safeParse(validInput)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.existing_entities).toBeUndefined()
        }
      })

      it('should reject invalid entity objects in existing_entities', () => {
        const invalidExistingEntities = [
          {
            name: 'Valid Entity',
            ontology: 'concept' as const,
            aliases: ['Valid'],
            brief_explanation: 'Valid entity'
          },
          {
            // Missing required fields
            name: 'Invalid Entity'
          }
        ]

        const inputWithInvalidExisting = { 
          ...validInput, 
          existing_entities: invalidExistingEntities 
        }
        const result = glossaryPromptInputSchema.safeParse(inputWithInvalidExisting)
        expect(result.success).toBe(false)
      })
    })

    describe('legacy already_entities parameter', () => {
      const alreadyEntities = [
        { name: 'Entity A', aliases: ['EA', 'A'] },
        { name: 'Entity B', aliases: ['EB'] }
      ]

      it('should validate legacy already_entities format', () => {
        const inputWithAlready = { ...validInput, already_entities: alreadyEntities }
        const result = glossaryPromptInputSchema.safeParse(inputWithAlready)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.already_entities).toHaveLength(2)
          expect(result.data.already_entities![0].name).toBe('Entity A')
          expect(result.data.already_entities![1].aliases).toEqual(['EB'])
        }
      })

      it('should allow already_entities to be undefined', () => {
        const result = glossaryPromptInputSchema.safeParse(validInput)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.already_entities).toBeUndefined()
        }
      })

      it('should reject already_entities with missing required fields', () => {
        const invalidAlreadyEntities = [
          { name: 'Valid Entity', aliases: ['Valid'] },
          { aliases: ['Missing Name'] } // Missing name field
        ]

        const inputWithInvalidAlready = { 
          ...validInput, 
          already_entities: invalidAlreadyEntities 
        }
        const result = glossaryPromptInputSchema.safeParse(inputWithInvalidAlready)
        expect(result.success).toBe(false)
      })
    })

    describe('combined entity capping parameters', () => {
      it('should validate input with both max_entities and existing_entities', () => {
        const combinedInput = {
          ...validInput,
          max_entities: 15,
          existing_entities: [
            {
              name: 'Existing Entity',
              ontology: 'concept' as const,
              aliases: ['EE'],
              brief_explanation: 'Existing entity'
            }
          ]
        }

        const result = glossaryPromptInputSchema.safeParse(combinedInput)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.max_entities).toBe(15)
          expect(result.data.existing_entities).toHaveLength(1)
        }
      })

      it('should validate input with max_entities, existing_entities, and already_entities', () => {
        const fullInput = {
          ...validInput,
          max_entities: 20,
          existing_entities: [
            {
              name: 'Full Entity',
              ontology: 'concept' as const,
              aliases: ['FE'],
              brief_explanation: 'Full entity'
            }
          ],
          already_entities: [
            { name: 'Legacy Entity', aliases: ['LE'] }
          ]
        }

        const result = glossaryPromptInputSchema.safeParse(fullInput)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.max_entities).toBe(20)
          expect(result.data.existing_entities).toHaveLength(1)
          expect(result.data.already_entities).toHaveLength(1)
        }
      })
    })
  })
})