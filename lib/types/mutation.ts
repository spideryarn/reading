import { DocumentElement } from './document'

/**
 * Represents a reversible transformation that can be applied to a document.
 * Each mutation includes both forward and reverse operations for full reversibility.
 */
export interface Mutation {
  /** Unique identifier for this mutation instance */
  id: string
  
  /** Type of mutation for categorisation and UI display */
  type: 'insert-headings' | 'summarize-paragraphs' | 'filter-theme' | string
  
  /** List of transformations to apply when activating this mutation */
  forward: DocumentTransform[]
  
  /** List of transformations to apply when reverting this mutation */
  reverse: DocumentTransform[]
  
  /** Optional metadata for debugging, UI display, or future features */
  metadata?: {
    description?: string
    timestamp?: number
    originalHeadingCount?: number
    generatedHeadingCount?: number
    [key: string]: string | number | boolean | undefined
  }
}

/**
 * Represents a single transformation operation on a document element.
 * These are the atomic operations that make up a mutation.
 */
export interface DocumentTransform {
  /** The type of transformation to perform */
  action: 'insert' | 'replace' | 'remove' | 'modify'
  
  /** ID of the element to modify or remove (not used for insertions) */
  targetId?: string
  
  /** 
   * ID of the existing element after which the new content should be inserted.
   * Only used for insert actions with 'after' insertion semantics.
   * The new element will appear immediately after the element with this ID.
   * Example: insertNewAfterExistingId: 'para-123' → new content appears after para-123
   */
  insertNewAfterExistingId?: string
  
  /** 
   * ID of the existing element before which the new content should be inserted.
   * Only used for insert actions with 'before' insertion semantics.
   * The new element will appear immediately before the element with this ID.
   * Example: insertNewBeforeExistingId: 'para-123' → new content appears before para-123
   */
  insertNewBeforeExistingId?: string
  
  /** New content to insert or replace with */
  content?: Partial<DocumentElement>
  
  /** Original content for reversibility (stored in reverse transforms) */
  originalContent?: Partial<DocumentElement>
  
  /** Attributes to modify (only for modify actions) */
  attributes?: Record<string, string>
}

/**
 * Tracks the current state of mutations in the application.
 * In v1, only supports a single active mutation at a time.
 */
export interface MutationState {
  /** Currently active mutation (null if original document is shown) */
  activeMutation: Mutation | null
  
  /** History of all mutations for this document (for debugging/future features) */
  mutationHistory: Mutation[]
  
  /** Index in history of current mutation (-1 if none active) */
  currentMutationIndex: number
}

/**
 * Result of attempting to apply a mutation
 */
export interface MutationResult {
  success: boolean
  error?: string
  /** Updated document elements after mutation */
  document?: DocumentElement[]
  /** Details about what was changed (for debugging) */
  changes?: {
    inserted: number
    replaced: number
    removed: number
    modified: number
  }
}

/**
 * Type guard to check if a transform is an insert action (either before or after)
 */
export function isInsertTransform(transform: DocumentTransform): transform is DocumentTransform & { 
  action: 'insert'
  content: Partial<DocumentElement>
} & (
  | { insertNewAfterExistingId: string }
  | { insertNewBeforeExistingId: string }
) {
  return transform.action === 'insert' && 
         !!transform.content && 
         (!!transform.insertNewAfterExistingId || !!transform.insertNewBeforeExistingId)
}

/**
 * Type guard to check if a transform is an insert-after action
 */
export function isInsertAfterTransform(transform: DocumentTransform): transform is DocumentTransform & { 
  action: 'insert'
  insertNewAfterExistingId: string
  content: Partial<DocumentElement>
} {
  return transform.action === 'insert' && !!transform.insertNewAfterExistingId && !!transform.content
}

/**
 * Type guard to check if a transform is an insert-before action
 */
export function isInsertBeforeTransform(transform: DocumentTransform): transform is DocumentTransform & { 
  action: 'insert'
  insertNewBeforeExistingId: string
  content: Partial<DocumentElement>
} {
  return transform.action === 'insert' && !!transform.insertNewBeforeExistingId && !!transform.content
}

/**
 * Type guard to check if a transform is a replace action
 */
export function isReplaceTransform(transform: DocumentTransform): transform is DocumentTransform & { 
  action: 'replace'
  targetId: string
  content: Partial<DocumentElement>
} {
  return transform.action === 'replace' && !!transform.targetId && !!transform.content
}

/**
 * Type guard to check if a transform is a remove action
 */
export function isRemoveTransform(transform: DocumentTransform): transform is DocumentTransform & { 
  action: 'remove'
  targetId: string
} {
  return transform.action === 'remove' && !!transform.targetId
}

/**
 * Type guard to check if a transform is a modify action
 */
export function isModifyTransform(transform: DocumentTransform): transform is DocumentTransform & { 
  action: 'modify'
  targetId: string
  attributes: Record<string, string>
} {
  return transform.action === 'modify' && !!transform.targetId && !!transform.attributes
}