'use client'

// Resizable document layout using shadcn/ui ResizablePanelGroup
// Implements the 2-pane architecture with unified left pane and document viewer
// Replaces the problematic 3-pane grid layout
//
// Cross-pane communication: This component uses DocumentCommunicationContext
// to update document position state when users click elements. The old custom
// DOM event dispatching was removed in favour of React Context patterns.

import { useState, useCallback, useEffect, useRef } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ImperativePanelHandle } from 'react-resizable-panels'
import { UnifiedLeftPane } from './unified-left-pane'
import { SimpleDocumentViewer } from './simple-document-viewer'
import { VerticalIconNav } from './vertical-icon-nav'
import { CommandPalette } from './command-palette'
import type { DocumentElement } from '@/lib/types/document'
import { DocumentCommunicationProvider, useDocumentCommunication } from '@/lib/context/document-communication-context'

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
  glossaryCached: boolean
  onLoadGlossary: () => void
  onResetGlossary?: () => void
  
  // Visibility tracking
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
  onElementVisibilityChange?: (elementId: string, isVisible: boolean) => void
  onElementClick?: (element: DocumentElement) => void
}

// Inner component that uses the document communication context
function ResizableDocumentLayoutInner({
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
  glossaryCached,
  onLoadGlossary,
  onResetGlossary,
  headingVisibility,
  onElementVisibilityChange,
  onElementClick
}: ResizableDocumentLayoutProps) {
  const { actions, state } = useDocumentCommunication()
  const [, setScrollTarget] = useState<{ id: string; timestamp: number } | null>(null)
  const [isLeftPaneCollapsed, setIsLeftPaneCollapsed] = useState(false)
  const [savedLeftPaneSize, setSavedLeftPaneSize] = useState(30) // Remember the last size
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const leftPanelRef = useRef<ImperativePanelHandle>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
  
  // Handle element clicks from document viewer to scroll ToC
  const handleElementClick = useCallback((element: DocumentElement) => {
    // Call original callback if provided
    if (onElementClick) {
      onElementClick(element)
    }
    
    // Find corresponding heading in ToC and scroll to it
    // Look for the nearest parent heading element
    const findNearestHeading = (targetElement: DocumentElement): DocumentElement | null => {
      // First check if the clicked element itself is a heading
      if (targetElement.tag_name && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(targetElement.tag_name.toLowerCase())) {
        return targetElement
      }
      
      // Find the nearest heading by position (look backwards)
      const sortedElements = [...elements]
        .filter(el => el.tag_name && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tag_name.toLowerCase()))
        .sort((a, b) => a.position - b.position)
      
      let nearestHeading: DocumentElement | null = null
      for (const headingEl of sortedElements) {
        if (headingEl.position <= targetElement.position) {
          nearestHeading = headingEl
        } else {
          break
        }
      }
      
      return nearestHeading
    }
    
    const nearestHeading = findNearestHeading(element)
    if (nearestHeading && nearestHeading.id) {
      // Update document position in context
      actions.setCurrentPosition(nearestHeading.id)
    }
  }, [elements, onElementClick, actions])
  
  // Handle left pane collapse toggle with size persistence
  const handleToggleCollapse = useCallback(() => {
    if (isLeftPaneCollapsed) {
      // Expanding: restore the saved size first, then show content
      if (leftPanelRef.current) {
        leftPanelRef.current.resize(savedLeftPaneSize)
      }
      setTimeout(() => {
        setIsLeftPaneCollapsed(false)
      }, 50) // Small delay to let panel resize first
    } else {
      // Collapsing: hide content first, then collapse panel
      if (leftPanelRef.current) {
        const currentSize = leftPanelRef.current.getSize()
        setSavedLeftPaneSize(currentSize)
      }
      setIsLeftPaneCollapsed(true)
      // Delay panel collapse until after content animation (300ms + buffer)
      setTimeout(() => {
        if (leftPanelRef.current) {
          leftPanelRef.current.resize(0)
        }
      }, 350)
    }
  }, [isLeftPaneCollapsed, savedLeftPaneSize])

  // Handle command palette toggle
  const handleCommandPaletteToggle = useCallback(() => {
    setIsCommandPaletteOpen(prev => !prev)
  }, [])

  // Handle icon navigation tab clicks - expand left pane and switch to tab
  const handleIconNavTabClick = useCallback((tabId: string) => {
    // First expand the left pane if it's collapsed
    if (isLeftPaneCollapsed) {
      if (leftPanelRef.current) {
        leftPanelRef.current.resize(savedLeftPaneSize)
      }
      setTimeout(() => {
        setIsLeftPaneCollapsed(false)
      }, 50) // Small delay to let panel resize first
    }
    
    // Then switch to the selected tab using context action
    actions.setActiveTab(tabId)
  }, [isLeftPaneCollapsed, savedLeftPaneSize, actions])

  // Handle document scroll to detect current heading
  const handleDocumentScroll = useCallback(() => {
    // Clear any pending timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Debounce scroll events
    scrollTimeoutRef.current = setTimeout(() => {
      const documentViewer = document.getElementById('document-viewer')
      if (!documentViewer) return

      // Find all headings in the document
      const headings = Array.from(documentViewer.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      if (headings.length === 0) return

      // Find the heading that's currently visible (or most recently passed)
      let currentHeading: Element | null = null
      const viewportTop = window.scrollY || document.documentElement.scrollTop
      const viewportMiddle = viewportTop + (window.innerHeight / 3) // Check 1/3 down the viewport

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i]
        const rect = heading.getBoundingClientRect()
        const absoluteTop = rect.top + viewportTop

        if (absoluteTop <= viewportMiddle) {
          currentHeading = heading
          break
        }
      }

      // If we found a current heading, update the context
      if (currentHeading && currentHeading.id) {
        actions.setCurrentPosition(currentHeading.id)
      }
    }, 150) // 150ms debounce
  }, [actions])

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleDocumentScroll)
    return () => {
      window.removeEventListener('scroll', handleDocumentScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleDocumentScroll])
  
  // Keyboard shortcut handler for Cmd+B (Mac) / Ctrl+B (Windows/Linux)
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Platform-specific modifier key detection
      const isMac = typeof window !== 'undefined' && 
                  /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)
      const correctModifier = isMac ? event.metaKey : event.ctrlKey
      
      if (correctModifier && event.key.toLowerCase() === 'b') {
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
          ref={leftPanelRef}
          defaultSize={savedLeftPaneSize} 
          minSize={20} 
          maxSize={50}
          className="h-full"
          style={{ 
            overflow: 'hidden'
          }}
        >
          <div 
            className={`h-full panel-transition ${
              isLeftPaneCollapsed ? 'panel-collapsed' : 'panel-expanded'
            }`}
          >
            <div className="pl-16 h-full">
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
              glossaryCached={glossaryCached}
              onHeadingClick={handleHeadingClick}
              onLoadGlossary={onLoadGlossary}
              onResetGlossary={onResetGlossary}
              documentContext={documentContext}
            />
            </div>
          </div>
        </ResizablePanel>
        
        {/* Resize handle - always present but hidden when collapsed */}
        <ResizableHandle 
          withHandle={!isLeftPaneCollapsed}
          className={`w-1 transition-all duration-300 ${
            isLeftPaneCollapsed 
              ? 'w-0 opacity-0' 
              : 'bg-gray-200 hover:bg-gray-300 active:bg-blue-300'
          }`}
        />
        
        {/* Right pane - Document viewer */}
        <ResizablePanel 
          defaultSize={70}
          className="h-full"
        >
          <div className="h-full pl-16">
            <SimpleDocumentViewer
              elements={elements}
              selectedElement={selectedElement}
              onElementSelect={onElementSelect}
              onElementVisibilityChange={onElementVisibilityChange}
              onElementClick={handleElementClick}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      
      {/* Vertical icon navigation - always visible */}
      <div className="absolute top-0 left-0 z-10 h-full">
        <VerticalIconNav
          activeTab={state.activeTab}
          onTabClick={handleIconNavTabClick}
          onToggleCollapse={handleToggleCollapse}
          onCommandPaletteToggle={handleCommandPaletteToggle}
          className="shadow-lg"
        />
      </div>
      
      {/* Command palette - positioned above all other content */}
      <CommandPalette 
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
      />
    </div>
  )
}

// Main component that provides the context
export function ResizableDocumentLayout(props: ResizableDocumentLayoutProps) {
  return (
    <DocumentCommunicationProvider>
      <ResizableDocumentLayoutInner {...props} />
    </DocumentCommunicationProvider>
  )
}