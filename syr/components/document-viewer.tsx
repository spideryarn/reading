'use client'

// Document viewer with glossary pane for entity display
// See docs/AI_GLOSSARY.md for glossary feature architecture

import { useState, useEffect, useRef } from 'react'
import { CircleNotch, User, MapPin, Calendar, Lightbulb, Star, Article, Cube, Buildings, Book, Info, Question } from '@phosphor-icons/react'
import type { DocumentElement } from '@/lib/types/document'
import { TabContainer, type Tab } from './tab-container'
import { AssistantChat } from './assistant-chat'
import { MarkdownRenderer } from './markdown-renderer' // Lightweight markdown for document elements
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { AlertWithIcon } from '@/components/ui/alert'
import { useElementVisibility } from '@/lib/hooks/useElementVisibility'

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

interface DocumentViewerProps {
  elements: DocumentElement[]
  selectedElement?: DocumentElement | null
  onElementSelect?: (element: DocumentElement | null) => void
  glossaryEntities?: Entity[]
  isLoadingGlossary?: boolean
  showGlossary?: boolean
  onLoadGlossary?: () => void
  glossaryError?: string | null
  onElementVisibilityChange?: (elementId: string, isVisible: boolean) => void
  onElementClick?: (element: DocumentElement) => void
}

// Get icon component for entity type
function getEntityIcon(ontology: string) {
  switch (ontology) {
    case 'person':
      return <User size={14} weight="bold" />
    case 'place':
      return <MapPin size={14} weight="bold" />
    case 'date':
      return <Calendar size={14} weight="bold" />
    case 'theme':
    case 'concept':
      return <Lightbulb size={14} weight="bold" />
    case 'event':
      return <Star size={14} weight="bold" />
    case 'reference':
      return <Article size={14} weight="bold" />
    case 'object':
      return <Cube size={14} weight="bold" />
    case 'organization':
      return <Buildings size={14} weight="bold" />
    case 'definition':
      return <Book size={14} weight="bold" />
    default:
      return <Info size={14} weight="bold" />
  }
}

// Get color scheme for entity type
function getEntityColor(ontology: string) {
  switch (ontology) {
    case 'person':
      return 'bg-blue-100 text-blue-800'
    case 'place':
      return 'bg-green-100 text-green-800'
    case 'date':
      return 'bg-purple-100 text-purple-800'
    case 'theme':
    case 'concept':
      return 'bg-yellow-100 text-yellow-800'
    case 'event':
      return 'bg-red-100 text-red-800'
    case 'reference':
      return 'bg-indigo-100 text-indigo-800'
    case 'object':
      return 'bg-gray-100 text-gray-800'
    case 'organization':
      return 'bg-orange-100 text-orange-800'
    case 'definition':
      return 'bg-teal-100 text-teal-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
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
    <div className="space-y-4">
      {entities.map((entity, index) => {
        const hasOccurrence = findFirstOccurrence(entity) !== null
        
        return (
          <div 
            key={index} 
            className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all duration-300 ${
              hasOccurrence ? 'hover:border-blue-300 cursor-pointer' : ''
            }`}
            onClick={() => hasOccurrence && handleEntityClick(entity)}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 
                className={`font-semibold text-lg leading-tight ${
                  hasOccurrence 
                    ? 'text-blue-700 hover:text-blue-900 transition-colors' 
                    : 'text-gray-900'
                }`}
                title={hasOccurrence ? 'Click to scroll to first occurrence' : undefined}
              >
                {entity.name}
              </h3>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 shadow-sm ${getEntityColor(entity.ontology)}`}>
                {getEntityIcon(entity.ontology)}
                {entity.ontology}
              </span>
            </div>
            
            {entity.aliases.length > 0 && (
              <div className="text-xs text-gray-600 mb-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-gray-500 font-medium">Also known as:</span>{' '}
                <span className="font-medium text-gray-700">{entity.aliases.join(', ')}</span>
              </div>
            )}
            
            <div className="text-sm text-gray-700 leading-relaxed mb-3 font-medium">
              {entity.long_explanation || entity.brief_explanation}
            </div>
            
            {entity.datetime && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-md w-fit">
                <Calendar size={12} weight="bold" />
                {entity.datetime}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function DocumentViewer({ elements, selectedElement, onElementSelect, glossaryEntities = [], isLoadingGlossary = false, showGlossary = false, onLoadGlossary, glossaryError, onElementVisibilityChange, onElementClick }: DocumentViewerProps) {
  const [internalSelectedElement, setInternalSelectedElement] = useState<DocumentElement | null>(null)
  
  // Use external state if provided, otherwise use internal state
  const currentSelectedElement = selectedElement !== undefined ? selectedElement : internalSelectedElement
  const handleElementSelect = onElementSelect || setInternalSelectedElement
  const [elementTree, setElementTree] = useState<Map<string | null, DocumentElement[]>>(new Map())
  
  // Element visibility tracking
  const { observeElement, unobserveElement } = useElementVisibility(onElementVisibilityChange)
  const observedElementsRef = useRef<Set<string>>(new Set())
  const elementRefsRef = useRef<Map<string, Element>>(new Map())

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
  
  // Clean up observed elements when elements change or component unmounts
  useEffect(() => {
    const observedElements = observedElementsRef.current
    const elementRefs = elementRefsRef.current
    
    return () => {
      // Unobserve all elements when elements change or component unmounts
      elementRefs.forEach((element, elementId) => {
        unobserveElement(element)
        observedElements.delete(elementId)
      })
      elementRefs.clear()
    }
  }, [elements, unobserveElement])

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
            // Use lightweight MarkdownRenderer for document elements (basic formatting only)
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
          ref={(node) => {
            const prevElement = elementRefsRef.current.get(element.id)
            
            // If we have a previous element and it's different, unobserve it
            if (prevElement && prevElement !== node) {
              unobserveElement(prevElement)
              elementRefsRef.current.delete(element.id)
              observedElementsRef.current.delete(element.id)
            }
            
            // If we have a new node and haven't observed it yet, observe it
            if (node && !observedElementsRef.current.has(element.id)) {
              observeElement(node)
              observedElementsRef.current.add(element.id)
              elementRefsRef.current.set(element.id, node)
            }
          }}
          className={`py-2 px-3 rounded cursor-pointer hover:bg-gray-100 ${
            currentSelectedElement?.id === element.id ? 'bg-blue-50 border-blue-500' : ''
          }`}
          onClick={() => {
            handleElementSelect(element)
            onElementClick?.(element)
          }}
        >
          <div className="flex items-start gap-2">
            {/* Show formatted content based on element type */}
            <div className={`flex-1 ${typographyClasses}`}>
              {element.tag_name === 'li' ? (
                renderListItem(element, listItemIndex)
              ) : element.content ? (
                // Use lightweight MarkdownRenderer for document elements (basic formatting only)
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
              .map((child) => renderElement(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const rootElements = elementTree.get(null) || []

  const renderGlossaryTab = () => {
    if (!showGlossary) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Book size={24} weight="bold" className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Glossary</h3>
          <p className="text-sm text-gray-600 mb-6 max-w-sm">
            Create an interactive glossary of key terms, concepts, and entities from this document.
          </p>
          <Button
            onClick={onLoadGlossary}
            disabled={isLoadingGlossary}
            variant="default"
            className="px-6 py-2"
          >
            {isLoadingGlossary ? (
              <>
                <CircleNotch className="animate-spin mr-2" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Book className="mr-2" size={16} weight="bold" />
                Generate Glossary
              </>
            )}
          </Button>
        </div>
      )
    }

    return (
      <>
        {isLoadingGlossary ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <CircleNotch className="animate-spin text-blue-600" size={24} weight="bold" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Document</h3>
            <p className="text-sm text-gray-600">
              Extracting key terms and concepts...
            </p>
          </div>
        ) : glossaryError ? (
          <AlertWithIcon 
            variant="warning"
            title="Failed to generate glossary"
            description={glossaryError}
          />
        ) : glossaryEntities.length > 0 ? (
          <div>
            <div className="mb-4 pb-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Document Glossary</h3>
              <p className="text-sm text-gray-600 mt-1">
                {glossaryEntities.length} {glossaryEntities.length === 1 ? 'entry' : 'entries'} found
              </p>
            </div>
            <GlossaryDisplay 
              entities={glossaryEntities} 
              elements={elements}
              onScrollToEntity={handleScrollToEntity}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <Question size={24} weight="bold" className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Entries Found</h3>
            <p className="text-sm text-gray-600">
              No glossary entries were identified in this document.
            </p>
          </div>
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