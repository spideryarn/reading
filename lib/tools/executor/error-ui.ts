/**
 * Error UI helper functions for tool execution errors.
 * 
 * This module provides the interface between the error hierarchy system
 * and the UI notification components. It handles the global state management
 * and provides convenient functions for showing different types of errors.
 * 
 * Key Design Principles:
 * - Follow the GlobalUrlWarnings pattern for consistency
 * - Provide type-safe functions for showing different error types
 * - Handle both single errors and batches of errors
 * - Support error deduplication to prevent spam
 * - Enable programmatic error dismissal
 * 
 * @see components/tool-error-notifications.tsx for UI implementation
 * @see lib/tools/executor/error-messages.ts for message transformation
 */

import type { ToolExecutorError } from './types'
import { transformErrorToMessage, getGenericErrorMessage, type ErrorMessage } from './error-messages'

/**
 * Error notification item with unique identifier
 */
export interface ErrorNotification {
  /** Unique identifier for deduplication */
  id: string
  
  /** The transformed error message */
  message: ErrorMessage
  
  /** The original error (for debugging) */
  originalError: ToolExecutorError | Error | unknown
  
  /** Timestamp when error occurred */
  timestamp: Date
  
  /** Whether this error is currently being displayed */
  visible: boolean
  
  /** Whether this error has been dismissed by user */
  dismissed: boolean
}

/**
 * Global state setter function (set by the ToolErrorNotifications component)
 */
let globalSetNotifications: ((notifications: ErrorNotification[]) => void) | null = null

/**
 * Current error notifications (maintained globally)
 */
let currentNotifications: ErrorNotification[] = []

/**
 * Register the global error notification handler
 * 
 * This should be called by the ToolErrorNotifications component when it mounts
 */
export function registerErrorNotificationHandler(
  setter: (notifications: ErrorNotification[]) => void
): () => void {
  globalSetNotifications = setter
  
  // Return cleanup function
  return () => {
    globalSetNotifications = null
  }
}

/**
 * Show a tool execution error
 * 
 * This is the main function for displaying errors from the tool execution framework
 */
export function showToolError(error: ToolExecutorError): void {
  const message = transformErrorToMessage(error)
  const notification = createErrorNotification(error, message)
  
  addNotification(notification)
}

/**
 * Show a generic error (for non-ToolExecutorError instances)
 */
export function showGenericError(error: unknown): void {
  const message = getGenericErrorMessage(error)
  const notification = createErrorNotification(error, message)
  
  addNotification(notification)
}

/**
 * Show multiple errors at once
 * 
 * This is useful for batch operations that might generate multiple errors
 */
export function showMultipleErrors(errors: (ToolExecutorError | Error | unknown)[]): void {
  const notifications = errors.map(error => {
    const message = error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? transformErrorToMessage(error as ToolExecutorError)
      : getGenericErrorMessage(error)
    
    return createErrorNotification(error, message)
  })
  
  addMultipleNotifications(notifications)
}

/**
 * Dismiss a specific error notification
 */
export function dismissError(errorId: string): void {
  currentNotifications = currentNotifications.map(notification =>
    notification.id === errorId
      ? { ...notification, dismissed: true, visible: false }
      : notification
  )
  
  updateGlobalState()
  
  // Remove dismissed notifications after a delay to allow for fade-out animation
  setTimeout(() => {
    currentNotifications = currentNotifications.filter(n => n.id !== errorId)
    updateGlobalState()
  }, 300)
}

/**
 * Dismiss all error notifications
 */
export function dismissAllErrors(): void {
  currentNotifications = currentNotifications.map(notification => ({
    ...notification,
    dismissed: true,
    visible: false
  }))
  
  updateGlobalState()
  
  // Clear all after animation
  setTimeout(() => {
    currentNotifications = []
    updateGlobalState()
  }, 300)
}

/**
 * Get all current error notifications (for testing/debugging)
 */
export function getCurrentNotifications(): readonly ErrorNotification[] {
  return Object.freeze([...currentNotifications])
}

/**
 * Clear all error notifications immediately (for testing)
 */
export function clearAllErrors(): void {
  currentNotifications = []
  updateGlobalState()
}

/**
 * Create an error notification from an error and message
 */
function createErrorNotification(
  originalError: ToolExecutorError | Error | unknown,
  message: ErrorMessage
): ErrorNotification {
  return {
    id: generateNotificationId(originalError, message),
    message,
    originalError,
    timestamp: new Date(),
    visible: true,
    dismissed: false
  }
}

/**
 * Generate a unique ID for an error notification
 * 
 * This enables deduplication of identical errors
 */
function generateNotificationId(
  error: ToolExecutorError | Error | unknown,
  message: ErrorMessage
): string {
  // Create a hash-like ID based on error content to enable deduplication
  const errorType = error instanceof Error ? error.constructor.name : 'UnknownError'
  const _errorMessage = error instanceof Error ? error.message : String(error)
  const toolId = (error as any)?.toolId || 'unknown'
  
  // Use timestamp for uniqueness while allowing deduplication of rapid identical errors
  const timestamp = Date.now()
  const baseId = `${errorType}-${toolId}-${message.title}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  
  return `${baseId}-${timestamp}`
}

/**
 * Add a single notification to the global state
 */
function addNotification(notification: ErrorNotification): void {
  // Check for duplicates within the last 5 seconds
  const fiveSecondsAgo = Date.now() - 5000
  const isDuplicate = currentNotifications.some(existing => 
    existing.timestamp.getTime() > fiveSecondsAgo &&
    existing.message.title === notification.message.title &&
    existing.message.description === notification.message.description &&
    (existing.originalError as any)?.toolId === (notification.originalError as any)?.toolId
  )
  
  if (isDuplicate) {
    // Update the timestamp of the existing notification instead of adding a duplicate
    currentNotifications = currentNotifications.map(existing =>
      existing.timestamp.getTime() > fiveSecondsAgo &&
      existing.message.title === notification.message.title &&
      existing.message.description === notification.message.description &&
      (existing.originalError as any)?.toolId === (notification.originalError as any)?.toolId
        ? { ...existing, timestamp: new Date(), visible: true }
        : existing
    )
  } else {
    // Add new notification
    currentNotifications = [...currentNotifications, notification]
  }
  
  updateGlobalState()
  
  // Auto-hide if configured
  if (notification.message.autoHideTimeout > 0) {
    setTimeout(() => {
      dismissError(notification.id)
    }, notification.message.autoHideTimeout)
  }
}

/**
 * Add multiple notifications to the global state
 */
function addMultipleNotifications(notifications: ErrorNotification[]): void {
  // Add all notifications without individual deduplication
  // (the caller is responsible for ensuring this makes sense)
  currentNotifications = [...currentNotifications, ...notifications]
  
  updateGlobalState()
  
  // Set up auto-hide timers
  notifications.forEach(notification => {
    if (notification.message.autoHideTimeout > 0) {
      setTimeout(() => {
        dismissError(notification.id)
      }, notification.message.autoHideTimeout)
    }
  })
}

/**
 * Update the global state by calling the registered setter
 */
function updateGlobalState(): void {
  if (globalSetNotifications) {
    globalSetNotifications([...currentNotifications])
  }
}

/**
 * Convenience function for showing timeout errors
 */
export function showTimeoutError(toolId: string, timeout: number): void {
  // Import dynamically to avoid circular dependencies
  import('./types').then(({ ToolTimeoutError }) => {
    const error = new ToolTimeoutError(toolId, timeout)
    showToolError(error)
  })
}

/**
 * Convenience function for showing authentication errors
 */
export function showAuthError(message?: string): void {
  import('./types').then(({ ToolAuthenticationError }) => {
    const error = new ToolAuthenticationError(message)
    showToolError(error)
  })
}

/**
 * Convenience function for showing validation errors
 */
export function showValidationError(errors: string[], toolId?: string): void {
  import('./types').then(({ ToolValidationError }) => {
    const options = toolId ? { toolId } : undefined
    const error = new ToolValidationError(errors, options)
    showToolError(error)
  })
}

/**
 * Convenience function for showing server errors
 */
export function showServerError(message: string, httpStatus?: number, toolId?: string): void {
  import('./types').then(({ ToolServerError }) => {
    const options = toolId ? { toolId } : undefined
    const error = new ToolServerError(message, httpStatus, options)
    showToolError(error)
  })
}

/**
 * Hook into the executor's error handling
 * 
 * This can be used to automatically show errors from tool execution
 */
export function withErrorNotification<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
        showToolError(error as ToolExecutorError)
      } else {
        showGenericError(error)
      }
      throw error // Re-throw so the original caller can handle it
    }
  }) as T
}