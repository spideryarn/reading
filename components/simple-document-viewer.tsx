'use client'

// Simplified document viewer for the 2-pane layout
// Only handles document structure rendering, no tools pane
// Part of the ResizablePanelGroup architecture

import { useRef, useEffect } from 'react'
import type { DocumentElement } from '@/lib/types/document'
import { MarkdownRenderer } from './markdown-renderer'
import { useElementVisibility } from '@/lib/hooks/useElementVisibility'
import { DocumentParser } from '@/lib/services/document-parser'
import { sanitizeAcademicContent } from '@/lib/utils/html-sanitizer'

interface SimpleDocumentViewerProps {
  elements: DocumentElement[]
  selectedElement?: DocumentElement | null
  onElementSelect?: (element: DocumentElement | null) => void
  onElementVisibilityChange?: (elementId: string, isVisible: boolean) => void
  onElementClick?: (element: DocumentElement) => void
}

export function SimpleDocumentViewer({
  elements,
  selectedElement,
  onElementSelect,
  onElementVisibilityChange,
  onElementClick
}: SimpleDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
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
    let textStyles = 'text-gray-700'
    if (isHeading) {
      const level = parseInt(element.tag_name.substring(1))
      const headingSizes = {
        1: 'text-3xl font-bold text-gray-900',
        2: 'text-2xl font-semibold text-gray-800',
        3: 'text-xl font-semibold text-gray-800',
        4: 'text-lg font-medium text-gray-700',
        5: 'text-base font-medium text-gray-700',
        6: 'text-sm font-medium text-gray-600'
      }
      textStyles = headingSizes[level as keyof typeof headingSizes] || textStyles
    } else if (isListItem) {
      textStyles = 'text-gray-700'
    } else if (isBlockquote) {
      textStyles = 'text-gray-600 italic'
    }
    
    // Layout styles
    let layoutStyles = ''
    if (isHeading) {
      layoutStyles = 'mb-4 mt-6'
    } else if (isParagraph) {
      layoutStyles = 'mb-4'
    } else if (isList) {
      layoutStyles = 'mb-4 ml-4'
    } else if (isBlockquote) {
      layoutStyles = 'mb-4 pl-4 border-l-4 border-gray-300'
    }
    
    // Highlight target element with animation
    const highlightClass = element.attributes?.['data-highlight-target'] === 'true'
      ? 'animate-highlight'
      : ''
    
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
          ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500 -ml-4 pl-4' : ''}
          ${element.attributes?.['data-ai-generated'] === 'true' ? 'bg-green-50 border-l-4 border-green-500 -ml-4 pl-4' : ''}
          transition-colors duration-200
          ${onElementSelect ? 'cursor-pointer hover:bg-gray-50' : ''}
        `}
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
      >
        <div className="flex items-start justify-between gap-4">
          {element.content && (
            <div className={textStyles}>
              {/* Render content based on type */}
              {element.attributes?.['data-markdown'] === 'true' ? (
                <MarkdownRenderer content={element.content} />
              ) : isListItem ? (
                <span className="flex items-start">
                  <span className="mr-2">{element.parent_id && elements.find(e => e.id === element.parent_id)?.tag_name === 'ol' ? `${depth + 1}.` : '•'}</span>
                  <span dangerouslySetInnerHTML={{ __html: sanitizeAcademicContent(element.content) }} />
                </span>
              ) : element.tag_name === 'text' || DocumentParser.INLINE_ELEMENTS.has(element.tag_name) ? (
                // For text nodes and inline elements, render as plain text
                element.content
              ) : (
                // For block elements, sanitize HTML content to prevent XSS
                <div dangerouslySetInnerHTML={{ __html: sanitizeAcademicContent(element.content) }} />
              )}
            </div>
          )}
          {/* Display element ID suffix */}
          {element.id && (
            <span 
              className="text-xs font-mono text-gray-400 flex-shrink-0 ml-2"
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
      <div id="document-viewer" className="max-w-4xl mx-auto p-8">
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
      `}</style>
    </div>
  )
}