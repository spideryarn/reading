'use client'

import { useState, useEffect } from 'react'
import type { DocumentElement } from '@/lib/types/document'

interface DocumentViewerProps {
  elements: DocumentElement[]
}

export function DocumentViewer({ elements }: DocumentViewerProps) {
  const [selectedElement, setSelectedElement] = useState<DocumentElement | null>(null)
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
          className={`py-2 px-3 rounded cursor-pointer hover:bg-gray-100 ${
            selectedElement?.id === element.id ? 'bg-blue-50 border-blue-500' : ''
          }`}
          onClick={() => setSelectedElement(element)}
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
    <div className="grid grid-cols-2 gap-4 h-screen">
      <div className="overflow-y-auto p-4 border-r">
        <h2 className="text-lg font-semibold mb-4">Document Structure</h2>
        {rootElements
          .sort((a, b) => a.position - b.position)
          .map(element => renderElement(element))}
      </div>
      <div className="overflow-y-auto p-4">
        <h2 className="text-lg font-semibold mb-4">Element Details</h2>
        {selectedElement ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Tag</h3>
              <p className="text-sm text-gray-600">{selectedElement.tag_name}</p>
            </div>
            <div>
              <h3 className="font-medium">Content</h3>
              <p className="text-sm text-gray-600">{selectedElement.content || '(no text content)'}</p>
            </div>
            {Object.keys(selectedElement.attributes).length > 0 && (
              <div>
                <h3 className="font-medium">Attributes</h3>
                <pre className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {JSON.stringify(selectedElement.attributes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Select an element to view details</p>
        )}
      </div>
    </div>
  )
}