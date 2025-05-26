'use client'

import { useState, useRef, useEffect } from 'react'
import { DocumentViewer } from '@/components/document-viewer'
import { DocumentSummary } from '@/components/document-summary'
import { TableOfContents } from '@/components/table-of-contents'
import type { DocumentElement } from '@/lib/types/document'

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
}

export default function DocumentPageClient({ html, markdownContent, elements }: DocumentPageClientProps) {
  const [selectedElement, setSelectedElement] = useState<DocumentElement | null>(null)
  const [glossaryEntities, setGlossaryEntities] = useState<Entity[]>([])
  const [isLoadingGlossary, setIsLoadingGlossary] = useState(false)
  const documentViewerRef = useRef<HTMLDivElement>(null)

  // Fetch glossary entities when component mounts
  useEffect(() => {
    const fetchGlossary = async () => {
      setIsLoadingGlossary(true)
      try {
        const response = await fetch('/api/glossary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: html }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch glossary')
        }
        
        const data = await response.json()
        setGlossaryEntities(data.entities)
      } catch (error) {
        console.error('Error fetching glossary:', error)
      } finally {
        setIsLoadingGlossary(false)
      }
    }
    
    fetchGlossary()
  }, [html])

  const handleHeadingClick = (headingText: string) => {
    // Find the element that corresponds to this heading
    const headingElement = elements.find(element => 
      element.tag_name.match(/^h[1-6]$/i) && 
      element.content?.trim() === headingText.trim()
    )
    
    if (headingElement) {
      setSelectedElement(headingElement)
      
      // Scroll to the element in the middle pane
      if (documentViewerRef.current) {
        const elementDiv = documentViewerRef.current.querySelector(`[data-element-id="${headingElement.id}"]`)
        if (elementDiv) {
          elementDiv.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-64 border-r bg-gray-50 overflow-y-auto">
        <TableOfContents content={html} elements={elements} onHeadingClick={handleHeadingClick} />
      </div>
      <div className="flex-1 flex flex-col">
        <DocumentSummary content={markdownContent} />
        <div className="flex-1 overflow-hidden" ref={documentViewerRef}>
          <DocumentViewer 
            elements={elements} 
            selectedElement={selectedElement}
            onElementSelect={setSelectedElement}
            glossaryEntities={glossaryEntities}
            isLoadingGlossary={isLoadingGlossary}
          />
        </div>
      </div>
    </div>
  )
}