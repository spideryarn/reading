'use client'

import { useState, useEffect } from 'react'
import { CircleNotch, Warning } from '@phosphor-icons/react'
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
  showGlossary?: boolean
  onLoadGlossary?: () => void
  glossaryError?: string | null
}

// Component to display glossary entities ordered by first occurrence
function GlossaryDisplay({ entities }: { entities: Entity[] }) {
  // For now, entities are already in order of first occurrence (will be enforced by API later)
  // In the future, the API will include a 'firstOccurrence' field to sort by
  
  return (
    <div className="space-y-3">
      {entities.map((entity, index) => (
        <div key={index} className="border-l-2 border-gray-200 pl-3">
          <div className="flex items-baseline gap-2">
            <div className="font-medium text-sm">{entity.name}</div>
            <div className="text-xs text-gray-500 uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              {entity.ontology}
            </div>
          </div>
          {entity.aliases.length > 0 && (
            <div className="text-xs text-gray-500 italic">
              Also: {entity.aliases.join(', ')}
            </div>
          )}
          <div className="text-sm text-gray-600 mt-1">
            {entity.long_explanation || entity.brief_explanation}
          </div>
          {entity.datetime && (
            <div className="text-xs text-gray-500 mt-1">
              {entity.datetime}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function DocumentViewer({ elements, selectedElement, onElementSelect, glossaryEntities = [], isLoadingGlossary = false, showGlossary = false, onLoadGlossary, glossaryError }: DocumentViewerProps) {
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
            <span className="text-xs font-mono text-gray-400" style={{ fontSize: '0.65rem' }}>
              {element.id.substring(0, 8)}
            </span>
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
        {!showGlossary ? (
          <button
            onClick={onLoadGlossary}
            disabled={isLoadingGlossary}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoadingGlossary ? (
              <>
                <CircleNotch className="animate-spin" size={16} />
                Loading...
              </>
            ) : (
              'Load glossary'
            )}
          </button>
        ) : (
          <>
            {isLoadingGlossary ? (
              <div className="flex items-center gap-2 text-gray-500">
                <CircleNotch className="animate-spin" size={20} />
                <span>Loading glossary...</span>
              </div>
            ) : glossaryError ? (
              <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
                <Warning className="text-red-600 mt-0.5" size={20} weight="bold" />
                <div className="text-sm text-red-800">
                  <div className="font-medium mb-1">Failed to generate glossary</div>
                  <div className="text-xs">{glossaryError}</div>
                </div>
              </div>
            ) : glossaryEntities.length > 0 ? (
              <GlossaryDisplay entities={glossaryEntities} />
            ) : (
              <p className="text-gray-500">No glossary entries found</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}