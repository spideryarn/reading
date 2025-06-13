'use client'

// Unified left pane component that combines all navigation and tools
// Part of the 2-pane layout architecture using ResizablePanelGroup
// All 5 tabs are at the same level as requested by the user
//
// Cross-pane communication: This component uses DocumentCommunicationContext
// for all inter-component communication. The old DOM event system was removed
// in favour of React Context for better type safety and React integration.

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { AssistantChat } from './assistant-chat'
import { HighlightManagement } from './highlight-management'
import { CircleNotch, Book, Question, Calendar, ArrowCounterClockwise, MagnifyingGlass, X, CaretDown } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { AlertWithIcon } from '@/components/ui/alert'
import type { DocumentElement } from '@/lib/types/document'
import { 
  User, MapPin, Lightbulb, Star, Article, 
  Cube, Buildings, Info 
} from '@phosphor-icons/react'
import { 
  OriginalHeadingsTab, 
  AIGeneratedHeadingsTab, 
  DocumentSummaryTab 
} from './table-of-contents-tabs'
import { debounce } from '@/lib/utils/debounce'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import Mark from 'mark.js'
import { extractCleanText } from '@/lib/utils/html-text-extraction'
import { extractAllMatchContexts, generateTooltipContent } from '@/lib/utils/search-context-extraction'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Semantic highlight interface
interface SemanticHighlight {
  elementId: string
  confidence: number
}

// Entity type (will be moved to proper types file later)
interface Entity {
  name: string
  ontology: 'person' | 'place' | 'date' | 'theme' | 'event' | 
           'reference' | 'object' | 'organization' | 'concept' | 
           'definition' | 'other'
  aliases: string[]
  brief_explanation: string
  long_explanation?: string
  datetime?: string
  url?: string
  extra?: Record<string, unknown>
}

// Search result interface
interface SearchResult {
  elementId: string
  elementType: string
  matchCount: number
  searchType?: 'text' | 'semantic' // Track search type for display
  confidence?: number // For semantic search results
  reasoning?: string // For semantic search results
  contexts: Array<{ text: string; matchIndex: number }> // Context-aware snippets
  fullText: string // Full element text for tooltips
}

interface UnifiedLeftPaneProps {
  // From TableOfContents
  content: string
  elements: DocumentElement[]
  documentId: string
  markdownContent: string
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
  
  // From DocumentViewer (Tools)
  glossaryEntities: Entity[]
  isLoadingGlossary: boolean
  showGlossary: boolean
  glossaryError: string | null
  glossaryCached: boolean
  
  // Callbacks
  onHeadingClick: (headingText: string, headingId?: string) => void
  onLoadGlossary: () => void
  onResetGlossary?: () => void
  
  // For chat context
  documentContext: string
  
  // Semantic highlighting
  semanticHighlights?: SemanticHighlight[]
  onSemanticHighlightsChange?: (highlights: SemanticHighlight[]) => void
  
  // Active highlight element (for pulse animation)
  activeElementId?: string | null
  onActiveElementChange?: (elementId: string | null) => void
}

// Get icon component for entity type
function getEntityIcon(ontology: string) {
  switch (ontology) {
    case 'person':
      return <User size={14} weight="bold" />
    case 'place':
      return <MapPin size={14} weight="bold" />
    case 'date':
      return <Calendar size={14} weight="bold" />
    case 'theme':
    case 'concept':
      return <Lightbulb size={14} weight="bold" />
    case 'event':
      return <Star size={14} weight="bold" />
    case 'reference':
      return <Article size={14} weight="bold" />
    case 'object':
      return <Cube size={14} weight="bold" />
    case 'organization':
      return <Buildings size={14} weight="bold" />
    case 'definition':
      return <Book size={14} weight="bold" />
    default:
      return <Info size={14} weight="bold" />
  }
}

// Get color scheme for entity type
function getEntityColor(ontology: string) {
  switch (ontology) {
    case 'person':
      return 'bg-blue-100 text-blue-800'
    case 'place':
      return 'bg-green-100 text-green-800'
    case 'date':
      return 'bg-purple-100 text-purple-800'
    case 'theme':
    case 'concept':
      return 'bg-yellow-100 text-yellow-800'
    case 'event':
      return 'bg-red-100 text-red-800'
    case 'reference':
      return 'bg-indigo-100 text-indigo-800'
    case 'object':
      return 'bg-gray-100 text-gray-800'
    case 'organization':
      return 'bg-orange-100 text-orange-800'
    case 'definition':
      return 'bg-teal-100 text-teal-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// Component to display glossary entities
function GlossaryDisplay({ 
  entities, 
  elements 
}: { 
  entities: Entity[]
  elements: DocumentElement[]
}) {
  const { actions } = useDocumentCommunication()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter entities based on search term
  const filterEntities = useCallback((entities: Entity[], searchTerm: string): Entity[] => {
    if (!searchTerm.trim()) return entities
    
    const term = searchTerm.toLowerCase()
    return entities.filter(entity => 
      entity.name.toLowerCase().includes(term) ||
      entity.aliases.some(alias => alias.toLowerCase().includes(term))
    )
  }, [])
  
  // Debounced search function
  const debouncedFilter = useMemo(
    () => debounce(() => {
      // The filtering happens in the render through filteredEntities
    }, 300),
    []
  )
  
  // Apply search and get filtered entities
  const filteredEntities = useMemo(() => {
    return filterEntities(entities, searchTerm)
  }, [entities, searchTerm, filterEntities])
  
  // Clear search when tab changes or entities reload
  useEffect(() => {
    setSearchTerm('')
  }, [entities])
  
  const findFirstOccurrence = (entity: Entity): string | null => {
    const searchTerms = [entity.name, ...entity.aliases]
    const sortedElements = [...elements].sort((a, b) => a.position - b.position)
    
    for (const element of sortedElements) {
      if (!element.content) continue
      const content = element.content.toLowerCase()
      
      for (const term of searchTerms) {
        if (content.includes(term.toLowerCase())) {
          return element.id
        }
      }
    }
    
    return null
  }
  
  const handleEntityClick = (entity: Entity) => {
    const elementId = findFirstOccurrence(entity)
    if (elementId) {
      // Use context action for both scrolling and position tracking
      actions.scrollToElement(elementId)
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              debouncedFilter(e.target.value)
            }}
            placeholder="Search glossary..."
            className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <MagnifyingGlass 
            size={16} 
            weight="bold" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>
        
        {/* Results indicator */}
        {searchTerm.trim() && (
          <div className="mt-2 text-sm text-gray-600">
            {filteredEntities.length === 0 ? (
              <span className="text-red-600">No matches found</span>
            ) : (
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                {filteredEntities.length} of {entities.length} {filteredEntities.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Entities list */}
      <div className="flex-1 overflow-y-auto">
        {filteredEntities.length === 0 && searchTerm.trim() ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <MagnifyingGlass size={24} weight="bold" className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
            <p className="text-sm text-gray-600">
              Try searching for a different term or clear the search.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {filteredEntities.map((entity, index) => {
        const hasOccurrence = findFirstOccurrence(entity) !== null
        
        return (
          <div 
            key={index} 
            className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all duration-300 ${
              hasOccurrence ? 'hover:border-blue-300 cursor-pointer' : ''
            }`}
            onClick={() => hasOccurrence && handleEntityClick(entity)}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 
                className={`font-semibold text-lg leading-tight ${
                  hasOccurrence 
                    ? 'text-blue-700 hover:text-blue-900 transition-colors' 
                    : 'text-gray-900'
                }`}
                title={hasOccurrence ? 'Click to scroll to first occurrence' : undefined}
              >
                {entity.name}
              </h3>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 shadow-sm ${getEntityColor(entity.ontology)}`}>
                {getEntityIcon(entity.ontology)}
                {entity.ontology}
              </span>
            </div>
            
            {entity.aliases.length > 0 && (
              <div className="text-xs text-gray-600 mb-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-gray-500 font-medium">Also known as:</span>{' '}
                <span className="font-medium text-gray-700">{entity.aliases.join(', ')}</span>
              </div>
            )}
            
            <div className="text-sm text-gray-700 leading-relaxed mb-3 font-medium">
              {entity.long_explanation || entity.brief_explanation}
            </div>
            
            {entity.datetime && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-md w-fit">
                <Calendar size={12} weight="bold" />
                {entity.datetime}
              </div>
            )}
          </div>
        )
      })}
          </div>
        )}
      </div>
    </div>
  )
}

// Component for highlighting search terms within text snippets
function HighlightedSearchText({ 
  text, 
  query, 
  caseSensitive = false 
}: { 
  text: string
  query: string
  caseSensitive?: boolean 
}) {
  if (!query.trim()) {
    return <span>{text}</span>
  }
  
  // Split text by search query, preserving the case sensitivity
  const searchText = caseSensitive ? text : text.toLowerCase()
  const searchQuery = caseSensitive ? query : query.toLowerCase()
  
  const parts = []
  let lastIndex = 0
  let matchIndex = searchText.indexOf(searchQuery)
  
  while (matchIndex !== -1) {
    // Add text before the match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex))
    }
    
    // Add the highlighted match
    parts.push(
      <span key={matchIndex} className="text-spideryarn-orange bg-orange-50 font-medium">
        {text.substring(matchIndex, matchIndex + query.length)}
      </span>
    )
    
    lastIndex = matchIndex + query.length
    matchIndex = searchText.indexOf(searchQuery, lastIndex)
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  
  return <span>{parts}</span>
}

export function UnifiedLeftPane({
  content,
  elements,
  documentId,
  markdownContent,
  headingVisibility,
  glossaryEntities,
  isLoadingGlossary,
  showGlossary,
  glossaryError,
  glossaryCached,
  onHeadingClick,
  onLoadGlossary,
  onResetGlossary,
  documentContext,
  semanticHighlights = [],
  onSemanticHighlightsChange,
  activeElementId,
  onActiveElementChange
}: UnifiedLeftPaneProps) {
  const { actions, state } = useDocumentCommunication()
  
  // Auto-load glossary when glossary tab is activated
  useEffect(() => {
    if (state.activeTabId === 'glossary' && !showGlossary && !isLoadingGlossary) {
      onLoadGlossary()
    }
  }, [state.activeTabId, showGlossary, isLoadingGlossary, onLoadGlossary])
  
  // Auto-focus search input when search tab is activated
  useEffect(() => {
    if (state.activeTabId === 'search') {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [state.activeTabId])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [useSemanticSearch] = useState(false)
  // const [semanticSearchError] = useState<string | null>(null)
  const [semanticSortByRelevance] = useState(false) // false = position, true = relevance
  // Cache state for semantic search
  // const [semanticSearchCached] = useState(false)
  // const [semanticSearchCachedAt] = useState<string | null>(null)
  
  // Query history for semantic search
  const [queryHistory] = useState<Array<{
    query: string
    normalizedQuery: string
    searchedAt: string
    resultCount: number
  }>>([])
  // const [showQueryHistory] = useState(false)
  // const [isLoadingHistory] = useState(false)
  
  // Store timeout ID to cancel pending searches
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Mark.js instance
  const markInstanceRef = useRef<Mark | null>(null)
  
  // Ref for search input to enable auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Initialize Mark.js when component mounts
  useEffect(() => {
    const container = document.getElementById('document-viewer')
    if (container) {
      markInstanceRef.current = new Mark(container)
    }
    
    return () => {
      // Clean up highlights on unmount
      if (markInstanceRef.current) {
        markInstanceRef.current.unmark()
      }
    }
  }, [])
  
  // Search function using Mark.js for cross-element search
  const performSearch = useCallback((query: string) => {
    // Cancel any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    
    // Clear previous highlights
    if (markInstanceRef.current) {
      markInstanceRef.current.unmark()
    }
    
    // Handle whitespace-only queries
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    
    // Set loading state
    setIsSearching(true)
    
    // Add a small delay to show loading state for better UX
    searchTimeoutRef.current = setTimeout(() => {
      if (!markInstanceRef.current) {
        setIsSearching(false)
        return
      }
      
      const results: SearchResult[] = []
      const elementMatchCounts = new Map<string, number>()
      
      // Use Mark.js for cross-element search
      markInstanceRef.current.mark(query, {
        separateWordSearch: false,    // Find exact phrases
        acrossElements: true,         // Enable cross-element search
        className: 'search-highlight',
        caseSensitive: caseSensitive, // Apply case sensitivity option
        each: function(element) {
          // Find parent DocumentElement for navigation
          const elementContainer = element.closest('[data-element-id]')
          if (elementContainer) {
            const elementId = elementContainer.getAttribute('data-element-id') || ''
            
            // Count matches per element
            const currentCount = elementMatchCounts.get(elementId) || 0
            elementMatchCounts.set(elementId, currentCount + 1)
            
            // Add to results if this is the first match for this element
            if (currentCount === 0) {
              const elementTag = elementContainer.getAttribute('data-element-tag') || ''
              const docElement = elements.find(el => el.id === elementId)
              
              if (docElement) {
                // Extract clean content for context generation
                const rawContent = docElement.content || ''
                const cleanContent = extractCleanText(rawContent)
                
                // Create context-aware snippets for all matches in this element
                const contexts = extractAllMatchContexts(cleanContent, query, 50, caseSensitive)
                
                // Only add results if we have contexts (matches found)
                if (contexts.length > 0) {
                  results.push({
                    elementId,
                    elementType: elementTag,
                    matchCount: 1, // Will update after all matches are found
                    contexts,
                    fullText: cleanContent // Store full text for tooltips
                  })
                }
              }
            }
          }
        },
        done: function() {
          // Update match counts
          results.forEach(result => {
            result.matchCount = elementMatchCounts.get(result.elementId) || 1
          })
          
          setSearchResults(results)
          setIsSearching(false)
          searchTimeoutRef.current = null
        }
      })
    }, 150) // Small delay to show loading state
  }, [elements, caseSensitive])
  
  // Debounced search function (300ms delay) - only for text search
  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [performSearch]
  )

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])
  
  // Re-run search when case sensitivity changes - only for text search
  useEffect(() => {
    if (searchQuery.trim() && !useSemanticSearch) {
      performSearch(searchQuery)
    }
  }, [caseSensitive, searchQuery, performSearch, useSemanticSearch])

  // Fetch query history for semantic search
  // const fetchQueryHistory = useCallback(async () => {
  //   if (!useSemanticSearch) return
  //   
  //   setIsLoadingHistory(true)
  //   try {
  //     const response = await fetch(`/api/semantic-search?documentId=${encodeURIComponent(documentId)}`)
  //     const data = await response.json()
  //     
  //     if (!response.ok) {
  //       throw new Error(data.error || 'Failed to fetch query history')
  //     }
  //     
  //     setQueryHistory(data.queries || [])
  //     console.log(`[QueryHistory] Fetched ${data.queries?.length || 0} historical queries`)
  //   } catch (error) {
  //     console.error('[QueryHistory] Failed to fetch query history:', error)
  //     // Don't show error to user - query history is nice-to-have
  //     setQueryHistory([])
  //   } finally {
  //     setIsLoadingHistory(false)
  //   }
  // }, [documentId, useSemanticSearch])

  // Fetch query history when semantic search is enabled
  // useEffect(() => {
  //   if (useSemanticSearch) {
  //     fetchQueryHistory()
  //   } else {
  //     // Clear history when switching to text search
  //     setQueryHistory([])
  //     setShowQueryHistory(false)
  //   }
  // }, [useSemanticSearch, fetchQueryHistory])

  // Semantic search function using API endpoint
  // const performSemanticSearch = useCallback(async (query: string) => {
  //   // Clear any previous search state
  //   setSemanticSearchError(null)
  //   setSearchResults([])
  //   setIsSearching(true)
  //   setSemanticSearchCached(false)
  //   setSemanticSearchCachedAt(null)
  //   
  //   // Clear text search highlights since we're doing semantic search
  //   if (markInstanceRef.current) {
  //     markInstanceRef.current.unmark()
  //   }
  // 
  //   try {
  //     const response = await fetch('/api/semantic-search', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({
  //         query,
  //         documentId
  //       })
  //     })
  // 
  //     const data = await response.json()
  // 
  //     if (!response.ok) {
  //       throw new Error(data.error || 'Semantic search failed')
  //     }
  // 
  //     // Update cache status
  //     setSemanticSearchCached(!!data.cached)
  //     setSemanticSearchCachedAt(data.cachedAt || null)
  // 
  //     // Convert semantic search results to SearchResult format
  //     const semanticResults: SearchResult[] = data.matches.map((match: {
  //       elementId: string
  //       confidence: number
  //       reasoning: string
  //       relevantText: string
  //     }) => {
  //       // Find the corresponding element to get tag name and content
  //       const element = elements.find(el => el.id === match.elementId)
  //       
  //       return {
  //         elementId: match.elementId,
  //         elementType: element?.tag_name || 'unknown',
  //         textExcerpt: match.relevantText || (element?.content ? 
  //           (extractCleanText(element.content).substring(0, 100) + '...') : ''),
  //         matchCount: 1, // Semantic search doesn't have traditional match counts
  //         searchType: 'semantic' as const,
  //         confidence: match.confidence,
  //         reasoning: match.reasoning
  //       }
  //     })
  // 
  //     setSearchResults(semanticResults)
  //     console.log(`[SemanticSearch] Found ${semanticResults.length} semantic matches for query: "${query}"`)
  //     
  //   } catch (error) {
  //     console.error('[SemanticSearch] Error performing semantic search:', error)
  //     const errorMessage = error instanceof Error ? error.message : 'Failed to perform semantic search'
  //     setSemanticSearchError(errorMessage)
  //     setSearchResults([])
  //   } finally {
  //     setIsSearching(false)
  //     // Refresh query history after search (success or failure)
  //     if (useSemanticSearch) {
  //       fetchQueryHistory()
  //     }
  //   }
  // }, [documentId, elements, useSemanticSearch, fetchQueryHistory])

  // Function to sort semantic search results
  const sortSemanticResults = useCallback((results: SearchResult[], sortByRelevance: boolean) => {
    if (!results.length || results[0]?.searchType !== 'semantic') {
      return results
    }

    return [...results].sort((a, b) => {
      if (sortByRelevance) {
        // Sort by confidence (relevance) - highest first
        return (b.confidence || 0) - (a.confidence || 0)
      } else {
        // Sort by document position - find element positions
        const elementA = elements.find(el => el.id === a.elementId)
        const elementB = elements.find(el => el.id === b.elementId)
        return (elementA?.position || 0) - (elementB?.position || 0)
      }
    })
  }, [elements])

  // Memoized sorted search results
  const sortedSearchResults = useMemo(() => {
    if (useSemanticSearch && searchResults.length > 0 && searchResults[0]?.searchType === 'semantic') {
      return sortSemanticResults(searchResults, semanticSortByRelevance)
    }
    return searchResults
  }, [searchResults, semanticSortByRelevance, useSemanticSearch, sortSemanticResults])

  // Filtered query history based on current search input
  // const filteredQueryHistory = useMemo(() => {
  //   if (!useSemanticSearch || !searchQuery.trim()) {
  //     return queryHistory
  //   }
  //   
  //   const searchLower = searchQuery.toLowerCase()
  //   return queryHistory.filter(item => 
  //     item.query.toLowerCase().includes(searchLower)
  //   )
  // }, [queryHistory, searchQuery, useSemanticSearch])

  // Format date in unambiguous format: "2025-June-08 at 22:15"
  // const formatDate = useCallback((dateString: string) => {
  //   const date = new Date(dateString)
  //   const monthNames = [
  //     'January', 'February', 'March', 'April', 'May', 'June',
  //     'July', 'August', 'September', 'October', 'November', 'December'
  //   ]
  //   
  //   const year = date.getFullYear()
  //   const month = monthNames[date.getMonth()]
  //   const day = date.getDate().toString().padStart(2, '0')
  //   const hours = date.getHours().toString().padStart(2, '0')
  //   const minutes = date.getMinutes().toString().padStart(2, '0')
  //   
  //   return `${year}-${month}-${day} at ${hours}:${minutes}`
  // }, [])

  // Modify the existing search handler to support both search types
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchQuery(value)
    
    // Clear previous errors and highlights
    setSemanticSearchError(null)
    if (!value.trim() && markInstanceRef.current) {
      markInstanceRef.current.unmark()
    }
    
    // For semantic search, show history dropdown when focusing and typing
    if (useSemanticSearch && queryHistory.length > 0) {
      setShowQueryHistory(true)
    }
    
    // Use appropriate search type
    if (useSemanticSearch) {
      // Semantic search is manual trigger only - don't auto-search
      if (!value.trim()) {
        setSearchResults([])
        setIsSearching(false)
      }
    } else {
      // Continue with regular debounced text search
      debouncedSearch(value)
    }
  }, [useSemanticSearch, debouncedSearch, queryHistory.length])

  // Manual semantic search trigger
  // const triggerSemanticSearch = useCallback(() => {
  //   if (searchQuery.trim() && useSemanticSearch) {
  //     performSemanticSearch(searchQuery)
  //   }
  // }, [searchQuery, useSemanticSearch, performSemanticSearch])

  // Note: DOM event listener removed - now using DocumentCommunicationContext for all cross-pane communication

  // Render functions for tabs - memoized to prevent unnecessary re-mounting
  const renderOriginalTab = useCallback(() => (
    <OriginalHeadingsTab
      content={content}
      elements={elements}
      onHeadingClick={onHeadingClick}
      documentId={documentId}
      headingVisibility={headingVisibility}
    />
  ), [content, elements, onHeadingClick, documentId, headingVisibility])

  const renderAIGeneratedTab = useCallback(() => (
    <AIGeneratedHeadingsTab
      content={content}
      elements={elements}
      onHeadingClick={onHeadingClick}
      documentId={documentId}
      headingVisibility={headingVisibility}
    />
  ), [content, elements, onHeadingClick, documentId, headingVisibility])

  const renderSummaryTab = useCallback(() => (
    <DocumentSummaryTab
      content={content}
      documentId={documentId}
      markdownContent={markdownContent}
    />
  ), [content, documentId, markdownContent])

  const renderChatTab = useCallback(() => (
    <div className="h-full">
      <AssistantChat
        documentId={documentId}
        documentContext={documentContext}
      />
    </div>
  ), [documentId, documentContext])

  const renderHighlightsTab = useCallback(() => (
    <HighlightManagement
      documentId={documentId}
      elements={elements}
      semanticHighlights={semanticHighlights}
      onSemanticHighlightsChange={onSemanticHighlightsChange}
      activeElementId={activeElementId}
      onActiveElementChange={onActiveElementChange}
    />
  ), [documentId, elements, semanticHighlights, onSemanticHighlightsChange, activeElementId, onActiveElementChange])

  const renderGlossaryTab = useCallback(() => {
    if (!showGlossary) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Book size={24} weight="bold" className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Glossary</h3>
          <p className="text-sm text-gray-600 mb-6 max-w-sm">
            Create an interactive glossary of key terms, concepts, and entities from this document.
          </p>
          <Button
            onClick={onLoadGlossary}
            disabled={isLoadingGlossary}
            variant="default"
            className="px-6 py-2"
          >
            {isLoadingGlossary ? (
              <>
                <CircleNotch className="animate-spin mr-2" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Book className="mr-2" size={16} weight="bold" />
                Generate Glossary
              </>
            )}
          </Button>
        </div>
      )
    }

    return (
      <>
        {isLoadingGlossary ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <CircleNotch className="animate-spin text-blue-600" size={24} weight="bold" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Document</h3>
            <p className="text-sm text-gray-600">
              Extracting key terms and concepts...
            </p>
          </div>
        ) : glossaryError ? (
          <div className="p-4">
            <AlertWithIcon 
              variant="warning"
              title="Failed to generate glossary"
              description={glossaryError}
            />
            {onResetGlossary && glossaryCached && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetGlossary}
                  className="text-xs"
                  title="Reset and clear cached glossary data"
                >
                  <ArrowCounterClockwise size={14} weight="bold" className="mr-1" />
                  Reset Glossary
                </Button>
              </div>
            )}
          </div>
        ) : glossaryEntities && glossaryEntities.length > 0 ? (
          <div>
            <div className="p-4 pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Document Glossary</h3>
                <div className="flex items-center gap-2">
                  {glossaryCached && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                      Loaded
                    </span>
                  )}
                  {onResetGlossary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onResetGlossary}
                      className="h-7 px-2 text-xs hover:bg-gray-100"
                      title="Reset and regenerate glossary"
                    >
                      <ArrowCounterClockwise size={14} weight="bold" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {glossaryEntities?.length || 0} {(glossaryEntities?.length || 0) === 1 ? 'entry' : 'entries'} found
              </p>
            </div>
            <GlossaryDisplay 
              entities={glossaryEntities || []} 
              elements={elements}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <Question size={24} weight="bold" className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Entries Found</h3>
            <p className="text-sm text-gray-600">
              No glossary entries were identified in this document.
            </p>
          </div>
        )}
      </>
    )
  }, [showGlossary, isLoadingGlossary, glossaryError, glossaryCached, glossaryEntities, elements, onLoadGlossary, onResetGlossary])

  const renderSearchTab = useCallback(() => (
      <div className="flex flex-col h-full">
        {/* Pinned search input */}
        <div className="sticky top-0 bg-white z-10 p-4 border-b border-gray-200">

          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="Search document..."
              className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <MagnifyingGlass 
              size={16} 
              weight="bold" 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  // Cancel any pending search
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current)
                    searchTimeoutRef.current = null
                  }
                  setSearchQuery('')
                  setSearchResults([])
                  setIsSearching(false)
                  if (markInstanceRef.current) {
                    markInstanceRef.current.unmark()
                  }
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} weight="bold" />
              </button>
            )}
          </div>
          
          {/* Advanced options for text search */}
          <div className="mt-3">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <CaretDown 
                size={14} 
                weight="bold" 
                className={`transform transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}
              />
              Advanced options
            </button>
            
            {showAdvancedOptions && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Case sensitive
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
        
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CircleNotch className="animate-spin text-gray-400 mb-2" size={24} weight="bold" />
            <div className="text-sm text-gray-500">Searching...</div>
          </div>
        ) : searchQuery.trim() && searchResults.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">No results found</div>
        ) : searchResults.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found for &quot;{searchQuery}&quot;
              </div>
            </div>
            
            <div className="space-y-3">
              {sortedSearchResults.map((result) => (
                <div
                  key={result.elementId}
                  className="border border-gray-200 rounded-lg hover:shadow-sm cursor-pointer transition-all duration-200 bg-white"
                  onClick={() => {
                    // Use context action for scrolling and persistent element selection
                    actions.scrollToElement(result.elementId)
                  }}
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {result.elementType}
                      </span>
                    </div>
                    {result.matchCount > 1 && (
                      <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full font-medium">
                        {result.matchCount} matches
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="space-y-2">
                      {result.contexts.map((context, index) => {
                        // Generate tooltip content showing full paragraph with highlighted match
                        const tooltipContent = generateTooltipContent(result.fullText, searchQuery, 500, caseSensitive)
                        
                        return (
                          <Tooltip key={index}>
                            <TooltipTrigger asChild>
                              <div className="pl-3 border-l-2 border-orange-200 bg-orange-50 py-2 px-3 rounded-r cursor-help hover:bg-orange-100 transition-colors duration-150">
                                <HighlightedSearchText text={context.text} query={searchQuery} caseSensitive={caseSensitive} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="right" 
                              className="max-w-md text-left bg-white border border-gray-200 rounded-lg shadow-lg p-4"
                              sideOffset={8}
                            >
                              <div className="text-xs text-gray-700 leading-relaxed">
                                <HighlightedSearchText text={tooltipContent} query={searchQuery} caseSensitive={caseSensitive} />
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        </div>
      </div>
    ), [searchQuery, isSearching, searchResults, showAdvancedOptions, caseSensitive, handleSearchInputChange, actions, sortedSearchResults])


  return (
    <div className="h-full flex flex-col">
      {/* All tabs rendered but only active one visible - using display:none for state persistence */}
      <div className="flex-1 overflow-y-auto">
        <div style={{ display: state.activeTabId === 'original' ? 'block' : 'none' }} className="h-full">
          {renderOriginalTab()}
        </div>
        <div style={{ display: state.activeTabId === 'ai-generated' ? 'block' : 'none' }} className="h-full">
          {renderAIGeneratedTab()}
        </div>
        <div style={{ display: state.activeTabId === 'summary' ? 'block' : 'none' }} className="h-full">
          {renderSummaryTab()}
        </div>
        <div style={{ display: state.activeTabId === 'chat' ? 'block' : 'none' }} className="h-full">
          {renderChatTab()}
        </div>
        <div style={{ display: state.activeTabId === 'glossary' ? 'block' : 'none' }} className="h-full">
          {renderGlossaryTab()}
        </div>
        <div style={{ display: state.activeTabId === 'search' ? 'block' : 'none' }} className="h-full">
          {renderSearchTab()}
        </div>
        <div style={{ display: state.activeTabId === 'highlights' ? 'block' : 'none' }} className="h-full">
          {renderHighlightsTab()}
        </div>
      </div>
    </div>
  )
}