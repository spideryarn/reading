'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/context/auth-context'
import { Button } from '@/components/ui/button'

interface AppHeaderProps {
  title?: string
  titleLink?: string
  backLink?: string
  backText?: string
  actions?: React.ReactNode
  className?: string
}

export function AppHeader({ 
  title, 
  titleLink,
  backLink, 
  backText = "Back",
  actions, 
  className 
}: AppHeaderProps) {
  const { user, loading, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className={cn(
      "bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50",
      className
    )} style={{ height: 'var(--header-height)' }}>
      <div className="px-6 h-full">
        <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
          <div className="flex items-center gap-8 min-w-0 flex-1">
            <Link 
              href="/" 
              className="flex items-center space-x-3 transition-transform duration-200 hover:scale-105 flex-shrink-0"
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
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {backLink && (
                    <Link 
                      href={backLink}
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium flex-shrink-0"
                    >
                      <ArrowLeft size={16} />
                      {backText}
                    </Link>
                  )}
                  {title && (
                    titleLink ? (
                      <Link href={titleLink} className="text-lg font-medium text-gray-800 hover:text-gray-600 transition-colors truncate leading-tight">
                        {title}
                      </Link>
                    ) : (
                      <h1 className="text-lg font-medium text-gray-800 truncate leading-tight">
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
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm text-gray-600">
                    {user.email}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </Button>
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