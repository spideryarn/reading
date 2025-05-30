'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Fragment } from 'react'

// Function to parse tweet text and style hashtags with enhanced interactions
function parseHashtags(text: string) {
  // Split text by hashtags while preserving the hashtags
  const parts = text.split(/(#\w+)/g)
  
  return parts.map((part, index) => {
    // Check if this part is a hashtag
    if (part.match(/^#\w+$/)) {
      return (
        <span 
          key={index} 
          className="text-blue-500 hover:text-blue-600 font-medium transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 hover:bg-blue-50 px-1 py-0.5 rounded"
          title={`Hashtag: ${part}`}
          aria-label={`Hashtag ${part}`}
        >
          {part}
        </span>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

interface TweetCardProps {
  tweet: {
    text: string
    number: number
  }
  totalTweets: number
}

export function TweetCard({ tweet, totalTweets }: TweetCardProps) {
  const isLastTweet = tweet.number === totalTweets
  const characterCount = tweet.text.length
  const isLongTweet = characterCount > 200
  
  // Character count color based on Twitter's approach
  const getCharacterCountColor = () => {
    if (characterCount > 250) return 'text-red-500'
    if (characterCount > 200) return 'text-amber-500'
    return 'text-gray-400'
  }
  
  return (
    <Card className={cn(
      "relative transition-all duration-300 hover:shadow-lg hover:shadow-blue-200/50 sm:hover:scale-[1.02] group cursor-pointer",
      "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-white",
      "hover:from-blue-50 hover:to-blue-50 hover:border-l-blue-600",
      "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50",
      "active:scale-[0.98] active:shadow-md",
      "mobile-optimized"
    )}>
      <CardContent className="p-5 sm:p-6">
        <div className="space-y-3">
          {/* Thread progress indicator */}
          <div className="flex items-center justify-end mb-2">
            <div className="text-xs text-gray-400 font-mono bg-gradient-to-r from-gray-50 to-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-gray-200 transition-all duration-200 group-hover:from-blue-50 group-hover:to-blue-100 group-hover:border-blue-200 group-hover:text-blue-600">
              <span className="font-semibold">{tweet.number}</span>
              <span className="text-gray-300 group-hover:text-blue-400">/</span>
              <span>{totalTweets}</span>
            </div>
          </div>
          
          {/* Tweet content with enhanced typography */}
          <div className={cn(
            "text-gray-900 leading-relaxed mb-4",
            "prose prose-sm max-w-none",
            // Dynamic text sizing based on content length and screen size
            isLongTweet ? "text-sm" : "text-sm sm:text-base",
            "selection:bg-blue-100 selection:text-blue-900"
          )}>
            <p className="mb-0 transition-all duration-200 group-hover:text-gray-800">
              {parseHashtags(tweet.text)}
            </p>
          </div>
          
          {/* Enhanced character count and metadata */}
          <div className="pt-3 border-t border-gray-100 group-hover:border-blue-200 transition-colors duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className={cn(
                "text-xs font-medium transition-colors duration-200",
                getCharacterCountColor()
              )}>
                <span className="inline-flex items-center space-x-1">
                  <span>✏️</span>
                  <span className="hidden sm:inline">{characterCount} characters</span>
                  <span className="sm:hidden">{characterCount} chars</span>
                </span>
              </div>
              
              {/* Visual character limit indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-12 sm:w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      characterCount <= 200 ? "bg-green-400" :
                      characterCount <= 250 ? "bg-amber-400" : "bg-red-400"
                    )}
                    style={{ width: `${Math.min((characterCount / 280) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-400 font-mono">280</span>
              </div>
            </div>
            
            {/* Additional metadata for long tweets */}
            {isLongTweet && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                <span className="hidden sm:inline">⚠️ Long tweet - consider splitting for better engagement</span>
                <span className="sm:hidden">⚠️ Long tweet</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* Enhanced thread connection line with animation */}
      {!isLastTweet && (
        <>
          <div className="absolute -bottom-2 left-1 w-0.5 h-4 bg-gradient-to-b from-blue-300 to-transparent group-hover:from-blue-500 transition-colors duration-200"></div>
          <div className="absolute -bottom-1 left-0.5 w-1 h-1 bg-blue-400 rounded-full group-hover:bg-blue-600 transition-colors duration-200"></div>
        </>
      )}
      
      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-300 pointer-events-none"></div>
    </Card>
  )
}