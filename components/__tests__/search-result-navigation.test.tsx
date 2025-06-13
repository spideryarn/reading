import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './test-wrapper'
import '@testing-library/jest-dom'
import { UnifiedLeftPane } from '../unified-left-pane'
import { DocumentElement } from '@/lib/types/document'

// Mock Mark.js
const mockMark = jest.fn()
const mockUnmark = jest.fn()
jest.mock('mark.js', () => {
  return jest.fn().mockImplementation(() => ({
    mark: mockMark,
    unmark: mockUnmark
  }))
})

// Mock resizable panels
jest.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div />
}))

// Mock phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  MagnifyingGlass: () => <div>MagnifyingGlass</div>,
  X: () => <div>X</div>,
  CircleNotch: () => <div>CircleNotch</div>,
  Funnel: () => <div>Funnel</div>,
  StackSimple: () => <div>StackSimple</div>,
  ChatCircle: () => <div>ChatCircle</div>,
  FileText: () => <div>FileText</div>,
  Tree: () => <div>Tree</div>,
  Magic: () => <div>Magic</div>,
  List: () => <div>List</div>,
  CaretDown: () => <div>CaretDown</div>,
  SidebarSimple: () => <div>SidebarSimple</div>
}))

// Mock the table-of-contents-tabs to avoid infinite loop issues
jest.mock('../table-of-contents-tabs', () => ({
  OriginalHeadingsTab: () => <div>OriginalHeadingsTab</div>,
  AIGeneratedHeadingsTab: () => <div>AIGeneratedHeadingsTab</div>,
  DocumentSummaryTab: () => <div>DocumentSummaryTab</div>
}))

// Mock scrollIntoView
const mockScrollIntoView = jest.fn()
Element.prototype.scrollIntoView = mockScrollIntoView

describe('Search Result Navigation', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'elem-1',
      tag_name: 'p',
      content: 'This is a test paragraph with search terms.',
      position: 1,
      attributes: {}
    },
    {
      id: 'elem-2',
      tag_name: 'h2',
      content: 'Another heading with search content',
      position: 2,
      attributes: {}
    }
  ]

  const mockOnHeadingClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockScrollIntoView.mockClear()
    
    // Reset DOM
    document.body.innerHTML = ''
  })

  test('clicking search result scrolls to element and highlights first match', async () => {
    // Create a mock document structure
    document.body.innerHTML = `
      <div id="document-viewer">
        <p id="elem-1" data-element-id="elem-1" data-element-tag="p">
          This is a test paragraph with <mark class="search-highlight">search</mark> terms.
        </p>
        <h2 id="elem-2" data-element-id="elem-2" data-element-tag="h2">
          Another heading with <mark class="search-highlight">search</mark> content
        </h2>
      </div>
    `

    renderWithProviders(
        <UnifiedLeftPane
          content="<p>Test content</p>"
          elements={mockElements}
          onHeadingClick={mockOnHeadingClick}
          documentId="test-doc"
          markdownContent=""
          glossaryEntities={[]}
          isLoadingGlossary={false}
          showGlossary={false}
          glossaryError={null}
          glossaryCached={false}
          onLoadGlossary={() => {}}
        />
    )

    // Simulate search
    const searchInput = screen.getByPlaceholderText('Search document...')
    fireEvent.change(searchInput, { target: { value: 'search' } })

    // Mock Mark.js callback to simulate finding results
    mockMark.mockImplementation((query, options) => {
      // Simulate finding matches
      const elem1 = document.getElementById('elem-1')
      const elem2 = document.getElementById('elem-2')
      
      if (elem1) options.each(elem1.querySelector('.search-highlight'))
      if (elem2) options.each(elem2.querySelector('.search-highlight'))
      
      options.done()
    })

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText(/2 results found/)).toBeInTheDocument()
    })

    // Get the first search result
    const searchResults = screen.getAllByText(/This is a test paragraph/)
    expect(searchResults).toHaveLength(1)

    // Click the first result
    fireEvent.click(searchResults[0].closest('div[class*="cursor-pointer"]')!)

    // Verify onHeadingClick was called
    expect(mockOnHeadingClick).toHaveBeenCalledWith(
      expect.stringContaining('This is a test paragraph'),
      'elem-1'
    )

    // Wait for the delayed scroll behavior
    await waitFor(() => {
      const firstMark = document.querySelector('#elem-1 .search-highlight')
      expect(firstMark).toHaveClass('search-highlight-active')
    })

    // Verify scrollIntoView was called on the specific mark
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center'
    })
  })

  test('handles search results with multiple matches in same element', async () => {
    // Create element with multiple matches
    document.body.innerHTML = `
      <div id="document-viewer">
        <p id="elem-1" data-element-id="elem-1" data-element-tag="p">
          This test has multiple test occurrences of test.
          <mark class="search-highlight">test</mark>
          <mark class="search-highlight">test</mark>
          <mark class="search-highlight">test</mark>
        </p>
      </div>
    `

    renderWithProviders(
        <UnifiedLeftPane
          content="<p>Test content</p>"
          elements={[{
            id: 'elem-1',
            tag_name: 'p',
            content: 'This test has multiple test occurrences of test.',
            position: 1,
            attributes: {}
          }]}
          onHeadingClick={mockOnHeadingClick}
          documentId="test-doc"
          markdownContent=""
          glossaryEntities={[]}
          isLoadingGlossary={false}
          showGlossary={false}
          glossaryError={null}
          glossaryCached={false}
          onLoadGlossary={() => {}}
        />
    )

    // Simulate search
    const searchInput = screen.getByPlaceholderText('Search document...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    // Mock Mark.js to report 3 matches
    mockMark.mockImplementation((query, options) => {
      const marks = document.querySelectorAll('.search-highlight')
      marks.forEach(mark => options.each(mark))
      options.done()
    })

    // Wait for results showing match count
    await waitFor(() => {
      expect(screen.getByText('3 matches')).toBeInTheDocument()
    })

    // Click the result
    const searchResult = screen.getByText(/This test has multiple/)
    fireEvent.click(searchResult.closest('div[class*="cursor-pointer"]')!)

    // Verify it scrolls to the FIRST match
    await waitFor(() => {
      const firstMark = document.querySelector('#elem-1 .search-highlight')
      expect(firstMark).toHaveClass('search-highlight-active')
    })
  })

  test('active highlight is removed after animation', async () => {
    jest.useFakeTimers()

    document.body.innerHTML = `
      <div id="document-viewer">
        <p id="elem-1" data-element-id="elem-1">
          <mark class="search-highlight">test</mark>
        </p>
      </div>
    `

    renderWithProviders(
        <UnifiedLeftPane
          content="<p>Test content</p>"
          elements={mockElements}
          onHeadingClick={mockOnHeadingClick}
          documentId="test-doc"
          markdownContent=""
          glossaryEntities={[]}
          isLoadingGlossary={false}
          showGlossary={false}
          glossaryError={null}
          glossaryCached={false}
          onLoadGlossary={() => {}}
        />
    )

    const searchInput = screen.getByPlaceholderText('Search document...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    mockMark.mockImplementation((query, options) => {
      const mark = document.querySelector('.search-highlight')
      if (mark) options.each(mark)
      options.done()
    })

    await waitFor(() => {
      expect(screen.getByText(/1 result found/)).toBeInTheDocument()
    })

    const searchResult = screen.getByRole('generic', { name: '' }).parentElement
    const clickableResult = Array.from(searchResult?.querySelectorAll('div') || [])
      .find(div => div.className.includes('cursor-pointer'))
    
    fireEvent.click(clickableResult!)

    // Fast-forward past the initial delay
    jest.advanceTimersByTime(100)

    const mark = document.querySelector('.search-highlight')
    expect(mark).toHaveClass('search-highlight-active')

    // Fast-forward past the removal timeout
    jest.advanceTimersByTime(2000)

    expect(mark).not.toHaveClass('search-highlight-active')

    jest.useRealTimers()
  })
})