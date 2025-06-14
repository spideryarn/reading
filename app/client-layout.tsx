'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </NuqsAdapter>
  )
}