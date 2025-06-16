'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/context/auth-context'
import { Button } from '@/components/ui/button'
import { ProfileDropdown } from '@/components/auth/profile-dropdown'

interface AppHeaderProps {
  title?: string
  titleLink?: string
  backLink?: string
  backText?: string
  actions?: React.ReactNode
  className?: string
  logoLink?: string
}

export function AppHeader({ 
  title, 
  titleLink,
  backLink, 
  backText = "Back",
  actions, 
  className,
  logoLink
}: AppHeaderProps) {
  const { user, loading } = useAuth()

  return (
    <header className={cn(
      "bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50",
      className
    )} style={{ height: 'var(--header-height)' }}>
      <div className="px-3 sm:px-6 h-full">
        <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
          <div className="flex items-center gap-8 min-w-0 flex-1">
            <Link 
              href={logoLink || "/"} 
              className="flex items-center space-x-3 transition-transform duration-200 hover:scale-105 flex-shrink-0"
              aria-label="Return to homepage"
            >
              <Image
                src="/spideryarn-logo.png"
                alt="Spideryarn logo"
                width={32}
                height={32}
                className="drop-shadow-md h-6 w-6 sm:h-8 sm:w-8"
              />
              <span className="hidden sm:inline text-xl font-semibold text-spideryarn-orange font-trebuchet">
                Spideryarn
              </span>
            </Link>
            
            {(title || backLink) && (
              <>
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {backLink && (
                    <Link 
                      href={backLink}
                      className="flex items-center gap-1 sm:gap-2 text-gray-500 hover:text-gray-700 transition-colors text-xs sm:text-sm font-medium flex-shrink-0"
                    >
                      <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
                      {backText}
                    </Link>
                  )}
                  {title && (
                    titleLink ? (
                      <Link 
                        href={titleLink} 
                        className="text-sm sm:text-lg font-medium text-gray-800 hover:text-gray-600 transition-colors truncate leading-tight cursor-help"
                        title={title}
                      >
                        {title}
                      </Link>
                    ) : (
                      <h1 
                        className="text-sm sm:text-lg font-medium text-gray-800 truncate leading-tight cursor-help"
                        title={title}
                      >
                        {title}
                      </h1>
                    )
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {actions}
            
            {!loading && (
              user ? (
                <div className="ml-4">
                  <ProfileDropdown user={user} />
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                  >
                    <Link href="/auth/login">
                      Log in
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="orange"
                    size="sm"
                  >
                    <Link href="/auth/signup">
                      Register
                    </Link>
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  )
}