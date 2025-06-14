// UI components for chat loading and error states
// Uses Phosphor icons per docs/STYLING_OVERVIEW.md patterns

import { CircleNotch, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

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
        <Button
          onClick={onRetry}
          variant="warning"
          size="sm"
          className="ml-2"
        >
          Retry
        </Button>
      )}
    </div>
  )
}