'use client'

import Link from 'next/link'
import { File, FilePdf, Gear, TwitterLogo } from '@phosphor-icons/react'
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
        {/* View original file - show PDF icon for PDFs, regular file icon for others */}
        {storagePath ? (
          <Button
            asChild
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            <Link 
              href={`/api/read/${slug}/download`}
              title={originalFileType === 'application/pdf' ? "Download original PDF" : "Download original file"}
              target="_blank"
              rel="noopener noreferrer"
            >
              {originalFileType === 'application/pdf' ? <FilePdf size={16} /> : <File size={16} />}
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            <Link 
              href={`/api/read/${slug}/original`}
              title="View original HTML"
              target="_blank"
              rel="noopener noreferrer"
            >
              <File size={16} />
            </Link>
          </Button>
        )}
        
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