/**
 * Test for glossary highlight persistence bug
 * 
 * This test demonstrates the issue where glossary highlights disappear
 * when users interact with the document (clicking elements, switching tabs).
 * 
 * Expected: Highlights should persist during all interactions
 * Actual: Highlights disappear due to React re-renders from context updates
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SimpleDocumentViewer } from '../simple-document-viewer'
import { DocumentCommunicationProvider } from '@/lib/context/document-communication-context'
import type { DocumentElement } from '@/lib/types/document'
import type { Entity } from '@/lib/types/document'

// Mock Mark.js
const mockMark = jest.fn()
const mockUnmark = jest.fn()

jest.mock('mark.js', () => {
  return jest.fn().mockImplementation(() => ({
    mark: mockMark,
    unmark: mockUnmark
  }))
})

describe('Glossary Highlight Persistence', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'p1',
      type: 'text',
      tag_name: 'p',
      content: 'This document discusses artificial intelligence and machine learning concepts.',
      position: 0,
      parent_id: null,
      document_id: 'doc1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: {}
    },
    {
      id: 'p2', 
      type: 'text',
      tag_name: 'p',
      content: 'AI systems use neural networks for pattern recognition.',
      position: 1,
      parent_id: null,
      document_id: 'doc1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: {}
    }
  ]

  const mockGlossaryEntities: Entity[] = [
    {
      name: 'artificial intelligence',
      ontology: 'concept',
      aliases: ['AI'],
      brief_explanation: 'Computer systems that can perform tasks requiring human intelligence'
    },
    {
      name: 'machine learning',
      ontology: 'concept', 
      aliases: ['ML'],
      brief_explanation: 'Systems that learn from data without explicit programming'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset Mark.js mock counts
    mockMark.mockClear()
    mockUnmark.mockClear()
  })

  it('should maintain glossary highlights when clicking document elements', async () => {
    const handleElementClick = jest.fn()
    
    const { rerender } = render(
      <DocumentCommunicationProvider>
        <SimpleDocumentViewer
          elements={mockElements}
          glossaryEntities={mockGlossaryEntities}
          onElementClick={handleElementClick}
        />
      </DocumentCommunicationProvider>
    )

    // Wait for initial highlights to be applied
    await waitFor(() => {
      expect(mockMark).toHaveBeenCalledWith(
        expect.arrayContaining(['artificial intelligence', 'AI', 'machine learning', 'ML']),
        expect.any(Object)
      )
    })

    const initialMarkCallCount = mockMark.mock.calls.length
    const initialUnmarkCallCount = mockUnmark.mock.calls.length

    // Click on a document element
    const firstParagraph = screen.getByText(/This document discusses/i)
    fireEvent.click(firstParagraph)

    // The click handler should be called
    expect(handleElementClick).toHaveBeenCalled()

    // FAILING TEST: Highlights should still be present (Mark.js should not be called again)
    // In the current implementation, this will fail because:
    // 1. Click triggers context state update
    // 2. Context update causes SimpleDocumentViewer to re-render
    // 3. Re-render removes Mark.js highlights from DOM
    // 4. useEffect doesn't re-run (dependencies haven't changed)
    // 5. Result: highlights are gone
    
    // Wait a bit to ensure any re-renders have completed
    await waitFor(() => {
      // Highlights should NOT be unmarked
      expect(mockUnmark.mock.calls.length).toBe(initialUnmarkCallCount)
      
      // Mark should NOT be called again (highlights should persist)
      expect(mockMark.mock.calls.length).toBe(initialMarkCallCount)
    })

    // Additional check: Verify highlights are still in the DOM
    // This would require checking the actual DOM, which we can't easily mock
    // In a real Puppeteer test, we'd check for elements with .highlight-glossary class
  })

  it('should maintain glossary highlights when switching tabs', async () => {
    const TabSwitcher = () => {
      const [activeTab, setActiveTab] = React.useState('original')
      
      return (
        <DocumentCommunicationProvider>
          <div>
            <button onClick={() => setActiveTab('glossary')}>Switch to Glossary</button>
            <button onClick={() => setActiveTab('original')}>Switch to Original</button>
            <div>Active Tab: {activeTab}</div>
            <SimpleDocumentViewer
              elements={mockElements}
              glossaryEntities={mockGlossaryEntities}
            />
          </div>
        </DocumentCommunicationProvider>
      )
    }

    render(<TabSwitcher />)

    // Wait for initial highlights
    await waitFor(() => {
      expect(mockMark).toHaveBeenCalledWith(
        expect.arrayContaining(['artificial intelligence', 'AI', 'machine learning', 'ML']),
        expect.any(Object)
      )
    })

    const initialMarkCallCount = mockMark.mock.calls.length
    const initialUnmarkCallCount = mockUnmark.mock.calls.length

    // Switch tabs
    fireEvent.click(screen.getByText('Switch to Glossary'))
    
    // Wait for potential re-renders
    await waitFor(() => {
      expect(screen.getByText('Active Tab: glossary')).toBeInTheDocument()
    })

    // FAILING TEST: Highlights should persist through tab switches
    expect(mockUnmark.mock.calls.length).toBe(initialUnmarkCallCount)
    expect(mockMark.mock.calls.length).toBe(initialMarkCallCount)
  })

  it('should reapply highlights only when glossary entities actually change', async () => {
    const { rerender } = render(
      <DocumentCommunicationProvider>
        <SimpleDocumentViewer
          elements={mockElements}
          glossaryEntities={mockGlossaryEntities}
        />
      </DocumentCommunicationProvider>
    )

    // Wait for initial highlights
    await waitFor(() => {
      expect(mockMark).toHaveBeenCalled()
    })

    // Clear mock to track new calls
    mockMark.mockClear()
    mockUnmark.mockClear()

    // Re-render with same glossary entities
    rerender(
      <DocumentCommunicationProvider>
        <SimpleDocumentViewer
          elements={mockElements}
          glossaryEntities={mockGlossaryEntities}
        />
      </DocumentCommunicationProvider>
    )

    // Should NOT re-apply highlights (entities haven't changed)
    expect(mockUnmark).not.toHaveBeenCalled()
    expect(mockMark).not.toHaveBeenCalled()

    // Now change glossary entities
    const newEntities: Entity[] = [
      {
        name: 'neural networks',
        ontology: 'concept',
        aliases: [],
        brief_explanation: 'Computing systems inspired by biological neural networks'
      }
    ]

    rerender(
      <DocumentCommunicationProvider>
        <SimpleDocumentViewer
          elements={mockElements}
          glossaryEntities={newEntities}
        />
      </DocumentCommunicationProvider>
    )

    // Should re-apply highlights with new entities
    await waitFor(() => {
      expect(mockUnmark).toHaveBeenCalledWith({ className: 'highlight-glossary' })
      expect(mockMark).toHaveBeenCalledWith(
        expect.arrayContaining(['neural networks']),
        expect.any(Object)
      )
    })
  })
})