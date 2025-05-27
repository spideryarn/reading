'use client'

// Table of Contents component that extracts headings and provides navigation
// See docs/TABLE_OF_CONTENTS_PANE.md for architecture and usage patterns
// See docs/AI_SUMMARISE.md for tooltip summarisation feature details

import { useEffect, useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import TurndownService from 'turndown'
import { Spinner, ExclamationMark, CircleNotch, Warning } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import type { GranularityKey } from '@/lib/prompts/templates/summarise'

interface Heading {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  content: string
  elements?: DocumentElement[]
  onHeadingClick?: (headingText: string) => void
}

export function TableOfContents({ content, elements, onHeadingClick }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set())
  const [contentCache, setContentCache] = useState<Map<string, string>>(new Map())
  const [activeTab, setActiveTab] = useState<'original' | 'ai-generated'>('original')
  const [aiHeadings, setAiHeadings] = useState<Heading[]>([])
  const [isLoadingHeadings, setIsLoadingHeadings] = useState(false)
  const [headingsError, setHeadingsError] = useState<string | null>(null)
  const [showHeadings, setShowHeadings] = useState(false)

  useEffect(() => {
    const extractHeadings = () => {
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
    }

    if (content) {
      extractHeadings()
    }
  }, [content])

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

  const handleHeadingClick = (heading: Heading) => {
    if (onHeadingClick) {
      onHeadingClick(heading.text)
    } else {
      // Fallback to DOM scrolling if no callback provided
      const element = document.getElementById(heading.id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const handleGenerateHeadings = async () => {
    setIsLoadingHeadings(true)
    setHeadingsError(null)
    
    try {
      const response = await fetch('/api/headings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html_content: content
        }),
      })

      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('Generate headings response:', data)
      
      // Convert API response to Heading format
      const generatedHeadings: Heading[] = data.headings.map((heading: any, index: number) => ({
        id: heading.id_of_after || `ai-heading-${index}`,
        text: heading.html.replace(/<\/?h[1-6][^>]*>/gi, ''), // Extract text from HTML
        level: parseInt(heading.html.match(/<h([1-6])/i)?.[1] || '1') // Extract level from HTML
      }))
      
      setAiHeadings(generatedHeadings)
      setShowHeadings(true)
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

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Table of Contents</h2>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('original')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'original'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setActiveTab('ai-generated')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ai-generated'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            AI-generated
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-32">
        {activeTab === 'original' ? renderOriginalTab() : renderAiGeneratedTab()}
      </div>
    </div>
  )
}