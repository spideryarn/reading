/**
 * Layout Components Integration Tests
 * 
 * Tests component interactions in document layout context.
 * Consolidates app header and tab container unit tests into 
 * integrated layout scenarios.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { AppHeader } from '@/components/app-header'
import { TabContainer } from '@/components/tab-container'
import { DocumentData } from '@/lib/types/document'

// Mock Next.js navigation
const mockBack = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
    refresh: jest.fn()
  })
}))

// Mock document for testing
const mockDocument: DocumentData = {
  id: 'test-doc-123',
  title: 'Sample Research Paper on AI',
  slug: 'sample-research-paper-ai',
  html_content: '<h1>AI Research</h1><p>Content about AI research...</p>',
  plaintext_content: 'AI Research Content about AI research...',
  word_count: 150,
  created_at: '2023-01-01T00:00:00Z',
  created_by: 'user-123',
  is_public: true,
  upload_metadata: null,
  upload_ai_call_id: null
}

// Mock tab content components
function MockTabContent({ tabId }: { tabId: string }) {
  return <div data-testid={`tab-content-${tabId}`}>Content for {tabId}</div>
}

const mockTabs = [
  { id: 'toc', label: 'Table of Contents', icon: 'List' as const },
  { id: 'glossary', label: 'Glossary', icon: 'BookOpen' as const },
  { id: 'summary', label: 'Summary', icon: 'Note' as const },
  { id: 'tools', label: 'Tools', icon: 'Wrench' as const }
]

describe('Layout Components Integration', () => {
  beforeEach(() => {
    mockBack.mockClear()
  })

  describe('App Header in Document Context', () => {
    it('should render header with document navigation', () => {
      render(<AppHeader document={mockDocument} />)

      // Should show back navigation
      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toBeInTheDocument()

      // Should display document title
      expect(screen.getByText('Sample Research Paper on AI')).toBeInTheDocument()
      
      // Should have accessible navigation
      expect(backButton).toHaveAttribute('aria-label', expect.stringContaining('Back'))
    })

    it('should handle back navigation flow', () => {
      render(<AppHeader document={mockDocument} />)

      // Click back button
      const backButton = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backButton)

      // Should trigger router.back()
      expect(mockBack).toHaveBeenCalledTimes(1)
    })

    it('should display document metadata when available', () => {
      const documentWithMetadata = {
        ...mockDocument,
        word_count: 1250,
        created_at: '2023-06-15T10:30:00Z'
      }

      render(<AppHeader document={documentWithMetadata} />)

      // Should show document title prominently
      expect(screen.getByText('Sample Research Paper on AI')).toBeInTheDocument()
      
      // Header should be accessible and semantic
      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })
  })

  describe('Tab Container Document Layout', () => {
    it('should manage document pane switching', () => {
      render(
        <TabContainer tabs={mockTabs} activeTab="toc">
          {mockTabs.map(tab => (
            <MockTabContent key={tab.id} tabId={tab.id} />
          ))}
        </TabContainer>
      )

      // Should render tab navigation
      expect(screen.getByRole('button', { name: /table of contents/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /glossary/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /summary/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /tools/i })).toBeInTheDocument()

      // Should show active tab content
      expect(screen.getByTestId('tab-content-toc')).toBeInTheDocument()
      
      // Should not show inactive tab content
      expect(screen.queryByTestId('tab-content-glossary')).not.toBeInTheDocument()
    })

    it('should preserve state across tab changes', () => {
      const { rerender } = render(
        <TabContainer tabs={mockTabs} activeTab="toc">
          {mockTabs.map(tab => (
            <MockTabContent key={tab.id} tabId={tab.id} />
          ))}
        </TabContainer>
      )

      // Initially showing ToC
      expect(screen.getByTestId('tab-content-toc')).toBeInTheDocument()

      // Switch to glossary tab
      rerender(
        <TabContainer tabs={mockTabs} activeTab="glossary">
          {mockTabs.map(tab => (
            <MockTabContent key={tab.id} tabId={tab.id} />
          ))}
        </TabContainer>
      )

      // Should now show glossary content
      expect(screen.getByTestId('tab-content-glossary')).toBeInTheDocument()
      expect(screen.queryByTestId('tab-content-toc')).not.toBeInTheDocument()

      // Switch to summary tab
      rerender(
        <TabContainer tabs={mockTabs} activeTab="summary">
          {mockTabs.map(tab => (
            <MockTabContent key={tab.id} tabId={tab.id} />
          ))}
        </TabContainer>
      )

      // Should show summary content
      expect(screen.getByTestId('tab-content-summary')).toBeInTheDocument()
      expect(screen.queryByTestId('tab-content-glossary')).not.toBeInTheDocument()
    })

    it('should maintain accessible tab interface', () => {
      render(
        <TabContainer tabs={mockTabs} activeTab="glossary">
          {mockTabs.map(tab => (
            <MockTabContent key={tab.id} tabId={tab.id} />
          ))}
        </TabContainer>
      )

      // Should have proper ARIA structure
      const tabList = screen.getByRole('tablist')
      expect(tabList).toBeInTheDocument()

      // All tabs should be in tab list
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)

      // Active tab should be properly marked
      const activeTab = screen.getByRole('tab', { name: /glossary/i })
      expect(activeTab).toHaveAttribute('aria-selected', 'true')

      // Inactive tabs should not be selected
      const inactiveTab = screen.getByRole('tab', { name: /table of contents/i })
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false')

      // Should have associated tab panel
      const tabPanel = screen.getByRole('tabpanel')
      expect(tabPanel).toBeInTheDocument()
    })
  })

  describe('Integrated Layout Workflow', () => {
    it('should handle complete document navigation workflow', () => {
      // Render complete layout with header and tabs
      render(
        <div>
          <AppHeader document={mockDocument} />
          <TabContainer tabs={mockTabs} activeTab="toc">
            {mockTabs.map(tab => (
              <MockTabContent key={tab.id} tabId={tab.id} />
            ))}
          </TabContainer>
        </div>
      )

      // Should render document title in header
      expect(screen.getByText('Sample Research Paper on AI')).toBeInTheDocument()

      // Should render tab navigation
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getAllByRole('tab')).toHaveLength(4)

      // Should show initial tab content
      expect(screen.getByTestId('tab-content-toc')).toBeInTheDocument()

      // Back navigation should still work
      const backButton = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backButton)
      expect(mockBack).toHaveBeenCalledTimes(1)
    })

    it('should maintain responsive layout structure', () => {
      render(
        <div className="document-layout">
          <AppHeader document={mockDocument} />
          <main className="document-main">
            <TabContainer tabs={mockTabs} activeTab="summary">
              {mockTabs.map(tab => (
                <MockTabContent key={tab.id} tabId={tab.id} />
              ))}
            </TabContainer>
          </main>
        </div>
      )

      // Should have semantic HTML structure
      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('main')).toBeInTheDocument()  // main content
      expect(screen.getByRole('tablist')).toBeInTheDocument() // navigation

      // Should show appropriate content
      expect(screen.getByTestId('tab-content-summary')).toBeInTheDocument()

      // All components should coexist properly
      expect(screen.getByText('Sample Research Paper on AI')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /summary/i })).toHaveAttribute('aria-selected', 'true')
    })
  })
})