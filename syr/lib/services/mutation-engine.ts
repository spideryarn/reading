import { DocumentElement } from '../types/document'
import { 
  Mutation, 
  DocumentTransform, 
  MutationResult,
  isInsertTransform,
  isReplaceTransform,
  isRemoveTransform,
  isModifyTransform
} from '../types/mutation'

/**
 * Core engine for applying and reverting document mutations.
 * Handles the actual transformation of document structure based on mutation definitions.
 */
export class MutationEngine {
  /**
   * Apply a mutation's forward transforms to a document
   */
  static applyMutation(
    document: DocumentElement[], 
    mutation: Mutation
  ): MutationResult {
    try {
      const result = this.applyTransforms(document, mutation.forward)
      return {
        ...result,
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error applying mutation'
      }
    }
  }

  /**
   * Revert a mutation by applying its reverse transforms
   */
  static revertMutation(
    document: DocumentElement[], 
    mutation: Mutation
  ): MutationResult {
    try {
      const result = this.applyTransforms(document, mutation.reverse)
      return {
        ...result,
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reverting mutation'
      }
    }
  }

  /**
   * Apply a list of transforms to a document
   */
  private static applyTransforms(
    document: DocumentElement[], 
    transforms: DocumentTransform[]
  ): Omit<MutationResult, 'success'> {
    // Create a mutable copy of the document
    let workingDoc = [...document]
    const changes = {
      inserted: 0,
      replaced: 0,
      removed: 0,
      modified: 0
    }

    for (const transform of transforms) {
      if (isInsertTransform(transform)) {
        workingDoc = this.applyInsert(workingDoc, transform)
        changes.inserted++
      } else if (isReplaceTransform(transform)) {
        workingDoc = this.applyReplace(workingDoc, transform)
        changes.replaced++
      } else if (isRemoveTransform(transform)) {
        workingDoc = this.applyRemove(workingDoc, transform)
        changes.removed++
      } else if (isModifyTransform(transform)) {
        workingDoc = this.applyModify(workingDoc, transform)
        changes.modified++
      } else {
        throw new Error(`Unknown transform action: ${transform.action}`)
      }
    }

    return {
      document: workingDoc,
      changes
    }
  }

  /**
   * Insert a new element after a specified element
   */
  private static applyInsert(
    document: DocumentElement[], 
    transform: DocumentTransform & { action: 'insert'; afterId: string; content: Partial<DocumentElement> }
  ): DocumentElement[] {
    const afterIndex = document.findIndex(el => el.id === transform.afterId)
    
    if (afterIndex === -1) {
      throw new Error(`Cannot insert after element ${transform.afterId}: element not found`)
    }

    // Create a new element with defaults
    const afterElement = document[afterIndex]
    const newElement: DocumentElement = {
      id: transform.content.id || `generated-${Date.now()}-${Math.random()}`,
      document_id: afterElement.document_id,
      parent_id: afterElement.parent_id,
      tag_name: 'div',
      content: '',
      attributes: {},
      position: afterElement.position + 1,
      level: afterElement.level,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...transform.content
    }

    // Insert the new element
    const result = [...document]
    result.splice(afterIndex + 1, 0, newElement)
    
    // Update positions of subsequent elements
    for (let i = afterIndex + 2; i < result.length; i++) {
      if (result[i].parent_id === newElement.parent_id) {
        result[i] = { ...result[i], position: result[i].position + 1 }
      }
    }

    return result
  }

  /**
   * Replace an existing element's content
   */
  private static applyReplace(
    document: DocumentElement[], 
    transform: DocumentTransform & { action: 'replace'; targetId: string; content: Partial<DocumentElement> }
  ): DocumentElement[] {
    const targetIndex = document.findIndex(el => el.id === transform.targetId)
    
    if (targetIndex === -1) {
      throw new Error(`Cannot replace element ${transform.targetId}: element not found`)
    }

    const result = [...document]
    result[targetIndex] = {
      ...result[targetIndex],
      ...transform.content,
      updated_at: new Date().toISOString()
    }

    return result
  }

  /**
   * Remove an element from the document
   */
  private static applyRemove(
    document: DocumentElement[], 
    transform: DocumentTransform & { action: 'remove'; targetId: string }
  ): DocumentElement[] {
    const targetIndex = document.findIndex(el => el.id === transform.targetId)
    
    if (targetIndex === -1) {
      throw new Error(`Cannot remove element ${transform.targetId}: element not found`)
    }

    const result = [...document]
    const removedElement = result[targetIndex]
    result.splice(targetIndex, 1)
    
    // Update positions of subsequent siblings
    for (let i = targetIndex; i < result.length; i++) {
      if (result[i].parent_id === removedElement.parent_id && 
          result[i].position > removedElement.position) {
        result[i] = { ...result[i], position: result[i].position - 1 }
      }
    }

    return result
  }

  /**
   * Modify attributes of an existing element
   */
  private static applyModify(
    document: DocumentElement[], 
    transform: DocumentTransform & { action: 'modify'; targetId: string; attributes: Record<string, string> }
  ): DocumentElement[] {
    const targetIndex = document.findIndex(el => el.id === transform.targetId)
    
    if (targetIndex === -1) {
      throw new Error(`Cannot modify element ${transform.targetId}: element not found`)
    }

    const result = [...document]
    result[targetIndex] = {
      ...result[targetIndex],
      attributes: {
        ...result[targetIndex].attributes,
        ...transform.attributes
      },
      updated_at: new Date().toISOString()
    }

    return result
  }

  /**
   * Validate that a mutation can be applied to a document
   */
  static validateMutation(
    document: DocumentElement[], 
    mutation: Mutation
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check forward transforms
    for (const transform of mutation.forward) {
      if (isInsertTransform(transform)) {
        if (!document.find(el => el.id === transform.afterId)) {
          errors.push(`Insert transform references non-existent element: ${transform.afterId}`)
        }
      } else if (isReplaceTransform(transform) || isRemoveTransform(transform) || isModifyTransform(transform)) {
        if (!document.find(el => el.id === transform.targetId)) {
          errors.push(`${transform.action} transform references non-existent element: ${transform.targetId}`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}