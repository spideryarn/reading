'use client'

interface TweetCardProps {
  tweet: {
    text: string
    number: number
  }
  totalTweets: number
}

export function TweetCard({ tweet, totalTweets }: TweetCardProps) {
  return (
    <div className="border-l-2 border-gray-200 pl-3 py-2 hover:bg-gray-50 transition-colors">
      <div className="space-y-2">
        {/* Tweet number indicator */}
        <div className="text-xs text-gray-500">
          {tweet.number}/{totalTweets}
        </div>
        
        {/* Tweet content */}
        <div className="text-base leading-relaxed text-gray-900">
          {tweet.text}
        </div>
      </div>
    </div>
  )
}