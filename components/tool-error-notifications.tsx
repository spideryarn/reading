'use client'

/**
 * Tool error notification system component
 * 
 * This component provides user-friendly display of tool execution errors
 * following the established GlobalUrlWarnings pattern. It supports:
 * - Toast notifications for transient errors
 * - Modal dialogs for critical errors  
 * - Inline warnings for validation errors
 * - Auto-dismiss and manual dismiss functionality
 * - Error deduplication and batch handling
 * 
 * @see lib/tools/executor/error-ui.ts for state management
 * @see lib/tools/executor/error-messages.ts for message transformation
 * @see components/global-url-warnings.tsx for the pattern this follows
 */

import React, { useState, useEffect } from 'react'
import { 
  Warning, 
  X, 
  Info, 
  XCircle
} from "@phosphor-icons/react/dist/ssr"
import { 
  registerErrorNotificationHandler, 
  dismissError, 
  dismissAllErrors,
  type ErrorNotification 
} from '@/lib/tools/executor/error-ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

/**
 * Main error notifications component
 * 
 * This should be rendered once at the app level (in ClientLayout)
 */
export function ToolErrorNotifications() {
  const [notifications, setNotifications] = useState<ErrorNotification[]>([])
  const [dialogError, setDialogError] = useState<ErrorNotification | null>(null)

  // Register as the global error handler
  useEffect(() => {
    const cleanup = registerErrorNotificationHandler(setNotifications)
    return cleanup
  }, [])

  // Handle dialog errors separately from toast/inline errors
  useEffect(() => {
    const dialogNotification = notifications.find(n => 
      n.visible && n.message.displayMethod === 'dialog' && !n.dismissed
    )
    
    if (dialogNotification && !dialogError) {
      setDialogError(dialogNotification)
    } else if (!dialogNotification && dialogError) {
      setDialogError(null)
    }
  }, [notifications, dialogError])

  // Get toast and inline notifications
  const toastNotifications = notifications.filter(n => 
    n.visible && n.message.displayMethod === 'toast' && !n.dismissed
  )
  
  const inlineNotifications = notifications.filter(n => 
    n.visible && n.message.displayMethod === 'inline' && !n.dismissed
  )

  return (
    <>
      {/* Toast Notifications Container */}
      <ToastContainer notifications={toastNotifications} />
      
      {/* Inline Notifications Container */}
      <InlineContainer notifications={inlineNotifications} />
      
      {/* Dialog for Critical Errors */}
      <ErrorDialog 
        notification={dialogError} 
        onClose={() => dialogError && dismissError(dialogError.id)}
      />
    </>
  )
}

/**
 * Container for toast-style notifications (top-right corner)
 */
function ToastContainer({ notifications }: { notifications: ErrorNotification[] }) {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map(notification => (
        <ToastNotification 
          key={notification.id} 
          notification={notification} 
        />
      ))}
      
      {/* Show "Dismiss All" button if there are multiple notifications */}
      {notifications.length > 1 && (
        <button
          onClick={dismissAllErrors}
          className="self-end text-xs text-gray-500 hover:text-gray-700 px-2 py-1 
                     bg-white/80 hover:bg-white/90 rounded border border-gray-200 
                     shadow-sm transition-colors"
        >
          Dismiss All
        </button>
      )}
    </div>
  )
}

/**
 * Individual toast notification
 */
function ToastNotification({ notification }: { notification: ErrorNotification }) {
  const [isVisible, setIsVisible] = useState(false)

  // Animate in after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Hide animation when dismissed
  useEffect(() => {
    if (notification.dismissed) {
      setIsVisible(false)
    }
  }, [notification.dismissed])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => dismissError(notification.id), 300)
  }

  const { severity, title, description, actionGuidance } = notification.message
  const Icon = getErrorIcon(severity)
  const styles = getErrorStyles(severity)

  return (
    <div className={`transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={cn("rounded-lg shadow-lg p-3", styles.background)}>
        <div className="flex items-start gap-2">
          <Icon 
            size={16} 
            weight="bold" 
            className={cn("mt-0.5 flex-shrink-0", styles.icon)} 
          />
          <div className="flex-1 min-w-0">
            <div className={cn("text-sm font-medium mb-1", styles.title)}>
              {title}
            </div>
            <div className={cn("text-xs", styles.description)}>
              {description}
            </div>
            {actionGuidance && (
              <div className={cn("text-xs mt-1 font-medium", styles.action)}>
                {actionGuidance}
              </div>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className={cn(
              "transition-colors p-0.5 rounded",
              styles.closeButton,
              styles.closeButtonHover
            )}
            aria-label="Dismiss"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Container for inline notifications (top of page content)
 */
function InlineContainer({ notifications }: { notifications: ErrorNotification[] }) {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 p-4">
      <div className="max-w-4xl mx-auto space-y-2">
        {notifications.map(notification => (
          <InlineNotification 
            key={notification.id} 
            notification={notification} 
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual inline notification (full-width alert style)
 */
function InlineNotification({ notification }: { notification: ErrorNotification }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (notification.dismissed) {
      setIsVisible(false)
    }
  }, [notification.dismissed])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => dismissError(notification.id), 300)
  }

  const { severity, title, description, actionGuidance } = notification.message
  const variant = severity === 'critical' || severity === 'error' ? 'destructive' : 'warning'

  return (
    <div className={`transform transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <Alert variant={variant} className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription className="mt-1">
              {description}
              {actionGuidance && (
                <div className="mt-1 font-medium">
                  {actionGuidance}
                </div>
              )}
            </AlertDescription>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-4 text-current opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      </Alert>
    </div>
  )
}

/**
 * Modal dialog for critical errors
 */
function ErrorDialog({ 
  notification, 
  onClose 
}: { 
  notification: ErrorNotification | null
  onClose: () => void 
}) {
  if (!notification) {
    return null
  }

  const { severity, title, description, actionGuidance } = notification.message
  const Icon = getErrorIcon(severity)

  return (
    <Dialog open={!!notification} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Icon size={24} weight="bold" className="text-red-600" />
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="text-base">
          {description}
        </DialogDescription>
        {actionGuidance && (
          <div className="bg-gray-50 rounded-md p-3 mt-2">
            <div className="text-sm font-medium text-gray-900">
              What to do next:
            </div>
            <div className="text-sm text-gray-700 mt-1">
              {actionGuidance}
            </div>
          </div>
        )}
        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 
                       transition-colors text-sm font-medium"
          >
            Got it
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Get appropriate icon for error severity
 */
function getErrorIcon(severity: string) {
  switch (severity) {
    case 'critical':
    case 'error':
      return XCircle
    case 'warning':
      return Warning
    case 'info':
      return Info
    default:
      return Warning
  }
}

/**
 * Get styling for different error severities
 */
function getErrorStyles(severity: string) {
  switch (severity) {
    case 'critical':
    case 'error':
      return {
        background: "bg-red-50 border border-red-200",
        icon: "text-red-600",
        title: "text-red-800",
        description: "text-red-700", 
        action: "text-red-800",
        closeButton: "text-red-400 hover:text-red-600",
        closeButtonHover: "hover:bg-red-100"
      }
    case 'warning':
      return {
        background: "bg-orange-50 border border-orange-200",
        icon: "text-orange-600",
        title: "text-orange-800",
        description: "text-orange-700",
        action: "text-orange-800", 
        closeButton: "text-orange-400 hover:text-orange-600",
        closeButtonHover: "hover:bg-orange-100"
      }
    case 'info':
      return {
        background: "bg-blue-50 border border-blue-200",
        icon: "text-blue-600",
        title: "text-blue-800",
        description: "text-blue-700",
        action: "text-blue-800",
        closeButton: "text-blue-400 hover:text-blue-600", 
        closeButtonHover: "hover:bg-blue-100"
      }
    default:
      return {
        background: "bg-gray-50 border border-gray-200",
        icon: "text-gray-600",
        title: "text-gray-800", 
        description: "text-gray-700",
        action: "text-gray-800",
        closeButton: "text-gray-400 hover:text-gray-600",
        closeButtonHover: "hover:bg-gray-100"
      }
  }
}

/**
 * Development helper component for testing error notifications
 * 
 * This can be used during development to test different error scenarios
 */
export function ErrorNotificationTester() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white border rounded-lg shadow-lg p-3">
      <div className="text-xs font-medium text-gray-700 mb-2">Error Testing</div>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => {
            import('@/lib/tools/executor/error-ui').then(({ showTimeoutError }) => {
              showTimeoutError('test-tool', 30000)
            })
          }}
          className="text-xs px-2 py-1 bg-orange-100 hover:bg-orange-200 rounded"
        >
          Timeout Error
        </button>
        <button
          onClick={() => {
            import('@/lib/tools/executor/error-ui').then(({ showAuthError }) => {
              showAuthError()
            })
          }}
          className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded"
        >
          Auth Error
        </button>
        <button
          onClick={() => {
            import('@/lib/tools/executor/error-ui').then(({ showValidationError }) => {
              showValidationError(['Invalid input format'], 'test-tool')
            })
          }}
          className="text-xs px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded"
        >
          Validation Error
        </button>
        <button
          onClick={() => {
            import('@/lib/tools/executor/error-ui').then(({ showServerError }) => {
              showServerError('Service temporarily unavailable', 503, 'test-tool')
            })
          }}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
        >
          Server Error
        </button>
      </div>
    </div>
  )
}