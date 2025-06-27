import { DocumentElement } from '../types/document'
import { 
  Mutation, 
  DocumentTransform, 
  MutationResult,
  isInsertTransform,
  isInsertAfterTransform,
  isInsertBeforeTransform,
  isReplaceTransform,
  isRemoveTransform,
  isModifyTransform
} from '../types/mutation'
import { mutationDebugger } from './mutation-debug'
import { mutationLogger, generateCorrelationId, createTimer } from './logger'

/**
 * Core engine for applying and reverting document mutations.
 * Handles the actual transformation of document structure based on mutation definitions.
 */
export class MutationEngine {
  /**
   * Apply a mutation's forward transforms to a document atomically.
   * Validates all transforms before applying any.
   */
  static applyMutation(
    document: DocumentElement[], 
    mutation: Mutation
  ): MutationResult {
    const correlationId = generateCorrelationId()
    const timer = createTimer(mutationLogger, 'applyMutation')
    const startTime = performance.now()
    
    mutationLogger.info({
      operation: 'applyMutation',
      mutationId: mutation.id,
      mutationType: mutation.type,
      transformCount: mutation.forward.length,
      documentSize: document.length,
      correlationId
    }, `Starting mutation application: ${mutation.type}`)
    
    try {
      // Create a deep copy to work with
      const draft = document.map(el => ({ ...el }))
      
      // Validate ALL transforms first (atomic operation)
      for (const transform of mutation.forward) {
        const validation = this.validateTransform(draft, transform)
        if (!validation.valid) {
          const errorResult = {
            success: false,
            error: `Invalid transform: ${validation.error}`
          }
          
          mutationLogger.warn({
            operation: 'applyMutation',
            mutationId: mutation.id,
            mutationType: mutation.type,
            validationError: validation.error,
            transformAction: transform.action,
            correlationId
          }, `Mutation validation failed: ${validation.error}`)
          
          mutationDebugger.logMutation('apply', mutation, document, errorResult, performance.now() - startTime)
          return errorResult
        }
      }
      
      // If all transforms are valid, apply them
      const result = this.applyTransforms(draft, mutation.forward)
      
      // Update positions to ensure consistency
      const finalDocument = this.updateElementPositions(result.document!)
      
      const finalResult = {
        ...result,
        document: finalDocument,
        success: true
      }
      
      const duration = timer.end({
        mutationId: mutation.id,
        mutationType: mutation.type,
        changes: result.changes,
        finalDocumentSize: finalDocument.length,
        correlationId
      })
      
      mutationLogger.info({
        operation: 'applyMutation',
        mutationId: mutation.id,
        mutationType: mutation.type,
        transformCount: mutation.forward.length,
        changes: result.changes,
        documentSizeBefore: document.length,
        documentSizeAfter: finalDocument.length,
        duration,
        correlationId
      }, `Mutation applied successfully: ${mutation.type}`)
      
      // Log debug info if enabled
      if (mutationDebugger.isEnabled()) {
        console.group(`🔄 Mutation Applied: ${mutation.type}`)
        console.log('Mutation ID:', mutation.id)
        console.log('Transforms:', mutation.forward.length)
        console.log('Changes:', result.changes)
        console.log('Duration:', `${(performance.now() - startTime).toFixed(2)}ms`)
        console.log('Document before:', document.length, 'elements')
        console.log('Document after:', finalDocument.length, 'elements')
        console.groupEnd()
      }
      
      mutationDebugger.logMutation('apply', mutation, document, finalResult, performance.now() - startTime)
      
      return finalResult
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error applying mutation'
      }
      
      mutationLogger.error({
        operation: 'applyMutation',
        mutationId: mutation.id,
        mutationType: mutation.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime,
        correlationId
      }, `Mutation application failed: ${mutation.type}`)
      
      mutationDebugger.logMutation('apply', mutation, document, errorResult, performance.now() - startTime)
      return errorResult
    }
  }

  /**
   * Revert a mutation by applying its reverse transforms atomically.
   * Validates all transforms before applying any.
   */
  static revertMutation(
    document: DocumentElement[], 
    mutation: Mutation
  ): MutationResult {
    const correlationId = generateCorrelationId()
    const timer = createTimer(mutationLogger, 'revertMutation')
    const startTime = performance.now()
    
    mutationLogger.info({
      operation: 'revertMutation',
      mutationId: mutation.id,
      mutationType: mutation.type,
      reverseTransformCount: mutation.reverse.length,
      documentSize: document.length,
      correlationId
    }, `Starting mutation revert: ${mutation.type}`)
    
    try {
      // Create a deep copy to work with
      const draft = document.map(el => ({ ...el }))
      
      // Validate ALL reverse transforms first (atomic operation)
      for (const transform of mutation.reverse) {
        const validation = this.validateTransform(draft, transform)
        if (!validation.valid) {
          const errorResult = {
            success: false,
            error: `Invalid reverse transform: ${validation.error}`
          }
          
          mutationLogger.warn({
            operation: 'revertMutation',
            mutationId: mutation.id,
            mutationType: mutation.type,
            validationError: validation.error,
            transformAction: transform.action,
            correlationId
          }, `Mutation revert validation failed: ${validation.error}`)
          
          mutationDebugger.logMutation('revert', mutation, document, errorResult, performance.now() - startTime)
          return errorResult
        }
      }
      
      // If all transforms are valid, apply them
      const result = this.applyTransforms(draft, mutation.reverse)
      
      // Update positions to ensure consistency
      const finalDocument = this.updateElementPositions(result.document!)
      
      const finalResult = {
        ...result,
        document: finalDocument,
        success: true
      }
      
      const duration = timer.end({
        mutationId: mutation.id,
        mutationType: mutation.type,
        changes: result.changes,
        finalDocumentSize: finalDocument.length,
        correlationId
      })
      
      mutationLogger.info({
        operation: 'revertMutation',
        mutationId: mutation.id,
        mutationType: mutation.type,
        reverseTransformCount: mutation.reverse.length,
        changes: result.changes,
        documentSizeBefore: document.length,
        documentSizeAfter: finalDocument.length,
        duration,
        correlationId
      }, `Mutation reverted successfully: ${mutation.type}`)
      
      // Log debug info if enabled
      if (mutationDebugger.isEnabled()) {
        console.group(`↩️ Mutation Reverted: ${mutation.type}`)
        console.log('Mutation ID:', mutation.id)
        console.log('Reverse transforms:', mutation.reverse.length)
        console.log('Changes:', result.changes)
        console.log('Duration:', `${(performance.now() - startTime).toFixed(2)}ms`)
        console.log('Document before:', document.length, 'elements')
        console.log('Document after:', finalDocument.length, 'elements')
        console.groupEnd()
      }
      
      mutationDebugger.logMutation('revert', mutation, document, finalResult, performance.now() - startTime)
      
      return finalResult
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reverting mutation'
      }
      
      mutationLogger.error({
        operation: 'revertMutation',
        mutationId: mutation.id,
        mutationType: mutation.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime,
        correlationId
      }, `Mutation revert failed: ${mutation.type}`)
      
      mutationDebugger.logMutation('revert', mutation, document, errorResult, performance.now() - startTime)
      return errorResult
    }
  }

  /**
   * Apply a list of transforms to a document with proper precedence for mixed insertion types
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

    // Sort transforms to ensure proper precedence for mixed insertion types
    const sortedTransforms = this.sortTransformsForPrecedence(transforms)

    for (const transform of sortedTransforms) {
      if (isInsertAfterTransform(transform)) {
        workingDoc = this.applyInsertAfter(workingDoc, transform)
        changes.inserted++
      } else if (isInsertBeforeTransform(transform)) {
        workingDoc = this.applyInsertBefore(workingDoc, transform)
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
   * Sort transforms to implement mixed insertion precedence rule:
   * before-insertions → original-element → after-insertions
   * 
   * This ensures that when multiple insertions target the same element,
   * all before-insertions are processed first, then after-insertions.
   */
  private static sortTransformsForPrecedence(transforms: DocumentTransform[]): DocumentTransform[] {
    // Group transforms by their target element ID
    const insertionGroups = new Map<string, {
      beforeInsertions: DocumentTransform[],
      afterInsertions: DocumentTransform[],
      otherTransforms: DocumentTransform[]
    }>()
    
    const nonInsertionTransforms: DocumentTransform[] = []

    // Group insertions by target element
    for (const transform of transforms) {
      if (isInsertBeforeTransform(transform)) {
        const targetId = transform.insertNewBeforeExistingId
        if (!insertionGroups.has(targetId)) {
          insertionGroups.set(targetId, { beforeInsertions: [], afterInsertions: [], otherTransforms: [] })
        }
        insertionGroups.get(targetId)!.beforeInsertions.push(transform)
      } else if (isInsertAfterTransform(transform)) {
        const targetId = transform.insertNewAfterExistingId
        if (!insertionGroups.has(targetId)) {
          insertionGroups.set(targetId, { beforeInsertions: [], afterInsertions: [], otherTransforms: [] })
        }
        insertionGroups.get(targetId)!.afterInsertions.push(transform)
      } else {
        // Non-insertion transforms (replace, remove, modify) maintain original order
        nonInsertionTransforms.push(transform)
      }
    }

    // Build the sorted transform list with proper precedence
    const sortedTransforms: DocumentTransform[] = []
    
    // First, add all before-insertions (in groups by target element)
    // For before-insertions, reverse the order within each group to achieve
    // correct serial insertion behavior (last transform should appear first)
    for (const group of insertionGroups.values()) {
      sortedTransforms.push(...group.beforeInsertions.reverse())
    }
    
    // Then, add all non-insertion transforms in original order
    sortedTransforms.push(...nonInsertionTransforms)
    
    // Finally, add all after-insertions (in groups by target element)
    // For after-insertions, reverse order within each group (same serial insertion behavior as before-insertions)
    for (const group of insertionGroups.values()) {
      sortedTransforms.push(...group.afterInsertions.reverse())
    }

    return sortedTransforms
  }

  /**
   * Insert a new element after a specified element
   */
  private static applyInsertAfter(
    document: DocumentElement[], 
    transform: DocumentTransform & { action: 'insert'; insertNewAfterExistingId: string; content: Partial<DocumentElement> }
  ): DocumentElement[] {
    const existingElementIndex = document.findIndex(el => el.id === transform.insertNewAfterExistingId)
    
    if (existingElementIndex === -1) {
      throw new Error(`Cannot insert after element ${transform.insertNewAfterExistingId}: element not found`)
    }

    // Create a new element with defaults
    const existingElement = document[existingElementIndex]!
    const newElement: DocumentElement = {
      id: transform.content.id || `generated-${Date.now()}-${Math.random()}`,
      document_id: existingElement.document_id,
      parent_id: existingElement.parent_id,
      tag_name: 'div',
      content: '',
      attributes: {},
      position: existingElement.position + 1,
      level: existingElement.level,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...transform.content
    }

    // Insert the new element
    const result = [...document]
    result.splice(existingElementIndex + 1, 0, newElement)
    
    // Update positions of subsequent elements
    for (let i = existingElementIndex + 2; i < result.length; i++) {
      if (result[i]!.parent_id === newElement.parent_id) {
        result[i] = { ...result[i]!, position: result[i]!.position + 1 }
      }
    }

    return result
  }

  /**
   * Insert a new element before a specified element
   */
  private static applyInsertBefore(
    document: DocumentElement[], 
    transform: DocumentTransform & { action: 'insert'; insertNewBeforeExistingId: string; content: Partial<DocumentElement> }
  ): DocumentElement[] {
    const existingElementIndex = document.findIndex(el => el.id === transform.insertNewBeforeExistingId)
    
    if (existingElementIndex === -1) {
      throw new Error(`Cannot insert before element ${transform.insertNewBeforeExistingId}: element not found`)
    }

    // Create a new element with defaults
    const existingElement = document[existingElementIndex]!
    const newElement: DocumentElement = {
      id: transform.content.id || `generated-${Date.now()}-${Math.random()}`,
      document_id: existingElement.document_id,
      parent_id: existingElement.parent_id,
      tag_name: 'div',
      content: '',
      attributes: {},
      position: existingElement.position,
      level: existingElement.level,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...transform.content
    }

    // Insert the new element before the existing element
    const result = [...document]
    result.splice(existingElementIndex, 0, newElement)
    
    // Update positions of the existing element and all subsequent siblings
    for (let i = existingElementIndex + 1; i < result.length; i++) {
      if (result[i]!.parent_id === newElement.parent_id) {
        result[i] = { ...result[i]!, position: result[i]!.position + 1 }
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
      ...result[targetIndex]!,
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
    const removedElement = result[targetIndex]!
    result.splice(targetIndex, 1)
    
    // Update positions of subsequent siblings
    for (let i = targetIndex; i < result.length; i++) {
      if (result[i]!.parent_id === removedElement.parent_id && 
          result[i]!.position > removedElement.position) {
        result[i] = { ...result[i]!, position: result[i]!.position - 1 }
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
      ...result[targetIndex]!,
      attributes: {
        ...result[targetIndex]!.attributes,
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
      const validation = this.validateTransform(document, transform)
      if (!validation.valid) {
        errors.push(validation.error)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate a single transform against a document.
   * Ensures all references are valid and operation can be performed.
   */
  private static validateTransform(
    document: DocumentElement[],
    transform: DocumentTransform
  ): { valid: boolean; error: string } {
    switch (transform.action) {
      case 'insert':
        if (!isInsertTransform(transform)) {
          return { valid: false, error: 'Invalid insert transform structure' }
        }
        
        // Validate insertion type - must have either before or after, but not both
        const hasAfter = !!transform.insertNewAfterExistingId
        const hasBefore = !!transform.insertNewBeforeExistingId
        
        if (!hasAfter && !hasBefore) {
          return { valid: false, error: 'Insert transform missing both insertNewAfterExistingId and insertNewBeforeExistingId' }
        }
        
        if (hasAfter && hasBefore) {
          return { valid: false, error: 'Insert transform cannot have both insertNewAfterExistingId and insertNewBeforeExistingId' }
        }
        
        // Validate target element exists
        const targetId = hasAfter ? transform.insertNewAfterExistingId : transform.insertNewBeforeExistingId
        const insertionType = hasAfter ? 'after' : 'before'
        
        if (!document.find(el => el.id === targetId)) {
          return { valid: false, error: `Cannot insert ${insertionType} element ${targetId}: element not found` }
        }
        
        // Validate content
        if (!transform.content?.id) {
          return { valid: false, error: 'Insert transform missing content.id' }
        }
        
        if (document.find(el => el.id === transform.content.id)) {
          return { valid: false, error: `Cannot insert element with duplicate ID: ${transform.content.id}` }
        }
        
        return { valid: true, error: '' }
        
      case 'remove':
        if (!isRemoveTransform(transform)) {
          return { valid: false, error: 'Invalid remove transform structure' }
        }
        if (!transform.targetId) {
          return { valid: false, error: 'Remove transform missing targetId' }
        }
        if (!document.find(el => el.id === transform.targetId)) {
          return { valid: false, error: `Cannot remove non-existent element: ${transform.targetId}` }
        }
        return { valid: true, error: '' }
        
      case 'replace':
        if (!isReplaceTransform(transform)) {
          return { valid: false, error: 'Invalid replace transform structure' }
        }
        if (!transform.targetId) {
          return { valid: false, error: 'Replace transform missing targetId' }
        }
        if (!document.find(el => el.id === transform.targetId)) {
          return { valid: false, error: `Cannot replace non-existent element: ${transform.targetId}` }
        }
        if (!transform.content) {
          return { valid: false, error: 'Replace transform missing content' }
        }
        return { valid: true, error: '' }
        
      case 'modify':
        if (!isModifyTransform(transform)) {
          return { valid: false, error: 'Invalid modify transform structure' }
        }
        if (!transform.targetId) {
          return { valid: false, error: 'Modify transform missing targetId' }
        }
        if (!document.find(el => el.id === transform.targetId)) {
          return { valid: false, error: `Cannot modify non-existent element: ${transform.targetId}` }
        }
        if (!transform.attributes) {
          return { valid: false, error: 'Modify transform missing attributes' }
        }
        return { valid: true, error: '' }
        
      default:
        return { valid: false, error: `Unknown transform action: ${transform.action}` }
    }
  }

  /**
   * Update element positions to ensure they're sequential.
   * Should be called after mutations that add/remove elements.
   * Positions are used for ordering only - IDs are the stable reference.
   */
  static updateElementPositions(elements: DocumentElement[]): DocumentElement[] {
    // For now, just return the elements as-is
    // The position updates are already handled correctly in the insert/remove methods
    return elements
  }
}