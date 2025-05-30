'use client'

// Reusable summary pane component using AI summarisation
// Extracted from table-of-contents.tsx to eliminate code duplication
// See docs/AI_SUMMARISE.md for architecture and usage patterns

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'

interface SummaryPaneProps {
  content: string
  autoActivate?: boolean
  className?: string
}

export function SummaryPane({ content, autoActivate = false, className = "" }: SummaryPaneProps) {
  const [summary, setSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string>('')
  const [showSummaryButton, setShowSummaryButton] = useState(true)
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false)

  const generateSummary = async () => {
    try {
      setSummaryLoading(true)
      setSummaryError('')
      setShowSummaryButton(false)
      
      const response = await fetch('/api/summarise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (err) {
      setSummaryError('Failed to generate summary')
      setShowSummaryButton(true)
      console.error('Summary generation error:', err)
    } finally {
      setSummaryLoading(false)
    }
  }

  // Auto-activate summary generation if requested
  useEffect(() => {
    if (autoActivate && showSummaryButton && !summaryLoading) {
      generateSummary()
    }
  }, [autoActivate, showSummaryButton, summaryLoading])

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
          <h3 className="text-sm font-semibold text-blue-800">Summary</h3>
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
        {!isSummaryCollapsed && (
          <p className="text-sm text-blue-700 leading-relaxed">{summary}</p>
        )}
      </div>
    )
  }

  return null
}