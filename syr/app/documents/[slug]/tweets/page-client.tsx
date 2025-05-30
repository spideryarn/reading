'use client'

import { useState } from 'react'
import { TweetThreadView } from '@/components/tweet-thread-view'

interface TweetThreadPageClientProps {
  documentContent: string
  documentTitle: string
  slug: string
}

export function TweetThreadPageClient({ 
  documentContent 
}: TweetThreadPageClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const handleStateChange = (loading: boolean, generated: boolean) => {
    setIsLoading(loading)
    setHasGenerated(generated)
  }

  // Show title and description when not loading and not generated, or when loading
  const showTitleAndDescription = !hasGenerated || isLoading

  return (
    <>
      {showTitleAndDescription && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tweet Thread Generator</h1>
          <p className="text-gray-600 leading-relaxed">
            Transform your document into an engaging Twitter thread. Each tweet is carefully crafted to maintain engagement while preserving the core message.
          </p>
        </div>
      )}
      
      <TweetThreadView 
        documentContent={documentContent} 
        isActive={true} 
        onStateChange={handleStateChange}
      />
    </>
  )
}