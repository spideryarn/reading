'use client'

// Table of Contents component that extracts headings and provides navigation
// See docs/TABLE_OF_CONTENTS_PANE.md for architecture and usage patterns

import { useEffect, useState } from 'react'
import Tippy from '@tippyjs/react'
import TurndownService from 'turndown'
import type { DocumentElement } from '@/lib/types/document'

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

  // Extract hierarchical content for a heading with loading simulation
  const extractHierarchicalContent = async (headingText: string): Promise<string> => {
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

    // Simulate 1.5s loading delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Convert elements to HTML, then to markdown
    const htmlContent = sectionElements
      .map(element => {
        const truncatedContent = element.content.length > 50 
          ? element.content.substring(0, 50) + '...'
          : element.content
        return `<${element.tag_name}>${truncatedContent}</${element.tag_name}>`
      })
      .join('')

    const turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-'
    })
    
    const result = turndownService.turndown(htmlContent)
    
    // Cache the result
    setContentCache(prev => new Map(prev).set(cacheKey, result))
    
    return result
  }

  // Get tooltip content with loading state management
  const getTooltipContent = (headingText: string): JSX.Element => {
    const isLoading = loadingStates.has(headingText)
    const cachedContent = contentCache.get(headingText)
    
    if (isLoading) {
      return (
        <div className="max-w-md p-3 text-sm bg-gray-50 border border-gray-300 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      )
    }
    
    if (cachedContent) {
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

  // Handle tooltip show event to trigger content loading
  const handleTooltipShow = (headingText: string) => {
    if (!contentCache.has(headingText) && !loadingStates.has(headingText)) {
      // Add to loading states
      setLoadingStates(prev => new Set(prev).add(headingText))
      
      // Start async loading
      extractHierarchicalContent(headingText).finally(() => {
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

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Table of Contents</h2>
      <nav className="space-y-1">
        {headings.map((heading) => (
          <Tippy
            key={heading.id}
            content={getTooltipContent(heading.text)}
            placement="right-start"
            delay={[500, 200]}
            interactive={true}
            onShow={() => handleTooltipShow(heading.text)}
          >
            <div
              className={`${getIndentClass(heading.level)} cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors`}
              onClick={() => handleHeadingClick(heading)}
            >
              <span className="text-xs text-gray-400 mr-2">
                H{heading.level}
              </span>
              <span className="text-sm text-gray-700 hover:text-gray-900">
                {heading.text}
              </span>
            </div>
          </Tippy>
        ))}
      </nav>
    </div>
  )
}