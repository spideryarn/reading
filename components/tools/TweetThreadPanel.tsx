'use client'

// Temporary placeholder for the Tweet Thread panel while the feature is under active refactor.
// This stub unblocks the build by fulfilling the expected export and displaying a friendly
// message to the user. Remove or replace once the new implementation is ready.

import React from 'react'
import { TwitterLogo } from '@phosphor-icons/react'
import { AlertWithIcon } from '@/components/ui/alert'

interface TweetThreadPanelProps {
  documentId: string
  slug: string
}

export function TweetThreadPanel({ }: TweetThreadPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-blue-50 flex items-center justify-center">
        <TwitterLogo size={24} weight="bold" className="text-blue-600" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">Tweet Thread Temporarily Disabled</h3>
      <p className="max-w-sm mb-6 text-sm text-gray-600">
        We&rsquo;re currently re-working how tweet threads are generated for documents.<br />
        This feature will return soon — thanks for your patience!
      </p>
      <AlertWithIcon
        variant="info"
        title="Feature in progress"
        description="The tweet-thread builder is under active development."
      />
    </div>
  )
} 