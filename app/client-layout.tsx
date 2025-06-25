'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { GlobalUrlWarnings } from '@/components/global-url-warnings'
import { useEffect } from 'react'
import { initializeToolRegistry } from '@/lib/tools/registry-loader'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Initialize tool registry on app startup
  useEffect(() => {
    initializeToolRegistry().catch(error => {
      console.error('Failed to initialize tool registry:', error)
    })
  }, [])

  return (
    <NuqsAdapter>
      <AuthProvider>
        {children}
        <GlobalUrlWarnings />
      </AuthProvider>
    </NuqsAdapter>
  )
}