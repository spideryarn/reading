'use client'

// Highlight management component for creating and managing persistent document highlights
// Adapted from semantic search functionality in unified-left-pane.tsx
// Treats semantic search results as persistent highlights rather than temporary search results
// See docs/reference/TOOL_HIGHLIGHT.md for complete semantic highlighting system documentation
// See docs/reference/ARCHITECTURE_URL_STATE.md for URL state persistence

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { 
  HighlighterCircle, 
  X, 
  CircleNotch, 
  Clock,
  Trash,
  CaretDown
} from '@phosphor-icons/react'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import { getSemanticHighlightIntensity } from '@/lib/utils/semantic-highlighting'
import { useHighlightsUrlState } from '@/lib/tools/hooks/use-tool-url-state'
import type { DocumentElement } from '@/lib/types/document'
import { createClient } from '@/lib/supabase/client'
import { normalizeSemanticSearchQuery } from '@/lib/utils/semantic-search'
import { TooltipOrPopover } from '@/components/ui/tooltip-or-popover'

// Highlight interface matching semantic search result structure
interface Highlight {
  id: string
  criterion: string
  elementId: string
  elementType: string
  textExcerpt: string
  confidence: number
  reasoning: string
  createdAt: string
}

// Query history interface for caching previous searches
interface QueryHistoryItem {
  query: string
  normalizedQuery: string
  searchedAt: string
  resultCount: number
}

interface HighlightManagementProps {
  documentId: string
  elements: DocumentElement[]
  semanticHighlights?: SemanticHighlight[]
  onSemanticHighlightsChange?: (highlights: SemanticHighlight[]) => void
  activeElementId?: string
  onActiveElementChange?: (elementId: string | null) => void
  isActive?: boolean
}

// Semantic highlight interface (matching the one used in other components)
interface SemanticHighlight {
  elementId: string
  confidence: number
}

export function HighlightManagement({ 
  documentId, 
  elements, 
  onSemanticHighlightsChange,
  onActiveElementChange,
  isActive = false
}: HighlightManagementProps) {
  const { actions } = useDocumentCommunication()
  
  // URL state for highlight criterion
  const { highlightCriterion, setHighlight } = useHighlightsUrlState()
  
  // Local input state for immediate responsiveness (like search input pattern)
  // We keep a local, immediate value so that the input feels responsive. The URL
  // (single-source-of-truth) is still updated via the highlight creation,
  // but the input itself is no longer bound directly to that URL state.
  const [highlightInputValue, setHighlightInputValue] = useState(highlightCriterion || '')
  
  // Core state - initialize criterion from URL if available
  const [criterion, setCriterion] = useState(highlightCriterion || '')
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Cache state for highlighting operations
  const [highlightsCached, setHighlightsCached] = useState(false)
  const [highlightsCachedAt, setHighlightsCachedAt] = useState<string | null>(null)
  
  // Query history state
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([])
  const [showQueryHistory, setShowQueryHistory] = useState(false)
  
  // Sort state
  const [sortByIntensity, setSortByIntensity] = useState(false) // false = position, true = intensity
  
  // Refs
  const criterionInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus criterion input when component mounts
  useEffect(() => {
    setTimeout(() => {
      criterionInputRef.current?.focus()
    }, 50)
  }, [])

  // Auto-focus criterion input when tab becomes active
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        criterionInputRef.current?.focus()
      }, 50)
    }
  }, [isActive])

  // Convert highlights to semantic highlights and update state
  const updateSemanticHighlights = useCallback((highlights: Highlight[]) => {
    const newSemanticHighlights: SemanticHighlight[] = highlights.map(highlight => ({
      elementId: highlight.elementId,
      confidence: highlight.confidence
    }))
    
    if (onSemanticHighlightsChange) {
      onSemanticHighlightsChange(newSemanticHighlights)
    }
  }, [onSemanticHighlightsChange])

  // Clear semantic highlights
  const clearSemanticHighlights = useCallback(() => {
    if (onSemanticHighlightsChange) {
      onSemanticHighlightsChange([])
    }
  }, [onSemanticHighlightsChange])

  // Fetch query history from API
  const fetchQueryHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/tools/search/handlers/search?documentId=${encodeURIComponent(documentId)}`)
      if (!response.ok) {
        // Silently handle 404 or other errors - query history is optional
        return
      }
      
      const data = await response.json()
      setQueryHistory(data.queries || [])
      console.log(`[HighlightHistory] Fetched ${data.queries?.length || 0} historical queries`)
    } catch (error) {
      // Silently handle network errors - query history is nice-to-have
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('[HighlightHistory] Query history unavailable:', error instanceof Error ? error.message : 'Unknown error')
      }
      setQueryHistory([])
    }
  }, [documentId])

  // Load existing highlights and query history on mount
  useEffect(() => {
    fetchQueryHistory()
  }, [documentId, fetchQueryHistory])

  // Clean up highlights when component unmounts
  useEffect(() => {
    return () => {
      clearSemanticHighlights()
    }
  }, [clearSemanticHighlights])

  // Create highlights using unified search API
  const createHighlights = useCallback(async (query: string) => {
    // Clear any previous state
    setError(null)
    setIsCreating(true)
    setHighlightsCached(false)
    setHighlightsCachedAt(null)

    try {
      const response = await fetch('/api/tools/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'execute',
          parameters: {
            query,
            documentId
          },
          metadata: {
            correlationId: crypto.randomUUID(),
            source: 'direct',
            timestamp: new Date().toISOString()
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create highlights')
      }

      // Update cache status
      setHighlightsCached(!!data.cached)
      setHighlightsCachedAt(data.cachedAt || null)

      // Convert semantic search results to highlight format
      const newHighlights: Highlight[] = (data.matches || []).map((match: {
        elementId: string
        confidence: number
        reasoning: string
        relevantText: string
      }, index: number) => ({
        id: `${query}-${match.elementId}-${index}`, // Generate unique ID
        criterion: query,
        elementId: match.elementId,
        elementType: 'paragraph', // TODO: Get actual element type from elements
        textExcerpt: match.relevantText || '',
        confidence: match.confidence,
        reasoning: match.reasoning,
        createdAt: new Date().toISOString()
      }))

      // Update semantic highlights state and scroll to first result
      if (newHighlights.length > 0) {
        updateSemanticHighlights(newHighlights)
        // Scroll to first highlight to show the results
        actions?.scrollToElement(newHighlights[0]!.elementId)
      }

      // Replace existing highlights with new ones (highlights are session-based)
      setHighlights(newHighlights)
      console.log(`[HighlightCreation] Created ${newHighlights.length} highlights for criterion: "${query}"`)
      
    } catch (error) {
      console.error('[HighlightCreation] Error creating highlights:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create highlights'
      setError(errorMessage)
      setHighlights([])
    } finally {
      setIsCreating(false)
      // Refresh query history after highlight creation
      fetchQueryHistory()
    }
  }, [documentId, actions, fetchQueryHistory, updateSemanticHighlights])

  // Sync local input when the URL-driven criterion changes (e.g. back/forward
  // navigation or programmatic updates).
  useEffect(() => {
    setHighlightInputValue(highlightCriterion || '')
  }, [highlightCriterion])

  // Load highlights from URL criterion when component mounts or URL changes
  useEffect(() => {
    if (highlightCriterion && highlightCriterion !== criterion) {
      setCriterion(highlightCriterion)
      // Auto-trigger highlight creation for URL criterion
      if (highlightCriterion.trim()) {
        createHighlights(highlightCriterion)
      }
    }
  }, [highlightCriterion, criterion, createHighlights])

  // Sort highlights function
  const sortHighlights = useCallback((highlights: Highlight[], sortByIntensity: boolean) => {
    return [...highlights].sort((a, b) => {
      if (sortByIntensity) {
        // Sort by confidence (intensity) - highest first
        return b.confidence - a.confidence
      } else {
        // Sort by document position using element position data
        const elementA = elements.find(el => el.id === a.elementId)
        const elementB = elements.find(el => el.id === b.elementId)
        return (elementA?.position || 0) - (elementB?.position || 0)
      }
    })
  }, [elements])

  // Memoized sorted highlights
  const sortedHighlights = useMemo(() => {
    return sortHighlights(highlights, sortByIntensity)
  }, [highlights, sortByIntensity, sortHighlights])

  // Filtered query history based on current input value
  const filteredQueryHistory = useMemo(() => {
    if (!highlightInputValue.trim()) {
      return queryHistory
    }
    
    const searchLower = highlightInputValue.toLowerCase()
    return queryHistory.filter(item => 
      item.query.toLowerCase().includes(searchLower)
    )
  }, [queryHistory, highlightInputValue])

  // Format date in unambiguous format: "2025-June-08 at 22:15"
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const year = date.getFullYear()
    const month = monthNames[date.getMonth()]
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} at ${hours}:${minutes}`
  }, [])

  // Handle criterion input changes (local state for responsiveness)
  const handleCriterionChange = useCallback((value: string) => {
    setHighlightInputValue(value)
    setCriterion(value)
    
    // Clear previous errors
    setError(null)
    
    // Clear active highlights when input changes (user is preparing new search)
    clearSemanticHighlights()
    setHighlights([])
    
    // Clear URL highlight criterion to prevent auto-recreation effect
    setHighlight(null)
    
    // Show history dropdown when focusing and typing
    if (queryHistory.length > 0) {
      setShowQueryHistory(true)
    }
    
    // Don't auto-search - highlighting is manual trigger only
    if (!value.trim()) {
      setIsCreating(false)
    }
  }, [queryHistory.length, clearSemanticHighlights, setHighlight])

  // Trigger highlight creation
  const triggerHighlightCreation = useCallback(() => {
    if (highlightInputValue.trim()) {
      createHighlights(highlightInputValue)
      // Update URL with the highlight criterion
      setHighlight(highlightInputValue)
      // Update criterion to match the input
      setCriterion(highlightInputValue)
    }
  }, [highlightInputValue, createHighlights, setHighlight])

  // Handle Enter key in criterion input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      e.preventDefault()
      triggerHighlightCreation()
    } else if (e.key === 'Escape') {
      setShowQueryHistory(false)
    }
  }, [isCreating, triggerHighlightCreation])

  // Handle clicking on a highlight to scroll to it and set active highlight via React state
  const handleHighlightClick = useCallback((highlight: Highlight) => {
    // Set active element via React state (no DOM manipulation)
    if (onActiveElementChange) {
      onActiveElementChange(highlight.elementId)
      
      // Clear active state after animation duration
      setTimeout(() => {
        onActiveElementChange(null)
      }, 1600) // Duration matches CSS animation
    }
    
    // Scroll to element using robust existing system
    actions?.scrollToElement(highlight.elementId)
  }, [actions, onActiveElementChange])

  // Clear all highlights (for input box 'x' button)
  const clearHighlights = useCallback(() => {
    clearSemanticHighlights()
    setHighlights([])
    setHighlightsCached(false)
    setHighlightsCachedAt(null)
    setError(null)
    setHighlightInputValue('')
    setCriterion('')
    // Clear URL state
    setHighlight(null)
  }, [clearSemanticHighlights, setHighlight])

  // Delete semantic search query from database and refresh history
  const deleteQueryFromDatabase = useCallback(async (queryToDelete: string) => {
    try {
      const supabase = createClient()
      const normalizedQuery = normalizeSemanticSearchQuery(queryToDelete)
      
      const { error } = await supabase
        .from('document_enhancements')
        .delete()
        .eq('document_id', documentId)
        .eq('type', 'semantic-search')
        .eq('subtype', normalizedQuery)
      
      if (error) {
        throw new Error(error.message || 'Failed to delete query')
      }
      
      console.log(`[HighlightDeletion] Successfully deleted query from database: "${queryToDelete}" (normalized: "${normalizedQuery}")`)
      
      // Clear current highlights if they match the deleted query
      if (criterion === queryToDelete || highlightInputValue === queryToDelete) {
        clearHighlights()
      }
      
      // Refresh query history to remove the deleted item from dropdown
      await fetchQueryHistory()
      
    } catch (error) {
      console.error('[HighlightDeletion] Failed to delete query from database:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete query')
    }
  }, [documentId, criterion, highlightInputValue, clearHighlights, fetchQueryHistory])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <HighlighterCircle size={20} weight="bold" className="text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Document Highlights</h3>
        </div>
        <p className="text-sm text-gray-600">
          Create semantic highlights based on specific criteria
        </p>
      </div>

      {/* Criterion input section */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-3">
          <div className="relative">
            <input
              ref={criterionInputRef}
              type="text"
              value={highlightInputValue}
              onChange={(e) => handleCriterionChange(e.target.value)}
              onFocus={() => {
                if (queryHistory.length > 0) {
                  setShowQueryHistory(true)
                }
              }}
              onBlur={(e) => {
                // Don't hide if the blur is caused by clicking on the dropdown arrow
                const relatedTarget = e.relatedTarget as HTMLElement
                if (relatedTarget?.closest('[data-dropdown-trigger]')) {
                  return
                }
                // Delay hiding to allow clicking on dropdown items
                setTimeout(() => setShowQueryHistory(false), 150)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter criterion for highlighting..."
              className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <HighlighterCircle 
              size={16} 
              weight="bold" 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            {highlightInputValue ? (
              <TooltipOrPopover
                content="Clear search input"
                side="top"
                align="center"
                showIndicator={true}
              >
                <button
                  onClick={() => {
                    setHighlightInputValue('')
                    setCriterion('')
                    setHighlights([])
                    setHighlightsCached(false)
                    setHighlightsCachedAt(null)
                    // Clear URL state as well
                    setHighlight(null)
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} weight="bold" />
                </button>
              </TooltipOrPopover>
            ) : (
              <div
                data-dropdown-trigger
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  queryHistory.length > 0 
                    ? 'text-gray-400 hover:text-gray-600 cursor-pointer' 
                    : 'text-gray-300'
                }`}
                title={
                  queryHistory.length > 0 
                    ? `${queryHistory.length} previous search${queryHistory.length === 1 ? '' : 'es'} available - click to browse`
                    : 'No previous searches available'
                }
                onMouseDown={(e) => {
                  // Prevent the input from losing focus when clicking the dropdown trigger
                  e.preventDefault()
                }}
                onClick={() => {
                  if (queryHistory.length > 0) {
                    setShowQueryHistory(true)
                    criterionInputRef.current?.focus()
                  }
                }}
              >
                <CaretDown size={16} weight="bold" />
              </div>
            )}
            
            {/* Query history dropdown */}
            {showQueryHistory && filteredQueryHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-gray-500 font-medium mb-2 px-2">
                    {highlightInputValue.trim() ? `Filtered searches (${filteredQueryHistory.length} of ${queryHistory.length})` : 'Recent searches'}
                  </div>
                  {filteredQueryHistory.map((historyItem, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCriterion(historyItem.query)
                        setShowQueryHistory(false)
                        // Auto-trigger highlighting for historical query
                        createHighlights(historyItem.query)
                        // Update URL with the selected historical query
                        setHighlight(historyItem.query)
                      }}
                      className="w-full text-left px-2 py-2 text-sm rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-gray-900">
                            {historyItem.query}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {historyItem.resultCount} {historyItem.resultCount === 1 ? 'result' : 'results'} • {formatDate(historyItem.searchedAt)}
                          </div>
                        </div>
                        <TooltipOrPopover
                          content="Delete this search from history"
                          side="top"
                          align="center"
                          showIndicator={true}
                        >
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteQueryFromDatabase(historyItem.query)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                deleteQueryFromDatabase(historyItem.query)
                              }
                            }}
                            className="ml-2 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash size={12} weight="bold" />
                          </span>
                        </TooltipOrPopover>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={triggerHighlightCreation}
            disabled={!highlightInputValue.trim() || isCreating}
            variant="default"
            size="sm"
            className="w-full"
          >
            {isCreating ? (
              <>
                <CircleNotch className="animate-spin mr-2" size={14} />
                Analyzing...
              </>
            ) : (
              <>
                <HighlighterCircle className="mr-2" size={14} weight="bold" />
                Create Highlights
              </>
            )}
          </Button>

          {/* Example criteria */}
          {!highlightInputValue.trim() && !isCreating && (
            <div className="text-xs text-gray-500 space-y-1">
              <div className="font-medium">Try highlighting:</div>
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
            <div className="text-red-700 text-sm font-medium">Highlighting failed:</div>
            <div className="text-red-700 text-sm mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Highlights list */}
      <div className="flex-1 overflow-y-auto">
        {isCreating ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CircleNotch className="animate-spin text-orange-400 mb-2" size={24} weight="bold" />
            <div className="text-sm text-gray-500">
              Analyzing document for highlights...
            </div>
          </div>
        ) : criterion.trim() && highlights.length === 0 && !error ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">
                0 results for &quot;{criterion}&quot;
              </div>
              <div className="flex items-center gap-2">
                {highlightsCached && (
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-medium">
                    Loaded
                  </span>
                )}
                {highlightsCachedAt && (
                  <span 
                    className="text-xs text-gray-500" 
                    title={`Search was performed at ${formatDate(highlightsCachedAt)}`}
                  >
                    <Clock size={12} weight="bold" className="inline mr-1" />
                    {new Date(highlightsCachedAt).toLocaleTimeString()}
                  </span>
                )}
                <TooltipOrPopover
                  content="Delete this search from history and clear highlights"
                  side="top"
                  align="center"
                  showIndicator={true}
                >
                  <button
                    onClick={() => deleteQueryFromDatabase(criterion)}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash size={12} weight="bold" />
                  </button>
                </TooltipOrPopover>
              </div>
            </div>
            <div className="text-sm text-gray-500 text-center py-4">
              No matching content found for highlighting
            </div>
          </div>
        ) : highlights.length > 0 ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">
                {highlights.length} {highlights.length === 1 ? 'highlight' : 'highlights'} created for &quot;{criterion}&quot;
              </div>
              <div className="flex items-center gap-2">
                {highlightsCached && (
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-medium">
                    Loaded
                  </span>
                )}
                {highlightsCachedAt && (
                  <span 
                    className="text-xs text-gray-500" 
                    title={`Highlights were created at ${formatDate(highlightsCachedAt)}`}
                  >
                    <Clock size={12} weight="bold" className="inline mr-1" />
                    {new Date(highlightsCachedAt).toLocaleTimeString()}
                  </span>
                )}
                {criterion && (
                  <TooltipOrPopover
                    content="Delete this search from history and clear highlights"
                    side="top"
                    align="center"
                    showIndicator={true}
                  >
                    <button
                      onClick={() => deleteQueryFromDatabase(criterion)}
                      className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash size={12} weight="bold" />
                    </button>
                  </TooltipOrPopover>
                )}
              </div>
            </div>
            
            {/* Sort toggle - only show when there are multiple highlights */}
            {highlights.length > 1 && (
              <div className="mb-3">
                <div className="flex bg-gray-50 p-1 rounded-lg">
                  <button
                    onClick={() => setSortByIntensity(false)}
                    className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                      !sortByIntensity 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Position
                  </button>
                  <button
                    onClick={() => setSortByIntensity(true)}
                    className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                      sortByIntensity 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Intensity
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {sortedHighlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-orange-50 cursor-pointer transition-colors hover:border-orange-300"
                  onClick={() => handleHighlightClick(highlight)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {highlight.elementType}
                      </span>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        {getSemanticHighlightIntensity(highlight.confidence * 100)} ({Math.round(highlight.confidence * 100)}%)
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 line-clamp-2 mb-2">
                    {highlight.textExcerpt}
                  </div>
                  {highlight.reasoning && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border-l-2 border-orange-200">
                      <span className="font-medium">Match:</span> {highlight.reasoning}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <HighlighterCircle size={24} weight="bold" className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Highlights Yet</h3>
            <p className="text-sm text-gray-600 max-w-sm">
              Enter a criterion above to create semantic highlights that identify relevant content in this document.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}