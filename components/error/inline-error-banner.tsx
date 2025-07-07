'use client'

import { AppErrorNotification, useErrorNotifications } from '@/lib/context/error-context'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { X } from '@phosphor-icons/react/dist/ssr/X'

export function InlineErrorBanners() {
  const { notifications, dismiss } = useErrorNotifications()
  const inlineErrors = notifications.filter(n => n.display === 'inline')

  if (inlineErrors.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-40 p-4 pointer-events-none">
      <div className="max-w-3xl mx-auto space-y-2">
        {inlineErrors.map(err => (
          <Banner key={err.id} notification={err} onDismiss={() => dismiss(err.id)} />
        ))}
      </div>
    </div>
  )
}

function Banner({ notification, onDismiss }: { notification: AppErrorNotification; onDismiss: () => void }) {
  const variant = notification.variant
  return (
    <Alert variant={variant as any} className="relative pointer-events-auto">
      <div className="flex justify-between">
        <div>
          <AlertTitle>{notification.title}</AlertTitle>
          <AlertDescription>{notification.description}</AlertDescription>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 text-current opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </Alert>
  )
} 