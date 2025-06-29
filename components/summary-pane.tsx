'use client'

// Reusable summary pane component using AI summarisation
// Extracted from table-of-contents.tsx to eliminate code duplication
// See docs/TOOL_SUMMARISE.md for architecture and usage patterns

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown"
import remarkGfm from "remark-gfm"

interface SummaryPaneProps {
  content: string
  documentId: string
  autoActivate?: boolean
  className?: string
  granularity?: string
}

export function SummaryPane({ 
  content, 
  documentId, 
  autoActivate = false, 
  className = "",
  granularity
}: SummaryPaneProps) {
  const [summary, setSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string>('')
  const [showSummaryButton, setShowSummaryButton] = useState(true)
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const [enhancementId, setEnhancementId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Helper function to fetch cached summary from database
  const fetchCachedSummary = async (documentId: string, granularity?: string) => {
    try {
      const params = new URLSearchParams({ documentId })
      if (granularity) {
        params.append('granularity', granularity)
      }
      
      const response = await fetch(`/api/tools/summary?${params}`)
      if (!response.ok) {
        console.error('Failed to fetch cached summary:', response.status)
        return null
      }
      const data = await response.json()
      return data.cached ? data : null
    } catch (error) {
      console.error('Error fetching cached summary:', error)
      return null
    }
  }

  const generateSummary = useCallback(async () => {
    try {
      setSummaryLoading(true)
      setSummaryError('')
      setShowSummaryButton(false)
      
      const response = await fetch('/api/tools/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute',
          parameters: {
            content,
            documentId,
            granularity
          },
          metadata: {
            correlationId: crypto.randomUUID(),
            source: 'summary-pane',
            timestamp: new Date().toISOString()
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)
      setIsCached(data.cached || false)
      setEnhancementId(data.enhancementId || null)
      setIsLoaded(data.cached || false)
      
      // Show warning if database storage failed
      if (data.warning) {
        console.warn('Summary generation warning:', data.warning)
      }
    } catch (err) {
      setSummaryError('Failed to generate summary')
      setShowSummaryButton(true)
      console.error('Summary generation error:', err)
    } finally {
      setSummaryLoading(false)
    }
  }, [content, documentId, granularity])

  const regenerateSummary = useCallback(async () => {
    console.log('Regenerating summary...')
    setSummaryLoading(true)
    setSummaryError('')
    setIsLoaded(false)
    
    try {
      // First delete the cached enhancement if it exists
      if (enhancementId) {
        console.log('Deleting cached summary enhancement...')
        const params = new URLSearchParams({ documentId })
        if (granularity) {
          params.append('granularity', granularity)
        }
        
        const deleteResponse = await fetch(`/api/tools/summary?${params}`, {
          method: 'DELETE'
        })
        
        if (!deleteResponse.ok) {
          console.warn('Failed to delete cached summary, continuing with regeneration')
        }
      }
      
      setEnhancementId(null)
      
      // Wait a bit before generating new summary to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force regeneration by calling the API directly
      await generateSummary()
    } catch (error) {
      console.error('Error regenerating summary:', error)
      setSummaryError('Failed to regenerate summary')
      setShowSummaryButton(true)
    } finally {
      setSummaryLoading(false)
    }
  }, [documentId, granularity, enhancementId, generateSummary])

  // Auto-load cached summary or generate new one if autoActivate is true
  useEffect(() => {
    const loadSummary = async () => {
      if (!autoActivate || !showSummaryButton || summaryLoading) {
        return
      }
      
      setSummaryLoading(true)
      setSummaryError('')
      
      try {
        // First try to load cached summary
        const cached = await fetchCachedSummary(documentId, granularity)
        if (cached && cached.summary) {
          console.log('Found cached summary, loading it...')
          setSummary(cached.summary)
          setIsCached(true)
          setIsLoaded(true)
          setEnhancementId(cached.enhancementId || null)
          setShowSummaryButton(false)
        } else {
          // Generate new summary if none cached and autoActivate is true
          console.log('No cached summary found, generating new one...')
          await generateSummary()
        }
      } catch (error) {
        console.error('Error in loadSummary:', error)
        setSummaryError(`Failed to load summary: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setShowSummaryButton(true)
      } finally {
        setSummaryLoading(false)
      }
    }
    
    if (autoActivate && showSummaryButton && !summaryLoading) {
      loadSummary()
    }
  }, [autoActivate, showSummaryButton, summaryLoading, documentId, granularity, generateSummary])

  if (showSummaryButton) {
    return (
      <div className={`p-4 ${className}`}>
        <Button
          onClick={generateSummary}
          variant="outline"
          size="full"
          className="text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
        >
          Show summary
        </Button>
      </div>
    )
  }

  if (summaryLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <Loading variant="blue" text="Generating summary..." />
      </div>
    )
  }

  if (summaryError) {
    return (
      <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="text-sm text-red-600">{summaryError}</div>
        <Button
          onClick={() => {
            setSummaryError('')
            setShowSummaryButton(true)
          }}
          variant="outline"
          size="sm"
          className="mt-2 text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
        >
          Try again
        </Button>
      </div>
    )
  }

  if (summary) {
    return (
      <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-blue-800">Summary</h3>
            {isLoaded && (
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Loaded
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {(isCached || isLoaded) && (
              <Button
                onClick={regenerateSummary}
                variant="ghost"
                size="icon-xs"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                title="Regenerate summary"
                disabled={summaryLoading}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            )}
            <Button
              onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
              variant="ghost"
              size="icon-xs"
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              aria-label={isSummaryCollapsed ? "Expand summary" : "Collapse summary"}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isSummaryCollapsed ? '' : 'rotate-180'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>
        </div>
        {!isSummaryCollapsed && (
          <div className="prose prose-sm prose-blue max-w-none">
            <MarkdownTextPrimitive content={summary} remarkPlugins={[remarkGfm]} />
          </div>
        )}
      </div>
    )
  }

  return null
}