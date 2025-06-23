'use client'

import { ErrorLayout } from '@/components/error-layout'
import { Button } from '@/components/ui/button'
import { Warning } from '@phosphor-icons/react'
import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <ErrorLayout
      errorCode="500"
      title="Something went wrong"
      description="An unexpected error occurred. Please try again or contact support if the problem persists."
    >
      {/* Additional error actions */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={reset}
          className="mb-4"
        >
          <Warning size={16} className="mr-2" />
          Try Again
        </Button>
        
        {/* Show error details in development */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error Details (Development)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 text-xs text-red-600 overflow-auto rounded border">
              {error.message}
              {error.stack && '\n\n' + error.stack}
            </pre>
          </details>
        )}
      </div>
    </ErrorLayout>
  )
}