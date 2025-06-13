/**
 * Document Processing Integration Tests
 * 
 * Tests end-to-end document processing workflows including visibility tracking,
 * mutation generation, and document transformations. Consolidates multiple
 * unit tests into integration scenarios.
 */

import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { DocumentData } from '@/lib/types/document'
import { useMutation } from '@/lib/hooks/useMutation'
import { useElementVisibility } from '@/lib/hooks/useElementVisibility'
import { generateHeadingMutations } from '@/src/lib/services/heading-mutation-generator-simple'

// Mock document data for testing
const mockDocument: DocumentData = {
  id: 'test-doc-id',
  title: 'Test Document',
  slug: 'test-document',
  html_content: `
    <h1 id="heading-1">Main Title</h1>
    <p>Introduction paragraph</p>
    <h2 id="heading-2">Section One</h2>
    <p>Content for section one</p>
    <h2 id="heading-3">Section Two</h2>
    <p>Content for section two</p>
    <h3 id="heading-4">Subsection</h3>
    <p>Subsection content</p>
  `,
  plaintext_content: 'Main Title Introduction paragraph Section One Content for section one Section Two Content for section two Subsection Subsection content',
  word_count: 20,
  created_at: '2023-01-01T00:00:00Z',
  created_by: 'test-user-id',
  is_public: false,
  upload_metadata: null,
  upload_ai_call_id: null
}

// Mock components for testing integration
function TestDocumentViewer({ document }: { document: DocumentData }) {
  const { mutation, applyMutation, revertMutation } = useMutation()
  
  return (
    <div>
      <div data-testid="document-content" dangerouslySetInnerHTML={{ __html: document.html_content }} />
      <button 
        data-testid="apply-mutation"
        onClick={() => applyMutation(mockMutation)}
      >
        Apply Headings
      </button>
      <button 
        data-testid="revert-mutation" 
        onClick={() => revertMutation()}
        disabled={!mutation}
      >
        Revert Headings
      </button>
    </div>
  )
}

function TestVisibilityTracker() {
  const visibility = useElementVisibility(['heading-1', 'heading-2', 'heading-3', 'heading-4'])
  
  return (
    <div>
      {Object.entries(visibility).map(([id, isVisible]) => (
        <div key={id} data-testid={`visibility-${id}`}>
          {id}: {isVisible ? 'visible' : 'hidden'}
        </div>
      ))}
    </div>
  )
}

const mockMutation = {
  type: 'heading-enhancement' as const,
  changes: [
    {
      elementId: 'heading-1',
      operation: 'replace' as const,
      newContent: '<h1 id="heading-1">📚 Main Title</h1>'
    },
    {
      elementId: 'heading-2', 
      operation: 'replace' as const,
      newContent: '<h2 id="heading-2">🔍 Section One</h2>'
    }
  ]
}

describe('Document Processing Integration', () => {
  beforeEach(() => {
    // Mock IntersectionObserver for visibility tracking
    const mockIntersectionObserver = jest.fn()
    mockIntersectionObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    })
    window.IntersectionObserver = mockIntersectionObserver as any
  })

  describe('Visibility & Mutation Workflow', () => {
    it('should track heading visibility during mutations', async () => {
      render(
        <div>
          <TestDocumentViewer document={mockDocument} />
          <TestVisibilityTracker />
        </div>
      )

      // Verify initial document content is rendered
      expect(screen.getByTestId('document-content')).toBeInTheDocument()
      expect(screen.getByText('Main Title')).toBeInTheDocument()
      expect(screen.getByText('Section One')).toBeInTheDocument()

      // Verify visibility tracking elements are present
      expect(screen.getByTestId('visibility-heading-1')).toBeInTheDocument()
      expect(screen.getByTestId('visibility-heading-2')).toBeInTheDocument()

      // Apply mutation and verify content changes
      await act(async () => {
        screen.getByTestId('apply-mutation').click()
      })

      // Verify mutated content appears (with emoji enhancements)
      expect(screen.getByText('📚 Main Title')).toBeInTheDocument()
      expect(screen.getByText('🔍 Section One')).toBeInTheDocument()

      // Verify revert button becomes enabled
      expect(screen.getByTestId('revert-mutation')).not.toBeDisabled()

      // Revert mutation and verify original content returns
      await act(async () => {
        screen.getByTestId('revert-mutation').click()
      })

      expect(screen.getByText('Main Title')).toBeInTheDocument()
      expect(screen.queryByText('📚 Main Title')).not.toBeInTheDocument()
    })

    it('should apply heading mutations with real DOM updates', async () => {
      render(<TestDocumentViewer document={mockDocument} />)

      const documentContent = screen.getByTestId('document-content')
      
      // Verify initial DOM structure
      const initialHeading1 = documentContent.querySelector('#heading-1')
      const initialHeading2 = documentContent.querySelector('#heading-2')
      
      expect(initialHeading1?.textContent).toBe('Main Title')
      expect(initialHeading2?.textContent).toBe('Section One')

      // Apply mutations
      await act(async () => {
        screen.getByTestId('apply-mutation').click()
      })

      // Verify DOM was actually updated
      const updatedHeading1 = documentContent.querySelector('#heading-1')
      const updatedHeading2 = documentContent.querySelector('#heading-2')
      
      expect(updatedHeading1?.textContent).toBe('📚 Main Title')
      expect(updatedHeading2?.textContent).toBe('🔍 Section One')

      // Verify IDs are preserved for continued visibility tracking
      expect(updatedHeading1?.id).toBe('heading-1')
      expect(updatedHeading2?.id).toBe('heading-2')
    })
  })

  describe('End-to-End Document Transformation', () => {
    it('should generate, apply, and revert heading mutations', async () => {
      // Test the full workflow: generation → application → reversion
      
      // Step 1: Generate mutations from document content
      const generatedMutations = generateHeadingMutations(mockDocument.html_content, [
        { heading: 'Main Title', enhancement: '📚 Main Title' },
        { heading: 'Section One', enhancement: '🔍 Section One' },
        { heading: 'Section Two', enhancement: '📊 Section Two' }
      ])

      expect(generatedMutations).toHaveLength(3)
      expect(generatedMutations[0]).toMatchObject({
        elementId: 'heading-1',
        operation: 'replace',
        newContent: expect.stringContaining('📚 Main Title')
      })

      // Step 2: Apply mutations in component
      render(<TestDocumentViewer document={mockDocument} />)
      
      await act(async () => {
        screen.getByTestId('apply-mutation').click()
      })

      // Step 3: Verify transformation success
      expect(screen.getByText('📚 Main Title')).toBeInTheDocument()
      expect(screen.getByText('🔍 Section One')).toBeInTheDocument()

      // Step 4: Test revert functionality
      await act(async () => {
        screen.getByTestId('revert-mutation').click()
      })

      // Step 5: Verify complete restoration
      expect(screen.getByText('Main Title')).toBeInTheDocument()
      expect(screen.getByText('Section One')).toBeInTheDocument()
      expect(screen.queryByText('📚 Main Title')).not.toBeInTheDocument()
    })

    it('should maintain document integrity through transformations', async () => {
      render(<TestDocumentViewer document={mockDocument} />)
      
      const documentContent = screen.getByTestId('document-content')
      
      // Capture original structure
      const originalHeadings = documentContent.querySelectorAll('h1, h2, h3')
      const originalParagraphs = documentContent.querySelectorAll('p')
      
      expect(originalHeadings).toHaveLength(4) // h1, h2, h2, h3
      expect(originalParagraphs).toHaveLength(4) // 4 paragraphs

      // Apply and revert multiple times to test stability
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          screen.getByTestId('apply-mutation').click()
        })
        
        await act(async () => {
          screen.getByTestId('revert-mutation').click()
        })
      }

      // Verify document structure remains intact
      const finalHeadings = documentContent.querySelectorAll('h1, h2, h3')
      const finalParagraphs = documentContent.querySelectorAll('p')
      
      expect(finalHeadings).toHaveLength(4)
      expect(finalParagraphs).toHaveLength(4)
      
      // Verify content is exactly restored
      expect(screen.getByText('Main Title')).toBeInTheDocument()
      expect(screen.getByText('Section One')).toBeInTheDocument()
      expect(screen.getByText('Section Two')).toBeInTheDocument()
      expect(screen.getByText('Subsection')).toBeInTheDocument()
    })
  })
})