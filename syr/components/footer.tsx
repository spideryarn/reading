'use client'

import Link from 'next/link'
import { House, Palette } from '@phosphor-icons/react'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/spideryarn-logo.png" 
                alt="Spideryarn" 
                className="h-6 w-auto"
              />
              <span className="text-sm text-gray-600">Spideryarn Reading</span>
            </div>
            <div className="text-xs text-gray-500">
              AI-powered document reading and analysis
            </div>
          </div>
          
          <nav className="flex items-center gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <House size={16} />
              <span>Home</span>
            </Link>
            <Link 
              href="/design" 
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Palette size={16} />
              <span>Design Reference</span>
            </Link>
          </nav>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Built with Next.js, shadcn/ui, and Claude AI • Prototype in development
          </p>
        </div>
      </div>
    </footer>
  )
}