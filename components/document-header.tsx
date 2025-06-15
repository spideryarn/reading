'use client'

import Link from 'next/link'
import { File, Gear, TwitterLogo } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface DocumentHeaderProps {
  title: string
  slug: string
}

export function DocumentHeader({ title, slug }: DocumentHeaderProps) {
  return (
    <>
      <div className="border-b px-4 py-3 flex items-center justify-between min-h-[3rem] bg-white">
        <h1 
          className="text-xl font-semibold leading-tight text-gray-900 truncate cursor-help" 
          title={title}
        >
          {title}
        </h1>
        <div className="flex items-center gap-2">
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
              Settings
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            <Link 
              href={`/read/${slug}/tweets`}
              title="View as tweet thread"
            >
              <TwitterLogo size={16} />
              Tweet thread
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            <Link 
              href={`/api/read/${slug}/original`}
              title="View original HTML"
            >
              <File size={16} />
              View Original
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}