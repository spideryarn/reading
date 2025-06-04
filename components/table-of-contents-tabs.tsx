'use client'

// Extracted tab components from TableOfContents for use in unified left pane
// See docs/TABLE_OF_CONTENTS_PANE.md for architecture and usage patterns
// See docs/AI_SUMMARISE.md for tooltip summarisation feature details
// See docs/MUTATIONS.md for document mutation system

import { useState, useEffect, useRef, useMemo, type JSX } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import type { GranularityKey } from '@/lib/prompts/templates/summarise'
import { useMutation, useActiveMutationType } from '@/lib/context/mutation-context'
import { SUMMARY_CONFIG } from '@/lib/config'
import { generateHeadingMutation, extractHeadingsFromMutation } from '@/lib/services/heading-mutation-generator'
import { HeadingTree, type Heading } from './heading-tree'
import { SummaryPane } from './summary-pane'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { AlertWithIcon } from '@/components/ui/alert'

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
  const [headings, setHeadings] = useState<Heading[]>([])
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [granularityLevel, setGranularityLevel] = useState(3)
  

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
      setGranularityLevel(Math.min(3, maxDepth))
    }
  }, [headings])

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

  const getTooltipContent = (elementId: string): JSX.Element => {
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
            <div className="whitespace-pre-wrap leading-relaxed text-gray-800 font-medium">
              {cachedContent}
            </div>
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
  }

  const handleTooltipShow = (elementId: string) => {
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
  }

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
export function AIGeneratedHeadingsTab({ 
  content, 
  elements, 
  onHeadingClick, 
  documentId,
  headingVisibility 
}: BaseTabProps) {
  const { applyMutation, document: mutatedDocument } = useMutation()
  const activeMutationType = useActiveMutationType()
  const [aiHeadings, setAiHeadings] = useState<Heading[]>([])
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())
  const [isLoadingHeadings, setIsLoadingHeadings] = useState(false)
  const [headingsError, setHeadingsError] = useState<string | null>(null)
  const [showHeadings, setShowHeadings] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [granularityLevel, setGranularityLevel] = useState(3)
  

  // Update default granularity for AI headings
  useEffect(() => {
    if (aiHeadings.length > 0) {
      const maxDepth = Math.max(...aiHeadings.map(h => h.level))
      setGranularityLevel(Math.min(3, maxDepth))
    }
  }, [aiHeadings])

  // Helper function to fetch cached headings from database
  const fetchCachedHeadings = async (documentId: string) => {
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
    }
  }

  // Helper function to apply cached headings without API call
  const applyCachedHeadings = async (cachedHeadings: Array<{ id_of_after: string, html: string }>) => {
    try {
      console.log('Applying cached headings:', cachedHeadings)
      
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
  }

  // Core headings generation logic without state management
  const generateHeadingsFromAPI = async () => {
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
        
        // Clear AI-generated collapsed state when new headings are generated
        setCollapsedIds(new Set())
      } else {
        throw new Error(result.error || 'Failed to apply mutation')
      }
  }

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

  // Auto-load cached headings or generate new ones on mount
  useEffect(() => {
    const loadHeadings = async () => {
      setIsLoadingHeadings(true)
      setHeadingsError(null)
      
      try {
        // First try to load cached headings
        const cached = await fetchCachedHeadings(documentId)
        if (cached && cached.headings) {
          console.log('Found cached headings, applying them...')
          await applyCachedHeadings(cached.headings)
        } else {
          // Generate new headings if none cached
          console.log('No cached headings found, generating new ones...')
          await generateHeadingsFromAPI()
        }
      } catch (error) {
        console.error('Error in loadHeadings:', error)
        setHeadingsError(`Failed to load headings: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setShowHeadings(true)
      } finally {
        setIsLoadingHeadings(false)
      }
    }
    
    if (!showHeadings && !isLoadingHeadings) {
      loadHeadings()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const getTooltipContent = (elementId: string): JSX.Element => {
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
            <div className="whitespace-pre-wrap leading-relaxed text-gray-800 font-medium">
              {cachedContent}
            </div>
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
  }

  const handleTooltipShow = (elementId: string) => {
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
  }

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
      ) : (
        <p className="text-gray-500">No headings generated</p>
      )}
    </div>
  )
}

/**
 * Document Summary Tab Component
 * Displays an AI-generated summary of the entire document
 */
export function DocumentSummaryTab({ markdownContent, documentId }: BaseTabProps) {
  return <SummaryPane content={markdownContent || ""} documentId={documentId} autoActivate />
}