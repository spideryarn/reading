import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './test-wrapper'
import { UnifiedLeftPane } from '../unified-left-pane'
import React from 'react'

// Mock debounce to execute immediately
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any) => fn
}))

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  CircleNotch: ({ className }: any) => <div className={className}>Loading</div>,
  Book: () => <div>Book</div>,
  Question: () => <div>Question</div>,
  Calendar: () => <div>Calendar</div>,
  SidebarSimple: () => <div>Sidebar</div>,
  ArrowCounterClockwise: () => <div>Reset</div>,
  User: () => <div>User</div>,
  MapPin: () => <div>MapPin</div>,
  Lightbulb: () => <div>Lightbulb</div>,
  Star: () => <div>Star</div>,
  Article: () => <div>Article</div>,
  Cube: () => <div>Cube</div>,
  Buildings: () => <div>Buildings</div>,
  Info: () => <div>Info</div>,
  MagnifyingGlass: () => <div>Search</div>,
  X: () => <div>X</div>,
  CaretDown: ({ className }: any) => <div className={className} data-testid="caret-down">CaretDown</div>
}))

// Mock AssistantChat component
jest.mock('../assistant-chat', () => ({
  AssistantChat: () => <div>Chat Component</div>
}))

// Mock MutationProvider and useMutation
jest.mock('@/lib/context/mutation-context', () => ({
  MutationProvider: ({ children }: any) => children,
  useMutation: () => ({
    documentId: 'test-doc',
    activeHeadingMutation: null,
    mutations: [],
    createHeadingMutation: jest.fn(),
    applyMutation: jest.fn(),
    revertMutation: jest.fn(),
    hasMutation: jest.fn(),
    getMutation: jest.fn(),
    getActiveMutations: jest.fn(),
    document: { elements: [] }
  }),
  useActiveMutationType: () => null
}))

// Mock Mark.js
const mockMark = jest.fn()
const mockUnmark = jest.fn()

jest.mock('mark.js', () => {
  const MarkMock = jest.fn().mockImplementation(() => ({
    mark: mockMark,
    unmark: mockUnmark
  }))
  return MarkMock
})

const mockProps = {
  content: 'Test content',
  elements: [],
  documentId: 'test-doc',
  markdownContent: '# Test',
  headingVisibility: {},
  glossaryEntities: [],
  isLoadingGlossary: false,
  showGlossary: false,
  glossaryError: null,
  glossaryCached: false,
  onHeadingClick: jest.fn(),
  onLoadGlossary: jest.fn(),
  onResetGlossary: jest.fn(),
  onScrollToEntity: jest.fn(),
  documentContext: {},
  onToggleCollapse: jest.fn()
}

describe('UnifiedLeftPane - UI Enhancements', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock document.getElementById for Mark.js
    document.getElementById = jest.fn().mockReturnValue(document.createElement('div'))
  })

  describe('Auto-focus search input', () => {
    it('should auto-focus search input when Search tab is clicked', async () => {
      renderWithProviders(<UnifiedLeftPane {...mockProps} />)
      
      // Find and click the Search tab
      const searchTab = screen.getByRole('tab', { name: 'Search' })
      fireEvent.click(searchTab)
      
      // Wait for the timeout to execute
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search document...')
        expect(document.activeElement).toBe(searchInput)
      }, { timeout: 100 })
    })
  })

  describe('Pinned search input', () => {
    it('should keep search input visible with sticky positioning', () => {
      renderWithProviders(<UnifiedLeftPane {...mockProps} />)
      
      // Click the Search tab
      const searchTab = screen.getByRole('tab', { name: 'Search' })
      fireEvent.click(searchTab)
      
      // Check that the search input container has sticky positioning
      const searchInput = screen.getByPlaceholderText('Search document...')
      const searchContainer = searchInput.closest('.sticky')
      
      expect(searchContainer).toBeInTheDocument()
      expect(searchContainer).toHaveClass('sticky', 'top-0', 'z-10')
    })
  })

  describe('Case sensitivity option', () => {
    it('should show advanced options when clicked', () => {
      renderWithProviders(<UnifiedLeftPane {...mockProps} />)
      
      // Click the Search tab
      const searchTab = screen.getByRole('tab', { name: 'Search' })
      fireEvent.click(searchTab)
      
      // Initially, case sensitive checkbox should not be visible
      expect(screen.queryByLabelText('Case sensitive')).not.toBeInTheDocument()
      
      // Click advanced options
      const advancedOptionsButton = screen.getByText('Advanced options')
      fireEvent.click(advancedOptionsButton)
      
      // Now case sensitive checkbox should be visible
      expect(screen.getByLabelText('Case sensitive')).toBeInTheDocument()
    })

    it('should toggle case sensitivity option', () => {
      renderWithProviders(<UnifiedLeftPane {...mockProps} />)
      
      // Click the Search tab
      const searchTab = screen.getByRole('tab', { name: 'Search' })
      fireEvent.click(searchTab)
      
      // Open advanced options
      const advancedOptionsButton = screen.getByText('Advanced options')
      fireEvent.click(advancedOptionsButton)
      
      // Check the checkbox
      const caseSensitiveCheckbox = screen.getByLabelText('Case sensitive')
      expect(caseSensitiveCheckbox).not.toBeChecked()
      
      fireEvent.click(caseSensitiveCheckbox)
      expect(caseSensitiveCheckbox).toBeChecked()
    })

    it('should rotate caret icon when advanced options are toggled', () => {
      renderWithProviders(<UnifiedLeftPane {...mockProps} />)
      
      // Click the Search tab
      const searchTab = screen.getByRole('tab', { name: 'Search' })
      fireEvent.click(searchTab)
      
      const caretIcon = screen.getByTestId('caret-down')
      expect(caretIcon).not.toHaveClass('rotate-180')
      
      // Click advanced options
      const advancedOptionsButton = screen.getByText('Advanced options')
      fireEvent.click(advancedOptionsButton)
      
      expect(caretIcon).toHaveClass('rotate-180')
    })

    it('should re-run search when case sensitivity changes', async () => {
      renderWithProviders(<UnifiedLeftPane {...mockProps} />)
      
      // Click the Search tab
      const searchTab = screen.getByRole('tab', { name: 'Search' })
      fireEvent.click(searchTab)
      
      // Type a search query
      const searchInput = screen.getByPlaceholderText('Search document...')
      fireEvent.change(searchInput, { target: { value: 'test' } })
      
      // Clear previous mock calls
      mockMark.mockClear()
      
      // Open advanced options and toggle case sensitivity
      const advancedOptionsButton = screen.getByText('Advanced options')
      fireEvent.click(advancedOptionsButton)
      
      const caseSensitiveCheckbox = screen.getByLabelText('Case sensitive')
      fireEvent.click(caseSensitiveCheckbox)
      
      // Should trigger a new search with caseSensitive: true
      await waitFor(() => {
        expect(mockMark).toHaveBeenCalledWith('test', expect.objectContaining({
          caseSensitive: true
        }))
      })
    })
  })

  describe('Advanced options container', () => {
    it('should style advanced options container correctly', () => {
      renderWithProviders(<UnifiedLeftPane {...mockProps} />)
      
      // Click the Search tab
      const searchTab = screen.getByRole('tab', { name: 'Search' })
      fireEvent.click(searchTab)
      
      // Open advanced options
      const advancedOptionsButton = screen.getByText('Advanced options')
      fireEvent.click(advancedOptionsButton)
      
      // Check styling of the container
      const caseSensitiveCheckbox = screen.getByLabelText('Case sensitive')
      const optionsContainer = caseSensitiveCheckbox.closest('.bg-gray-50')
      
      expect(optionsContainer).toHaveClass('bg-gray-50', 'rounded-lg', 'border', 'border-gray-200')
    })
  })
})