import { DocumentElement } from '../types/document'
import { Mutation, MutationResult } from '../types/mutation'

/**
 * Debug utilities for mutation system development.
 * Enable with: localStorage.setItem('MUTATION_DEBUG', 'true')
 */

export interface MutationDebugInfo {
  mutationId: string
  mutationType: string
  timestamp: number
  documentBefore: DocumentElement[]
  documentAfter: DocumentElement[]
  transformCount: number
  changes: MutationResult['changes']
  error?: string
  duration: number
}

class MutationDebugger {
  private history: MutationDebugInfo[] = []
  private maxHistorySize = 50

  /**
   * Check if debug mode is enabled
   */
  isEnabled(): boolean {
    if (typeof window === 'undefined') return false
    return window.localStorage?.getItem('MUTATION_DEBUG') === 'true'
  }

  /**
   * Enable debug mode
   */
  enable(): void {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('MUTATION_DEBUG', 'true')
      console.log('🐛 Mutation debug mode enabled')
    }
  }

  /**
   * Disable debug mode
   */
  disable(): void {
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem('MUTATION_DEBUG')
      console.log('🐛 Mutation debug mode disabled')
    }
  }

  /**
   * Log a mutation operation
   */
  logMutation(
    operation: 'apply' | 'revert',
    mutation: Mutation,
    documentBefore: DocumentElement[],
    result: MutationResult,
    duration: number
  ): void {
    if (!this.isEnabled()) return

    const info: MutationDebugInfo = {
      mutationId: mutation.id,
      mutationType: mutation.type,
      timestamp: Date.now(),
      documentBefore: documentBefore.map(el => ({ ...el })),
      documentAfter: result.document ? result.document.map(el => ({ ...el })) : documentBefore,
      transformCount: operation === 'apply' ? mutation.forward.length : mutation.reverse.length,
      changes: result.changes,
      error: result.error,
      duration
    }

    this.history.unshift(info)
    if (this.history.length > this.maxHistorySize) {
      this.history.pop()
    }

    // Console logging is handled by MutationEngine
  }

  /**
   * Get mutation history
   */
  getHistory(): MutationDebugInfo[] {
    return this.history
  }

  /**
   * Clear mutation history
   */
  clearHistory(): void {
    this.history = []
    console.log('🗑️ Mutation debug history cleared')
  }

  /**
   * Export debug data for analysis
   */
  exportDebugData(): string {
    const data = {
      enabled: this.isEnabled(),
      historySize: this.history.length,
      history: this.history
    }
    return JSON.stringify(data, null, 2)
  }

  /**
   * Analyze mutation performance
   */
  analyzePerformance(): void {
    if (this.history.length === 0) {
      console.log('No mutation history to analyze')
      return
    }

    const stats = {
      totalMutations: this.history.length,
      averageDuration: this.history.reduce((sum, info) => sum + info.duration, 0) / this.history.length,
      slowestMutation: Math.max(...this.history.map(info => info.duration)),
      fastestMutation: Math.min(...this.history.map(info => info.duration)),
      errorCount: this.history.filter(info => info.error).length
    }

    console.group('📊 Mutation Performance Analysis')
    console.table(stats)
    console.groupEnd()
  }

  /**
   * Validate document consistency
   */
  validateDocumentConsistency(document: DocumentElement[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const seenIds = new Set<string>()
    const positionsByParent = new Map<string | null, Set<number>>()

    for (const element of document) {
      // Check for duplicate IDs
      if (seenIds.has(element.id)) {
        errors.push(`Duplicate element ID: ${element.id}`)
      }
      seenIds.add(element.id)

      // Check for duplicate positions within parent
      const parentId = element.parent_id
      if (!positionsByParent.has(parentId)) {
        positionsByParent.set(parentId, new Set())
      }
      const positions = positionsByParent.get(parentId)!
      if (positions.has(element.position)) {
        errors.push(`Duplicate position ${element.position} for parent ${parentId}`)
      }
      positions.add(element.position)
    }

    // Check for gaps in positions
    for (const [parentId, positions] of positionsByParent) {
      const sortedPositions = Array.from(positions).sort((a, b) => a - b)
      for (let i = 0; i < sortedPositions.length; i++) {
        if (sortedPositions[i] !== i + 1) {
          errors.push(`Position gap for parent ${parentId}: expected ${i + 1}, got ${sortedPositions[i]}`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const mutationDebugger = new MutationDebugger()

// Attach to window for easy console access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).mutationDebugger = mutationDebugger
}