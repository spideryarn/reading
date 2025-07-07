'use client'

import { useEffect, useState } from 'react'
import { AppErrorNotification, useErrorNotifications } from '@/lib/context/error-context'
import { AlertWithIcon } from '@/components/ui/alert'
import { X } from '@phosphor-icons/react/dist/ssr/X'
// Use native clipboard where available

/**
 * Displays toast-style error notifications (bottom-right corner)
 */
export function AppErrorToast() {
  const { notifications, dismiss } = useErrorNotifications()
  const toastNotifications = notifications.filter(n => n.display === 'toast')

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toastNotifications.map(n => (
        <Toast key={n.id} notification={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>
  )
}

function Toast({ notification, onDismiss }: { notification: AppErrorNotification; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(timer)
  }, [])

  // Auto hide after 6s unless retryable
  useEffect(() => {
    if (!notification.retryable) {
      const t = setTimeout(() => {
        handleClose()
      }, 6000)
      return () => clearTimeout(t)
    }
  }, [notification.retryable])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => onDismiss(), 300)
  }

  const handleCopyId = () => {
    if (notification.correlationId) {
      navigator.clipboard.writeText(notification.correlationId)
    }
  }

  const variant = notification.variant

  return (
    <div
      className={`transform transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <AlertWithIcon
        variant={variant as any}
        title={notification.title}
        description={notification.description}
        className="shadow-lg pr-8"
      />
      <div className="absolute top-1 right-1 flex gap-1">
        {notification.correlationId && (
          <button
            onClick={handleCopyId}
            className="text-xs text-gray-400 hover:text-gray-600"
            title="Copy correlation ID"
          >
            ID
          </button>
        )}
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
} 