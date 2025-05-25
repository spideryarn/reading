'use client'

import { useState, useRef } from 'react'
import { DocumentViewer } from '@/components/document-viewer'
import { DocumentSummary } from '@/components/document-summary'
import { TableOfContents } from '@/components/table-of-contents'
import type { DocumentElement } from '@/lib/types/document'

interface DocumentPageClientProps {
  html: string
  markdownContent: string
  elements: DocumentElement[]
}

export default function DocumentPageClient({ html, markdownContent, elements }: DocumentPageClientProps) {
  const [selectedElement, setSelectedElement] = useState<DocumentElement | null>(null)
  const documentViewerRef = useRef<HTMLDivElement>(null)

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
        <TableOfContents content={html} onHeadingClick={handleHeadingClick} />
      </div>
      <div className="flex-1 flex flex-col">
        <DocumentSummary content={markdownContent} />
        <div className="flex-1 overflow-hidden" ref={documentViewerRef}>
          <DocumentViewer 
            elements={elements} 
            selectedElement={selectedElement}
            onElementSelect={setSelectedElement}
          />
        </div>
      </div>
    </div>
  )
}