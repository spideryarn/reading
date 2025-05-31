'use client'

// Resizable document layout using shadcn/ui ResizablePanelGroup
// Implements the 2-pane architecture with unified left pane and document viewer
// Replaces the problematic 3-pane grid layout

import { useState, useCallback, useEffect } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { UnifiedLeftPane } from './unified-left-pane'
import { SimpleDocumentViewer } from './simple-document-viewer'
import { Button } from '@/components/ui/button'
import { SidebarSimple } from '@phosphor-icons/react'
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
  const [isLeftPaneCollapsed, setIsLeftPaneCollapsed] = useState(false)
  
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
  
  // Handle left pane collapse toggle
  const handleToggleCollapse = useCallback(() => {
    setIsLeftPaneCollapsed(prev => !prev)
  }, [])
  
  // Keyboard shortcut handler for Ctrl+B
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault()
        handleToggleCollapse()
      }
    }
    
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [handleToggleCollapse])
  
  // Extract document context for chat
  const documentContext = elements
    .filter(el => el.content?.trim())
    .map(el => el.content.trim())
    .join('\n\n')
    .substring(0, 10000) // Limit context size
  
  return (
    <div className="relative h-full w-full">
      <ResizablePanelGroup 
        direction="horizontal" 
        className="h-full w-full"
      >
        {/* Left pane - Unified navigation and tools */}
        <ResizablePanel 
          defaultSize={30} 
          minSize={isLeftPaneCollapsed ? 0 : 20} 
          maxSize={isLeftPaneCollapsed ? 0 : 50}
          className="h-full"
          style={{ 
            overflow: 'hidden',
            width: isLeftPaneCollapsed ? '0px' : undefined 
          }}
        >
          {!isLeftPaneCollapsed && (
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
              onToggleCollapse={handleToggleCollapse}
            />
          )}
        </ResizablePanel>
        
        {/* Resize handle - always present but hidden when collapsed */}
        <ResizableHandle 
          withHandle={!isLeftPaneCollapsed}
          className={`w-1 transition-colors ${
            isLeftPaneCollapsed 
              ? 'w-0 opacity-0' 
              : 'bg-gray-200 hover:bg-gray-300 active:bg-blue-300'
          }`}
          style={{ display: isLeftPaneCollapsed ? 'none' : undefined }}
        />
        
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
      
      {/* Floating expand button when collapsed */}
      {isLeftPaneCollapsed && (
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleCollapse}
            className="h-8 w-8 p-0 shadow-lg border border-gray-300"
            title="Toggle sidebar (Ctrl+B)"
          >
            <SidebarSimple size={16} weight="bold" />
          </Button>
        </div>
      )}
    </div>
  )
}