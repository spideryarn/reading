// Entity types for glossary functionality
// Used across document processing, storage, and UI components

export interface Entity {
  name: string
  ontology: 'person' | 'place' | 'date' | 'theme' | 'event' | 
           'reference' | 'object' | 'organization' | 'concept' | 
           'definition' | 'other'
  aliases: string[]
  brief_explanation: string
  long_explanation?: string | undefined
  datetime?: string | undefined
  url?: string | undefined
  extra?: Record<string, unknown> | undefined
  // Optional scoring fields for difficulty and centrality
  difficulty?: number | undefined // 0-1 scale: how likely someone will know this (0=common, 1=expert knowledge)
  centrality?: number | undefined // 0-1 scale: how important to understanding document (0=minor, 1=central)
}

// Entity with position information for document ordering
export interface EntityWithPosition extends Entity {
  document_position: number | null
}

// Entity with multiple position occurrences (future enhancement)
export interface EntityWithOccurrences extends Entity {
  occurrences: Array<{
    elementId: string
    position: number
    context?: string
  }>
}