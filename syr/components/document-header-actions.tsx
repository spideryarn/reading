'use client'

import Link from 'next/link'
import { File, Gear, TwitterLogo } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface DocumentHeaderActionsProps {
  slug: string
}

export function DocumentHeaderActions({ slug }: DocumentHeaderActionsProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        {/* View original */}
        <Button
          asChild
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          <Link 
            href={`/api/documents/${slug}/original`}
            title="View original HTML"
            target="_blank"
            rel="noopener noreferrer"
          >
            <File size={16} />
          </Link>
        </Button>
        
        {/* Tweet thread */}
        <Button
          asChild
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          <Link 
            href={`/documents/${slug}/tweets`}
            title="View as tweet thread"
            target="_blank"
            rel="noopener noreferrer"
          >
            <TwitterLogo size={16} />
          </Link>
        </Button>
        
        {/* Settings */}
        <Button
          asChild
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          <Link 
            href="/settings"
            target="_blank"
            rel="noopener noreferrer"
            title="Settings"
          >
            <Gear size={16} />
          </Link>
        </Button>
      </div>
    </>
  )
}