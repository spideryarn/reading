import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from './test-wrapper'
import { UnifiedLeftPane } from '../unified-left-pane'
import type { DocumentElement } from '@/lib/types/document'
import { useDocumentCommunication } from '@/lib/context/document-communication-context'

// ========== Setup and Mocks (50 lines) ==========

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

// Mock utilities
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any) => fn // Execute immediately in tests
}))

jest.mock('mark.js', () => {
  return jest.fn().mockImplementation(() => ({
    mark: jest.fn((searchTerm, options) => {
      if (options?.done) options.done()
    }),
    unmark: jest.fn()
  }))
})

// Mock components - simplified for integration testing
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

jest.mock('../assistant-chat', () => ({
  AssistantChat: () => <div data-testid="assistant-chat">Chat Interface</div>
}))

jest.mock('../tools/MetadataPanel', () => ({
  MetadataPanel: () => <div data-testid="metadata-panel">Metadata Panel</div>
}))

jest.mock('../highlight-management', () => ({
  HighlightManagement: () => <div data-testid="highlight-management">Highlights</div>
}))

// GlossaryDisplay and HighlightedSearchText are defined within unified-left-pane.tsx, no need to mock

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div>{children}</div>
}))

// Test helper to control active tab
function TestTabController({ children, activeTab }: { children: React.ReactNode; activeTab?: string }) {
  const { actions } = useDocumentCommunication()
  React.useEffect(() => {
    if (activeTab) actions.setActiveTab(activeTab)
  }, [activeTab, actions])
  return <>{children}</>
}

// ========== Core Rendering & Tabs (60 lines) ==========

describe('UnifiedLeftPane - Integration Tests', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'heading-1',
      content: 'Introduction to AI',
      tag_name: 'h1',
      parent_id: null,
      position: 0,
      attributes: {},
      document_id: 'doc-1',
      level: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'para-1',
      content: 'Machine learning is transforming industries',
      tag_name: 'p',
      parent_id: null,
      position: 1,
      attributes: {},
      document_id: 'doc-1',
      level: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]

  const defaultProps = {
    content: '<h1>Introduction to AI</h1><p>Machine learning is transforming industries</p>',
    elements: mockElements,
    documentId: 'doc-1',
    markdownContent: '# Introduction to AI\n\nMachine learning is transforming industries',
    headingVisibility: new Map([['heading-1', 'visible' as const]]),
    glossaryEntities: [],
    isLoadingGlossary: false,
    showGlossary: false,
    glossaryError: null,
    onHeadingClick: jest.fn(),
    onLoadGlossary: jest.fn(),
    documentContext: 'Document context for chat',
    glossaryCached: false,
    documentTitle: 'Test Document',
    documentCreatedAt: '2024-01-01T00:00:00Z',
    documentSourceUrl: 'https://example.com',
    aiHeadingsGenerated: false,
    summaryGenerated: false,
    glossaryGenerated: false,
    ownerEmail: 'test@example.com',
    isPublic: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = '<div id="document-viewer"></div>'
  })

  describe('Core Rendering & Tabs', () => {
    it('should render and display correct tab content based on context', async () => {
      // Test original tab (default)
      const { unmount: unmount1 } = renderWithProviders(
        <TestTabController activeTab="original">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      expect(screen.getByTestId('original-headings-tab')).toBeInTheDocument()
      unmount1()
      
      // Test search tab
      const { unmount: unmount2 } = renderWithProviders(
        <TestTabController activeTab="search">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      expect(screen.getByPlaceholderText('Search document...')).toBeInTheDocument()
      unmount2()
      
      // Test glossary tab  
      const { unmount: unmount3 } = renderWithProviders(
        <TestTabController activeTab="glossary">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      // The glossary auto-loads when tab is activated, so check for the glossary tab button
      expect(screen.getByRole('button', { name: 'Generate Glossary' })).toBeInTheDocument()
      unmount3()
      
      // Test chat tab
      const { unmount: unmount4 } = renderWithProviders(
        <TestTabController activeTab="chat">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      expect(screen.getByTestId('assistant-chat')).toBeInTheDocument()
      unmount4()
    })

    it('should handle heading clicks and navigation', async () => {
      renderWithProviders(
        <TestTabController activeTab="original">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      
      const headingButton = screen.getByText('Test Heading')
      fireEvent.click(headingButton)
      
      expect(defaultProps.onHeadingClick).toHaveBeenCalledWith('Test Heading', 'heading-1')
    })
  })

  // ========== Search Functionality (120 lines) ==========

  describe('Search Functionality', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should perform text search and display results', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <TestTabController activeTab="search">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'machine')
      
      // Should show search results  
      await waitFor(() => {
        expect(screen.getByText(/result.*found/i)).toBeInTheDocument()
      })
    })

    it('should toggle search options', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <TestTabController activeTab="search">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      
      // Click advanced options
      const advancedButton = screen.getByText('Advanced options')
      await user.click(advancedButton)
      
      // Should show case sensitive option
      expect(screen.getByText('Case sensitive')).toBeInTheDocument()
      
      // Toggle case sensitivity
      const caseSensitiveCheckbox = screen.getByRole('checkbox')
      await user.click(caseSensitiveCheckbox)
      expect(caseSensitiveCheckbox).toBeChecked()
    })

    it('should handle empty search results gracefully', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <TestTabController activeTab="search">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'nonexistentterm')
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument()
      })
    })

    it('should clear search and results', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <TestTabController activeTab="search">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      
      // Type search term
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, 'machine')
      
      // Clear search using X button
      const clearButton = screen.getByRole('button', { name: '' }) // X button has no text
      await user.click(clearButton)
      
      // Verify cleared
      expect(searchInput).toHaveValue('')
    })
  })

  // ========== Glossary Management (80 lines) ==========

  describe('Glossary Management', () => {
    const mockGlossaryEntities = [
      {
        name: 'Machine Learning',
        ontology: 'concept' as const,
        aliases: ['ML'],
        brief_explanation: 'A subset of AI that enables systems to learn from data'
      },
      {
        name: 'Neural Network',
        ontology: 'concept' as const,
        aliases: ['NN'],
        brief_explanation: 'Computing systems inspired by biological neural networks'
      }
    ]

    it('should load glossary when tab is activated', async () => {
      const onLoadGlossary = jest.fn()
      
      renderWithProviders(
        <TestTabController activeTab="glossary">
          <UnifiedLeftPane 
            {...defaultProps} 
            onLoadGlossary={onLoadGlossary}
          />
        </TestTabController>
      )
      
      // Should auto-load glossary when tab is activated
      await waitFor(() => {
        expect(onLoadGlossary).toHaveBeenCalled()
      })
    })

    it('should display glossary entities', () => {
      renderWithProviders(
        <TestTabController activeTab="glossary">
          <UnifiedLeftPane 
            {...defaultProps} 
            glossaryEntities={mockGlossaryEntities}
            showGlossary={true}
          />
        </TestTabController>
      )
      
      // Should display entities
      expect(screen.getByText('Machine Learning')).toBeInTheDocument()
      expect(screen.getByText('Neural Network')).toBeInTheDocument()
      
      // Should show count
      expect(screen.getByText('2 entries found')).toBeInTheDocument()
    })

    it('should handle glossary loading states', () => {
      renderWithProviders(
        <TestTabController activeTab="glossary">
          <UnifiedLeftPane 
            {...defaultProps} 
            isLoadingGlossary={true}
            showGlossary={true}
          />
        </TestTabController>
      )
      
      expect(screen.getByText('Analyzing Document')).toBeInTheDocument()
      expect(screen.getByText('Extracting key terms and concepts...')).toBeInTheDocument()
    })

    it('should display glossary error states', () => {
      renderWithProviders(
        <TestTabController activeTab="glossary">
          <UnifiedLeftPane 
            {...defaultProps} 
            glossaryError="Failed to load glossary"
            showGlossary={true}
          />
        </TestTabController>
      )
      
      expect(screen.getByText('Failed to load glossary')).toBeInTheDocument()
    })
  })

  // ========== Critical Edge Cases (50 lines) ==========

  describe('Critical Edge Cases', () => {
    it('should handle empty document gracefully', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps}
          content=""
          elements={[]}
          markdownContent=""
        />
      )
      
      expect(screen.getByTestId('original-headings-tab')).toBeInTheDocument()
    })

    it('should handle elements without content', () => {
      const elementsWithoutContent = [{
        ...mockElements[0],
        content: ''
      }]
      
      renderWithProviders(
        <TestTabController activeTab="original">
          <UnifiedLeftPane 
            {...defaultProps}
            elements={elementsWithoutContent}
          />
        </TestTabController>
      )
      
      expect(screen.getByTestId('original-headings-tab')).toBeInTheDocument()
    })

    it('should handle whitespace-only search queries', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <TestTabController activeTab="search">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      
      const searchInput = screen.getByPlaceholderText('Search document...')
      await user.type(searchInput, '   ')
      
      // Should not show "No results found" for whitespace
      expect(screen.queryByText(/no results found/i)).not.toBeInTheDocument()
    })
  })

  // ========== User Interactions (40 lines) ==========

  describe('User Interactions', () => {
    it('should auto-focus search input when search tab is activated', async () => {
      renderWithProviders(
        <TestTabController activeTab="search">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      
      // Wait for auto-focus (there's a 50ms delay in the component)
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search document...')
        expect(document.activeElement).toBe(searchInput)
      }, { timeout: 100 })
    })

    it('should handle tab switching properly', async () => {
      const { rerender } = renderWithProviders(
        <TestTabController activeTab="search">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      
      // Verify search tab is active
      expect(screen.getByPlaceholderText('Search document...')).toBeInTheDocument()
      
      // Switch to original tab
      rerender(
        <TestTabController activeTab="original">
          <UnifiedLeftPane {...defaultProps} />
        </TestTabController>
      )
      
      // Verify original tab is now active
      expect(screen.getByTestId('original-headings-tab')).toBeInTheDocument()
      // Search input still exists but should be hidden (display: none)
      const searchInput = screen.getByPlaceholderText('Search document...')
      expect(searchInput.closest('[style*="display: none"]')).toBeInTheDocument()
    })
  })
})