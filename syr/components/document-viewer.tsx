'use client'

// Document viewer with glossary pane for entity display
// See docs/AI_GLOSSARY.md for glossary feature architecture

import { useState, useEffect } from 'react'
import { CircleNotch, Warning } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import { TabContainer, type Tab } from './tab-container'
import { AssistantChat } from './assistant-chat'
import { MarkdownRenderer } from './markdown-renderer'

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
function GlossaryDisplay({ entities, elements, onScrollToEntity }: { 
  entities: Entity[]
  elements: DocumentElement[]
  onScrollToEntity?: (elementId: string) => void
}) {
  
  /**
   * Find the first occurrence of an entity in the document elements.
   * Searches for entity name and aliases in element content.
   * Returns the element ID where the entity first appears.
   */
  const findFirstOccurrence = (entity: Entity): string | null => {
    const searchTerms = [entity.name, ...entity.aliases]
    
    // Sort elements by position to find the first occurrence
    const sortedElements = [...elements].sort((a, b) => a.position - b.position)
    
    for (const element of sortedElements) {
      if (!element.content) continue
      
      const content = element.content.toLowerCase()
      
      // Check if any of the search terms appear in this element's content
      for (const term of searchTerms) {
        if (content.includes(term.toLowerCase())) {
          return element.id
        }
      }
    }
    
    return null
  }
  
  const handleEntityClick = (entity: Entity) => {
    const elementId = findFirstOccurrence(entity)
    if (elementId && onScrollToEntity) {
      onScrollToEntity(elementId)
    }
  }
  
  return (
    <div className="space-y-3">
      {entities.map((entity, index) => {
        const hasOccurrence = findFirstOccurrence(entity) !== null
        
        return (
          <div key={index} className="border-l-2 border-gray-200 pl-3">
            <div className="flex items-baseline gap-2">
              <div 
                className={`font-medium text-sm ${
                  hasOccurrence 
                    ? 'text-blue-600 cursor-pointer hover:text-blue-800 hover:underline' 
                    : 'text-gray-900'
                }`}
                onClick={() => hasOccurrence && handleEntityClick(entity)}
                title={hasOccurrence ? 'Click to scroll to first occurrence' : undefined}
              >
                {entity.name}
              </div>
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
        )
      })}
    </div>
  )
}

export function DocumentViewer({ elements, selectedElement, onElementSelect, glossaryEntities = [], isLoadingGlossary = false, showGlossary = false, onLoadGlossary, glossaryError }: DocumentViewerProps) {
  const [internalSelectedElement, setInternalSelectedElement] = useState<DocumentElement | null>(null)
  
  // Use external state if provided, otherwise use internal state
  const currentSelectedElement = selectedElement !== undefined ? selectedElement : internalSelectedElement
  const handleElementSelect = onElementSelect || setInternalSelectedElement
  const [elementTree, setElementTree] = useState<Map<string | null, DocumentElement[]>>(new Map())

  /**
   * Scroll to a specific element in the document structure pane.
   * Highlights the element and selects it for detailed view.
   */
  const handleScrollToEntity = (elementId: string) => {
    // Find the element by ID
    const targetElement = elements.find(el => el.id === elementId)
    if (!targetElement) return

    // Select the element to show its details
    handleElementSelect(targetElement)

    // Scroll to the element in the document structure pane
    const elementDiv = document.querySelector(`[data-element-id="${elementId}"]`)
    if (elementDiv) {
      elementDiv.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
      
      // Add a brief highlight effect
      elementDiv.classList.add('bg-yellow-100')
      setTimeout(() => {
        elementDiv.classList.remove('bg-yellow-100')
      }, 2000)
    }
  }

  useEffect(() => {
    const tree = new Map<string | null, DocumentElement[]>()
    elements.forEach(element => {
      const siblings = tree.get(element.parent_id) || []
      siblings.push(element)
      tree.set(element.parent_id, siblings)
    })
    setElementTree(tree)
  }, [elements])

  /**
   * Get typography classes based on element tag name
   */
  const getTypographyClasses = (tagName: string): string => {
    switch (tagName) {
      case 'h1':
        return 'text-3xl font-bold'
      case 'h2':
        return 'text-2xl font-semibold'
      case 'h3':
        return 'text-xl font-semibold'
      case 'h4':
        return 'text-lg font-medium'
      case 'h5':
        return 'text-base font-medium'
      case 'h6':
        return 'text-sm font-medium'
      case 'p':
        return 'text-base leading-relaxed'
      case 'li':
        return 'text-base leading-relaxed'
      case 'ul':
      case 'ol':
        return 'space-y-1'
      case 'blockquote':
        return 'text-base leading-relaxed italic border-l-4 border-gray-300 pl-4'
      case 'code':
        return 'font-mono text-sm bg-gray-100 px-1 py-0.5 rounded'
      case 'pre':
        return 'font-mono text-sm bg-gray-100 p-3 rounded overflow-x-auto'
      case 'em':
      case 'i':
        return 'italic'
      case 'strong':
      case 'b':
        return 'font-semibold'
      default:
        return 'text-base'
    }
  }

  /**
   * Render list item with proper bullet or number
   */
  const renderListItem = (element: DocumentElement, index: number): JSX.Element => {
    const isOrdered = element.parent_id && 
      elements.find(e => e.id === element.parent_id)?.tag_name === 'ol'
    
    return (
      <div className="flex items-start gap-2">
        <span className="text-gray-500 mt-0.5">
          {isOrdered ? `${index + 1}.` : '•'}
        </span>
        <div className="flex-1">
          {element.content ? (
            <MarkdownRenderer content={element.content} />
          ) : (
            <span className="text-gray-400 italic">(empty {element.tag_name})</span>
          )}
        </div>
      </div>
    )
  }

  const renderElement = (element: DocumentElement, depth: number = 0): JSX.Element => {
    const children = elementTree.get(element.id) || []
    const hasChildren = children.length > 0
    // Remove 'syr-' prefix and show only first 8 chars
    const truncatedId = element.id.replace('syr-', '').substring(0, 8)
    const typographyClasses = getTypographyClasses(element.tag_name)

    // Calculate list item index if this is a list item
    let listItemIndex = 0
    if (element.tag_name === 'li' && element.parent_id) {
      const siblings = elementTree.get(element.parent_id) || []
      listItemIndex = siblings
        .filter(s => s.tag_name === 'li')
        .sort((a, b) => a.position - b.position)
        .findIndex(s => s.id === element.id)
    }

    return (
      <div key={element.id} className={depth > 0 ? "border-l-2 border-gray-200 pl-4 ml-2" : ""}>
        <div
          data-element-id={element.id}
          className={`py-2 px-3 rounded cursor-pointer hover:bg-gray-100 ${
            currentSelectedElement?.id === element.id ? 'bg-blue-50 border-blue-500' : ''
          }`}
          onClick={() => handleElementSelect(element)}
        >
          <div className="flex items-start gap-2">
            {/* Show formatted content based on element type */}
            <div className={`flex-1 ${typographyClasses}`}>
              {element.tag_name === 'li' ? (
                renderListItem(element, listItemIndex)
              ) : element.content ? (
                <MarkdownRenderer content={element.content} />
              ) : (
                <span className="text-gray-400 italic">(empty {element.tag_name})</span>
              )}
            </div>
            {/* ID with tooltip showing full ID and tag - smaller and grey */}
            <span 
              className="text-xs font-mono text-gray-500 shrink-0" 
              style={{ fontSize: '0.65rem' }}
              title={`${element.id} (${element.tag_name})`}
            >
              {truncatedId}
            </span>
          </div>
        </div>
        {hasChildren && (
          <div className={element.tag_name === 'ul' || element.tag_name === 'ol' ? 'ml-6' : 'ml-4'}>
            {children
              .sort((a, b) => a.position - b.position)
              .map((child, index) => renderElement(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const rootElements = elementTree.get(null) || []

  const renderGlossaryTab = () => {
    if (!showGlossary) {
      return (
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
      )
    }

    return (
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
          <GlossaryDisplay 
            entities={glossaryEntities} 
            elements={elements}
            onScrollToEntity={handleScrollToEntity}
          />
        ) : (
          <p className="text-gray-500">No glossary entries found</p>
        )}
      </>
    )
  }

  // Extract document context for chat
  const getDocumentContext = () => {
    return elements
      .filter(el => el.content.trim()) // Only include elements with content
      .map(el => el.content.trim())
      .join('\n\n')
      .substring(0, 10000) // Limit context size for now
  }

  const renderChatTab = () => {
    const documentContext = getDocumentContext()
    
    return (
      <AssistantChat documentContext={documentContext} />
    )
  }

  const renderToolsPane = () => {
    const tabs: Tab[] = [
      {
        id: 'chat',
        label: 'Chat',
        content: renderChatTab()
      },
      {
        id: 'glossary',
        label: 'Glossary',
        content: renderGlossaryTab(),
        onActivate: () => {
          // Auto-click "Load glossary" button when tab is activated
          if (!showGlossary && !isLoadingGlossary && onLoadGlossary) {
            onLoadGlossary()
          }
        }
      }
    ]

    return (
      <TabContainer 
        tabs={tabs}
        defaultTab="chat"
        title="Tools"
      />
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Merged Document pane spanning 2/3 of the width */}
      <div className="col-span-2 overflow-y-auto p-4 border-r">
        <h2 className="text-lg font-semibold mb-4">Document</h2>
        {rootElements
          .sort((a, b) => a.position - b.position)
          .map(element => renderElement(element, 0))}
      </div>
      {/* Tools pane */}
      <div className="overflow-y-auto p-4 h-full">
        {renderToolsPane()}
      </div>
    </div>
  )
}