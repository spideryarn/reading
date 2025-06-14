'use client'

// Extracted tab components from TableOfContents for use in unified left pane
// See docs/UNIFIED_LEFT_PANE.md for architecture and usage patterns
// See docs/TOOL_SUMMARISE.md for tooltip summarisation feature details
// See docs/MUTATIONS.md for document mutation system

import React, { useState, useEffect, useRef, useCallback, type JSX } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import type { GranularityKey } from '@/lib/prompts/templates/summarise'
import { useMutation, useActiveMutationType } from '@/lib/context/mutation-context'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import { SUMMARY_CONFIG } from '@/lib/config'
import { generateHeadingMutation, extractHeadingsFromMutation } from '@/lib/services/heading-mutation-generator'
import { HeadingTree, type Heading } from './heading-tree'
import { MultiSummaryPane } from './multi-summary-pane'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { AlertWithIcon } from '@/components/ui/alert'
import { MarkdownRenderer } from '@/components/markdown-renderer'

// Shared types
interface BaseTabProps {
  content: string
  elements?: DocumentElement[]
  onHeadingClick?: (headingText: string, headingId?: string) => void
  documentId: string
  markdownContent?: string
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
}

// Tooltip granularity setting - TypeScript will enforce this is a valid option
const TOOLTIP_GRANULARITY: GranularityKey = 'single short paragraph'

/**
 * Check if a heading section has sufficient content to generate a meaningful summary.
 * Extracts content for the section and checks if it meets the minimum length threshold.
 */
function hasSufficientContentForSummary(
  elementId: string,
  elements?: DocumentElement[],
  mutatedDocument?: DocumentElement[],
  activeMutationType?: string | null
): boolean {
  // Determine which elements to search based on active mutation state
  const elementsToSearch = (activeMutationType === 'insert-headings' && mutatedDocument) 
    ? mutatedDocument 
    : elements

  if (!elementsToSearch || elementsToSearch.length === 0) {
    return false
  }

  // Find the heading element by ID
  const headingElement = elementsToSearch.find(element => element.id === elementId)
  if (!headingElement) {
    return false
  }

  const headingLevel = parseInt(headingElement.tag_name.substring(1))
  const headingPosition = headingElement.position

  // Find all elements that belong to this heading's section
  const sectionElements: DocumentElement[] = []
  
  for (let i = 0; i < elementsToSearch.length; i++) {
    const element = elementsToSearch[i]
    
    // Skip elements before this heading
    if (element.position <= headingPosition) continue
    
    // Stop at next heading of equal or higher level
    if (element.tag_name.match(/^h[1-6]$/i)) {
      const elementLevel = parseInt(element.tag_name.substring(1))
      if (elementLevel <= headingLevel) {
        break
      }
    }
    
    // Include this element if it has content
    if (element.content?.trim()) {
      sectionElements.push(element)
    }
  }

  // Calculate total text content length
  const totalTextContent = sectionElements
    .map(element => element.content)
    .join(' ')
    .trim()
  
  return totalTextContent.length >= SUMMARY_CONFIG.MIN_CONTENT_LENGTH_CHARS
}

/**
 * Generate LLM summary for a heading's hierarchical content.
 * Extracts all content belonging to the specified heading section and sends it to the LLM for summarisation.
 */
async function generateHeadingSummary(
  elementId: string,
  documentId: string,
  elements?: DocumentElement[],
  mutatedDocument?: DocumentElement[],
  activeMutationType?: string | null,
  setContentCache?: React.Dispatch<React.SetStateAction<Map<string, string>>>
): Promise<string> {
  // Determine which elements to search based on active mutation state
  const elementsToSearch = (activeMutationType === 'insert-headings' && mutatedDocument) 
    ? mutatedDocument 
    : elements

  if (!elementsToSearch || elementsToSearch.length === 0) {
    return "No content available"
  }

  // Find the heading element by ID - much more reliable than text matching
  const headingElement = elementsToSearch.find(element => element.id === elementId)

  if (!headingElement) {
    console.warn(`Heading element not found for ID: ${elementId}`)
    return "Heading not found in elements"
  }

  const headingLevel = parseInt(headingElement.tag_name.substring(1))
  const headingPosition = headingElement.position

  // Find all elements that belong to this heading's section
  const sectionElements: DocumentElement[] = []
  
  for (let i = 0; i < elementsToSearch.length; i++) {
    const element = elementsToSearch[i]
    
    // Skip elements before this heading
    if (element.position <= headingPosition) continue
    
    // Stop at next heading of equal or higher level
    if (element.tag_name.match(/^h[1-6]$/i)) {
      const elementLevel = parseInt(element.tag_name.substring(1))
      if (elementLevel <= headingLevel) {
        break
      }
    }
    
    // Include this element if it has content
    if (element.content?.trim()) {
      sectionElements.push(element)
    }
  }

  if (sectionElements.length === 0) {
    return "No content found for this section"
  }

  // Convert elements to full content for LLM processing (no truncation)
  const htmlContent = sectionElements
    .map(element => `<${element.tag_name}>${element.content}</${element.tag_name}>`)
    .join('')

  try {
    // Call LLM summarisation API
    const response = await fetch('/api/summarise', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: htmlContent,
        granularity: TOOLTIP_GRANULARITY,
        documentId: documentId, // Keep proper UUID for database
        sectionId: elementId    // Use element ID for section-specific caching
      }),
    })

    if (!response.ok) {
      throw new Error(`Summary API failed: ${response.status}`)
    }

    const { summary } = await response.json()
    
    // Cache the result using element ID if cache setter is provided
    if (setContentCache) {
      setContentCache(prev => new Map(prev).set(elementId, summary))
    }
    
    return summary
  } catch (error) {
    console.error('Error generating summary:', error)
    
    // Return error message instead of fallback content
    const errorMessage = "⚠️ Unable to generate summary. Please try again later."
    
    // Cache the error message to avoid repeated failed attempts
    if (setContentCache) {
      setContentCache(prev => new Map(prev).set(elementId, errorMessage))
    }
    
    return errorMessage
  }
}

/**
 * Original Headings Tab Component
 * Displays the document's original heading structure
 */
export function OriginalHeadingsTab({ 
  content, 
  elements, 
  onHeadingClick, 
  documentId,
  headingVisibility 
}: BaseTabProps) {
  const { document: mutatedDocument } = useMutation()
  const activeMutationType = useActiveMutationType()
  const { state: commState } = useDocumentCommunication()
  const [headings, setHeadings] = useState<Heading[]>([])
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [granularityLevel, setGranularityLevel] = useState(3)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  

  // Extract headings from content/elements
  useEffect(() => {
    const extractHeadings = () => {
      // Use mutated document if available and AI headings are active
      const elementsToUse = (activeMutationType === 'insert-headings' && mutatedDocument) ? mutatedDocument : elements
      
      if (!elementsToUse) {
        // Fallback to parsing HTML content if no elements available
        const parser = new DOMParser()
        const doc = parser.parseFromString(content, 'text/html')
        const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
        
        const extractedHeadings: Heading[] = []
        
        headingElements.forEach((element, index) => {
          const level = parseInt(element.tagName.substring(1))
          const text = element.textContent?.trim() || ''
          
          // Generate an id if the heading doesn't have one
          let id = element.id
          if (!id) {
            id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          }
          
          if (text) {
            extractedHeadings.push({ 
              id, 
              text, 
              level,
              elementId: id  // In fallback case, use the same ID
            })
          }
        })
        
        setHeadings(extractedHeadings)
      } else {
        // Extract headings from document elements
        const extractedHeadings: Heading[] = elementsToUse
          .filter(el => {
            // Only include heading elements
            if (!el.tag_name.match(/^h[1-6]$/i)) return false
            
            // Filter based on AI heading state
            const isAiGenerated = el.attributes?.['data-ai-generated'] === 'true'
            
            if (activeMutationType === 'insert-headings') {
              // When AI headings are active, show only AI-generated headings
              return isAiGenerated
            } else {
              // When AI headings are NOT active, show only original headings
              return !isAiGenerated
            }
          })
          .map((el, index) => ({
            id: el.id || `heading-${index}`,
            text: el.content || '',
            level: parseInt(el.tag_name.substring(1)),
            elementId: el.id  // Add the element ID for reliable lookup
          }))
          .filter(h => h.text.length > 0)
        
        setHeadings(extractedHeadings)
      }
    }

    if (content || elements || mutatedDocument) {
      extractHeadings()
    }
  }, [content, elements, mutatedDocument, activeMutationType])

  // Update default granularity based on max depth
  useEffect(() => {
    if (headings.length > 0) {
      const maxDepth = Math.max(...headings.map(h => h.level))
      const newGranularityLevel = Math.min(3, maxDepth)
      if (newGranularityLevel !== granularityLevel) {
        setGranularityLevel(newGranularityLevel)
      }
    }
  }, [headings, granularityLevel])

  const handleHeadingClick = (heading: Heading) => {
    if (onHeadingClick) {
      onHeadingClick(heading.text, heading.id)
    } else {
      // Fallback to DOM scrolling if no callback provided
      const element = document.getElementById(heading.id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        console.warn(`Element with id "${heading.id}" not found in DOM`)
      }
    }
  }

  const getTooltipContent = useCallback((elementId: string): JSX.Element => {
    const isLoading = loadingStates.has(elementId)
    const cachedContent = contentCache.get(elementId)
    
    if (isLoading) {
      return (
        <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <CircleNotch size={16} className="animate-spin text-blue-500" style={{ animationDuration: '2s' }} />
            <span className="text-gray-700 font-medium">Summarising contents of this heading...</span>
          </div>
        </div>
      )
    }
    
    if (cachedContent) {
      // Check if this is an error message
      const isError = cachedContent.startsWith('⚠️')
      
      if (isError) {
        return (
          <div className="max-w-md p-4 text-sm bg-amber-50 border border-amber-200 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <CircleNotch size={16} className="text-amber-600 flex-shrink-0" />
              <span className="text-amber-800 font-medium">{cachedContent.replace('⚠️ ', '')}</span>
            </div>
          </div>
        )
      }
      
      return (
        <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="prose prose-sm prose-gray max-w-none">
            <MarkdownRenderer content={cachedContent} />
          </div>
        </div>
      )
    }
    
    // Check if section has enough content to be worth summarising
    if (hasSufficientContentForSummary(elementId, elements, mutatedDocument, activeMutationType)) {
      return (
        <div className="max-w-md p-4 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="font-medium">Hover to load content...</span>
          </div>
        </div>
      )
    } else {
      return (
        <div className="max-w-md p-4 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="font-medium italic">Section too short to summarise</span>
          </div>
        </div>
      )
    }
  }, [loadingStates, contentCache, elements, mutatedDocument, activeMutationType])

  const handleTooltipShow = useCallback((elementId: string) => {
    if (!contentCache.has(elementId) && !loadingStates.has(elementId)) {
      // Only start summary generation if there's sufficient content
      if (hasSufficientContentForSummary(elementId, elements, mutatedDocument, activeMutationType)) {
        // Add to loading states
        setLoadingStates(prev => new Set(prev).add(elementId))
        
        // Start async LLM summary generation
        generateHeadingSummary(elementId, documentId, elements, mutatedDocument, activeMutationType, setContentCache).finally(() => {
          // Remove from loading states
          setLoadingStates(prev => {
            const newSet = new Set(prev)
            newSet.delete(elementId)
            return newSet
          })
        })
      }
    }
  }, [elements, mutatedDocument, activeMutationType, documentId])

  const toggleExpanded = (headingId: string) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(headingId)) {
        newSet.delete(headingId)
      } else {
        newSet.add(headingId)
      }
      return newSet
    })
  }

  // Sync ToC scroll position when document position changes
  useEffect(() => {
    // Clear any pending scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }

    // Only sync if we have a current position and this tab is active
    if (commState.currentPosition?.elementId && commState.activeTabId === 'original') {
      scrollTimeoutRef.current = setTimeout(() => {
        const tocElement = document.querySelector(
          `[data-heading-id="${commState.currentPosition.elementId}"]`
        )
        if (tocElement) {
          ;(tocElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Temporary highlight for visibility
          tocElement.classList.add('bg-yellow-100')
          setTimeout(() => tocElement.classList.remove('bg-yellow-100'), 2000)
        }
        scrollTimeoutRef.current = null
      }, 100)
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [commState.currentPosition, commState.activeTabId])

  if (headings.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No headings found in document
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <HeadingTree
        headings={headings}
        themeColors={{
          hover: 'hover:bg-blue-50',
          text: 'group-hover:text-blue-900',
          levelText: 'text-gray-400 group-hover:text-blue-600',
          levelTextHover: 'group-hover:text-blue-600'
        }}
        onHeadingClick={handleHeadingClick}
        getTooltipContent={getTooltipContent}
        handleTooltipShow={handleTooltipShow}
        collapsedIds={collapsedIds}
        onToggleExpanded={toggleExpanded}
        granularityLevel={granularityLevel}
        onGranularityChange={setGranularityLevel}
        headingVisibility={headingVisibility}
      />
    </div>
  )
}

/**
 * AI-Generated Headings Tab Component
 * Displays AI-generated headings with auto-generation on first view
 */
export const AIGeneratedHeadingsTab = React.memo(function AIGeneratedHeadingsTab({ 
  content, 
  elements, 
  onHeadingClick, 
  documentId,
  headingVisibility 
}: BaseTabProps) {
  const { applyMutation, revertMutation, mutationState, document: mutatedDocument } = useMutation()
  const activeMutationType = useActiveMutationType()
  const { state: commState } = useDocumentCommunication()
  const [aiHeadings, setAiHeadings] = useState<Heading[]>([])
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())
  const [isLoadingHeadings, setIsLoadingHeadings] = useState(false)
  const [headingsError, setHeadingsError] = useState<string | null>(null)
  const [showHeadings, setShowHeadings] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [granularityLevel, setGranularityLevel] = useState(3)
  const [isLoaded, setIsLoaded] = useState(false)
  const [enhancementId, setEnhancementId] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const fetchInProgressRef = useRef(false)
  

  // Update default granularity for AI headings
  useEffect(() => {
    if (aiHeadings.length > 0) {
      const maxDepth = Math.max(...aiHeadings.map(h => h.level))
      const newGranularityLevel = Math.min(3, maxDepth)
      if (newGranularityLevel !== granularityLevel) {
        setGranularityLevel(newGranularityLevel)
      }
    }
  }, [aiHeadings, granularityLevel])

  // Helper function to fetch cached headings from database
  const fetchCachedHeadings = async (documentId: string) => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      console.log('Fetch already in progress, skipping duplicate request')
      return null
    }
    
    fetchInProgressRef.current = true
    
    try {
      const response = await fetch(`/api/headings?documentId=${documentId}`)
      if (!response.ok) {
        console.error('Failed to fetch cached headings:', response.status)
        return null
      }
      const data = await response.json()
      return data.cached ? data : null
    } catch (error) {
      console.error('Error fetching cached headings:', error)
      return null
    } finally {
      fetchInProgressRef.current = false
    }
  }

  // Helper function to apply cached headings without API call
  const applyCachedHeadings = useCallback(async (cachedHeadings: Array<{ id_of_after: string, html: string }>) => {
    try {
      console.log('Applying cached headings:', cachedHeadings)
      
      // Check if there's already an active mutation
      if (mutationState.activeMutation?.type === 'insert-headings') {
        console.warn('AI headings mutation already active, extracting existing headings')
        // Just extract the existing headings from the active mutation
        const existingHeadings = extractHeadingsFromMutation(mutationState.activeMutation).map(h => ({
          ...h,
          elementId: h.id
        }))
        setAiHeadings(existingHeadings)
        setShowHeadings(true)
        setIsLoaded(true)
        return
      }
      
      // Generate mutation from cached headings data
      const mutation = generateHeadingMutation({
        headings: cachedHeadings,
        documentId: documentId
      })
      
      // Apply the mutation to insert headings into document
      const result = await applyMutation(mutation)
      
      if (result.success) {
        // Extract headings from mutation for display
        const generatedHeadings = extractHeadingsFromMutation(mutation).map(h => ({
          ...h,
          elementId: h.id  // Ensure elementId is set for AI headings
        }))
        setAiHeadings(generatedHeadings)
        setShowHeadings(true)
        setIsLoaded(true)
        
        // Clear AI-generated collapsed state when cached headings are loaded
        setCollapsedIds(new Set())
        
        console.log('Successfully applied cached headings')
      } else {
        throw new Error(result.error || 'Failed to apply cached headings mutation')
      }
    } catch (error) {
      console.error('Error applying cached headings:', error)
      setHeadingsError(`Failed to load cached headings: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setShowHeadings(true)  // Show the error state
    }
  }, [documentId, applyMutation, mutationState.activeMutation, setAiHeadings, setShowHeadings, setIsLoaded, setCollapsedIds, setHeadingsError])

  // Core headings generation logic without state management
  const generateHeadingsFromAPI = useCallback(async (isRegeneration = false) => {
      console.log('generateHeadingsFromAPI called, isRegeneration:', isRegeneration)
      
      // Check if there's already an active mutation
      if (mutationState.activeMutation?.type === 'insert-headings' && !isRegeneration) {
        console.warn('AI headings mutation already active, skipping generation')
        // Just extract the existing headings from the active mutation
        const existingHeadings = extractHeadingsFromMutation(mutationState.activeMutation).map(h => ({
          ...h,
          elementId: h.id
        }))
        setAiHeadings(existingHeadings)
        setShowHeadings(true)
        setIsLoaded(true)
        return
      }
      
      // Reconstruct HTML from elements with proper IDs
      let htmlWithIds = ''
      if (elements && elements.length > 0) {
        // Build HTML from elements so it has the correct IDs
        htmlWithIds = elements.map(el => {
          const attrs = Object.entries(el.attributes)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ')
          const attrString = attrs ? ` ${attrs}` : ''
          
          if (el.content) {
            return `<${el.tag_name} id="${el.id}"${attrString}>${el.content}</${el.tag_name}>`
          } else {
            return `<${el.tag_name} id="${el.id}"${attrString} />`
          }
        }).join('\n')
      } else {
        // Fallback to original content if no elements
        htmlWithIds = content
      }
      
      const response = await fetch('/api/headings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html_content: htmlWithIds,
          documentId: documentId
        }),
      })

      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('Generate headings response:', data)
      
      // Generate mutation from API response
      const mutation = generateHeadingMutation({
        headings: data.headings,
        documentId: documentId,
        isRegeneration: isRegeneration
      })
      
      // Apply the mutation to insert headings into document
      const result = await applyMutation(mutation)
      
      if (result.success) {
        // Extract headings from mutation for display
        const generatedHeadings = extractHeadingsFromMutation(mutation).map(h => ({
          ...h,
          elementId: h.id  // Ensure elementId is set for AI headings
        }))
        setAiHeadings(generatedHeadings)
        setShowHeadings(true)
        setIsLoaded(false)
        
        // Clear AI-generated collapsed state when new headings are generated
        setCollapsedIds(new Set())
      } else {
        throw new Error(result.error || 'Failed to apply mutation')
      }
  }, [content, elements, documentId, mutationState.activeMutation, applyMutation, setAiHeadings, setShowHeadings, setIsLoaded, setCollapsedIds])

  // Public API for manual headings generation (with state management)
  const handleGenerateHeadings = async () => {
    setIsLoadingHeadings(true)
    setHeadingsError(null)
    
    try {
      await generateHeadingsFromAPI()
    } catch (error) {
      console.error('Error generating headings:', error)
      setHeadingsError(error instanceof Error ? error.message : 'Failed to generate headings')
      setShowHeadings(true)  // Show the error state instead of keeping the button
    } finally {
      setIsLoadingHeadings(false)
    }
  }

  // Reset/regenerate headings functionality
  const handleResetHeadings = async () => {
    console.log('Resetting headings...')
    setIsLoadingHeadings(true)
    setHeadingsError(null)
    setIsLoaded(false)
    
    try {
      // First revert any existing AI headings mutation
      const activeMutationType = mutationState.activeMutation?.type
      if (activeMutationType === 'insert-headings') {
        console.log('Reverting existing AI headings mutation...')
        const revertResult = await revertMutation()
        if (!revertResult.success) {
          console.warn('Failed to revert existing mutation:', revertResult.error)
        }
        
        // Wait a bit for the DOM to update after reverting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Clear the AI headings from state to ensure clean slate
      setAiHeadings([])
      setShowHeadings(false)
      
      // Then delete the cached enhancement if it exists
      if (enhancementId) {
        console.log('Deleting cached headings enhancement...')
        const deleteResponse = await fetch(`/api/headings?documentId=${documentId}`, {
          method: 'DELETE'
        })
        
        if (!deleteResponse.ok) {
          console.warn('Failed to delete cached headings, continuing with regeneration')
        }
      }
      
      setEnhancementId(null)
      
      // Wait a bit before generating new headings to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force regeneration by calling the API directly with regeneration flag
      await generateHeadingsFromAPI(true)
    } catch (error) {
      console.error('Error regenerating headings:', error)
      setHeadingsError(error instanceof Error ? error.message : 'Failed to regenerate headings')
      setShowHeadings(true)
    } finally {
      setIsLoadingHeadings(false)
    }
  }

  // Auto-load cached headings or generate new ones on mount
  useEffect(() => {
    console.log('AIGeneratedHeadingsTab mounted, documentId:', documentId)
    
    // Guard against multiple API calls
    let isCancelled = false
    
    const loadHeadings = async () => {
      // Additional guard: check if we're already loading or have loaded
      if (isLoadingHeadings || showHeadings || aiHeadings.length > 0 || hasInitialized) {
        return
      }
      
      setHasInitialized(true)
      setIsLoadingHeadings(true)
      setHeadingsError(null)
      
      try {
        // First try to load cached headings
        const cached = await fetchCachedHeadings(documentId)
        
        // Check if component was unmounted or cancelled
        if (isCancelled) {
          console.log('AI headings load cancelled (component unmounted)')
          return
        }
        
        if (cached && cached.headings) {
          console.log('Found cached headings, applying them...')
          setEnhancementId(cached.enhancementId || null)
          await applyCachedHeadings(cached.headings)
        } else {
          // Generate new headings if none cached
          console.log('No cached headings found, generating new ones...')
          await generateHeadingsFromAPI()
        }
      } catch (error) {
        console.error('Error in loadHeadings:', error)
        if (!isCancelled) {
          setHeadingsError(`Failed to load headings: ${error instanceof Error ? error.message : 'Unknown error'}`)
          setShowHeadings(true)
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHeadings(false)
        }
      }
    }
    
    // Only load if we haven't already loaded headings
    if (!showHeadings && !isLoadingHeadings && aiHeadings.length === 0 && !hasInitialized) {
      loadHeadings()
    }
    
    // Cleanup function to cancel any in-flight requests
    return () => {
      console.log('AIGeneratedHeadingsTab unmounting')
      isCancelled = true
    }
  }, [documentId, isLoadingHeadings, showHeadings, aiHeadings.length, hasInitialized, applyCachedHeadings, generateHeadingsFromAPI])

  const handleHeadingClick = (heading: Heading) => {
    if (onHeadingClick) {
      onHeadingClick(heading.text, heading.id)
    } else {
      // Fallback to DOM scrolling if no callback provided
      const element = document.getElementById(heading.id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        console.warn(`Element with id "${heading.id}" not found in DOM`)
      }
    }
  }

  const getTooltipContent = useCallback((elementId: string): JSX.Element => {
    const isLoading = loadingStates.has(elementId)
    const cachedContent = contentCache.get(elementId)
    
    if (isLoading) {
      return (
        <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <CircleNotch size={16} className="animate-spin text-blue-500" style={{ animationDuration: '2s' }} />
            <span className="text-gray-700 font-medium">Summarising contents of this heading...</span>
          </div>
        </div>
      )
    }
    
    if (cachedContent) {
      // Check if this is an error message
      const isError = cachedContent.startsWith('⚠️')
      
      if (isError) {
        return (
          <div className="max-w-md p-4 text-sm bg-amber-50 border border-amber-200 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <CircleNotch size={16} className="text-amber-600 flex-shrink-0" />
              <span className="text-amber-800 font-medium">{cachedContent.replace('⚠️ ', '')}</span>
            </div>
          </div>
        )
      }
      
      return (
        <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="prose prose-sm prose-gray max-w-none">
            <MarkdownRenderer content={cachedContent} />
          </div>
        </div>
      )
    }
    
    // Check if section has enough content to be worth summarising
    if (hasSufficientContentForSummary(elementId, elements, mutatedDocument, activeMutationType)) {
      return (
        <div className="max-w-md p-4 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="font-medium">Hover to load content...</span>
          </div>
        </div>
      )
    } else {
      return (
        <div className="max-w-md p-4 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="font-medium italic">Section too short to summarise</span>
          </div>
        </div>
      )
    }
  }, [loadingStates, contentCache, elements, mutatedDocument, activeMutationType])

  const handleTooltipShow = useCallback((elementId: string) => {
    if (!contentCache.has(elementId) && !loadingStates.has(elementId)) {
      // Only start summary generation if there's sufficient content
      if (hasSufficientContentForSummary(elementId, elements, mutatedDocument, activeMutationType)) {
        // Add to loading states
        setLoadingStates(prev => new Set(prev).add(elementId))
        
        // Start async LLM summary generation
        generateHeadingSummary(elementId, documentId, elements, mutatedDocument, activeMutationType, setContentCache).finally(() => {
          // Remove from loading states
          setLoadingStates(prev => {
            const newSet = new Set(prev)
            newSet.delete(elementId)
            return newSet
          })
        })
      }
    }
  }, [elements, mutatedDocument, activeMutationType, documentId])

  const toggleExpanded = (headingId: string) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(headingId)) {
        newSet.delete(headingId)
      } else {
        newSet.add(headingId)
      }
      return newSet
    })
  }

  // Sync ToC scroll position when document position changes
  useEffect(() => {
    // Bail early until headings have been generated / loaded
    if (!showHeadings) return

    // Clear any pending scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }

    // Only sync if we have a current position and this tab is active
    if (commState.currentPosition?.elementId && commState.activeTabId === 'ai-generated') {
      scrollTimeoutRef.current = setTimeout(() => {
        const tocElement = document.querySelector(
          `[data-heading-id="${commState.currentPosition.elementId}"]`
        )
        if (tocElement) {
          ;(tocElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
          tocElement.classList.add('bg-yellow-100')
          setTimeout(() => tocElement.classList.remove('bg-yellow-100'), 2000)
        }
        scrollTimeoutRef.current = null
      }, 100)
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [showHeadings, commState.currentPosition, commState.activeTabId])

  if (!showHeadings) {
    return (
      <div className="p-4">
        <Button
          onClick={handleGenerateHeadings}
          disabled={isLoadingHeadings}
          variant="outline"
          size="full"
          className="text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
        >
          {isLoadingHeadings ? (
            <>
              <CircleNotch className="animate-spin" size={16} />
              Loading...
            </>
          ) : (
            'Generate new headings'
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 h-full flex flex-col overflow-y-auto">
      {isLoadingHeadings ? (
        <Loading text="Generating headings..." spinnerSize={20} />
      ) : headingsError ? (
        <AlertWithIcon 
          variant="warning"
          title="Failed to generate headings"
          description={headingsError}
        />
      ) : aiHeadings.length > 0 ? (
        <>
          {isLoaded && (
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-200">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-green-800">AI Headings</h3>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Loaded
                </span>
              </div>
              <Button
                onClick={handleResetHeadings}
                variant="ghost"
                size="icon-xs"
                className="text-green-600 hover:text-green-800 hover:bg-green-100"
                title="Regenerate headings"
                disabled={isLoadingHeadings}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            </div>
          )}
          <HeadingTree
          headings={aiHeadings}
          themeColors={{
            hover: 'hover:bg-green-50',
            text: 'group-hover:text-green-900',
            levelText: 'text-gray-400 group-hover:text-green-600',
            levelTextHover: 'group-hover:text-green-600'
          }}
          onHeadingClick={handleHeadingClick}
          getTooltipContent={getTooltipContent}
          handleTooltipShow={handleTooltipShow}
          collapsedIds={collapsedIds}
          onToggleExpanded={toggleExpanded}
          granularityLevel={granularityLevel}
          onGranularityChange={setGranularityLevel}
          headingVisibility={headingVisibility}
        />
        </>
      ) : (
        <p className="text-gray-500">No headings generated</p>
      )}
    </div>
  )
})

/**
 * Document Summary Tab Component
 * Displays an AI-generated summary of the entire document
 */
export function DocumentSummaryTab({ markdownContent, documentId }: BaseTabProps) {
  return <MultiSummaryPane content={markdownContent || ""} documentId={documentId} autoActivate />
}