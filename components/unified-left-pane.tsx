'use client'

// Unified left pane component that combines all navigation and tools
// Part of the 2-pane layout architecture using ResizablePanelGroup
// All 5 tabs are at the same level as requested by the user

import { useRef, useEffect } from 'react'
import { AssistantChat } from './assistant-chat'
import { TabContainer, type Tab, type TabContainerRef } from './tab-container'
import { CircleNotch, Book, Question, Calendar, SidebarSimple, ArrowCounterClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { AlertWithIcon } from '@/components/ui/alert'
import type { DocumentElement } from '@/lib/types/document'
import { 
  User, MapPin, Lightbulb, Star, Article, 
  Cube, Buildings, Info 
} from '@phosphor-icons/react'
import { 
  OriginalHeadingsTab, 
  AIGeneratedHeadingsTab, 
  DocumentSummaryTab 
} from './table-of-contents-tabs'

// Entity type (will be moved to proper types file later)
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

interface UnifiedLeftPaneProps {
  // From TableOfContents
  content: string
  elements: DocumentElement[]
  documentId: string
  markdownContent: string
  headingVisibility?: Map<string, 'visible' | 'not-visible'>
  
  // From DocumentViewer (Tools)
  glossaryEntities: Entity[]
  isLoadingGlossary: boolean
  showGlossary: boolean
  glossaryError: string | null
  glossaryCached: boolean
  
  // Callbacks
  onHeadingClick: (headingText: string, headingId?: string) => void
  onLoadGlossary: () => void
  onResetGlossary?: () => void
  onScrollToEntity: (elementId: string) => void
  
  // For chat context
  documentContext: string
  
  // Collapse functionality
  onToggleCollapse?: () => void
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

// Component to display glossary entities
function GlossaryDisplay({ 
  entities, 
  elements, 
  onScrollToEntity 
}: { 
  entities: Entity[]
  elements: DocumentElement[]
  onScrollToEntity?: (elementId: string) => void
}) {
  const findFirstOccurrence = (entity: Entity): string | null => {
    const searchTerms = [entity.name, ...entity.aliases]
    const sortedElements = [...elements].sort((a, b) => a.position - b.position)
    
    for (const element of sortedElements) {
      if (!element.content) continue
      const content = element.content.toLowerCase()
      
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
    <div className="space-y-4 p-4">
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

export function UnifiedLeftPane({
  content,
  elements,
  documentId,
  markdownContent,
  headingVisibility,
  glossaryEntities,
  isLoadingGlossary,
  showGlossary,
  glossaryError,
  glossaryCached,
  onHeadingClick,
  onLoadGlossary,
  onResetGlossary,
  onScrollToEntity,
  documentContext,
  onToggleCollapse
}: UnifiedLeftPaneProps) {
  const tabContainerRef = useRef<TabContainerRef>(null)

  // NEW: Listen for document clicks (from ResizableDocumentLayout) to scroll ToC
  useEffect(() => {
    const handleDocHeadingClick = (event: Event) => {
      const customEvent = event as CustomEvent<{ headingId: string }>
      const headingId = customEvent.detail?.headingId
      if (!headingId) return

      // Activate the "Original" tab so the ToC is rendered
      tabContainerRef.current?.setActiveTab('original')

      // Wait for the tab content to render then scroll
      setTimeout(() => {
        const container = tabContainerRef.current?.getContentContainer()
        if (!container) return
        const tocElement = container.querySelector(`[data-heading-id="${headingId}"]`)
        if (tocElement) {
          ;(tocElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }

    window.addEventListener('doc-heading-click', handleDocHeadingClick)
    return () => window.removeEventListener('doc-heading-click', handleDocHeadingClick)
  }, [])

  // Render Original headings tab
  const renderOriginalTab = () => {
    return (
      <OriginalHeadingsTab
        content={content}
        elements={elements}
        onHeadingClick={onHeadingClick}
        documentId={documentId}
        headingVisibility={headingVisibility}
      />
    )
  }

  // Render AI-generated headings tab
  const renderAIGeneratedTab = () => {
    return (
      <AIGeneratedHeadingsTab
        content={content}
        elements={elements}
        onHeadingClick={onHeadingClick}
        documentId={documentId}
        headingVisibility={headingVisibility}
      />
    )
  }

  // Render Summary tab
  const renderSummaryTab = () => {
    return (
      <DocumentSummaryTab 
        content={content}
        documentId={documentId}
        markdownContent={markdownContent}
      />
    )
  }

  // Render Chat tab
  const renderChatTab = () => {
    return (
      <div className="h-full">
        <AssistantChat documentContext={documentContext} />
      </div>
    )
  }

  // Render Glossary tab
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
          <div className="p-4">
            <AlertWithIcon 
              variant="warning"
              title="Failed to generate glossary"
              description={glossaryError}
            />
            {onResetGlossary && glossaryCached && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetGlossary}
                  className="text-xs"
                  title="Reset and clear cached glossary data"
                >
                  <ArrowCounterClockwise size={14} weight="bold" className="mr-1" />
                  Reset Glossary
                </Button>
              </div>
            )}
          </div>
        ) : glossaryEntities && glossaryEntities.length > 0 ? (
          <div>
            <div className="p-4 pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Document Glossary</h3>
                <div className="flex items-center gap-2">
                  {glossaryCached && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                      Loaded
                    </span>
                  )}
                  {onResetGlossary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onResetGlossary}
                      className="h-7 px-2 text-xs hover:bg-gray-100"
                      title="Reset and regenerate glossary"
                    >
                      <ArrowCounterClockwise size={14} weight="bold" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {glossaryEntities?.length || 0} {(glossaryEntities?.length || 0) === 1 ? 'entry' : 'entries'} found
              </p>
            </div>
            <GlossaryDisplay 
              entities={glossaryEntities || []} 
              elements={elements}
              onScrollToEntity={onScrollToEntity}
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

  // Define all 5 tabs at the same level
  const tabs: Tab[] = [
    {
      id: 'original',
      label: 'Original',
      content: renderOriginalTab()
    },
    {
      id: 'ai-generated',
      label: 'AI-generated',
      content: renderAIGeneratedTab()
    },
    {
      id: 'summary',
      label: 'Summary',
      content: renderSummaryTab()
    },
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
        // Auto-load glossary when tab is activated
        if (!showGlossary && !isLoadingGlossary) {
          onLoadGlossary()
        }
      }
    }
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-900">Navigation & Tools</h2>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0 hover:bg-gray-100"
            title="Toggle sidebar (Ctrl+B)"
          >
            <SidebarSimple size={16} weight="bold" />
          </Button>
        )}
      </div>
      
      {/* Tab container without its own title since we have the header */}
      <TabContainer 
        ref={tabContainerRef}
        tabs={tabs}
        defaultTab="original"
        orientation="vertical"
        className="text-sm flex-1"
      />
    </div>
  )
}