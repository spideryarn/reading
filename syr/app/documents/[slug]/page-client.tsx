'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ResizableDocumentLayout } from '@/components/resizable-document-layout'
import type { DocumentElement } from '@/lib/types/document'
import { useDocument } from '@/lib/context/mutation-context'
import { getHeadingAndSectionElements, extractHeadingElements } from '@/lib/services/heading-section-detector'

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

interface DocumentPageClientProps {
  html: string
  markdownContent: string
  elements: DocumentElement[]
  documentId: string
}

export default function DocumentPageClient({ html, markdownContent, documentId }: DocumentPageClientProps) {
  const mutatedDocument = useDocument() // Get mutated document from context
  const [selectedElement, setSelectedElement] = useState<DocumentElement | null>(null)
  const [glossaryEntities, setGlossaryEntities] = useState<Entity[]>([])
  const [isLoadingGlossary, setIsLoadingGlossary] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)
  const [glossaryError, setGlossaryError] = useState<string | null>(null)
  
  // Heading visibility state
  const [headingVisibility, setHeadingVisibility] = useState<Map<string, 'visible' | 'not-visible'>>(new Map())
  const [elementVisibility, setElementVisibility] = useState<Map<string, boolean>>(new Map())
  
  // Extract all headings (both original and AI-generated)
  const allHeadings = useMemo(() => {
    return extractHeadingElements(mutatedDocument)
  }, [mutatedDocument])
  
  // Handle element visibility changes from DocumentViewer
  const handleElementVisibilityChange = useCallback((elementId: string, isVisible: boolean) => {
    setElementVisibility(prev => {
      const next = new Map(prev)
      if (isVisible) {
        next.set(elementId, true)
      } else {
        next.delete(elementId)
      }
      return next
    })
  }, [])
  
  // Calculate heading visibility based on element visibility
  useEffect(() => {
    
    const newHeadingVisibility = new Map<string, 'visible' | 'not-visible'>()
    
    // Check each heading
    allHeadings.forEach(heading => {
      // Get all elements that belong to this heading (heading + its section)
      const headingElements = getHeadingAndSectionElements(heading, mutatedDocument)
      
      // Check if any element in the heading's section is visible
      const isVisible = headingElements.some(element => elementVisibility.has(element.id))
      
      
      newHeadingVisibility.set(heading.id, isVisible ? 'visible' : 'not-visible')
    })
    
    
    setHeadingVisibility(newHeadingVisibility)
  }, [elementVisibility, allHeadings, mutatedDocument])
  
  // ToC scroll is now handled automatically by the useTocAutoScroll hook in the tab components
  // This manual trigger is no longer needed with the new architecture
  
  // Auto-scroll functionality for clicked elements is now handled by the useTocAutoScroll hook
  // based on element visibility changes, so no manual heading lookup is needed
  
  // Handle element clicks in the document viewer
  // Auto-scroll is now handled by the useTocAutoScroll hook in the ToC tab components
  // based on element visibility changes, so no manual triggering needed
  const handleElementClick = useCallback((_element: DocumentElement) => {
    // Element click handling for selection etc. can be added here if needed
    // The auto-scroll will be triggered automatically via visibility changes
  }, [])

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
        body: JSON.stringify({ content: html }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setGlossaryEntities(data.entities)
      setShowGlossary(true)
    } catch (error) {
      console.error('Error fetching glossary:', error)
      setGlossaryError(error instanceof Error ? error.message : 'Failed to generate glossary')
      setShowGlossary(true) // Show the pane even on error so user can see the error message
    } finally {
      setIsLoadingGlossary(false)
    }
  }

  // This function is no longer used - the ResizableDocumentLayout handles heading clicks directly

  return (
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
      onLoadGlossary={fetchGlossary}
      headingVisibility={headingVisibility}
      onElementVisibilityChange={handleElementVisibilityChange}
      onElementClick={handleElementClick}
    />
    </div>
  )
}