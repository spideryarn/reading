'use client'

import { useState } from 'react'
import Link from 'next/link'
import { File, Gear } from '@phosphor-icons/react'
import { SettingsDialog } from './settings-dialog'

interface DocumentHeaderProps {
  title: string
  slug: string
}

export function DocumentHeader({ title, slug }: DocumentHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <div className="border-b px-4 py-3 flex items-center justify-between min-h-[3rem] bg-white">
        <h1 className="text-xl font-semibold leading-tight text-gray-900">{title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Settings"
          >
            <Gear size={16} />
            Settings
          </button>
          <Link 
            href={`/api/documents/${slug}/original`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="View original HTML"
          >
            <File size={16} />
            View Original
          </Link>
        </div>
      </div>
      
      <SettingsDialog 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  )
}