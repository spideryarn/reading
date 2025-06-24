// Position tracking utilities for glossary entities
// Provides document-order sorting based on first occurrence in text

import type { Entity, EntityWithPosition } from '@/lib/types/entity'
import type { DocumentElement } from '@/lib/types/document'

/**
 * Find the first occurrence of an entity in the document elements
 * Based on the existing findFirstOccurrence function in unified-left-pane.tsx
 * 
 * @param entity - The entity to search for
 * @param elements - Document elements to search through
 * @returns The element ID where the entity first appears, or null if not found
 */
export function findFirstOccurrence(entity: Entity, elements: DocumentElement[]): string | null {
  const searchTerms = [entity.name, ...entity.aliases]
  const sortedElements = [...elements].sort((a, b) => a.position - b.position)
  
  for (const element of sortedElements) {
    if (!element.content) continue
    const content = element.content.toLowerCase()
    
    for (const term of searchTerms) {
      if (content.includes(term.toLowerCase())) {
        return element.id
      }
    }
  }
  
  return null
}

/**
 * Calculate document positions for a batch of entities
 * 
 * @param entities - Array of entities to process
 * @param elements - Document elements to search through
 * @returns Array of entities with position information added
 */
export function calculateEntityPositions(
  entities: Entity[], 
  elements: DocumentElement[]
): EntityWithPosition[] {
  return entities.map(entity => {
    const elementId = findFirstOccurrence(entity, elements)
    if (elementId) {
      const element = elements.find(el => el.id === elementId)
      return {
        ...entity,
        document_position: element?.position || null
      }
    }
    return {
      ...entity,
      document_position: null
    }
  })
}

/**
 * Sort entities by their document position
 * Entities without positions are placed at the end
 * 
 * @param entities - Array of entities with position information
 * @returns Sorted array of entities
 */
export function sortEntitiesByPosition(entities: EntityWithPosition[]): EntityWithPosition[] {
  return [...entities].sort((a, b) => {
    // Entities with no position go to the end
    if (a.document_position === null && b.document_position === null) return 0
    if (a.document_position === null) return 1
    if (b.document_position === null) return -1
    
    return a.document_position - b.document_position
  })
}

/**
 * Remove position metadata from entities
 * Useful when returning entities to components that don't need position data
 * 
 * @param entities - Array of entities with position information
 * @returns Array of entities without position metadata
 */
export function stripPositionMetadata(entities: EntityWithPosition[]): Entity[] {
  return entities.map(({ document_position: _document_position, ...entity }) => entity)
}

/**
 * Merge new entities with existing ones and sort by document position
 * This is the main function for progressive entity loading
 * 
 * @param existingEntities - Currently loaded entities
 * @param newEntities - New entities from LLM generation
 * @param elements - Document elements for position calculation
 * @returns Merged and sorted entities in document order
 */
export function mergeAndSortEntities(
  existingEntities: Entity[], 
  newEntities: Entity[], 
  elements: DocumentElement[]
): Entity[] {
  // Calculate positions for all entities
  const entitiesWithPositions = calculateEntityPositions([...existingEntities, ...newEntities], elements)
  
  // Sort by document position
  const sortedEntities = sortEntitiesByPosition(entitiesWithPositions)
  
  // Remove position metadata before returning
  return stripPositionMetadata(sortedEntities)
}

/**
 * Deduplicate entities by name and aliases
 * Keeps the first occurrence of each unique entity
 * 
 * @param entities - Array of entities to deduplicate
 * @returns Deduplicated array of entities
 */
export function deduplicateEntities(entities: Entity[]): Entity[] {
  const seen = new Set<string>()
  const deduplicated: Entity[] = []
  
  for (const entity of entities) {
    const entityKey = entity.name.toLowerCase()
    const aliasKeys = entity.aliases.map(alias => alias.toLowerCase())
    
    // Check if we've seen this entity name or any of its aliases
    const isDuplicate = seen.has(entityKey) || aliasKeys.some(alias => seen.has(alias))
    
    if (!isDuplicate) {
      // Mark this entity's name and aliases as seen
      seen.add(entityKey)
      aliasKeys.forEach(alias => seen.add(alias))
      deduplicated.push(entity)
    }
  }
  
  return deduplicated
}

/**
 * Complete entity processing pipeline for progressive loading
 * Handles merging, deduplication, and position-based sorting
 * 
 * @param existingEntities - Currently loaded entities
 * @param newEntities - New entities from LLM generation
 * @param elements - Document elements for position calculation
 * @returns Processed entities ready for display
 */
export function processEntitiesForProgressive(
  existingEntities: Entity[], 
  newEntities: Entity[], 
  elements: DocumentElement[]
): Entity[] {
  // First merge and sort by position
  const mergedEntities = mergeAndSortEntities(existingEntities, newEntities, elements)
  
  // Then deduplicate to remove any duplicates
  return deduplicateEntities(mergedEntities)
}