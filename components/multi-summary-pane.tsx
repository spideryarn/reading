/**
 * Multi-dimensional summary pane with dual slider controls
 * Supports 3×3 combinations of expertise level and summary length
 */

'use client'

import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { AlertWithIcon } from '@/components/ui/alert'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { DualSummarySliders } from '@/components/dual-summary-sliders'
import { useMultiSummary } from '@/lib/hooks/useMultiSummary'
import { CircleNotch, TrashSimple } from '@phosphor-icons/react'

interface MultiSummaryPaneProps {
  content: string
  documentId: string
  autoActivate?: boolean
  className?: string
}

export function MultiSummaryPane({ 
  content, 
  documentId, 
  autoActivate = false, 
  className = ""
}: MultiSummaryPaneProps) {
  const {
    // Data state
    summaries,
    currentSummary,
    
    // Selection state
    expertiseLevel,
    lengthLevel,
    setExpertiseLevel,
    setLengthLevel,
    
    // Loading and error state
    isLoading,
    error,
    isCached,
    
    // Actions
    generateSummaries,
    clearSummaries,
    isGenerated
  } = useMultiSummary(documentId, content, autoActivate)
  
  // Show generation button if not generated
  if (!isGenerated && !isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <Button
          onClick={generateSummaries}
          disabled={isLoading || !content}
          variant="outline"
          size="full"
          className="text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
        >
          {isLoading ? (
            <>
              <CircleNotch className="animate-spin" size={16} />
              Generating summaries...
            </>
          ) : (
            'Generate multi-dimensional summaries'
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Generates 9 summaries across expertise levels and lengths
        </p>
      </div>
    )
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <Loading 
          text="Generating 9 summary combinations..." 
          spinnerSize={20} 
        />
        <p className="text-xs text-gray-500 mt-2 text-center">
          This may take a moment as we generate all combinations in parallel
        </p>
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <AlertWithIcon 
          variant="warning"
          title="Failed to generate summaries"
          description={error}
        />
        <div className="mt-3 flex gap-2">
          <Button
            onClick={generateSummaries}
            variant="outline"
            size="sm"
            className="text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }
  
  // Show generated summaries with sliders
  if (summaries && isGenerated) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        {/* Dual Slider Controls */}
        <DualSummarySliders
          expertiseLevel={expertiseLevel}
          lengthLevel={lengthLevel}
          onExpertiseChange={setExpertiseLevel}
          onLengthChange={setLengthLevel}
        />
        
        {/* Summary Display */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4">
            {/* Summary Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  {expertiseLevel.charAt(0).toUpperCase() + expertiseLevel.slice(1)} · {' '}
                  {lengthLevel === 'sentence_or_two' ? 'Brief' : 
                   lengthLevel === 'single_short_paragraph' ? 'Standard' : 'Detailed'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isCached ? 'Cached summary' : 'Generated summary'} · {currentSummary.length} characters
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={clearSummaries}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <TrashSimple size={14} />
                  Clear
                </Button>
                <Button
                  onClick={generateSummaries}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Regenerate
                </Button>
              </div>
            </div>
            
            {/* Summary Content */}
            {currentSummary ? (
              <div className="prose prose-sm prose-gray max-w-none">
                <MarkdownRenderer content={currentSummary} />
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No summary available for this combination
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  // Fallback state
  return (
    <div className={`p-4 ${className}`}>
      <p className="text-sm text-gray-500">Summary not available</p>
    </div>
  )
}