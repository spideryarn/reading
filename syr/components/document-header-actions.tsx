'use client'

import { useState } from 'react'
import Link from 'next/link'
import { File, Gear, TwitterLogo } from '@phosphor-icons/react'
import { SettingsDialog } from './settings-dialog'
import { Button } from '@/components/ui/button'

interface DocumentHeaderActionsProps {
  slug: string
}

export function DocumentHeaderActions({ slug }: DocumentHeaderActionsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setIsSettingsOpen(true)}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
          title="Settings"
        >
          <Gear size={16} />
          Settings
        </Button>
        <Button
          asChild
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          <Link 
            href={`/documents/${slug}/tweets`}
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
            href={`/api/documents/${slug}/original`}
            title="View original HTML"
          >
            <File size={16} />
            View Original
          </Link>
        </Button>
      </div>
      
      <SettingsDialog 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  )
}