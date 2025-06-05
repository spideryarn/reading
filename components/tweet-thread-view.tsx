'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { TweetCard } from './tweet-card'
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
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    )
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Thread Header */}
      <div className="text-center space-y-4 animate-in slide-in-from-top duration-700">
        <div className="flex items-center justify-center space-x-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            🧵 Tweet Thread
          </h1>
          {isLoaded && (
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              Loaded
            </span>
          )}
        </div>
        {(isLoaded || hasGenerated) && (
          <div className="flex justify-center">
            <Button
              onClick={regenerateTweetThread}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              title="Regenerate tweet thread"
              disabled={isLoading}
            >
              <ArrowCounterClockwise size={16} />
              <span className="ml-1">Reset</span>
            </Button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                isCopied 
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shadow-lg shadow-green-200/50' 
                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:shadow-md'
              }`}
              disabled={tweets.length === 0}
              aria-label={isCopied ? 'Tweet thread copied to clipboard' : 'Copy tweet thread as Markdown'}
            >
              {isCopied ? (
                <>
                  <Check size={16} className="text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span className="hidden sm:inline">Copy as Markdown</span>
                  <span className="sm:hidden">Copy</span>
                </>
              )}
            </Button>
            
            <Button
              onClick={handleBlueskyPost}
              variant="outline"
              size="sm"
              className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 ${
                isBlueskyPressed 
                  ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 shadow-lg shadow-sky-200/50' 
                  : 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 border-sky-400 text-white shadow-md hover:shadow-lg'
              }`}
              disabled={tweets.length === 0}
              title="Post thread to Bluesky (Coming soon!)"
              aria-label="Post thread to Bluesky social network"
            >
              <Cloud size={16} className={isBlueskyPressed ? 'text-sky-600' : 'text-white'} />
              <span>Post to Bluesky</span>
            </Button>
          </div>
        </div>
        {metadata && (
          <div className="text-sm text-gray-600 font-medium space-y-1 animate-in slide-in-from-bottom duration-700 delay-200">
            <div className="flex items-center justify-center flex-wrap gap-2">
              <div className="inline-flex items-center space-x-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                <span>📊</span>
                <span>{metadata.tweet_count || 0} tweets</span>
              </div>
              <div className="inline-flex items-center space-x-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                <span>✏️</span>
                <span className="hidden sm:inline">{tweets.reduce((total, tweet) => total + tweet.text.length, 0).toLocaleString()} chars in thread</span>
                <span className="sm:hidden">{tweets.reduce((total, tweet) => total + tweet.text.length, 0).toLocaleString()} thread chars</span>
              </div>
              <div className="inline-flex items-center space-x-1 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                <span>📄</span>
                <span className="hidden sm:inline">{(metadata.content_length || 0).toLocaleString()} chars in document</span>
                <span className="sm:hidden">{(metadata.content_length || 0).toLocaleString()} doc chars</span>
              </div>
            </div>
            {metadata.truncated && (
              <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 animate-pulse mx-4">
                ⚠️ Original document was truncated for processing
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thread summary */}
      {summary && (
        <div className="relative mb-8 animate-in slide-in-from-left duration-800 delay-300">
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-red-50 rounded-2xl transform rotate-1"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 rounded-2xl transform -rotate-1"></div>
          
          {/* Main summary card */}
          <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 sm:p-8 shadow-xl shadow-amber-100/50">
            <div className="flex items-start space-x-4">
              {/* Large distinctive icon */}
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50 ring-4 ring-white">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              
              <div className="flex-1 space-y-3">
                {/* Header with larger typography */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-bold text-amber-900 flex items-center space-x-2">
                      <span>📋</span>
                      <span>Thread Overview</span>
                    </h3>
                    <div className="px-3 py-1.5 bg-gradient-to-r from-amber-200 to-orange-200 text-amber-800 text-xs rounded-full font-bold shadow-sm border border-amber-300">
                      ✨ AI SUMMARY
                    </div>
                  </div>
                </div>
                
                {/* Summary content with enhanced typography */}
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 shadow-sm">
                  <div className="text-amber-900 leading-relaxed text-sm sm:text-base font-medium">{summary}</div>
                </div>
                
                {/* Metadata bar */}
                <div className="flex items-center space-x-4 text-xs text-amber-700 bg-amber-100/50 rounded-lg px-3 py-2">
                  <div className="flex items-center space-x-1">
                    <span>🎯</span>
                    <span className="font-medium">Key insights extracted from {tweets.length} tweets</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tweet thread */}
      <div className="space-y-4 animate-in slide-in-from-bottom duration-700 delay-500">
        {tweets.map((tweet, index) => (
          <div 
            key={index} 
            className="animate-in slide-in-from-right duration-500"
            style={{ animationDelay: `${(index * 100) + 600}ms` }}
          >
            <TweetCard 
              tweet={tweet}
              totalTweets={tweets.length}
            />
          </div>
        ))}
      </div>

      {/* Thread footer */}
      {tweets.length > 0 && (
        <div className="text-center pt-6 border-t border-gray-200 animate-in fade-in duration-700 delay-1000">
          <div className="inline-flex items-center space-x-2 text-gray-500 text-sm bg-gray-50 px-4 py-3 rounded-full hover:bg-gray-100 transition-colors duration-200">
            <span className="animate-bounce">🏁</span>
            <span>End of thread</span>
            <span>•</span>
            <span className="font-medium text-gray-700">{tweets.length} tweets total</span>
          </div>
        </div>
      )}
    </div>
  )
}