'use client'

import { useState, useEffect } from 'react'

interface DocumentSummaryProps {
  content: string
}

export function DocumentSummary({ content }: DocumentSummaryProps) {
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const generateSummary = async () => {
      try {
        setLoading(true)
        setError('')
        
        
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
        console.error('Summary generation error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (content) {
      generateSummary()
    }
  }, [content])

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
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className="mx-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <h3 className="text-sm font-semibold text-orange-800 mb-2">Summary</h3>
      <p className="text-sm text-orange-700 leading-relaxed">{summary}</p>
    </div>
  )
}