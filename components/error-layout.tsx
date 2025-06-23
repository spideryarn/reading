'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, House } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'

interface ErrorLayoutProps {
  errorCode: string
  title: string
  description: string
  children?: React.ReactNode
}

export function ErrorLayout({ errorCode, title, description, children }: ErrorLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Simple header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-spideryarn-orange font-trebuchet text-xl font-bold">
            Spideryarn
          </Link>
        </div>
      </header>

      {/* Main error content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          {/* Error code */}
          <div className="text-6xl font-bold text-gray-300 mb-4">
            {errorCode}
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            {title}
          </h1>
          
          {/* Description */}
          <p className="text-gray-600 mb-8">
            {description}
          </p>
          
          {/* Custom content */}
          {children}
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="orange" asChild>
              <Link href="/">
                <House size={16} className="mr-2" />
                Go Home
              </Link>
            </Button>
            
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft size={16} className="mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </main>

      {/* Simple footer */}
      <footer className="border-t border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          © 2025 Spideryarn. AI-powered document reading and analysis.
        </div>
      </footer>
    </div>
  )
}