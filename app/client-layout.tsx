'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { GlobalUrlWarnings } from '@/components/global-url-warnings'
import { ToolErrorNotifications } from '@/components/tool-error-notifications'
import { TooltipManagerProvider } from '@/lib/context/tooltip-manager'
import { ErrorProvider } from '@/lib/context/error-context'
import { AppErrorToast } from '@/components/error/app-error-toast'
import { InlineErrorBanners } from '@/components/error/inline-error-banner'
import '@/lib/tools/registry-loader'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // (Tool registry initialises synchronously – no useEffect required.)

  return (
    <NuqsAdapter>
      <AuthProvider>
        <ErrorProvider>
          <TooltipManagerProvider>
            {children}
            <GlobalUrlWarnings />
            <ToolErrorNotifications />
            <AppErrorToast />
            <InlineErrorBanners />
          </TooltipManagerProvider>
        </ErrorProvider>
      </AuthProvider>
    </NuqsAdapter>
  )
}