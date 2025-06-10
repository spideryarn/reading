'use client'

// Highlight management component for creating and managing persistent document highlights
// Integrated with semantic search and stored in document_enhancements table
// See planning/250610a_persistent_document_highlighting_mode.md for design decisions

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, HighlighterCircle, X, CircleNotch, Trash } from '@phosphor-icons/react'

// Highlight interface - will be moved to proper types file later
interface Highlight {
  id: string
  criterion: string
  ranges: Array<{
    elementId: string
    startOffset: number
    endOffset: number
    text: string
  }>
  confidence?: number
  createdAt: string
}

interface HighlightManagementProps {
  documentId: string
}

export function HighlightManagement({ documentId }: HighlightManagementProps) {
  // State management
  const [criterion, setCriterion] = useState('')
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading] = useState(false)

  // Ref for criterion input
  const criterionInputRef = useRef<HTMLInputElement>(null)

  // Load existing highlights on mount
  useEffect(() => {
    // TODO: Implement loadHighlights function in next stage
    // loadHighlights()
  }, [documentId])

  // Auto-focus criterion input when component mounts
  useEffect(() => {
    setTimeout(() => {
      criterionInputRef.current?.focus()
    }, 50)
  }, [])

  // Create new highlight based on criterion
  const createHighlight = async () => {
    if (!criterion.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      // TODO: Implement API call to create highlights using semantic search
      // This will be implemented in Stage 3: API integration and highlighting logic
      
      // Placeholder for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // TODO: Add the new highlight to state
      console.log('Creating highlight for criterion:', criterion)
      
      // Clear criterion input
      setCriterion('')
    } catch (error) {
      console.error('Failed to create highlight:', error)
      setError(error instanceof Error ? error.message : 'Failed to create highlight')
    } finally {
      setIsCreating(false)
    }
  }

  // Delete highlight
  const deleteHighlight = async (highlightId: string) => {
    try {
      // TODO: Implement API call to delete highlight
      console.log('Deleting highlight:', highlightId)
      
      // Remove from local state
      setHighlights(prev => prev.filter(h => h.id !== highlightId))
    } catch (error) {
      console.error('Failed to delete highlight:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete highlight')
    }
  }

  // Handle Enter key in criterion input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      e.preventDefault()
      createHighlight()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <HighlighterCircle size={20} weight="bold" className="text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Document Highlights</h3>
        </div>
        <p className="text-sm text-gray-600">
          Create persistent highlights based on specific criteria
        </p>
      </div>

      {/* Criterion input section */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-3">
          <div className="relative">
            <input
              ref={criterionInputRef}
              type="text"
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter highlighting criterion..."
              className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <HighlighterCircle 
              size={16} 
              weight="bold" 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            {criterion && (
              <button
                onClick={() => setCriterion('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} weight="bold" />
              </button>
            )}
          </div>

          <Button
            onClick={createHighlight}
            disabled={!criterion.trim() || isCreating}
            variant="default"
            size="sm"
            className="w-full"
          >
            {isCreating ? (
              <>
                <CircleNotch className="animate-spin mr-2" size={14} />
                Finding matches...
              </>
            ) : (
              <>
                <MagnifyingGlass className="mr-2" size={14} weight="bold" />
                Create Highlights
              </>
            )}
          </Button>

          {/* Example criteria */}
          {!criterion.trim() && !isCreating && (
            <div className="text-xs text-gray-500 space-y-1">
              <div className="font-medium">Example criteria:</div>
              <div>• &quot;arguments supporting the main thesis&quot;</div>
              <div>• &quot;statistical evidence&quot;</div>
              <div>• &quot;counterarguments or objections&quot;</div>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 border-b border-gray-200">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Highlights list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CircleNotch className="animate-spin text-gray-400 mb-2" size={24} weight="bold" />
            <div className="text-sm text-gray-500">Loading highlights...</div>
          </div>
        ) : highlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <HighlighterCircle size={24} weight="bold" className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Highlights Yet</h3>
            <p className="text-sm text-gray-600 max-w-sm">
              Enter a criterion above to create your first persistent highlights in this document.
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {highlights.map((highlight) => (
              <div
                key={highlight.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm mb-1">
                      {highlight.criterion}
                    </h4>
                    <div className="text-xs text-gray-500">
                      {highlight.ranges.length} {highlight.ranges.length === 1 ? 'highlight' : 'highlights'} • {new Date(highlight.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteHighlight(highlight.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete highlight"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </div>
                
                {/* Show confidence if available */}
                {highlight.confidence && (
                  <div className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium w-fit mb-2">
                    {Math.round(highlight.confidence * 100)}% relevance
                  </div>
                )}

                {/* Range preview */}
                <div className="space-y-1">
                  {highlight.ranges.slice(0, 2).map((range, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded border-l-3 border-orange-200">
                      {range.text.length > 100 ? range.text.substring(0, 100) + '...' : range.text}
                    </div>
                  ))}
                  {highlight.ranges.length > 2 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{highlight.ranges.length - 2} more {highlight.ranges.length - 2 === 1 ? 'highlight' : 'highlights'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}