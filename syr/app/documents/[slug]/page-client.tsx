'use client'

import { useState, useRef, useEffect } from 'react'
import { DocumentViewer } from '@/components/document-viewer'
import { TableOfContents } from '@/components/table-of-contents'
import type { DocumentElement } from '@/lib/types/document'
import { useDocument } from '@/lib/context/mutation-context'

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
  extra?: Record<string, any>
}

interface DocumentPageClientProps {
  html: string
  markdownContent: string
  elements: DocumentElement[]
  documentId: string
}

export default function DocumentPageClient({ html, markdownContent, elements, documentId }: DocumentPageClientProps) {
  const mutatedDocument = useDocument() // Get mutated document from context
  const [selectedElement, setSelectedElement] = useState<DocumentElement | null>(null)
  const [glossaryEntities, setGlossaryEntities] = useState<Entity[]>([])
  const [isLoadingGlossary, setIsLoadingGlossary] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)
  const [glossaryError, setGlossaryError] = useState<string | null>(null)
  const documentViewerRef = useRef<HTMLDivElement>(null)

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

  const handleHeadingClick = (headingText: string, headingId?: string) => {
    // Use mutated document for finding headings
    const documentsToSearch = mutatedDocument
    
    // Find the element that corresponds to this heading
    // First try by ID if provided (more reliable for AI headings)
    let headingElement = headingId 
      ? documentsToSearch.find(element => element.id === headingId)
      : null
    
    // Fallback to text search if ID search fails or no ID provided
    if (!headingElement) {
      headingElement = documentsToSearch.find(element => 
        element.tag_name.match(/^h[1-6]$/i) && 
        element.content?.trim() === headingText.trim()
      )
    }
    
    if (headingElement) {
      setSelectedElement(headingElement)
      
      // Scroll to the element in the middle pane
      if (documentViewerRef.current) {
        const elementDiv = documentViewerRef.current.querySelector(`[data-element-id="${headingElement.id}"]`)
        if (elementDiv) {
          elementDiv.scrollIntoView({ behavior: 'smooth', block: 'center' })
          
          // Add visual feedback
          elementDiv.classList.add('bg-yellow-100')
          setTimeout(() => {
            elementDiv.classList.remove('bg-yellow-100')
          }, 2000)
        }
      }
    } else {
      console.warn(`Heading not found: "${headingText}" (ID: ${headingId})`)
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-64 border-r bg-gray-50 overflow-y-auto">
        <TableOfContents content={html} elements={mutatedDocument} onHeadingClick={handleHeadingClick} documentId={documentId} markdownContent={markdownContent} />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden" ref={documentViewerRef}>
          <DocumentViewer 
            elements={mutatedDocument} 
            selectedElement={selectedElement}
            onElementSelect={setSelectedElement}
            glossaryEntities={glossaryEntities}
            isLoadingGlossary={isLoadingGlossary}
            showGlossary={showGlossary}
            onLoadGlossary={fetchGlossary}
            glossaryError={glossaryError}
          />
        </div>
      </div>
    </div>
  )
}