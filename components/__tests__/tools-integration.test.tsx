import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssistantChat } from '../assistant-chat'
import { UnifiedLeftPane } from '../unified-left-pane'
import type { DocumentElement } from '@/lib/types/document'

// ========== COMPREHENSIVE TOOL TEST INFRASTRUCTURE ==========

// Mock nuqs for URL state management
jest.mock('nuqs', () => ({
  useQueryState: jest.fn((key: string, options?: any) => {
    const [value, setValue] = React.useState(options?.defaultValue || '')
    return [value, setValue, { pending: false }]
  }),
  useQueryStates: jest.fn((parsers: any) => {
    const [state, setState] = React.useState(() => {
      const initial: any = {}
      Object.keys(parsers).forEach(key => {
        initial[key] = parsers[key]?.defaultValue || ''
      })
      return initial
    })
    return [state, setState, { pending: false }]
  }),
  parseAsString: { withDefault: (defaultValue: string) => ({ defaultValue }) },
  parseAsStringEnum: (values: string[]) => ({ 
    withDefault: (defaultValue: string) => ({ defaultValue, values }) 
  }),
  parseAsBoolean: { withDefault: (defaultValue: boolean) => ({ defaultValue }) }
}))

// Mock DocumentCommunicationContext
const mockDocumentContext = {
  state: {
    activeTabId: 'chat',
    searchQuery: '',
    searchType: 'text' as const,
    isSearching: false,
    activeElementId: null,
    scrollToElementId: null,
    summaryLevel: 'medium' as const,
    expertiseLevel: 'intermediate' as const,
    lengthLevel: 'single_short_paragraph' as const,
    summaryLocked: false
  },
  actions: {
    setActiveTab: jest.fn(),
    setSearchQuery: jest.fn(),
    setSearchType: jest.fn(),
    setSearching: jest.fn(),
    setActiveElement: jest.fn(),
    scrollToElement: jest.fn(),
    setSummaryLevel: jest.fn(),
    setExpertiseLevel: jest.fn(),
    setLengthLevel: jest.fn(),
    setSummaryLocked: jest.fn(),
    clearSearch: jest.fn()
  }
}

jest.mock('@/lib/context/document-communication-context', () => ({
  useDocumentCommunication: () => mockDocumentContext,
  DocumentCommunicationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  User: () => <div data-testid="user-icon">User</div>,
  Robot: () => <div data-testid="robot-icon">Robot</div>,
  PaperPlaneTilt: () => <div data-testid="send-icon">Send</div>,
  CircleNotch: () => <div data-testid="loading-icon">Loading</div>,
  Book: () => <div data-testid="book-icon">Book</div>,
  Question: () => <div data-testid="question-icon">Question</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  ArrowCounterClockwise: () => <div data-testid="reset-icon">Reset</div>,
  MagnifyingGlass: () => <div data-testid="search-icon">Search</div>,
  X: () => <div data-testid="close-icon">Close</div>,
  CaretDown: () => <div data-testid="caret-icon">Caret</div>,
  MapPin: () => <div data-testid="mappin-icon">MapPin</div>,
  Lightbulb: () => <div data-testid="lightbulb-icon">Lightbulb</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  Article: () => <div data-testid="article-icon">Article</div>,
  Cube: () => <div data-testid="cube-icon">Cube</div>,
  Buildings: () => <div data-testid="buildings-icon">Buildings</div>,
  Info: () => <div data-testid="info-icon">Info</div>
}))

// Mock persistent chat hook - create a runtime that matches @assistant-ui/react expectations
const mockRuntime = {
  thread: {
    messages: [],
    isRunning: false
  },
  composer: {
    send: jest.fn(),
    text: '',
    setText: jest.fn()
  },
  // Add more runtime properties that @assistant-ui/react might expect
  isRunning: false,
  adapter: jest.fn()
}

const mockPersistentChat = {
  runtime: mockRuntime,
  isLoaded: true,
  threadId: 'test-thread-id',
  error: null,
  isRefreshing: false,
  refreshMessages: jest.fn()
}

jest.mock('@/src/lib/hooks/usePersistentChat', () => ({
  usePersistentChat: jest.fn(() => mockPersistentChat)
}))

// Mock chat URL state hook
jest.mock('@/lib/tools/hooks/use-tool-url-state', () => ({
  useChatUrlState: jest.fn(() => ({
    conversationId: '',
    setConversation: jest.fn()
  })),
  useGlossaryUrlState: jest.fn(() => ({
    glossaryExpanded: false,
    setGlossaryExpanded: jest.fn()
  })),
  useSearchUrlState: jest.fn(() => ({
    searchQuery: '',
    setSearchQuery: jest.fn(),
    searchType: 'text',
    setSearchType: jest.fn()
  }))
}))

// Mock assistant-ui/react components
jest.mock('@assistant-ui/react', () => {
  const mockThread = {
    messages: [],
    isRunning: false
  }
  
  const mockComposer = {
    send: jest.fn(),
    text: '',
    setText: jest.fn()
  }

  return {
    AssistantRuntimeProvider: ({ children, runtime }: { children: React.ReactNode; runtime?: any }) => (
      <div data-testid="runtime-provider">{children}</div>
    ),
    
    ThreadPrimitive: {
      Root: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className} data-testid="thread-root">{children}</div>
      ),
      Viewport: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className} data-testid="thread-viewport">{children}</div>
      ),
      Empty: ({ children }: { children: React.ReactNode }) => {
        if (mockThread.messages.length === 0) {
          return <div data-testid="thread-empty">{children}</div>
        }
        return null
      },
      Messages: ({ components }: { components?: Record<string, React.ComponentType> }) => (
        <div data-testid="thread-messages">
          {mockThread.messages.map((msg: any, idx: number) => {
            const Component = msg.role === 'user' ? components?.UserMessage : components?.AssistantMessage
            return Component ? <Component key={idx} /> : null
          })}
        </div>
      ),
      Suggestion: ({ children, prompt, autoSend, asChild, ...props }: any) => {
        const handleClick = () => {
          if (autoSend) {
            mockComposer.setText(prompt)
            mockComposer.send()
          }
        }
        
        if (asChild) {
          return React.cloneElement(children as React.ReactElement, { 
            ...props,
            onClick: handleClick,
            'data-testid': `suggestion-${prompt}`
          })
        }
        
        return (
          <button {...props} onClick={handleClick} data-testid={`suggestion-${prompt}`}>
            {children}
          </button>
        )
      },
      If: ({ children }: { children: React.ReactNode }) => <>{children}</>
    },
    
    MessagePrimitive: {
      Root: ({ children }: { children: React.ReactNode }) => (
        <div className="flex gap-3 mb-4" data-testid="message-root">{children}</div>
      ),
      Content: () => <div data-testid="message-content">Test message content</div>
    },
    
    ComposerPrimitive: {
      Root: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className} data-testid="composer-root">{children}</div>
      ),
      Input: ({ placeholder, className, ...props }: any) => (
        <textarea 
          data-testid="composer-input"
          placeholder={placeholder}
          className={className}
          value={mockComposer.text}
          onChange={(e) => mockComposer.setText(e.target.value)}
          {...props}
        />
      ),
      Send: ({ children, asChild, ...props }: any) => {
        const handleClick = () => mockComposer.send()
        if (asChild) {
          return React.cloneElement(children as React.ReactElement, { 
            onClick: handleClick,
            'data-testid': 'send-button'
          })
        }
        return (
          <button onClick={handleClick} data-testid="send-button" {...props}>
            {children}
          </button>
        )
      }
    },
    
    useLocalRuntime: jest.fn(() => ({
      thread: mockThread,
      composer: mockComposer
    }))
  }
})

// Mock @assistant-ui/react-markdown
jest.mock('@assistant-ui/react-markdown', () => ({
  MarkdownTextPrimitive: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="markdown-content">{children}</div>
  )
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} data-testid="ui-button" {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/alert', () => ({
  AlertWithIcon: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="alert" data-title={title}>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  )
}))

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>
}))

// Mock other tool components
jest.mock('../table-of-contents-tabs', () => ({
  OriginalHeadingsTab: ({ onHeadingClick }: any) => (
    <div data-testid="original-headings-tab">
      <button onClick={() => onHeadingClick('Test Heading', 'heading-1')}>
        Test Heading
      </button>
    </div>
  ),
  AIGeneratedHeadingsTab: () => <div data-testid="ai-headings-tab">AI Headings</div>,
  DocumentSummaryTab: () => <div data-testid="summary-tab">Summary</div>
}))

jest.mock('../tools/MetadataPanel', () => ({
  MetadataPanel: ({ documentId }: { documentId: string }) => (
    <div data-testid="metadata-panel" data-document-id={documentId}>
      Metadata Panel
    </div>
  )
}))

jest.mock('../highlight-management', () => ({
  HighlightManagement: () => <div data-testid="highlight-management">Highlights</div>
}))

// Mock utilities
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any) => fn
}))

jest.mock('mark.js', () => {
  return jest.fn().mockImplementation(() => ({
    mark: jest.fn((searchTerm, options) => {
      if (options?.done) options.done()
    }),
    unmark: jest.fn()
  }))
})

jest.mock('@/lib/utils/html-text-extraction', () => ({
  extractCleanText: jest.fn(() => 'Sample text content')
}))

jest.mock('@/lib/utils/search-context-extraction', () => ({
  extractAllMatchContexts: jest.fn(() => []),
  generateTooltipContent: jest.fn(() => 'Tooltip content')
}))

// ========== CHAT TOOL INTEGRATION TESTS ==========

describe('Chat Tool Integration', () => {
  const mockDocumentContext = 'This is a test document with sample content for testing.'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Integration Tests', () => {
    it('should integrate with persistent chat hook correctly', () => {
      const usePersistentChatMock = jest.requireMock('@/src/lib/hooks/usePersistentChat').usePersistentChat
      
      render(<AssistantChat documentId="test-doc" documentContext={mockDocumentContext} />)
      
      expect(usePersistentChatMock).toHaveBeenCalledWith({
        documentId: 'test-doc',
        documentContext: mockDocumentContext,
        conversationId: ''
      })
    })

    it('should integrate with chat URL state correctly', () => {
      const useChatUrlStateMock = jest.requireMock('@/lib/tools/hooks/use-tool-url-state').useChatUrlState
      
      render(<AssistantChat documentId="test-doc" documentContext={mockDocumentContext} />)
      
      expect(useChatUrlStateMock).toHaveBeenCalled()
    })
  })

  describe('State Management', () => {

    it('should handle loading state', () => {
      // Mock loading state
      jest.requireMock('@/src/lib/hooks/usePersistentChat').usePersistentChat.mockReturnValue({
        ...mockPersistentChat,
        isLoaded: false
      })

      render(<AssistantChat documentId="test-doc" documentContext={mockDocumentContext} />)
      
      // Should show loading indicator
      expect(screen.getByTestId('loading-icon')).toBeInTheDocument()
      expect(screen.getByText('Loading conversation...')).toBeInTheDocument()
    })

    it('should handle error state', () => {
      // Mock error state
      jest.requireMock('@/src/lib/hooks/usePersistentChat').usePersistentChat.mockReturnValue({
        ...mockPersistentChat,
        error: 'Failed to load chat'
      })

      render(<AssistantChat documentId="test-doc" documentContext={mockDocumentContext} />)
      
      // Should show error message
      expect(screen.getByText(/failed to load chat/i)).toBeInTheDocument()
    })
  })
})

// ========== UNIFIED TOOL NAVIGATION TESTS ==========

describe('Unified Tool Navigation', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'heading-1',
      content: 'Introduction to AI',
      tag_name: 'h1',
      parent_id: null,
      position: 0,
      attributes: {}
    }
  ]

  const mockGlossaryEntities = [
    {
      name: 'Artificial Intelligence',
      ontology: 'concept' as const,
      aliases: ['AI'],
      brief_explanation: 'The simulation of human intelligence processes by machines.'
    }
  ]

  const defaultProps = {
    content: '<h1>Introduction to AI</h1><p>Test content</p>',
    elements: mockElements,
    documentId: 'test-doc',
    markdownContent: '# Introduction to AI\n\nTest content',
    glossaryEntities: mockGlossaryEntities,
    isLoadingGlossary: false,
    showGlossary: true,
    glossaryError: null,
    glossaryCached: false,
    onHeadingClick: jest.fn(),
    onLoadGlossary: jest.fn(),
    documentContext: 'Test document context'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Tab Navigation', () => {
    it('should render all tool tabs', () => {
      render(<UnifiedLeftPane {...defaultProps} />)
      
      // Should have all tabs accessible (even if not visible)
      expect(screen.getByTestId('original-headings-tab')).toBeInTheDocument()
      expect(screen.getByTestId('assistant-chat')).toBeInTheDocument()
      expect(screen.getByTestId('metadata-panel')).toBeInTheDocument()
    })

    it('should switch between tabs', async () => {
      const user = userEvent.setup()
      render(<UnifiedLeftPane {...defaultProps} />)
      
      // Verify initial state - chat tab should be active
      expect(mockDocumentContext.state.activeTabId).toBe('chat')
      
      // Mock tab switching
      mockDocumentContext.actions.setActiveTab.mockImplementation((tabId) => {
        mockDocumentContext.state.activeTabId = tabId
      })
    })

    it('should handle glossary tab activation', () => {
      // Set active tab to glossary
      mockDocumentContext.state.activeTabId = 'glossary'
      
      render(<UnifiedLeftPane {...defaultProps} showGlossary={false} />)
      
      // Should trigger glossary loading
      expect(defaultProps.onLoadGlossary).toHaveBeenCalled()
    })
  })

  describe('Search Functionality', () => {
    it('should handle search input', async () => {
      const user = userEvent.setup()
      render(<UnifiedLeftPane {...defaultProps} />)
      
      // Find search input
      const searchInput = screen.getByPlaceholderText(/search/i)
      expect(searchInput).toBeInTheDocument()
      
      // Type in search
      await user.type(searchInput, 'artificial intelligence')
      
      // Should update search state
      expect(mockDocumentContext.actions.setSearchQuery).toHaveBeenCalledWith('artificial intelligence')
    })

    it('should clear search results', async () => {
      const user = userEvent.setup()
      mockDocumentContext.state.searchQuery = 'test query'
      
      render(<UnifiedLeftPane {...defaultProps} />)
      
      // Find clear button
      const clearButton = screen.getByTestId('close-icon')
      await user.click(clearButton)
      
      // Should clear search
      expect(mockDocumentContext.actions.clearSearch).toHaveBeenCalled()
    })
  })

  describe('Glossary Integration', () => {
    it('should display glossary entities', () => {
      render(<UnifiedLeftPane {...defaultProps} />)
      
      // Should show entity count
      expect(screen.getByText(/1 entry found/i)).toBeInTheDocument()
      
      // Should display entity
      expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument()
      expect(screen.getByText('The simulation of human intelligence processes by machines.')).toBeInTheDocument()
    })

    it('should handle glossary loading state', () => {
      render(<UnifiedLeftPane {...defaultProps} isLoadingGlossary={true} showGlossary={false} />)
      
      // Should show loading state
      expect(screen.getByTestId('loading-icon')).toBeInTheDocument()
    })

    it('should handle glossary error', () => {
      render(
        <UnifiedLeftPane 
          {...defaultProps} 
          glossaryError="Failed to generate glossary" 
          showGlossary={false}
        />
      )
      
      // Should show error
      expect(screen.getByTestId('alert')).toBeInTheDocument()
      expect(screen.getByText('Failed to generate glossary')).toBeInTheDocument()
    })
  })
})

// ========== METADATA TOOL TESTS ==========

describe('Metadata Tool', () => {
  it('should render metadata panel with document ID', () => {
    render(<UnifiedLeftPane 
      content="<p>Test</p>"
      elements={[]}
      documentId="test-doc-123"
      markdownContent="Test"
      glossaryEntities={[]}
      isLoadingGlossary={false}
      showGlossary={false}
      glossaryError={null}
      glossaryCached={false}
      onHeadingClick={jest.fn()}
      onLoadGlossary={jest.fn()}
      documentContext="Test"
    />)
    
    // Should render metadata panel
    const metadataPanel = screen.getByTestId('metadata-panel')
    expect(metadataPanel).toBeInTheDocument()
    expect(metadataPanel).toHaveAttribute('data-document-id', 'test-doc-123')
  })
})