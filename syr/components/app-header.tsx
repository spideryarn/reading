'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  title?: string
  backLink?: string
  backText?: string
  actions?: React.ReactNode
  className?: string
}

export function AppHeader({ 
  title, 
  backLink, 
  backText = "Back",
  actions, 
  className 
}: AppHeaderProps) {
  return (
    <header className={cn(
      "bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50",
      className
    )} style={{ height: 'var(--header-height)' }}>
      <div className="px-4 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="flex items-center space-x-2 transition-transform duration-200 hover:scale-105"
              aria-label="Return to homepage"
            >
              <Image
                src="/spideryarn-logo.png"
                alt="Spideryarn logo"
                width={32}
                height={32}
                style={{ width: "auto", height: "auto" }}
                className="drop-shadow-md h-8 w-8"
              />
              <span className="text-xl font-semibold text-spideryarn-orange font-trebuchet">
                Spideryarn
              </span>
            </Link>
            
            {(title || backLink) && (
              <>
                <div className="h-6 w-px bg-gray-300" />
                <div className="flex items-center gap-3">
                  {backLink && (
                    <Link 
                      href={backLink}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <ArrowLeft size={16} />
                      {backText}
                    </Link>
                  )}
                  {title && (
                    <h1 className="text-lg font-semibold text-gray-900">
                      {title}
                    </h1>
                  )}
                </div>
              </>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}