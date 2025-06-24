// Entity types for glossary functionality
// Used across document processing, storage, and UI components

export interface Entity {
  name: string
  ontology: 'person' | 'place' | 'date' | 'theme' | 'event' | 
           'reference' | 'object' | 'organization' | 'concept' | 
           'definition' | 'other'
  aliases: string[]
  brief_explanation: string
  long_explanation?: string
  datetime?: string
  url?: string
  extra?: Record<string, unknown>
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