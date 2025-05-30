'use client'

// Document-level summary component using AI summarisation
// See docs/AI_SUMMARISE.md for architecture and usage patterns

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'

interface DocumentSummaryProps {
  content: string
}

export function DocumentSummary({ content }: DocumentSummaryProps) {
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showButton, setShowButton] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const generateSummary = async () => {
    try {
      setLoading(true)
      setError('')
      setShowButton(false)
      
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
      setError('Failed to generate summary')
      setShowButton(true)
      console.error('Summary generation error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (showButton) {
    return (
      <div className="mx-4 mt-4">
        <Button
          onClick={generateSummary}
          variant="orange"
        >
          Show summary
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-4 mt-4">
        <Loading variant="orange" text="Generating summary..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="text-sm text-red-600">{error}</div>
        <Button
          onClick={() => {
            setError('')
            setShowButton(true)
          }}
          variant="orange"
          size="sm"
          className="mt-2"
        >
          Try again
        </Button>
      </div>
    )
  }

  if (summary) {
    return (
      <div className="mx-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-orange-800">Summary</h3>
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost-orange"
            size="icon-xs"
            aria-label={isCollapsed ? "Expand summary" : "Collapse summary"}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>
        {!isCollapsed && (
          <p className="text-sm text-orange-700 leading-relaxed">{summary}</p>
        )}
      </div>
    )
  }

  return null
}