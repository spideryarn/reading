/**
 * Individual Entity Storage Service
 * 
 * This service provides utilities for storing glossary entities individually
 * in the document_enhancements table using entity-specific subtypes.
 * 
 * Each entity gets its own row with:
 * - type: 'glossary'
 * - subtype: '{ontology}:{normalized_name}' (e.g., 'person:Albert_Einstein')
 * - content: { entity: EntityData }
 * - ai_call_id: Individual tracking for each entity generation
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/types/database'
import type { Database } from '@/lib/types/database'
import type { Entity } from '@/lib/types/entity'
import { generateEntitySubtype, validateEntitySubtype } from '@/lib/utils/entity-subtype-generation'

/**
 * Store individual entity in document_enhancements table
 */
export async function storeIndividualEntity(
  supabase: SupabaseClient<Database>,
  documentId: string,
  aiCallId: string,
  entity: Entity
): Promise<void> {
  const subtype = generateEntitySubtype(entity)
  
  if (!validateEntitySubtype(subtype)) {
    throw new Error(`Invalid entity subtype generated: ${subtype}`)
  }
  
  const { error } = await supabase
    .from('document_enhancements')
    .upsert({
      document_id: documentId,
      ai_call_id: aiCallId,
      type: 'glossary',
      subtype: subtype,
      content: { entity } as unknown as Json
    }, {
      onConflict: 'document_id,type,subtype'
    })
  
  if (error) {
    throw new Error(`Failed to store entity "${entity.name}": ${error.message}`)
  }
}

/**
 * Store multiple entities individually with the same AI call ID
 */
export async function storeIndividualEntities(
  supabase: SupabaseClient<Database>,
  documentId: string,
  aiCallId: string,
  entities: Entity[]
): Promise<void> {
  // Process entities in parallel for better performance
  const storePromises = entities.map(entity => 
    storeIndividualEntity(supabase, documentId, aiCallId, entity)
  )
  
  await Promise.all(storePromises)
}

/**
 * Get all individual glossary entities for a document
 */
export async function getIndividualEntities(
  supabase: SupabaseClient<Database>,
  documentId: string
): Promise<Entity[]> {
  const { data, error } = await supabase
    .from('document_enhancements')
    .select('content, subtype')
    .eq('document_id', documentId)
    .eq('type', 'glossary')
    .neq('subtype', 'default') // Exclude old bulk storage
    .order('created_at', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch individual entities: ${error.message}`)
  }
  
  if (!data) {
    return []
  }
  
  const entities: Entity[] = []
  
  for (const row of data) {
    // Validate subtype is an entity subtype (not system subtype)
    if (!validateEntitySubtype(row.subtype)) {
      continue // Skip invalid/system subtypes
    }
    
    // Extract entity from content
    if (row.content && typeof row.content === 'object' && 'entity' in row.content) {
      const entity = row.content.entity as unknown as Entity
      entities.push(entity)
    }
  }
  
  return entities
}

/**
 * Get entities by ontology type
 */
export async function getEntitiesByOntology(
  supabase: SupabaseClient<Database>,
  documentId: string,
  ontology: string
): Promise<Entity[]> {
  const { data, error } = await supabase
    .from('document_enhancements')
    .select('content')
    .eq('document_id', documentId)
    .eq('type', 'glossary')
    .like('subtype', `${ontology}:%`)
    .order('created_at', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch entities by ontology: ${error.message}`)
  }
  
  if (!data) {
    return []
  }
  
  const entities: Entity[] = []
  
  for (const row of data) {
    if (row.content && typeof row.content === 'object' && 'entity' in row.content) {
      const entity = row.content.entity as unknown as Entity
      entities.push(entity)
    }
  }
  
  return entities
}

/**
 * Delete individual entity by subtype
 */
export async function deleteIndividualEntity(
  supabase: SupabaseClient<Database>,
  documentId: string,
  entity: Entity
): Promise<void> {
  const subtype = generateEntitySubtype(entity)
  
  const { error } = await supabase
    .from('document_enhancements')
    .delete()
    .eq('document_id', documentId)
    .eq('type', 'glossary')
    .eq('subtype', subtype)
  
  if (error) {
    throw new Error(`Failed to delete entity "${entity.name}": ${error.message}`)
  }
}

/**
 * Delete all individual entities for a document (but preserve bulk storage if it exists)
 */
export async function deleteAllIndividualEntities(
  supabase: SupabaseClient<Database>,
  documentId: string
): Promise<void> {
  const { error } = await supabase
    .from('document_enhancements')
    .delete()
    .eq('document_id', documentId)
    .eq('type', 'glossary')
    .neq('subtype', 'default') // Preserve bulk storage
  
  if (error) {
    throw new Error(`Failed to delete individual entities: ${error.message}`)
  }
}

/**
 * Check if entity already exists (by subtype)
 */
export async function entityExists(
  supabase: SupabaseClient<Database>,
  documentId: string,
  entity: Entity
): Promise<boolean> {
  const subtype = generateEntitySubtype(entity)
  
  const { data, error } = await supabase
    .from('document_enhancements')
    .select('id')
    .eq('document_id', documentId)
    .eq('type', 'glossary')
    .eq('subtype', subtype)
    .maybeSingle()
  
  if (error) {
    throw new Error(`Failed to check entity existence: ${error.message}`)
  }
  
  return data !== null
}

/**
 * Get count of individual entities for a document
 */
export async function getIndividualEntityCount(
  supabase: SupabaseClient<Database>,
  documentId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('document_enhancements')
    .select('*', { count: 'exact', head: true })
    .eq('document_id', documentId)
    .eq('type', 'glossary')
    .neq('subtype', 'default') // Exclude bulk storage
  
  if (error) {
    throw new Error(`Failed to count individual entities: ${error.message}`)
  }
  
  return count || 0
}