'use client'

// Table of Contents component that extracts headings and provides navigation
// See docs/TABLE_OF_CONTENTS_PANE.md for architecture and usage patterns
// See docs/AI_SUMMARISE.md for tooltip summarisation feature details
// See docs/MUTATIONS.md for document mutation system

import { useEffect, useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Spinner, ExclamationMark, CircleNotch, Warning } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import type { GranularityKey } from '@/lib/prompts/templates/summarise'
import { useMutation, useActiveMutationType } from '@/lib/context/mutation-context'
import { generateHeadingMutation, extractHeadingsFromMutation } from '@/lib/services/heading-mutation-generator'
import { TabContainer, type Tab } from './tab-container'

interface Heading {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  content: string
  elements?: DocumentElement[]
  onHeadingClick?: (headingText: string, headingId?: string) => void
  documentId: string
  markdownContent: string
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

export function TableOfContents({ content, elements, onHeadingClick, documentId, markdownContent }: TableOfContentsProps) {
  const { applyMutation, revertMutation, mutationState, document: mutatedDocument } = useMutation()
  const activeMutationType = useActiveMutationType()
  const [headings, setHeadings] = useState<Heading[]>([])
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())
  const [aiHeadings, setAiHeadings] = useState<Heading[]>([])
  const [isLoadingHeadings, setIsLoadingHeadings] = useState(false)
  const [headingsError, setHeadingsError] = useState<string | null>(null)
  const [showHeadings, setShowHeadings] = useState(false)
  const [currentHeadingMutation, setCurrentHeadingMutation] = useState<any>(null)
  
  // Summary state
  const [summary, setSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string>('')
  const [showSummaryButton, setShowSummaryButton] = useState(true)
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false)

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
            extractedHeadings.push({ id, text, level })
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
            level: parseInt(el.tag_name.substring(1))
          }))
          .filter(h => h.text.length > 0)
        
        setHeadings(extractedHeadings)
      }
    }

    if (content || elements || mutatedDocument) {
      extractHeadings()
    }
  }, [content, elements, mutatedDocument, activeMutationType])

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

  const getIndentClass = (level: number) => {
    const indents = {
      1: 'pl-0',
      2: 'pl-4',
      3: 'pl-8',
      4: 'pl-12',
      5: 'pl-16',
      6: 'pl-20'
    }
    return indents[level as keyof typeof indents] || 'pl-0'
  }

  // Tooltip granularity setting - TypeScript will enforce this is a valid option
  const TOOLTIP_GRANULARITY: GranularityKey = 'single short paragraph'
  
  /**
   * Generate LLM summary for a heading's hierarchical content.
   * Extracts all content belonging to the specified heading section and sends it to the LLM for summarisation.
   * 
   * @param headingText - The text content of the heading to summarise
   * @returns Promise resolving to the generated summary or error message
   */
  const generateHeadingSummary = async (headingText: string): Promise<string> => {
    // Check cache first
    const cacheKey = headingText
    if (contentCache.has(cacheKey)) {
      return contentCache.get(cacheKey)!
    }

    if (!elements || elements.length === 0) {
      return "No content available"
    }

    // Find the heading element that matches this text
    const headingElement = elements.find(element => 
      element.tag_name.match(/^h[1-6]$/i) && 
      element.content?.trim() === headingText.trim()
    )

    if (!headingElement) {
      return "Heading not found in elements"
    }

    const headingLevel = parseInt(headingElement.tag_name.substring(1))
    const headingPosition = headingElement.position

    // Find all elements that belong to this heading's section
    const sectionElements: DocumentElement[] = []
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      
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
      
      // Cache the result
      setContentCache(prev => new Map(prev).set(cacheKey, summary))
      
      return summary
    } catch (error) {
      console.error('Error generating summary:', error)
      
      // Return error message instead of fallback content
      const errorMessage = "⚠️ Unable to generate summary. Please try again later."
      
      // Cache the error message to avoid repeated failed attempts
      setContentCache(prev => new Map(prev).set(cacheKey, errorMessage))
      
      return errorMessage
    }
  }

  /**
   * Get tooltip content with loading state management.
   * Returns appropriate JSX based on current loading state and cached content.
   * 
   * @param headingText - The heading text to get content for
   * @returns JSX element containing loading spinner, cached content, or placeholder
   */
  const getTooltipContent = (headingText: string): JSX.Element => {
    const isLoading = loadingStates.has(headingText)
    const cachedContent = contentCache.get(headingText)
    
    if (isLoading) {
      return (
        <div className="max-w-md p-3 text-sm bg-gray-50 border border-gray-300 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <Spinner size={16} className="animate-spin text-blue-500" style={{ animationDuration: '2s' }} />
            <span className="text-gray-700">Summarising contents of this heading...</span>
          </div>
        </div>
      )
    }
    
    if (cachedContent) {
      // Check if this is an error message
      const isError = cachedContent.startsWith('⚠️')
      
      if (isError) {
        return (
          <div className="max-w-md p-3 text-sm bg-gray-50 border border-gray-300 rounded-lg shadow-sm">
            <div className="flex items-center space-x-2">
              <ExclamationMark size={16} className="text-amber-500 flex-shrink-0" />
              <span className="text-gray-700">{cachedContent.replace('⚠️ ', '')}</span>
            </div>
          </div>
        )
      }
      
      return (
        <div className="max-w-md p-3 text-sm bg-gray-50 border border-gray-300 rounded-lg shadow-sm">
          <div className="prose prose-sm prose-gray max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
              {cachedContent}
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="max-w-md p-3 text-sm text-gray-500 bg-gray-50 border border-gray-300 rounded-lg shadow-sm">
        Hover to load content...
      </div>
    )
  }

  /**
   * Handle tooltip show event to trigger summary generation.
   * Starts async summary generation when tooltip becomes visible.
   * 
   * @param headingText - The heading text to generate summary for
   */
  const handleTooltipShow = (headingText: string) => {
    if (!contentCache.has(headingText) && !loadingStates.has(headingText)) {
      // Add to loading states
      setLoadingStates(prev => new Set(prev).add(headingText))
      
      // Start async LLM summary generation
      generateHeadingSummary(headingText).finally(() => {
        // Remove from loading states
        setLoadingStates(prev => {
          const newSet = new Set(prev)
          newSet.delete(headingText)
          return newSet
        })
      })
    }
  }

  const generateSummary = async () => {
    try {
      setSummaryLoading(true)
      setSummaryError('')
      setShowSummaryButton(false)
      
      const response = await fetch('/api/summarise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: markdownContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (err) {
      setSummaryError('Failed to generate summary')
      setShowSummaryButton(true)
      console.error('Summary generation error:', err)
    } finally {
      setSummaryLoading(false)
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
          html_content: htmlWithIds
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
        const generatedHeadings = extractHeadingsFromMutation(mutation)
        setAiHeadings(generatedHeadings)
        setCurrentHeadingMutation(mutation)
        setShowHeadings(true)
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
    if (headings.length === 0) {
      return (
        <div className="p-4 text-sm text-gray-500">
          No headings found in document
        </div>
      )
    }

    return (
      <nav className="space-y-1">
        {headings.map((heading) => (
          <Tooltip.Provider key={heading.id} delayDuration={500}>
            <Tooltip.Root onOpenChange={(open) => {
              if (open) handleTooltipShow(heading.text)
            }}>
              <Tooltip.Trigger asChild>
                <div
                  className={`${getIndentClass(heading.level)} cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors group`}
                  onClick={() => handleHeadingClick(heading)}
                >
                  <span className="text-xs text-gray-400 mr-2 group-hover:text-blue-600">
                    H{heading.level}
                  </span>
                  <span className="text-sm text-gray-700 group-hover:text-blue-900">
                    {heading.text}
                  </span>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  align="start"
                  sideOffset={4}
                  className="z-50 max-w-md"
                >
                  {getTooltipContent(heading.text)}
                  <Tooltip.Arrow 
                    className="fill-gray-300" 
                    width={12} 
                    height={6}
                  />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        ))}
      </nav>
    )
  }

  const renderAiGeneratedTab = () => {
    if (!showHeadings) {
      return (
        <div className="p-4">
          <button
            onClick={handleGenerateHeadings}
            disabled={isLoadingHeadings}
            className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoadingHeadings ? (
              <>
                <CircleNotch className="animate-spin" size={16} />
                Loading...
              </>
            ) : (
              'Generate new headings'
            )}
          </button>
        </div>
      )
    }

    return (
      <div className="p-4">
        {isLoadingHeadings ? (
          <div className="flex items-center gap-2 text-gray-500">
            <CircleNotch className="animate-spin" size={20} />
            <span>Generating headings...</span>
          </div>
        ) : headingsError ? (
          <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
            <Warning className="text-red-600 mt-0.5" size={20} weight="bold" />
            <div className="text-sm text-red-800">
              <div className="font-medium mb-1">Failed to generate headings</div>
              <div className="text-xs">{headingsError}</div>
            </div>
          </div>
        ) : aiHeadings.length > 0 ? (
          <nav className="space-y-1">
            {aiHeadings.map((heading) => (
              <div
                key={heading.id}
                className={`${getIndentClass(heading.level)} cursor-pointer hover:bg-green-50 rounded px-2 py-1 transition-colors group`}
                onClick={() => handleHeadingClick(heading)}
              >
                <span className="text-xs text-gray-400 mr-2 group-hover:text-green-600">
                  H{heading.level}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-green-900">
                  {heading.text}
                </span>
              </div>
            ))}
          </nav>
        ) : (
          <p className="text-gray-500">No headings generated</p>
        )}
      </div>
    )
  }

  const renderSummaryTab = () => {
    if (showSummaryButton) {
      return (
        <div className="p-4">
          <button
            onClick={generateSummary}
            className="w-full px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
          >
            Show summary
          </button>
        </div>
      )
    }

    if (summaryLoading) {
      return (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="text-sm text-orange-600">Generating summary...</div>
        </div>
      )
    }

    if (summaryError) {
      return (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="text-sm text-red-600">{summaryError}</div>
          <button
            onClick={() => {
              setSummaryError('')
              setShowSummaryButton(true)
            }}
            className="mt-2 px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }

    if (summary) {
      return (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-orange-800">Summary</h3>
            <button
              onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
              className="text-orange-600 hover:text-orange-800 transition-colors"
              aria-label={isSummaryCollapsed ? "Expand summary" : "Collapse summary"}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isSummaryCollapsed ? '' : 'rotate-180'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {!isSummaryCollapsed && (
            <p className="text-sm text-orange-700 leading-relaxed">{summary}</p>
          )}
        </div>
      )
    }

    return null
  }

  const tabs: Tab[] = [
    {
      id: 'original',
      label: 'Original',
      content: renderOriginalTab()
    },
    {
      id: 'ai-generated', 
      label: 'AI-generated',
      content: renderAiGeneratedTab()
    },
    {
      id: 'summary',
      label: 'Summary', 
      content: renderSummaryTab()
    }
  ]

  return (
    <div className="p-4">
      <TabContainer 
        tabs={tabs}
        defaultTab="original"
        title="Table of Contents"
        className="text-sm"
      />
    </div>
  )
}