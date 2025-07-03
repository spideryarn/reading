'use client'

// Simplified document viewer for the 2-pane layout
// Only handles document structure rendering, no tools pane
// Part of the ResizablePanelGroup architecture
// Supports semantic highlighting display - see docs/reference/TOOL_HIGHLIGHT.md for highlighting system details

import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import type { DocumentElement } from '@/lib/types/document'
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useElementVisibility } from '@/lib/hooks/useElementVisibility'
import { DocumentParser } from '@/lib/services/document-parser'
import { getSemanticHighlightStyles } from '@/lib/utils/semantic-highlighting'
import Mark from 'mark.js'
import { useNavigateToTab } from '@/lib/tools/hooks/use-tool-url-state'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'
import type { Entity } from '@/lib/types/entity'
import { markdownToHtml } from '@/lib/utils/markdown-processor'

// Semantic highlight interface
interface SemanticHighlight {
  elementId: string
  confidence: number
}

interface SimpleDocumentViewerProps {
  elements: DocumentElement[]
  selectedElement?: DocumentElement | null
  onElementSelect?: (element: DocumentElement | null) => void
  onElementVisibilityChange?: (elementId: string, isVisible: boolean) => void
  onElementClick?: (element: DocumentElement) => void
  semanticHighlights?: SemanticHighlight[]
  activeElementId?: string | null
  // Glossary highlighting props
  glossaryEntities?: Entity[]
  leftAligned?: boolean
}

// Memoised helpers to keep innerHTML stable across re-renders
const MemoisedMarkdownRenderer = React.memo(function MemoisedMarkdownRenderer({ content }: { content: string | null }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content ?? ''}</ReactMarkdown>
})

const MemoisedHtml = React.memo(function MemoisedHtml({ html }: { html: string }) {
  const htmlObject = useMemo(() => ({ __html: html }), [html])
  return <div dangerouslySetInnerHTML={htmlObject} />
})

const MemoisedInlineHtml = React.memo(function MemoisedInlineHtml({ html }: { html: string }) {
  const htmlObject = useMemo(() => ({ __html: html }), [html])
  return <span dangerouslySetInnerHTML={htmlObject} />
})

export function SimpleDocumentViewer({
  elements,
  selectedElement,
  onElementSelect,
  onElementVisibilityChange,
  onElementClick,
  semanticHighlights = [],
  activeElementId,
  glossaryEntities = [],
  leftAligned = false
}: SimpleDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // Glossary highlighting
  const glossaryMarkInstanceRef = useRef<Mark | null>(null)
  const navigateToTab = useNavigateToTab()
  const { actions: commActions } = useDocumentCommunication()
  
  // Element visibility tracking
  const { observeElement, unobserveElement } = useElementVisibility(onElementVisibilityChange)
  const observedElementsRef = useRef<Set<string>>(new Set())
  
  // Setup element observation when elements change
  useEffect(() => {
    elements.forEach(element => {
      const domElement = elementRefs.current.get(element.id)
      if (domElement && !observedElementsRef.current.has(element.id)) {
        observeElement(domElement)
        observedElementsRef.current.add(element.id)
      }
    })
    
    // Clean up observations for elements no longer in the list
    observedElementsRef.current.forEach(elementId => {
      if (!elements.find(el => el.id === elementId)) {
        const domElement = elementRefs.current.get(elementId)
        if (domElement) {
          unobserveElement(domElement)
        }
        observedElementsRef.current.delete(elementId)
        elementRefs.current.delete(elementId)
      }
    })
  }, [elements, observeElement, unobserveElement])
  
  // Initialize glossary Mark.js instance
  useEffect(() => {
    const container = document.getElementById('document-viewer')
    if (container) {
      glossaryMarkInstanceRef.current = new Mark(container)
    }
    
    return () => {
      // Clean up glossary highlights on unmount
      if (glossaryMarkInstanceRef.current) {
        glossaryMarkInstanceRef.current.unmark({ className: 'highlight-glossary' })
      }
    }
  }, [])
  
  // Handle glossary click events
  const handleGlossaryClick = useCallback((entityName: string) => {
    // Navigate to the Glossary tab via URL (single-source-of-truth)
    navigateToTab('glossary')
    // Notify the unified left pane which term should be brought into view
    commActions.highlightTerm(entityName)
  }, [navigateToTab, commActions])
  
  // Apply glossary highlights when entities change (but not on every re-render)
  useEffect(() => {
    if (!glossaryMarkInstanceRef.current || !glossaryEntities.length) {
      return
    }
    
    // Extract all entity terms (names + aliases) and build a map for metadata lookup
    const allTerms: string[] = []
    const termToEntityMap = new Map<string, Entity>()

    glossaryEntities.forEach(entity => {
      ;[entity.name, ...entity.aliases].forEach(term => {
        const cleaned = term.trim()
        if (cleaned) {
          allTerms.push(cleaned)
          // Store metadata for quick lookup when a match is found
          termToEntityMap.set(cleaned.toLowerCase(), entity)
        }
      })
    })

    if (allTerms.length === 0) return

    // Clear previous glossary highlights before marking new ones
    glossaryMarkInstanceRef.current.unmark({ className: 'highlight-glossary' })

    // Sort longest-first so that multi-word phrases get marked before their substrings
    allTerms.sort((a, b) => b.length - a.length)

    // Helper to escape special RegExp characters
    // const _escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Expose for quick console inspection in dev
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.__SYR_DEBUG = window.__SYR_DEBUG || {}
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.__SYR_DEBUG.longestTerms = [...allTerms]
    }

    // Slight delay ensures the document has finished rendering before we start marking
    setTimeout(() => {
      const mark = glossaryMarkInstanceRef.current
      if (!mark) return

      // Highlight each term in sequence. Doing them one-by-one (longest first) plus
      // `exclude: ['mark']` ensures that once a longer phrase is marked, the shorter
      // substring inside it will be skipped automatically.
      for (const term of allTerms) {
        mark.mark(term, {
          accuracy: 'exactly',           // Whole phrase only
          separateWordSearch: false,     // Keep multi-word phrases together
          acrossElements: true,          // Support tags inside the phrase
          caseSensitive: false,
          exclude: ['mark'],             // Don't re-mark inside existing marks
          className: 'highlight-glossary',
          each: element => {
            const matchedText = element.textContent || ''
            const entity = termToEntityMap.get(matchedText.toLowerCase())
            if (!entity) return

            element.setAttribute('data-glossary-entity', entity.name)
            element.setAttribute('data-glossary-matched-text', matchedText)
            element.setAttribute('data-glossary-explanation', entity.brief_explanation)
            element.setAttribute('data-glossary-long-explanation', entity.long_explanation || '')

            if (element instanceof HTMLElement) {
              element.style.cursor = 'pointer'
              element.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                handleGlossaryClick(entity.name)
              })
            }
          }
        })
      }
    }, 10)
  }, [glossaryEntities, handleGlossaryClick])
  
  // Add event listeners for custom tooltip handling on glossary highlights
  useEffect(() => {
    const container = document.getElementById('document-viewer')
    if (!container) return
    
    const handleMouseEnter = (event: Event) => {
      const target = event.target as HTMLElement
      if (target.classList.contains('highlight-glossary')) {
        const explanation = target.getAttribute('data-glossary-explanation')
        const longExplanation = target.getAttribute('data-glossary-long-explanation')
        const entityName = target.getAttribute('data-glossary-entity')
        const matchedText = target.getAttribute('data-glossary-matched-text')
        
        if (explanation || longExplanation) {
          // Determine if we should prepend the primary name
          const isAlias = entityName && matchedText && 
                         entityName.toLowerCase() !== matchedText.toLowerCase()
          
          // Create tooltip element
          const tooltip = document.createElement('div')
          tooltip.className = 'glossary-tooltip fixed z-50 max-w-md text-left bg-white border border-gray-200 rounded-lg shadow-lg p-4'
          
          // Build tooltip content with Markdown rendering
          let tooltipContent = markdownToHtml(longExplanation || explanation || '')
          if (isAlias && entityName) {
            tooltipContent = `<strong>${entityName}:</strong> ${tooltipContent}`
          }
          
          tooltip.innerHTML = `
            <div class="text-xs text-gray-700 leading-relaxed">
              ${tooltipContent}
            </div>
          `
          
          // Position tooltip
          const rect = target.getBoundingClientRect()
          tooltip.style.left = `${rect.right + 8}px`
          tooltip.style.top = `${rect.top}px`
          
          // Add to DOM
          document.body.appendChild(tooltip)
          target.setAttribute('data-tooltip-id', 'glossary-tooltip')
        }
      }
    }
    
    const handleMouseLeave = (event: Event) => {
      const target = event.target as HTMLElement
      if (target.classList.contains('highlight-glossary')) {
        const existingTooltip = document.querySelector('.glossary-tooltip')
        if (existingTooltip) {
          existingTooltip.remove()
        }
        target.removeAttribute('data-tooltip-id')
      }
    }
    
    container.addEventListener('mouseenter', handleMouseEnter, true)
    container.addEventListener('mouseleave', handleMouseLeave, true)
    
    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter, true)
      container.removeEventListener('mouseleave', handleMouseLeave, true)
      // Clean up any remaining tooltips
      const existingTooltips = document.querySelectorAll('.glossary-tooltip')
      existingTooltips.forEach(tooltip => tooltip.remove())
    }
  }, [glossaryEntities])
  
  // Render an individual element based on its type
  const renderElement = (element: DocumentElement, depth: number = 0) => {
    const indentClass = depth > 0 ? `pl-${Math.min(depth * 4, 12)}` : ''
    
    // Handle self-closing tags
    if (['br', 'hr', 'img', 'input', 'meta', 'link'].includes(element.tag_name)) {
      return null
    }
    
    const isSelected = selectedElement?.id === element.id
    const isHeading = element.tag_name.match(/^h[1-6]$/i)
    const isListItem = element.tag_name === 'li'
    const isList = ['ul', 'ol'].includes(element.tag_name)
    const isParagraph = element.tag_name === 'p'
    const isBlockquote = element.tag_name === 'blockquote'
    
    // Typography styles based on element type
    let textStyles = 'text-sm sm:text-base text-gray-700'
    if (isHeading) {
      const level = parseInt(element.tag_name.substring(1))
      const headingSizes = {
        1: 'text-2xl sm:text-3xl font-bold text-gray-900',
        2: 'text-xl sm:text-2xl font-semibold text-gray-800',
        3: 'text-lg sm:text-xl font-semibold text-gray-800',
        4: 'text-base sm:text-lg font-medium text-gray-700',
        5: 'text-sm sm:text-base font-medium text-gray-700',
        6: 'text-xs sm:text-sm font-medium text-gray-600'
      }
      textStyles = headingSizes[level as keyof typeof headingSizes] || textStyles
    } else if (isListItem) {
      textStyles = 'text-sm sm:text-base text-gray-700'
    } else if (isBlockquote) {
      textStyles = 'text-sm sm:text-base text-gray-600 italic'
    }
    
    // Layout styles
    let layoutStyles = ''
    if (isHeading) {
      layoutStyles = 'mb-2 sm:mb-4 mt-3 sm:mt-6'
    } else if (isParagraph) {
      layoutStyles = 'mb-2 sm:mb-4'
    } else if (isList) {
      layoutStyles = 'mb-2 sm:mb-4 ml-2 sm:ml-4'
    } else if (isBlockquote) {
      layoutStyles = 'mb-2 sm:mb-4 pl-2 sm:pl-4 border-l-2 sm:border-l-4 border-gray-300'
    }
    
    // Highlight target element with animation
    const highlightClass = element.attributes?.['data-highlight-target'] === 'true'
      ? 'animate-highlight'
      : ''
    
    // Semantic highlight styles based on confidence score
    const semanticHighlight = semanticHighlights.find(h => h.elementId === element.id)
    const semanticHighlightStyles = semanticHighlight 
      ? getSemanticHighlightStyles(semanticHighlight.confidence * 100)
      : {}
    
    // Active highlight class for pulse animation (React-based, no DOM manipulation)
    const activeHighlightClass = activeElementId === element.id ? 'semantic-highlight-active' : ''
    
    return (
      <div
        key={element.id}
        ref={(el) => {
          if (el) elementRefs.current.set(element.id, el)
        }}
        id={element.id}
        className={`
          ${indentClass} 
          ${layoutStyles}
          ${highlightClass}
          ${activeHighlightClass}
          ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500 -ml-4 pl-4' : ''}
          ${element.attributes?.['data-ai-generated'] === 'true' ? 'bg-green-50 border-l-4 border-green-500 -ml-4 pl-4' : ''}
          transition-colors duration-200
          ${onElementSelect ? 'cursor-pointer hover:bg-gray-50' : ''}
        `}
        style={semanticHighlightStyles}
        onClick={(e) => {
          e.stopPropagation()
          if (onElementSelect) {
            onElementSelect(isSelected ? null : element)
          }
          if (onElementClick) {
            onElementClick(element)
          }
        }}
        data-element-id={element.id}
        data-element-tag={element.tag_name}
        {...(semanticHighlight && {
          'data-semantic-highlight': 'true',
          'data-semantic-confidence': semanticHighlight.confidence.toString()
        })}
      >
        <div className="flex items-start justify-between gap-4">
          {element.content && (
            <div className={textStyles}>
              {/* Render content based on type */}
              {element.attributes?.['data-markdown'] === 'true' ? (
                <MemoisedMarkdownRenderer content={element.content} />
              ) : isListItem ? (
                <span className="flex items-start">
                  <span className="mr-2">{element.parent_id && elements.find(e => e.id === element.parent_id)?.tag_name === 'ol' ? `${depth + 1}.` : '•'}</span>
                  <MemoisedInlineHtml html={element.content} />
                </span>
              ) : element.tag_name === 'text' || DocumentParser.INLINE_ELEMENTS.has(element.tag_name) ? (
                // For text nodes and inline elements, render as plain text
                element.content
              ) : (
                // For block elements, content is pre-sanitized at storage time but we memoise to preserve highlights
                <MemoisedHtml html={element.content} />
              )}
            </div>
          )}
          {/* Display element ID suffix */}
          {element.id && (
            <span 
              className="text-[10px] sm:text-[11px] md:text-[12px] font-mono text-gray-400 flex-shrink-0 ml-1"
              title={`${element.tag_name.toUpperCase()}: ${element.id}`}
            >
              {element.id.startsWith('syr-') ? element.id.slice(4, 8) : element.id.slice(0, 4)}
            </span>
          )}
        </div>
        
        {/* Render children */}
        {elements
          .filter(child => child.parent_id === element.id)
          .sort((a, b) => a.position - b.position)
          .map(child => renderElement(child, depth + 1))}
      </div>
    )
  }
  
  // Scroll to element when selection changes
  useEffect(() => {
    if (selectedElement && elementRefs.current.has(selectedElement.id)) {
      const element = elementRefs.current.get(selectedElement.id)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedElement])
  
  // Handle clicks outside elements to deselect
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onElementSelect) {
      onElementSelect(null)
    }
  }
  
  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto bg-white"
      onClick={handleContainerClick}
    >
      <div
        id="document-viewer"
        className={`max-w-[65ch] ${
          leftAligned
            ? 'ml-12 sm:ml-12 md:ml-12 mr-1 sm:mr-2 md:mr-auto lg:mx-auto'
            : 'mx-1 sm:mx-2 md:mx-2 lg:mx-auto'
        } p-2 sm:p-3 md:px-3 md:py-6 lg:px-8`}
      >
        {/* Render root elements */}
        {elements
          .filter(element => !element.parent_id)
          .sort((a, b) => a.position - b.position)
          .map(element => renderElement(element))}
      </div>
      
      {/* Highlight animation styles */}
      <style jsx>{`
        @keyframes highlight {
          0% { background-color: rgb(254 240 138); }
          100% { background-color: transparent; }
        }
        .animate-highlight {
          animation: highlight 2s ease-out;
        }
        
        :global(.highlight-glossary) {
          background-color: transparent; /* remove native <mark> highlight */
          color: inherit; /* preserve surrounding text colour */
          border-bottom: 1px dotted #DB8A45; /* faint orange dotted underline */
          cursor: help;
          transition: all 0.2s ease;
        }
        
        :global(.highlight-glossary)::after {
          content: "📖";
          font-size: 0.75em;
          vertical-align: super;
          margin-left: 2px;
        }
        
        :global(.highlight-glossary):hover {
          background-color: rgba(219, 138, 69, 0.1);
          border-radius: 2px;
          padding: 1px 2px;
        }
      `}</style>
    </div>
  )
}