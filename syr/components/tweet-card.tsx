'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TweetCardProps {
  tweet: {
    text: string
    number: number
  }
  totalTweets: number
}

export function TweetCard({ tweet, totalTweets }: TweetCardProps) {
  const isLastTweet = tweet.number === totalTweets
  
  return (
    <Card className={cn(
      "relative transition-all duration-200 hover:shadow-md hover:scale-[1.01] group",
      "border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-white",
      "hover:from-blue-50 hover:to-blue-50 hover:border-l-blue-600"
    )}>
      <CardContent className="p-5">
        <div className="space-y-3">
          {/* Thread progress indicator */}
          <div className="flex items-center justify-end">
            <div className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-full">
              {tweet.number}/{totalTweets}
            </div>
          </div>
          
          {/* Tweet content */}
          <div className={cn(
            "text-gray-900 leading-relaxed",
            "prose prose-sm max-w-none",
            // Twitter-like text sizing
            tweet.text.length > 200 ? "text-sm" : "text-base"
          )}>
            <p className="mb-0">{tweet.text}</p>
          </div>
          
          {/* Character count indicator (Twitter-like) */}
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-400">
              {tweet.text.length} characters
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Thread connection line */}
      {!isLastTweet && (
        <div className="absolute -bottom-2 left-1 w-0.5 h-4 bg-gradient-to-b from-blue-300 to-transparent"></div>
      )}
    </Card>
  )
}