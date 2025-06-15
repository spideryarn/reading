/**
 * Hook for managing multi-dimensional summary state
 * Handles fetching, generating, and switching between 9 summary combinations
 */

import { useState, useEffect, useCallback } from 'react'
import type { ExpertiseLevel, LengthLevel } from '@/lib/prompts/templates/multi-summarise'
import { useSummaryUrlState } from '@/lib/tools/hooks/use-tool-url-state'

export interface MultiSummaryData {
  beginner: {
    sentence_or_two: string
    single_short_paragraph: string
    page: string
  }
  intermediate: {
    sentence_or_two: string
    single_short_paragraph: string
    page: string
  }
  expert: {
    sentence_or_two: string
    single_short_paragraph: string
    page: string
  }
}

export interface UseMultiSummaryReturn {
  // Data state
  summaries: MultiSummaryData | null
  currentSummary: string
  
  // Selection state
  expertiseLevel: ExpertiseLevel
  lengthLevel: LengthLevel
  setExpertiseLevel: (level: ExpertiseLevel) => void
  setLengthLevel: (level: LengthLevel) => void
  
  // Loading and error state
  isLoading: boolean
  error: string | null
  isCached: boolean
  
  // Actions
  generateSummaries: () => Promise<void>
  clearSummaries: () => Promise<void>
  isGenerated: boolean
}

export function useMultiSummary(
  documentId: string,
  content: string,
  autoLoad: boolean = false
): UseMultiSummaryReturn {
  // Summary data
  const [summaries, setSummaries] = useState<MultiSummaryData | null>(null)
  
  // Get URL state for expertise and length levels
  const { expertiseLevel, lengthLevel, setExpertiseLevel, setLengthLevel } = useSummaryUrlState()
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCached, setIsCached] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  
  // Get current summary based on selections
  const currentSummary = summaries?.[expertiseLevel]?.[lengthLevel] || ''
  
  // Fetch cached summaries
  const fetchCachedSummaries = useCallback(async () => {
    try {
      const response = await fetch(`/api/multi-summarise?documentId=${encodeURIComponent(documentId)}`)
      if (!response.ok) {
        if (response.status !== 404) {
          console.error('Failed to fetch cached summaries:', response.status)
        }
        return null
      }
      
      const data = await response.json()
      return data.cached ? data : null
    } catch (err) {
      console.error('Error fetching cached summaries:', err)
      return null
    }
  }, [documentId])
  
  // Generate new summaries
  const generateSummaries = useCallback(async () => {
    if (!content || !documentId) {
      setError('Content and document ID are required')
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/multi-summarise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content, 
          documentId
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to generate summaries: ${response.status}`)
      }
      
      const data = await response.json()
      setSummaries(data.summaries)
      setIsCached(data.cached || false)
      setIsGenerated(true)
      
      // Show warning if database storage failed
      if (data.warning) {
        console.warn('Summary generation warning:', data.warning)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate summaries'
      setError(errorMessage)
      console.error('Multi-summary generation error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [content, documentId])
  
  // Clear summaries
  const clearSummaries = useCallback(async () => {
    try {
      await fetch(`/api/multi-summarise?documentId=${encodeURIComponent(documentId)}`, {
        method: 'DELETE'
      })
      
      setSummaries(null)
      setIsCached(false)
      setIsGenerated(false)
      setError(null)
    } catch (err) {
      console.error('Error clearing summaries:', err)
    }
  }, [documentId])
  
  // Auto-load cached summaries or generate new ones on mount
  useEffect(() => {
    if (autoLoad && documentId && content && !isGenerated && !isLoading && !error) {
      fetchCachedSummaries().then((cached) => {
        if (cached?.summaries) {
          setSummaries(cached.summaries)
          setIsCached(true)
          setIsGenerated(true)
        } else {
          // If no cached summaries found, auto-generate new ones
          generateSummaries()
        }
      })
    }
  }, [autoLoad, documentId, content, isGenerated, isLoading, error, fetchCachedSummaries, generateSummaries])
  
  return {
    // Data state
    summaries,
    currentSummary,
    
    // Selection state
    expertiseLevel,
    lengthLevel,
    setExpertiseLevel,
    setLengthLevel,
    
    // Loading and error state
    isLoading,
    error,
    isCached,
    
    // Actions
    generateSummaries,
    clearSummaries,
    isGenerated
  }
}