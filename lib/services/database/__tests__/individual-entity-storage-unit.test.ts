/**
 * Unit Tests for Individual Entity Storage Service
 * 
 * These tests focus on testing the utility functions and logic without database dependencies.
 * For full integration tests with RLS, see individual-entity-storage.test.ts
 */

import type { Entity } from '@/lib/types/entity'
import { generateEntitySubtype, validateEntitySubtype } from '@/lib/utils/entity-subtype-generation'

describe('Individual Entity Storage Service - Unit Tests', () => {
  const createTestEntity = (name: string, ontology: string = 'person'): Entity => ({
    name,
    ontology: ontology as any,
    aliases: [`${name} Alias`],
    brief_explanation: `Brief explanation for ${name}`,
    long_explanation: `Long explanation for ${name}`
  })

  describe('Entity Subtype Generation Integration', () => {
    it('should generate correct subtypes for different entity types', () => {
      const entities = [
        createTestEntity('Albert Einstein', 'person'),
        createTestEntity('Machine Learning', 'concept'),
        createTestEntity('World Health Organization (WHO)', 'organization'),
        createTestEntity('COVID-19', 'event')
      ]

      const subtypes = entities.map(generateEntitySubtype)
      
      expect(subtypes).toEqual([
        'person:Albert_Einstein',
        'concept:Machine_Learning', 
        'organization:World_Health_Organization_WHO',
        'event:COVID-19'
      ])

      // All should be valid entity subtypes
      subtypes.forEach(subtype => {
        expect(validateEntitySubtype(subtype)).toBe(true)
      })
    })

    it('should handle entities with special characters in names', () => {
      const entities = [
        createTestEntity('AT&T Corporation', 'organization'),
        createTestEntity('U.S.A.', 'place'),
        createTestEntity('3.14159 (Pi)', 'concept')
      ]

      const subtypes = entities.map(generateEntitySubtype)
      
      expect(subtypes).toEqual([
        'organization:ATT_Corporation',
        'place:U.S.A.',
        'concept:3.14159_Pi'
      ])

      subtypes.forEach(subtype => {
        expect(validateEntitySubtype(subtype)).toBe(true)
      })
    })

    it('should reject system subtypes', () => {
      expect(validateEntitySubtype('default')).toBe(false)
      expect(validateEntitySubtype('multi-dimensional')).toBe(false)
    })

    it('should handle Unicode characters safely', () => {
      const entities = [
        createTestEntity('François Mitterrand', 'person'),
        createTestEntity('Naïve Bayes', 'concept'),
        createTestEntity('Zürich', 'place')
      ]

      const subtypes = entities.map(generateEntitySubtype)
      
      // Unicode characters should be stripped/normalized
      expect(subtypes).toEqual([
        'person:Franois_Mitterrand',
        'concept:Nave_Bayes',
        'place:Zrich'
      ])

      subtypes.forEach(subtype => {
        expect(validateEntitySubtype(subtype)).toBe(true)
      })
    })
  })

  describe('Entity Storage Data Structure', () => {
    it('should create correct content structure for individual entity storage', () => {
      const entity = createTestEntity('Albert Einstein', 'person')
      const expectedContent = { entity }
      
      // This is the structure we expect to store in document_enhancements.content
      expect(expectedContent).toEqual({
        entity: {
          name: 'Albert Einstein',
          ontology: 'person',
          aliases: ['Albert Einstein Alias'],
          brief_explanation: 'Brief explanation for Albert Einstein',
          long_explanation: 'Long explanation for Albert Einstein'
        }
      })
    })

    it('should handle entities with optional fields', () => {
      const entity: Entity = {
        name: 'Albert Einstein',
        ontology: 'person',
        aliases: ['Einstein'],
        brief_explanation: 'Famous physicist',
        long_explanation: 'Developed theory of relativity',
        datetime: '1879-1955',
        url: 'https://en.wikipedia.org/wiki/Albert_Einstein',
        extra: { birthPlace: 'Germany' }
      }
      
      const expectedContent = { entity }
      
      expect(expectedContent.entity).toHaveProperty('datetime', '1879-1955')
      expect(expectedContent.entity).toHaveProperty('url', 'https://en.wikipedia.org/wiki/Albert_Einstein')
      expect(expectedContent.entity).toHaveProperty('extra', { birthPlace: 'Germany' })
    })
  })

  describe('Bulk vs Individual Storage Differentiation', () => {
    it('should distinguish between bulk and individual storage subtypes', () => {
      // Bulk storage uses 'default' subtype
      const bulkSubtype = 'default'
      expect(validateEntitySubtype(bulkSubtype)).toBe(false)
      
      // Individual storage uses entity-specific subtypes
      const individualSubtypes = [
        'person:Albert_Einstein',
        'concept:Machine_Learning',
        'organization:OpenAI'
      ]
      
      individualSubtypes.forEach(subtype => {
        expect(validateEntitySubtype(subtype)).toBe(true)
      })
    })

    it('should handle query filtering logic', () => {
      // SQL-like logic for filtering individual entities:
      // .eq('type', 'glossary')
      // .neq('subtype', 'default')  // Exclude bulk storage
      
      const allSubtypes = [
        'default',  // Bulk storage - should be excluded
        'multi-dimensional',  // System subtype - should be excluded
        'person:Albert_Einstein',  // Individual entity - should be included
        'concept:Machine_Learning',  // Individual entity - should be included
        'organization:OpenAI'  // Individual entity - should be included
      ]
      
      const individualSubtypes = allSubtypes.filter(subtype => 
        validateEntitySubtype(subtype)
      )
      
      expect(individualSubtypes).toEqual([
        'person:Albert_Einstein',
        'concept:Machine_Learning',
        'organization:OpenAI'
      ])
    })
  })

  describe('Ontology Filtering Logic', () => {
    it('should support ontology-based filtering with LIKE patterns', () => {
      const subtypes = [
        'person:Albert_Einstein',
        'person:Marie_Curie',
        'concept:Machine_Learning',
        'concept:Quantum_Physics',
        'organization:MIT',
        'place:Silicon_Valley'
      ]
      
      // SQL-like logic: .like('subtype', 'person:%')
      const personSubtypes = subtypes.filter(subtype => 
        subtype.startsWith('person:')
      )
      
      expect(personSubtypes).toEqual([
        'person:Albert_Einstein',
        'person:Marie_Curie'
      ])
      
      // SQL-like logic: .like('subtype', 'concept:%')
      const conceptSubtypes = subtypes.filter(subtype => 
        subtype.startsWith('concept:')
      )
      
      expect(conceptSubtypes).toEqual([
        'concept:Machine_Learning',
        'concept:Quantum_Physics'
      ])
    })
  })
})