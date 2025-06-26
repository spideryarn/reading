import '@testing-library/jest-dom'
import { 
  deduplicateEntities, 
  calculateEntityPositions, 
  sortEntitiesByPosition,
  stripPositionMetadata,
  mergeAndSortEntities,
  processEntitiesForProgressive
} from '../entity-position-tracking'
import type { Entity, EntityWithPosition } from '@/lib/types/entity'
import type { DocumentElement } from '@/lib/types/document'

// Mock document elements for testing
const mockDocumentElements: DocumentElement[] = [
  { id: 'elem-1', position: 1, content: 'This discusses the concept of assemblage and rhizome theory.' },
  { id: 'elem-2', position: 2, content: 'Anti-Oedipus is a fundamental text by Deleuze and Guattari.' },
  { id: 'elem-3', position: 3, content: 'The body without organs (BwO) is an abstract machine.' },
  { id: 'elem-4', position: 4, content: 'Multiplicité and multiplicity are key concepts here.' },
  { id: 'elem-5', position: 5, content: 'Deterritorialization and reterritorialization processes occur.' }
]

// Sample existing entities (simulating what's already in the glossary)
const existingEntities: Entity[] = [
  { 
    name: "Anti-Oedipus", 
    aliases: ["Anti-Œdipus"], 
    ontology: "reference",
    brief_explanation: "Foundational text by Deleuze and Guattari"
  },
  { 
    name: "assemblage", 
    aliases: ["agencement"], 
    ontology: "concept",
    brief_explanation: "A multiplicity of heterogeneous objects"
  },
  { 
    name: "body without organs", 
    aliases: ["BwO", "corps sans organes"], 
    ontology: "concept",
    brief_explanation: "A desiring machine without predetermined organization"
  },
  { 
    name: "abstract machine", 
    aliases: ["machine abstraite"], 
    ontology: "concept",
    brief_explanation: "A diagrammatic function that cuts across domains"
  },
  { 
    name: "rhizome", 
    aliases: ["rhizomatic"], 
    ontology: "concept",
    brief_explanation: "A non-hierarchical mode of knowledge and being"
  }
]

// Sample new entities that LLM might return (including duplicates)
const newEntitiesWithDuplicates: Entity[] = [
  { 
    name: "Rhizome", // Duplicate (case difference)
    aliases: ["rhizomatic structure"], 
    ontology: "concept",
    brief_explanation: "Non-hierarchical network structure"
  },
  { 
    name: "Assemblage", // Duplicate (case difference)
    aliases: ["assemblages"], 
    ontology: "concept",
    brief_explanation: "Heterogeneous components working together"
  },
  { 
    name: "multiplicité", // New entity
    aliases: ["multiplicity"], 
    ontology: "concept",
    brief_explanation: "French concept of multiplicity"
  },
  { 
    name: "Body Without Organs", // Duplicate (alias match)
    aliases: ["BwO"], 
    ontology: "concept",
    brief_explanation: "Alternative explanation"
  },
  { 
    name: "deterritorialization", // New entity
    aliases: ["déterritorialisation"], 
    ontology: "concept",
    brief_explanation: "Process of leaving territory"
  },
  { 
    name: "Anti-Oedipus", // Exact duplicate
    aliases: [], 
    ontology: "reference",
    brief_explanation: "Same book title"
  }
]

const newEntitiesNoDuplicates: Entity[] = [
  { 
    name: "plane of consistency", 
    aliases: ["plan de consistance"], 
    ontology: "concept",
    brief_explanation: "Field of immanence"
  },
  { 
    name: "line of flight", 
    aliases: ["ligne de fuite"], 
    ontology: "concept",
    brief_explanation: "Movement of deterritorialization"
  },
  { 
    name: "plateau", 
    aliases: ["continuous state"], 
    ontology: "concept",
    brief_explanation: "Continuous region of intensity"
  }
]

describe('Load More Functionality - Entity Processing', () => {
  describe('deduplicateEntities', () => {
    it('should remove exact duplicates by name', () => {
      const entities = [
        { name: "test", aliases: [], ontology: "concept", brief_explanation: "first" },
        { name: "test", aliases: [], ontology: "concept", brief_explanation: "second" }
      ]
      
      const result = deduplicateEntities(entities)
      expect(result).toHaveLength(1)
      expect(result[0].brief_explanation).toBe("first") // Keeps first occurrence
    })
    
    it('should remove case-insensitive duplicates', () => {
      const entities = [
        { name: "rhizome", aliases: [], ontology: "concept", brief_explanation: "lower" },
        { name: "Rhizome", aliases: [], ontology: "concept", brief_explanation: "upper" }
      ]
      
      const result = deduplicateEntities(entities)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("rhizome") // Keeps first occurrence
    })
    
    it('should allow distinct entities that share an alias', () => {
      const entities = [
        { name: "assemblage", aliases: ["agencement"], ontology: "concept", brief_explanation: "original" },
        { name: "different name", aliases: ["agencement"], ontology: "concept", brief_explanation: "duplicate?" }
      ]
      
      const result = deduplicateEntities(entities)
      expect(result).toHaveLength(2)
    })
    
    it('should handle empty aliases arrays', () => {
      const entities = [
        { name: "test1", aliases: [], ontology: "concept", brief_explanation: "first" },
        { name: "test2", aliases: [], ontology: "concept", brief_explanation: "second" }
      ]
      
      const result = deduplicateEntities(entities)
      expect(result).toHaveLength(2)
    })
  })
  
  describe('calculateEntityPositions', () => {
    it('should find first occurrence position for entities', () => {
      const entities: Entity[] = [
        { name: "assemblage", aliases: [], ontology: "concept", brief_explanation: "test" },
        { name: "nonexistent", aliases: [], ontology: "concept", brief_explanation: "test" }
      ]
      
      const result = calculateEntityPositions(entities, mockDocumentElements)
      
      expect(result[0].document_position).toBe(1) // Found in elem-1
      expect(result[1].document_position).toBe(null) // Not found
    })
    
    it('should match entities by aliases', () => {
      const entities: Entity[] = [
        { name: "body without organs", aliases: ["BwO"], ontology: "concept", brief_explanation: "test" }
      ]
      
      const result = calculateEntityPositions(entities, mockDocumentElements)
      expect(result[0].document_position).toBe(3) // Found BwO in elem-3
    })
    
    it('should be case-insensitive when matching', () => {
      const entities: Entity[] = [
        { name: "ASSEMBLAGE", aliases: [], ontology: "concept", brief_explanation: "test" }
      ]
      
      const result = calculateEntityPositions(entities, mockDocumentElements)
      expect(result[0].document_position).toBe(1) // Found despite case difference
    })
  })
  
  describe('sortEntitiesByPosition', () => {
    it('should sort entities by document position', () => {
      const entities: EntityWithPosition[] = [
        { name: "third", aliases: [], ontology: "concept", brief_explanation: "test", document_position: 3 },
        { name: "first", aliases: [], ontology: "concept", brief_explanation: "test", document_position: 1 },
        { name: "second", aliases: [], ontology: "concept", brief_explanation: "test", document_position: 2 }
      ]
      
      const result = sortEntitiesByPosition(entities)
      expect(result.map(e => e.name)).toEqual(["first", "second", "third"])
    })
    
    it('should place entities without positions at the end', () => {
      const entities: EntityWithPosition[] = [
        { name: "positioned", aliases: [], ontology: "concept", brief_explanation: "test", document_position: 2 },
        { name: "unpositioned", aliases: [], ontology: "concept", brief_explanation: "test", document_position: null }
      ]
      
      const result = sortEntitiesByPosition(entities)
      expect(result.map(e => e.name)).toEqual(["positioned", "unpositioned"])
    })
  })
  
  describe('processEntitiesForProgressive (Integration)', () => {
    it('should handle Load More scenario with mostly duplicates', () => {
      const result = processEntitiesForProgressive(
        existingEntities, 
        newEntitiesWithDuplicates, 
        mockDocumentElements
      )
      
      // Should only add 2 new entities (multiplicité and deterritorialization)
      // 4 duplicates should be filtered out
      expect(result).toHaveLength(7) // 5 existing + 2 new
      
      const entityNames = result.map(e => e.name)
      expect(entityNames).toContain("multiplicité")
      expect(entityNames).toContain("deterritorialization")
      expect(entityNames).not.toContain("Rhizome") // Duplicate filtered
      expect(entityNames).not.toContain("Assemblage") // Duplicate filtered
    })
    
    it('should handle Load More scenario with no duplicates', () => {
      const result = processEntitiesForProgressive(
        existingEntities, 
        newEntitiesNoDuplicates, 
        mockDocumentElements
      )
      
      // Should add all 3 new entities
      expect(result).toHaveLength(8) // 5 existing + 3 new
      
      const entityNames = result.map(e => e.name)
      expect(entityNames).toContain("plane of consistency")
      expect(entityNames).toContain("line of flight")
      expect(entityNames).toContain("plateau")
    })
    
    it('should maintain document order after merging', () => {
      const result = processEntitiesForProgressive(
        existingEntities, 
        newEntitiesNoDuplicates, 
        mockDocumentElements
      )
      
      // First few should be positioned by document order
      const positioned = result.filter(e => {
        // Find entities that appear in our mock document
        const searchTerms = [e.name, ...e.aliases]
        return mockDocumentElements.some(elem => 
          searchTerms.some(term => 
            elem.content?.toLowerCase().includes(term.toLowerCase())
          )
        )
      })
      
      // Should be sorted by appearance in document
      const firstPositioned = positioned[0]
      expect(["assemblage", "rhizome"].includes(firstPositioned.name)).toBe(true) // Both appear in elem-1
    })
    
    it('should handle edge case of all duplicates', () => {
      const allDuplicates: Entity[] = [
        { name: "rhizome", aliases: [], ontology: "concept", brief_explanation: "duplicate" },
        { name: "assemblage", aliases: [], ontology: "concept", brief_explanation: "duplicate" }
      ]
      
      const result = processEntitiesForProgressive(
        existingEntities, 
        allDuplicates, 
        mockDocumentElements
      )
      
      // Should have same count as existing (no new entities added)
      expect(result).toHaveLength(existingEntities.length)
    })
    
    it('should handle empty new entities array', () => {
      const result = processEntitiesForProgressive(
        existingEntities, 
        [], 
        mockDocumentElements
      )
      
      expect(result).toHaveLength(existingEntities.length)
      expect(result).toEqual(expect.arrayContaining(existingEntities))
    })
  })
})

describe('Load More Functionality - Simulated API Flow', () => {
  it('should simulate realistic Load More behavior that user experienced', () => {
    // Simulate what happens in fetchMoreGlossary function:
    // 1. API returns 20 entities (many duplicates)
    // 2. processEntitiesForProgressive filters duplicates
    // 3. UI sees no new entities added
    
    const simulatedAPIResponse = newEntitiesWithDuplicates // 6 entities, 4 duplicates
    const beforeCount = existingEntities.length // 5
    
    const result = processEntitiesForProgressive(
      existingEntities,
      simulatedAPIResponse,
      mockDocumentElements
    )
    
    const afterCount = result.length
    const newEntitiesAdded = afterCount - beforeCount
    
    // This simulates the console log: "Deduplication result: 5 + 6 → 7 (2 new entities added)"
    expect(beforeCount).toBe(5)
    expect(simulatedAPIResponse).toHaveLength(6)
    expect(afterCount).toBe(7)
    expect(newEntitiesAdded).toBe(2)
    
    // This explains why user saw "no effect" - most entities were duplicates
    const duplicatesFiltered = simulatedAPIResponse.length - newEntitiesAdded
    expect(duplicatesFiltered).toBe(4) // 4 out of 6 were duplicates
    
    console.log(`Simulated Load More: ${beforeCount} + ${simulatedAPIResponse.length} → ${afterCount} (${newEntitiesAdded} new entities added)`)
    console.log(`Duplicates filtered: ${duplicatesFiltered}/${simulatedAPIResponse.length}`)
  })
  
  it('should demonstrate why Load More appears broken when LLM returns all duplicates', () => {
    // Worst case: LLM ignores prompt and returns only duplicates
    const allDuplicatesFromLLM: Entity[] = [
      { name: "rhizome", aliases: [], ontology: "concept", brief_explanation: "duplicate" },
      { name: "assemblage", aliases: [], ontology: "concept", brief_explanation: "duplicate" },
      { name: "Anti-Oedipus", aliases: [], ontology: "reference", brief_explanation: "duplicate" },
      { name: "body without organs", aliases: [], ontology: "concept", brief_explanation: "duplicate" },
      { name: "abstract machine", aliases: [], ontology: "concept", brief_explanation: "duplicate" }
    ]
    
    const beforeCount = existingEntities.length
    const result = processEntitiesForProgressive(
      existingEntities,
      allDuplicatesFromLLM,
      mockDocumentElements
    )
    const afterCount = result.length
    
    // This would produce: "5 + 5 → 5 (0 new entities added)"
    expect(beforeCount).toBe(5)
    expect(allDuplicatesFromLLM).toHaveLength(5)
    expect(afterCount).toBe(5)
    expect(afterCount - beforeCount).toBe(0) // No new entities!
    
    // User sees button flash but no new entities appear
    console.log('All duplicates scenario:', `${beforeCount} + ${allDuplicatesFromLLM.length} → ${afterCount} (${afterCount - beforeCount} new entities added)`)
  })
})