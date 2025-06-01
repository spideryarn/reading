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
        <div className={`mb-8 transition-all duration-500 ${
          isLoading 
            ? 'animate-pulse opacity-75 transform scale-95' 
            : 'animate-in slide-in-from-top duration-700'
        }`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Tweet Thread Generator
              </h1>
              <div className="flex items-center space-x-2">
                <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                  ✨ AI POWERED 🧵
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
            <p className="text-gray-700 leading-relaxed text-lg">
              Transform your document into an <span className="font-semibold text-blue-600">engaging Twitter-style thread</span>. 
              Each tweet is carefully crafted to maintain engagement while preserving the core message.
            </p>
            {isLoading && (
              <div className="mt-4 flex items-center space-x-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
          </div>
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