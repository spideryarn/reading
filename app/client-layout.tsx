'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { GlobalUrlWarnings } from '@/components/global-url-warnings'
import { ToolErrorNotifications } from '@/components/tool-error-notifications'
import { TooltipManagerProvider } from '@/lib/context/tooltip-manager'
import '@/lib/tools/registry-loader'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // (Tool registry initialises synchronously – no useEffect required.)

  return (
    <NuqsAdapter>
      <AuthProvider>
        <TooltipManagerProvider>
          {children}
          <GlobalUrlWarnings />
          <ToolErrorNotifications />
        </TooltipManagerProvider>
      </AuthProvider>
    </NuqsAdapter>
  )
}