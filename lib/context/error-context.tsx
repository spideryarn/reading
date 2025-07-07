import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

// RFC 9457 ProblemDetail interface (importing avoids circular)
export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  correlationId: string
  retryable?: boolean
}

export interface AppErrorNotification {
  id: string
  title: string
  description: string
  status: number
  correlationId?: string
  retryable?: boolean
  // For future expansion – inline vs toast vs dialog etc.
  display: 'toast' | 'inline'
  variant: 'destructive' | 'warning' | 'info' | 'success'
}

interface ErrorContextValue {
  notifications: AppErrorNotification[]
  showProblemDetail: (problem: ProblemDetail) => void
  dismiss: (id: string) => void
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined)

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppErrorNotification[]>([])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const showProblemDetail = useCallback(
    (problem: ProblemDetail) => {
      const { display, variant } = decideDisplayAndVariant(problem)
      const notification: AppErrorNotification = {
        id: uuidv4(),
        title: problem.title || 'Error',
        description: problem.detail || 'Unexpected error',
        status: problem.status,
        correlationId: problem.correlationId,
        retryable: problem.retryable ?? false,
        display,
        variant,
      }
      setNotifications((prev) => [...prev, notification])
    },
    []
  )

  return (
    <ErrorContext.Provider value={{ notifications, showProblemDetail, dismiss }}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useErrorNotifications() {
  const ctx = useContext(ErrorContext)
  if (!ctx) {
    throw new Error('useErrorNotifications must be used within ErrorProvider')
  }
  return ctx
}

function decideDisplayAndVariant(problem: ProblemDetail): { display: 'toast' | 'inline'; variant: 'destructive' | 'warning' | 'info' | 'success' } {
  // Notification decision tree based on ERROR_HANDLING_PATTERNS.md
  const { status, retryable } = problem

  // Default
  let display: 'toast' | 'inline' = 'toast'
  let variant: 'destructive' | 'warning' | 'info' | 'success' = 'warning'

  if (status < 400) {
    // Not an error
    display = 'toast'
    variant = 'info'
  } else if (status === 401) {
    // TODO: modal login path; for now toast destructive
    display = 'toast'
    variant = 'destructive'
  } else if (status === 403) {
    display = 'toast'
    variant = 'destructive'
  } else if (status === 404) {
    display = 'inline'
    variant = 'warning'
  } else if (status === 422) {
    display = 'toast'
    variant = 'warning'
  } else if ((status === 429 || status === 503 || status === 504) && retryable) {
    display = 'toast'
    variant = 'info'
  } else if (status >= 500) {
    display = 'toast'
    variant = 'destructive'
  }

  return { display, variant }
} 