'use client'

// Document-level summary component using AI summarisation
// See docs/AI_SUMMARISE.md for architecture and usage patterns

import { useState } from 'react'

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
        <button
          onClick={generateSummary}
          className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
        >
          Show summary
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="text-sm text-orange-600">Generating summary...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="text-sm text-red-600">{error}</div>
        <button
          onClick={() => {
            setError('')
            setShowButton(true)
          }}
          className="mt-2 px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  if (summary) {
    return (
      <div className="mx-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-orange-800">Summary</h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-orange-600 hover:text-orange-800 transition-colors"
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
          </button>
        </div>
        {!isCollapsed && (
          <p className="text-sm text-orange-700 leading-relaxed">{summary}</p>
        )}
      </div>
    )
  }

  return null
}