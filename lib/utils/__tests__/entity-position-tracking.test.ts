// Tests for entity position tracking utilities
// Validates document-order sorting based on first occurrence in text

import { 
  findFirstOccurrence, 
  calculateEntityPositions, 
  sortEntitiesByPosition,
  stripPositionMetadata,
  mergeAndSortEntities,
  deduplicateEntities,
  processEntitiesForProgressive
} from '../entity-position-tracking'
import type { Entity, EntityWithPosition } from '@/lib/types/entity'
import type { DocumentElement } from '@/lib/types/document'

describe('Entity Position Tracking', () => {
  // Mock document elements for testing
  const mockElements: DocumentElement[] = [
    {
      id: 'el-1',
      type: 'p',
      position: 100,
      content: 'This document discusses machine learning and artificial intelligence.',
      children: []
    },
    {
      id: 'el-2', 
      type: 'p',
      position: 200,
      content: 'Neural networks are a key component of modern AI systems.',
      children: []
    },
    {
      id: 'el-3',
      type: 'p', 
      position: 300,
      content: 'Deep learning techniques enable complex pattern recognition.',
      children: []
    },
    {
      id: 'el-4',
      type: 'p',
      position: 400,
      content: 'The transformer architecture revolutionized natural language processing.',
      children: []
    }
  ]

  const mockEntities: Entity[] = [
    {
      name: 'Neural Networks',
      ontology: 'concept',
      aliases: ['neural nets', 'artificial neural networks'],
      brief_explanation: 'Computing systems inspired by biological neural networks.'
    },
    {
      name: 'Machine Learning',
      ontology: 'concept',
      aliases: ['ML'],
      brief_explanation: 'A subset of artificial intelligence focusing on learning from data.'
    },
    {
      name: 'Transformer Architecture',
      ontology: 'concept',
      aliases: ['transformers'],
      brief_explanation: 'A neural network architecture for processing sequential data.'
    }
  ]

  describe('findFirstOccurrence', () => {
    it('should find entity by primary name', () => {
      const entity = mockEntities[0] // Neural Networks
      const result = findFirstOccurrence(entity, mockElements)
      expect(result).toBe('el-2') // Found in second element
    })

    it('should find entity by alias', () => {
      const entity = mockEntities[1] // Machine Learning (has alias "ML")
      const mlEntity = { ...entity, name: 'Unknown', aliases: ['machine learning'] }
      const result = findFirstOccurrence(mlEntity, mockElements)
      expect(result).toBe('el-1') // Found by alias in first element
    })

    it('should be case insensitive', () => {
      const entity = {
        name: 'NEURAL NETWORKS',
        ontology: 'concept' as const,
        aliases: ['NEURAL NETS'],
        brief_explanation: 'Test entity'
      }
      const result = findFirstOccurrence(entity, mockElements)
      expect(result).toBe('el-2')
    })

    it('should return null when entity not found', () => {
      const entity = {
        name: 'Quantum Computing',
        ontology: 'concept' as const,
        aliases: ['quantum computers'],
        brief_explanation: 'Not in this document'
      }
      const result = findFirstOccurrence(entity, mockElements)
      expect(result).toBeNull()
    })

    it('should handle elements without content', () => {
      const elementsWithEmpty: DocumentElement[] = [
        { id: 'empty', type: 'div', position: 50, content: '', children: [] },
        ...mockElements
      ]
      
      const entity = mockEntities[0]
      const result = findFirstOccurrence(entity, elementsWithEmpty)
      expect(result).toBe('el-2') // Should skip empty element
    })

    it('should return first occurrence when entity appears multiple times', () => {
      const elementsWithDuplicates: DocumentElement[] = [
        {
          id: 'first',
          type: 'p',
          position: 50,
          content: 'Neural networks are important.',
          children: []
        },
        {
          id: 'second', 
          type: 'p',
          position: 150,
          content: 'Neural networks process information.',
          children: []
        }
      ]

      const entity = mockEntities[0] // Neural Networks
      const result = findFirstOccurrence(entity, elementsWithDuplicates)
      expect(result).toBe('first') // Should return first occurrence
    })
  })

  describe('calculateEntityPositions', () => {
    it('should add position information to entities', () => {
      const result = calculateEntityPositions(mockEntities, mockElements)
      
      expect(result).toHaveLength(3)
      expect(result[0].document_position).toBe(200) // Neural Networks in el-2
      expect(result[1].document_position).toBe(100) // Machine Learning in el-1  
      expect(result[2].document_position).toBe(400) // Transformer in el-4
    })

    it('should set null position for entities not found', () => {
      const entitiesWithMissing: Entity[] = [
        ...mockEntities,
        {
          name: 'Quantum Computing',
          ontology: 'concept',
          aliases: [],
          brief_explanation: 'Not found entity'
        }
      ]

      const result = calculateEntityPositions(entitiesWithMissing, mockElements)
      expect(result[3].document_position).toBeNull()
    })

    it('should preserve all entity properties', () => {
      const result = calculateEntityPositions([mockEntities[0]], mockElements)
      const entity = result[0]
      
      expect(entity.name).toBe(mockEntities[0].name)
      expect(entity.ontology).toBe(mockEntities[0].ontology)
      expect(entity.aliases).toEqual(mockEntities[0].aliases)
      expect(entity.brief_explanation).toBe(mockEntities[0].brief_explanation)
    })
  })

  describe('sortEntitiesByPosition', () => {
    it('should sort entities by document position', () => {
      const entitiesWithPositions: EntityWithPosition[] = [
        { ...mockEntities[0], document_position: 300 },
        { ...mockEntities[1], document_position: 100 }, 
        { ...mockEntities[2], document_position: 200 }
      ]

      const result = sortEntitiesByPosition(entitiesWithPositions)
      expect(result[0].document_position).toBe(100)
      expect(result[1].document_position).toBe(200)
      expect(result[2].document_position).toBe(300)
    })

    it('should place entities with null positions at the end', () => {
      const entitiesWithPositions: EntityWithPosition[] = [
        { ...mockEntities[0], document_position: 200 },
        { ...mockEntities[1], document_position: null },
        { ...mockEntities[2], document_position: 100 }
      ]

      const result = sortEntitiesByPosition(entitiesWithPositions)
      expect(result[0].document_position).toBe(100)
      expect(result[1].document_position).toBe(200)
      expect(result[2].document_position).toBeNull()
    })

    it('should handle all null positions gracefully', () => {
      const entitiesWithPositions: EntityWithPosition[] = [
        { ...mockEntities[0], document_position: null },
        { ...mockEntities[1], document_position: null }
      ]

      const result = sortEntitiesByPosition(entitiesWithPositions)
      expect(result).toHaveLength(2)
      expect(result[0].document_position).toBeNull()
      expect(result[1].document_position).toBeNull()
    })
  })

  describe('stripPositionMetadata', () => {
    it('should remove document_position field', () => {
      const entitiesWithPositions: EntityWithPosition[] = [
        { ...mockEntities[0], document_position: 100 }
      ]

      const result = stripPositionMetadata(entitiesWithPositions)
      expect(result[0]).not.toHaveProperty('document_position')
      expect(result[0].name).toBe(mockEntities[0].name)
    })
  })

  describe('deduplicateEntities', () => {
    it('should remove duplicate entities by name', () => {
      const duplicateEntities: Entity[] = [
        mockEntities[0],
        { ...mockEntities[0], brief_explanation: 'Different explanation' },
        mockEntities[1]
      ]

      const result = deduplicateEntities(duplicateEntities)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe(mockEntities[0].name)
      expect(result[1].name).toBe(mockEntities[1].name)
    })

    it('should remove entities with duplicate aliases', () => {
      const entitiesWithDuplicateAliases: Entity[] = [
        {
          name: 'Artificial Intelligence',
          ontology: 'concept',
          aliases: ['AI'],
          brief_explanation: 'First entity'
        },
        {
          name: 'Different Name',
          ontology: 'concept', 
          aliases: ['AI'], // Same alias
          brief_explanation: 'Second entity'
        }
      ]

      const result = deduplicateEntities(entitiesWithDuplicateAliases)
      expect(result).toHaveLength(1)
    })

    it('should be case insensitive for deduplication', () => {
      const duplicateEntities: Entity[] = [
        {
          name: 'Neural Networks',
          ontology: 'concept',
          aliases: [],
          brief_explanation: 'First'
        },
        {
          name: 'NEURAL NETWORKS',
          ontology: 'concept',
          aliases: [],
          brief_explanation: 'Second'
        }
      ]

      const result = deduplicateEntities(duplicateEntities)
      expect(result).toHaveLength(1)
    })
  })

  describe('mergeAndSortEntities', () => {
    it('should merge existing and new entities and sort by position', () => {
      const existing = [mockEntities[0]] // Neural Networks (position 200)
      const newEntities = [mockEntities[1]] // Machine Learning (position 100)

      const result = mergeAndSortEntities(existing, newEntities, mockElements)
      
      expect(result).toHaveLength(2)
      // Should be sorted: Machine Learning (100) first, Neural Networks (200) second
      expect(result[0].name).toBe('Machine Learning')
      expect(result[1].name).toBe('Neural Networks')
    })

    it('should handle empty existing entities', () => {
      const result = mergeAndSortEntities([], mockEntities, mockElements)
      expect(result).toHaveLength(3)
    })

    it('should handle empty new entities', () => {
      const result = mergeAndSortEntities(mockEntities, [], mockElements)
      expect(result).toHaveLength(3)
    })
  })

  describe('processEntitiesForProgressive', () => {
    it('should merge, sort, and deduplicate entities', () => {
      const existing = [mockEntities[0]] // Neural Networks
      const newEntities = [
        mockEntities[1], // Machine Learning  
        mockEntities[0]  // Duplicate Neural Networks
      ]

      const result = processEntitiesForProgressive(existing, newEntities, mockElements)
      
      expect(result).toHaveLength(2) // Should deduplicate
      expect(result[0].name).toBe('Machine Learning') // Should be first by position
      expect(result[1].name).toBe('Neural Networks')
    })

    it('should handle complex scenarios with missing entities', () => {
      const existing = [mockEntities[0]]
      const newEntities = [
        {
          name: 'Missing Entity',
          ontology: 'concept' as const,
          aliases: [],
          brief_explanation: 'Not found in document'
        },
        mockEntities[1]
      ]

      const result = processEntitiesForProgressive(existing, newEntities, mockElements)
      
      expect(result).toHaveLength(3)
      // Machine Learning (100) first, Neural Networks (200) second, Missing Entity (null) last
      expect(result[0].name).toBe('Machine Learning')
      expect(result[1].name).toBe('Neural Networks')
      expect(result[2].name).toBe('Missing Entity')
    })
  })
})