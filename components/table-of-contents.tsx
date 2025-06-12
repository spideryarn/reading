'use client'

// Table of Contents component that extracts headings and provides navigation
// See docs/UNIFIED_LEFT_PANE.md for architecture and usage patterns
// See docs/TOOL_SUMMARISE.md for tooltip summarisation feature details
// See docs/MUTATIONS.md for document mutation system

import { useEffect, useState, useRef } from 'react'
import { Spinner, ExclamationMark, CircleNotch } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import type { GranularityKey } from '@/lib/prompts/templates/summarise'
import { useMutation, useActiveMutationType } from '@/lib/context/mutation-context'
import { SUMMARY_CONFIG } from '@/lib/config'
import { generateHeadingMutation, extractHeadingsFromMutation } from '@/lib/services/heading-mutation-generator'
import { TabContainer, type Tab, type TabContainerRef } from './tab-container'
import { HeadingTree, type Heading } from './heading-tree'
import { MultiSummaryPane } from './multi-summary-pane'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { AlertWithIcon } from '@/components/ui/alert'

interface TableOfContentsProps {
  content: string
  elements?: DocumentElement[]
  onHeadingClick?: (headingText: string, headingId?: string) => void
  documentId: string
  markdownContent: string
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
}

// Utility to toggle visibility of original (non-AI) headings depending on mutation state
function toggleOriginalHeadingsVisibility(hide: boolean) {
  if (typeof document === 'undefined') return

  const selector = 'h1:not([data-ai-generated="true"]), h2:not([data-ai-generated="true"]), h3:not([data-ai-generated="true"]), h4:not([data-ai-generated="true"]), h5:not([data-ai-generated="true"]), h6:not([data-ai-generated="true"])'
  const originalHeadings = Array.from(document.querySelectorAll(selector)) as HTMLElement[]

  originalHeadings.forEach(el => {
    if (hide) {
      el.dataset.originalHeadingHidden = 'true'
      el.style.display = 'none'
    } else if (el.dataset.originalHeadingHidden === 'true') {
      // Restore only if we previously hid it
      el.style.display = ''
      delete el.dataset.originalHeadingHidden
    }
  })
}

export function TableOfContents({ content, elements, onHeadingClick, documentId, markdownContent, headingVisibility }: TableOfContentsProps) {
  const { applyMutation, document: mutatedDocument } = useMutation()
  const activeMutationType = useActiveMutationType()
  const [headings, setHeadings] = useState<Heading[]>([])
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())
  const [aiHeadings, setAiHeadings] = useState<Heading[]>([])
  const [isLoadingHeadings, setIsLoadingHeadings] = useState(false)
  const [headingsError, setHeadingsError] = useState<string | null>(null)
  const [showHeadings, setShowHeadings] = useState(false)
  // const [currentHeadingMutation, setCurrentHeadingMutation] = useState<unknown>(null)
  
  // Tab container ref for auto-scrolling
  const tabContainerRef = useRef<TabContainerRef>(null)
  
  
  // Expand/collapse state for each tab - track collapsed items (default is expanded)
  const [collapsedStates, setCollapsedStates] = useState<Record<'original' | 'ai-generated', Set<string>>>({
    'original': new Set<string>(),
    'ai-generated': new Set<string>()
  })
  
  // Granularity levels for each tab
  const [granularityLevels, setGranularityLevels] = useState<Record<'original' | 'ai-generated', number>>({
    'original': 3,
    'ai-generated': 3
  })
  
  

  // Toggle expand/collapse state for a heading
  const toggleExpanded = (tabId: 'original' | 'ai-generated', headingId: string) => {
    setCollapsedStates(prev => {
      const newStates = { ...prev }
      const tabState = new Set(newStates[tabId])
      
      if (tabState.has(headingId)) {
        tabState.delete(headingId)
      } else {
        tabState.add(headingId)
      }
      
      newStates[tabId] = tabState
      return newStates
    })
  }

  // Auto expand/collapse headings based on granularity level
  const autoExpandCollapseToGranularity = (tabId: 'original' | 'ai-generated', granularityLevel: number) => {
    const headingsForTab = tabId === 'ai-generated' ? aiHeadings : headings
    
    setCollapsedStates(prev => {
      const newStates = { ...prev }
      const newTabState = new Set<string>()
      
      // For each heading, determine if it should be collapsed based on granularity
      headingsForTab.forEach(heading => {
        // Collapse headings that are at or beyond the granularity level
        // This means if granularity is 3, collapse H3 and deeper (H4, H5, H6)
        if (heading.level >= granularityLevel) {
          newTabState.add(heading.id)
        }
        // Headings above the granularity level (H1, H2 when granularity is 3) remain expanded
      })
      
      newStates[tabId] = newTabState
      return newStates
    })
  }
  
  // Calculate maximum heading depth from headings array
  const getMaxDepth = (headingsList: Heading[]) => {
    if (headingsList.length === 0) return 1
    return Math.max(...headingsList.map(h => h.level))
  }

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
  
  // Update default granularity for original headings
  useEffect(() => {
    if (headings.length > 0) {
      const maxDepth = getMaxDepth(headings)
      setGranularityLevels(prev => ({
        ...prev,
        'original': Math.min(3, maxDepth)
      }))
    }
  }, [headings])
  
  // Update default granularity for AI headings
  useEffect(() => {
    if (aiHeadings.length > 0) {
      const maxDepth = getMaxDepth(aiHeadings)
      setGranularityLevels(prev => ({
        ...prev,
        'ai-generated': Math.min(3, maxDepth)
      }))
    }
  }, [aiHeadings])

  // Effect: hide or show original headings depending on active mutation
  useEffect(() => {
    toggleOriginalHeadingsVisibility(activeMutationType === 'insert-headings')
  }, [activeMutationType])

  if (headings.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No headings found in document
      </div>
    )
  }


  // Tooltip granularity setting - TypeScript will enforce this is a valid option
  const TOOLTIP_GRANULARITY: GranularityKey = 'single short paragraph'
  
  /**
   * Check if a heading section has sufficient content to generate a meaningful summary.
   * Extracts content for the section and checks if it meets the minimum length threshold.
   * 
   * @param elementId - The element ID of the heading to check
   * @returns true if content is sufficient for summarisation, false otherwise
   */
  const hasSufficientContentForSummary = (elementId: string): boolean => {
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
   * 
   * @param elementId - The element ID of the heading to summarise
   * @returns Promise resolving to the generated summary or error message
   */
  const generateHeadingSummary = async (elementId: string): Promise<string> => {
    // Check cache first - now using element ID as key
    if (contentCache.has(elementId)) {
      return contentCache.get(elementId)!
    }

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
          granularity: TOOLTIP_GRANULARITY
        }),
      })

      if (!response.ok) {
        throw new Error(`Summary API failed: ${response.status}`)
      }

      const { summary } = await response.json()
      
      // Cache the result using element ID
      setContentCache(prev => new Map(prev).set(elementId, summary))
      
      return summary
    } catch (error) {
      console.error('Error generating summary:', error)
      
      // Return error message instead of fallback content
      const errorMessage = "⚠️ Unable to generate summary. Please try again later."
      
      // Cache the error message to avoid repeated failed attempts
      setContentCache(prev => new Map(prev).set(elementId, errorMessage))
      
      return errorMessage
    }
  }

  /**
   * Get tooltip content with loading state management.
   * Returns appropriate JSX based on current loading state and cached content.
   * 
   * @param elementId - The element ID to get content for
   * @returns JSX element containing loading spinner, cached content, or placeholder
   */
  const getTooltipContent = (elementId: string): JSX.Element => {
    const isLoading = loadingStates.has(elementId)
    const cachedContent = contentCache.get(elementId)
    
    if (isLoading) {
      return (
        <div className="max-w-md p-4 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <Spinner size={16} className="animate-spin text-blue-500" style={{ animationDuration: '2s' }} />
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
              <ExclamationMark size={16} className="text-amber-600 flex-shrink-0" />
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
    if (hasSufficientContentForSummary(elementId)) {
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

  /**
   * Handle tooltip show event to trigger summary generation.
   * Starts async summary generation when tooltip becomes visible.
   * 
   * @param elementId - The element ID to generate summary for
   */
  const handleTooltipShow = (elementId: string) => {
    if (!contentCache.has(elementId) && !loadingStates.has(elementId)) {
      // Only start summary generation if there's sufficient content
      if (hasSufficientContentForSummary(elementId)) {
        // Add to loading states
        setLoadingStates(prev => new Set(prev).add(elementId))
        
        // Start async LLM summary generation
        generateHeadingSummary(elementId).finally(() => {
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

  const handleGenerateHeadings = async () => {
    setIsLoadingHeadings(true)
    setHeadingsError(null)
    
    try {
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
        // setCurrentHeadingMutation(mutation)
        setShowHeadings(true)
        
        // Clear AI-generated collapsed state when new headings are generated
        setCollapsedStates(prev => ({
          ...prev,
          'ai-generated': new Set<string>()
        }))
      } else {
        throw new Error(result.error || 'Failed to apply mutation')
      }
    } catch (error) {
      console.error('Error generating headings:', error)
      setHeadingsError(error instanceof Error ? error.message : 'Failed to generate headings')
      setShowHeadings(true)  // Show the error state instead of keeping the button
    } finally {
      setIsLoadingHeadings(false)
    }
  }

  const renderOriginalTab = () => {
    return (
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
          collapsedIds={collapsedStates.original}
          onToggleExpanded={(headingId) => toggleExpanded('original', headingId)}
          granularityLevel={granularityLevels.original}
          onGranularityChange={(level) => {
            setGranularityLevels(prev => ({ ...prev, 'original': level }))
            autoExpandCollapseToGranularity('original', level)
          }}
          headingVisibility={headingVisibility}
        />
    )
  }

  const renderAiGeneratedTab = () => {
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

    return isLoadingHeadings ? (
      <div className="p-4">
        <Loading text="Generating headings..." spinnerSize={20} />
      </div>
    ) : headingsError ? (
      <div className="p-4">
        <AlertWithIcon 
          variant="warning"
          title="Failed to generate headings"
          description={headingsError}
        />
      </div>
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
            collapsedIds={collapsedStates['ai-generated']}
            onToggleExpanded={(headingId) => toggleExpanded('ai-generated', headingId)}
            granularityLevel={granularityLevels['ai-generated']}
            onGranularityChange={(level) => {
            setGranularityLevels(prev => ({ ...prev, 'ai-generated': level }))
            autoExpandCollapseToGranularity('ai-generated', level)
          }}
            headingVisibility={headingVisibility}
          />
    ) : (
      <div className="p-4">
        <p className="text-gray-500">No headings generated</p>
      </div>
    )
  }

  const renderSummaryTab = () => {
    return (
      <MultiSummaryPane 
        content={markdownContent} 
        documentId={documentId}
        autoActivate 
      />
    )
  }

  const tabs: Tab[] = [
    {
      id: 'original',
      label: 'Original',
      content: renderOriginalTab(),
      managedScroll: true,  // HeadingTree manages its own scrolling
      onActivate: () => {
        // Tab container handles activation state
      }
    },
    {
      id: 'ai-generated', 
      label: 'AI-generated',
      content: renderAiGeneratedTab(),
      managedScroll: true,  // HeadingTree manages its own scrolling
      onActivate: () => {
        // Auto-click "Generate new headings" button when tab is activated
        if (!showHeadings && !isLoadingHeadings) {
          handleGenerateHeadings()
        }
      }
    },
    {
      id: 'summary',
      label: 'Summary', 
      content: renderSummaryTab(),
      managedScroll: false,  // Summary tab uses default scrolling
      onActivate: () => {
        // MultiSummaryPane handles auto-activation with autoActivate prop
      }
    }
  ]

  return (
    <div data-testid="table-of-contents">
      <TabContainer 
        ref={tabContainerRef}
        tabs={tabs}
        defaultTab="original"
        title="Table of Contents"
        orientation="vertical"
        className="text-sm h-full"
      />
    </div>
  )
}