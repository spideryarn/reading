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

// Semantic highlight interface (matching the one in SimpleDocumentViewer)
interface SemanticHighlight {
  elementId: string
  confidence: number
}
import { VerticalIconNav } from './vertical-icon-nav'
import { CommandPalette } from './command-palette'
import type { DocumentElement } from '@/lib/types/document'
import { DocumentCommunicationProvider, useDocumentCommunication } from '@/lib/context/document-communication-context'
import { useToolUrlState } from '@/lib/tools/hooks/use-tool-url-state'

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
  
  // Semantic highlighting
  semanticHighlights?: SemanticHighlight[]
  onSemanticHighlightsChange?: (highlights: SemanticHighlight[]) => void
  
  // Active highlight element (for pulse animation)
  activeElementId?: string | null
  onActiveElementChange?: (elementId: string | null) => void
  
  // Document metadata (for metadata tab)
  documentTitle: string
  documentCreatedAt: string
  documentSourceUrl?: string | null
  aiHeadingsGenerated?: boolean
  summaryGenerated?: boolean
  glossaryGenerated?: boolean
  ownerEmail?: string
  isPublic?: boolean | null
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
  onElementClick,
  semanticHighlights = [],
  onSemanticHighlightsChange,
  activeElementId,
  onActiveElementChange,
  documentTitle,
  documentCreatedAt,
  documentSourceUrl,
  aiHeadingsGenerated = false,
  summaryGenerated = false,
  glossaryGenerated = false,
  ownerEmail,
  isPublic = false
}: ResizableDocumentLayoutProps) {
  const { actions, state } = useDocumentCommunication()
  const toolUrlState = useToolUrlState() // Sync URL state with DocumentCommunicationContext
  
  // Viewport flags – start with "desktop" defaults (avoids hydration mismatch).
  // Real values are applied immediately after mount via the resize effect below.
  const [isMobile, setIsMobile] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)
  const [isLeftPaneCollapsed, setIsLeftPaneCollapsed] = useState(false)
  const [savedLeftPaneSize, setSavedLeftPaneSize] = useState(30) // Remember the last size
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const leftPanelRef = useRef<ImperativePanelHandle>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Keep viewport + collapsed flags in sync with the real DOM state.
  // 1. Detect current mobile / landscape breakpoints
  // 2. Read the actual left-pane size via the ref to decide if it is
  //    collapsed (size === 0). This covers cases where the resizable
  //    library auto-collapses based on available space.
  // 3. On very small screens (< 640 px) ensure the pane starts collapsed
  //    to maximise reading width.
  useEffect(() => {
    const syncLayout = () => {
      const mobile = window.innerWidth <= 640
      const landscape = window.innerHeight <= 500

      setIsMobile(mobile)
      setIsLandscape(landscape)

      if (leftPanelRef.current) {
        const currentSize = leftPanelRef.current.getSize()
        const paneIsCollapsed = currentSize === 0
        setIsLeftPaneCollapsed(paneIsCollapsed)

        // Auto-collapse on very small view-ports if not already collapsed
        if (mobile && !paneIsCollapsed) {
          if (typeof (leftPanelRef.current as any).collapse === 'function') {
            ;(leftPanelRef.current as any).collapse()
          } else {
            leftPanelRef.current.resize(0)
          }
          setIsLeftPaneCollapsed(true)
        }
      }
    }

    // Run once on mount and then on every resize.
    syncLayout()
    window.addEventListener('resize', syncLayout)
    return () => window.removeEventListener('resize', syncLayout)
  }, [])
  
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
  
  // Toggle handler that leverages react-resizable-panels built-in collapse/expand
  const handleToggleCollapse = useCallback(() => {
    if (!leftPanelRef.current) return

    if (isLeftPaneCollapsed) {
      // Expand – restore previous size (or default if none recorded)
      if (typeof (leftPanelRef.current as any).expand === 'function') {
        ;(leftPanelRef.current as any).expand()
        if (savedLeftPaneSize !== 0) {
          leftPanelRef.current.resize(savedLeftPaneSize)
        }
      } else {
        leftPanelRef.current.resize(savedLeftPaneSize || 30)
      }
      setIsLeftPaneCollapsed(false)
    } else {
      // Collapse – remember current size then collapse fully
      const currentSize = leftPanelRef.current.getSize()
      setSavedLeftPaneSize(currentSize)
      if (typeof (leftPanelRef.current as any).collapse === 'function') {
        ;(leftPanelRef.current as any).collapse()
      } else {
        leftPanelRef.current.resize(0)
      }
      setIsLeftPaneCollapsed(true)
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
        if (typeof (leftPanelRef.current as any).expand === 'function') {
          ;(leftPanelRef.current as any).expand()
          if (savedLeftPaneSize !== 0) {
            leftPanelRef.current.resize(savedLeftPaneSize)
          }
        } else {
          leftPanelRef.current.resize(savedLeftPaneSize || 30)
        }
      }
      setIsLeftPaneCollapsed(false)
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
    // `suppressHydrationWarning` avoids React mismatch errors when the
    // initial server-rendered markup (always desktop-oriented) differs from
    // the client's first paint after we detect the actual viewport and toggle
    // mobile / collapsed classes. The layout self-corrects immediately after
    // mount, so this is safe and prevents the noisy red box in development.
    <div suppressHydrationWarning className="relative h-full w-full">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="h-full w-full"
        >
        {/* Left pane - Unified navigation and tools */}
        <ResizablePanel 
          ref={leftPanelRef}
          defaultSize={savedLeftPaneSize}
          minSize={20}
          maxSize={80}
          collapsedSize={0}
          collapsible
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
            <div className="pl-10 sm:pl-16 h-full">
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
              semanticHighlights={semanticHighlights}
              onSemanticHighlightsChange={onSemanticHighlightsChange}
              activeElementId={activeElementId}
              onActiveElementChange={onActiveElementChange}
              documentTitle={documentTitle}
              documentCreatedAt={documentCreatedAt}
              documentSourceUrl={documentSourceUrl}
              aiHeadingsGenerated={aiHeadingsGenerated}
              summaryGenerated={summaryGenerated}
              glossaryGenerated={glossaryGenerated}
              ownerEmail={ownerEmail}
              isPublic={isPublic}
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
          className="h-full relative"
        >
          <div className={`h-full ${isLeftPaneCollapsed ? 'pl-0' : 'pl-16'} ${isMobile ? 'mobile-compact mobile-heading-size mobile-body-text' : ''} ${isLandscape ? 'landscape-compact landscape-spacing' : ''}`}>
            <SimpleDocumentViewer
              elements={elements}
              selectedElement={selectedElement}
              onElementSelect={onElementSelect}
              onElementVisibilityChange={onElementVisibilityChange}
              onElementClick={handleElementClick}
              semanticHighlights={semanticHighlights}
              activeElementId={activeElementId}
              glossaryEntities={glossaryEntities}
              leftAligned={isLeftPaneCollapsed}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      
      {/* Vertical icon navigation - always visible */}
      <div className="absolute top-0 left-0 z-10 h-full">
        <VerticalIconNav
          activeTab={state.activeTabId}
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