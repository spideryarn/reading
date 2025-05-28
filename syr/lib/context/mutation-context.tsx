'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { DocumentElement } from '@/lib/types/document'
import { Mutation, MutationState, MutationResult } from '@/lib/types/mutation'
import { MutationEngine } from '@/lib/services/mutation-engine'

interface MutationContextValue {
  // Current mutation state
  mutationState: MutationState
  
  // Document state (hybrid approach - direct manipulation with history tracking)
  document: DocumentElement[]
  setDocument: (doc: DocumentElement[]) => void
  
  // Mutation operations
  applyMutation: (mutation: Mutation) => Promise<MutationResult>
  revertMutation: () => Promise<MutationResult>
  clearMutations: () => void
  
  // Utilities
  hasActiveMutation: boolean
  canRevert: boolean
}

const MutationContext = createContext<MutationContextValue | undefined>(undefined)

interface MutationProviderProps {
  children: ReactNode
  initialDocument: DocumentElement[]
}

export function MutationProvider({ children, initialDocument }: MutationProviderProps) {
  // Document state - hybrid approach
  const [document, setDocument] = useState<DocumentElement[]>(initialDocument)
  
  // Mutation tracking state
  const [mutationState, setMutationState] = useState<MutationState>({
    activeMutation: null,
    mutationHistory: [],
    currentMutationIndex: -1
  })

  /**
   * Apply a mutation to the document.
   * Updates both document state and mutation history.
   */
  const applyMutation = useCallback(async (mutation: Mutation): Promise<MutationResult> => {
    // Validate mutation before applying
    const validation = MutationEngine.validateMutation(document, mutation)
    if (!validation.valid) {
      return {
        success: false,
        error: `Mutation validation failed: ${validation.errors.join(', ')}`
      }
    }

    // Apply the mutation
    const result = MutationEngine.applyMutation(document, mutation)
    
    if (result.success && result.document) {
      // Update document state
      setDocument(result.document)
      
      // Update mutation state (single mutation mode for v1)
      setMutationState({
        activeMutation: mutation,
        mutationHistory: [...mutationState.mutationHistory, mutation],
        currentMutationIndex: mutationState.mutationHistory.length
      })
    }
    
    return result
  }, [document, mutationState.mutationHistory])

  /**
   * Revert the currently active mutation.
   * Only works if there's an active mutation.
   */
  const revertMutation = useCallback(async (): Promise<MutationResult> => {
    if (!mutationState.activeMutation) {
      return {
        success: false,
        error: 'No active mutation to revert'
      }
    }

    // Apply reverse transforms
    const result = MutationEngine.revertMutation(document, mutationState.activeMutation)
    
    if (result.success && result.document) {
      // Update document state
      setDocument(result.document)
      
      // Clear active mutation (but keep history)
      setMutationState(prev => ({
        ...prev,
        activeMutation: null,
        currentMutationIndex: -1
      }))
    }
    
    return result
  }, [document, mutationState.activeMutation])

  /**
   * Clear all mutations and reset to original document.
   * This is a development utility - in production we'd want more careful handling.
   */
  const clearMutations = useCallback(() => {
    // If there's an active mutation, revert it first
    if (mutationState.activeMutation) {
      revertMutation()
    }
    
    // Reset mutation state
    setMutationState({
      activeMutation: null,
      mutationHistory: [],
      currentMutationIndex: -1
    })
  }, [mutationState.activeMutation, revertMutation])

  // Computed properties
  const hasActiveMutation = mutationState.activeMutation !== null
  const canRevert = hasActiveMutation

  const contextValue: MutationContextValue = {
    mutationState,
    document,
    setDocument,
    applyMutation,
    revertMutation,
    clearMutations,
    hasActiveMutation,
    canRevert
  }

  return (
    <MutationContext.Provider value={contextValue}>
      {children}
    </MutationContext.Provider>
  )
}

/**
 * Hook to access mutation context.
 * Must be used within a MutationProvider.
 */
export function useMutation() {
  const context = useContext(MutationContext)
  
  if (!context) {
    throw new Error('useMutation must be used within a MutationProvider')
  }
  
  return context
}

/**
 * Hook to get just the document state.
 * Convenience hook for components that only need to read the document.
 */
export function useDocument() {
  const { document } = useMutation()
  return document
}

/**
 * Hook to check if a specific mutation type is active.
 * Useful for UI components that need to show different states.
 */
export function useActiveMutationType() {
  const { mutationState } = useMutation()
  return mutationState.activeMutation?.type || null
}