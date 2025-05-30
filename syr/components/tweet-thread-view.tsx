'use client'

import { useState, useEffect, useCallback } from 'react'
import { TweetCard } from './tweet-card'
import { Loading } from '@/components/ui/loading'
import { AlertWithIcon } from '@/components/ui/alert'

interface Tweet {
  text: string
  number: number
}

interface TweetThreadResponse {
  tweets: Tweet[]
  thread_summary: string
  metadata: {
    content_length: number
    processed_length: number
    truncated: boolean
    tweet_count: number
  }
}

interface TweetThreadViewProps {
  documentContent: string
  isActive?: boolean
}

export function TweetThreadView({ documentContent, isActive = false }: TweetThreadViewProps) {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [summary, setSummary] = useState<string>('')
  const [metadata, setMetadata] = useState<TweetThreadResponse['metadata'] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)

  const generateTweetThread = useCallback(async () => {
    if (!documentContent.trim()) {
      setError('No document content available')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/tweet-thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: documentContent,
          targetLength: 12
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate tweet thread: ${response.statusText}`)
      }

      const data: TweetThreadResponse = await response.json()
      setTweets(data.tweets)
      setSummary(data.thread_summary)
      setMetadata(data.metadata)
      setHasGenerated(true)
    } catch (err) {
      console.error('Error generating tweet thread:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate tweet thread')
    } finally {
      setIsLoading(false)
    }
  }, [documentContent])

  // Auto-generate when tab becomes active (similar to glossary pattern)
  useEffect(() => {
    if (isActive && !hasGenerated && !isLoading) {
      generateTweetThread()
    }
  }, [isActive, hasGenerated, isLoading, generateTweetThread])

  if (isLoading) {
    return <Loading text="Generating tweet thread..." spinnerSize={20} />
  }

  if (error) {
    return (
      <AlertWithIcon 
        variant="warning"
        title="Failed to generate tweet thread"
        description={error}
      />
    )
  }

  if (!hasGenerated) {
    return (
      <div className="text-gray-500 text-center py-8">
        Select this tab to generate a tweet thread
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Thread summary */}
      {summary && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="text-sm font-medium text-blue-900 mb-1">Thread Summary</div>
          <div className="text-sm text-blue-800">{summary}</div>
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <div className="text-xs text-gray-500 border-b border-gray-200 pb-2">
          {metadata.tweet_count || 0} tweets • {(metadata.content_length || 0).toLocaleString()} characters
          {metadata.truncated && ' (content truncated)'}
        </div>
      )}

      {/* Tweet thread */}
      <div className="space-y-2">
        {tweets.map((tweet, index) => (
          <TweetCard 
            key={index}
            tweet={tweet}
            totalTweets={tweets.length}
          />
        ))}
      </div>
    </div>
  )
}