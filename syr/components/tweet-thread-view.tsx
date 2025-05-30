'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { TweetCard } from './tweet-card'
import { Loading } from '@/components/ui/loading'
import { AlertWithIcon } from '@/components/ui/alert'
import { Copy, Check, Cloud } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SITE_CONFIG } from '@/lib/config'

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
  onStateChange?: (isLoading: boolean, hasGenerated: boolean) => void
}

export function TweetThreadView({ documentContent, isActive = false, onStateChange }: TweetThreadViewProps) {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [summary, setSummary] = useState<string>('')
  const [metadata, setMetadata] = useState<TweetThreadResponse['metadata'] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isBlueskyPressed, setIsBlueskyPressed] = useState(false)

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

  const pathname = usePathname()
  
  const copyToClipboard = useCallback(async () => {
    if (tweets.length === 0) return

    try {
      // Create attribution header
      const attribution = `Tweet thread provided by Spideryarn Reading - ${SITE_CONFIG.BASE_URL}${pathname}`
      
      // Format tweets as Markdown
      const markdownContent = tweets.map((tweet, index) => {
        return `${index + 1}. ${tweet.text}`
      }).join('\n\n')

      // Add thread summary if available
      const fullContent = summary 
        ? `${attribution}\n\n# Tweet Thread Summary\n\n${summary}\n\n# Thread\n\n${markdownContent}`
        : `${attribution}\n\n# Tweet Thread\n\n${markdownContent}`

      await navigator.clipboard.writeText(fullContent)
      setIsCopied(true)
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }, [tweets, summary, pathname])

  const handleBlueskyPost = useCallback(() => {
    setIsBlueskyPressed(true)
    
    // Show a simple alert for now
    alert('Coming soon! Bluesky integration is planned for a future release.')
    
    // Reset the pressed state after a brief delay
    setTimeout(() => setIsBlueskyPressed(false), 1000)
  }, [])

  // Auto-generate when tab becomes active (similar to glossary pattern)
  useEffect(() => {
    if (isActive && !hasGenerated && !isLoading) {
      generateTweetThread()
    }
  }, [isActive, hasGenerated, isLoading, generateTweetThread])

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(isLoading, hasGenerated)
  }, [isLoading, hasGenerated, onStateChange])

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
    <div className="space-y-6">
      {/* Thread Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-4">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <span>🧵 Tweet Thread</span>
          </div>
          
          <div className="inline-flex items-center space-x-2">
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className={`inline-flex items-center space-x-2 transition-all duration-200 ${
                isCopied 
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
              }`}
              disabled={tweets.length === 0}
            >
              {isCopied ? (
                <>
                  <Check size={16} className="text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy as Markdown</span>
                </>
              )}
            </Button>
            
            <Button
              onClick={handleBlueskyPost}
              variant="outline"
              size="sm"
              className={`inline-flex items-center space-x-2 transition-all duration-200 ${
                isBlueskyPressed 
                  ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100' 
                  : 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 border-sky-400 text-white shadow-md'
              }`}
              disabled={tweets.length === 0}
              title="Post thread to Bluesky (Coming soon!)"
            >
              <Cloud size={16} className={isBlueskyPressed ? 'text-sky-600' : 'text-white'} />
              <span>Post to Bluesky</span>
            </Button>
          </div>
        </div>
        {metadata && (
          <div className="text-sm text-gray-600 font-medium space-y-1">
            <div className="flex items-center justify-center space-x-4">
              <span>{metadata.tweet_count || 0} tweets</span>
              <span>•</span>
              <span>{tweets.reduce((total, tweet) => total + tweet.text.length, 0).toLocaleString()} chars in thread</span>
              <span>•</span>
              <span>{(metadata.content_length || 0).toLocaleString()} chars in document</span>
            </div>
            {metadata.truncated && (
              <div className="text-xs text-amber-600">
                Original document was truncated for processing
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thread summary */}
      {summary && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm border-2 border-blue-200/50 rounded-xl p-6 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                  <span>📝 Thread Summary</span>
                  <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    AI Generated
                  </div>
                </div>
                <div className="text-gray-700 leading-relaxed">{summary}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tweet thread */}
      <div className="space-y-4">
        {tweets.map((tweet, index) => (
          <TweetCard 
            key={index}
            tweet={tweet}
            totalTweets={tweets.length}
          />
        ))}
      </div>

      {/* Thread footer */}
      {tweets.length > 0 && (
        <div className="text-center pt-6 border-t border-gray-200">
          <div className="inline-flex items-center space-x-2 text-gray-500 text-sm">
            <span>🏁</span>
            <span>End of thread</span>
            <span>•</span>
            <span className="font-medium">{tweets.length} tweets total</span>
          </div>
        </div>
      )}
    </div>
  )
}