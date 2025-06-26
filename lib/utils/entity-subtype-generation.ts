/**
 * Entity Subtype Generation Utilities
 * 
 * This module provides utilities for generating consistent subtype identifiers
 * for individual entity storage in the document_enhancements table.
 * 
 * Format: {ontology}:{normalized_name}
 * Examples: person:Albert_Einstein, concept:Machine_Learning, organization:OpenAI
 */

import type { Entity } from '@/lib/types/entity'

/**
 * Normalize entity name for use in subtype
 * Handles special characters, spaces, and Unicode for consistent identifiers
 */
export function normalizeEntityName(name: string): string {
  return name
    // Remove leading/trailing whitespace
    .trim()
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Remove or replace problematic characters for database identifiers
    .replace(/[^\w\-_.]/g, '')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Ensure we have something left
    || 'unnamed_entity'
}

/**
 * Generate subtype identifier from entity
 * Format: {ontology}:{normalized_name}
 */
export function generateEntitySubtype(entity: Entity): string {
  const normalizedName = normalizeEntityName(entity.name)
  return `${entity.ontology}:${normalizedName}`
}

/**
 * Parse subtype back into ontology and name components
 * Returns null if subtype doesn't match expected format
 */
export function parseEntitySubtype(subtype: string): { ontology: string; normalizedName: string } | null {
  const colonIndex = subtype.indexOf(':')
  if (colonIndex === -1) {
    return null
  }
  
  const ontology = subtype.substring(0, colonIndex)
  const normalizedName = subtype.substring(colonIndex + 1)
  
  if (!ontology || !normalizedName) {
    return null
  }
  
  return { ontology, normalizedName }
}

/**
 * Validate that a subtype is valid for entity storage
 * Checks format and ensures no collisions with system subtypes
 */
export function validateEntitySubtype(subtype: string): boolean {
  // Must not be system subtypes
  if (subtype === 'default' || subtype === 'multi-dimensional') {
    return false
  }
  
  // Must match expected format
  const parsed = parseEntitySubtype(subtype)
  return parsed !== null
}

/**
 * Generate all possible subtypes for an entity (including aliases)
 * Used for collision detection when storing entities
 */
export function generateAllEntitySubtypes(entity: Entity): string[] {
  const subtypes = [generateEntitySubtype(entity)]
  
  // Add subtypes for aliases
  for (const alias of entity.aliases) {
    const aliasEntity = { ...entity, name: alias }
    subtypes.push(generateEntitySubtype(aliasEntity))
  }
  
  return subtypes
}