'use client'

// Resizable document layout using shadcn/ui ResizablePanelGroup
// Implements the 2-pane architecture with unified left pane and document viewer
// Replaces the problematic 3-pane grid layout

import { useState, useCallback } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { UnifiedLeftPane } from './unified-left-pane'
import { SimpleDocumentViewer } from './simple-document-viewer'
import type { DocumentElement } from '@/lib/types/document'

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

interface ResizableDocumentLayoutProps {
  // Document data
  html: string
  elements: DocumentElement[]
  documentId: string
  markdownContent: string
  
  // Selection state
  selectedElement?: DocumentElement | null
  onElementSelect?: (element: DocumentElement | null) => void
  
  // Glossary state
  glossaryEntities: Entity[]
  isLoadingGlossary: boolean
  showGlossary: boolean
  glossaryError: string | null
  onLoadGlossary: () => void
  
  // Visibility tracking
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
  onElementVisibilityChange?: (elementId: string, isVisible: boolean) => void
  onElementClick?: (element: DocumentElement) => void
}

export function ResizableDocumentLayout({
  html,
  elements,
  documentId,
  markdownContent,
  selectedElement,
  onElementSelect,
  glossaryEntities,
  isLoadingGlossary,
  showGlossary,
  glossaryError,
  onLoadGlossary,
  headingVisibility,
  onElementVisibilityChange,
  onElementClick
}: ResizableDocumentLayoutProps) {
  const [, setScrollTarget] = useState<{ id: string; timestamp: number } | null>(null)
  
  // Handle heading clicks from ToC
  const handleHeadingClick = useCallback((headingText: string, headingId?: string) => {
    if (!headingId) return
    
    // Find the element in the document
    const element = document.getElementById(headingId)
    if (element) {
      // Add highlight effect
      element.setAttribute('data-highlight-target', 'true')
      
      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Remove highlight after animation
      setTimeout(() => {
        element.removeAttribute('data-highlight-target')
      }, 2000)
    }
  }, [])
  
  // Handle glossary entity clicks
  const handleScrollToEntity = useCallback((elementId: string) => {
    // Set scroll target to trigger effect in document viewer
    setScrollTarget({ id: elementId, timestamp: Date.now() })
    
    // Find and highlight the element
    const element = document.getElementById(elementId)
    if (element) {
      element.setAttribute('data-highlight-target', 'true')
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      setTimeout(() => {
        element.removeAttribute('data-highlight-target')
      }, 2000)
    }
    
    // Also select the element if callback provided
    if (onElementSelect) {
      const targetElement = elements.find(el => el.id === elementId)
      if (targetElement) {
        onElementSelect(targetElement)
      }
    }
  }, [elements, onElementSelect])
  
  // Extract document context for chat
  const documentContext = elements
    .filter(el => el.content?.trim())
    .map(el => el.content.trim())
    .join('\n\n')
    .substring(0, 10000) // Limit context size
  
  return (
    <ResizablePanelGroup 
      direction="horizontal" 
      className="h-full w-full"
    >
      {/* Left pane - Unified navigation and tools */}
      <ResizablePanel 
        defaultSize={30} 
        minSize={20} 
        maxSize={50}
        className="h-full"
      >
        <UnifiedLeftPane
          content={html}
          elements={elements}
          documentId={documentId}
          markdownContent={markdownContent}
          headingVisibility={headingVisibility}
          glossaryEntities={glossaryEntities}
          isLoadingGlossary={isLoadingGlossary}
          showGlossary={showGlossary}
          glossaryError={glossaryError}
          onHeadingClick={handleHeadingClick}
          onLoadGlossary={onLoadGlossary}
          onScrollToEntity={handleScrollToEntity}
          documentContext={documentContext}
        />
      </ResizablePanel>
      
      {/* Resize handle */}
      <ResizableHandle className="w-1 bg-gray-200 hover:bg-gray-300 transition-colors" />
      
      {/* Right pane - Document viewer */}
      <ResizablePanel 
        defaultSize={70}
        className="h-full"
      >
        <SimpleDocumentViewer
          elements={elements}
          selectedElement={selectedElement}
          onElementSelect={onElementSelect}
          onElementVisibilityChange={onElementVisibilityChange}
          onElementClick={onElementClick}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}