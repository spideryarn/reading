'use client'

import { CircleNotch, Check, X, ArrowClockwise, Pause, Play } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { PageUploadState } from '@/lib/hooks/use-vision-single-page-uploader'

interface VisionUploadProgressProps {
  pageStates: PageUploadState[]
  overallProgress: number
  isUploading: boolean
  isPaused: boolean
  onRetry: (pageNumber: number) => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
}

export function VisionUploadProgress({
  pageStates,
  overallProgress,
  isUploading,
  isPaused,
  onRetry,
  onPause,
  onResume,
  onCancel
}: VisionUploadProgressProps) {
  // Count states for summary
  const completed = pageStates.filter(s => s.status === 'completed').length
  const failed = pageStates.filter(s => s.status === 'error').length
  const processing = pageStates.filter(s => ['uploading', 'processing', 'cropping', 'storing'].includes(s.status)).length

  return (
    <div className="space-y-4">
      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">
            Processing {pageStates.length} pages
          </div>
          <div className="flex items-center space-x-2">
            {isUploading && !isPaused && (
              <Button
                size="sm"
                variant="outline"
                onClick={onPause}
                className="px-2 py-1"
              >
                <Pause size={14} className="mr-1" />
                Pause
              </Button>
            )}
            {isUploading && isPaused && (
              <Button
                size="sm"
                variant="outline"
                onClick={onResume}
                className="px-2 py-1"
              >
                <Play size={14} className="mr-1" />
                Resume
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="px-2 py-1 text-red-600 hover:text-red-700"
            >
              Cancel
            </Button>
          </div>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <div className="text-xs text-gray-500">
          {completed} completed, {processing} processing{failed > 0 ? `, ${failed} failed` : ''}
        </div>
      </div>

      {/* Page-by-page Status List */}
      <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
        {pageStates.map((pageState) => (
          <div
            key={pageState.pageNumber}
            className={`flex items-center justify-between p-2 rounded-md transition-colors ${
              pageState.status === 'error' 
                ? 'bg-red-50' 
                : pageState.status === 'completed'
                ? 'bg-green-50'
                : pageState.status === 'pending'
                ? 'bg-gray-50'
                : 'bg-blue-50'
            }`}
          >
            <div className="flex items-center space-x-3 flex-1">
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {pageState.status === 'completed' && (
                  <Check size={16} className="text-green-600" />
                )}
                {pageState.status === 'error' && (
                  <X size={16} className="text-red-600" />
                )}
                {['uploading', 'processing', 'cropping', 'storing'].includes(pageState.status) && (
                  <CircleNotch size={16} className="text-blue-600 animate-spin" />
                )}
                {pageState.status === 'pending' && (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                )}
              </div>

              {/* Page Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  Page {pageState.pageNumber}
                </div>
                <div className="text-xs text-gray-500">
                  {getStatusMessage(pageState)}
                </div>
              </div>

              {/* Progress for active pages */}
              {['uploading', 'processing', 'cropping', 'storing'].includes(pageState.status) && (
                <div className="w-20">
                  <Progress value={pageState.progress} className="h-1" />
                </div>
              )}
            </div>

            {/* Retry Button for Failed Pages */}
            {pageState.status === 'error' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(pageState.pageNumber)}
                className="ml-2 px-2 py-1"
              >
                <ArrowClockwise size={14} className="mr-1" />
                Retry
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Warning for Failed Pages */}
      {failed > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            {failed} page{failed > 1 ? 's' : ''} failed to process. You can retry individual pages or continue with partial results.
          </p>
        </div>
      )}
    </div>
  )
}

function getStatusMessage(pageState: PageUploadState): string {
  switch (pageState.status) {
    case 'pending':
      return 'Waiting to process'
    case 'uploading':
      return 'Uploading page image'
    case 'processing':
      return 'Extracting content with AI'
    case 'cropping':
      return 'Extracting images from page'
    case 'storing':
      return 'Uploading extracted images'
    case 'completed':
      return `Completed successfully${pageState.htmlFragment ? '' : ' (no content)'}`
    case 'error':
      return pageState.error || 'Processing failed'
    default:
      return 'Processing...'
  }
}