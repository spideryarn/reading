'use client'

import { AuthProvider } from '@/lib/context/auth-context'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}