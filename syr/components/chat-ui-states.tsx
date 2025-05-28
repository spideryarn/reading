// UI components for chat loading and error states
// Uses Phosphor icons per docs/STYLING.md patterns

import { CircleNotch, Warning } from '@phosphor-icons/react'

interface LoadingStateProps {
  message?: string
  className?: string
}

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ChatLoadingState({ 
  message = "Thinking...", 
  className = "" 
}: LoadingStateProps) {
  return (
    <div className={`flex items-center gap-2 text-gray-500 py-2 ${className}`}>
      <CircleNotch 
        size={16} 
        className="animate-spin" 
        weight="bold"
      />
      <span className="text-sm">{message}</span>
    </div>
  )
}

export function ChatErrorState({ 
  message = "Failed to send message", 
  onRetry,
  className = "" 
}: ErrorStateProps) {
  return (
    <div className={`flex items-center gap-2 text-red-600 py-2 ${className}`}>
      <Warning 
        size={16} 
        weight="fill"
      />
      <span className="text-sm">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}