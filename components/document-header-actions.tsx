'use client'

import Link from 'next/link'
import { TwitterLogo } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface DocumentHeaderActionsProps {
  slug: string
  storagePath: string | null
  originalFileType: string | null
}

export function DocumentHeaderActions({ slug, storagePath, originalFileType }: DocumentHeaderActionsProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        {/* Tweet thread */}
        <Button
          asChild
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          <Link 
            href={`/read/${slug}/tweets`}
            title="View as tweet thread"
            target="_blank"
            rel="noopener noreferrer"
          >
            <TwitterLogo size={16} />
          </Link>
        </Button>
      </div>
    </>
  )
}