/**
 * Error message transformation utilities for tool execution errors.
 * 
 * This module provides functions to convert technical error information
 * into user-friendly messages that provide actionable guidance.
 * 
 * Key Design Principles:
 * - Transform technical errors into human-readable messages
 * - Provide "what went wrong" and "what to try" guidance
 * - Include appropriate calls-to-action based on error type
 * - Maintain consistency with existing error messaging patterns
 * 
 * @see lib/tools/executor/types.ts for error hierarchy
 * @see components/tool-error-notifications.tsx for UI integration
 */

import type {
  ToolExecutorError,
  ToolTimeoutError,
  ToolValidationError,
  ToolNotFoundError,
  ToolCancelledError
} from './types'
import {
  ToolServerError
} from './types'

/**
 * User-friendly error message with actionable guidance
 */
export interface ErrorMessage {
  /** Short summary of what went wrong */
  title: string
  
  /** Detailed explanation of the issue */
  description: string
  
  /** What the user should try next */
  actionGuidance?: string
  
  /** Whether this error can be retried */
  retryable: boolean
  
  /** Suggested UI treatment */
  severity: 'info' | 'warning' | 'error' | 'critical'
  
  /** Suggested display method */
  displayMethod: 'toast' | 'dialog' | 'inline'
  
  /** Auto-dismiss timeout in milliseconds (0 = manual dismiss) */
  autoHideTimeout: number
}

/**
 * Transform a ToolExecutorError into a user-friendly message
 */
export function transformErrorToMessage(error: ToolExecutorError): ErrorMessage {
  // Handle specific error types
  if (error.code === 'TOOL_TIMEOUT') {
    return transformTimeoutError(error as ToolTimeoutError)
  }
  
  if (error.code === 'TOOL_AUTH_FAILED') {
    return transformAuthError()
  }
  
  if (error.code === 'TOOL_VALIDATION_FAILED') {
    return transformValidationError(error as ToolValidationError)
  }
  
  if (error.code === 'TOOL_SERVER_ERROR') {
    return transformServerError(error as ToolServerError)
  }
  
  if (error.code === 'TOOL_NOT_FOUND') {
    return transformNotFoundError(error as ToolNotFoundError)
  }
  
  if (error.code === 'TOOL_CANCELLED') {
    return transformCancelledError(error as ToolCancelledError)
  }
  
  // Custom: malformed headings cache – surfaced as clear toast with correlation ID
  if (error.code === 'MALFORMED_HEADINGS_CACHE') {
    return {
      title: 'Document headings cache is corrupted',
      description: 'We found a problem loading saved AI-generated headings for this document. Please try regenerating them.',
      actionGuidance: 'Click "Improve headings" again to regenerate. If the problem persists, contact support with the correlation ID shown.',
      retryable: false,
      severity: 'error',
      displayMethod: 'toast',
      autoHideTimeout: 8000
    }
  }
  
  // Fallback for unknown error types
  return {
    title: 'Unexpected Error',
    description: error.message || 'An unexpected error occurred',
    actionGuidance: 'Please try again or contact support if the problem persists',
    retryable: false,
    severity: 'error',
    displayMethod: 'toast',
    autoHideTimeout: 5000
  }
}

/**
 * Transform timeout errors into user-friendly messages
 */
function transformTimeoutError(error: ToolTimeoutError): ErrorMessage {
  const toolName = error.toolId ? getToolDisplayName(error.toolId) : 'Tool'
  const timeoutSeconds = Math.round(error.timeout / 1000)
  
  return {
    title: 'Operation Timed Out',
    description: `${toolName} took longer than expected (${timeoutSeconds}s limit)`,
    actionGuidance: 'The operation may be complex or the server is busy. Please try again.',
    retryable: true,
    severity: 'warning',
    displayMethod: 'toast',
    autoHideTimeout: 7000
  }
}

/**
 * Transform authentication errors into user-friendly messages
 */
function transformAuthError(): ErrorMessage {
  return {
    title: 'Sign-in Required',
    description: 'You need to be signed in to use this feature',
    actionGuidance: 'Please sign in to your account and try again',
    retryable: false,
    severity: 'critical',
    displayMethod: 'dialog',
    autoHideTimeout: 0 // Manual dismiss for critical errors
  }
}

/**
 * Transform validation errors into user-friendly messages
 */
function transformValidationError(error: ToolValidationError): ErrorMessage {
  const errorCount = error.validationErrors.length
  const firstError = error.validationErrors[0]
  
  return {
    title: 'Invalid Input',
    description: errorCount === 1 && firstError
      ? firstError
      : `${errorCount} validation errors occurred`,
    actionGuidance: 'Please check your input and try again',
    retryable: false,
    severity: 'warning',
    displayMethod: 'inline',
    autoHideTimeout: 8000
  }
}

/**
 * Transform server errors into user-friendly messages
 */
function transformServerError(error: ToolServerError): ErrorMessage {
  const toolName = error.toolId ? getToolDisplayName(error.toolId) : 'Service'
  
  // Customise message based on HTTP status
  let title = 'Service Error'
  let description = `${toolName} is temporarily unavailable`
  let actionGuidance = 'Please try again in a moment'
  let severity: ErrorMessage['severity'] = 'error'
  
  if (error.httpStatus === 502 || error.httpStatus === 503) {
    title = 'Service Unavailable'
    description = `${toolName} is currently undergoing maintenance`
    actionGuidance = 'Please try again in a few minutes'
  } else if (error.httpStatus === 500) {
    title = 'Internal Error'
    description = `${toolName} encountered an unexpected error`
    actionGuidance = 'Please try again or contact support if the problem persists'
  } else if (error.httpStatus === 0) {
    title = 'Connection Error'
    description = 'Unable to connect to the server'
    actionGuidance = 'Please check your internet connection and try again'
    severity = 'warning'
  }
  
  return {
    title,
    description,
    actionGuidance,
    retryable: true,
    severity,
    displayMethod: 'toast',
    autoHideTimeout: 6000
  }
}

/**
 * Transform not found errors into user-friendly messages
 */
function transformNotFoundError(error: ToolNotFoundError): ErrorMessage {
  const toolName = error.toolId ? getToolDisplayName(error.toolId) : 'Tool'
  
  return {
    title: 'Feature Unavailable',
    description: `${toolName} is not available right now`,
    actionGuidance: 'Please refresh the page and try again',
    retryable: false,
    severity: 'error',
    displayMethod: 'toast',
    autoHideTimeout: 5000
  }
}

/**
 * Transform cancelled errors into user-friendly messages
 */
function transformCancelledError(error: ToolCancelledError): ErrorMessage {
  const toolName = error.toolId ? getToolDisplayName(error.toolId) : 'Operation'
  
  return {
    title: 'Operation Cancelled',
    description: `${toolName} was cancelled`,
    retryable: false,
    severity: 'info',
    displayMethod: 'toast',
    autoHideTimeout: 3000
  }
}

/**
 * Convert tool ID to human-readable display name
 */
function getToolDisplayName(toolId: string): string {
  // Map tool IDs to friendly names
  const displayNames: Record<string, string> = {
    'glossary': 'Glossary',
    'summarise': 'Summarise',
    'headings': 'Headings',
    'search': 'Search',
    'chatbot': 'Chatbot',
    'metadata': 'Document Info',
    'reading-difficulty': 'Reading Difficulty',
    'highlight': 'Highlight',
    'original': 'Original Text',
    'structure': 'Document Structure'
  }
  
  return displayNames[toolId] || toTitleCase(toolId)
}

/**
 * Convert kebab-case or snake_case to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Get a generic error message for unknown error types
 */
export function getGenericErrorMessage(error: unknown): ErrorMessage {
  let message = 'An unexpected error occurred'
  
  if (error instanceof Error) {
    message = error.message
  } else if (typeof error === 'string') {
    message = error
  }
  
  return {
    title: 'Unexpected Error',
    description: message,
    actionGuidance: 'Please try again or contact support if the problem persists',
    retryable: false,
    severity: 'error',
    displayMethod: 'toast',
    autoHideTimeout: 5000
  }
}

/**
 * Check if an error represents a temporary condition that might resolve
 * with a retry after a brief delay
 */
export function isTemporaryError(error: ToolExecutorError): boolean {
  return error.code === 'TOOL_TIMEOUT' || 
         error.code === 'TOOL_SERVER_ERROR' ||
         (error.code === 'TOOL_SERVER_ERROR' && 
          error instanceof ToolServerError && 
          (error.httpStatus === 502 || error.httpStatus === 503 || error.httpStatus === 504))
}

/**
 * Get appropriate retry delay in milliseconds for temporary errors
 */
export function getRetryDelay(error: ToolExecutorError): number {
  if (error.code === 'TOOL_TIMEOUT') {
    return 2000 // 2 seconds for timeout
  }
  
  if (error.code === 'TOOL_SERVER_ERROR') {
    const serverError = error as ToolServerError
    if (serverError.httpStatus === 503) {
      return 5000 // 5 seconds for service unavailable
    }
    return 3000 // 3 seconds for other server errors
  }
  
  return 1000 // 1 second default
}