'use client'

import { ErrorLayout } from '@/components/error-layout'
import { Button } from '@/components/ui/button'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'
import { Warning, Copy, CaretRight } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useCopyToClipboard } from 'usehooks-ts'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const [, copy] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  const handleCopyError = async () => {
    const errorDetails = error.message + (error.stack ? '\n\n' + error.stack : '')
    try {
      await copy(errorDetails)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }

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
          <details className="group mt-4 text-left">
            <summary className="flex items-center justify-between w-full cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              <span className="inline-flex items-center">
                <CaretRight size={12} className="mr-2 transition-transform group-open:rotate-90" />
                Error Details (Development)
              </span>
              <TooltipOrPopover
                content={copied ? "Copied!" : "Copy error details to clipboard"}
                side="top"
                sideOffset={4}
                showIndicator={false}
              >
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCopyError()
                  }}
                  aria-label="Copy error details to clipboard"
                  className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200 ml-2"
                >
                  <Copy size={12} />
                </Button>
              </TooltipOrPopover>
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