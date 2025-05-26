'use client'

import { useState, useEffect } from 'react'
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

interface DocumentViewerProps {
  elements: DocumentElement[]
  selectedElement?: DocumentElement | null
  onElementSelect?: (element: DocumentElement | null) => void
  glossaryEntities?: Entity[]
  isLoadingGlossary?: boolean
}

// Component to display glossary entities grouped by ontology
function GlossaryDisplay({ entities }: { entities: Entity[] }) {
  // Group entities by ontology
  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.ontology]) {
      acc[entity.ontology] = []
    }
    acc[entity.ontology].push(entity)
    return acc
  }, {} as Record<string, Entity[]>)

  // Define display names for ontology types
  const ontologyDisplayNames: Record<string, string> = {
    person: 'People',
    place: 'Places',
    date: 'Dates',
    theme: 'Themes',
    event: 'Events',
    reference: 'References',
    object: 'Objects',
    organization: 'Organizations',
    concept: 'Concepts',
    definition: 'Definitions',
    other: 'Other'
  }

  // Sort ontology types for consistent display order
  const sortedOntologies = Object.keys(groupedEntities).sort()

  return (
    <div className="space-y-6">
      {sortedOntologies.map(ontology => (
        <div key={ontology}>
          <h3 className="font-medium text-sm uppercase text-gray-700 mb-2">
            {ontologyDisplayNames[ontology] || ontology}
          </h3>
          <div className="space-y-3">
            {groupedEntities[ontology].map((entity, index) => (
              <div key={index} className="border-l-2 border-gray-200 pl-3">
                <div className="font-medium text-sm">{entity.name}</div>
                {entity.aliases.length > 0 && (
                  <div className="text-xs text-gray-500 italic">
                    Also: {entity.aliases.join(', ')}
                  </div>
                )}
                <div className="text-sm text-gray-600 mt-1">
                  {entity.brief_explanation}
                </div>
                {entity.datetime && (
                  <div className="text-xs text-gray-500 mt-1">
                    {entity.datetime}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DocumentViewer({ elements, selectedElement, onElementSelect, glossaryEntities = [], isLoadingGlossary = false }: DocumentViewerProps) {
  const [internalSelectedElement, setInternalSelectedElement] = useState<DocumentElement | null>(null)
  
  // Use external state if provided, otherwise use internal state
  const currentSelectedElement = selectedElement !== undefined ? selectedElement : internalSelectedElement
  const handleElementSelect = onElementSelect || setInternalSelectedElement
  const [elementTree, setElementTree] = useState<Map<string | null, DocumentElement[]>>(new Map())

  useEffect(() => {
    const tree = new Map<string | null, DocumentElement[]>()
    elements.forEach(element => {
      const siblings = tree.get(element.parent_id) || []
      siblings.push(element)
      tree.set(element.parent_id, siblings)
    })
    setElementTree(tree)
  }, [elements])

  const renderElement = (element: DocumentElement): JSX.Element => {
    const children = elementTree.get(element.id) || []
    const hasChildren = children.length > 0

    return (
      <div key={element.id} className="border-l-2 border-gray-200 pl-4 ml-2">
        <div
          data-element-id={element.id}
          className={`py-2 px-3 rounded cursor-pointer hover:bg-gray-100 ${
            currentSelectedElement?.id === element.id ? 'bg-blue-50 border-blue-500' : ''
          }`}
          onClick={() => handleElementSelect(element)}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-500">{element.tag_name}</span>
            {element.content && (
              <span className="text-sm truncate flex-1">{element.content}</span>
            )}
          </div>
        </div>
        {hasChildren && (
          <div className="ml-4">
            {children
              .sort((a, b) => a.position - b.position)
              .map(child => renderElement(child))}
          </div>
        )}
      </div>
    )
  }

  const rootElements = elementTree.get(null) || []

  return (
    <div className="grid grid-cols-3 gap-4 h-screen">
      <div className="overflow-y-auto p-4 border-r">
        <h2 className="text-lg font-semibold mb-4">Document Structure</h2>
        {rootElements
          .sort((a, b) => a.position - b.position)
          .map(element => renderElement(element))}
      </div>
      <div className="overflow-y-auto p-4 border-r">
        <h2 className="text-lg font-semibold mb-4">Element Details</h2>
        {currentSelectedElement ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Tag</h3>
              <p className="text-sm text-gray-600">{currentSelectedElement.tag_name}</p>
            </div>
            <div>
              <h3 className="font-medium">Content</h3>
              <p className="text-sm text-gray-600">{currentSelectedElement.content || '(no text content)'}</p>
            </div>
            {Object.keys(currentSelectedElement.attributes).length > 0 && (
              <div>
                <h3 className="font-medium">Attributes</h3>
                <pre className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {JSON.stringify(currentSelectedElement.attributes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Select an element to view details</p>
        )}
      </div>
      <div className="overflow-y-auto p-4">
        <h2 className="text-lg font-semibold mb-4">Glossary</h2>
        {isLoadingGlossary ? (
          <p className="text-gray-500">Loading glossary...</p>
        ) : glossaryEntities.length > 0 ? (
          <GlossaryDisplay entities={glossaryEntities} />
        ) : (
          <p className="text-gray-500">No glossary entries found</p>
        )}
      </div>
    </div>
  )
}