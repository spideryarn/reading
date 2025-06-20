'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ResizableDocumentLayout } from '@/components/resizable-document-layout'
import { AppHeader } from '@/components/app-header'
import { DocumentHeaderActions } from '@/components/document-header-actions'
import type { DocumentElement } from '@/lib/types/document'
import { useDocument } from '@/lib/context/mutation-context'
import { getHeadingAndSectionElements, extractHeadingElements } from '@/lib/services/heading-section-detector'
import { createClient } from '@/lib/supabase/client'
import { subscribeToDocument } from '@/lib/supabase/realtime'

// Define entity type (will be moved to a proper types file later)
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

// Semantic highlight interface
interface SemanticHighlight {
  elementId: string
  confidence: number
}

interface DocumentPageClientProps {
  html: string
  markdownContent: string
  elements: DocumentElement[]
  documentId: string
  initialTitle: string
  slug: string
  storagePath: string | null
  originalFileType: string | null
  uploadMetadata?: any
  documentCreatedAt: string
  documentSourceUrl?: string | null
  aiHeadingsGenerated?: boolean
  summaryGenerated?: boolean
  glossaryGenerated?: boolean
  ownerEmail?: string
  isPublic?: boolean | null
}

export default function DocumentPageClient({ 
  html, 
  markdownContent, 
  documentId, 
  initialTitle, 
  slug,
  storagePath,
  originalFileType,
  uploadMetadata,
  documentCreatedAt,
  documentSourceUrl,
  aiHeadingsGenerated = false,
  summaryGenerated = false,
  glossaryGenerated = false,
  ownerEmail,
  isPublic = false
}: DocumentPageClientProps) {
  const mutatedDocument = useDocument() // Get mutated document from context
  const [selectedElement, setSelectedElement] = useState<DocumentElement | null>(null)
  const [glossaryEntities, setGlossaryEntities] = useState<Entity[]>([])
  const [isLoadingGlossary, setIsLoadingGlossary] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)
  const [glossaryError, setGlossaryError] = useState<string | null>(null)
  const [glossaryCached, setGlossaryCached] = useState(false)
  
  // Real-time document title state
  const [currentTitle, setCurrentTitle] = useState(initialTitle)
  
  // Heading visibility state
  const [headingVisibility, setHeadingVisibility] = useState<Map<string, 'visible' | 'not-visible'>>(new Map())
  const [elementVisibility, setElementVisibility] = useState<Map<string, boolean>>(new Map())
  
  // Semantic highlights state
  const [semanticHighlights, setSemanticHighlights] = useState<SemanticHighlight[]>([])
  
  // Active highlight element state (for active pulse animation)
  const [activeElementId, setActiveElementId] = useState<string | null>(null)
  
  // ----------------------------------------------
  // Fix A: Batch element-visibility updates so we
  // trigger at most one React state change per frame
  // ----------------------------------------------
  const pendingVisibilityUpdates = useRef<Map<string, boolean>>(new Map())
  const frameScheduled = useRef(false)

  const flushVisibilityUpdates = useCallback(() => {
    setElementVisibility(prev => {
      if (pendingVisibilityUpdates.current.size === 0) {
        frameScheduled.current = false
        return prev
      }
      const next = new Map(prev)
      for (const [id, visible] of pendingVisibilityUpdates.current.entries()) {
        if (visible) {
          next.set(id, true)
        } else {
          next.delete(id)
        }
      }
      pendingVisibilityUpdates.current.clear()
      frameScheduled.current = false
      return next
    })
  }, [])

  // This callback is passed to DocumentViewer
  const handleElementVisibilityChange = useCallback((elementId: string, isVisible: boolean) => {
    pendingVisibilityUpdates.current.set(elementId, isVisible)
    if (!frameScheduled.current) {
      frameScheduled.current = true
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(flushVisibilityUpdates)
      } else {
        // Fallback for server-side or test environments
        flushVisibilityUpdates()
      }
    }
  }, [flushVisibilityUpdates])
  
  // Extract all headings (both original and AI-generated)
  const allHeadings = useMemo(() => {
    return extractHeadingElements(mutatedDocument)
  }, [mutatedDocument])
  
  // ----------------------------------------------
  // Fix B: Recalculate heading-visibility only when
  // element visibility membership actually changes
  // ----------------------------------------------
  const elementVisibilityKey = useMemo(() => {
    // Keys sorted for stable string
    return Array.from(elementVisibility.keys()).sort().join(',')
  }, [elementVisibility])

  useEffect(() => {
    if (elementVisibility.size === 0) return // nothing visible yet

    const newHeadingVisibility = new Map<string, 'visible' | 'not-visible'>()

    allHeadings.forEach(heading => {
      const headingElement = mutatedDocument.find(el => el.id === heading.id)
      if (!headingElement) {
        newHeadingVisibility.set(heading.id, 'not-visible')
        return
      }
      const headingElements = getHeadingAndSectionElements(headingElement, mutatedDocument)
      const isVisible = headingElements.some(el => elementVisibility.has(el.id))
      newHeadingVisibility.set(heading.id, isVisible ? 'visible' : 'not-visible')
    })

    setHeadingVisibility(prev => {
      if (prev.size !== newHeadingVisibility.size) return newHeadingVisibility
      for (const [k, v] of newHeadingVisibility.entries()) {
        if (prev.get(k) !== v) return newHeadingVisibility
      }
      return prev
    })
  // Depend on keyed string, not the Map reference
  }, [elementVisibilityKey, allHeadings, mutatedDocument])
  
  // Handle element clicks in the document viewer
  const handleElementClick = useCallback((element: DocumentElement) => {
    // Element click handling for selection etc. can be added here if needed
    console.log('Element clicked:', element.id)
  }, [])

  // Reset glossary (delete from database and clear UI)
  const resetGlossary = async () => {
    try {
      const response = await fetch('/api/glossary', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to reset glossary: ${response.status}`)
      }
      
      // Clear UI state
      setGlossaryEntities([])
      setGlossaryCached(false)
      setShowGlossary(false)
      setGlossaryError(null)
      
      console.log('Glossary reset successfully')
    } catch (error) {
      console.error('Error resetting glossary:', error)
      setGlossaryError('Failed to reset glossary')
    }
  }

  // Fetch glossary entities when requested
  const fetchGlossary = async () => {
    setIsLoadingGlossary(true)
    setGlossaryError(null)
    try {
      const response = await fetch('/api/glossary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: html,
          documentId: documentId
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log(`Glossary API response: ${data.entities?.length || 0} entities${data.cached ? ' (cached)' : ''}`)
      setGlossaryEntities(data.entities || [])
      setGlossaryCached(data.cached || false)
      setShowGlossary(true)
    } catch (error) {
      console.error('Error fetching glossary:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate glossary'
      setGlossaryError(errorMessage)
      setShowGlossary(true) // Show the pane even on error so user can see the error message
      
      // Always show reset button on any error - user should be able to clear cache and retry
      setGlossaryCached(true)
    } finally {
      setIsLoadingGlossary(false)
    }
  }

  // Subscribe to TITLE updates once (on mount)
  useEffect(() => {
    const supabase = createClient()

    const subscription = subscribeToDocument(supabase, documentId, (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new?.title) {
        setCurrentTitle(payload.new.title)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [documentId])

  // Keep the browser tab title in sync
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${currentTitle} - Spideryarn`
    }
  }, [currentTitle])

  // Listen for local title updates dispatched by MetadataPanel so the header
  // updates instantly without waiting for the realtime feed.
  useEffect(() => {
    const handler = (e: Event) => {
      const newTitle = (e as CustomEvent<string>).detail
      if (typeof newTitle === 'string') {
        setCurrentTitle(newTitle)
      }
    }
    window.addEventListener('document-title-updated', handler)
    return () => window.removeEventListener('document-title-updated', handler)
  }, [])

  return (
    <div className="h-screen flex flex-col">
      <AppHeader 
        title={currentTitle}
        titleLink={`/read/${slug}`}
        logoLink="/read"
        actions={<DocumentHeaderActions />}
      />
      <div className="flex-1 overflow-hidden">
        <ResizableDocumentLayout
        html={html}
        elements={mutatedDocument}
        documentId={documentId}
        markdownContent={markdownContent}
        selectedElement={selectedElement}
        onElementSelect={setSelectedElement}
        glossaryEntities={glossaryEntities}
        isLoadingGlossary={isLoadingGlossary}
        showGlossary={showGlossary}
        glossaryError={glossaryError}
        glossaryCached={glossaryCached}
        onLoadGlossary={fetchGlossary}
        onResetGlossary={resetGlossary}
        headingVisibility={headingVisibility}
        onElementVisibilityChange={handleElementVisibilityChange}
        onElementClick={handleElementClick}
        semanticHighlights={semanticHighlights}
        onSemanticHighlightsChange={setSemanticHighlights}
        activeElementId={activeElementId}
        onActiveElementChange={setActiveElementId}
        documentTitle={currentTitle}
        documentCreatedAt={documentCreatedAt}
        documentSourceUrl={documentSourceUrl ?? null}
        aiHeadingsGenerated={aiHeadingsGenerated}
        summaryGenerated={summaryGenerated}
        glossaryGenerated={glossaryGenerated}
        {...(ownerEmail ? { ownerEmail } : {})}
        isPublic={isPublic}
        slug={slug}
        storagePath={storagePath}
        originalFileType={originalFileType}
        uploadMetadata={uploadMetadata}
      />
      </div>
    </div>
  )
}