import {
  normalizeEntityName,
  generateEntitySubtype,
  parseEntitySubtype,
  validateEntitySubtype,
  generateAllEntitySubtypes,
} from '../entity-subtype-generation'
import type { Entity } from '@/lib/types/entity'

describe('Entity Subtype Generation', () => {
  describe('normalizeEntityName', () => {
    it('should handle basic names', () => {
      expect(normalizeEntityName('Albert Einstein')).toBe('Albert_Einstein')
      expect(normalizeEntityName('Machine Learning')).toBe('Machine_Learning')
    })

    it('should handle special characters', () => {
      expect(normalizeEntityName('COVID-19')).toBe('COVID-19')
      expect(normalizeEntityName('U.S.A.')).toBe('U.S.A.')
      expect(normalizeEntityName('AT&T')).toBe('ATT')
    })

    it('should handle multiple spaces', () => {
      expect(normalizeEntityName('New   York   City')).toBe('New_York_City')
      expect(normalizeEntityName('  Albert Einstein  ')).toBe('Albert_Einstein')
    })

    it('should handle Unicode characters', () => {
      expect(normalizeEntityName('Café')).toBe('Caf')
      expect(normalizeEntityName('François')).toBe('Franois')
    })

    it('should handle edge cases', () => {
      expect(normalizeEntityName('')).toBe('unnamed_entity')
      expect(normalizeEntityName('   ')).toBe('unnamed_entity')
      expect(normalizeEntityName('___')).toBe('unnamed_entity')
    })

    it('should collapse multiple underscores', () => {
      expect(normalizeEntityName('word_with___many____underscores')).toBe('word_with_many_underscores')
    })
  })

  describe('generateEntitySubtype', () => {
    it('should generate correct subtype format', () => {
      const entity: Entity = {
        name: 'Albert Einstein',
        ontology: 'person',
        aliases: [],
        brief_explanation: 'Famous physicist'
      }
      
      expect(generateEntitySubtype(entity)).toBe('person:Albert_Einstein')
    })

    it('should handle different ontologies', () => {
      const personEntity: Entity = {
        name: 'John Doe',
        ontology: 'person',
        aliases: [],
        brief_explanation: 'A person'
      }
      
      const conceptEntity: Entity = {
        name: 'Machine Learning',
        ontology: 'concept',
        aliases: [],
        brief_explanation: 'AI concept'
      }
      
      expect(generateEntitySubtype(personEntity)).toBe('person:John_Doe')
      expect(generateEntitySubtype(conceptEntity)).toBe('concept:Machine_Learning')
    })

    it('should handle complex names', () => {
      const entity: Entity = {
        name: 'World Health Organization (WHO)',
        ontology: 'organization',
        aliases: [],
        brief_explanation: 'Global health agency'
      }
      
      expect(generateEntitySubtype(entity)).toBe('organization:World_Health_Organization_WHO')
    })
  })

  describe('parseEntitySubtype', () => {
    it('should parse valid subtypes', () => {
      const result = parseEntitySubtype('person:Albert_Einstein')
      expect(result).toEqual({
        ontology: 'person',
        normalizedName: 'Albert_Einstein'
      })
    })

    it('should parse different ontologies', () => {
      expect(parseEntitySubtype('concept:Machine_Learning')).toEqual({
        ontology: 'concept',
        normalizedName: 'Machine_Learning'
      })
      
      expect(parseEntitySubtype('organization:OpenAI')).toEqual({
        ontology: 'organization',
        normalizedName: 'OpenAI'
      })
    })

    it('should handle invalid formats', () => {
      expect(parseEntitySubtype('invalid')).toBeNull()
      expect(parseEntitySubtype('')).toBeNull()
      expect(parseEntitySubtype(':')).toBeNull()
      expect(parseEntitySubtype('person:')).toBeNull()
      expect(parseEntitySubtype(':Einstein')).toBeNull()
    })

    it('should handle colons in names', () => {
      const result = parseEntitySubtype('event:COVID-19:_Timeline')
      expect(result).toEqual({
        ontology: 'event',
        normalizedName: 'COVID-19:_Timeline'
      })
    })
  })

  describe('validateEntitySubtype', () => {
    it('should validate correct entity subtypes', () => {
      expect(validateEntitySubtype('person:Albert_Einstein')).toBe(true)
      expect(validateEntitySubtype('concept:Machine_Learning')).toBe(true)
      expect(validateEntitySubtype('organization:OpenAI')).toBe(true)
    })

    it('should reject system subtypes', () => {
      expect(validateEntitySubtype('default')).toBe(false)
      expect(validateEntitySubtype('multi-dimensional')).toBe(false)
    })

    it('should reject invalid formats', () => {
      expect(validateEntitySubtype('invalid')).toBe(false)
      expect(validateEntitySubtype('')).toBe(false)
      expect(validateEntitySubtype(':')).toBe(false)
    })
  })

  describe('generateAllEntitySubtypes', () => {
    it('should generate subtypes for entity and aliases', () => {
      const entity: Entity = {
        name: 'Albert Einstein',
        ontology: 'person',
        aliases: ['Einstein', 'A. Einstein'],
        brief_explanation: 'Famous physicist'
      }
      
      const subtypes = generateAllEntitySubtypes(entity)
      expect(subtypes).toEqual([
        'person:Albert_Einstein',
        'person:Einstein',
        'person:A._Einstein'
      ])
    })

    it('should handle entities with no aliases', () => {
      const entity: Entity = {
        name: 'Machine Learning',
        ontology: 'concept',
        aliases: [],
        brief_explanation: 'AI concept'
      }
      
      const subtypes = generateAllEntitySubtypes(entity)
      expect(subtypes).toEqual(['concept:Machine_Learning'])
    })

    it('should handle duplicate aliases', () => {
      const entity: Entity = {
        name: 'WHO',
        ontology: 'organization',
        aliases: ['WHO', 'World Health Organization', 'WHO'],
        brief_explanation: 'Global health agency'
      }
      
      const subtypes = generateAllEntitySubtypes(entity)
      expect(subtypes).toEqual([
        'organization:WHO',
        'organization:WHO',
        'organization:World_Health_Organization',
        'organization:WHO'
      ])
      
      // Note: This test shows we get duplicates - caller should dedupe if needed
    })
  })
})