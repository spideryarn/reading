import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UnifiedLeftPane } from '../unified-left-pane';
import type { DocumentElement } from '@/lib/types/document';

// Mock the debounce utility with delay for loading state test
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }
}));

// Mock components
jest.mock('../tab-container', () => {
  const TabContainerComponent = React.forwardRef<any, any>(({ tabs, title, defaultTab, onTabChange, className }: any, ref) => {
    const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);
    
    const handleTabClick = (tabId: string) => {
      setActiveTab(tabId);
      const tab = tabs.find((t: any) => t.id === tabId);
      if (tab?.onActivate) tab.onActivate();
      if (onTabChange) onTabChange(tabId);
    };
    
    return (
      <div data-testid="tab-container" className={className}>
        {title && <h2>{title}</h2>}
        <div data-testid="tab-buttons">
          {tabs.map((tab: any) => (
            <button
              key={tab.id}
              data-testid={`tab-button-${tab.id}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div data-testid="active-tab-content">
          {tabs.find((tab: any) => tab.id === activeTab)?.content}
        </div>
      </div>
    );
  });
  
  return {
    TabContainer: TabContainerComponent,
    TabContainerRef: {}
  };
});

// Mock other components (simplified for edge case tests)
jest.mock('../table-of-contents-tabs', () => ({
  OriginalHeadingsTab: () => null,
  AIGeneratedHeadingsTab: () => null,
  DocumentSummaryTab: () => null
}));

jest.mock('../assistant-chat', () => ({
  AssistantChat: () => null
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/alert', () => ({
  AlertWithIcon: () => null
}));

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  CircleNotch: ({ className }: any) => (
    <span data-testid="icon-circle-notch" className={className} />
  ),
  MagnifyingGlass: () => <span data-testid="icon-magnifying-glass" />,
  X: () => <span data-testid="icon-x" />,
  Book: () => null,
  Question: () => null,
  Calendar: () => null,
  SidebarSimple: () => null,
  User: () => null,
  MapPin: () => null,
  Lightbulb: () => null,
  Star: () => null,
  Article: () => null,
  Cube: () => null,
  Buildings: () => null,
  Info: () => null,
  ArrowCounterClockwise: () => null
}));

describe('UnifiedLeftPane - Search Edge Cases', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'element-with-content',
      content: 'This is a normal element with content',
      tag_name: 'p',
      parent_id: null,
      position: 0,
      attributes: {},
      document_id: 'doc-1',
      level: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'element-empty',
      content: '',
      tag_name: 'div',
      parent_id: null,
      position: 1,
      attributes: {},
      document_id: 'doc-1',
      level: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'element-whitespace',
      content: '   \n\t  ',
      tag_name: 'div',
      parent_id: null,
      position: 2,
      attributes: {},
      document_id: 'doc-1',
      level: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'element-null',
      content: null as any,
      tag_name: 'div',
      parent_id: null,
      position: 3,
      attributes: {},
      document_id: 'doc-1',
      level: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  const defaultProps = {
    content: '<p>Test content</p>',
    elements: mockElements,
    documentId: 'doc-1',
    markdownContent: 'Test content',
    headingVisibility: new Map(),
    glossaryEntities: [],
    isLoadingGlossary: false,
    showGlossary: false,
    glossaryError: null,
    glossaryCached: false,
    onHeadingClick: jest.fn(),
    onLoadGlossary: jest.fn(),
    onScrollToEntity: jest.fn(),
    documentContext: 'Test context'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Elements without text content', () => {
    it('should skip elements with empty content', async () => {
      render(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'content' } });
      
      // Wait for debounce and search to complete
      act(() => {
        jest.advanceTimersByTime(300); // Debounce delay
        jest.advanceTimersByTime(150); // Search delay
      });
      
      await waitFor(() => {
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      });
      
      // Should only find the element with actual content
      const results = screen.getAllByText(/normal element/);
      expect(results).toHaveLength(1);
    });

    it('should skip elements with whitespace-only content', async () => {
      render(<UnifiedLeftPane {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      act(() => {
        jest.advanceTimersByTime(450);
      });
      
      // No results should be found in whitespace-only elements
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      });
    });

    it('should skip elements with null content', async () => {
      render(<UnifiedLeftPane {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'normal' } });
      
      act(() => {
        jest.advanceTimersByTime(450);
      });
      
      await waitFor(() => {
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      });
    });
  });

  describe('Whitespace-only queries', () => {
    it('should handle whitespace-only search query', async () => {
      render(<UnifiedLeftPane {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      
      // Type whitespace-only query
      fireEvent.change(searchInput, { target: { value: '   ' } });
      
      act(() => {
        jest.advanceTimersByTime(450);
      });
      
      // Should not show "No results found" for whitespace query
      expect(screen.queryByText('No results found')).not.toBeInTheDocument();
      expect(screen.queryByText(/\d+ results? found/)).not.toBeInTheDocument();
    });

    it('should handle tabs and newlines in search query', async () => {
      render(<UnifiedLeftPane {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      
      // Type query with only tabs and newlines
      fireEvent.change(searchInput, { target: { value: '\t\n\t' } });
      
      act(() => {
        jest.advanceTimersByTime(450);
      });
      
      // Should treat as empty query
      expect(screen.queryByText('No results found')).not.toBeInTheDocument();
      expect(screen.queryByText(/\d+ results? found/)).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner while searching', async () => {
      render(<UnifiedLeftPane {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Advance past debounce but not search delay
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // Loading state should be visible
      await waitFor(() => {
        expect(screen.getByTestId('icon-circle-notch')).toBeInTheDocument();
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });
      
      // Advance to complete search
      act(() => {
        jest.advanceTimersByTime(150);
      });
      
      await waitFor(() => {
        expect(screen.queryByTestId('icon-circle-notch')).not.toBeInTheDocument();
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      });
    });

    it('should not show loading state for empty query', async () => {
      render(<UnifiedLeftPane {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Clear the query
      fireEvent.change(searchInput, { target: { value: '' } });
      
      act(() => {
        jest.advanceTimersByTime(450);
      });
      
      // Should never show loading state for empty query
      expect(screen.queryByTestId('icon-circle-notch')).not.toBeInTheDocument();
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });

    it('should clear loading state when clear button is clicked', async () => {
      render(<UnifiedLeftPane {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Advance to show loading state
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('icon-circle-notch')).toBeInTheDocument();
      });
      
      // Click clear button while loading
      const clearButton = screen.getByTestId('icon-x').parentElement;
      fireEvent.click(clearButton!);
      
      // Loading state should be cleared immediately
      expect(screen.queryByTestId('icon-circle-notch')).not.toBeInTheDocument();
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
  });

  describe('Search result text excerpts', () => {
    it('should handle very long element text correctly', async () => {
      const longText = 'A'.repeat(200);
      const longElements: DocumentElement[] = [{
        id: 'long-element',
        content: longText,
        tag_name: 'p',
        parent_id: null,
        position: 0,
        attributes: {},
        document_id: 'doc-1',
        level: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      render(<UnifiedLeftPane {...defaultProps} elements={longElements} />);
      
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'A' } });
      
      act(() => {
        jest.advanceTimersByTime(450);
      });
      
      await waitFor(() => {
        const excerpt = screen.getByText(/A{100}\.\.\./, { exact: false });
        expect(excerpt).toBeInTheDocument();
        // Verify truncation with ellipsis
        expect(excerpt.textContent).toMatch(/\.\.\.$/);
        expect(excerpt.textContent?.length).toBeLessThan(110); // 100 chars + ellipsis
      });
    });
  });

  describe('Multiple rapid searches', () => {
    it('should handle rapid query changes correctly', async () => {
      render(<UnifiedLeftPane {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      
      // Rapid typing
      act(() => {
        fireEvent.change(searchInput, { target: { value: 'n' } });
        jest.advanceTimersByTime(100);
        fireEvent.change(searchInput, { target: { value: 'no' } });
        jest.advanceTimersByTime(100);
        fireEvent.change(searchInput, { target: { value: 'nor' } });
        jest.advanceTimersByTime(100);
        fireEvent.change(searchInput, { target: { value: 'norm' } });
        jest.advanceTimersByTime(100);
        fireEvent.change(searchInput, { target: { value: 'norma' } });
        jest.advanceTimersByTime(100);
        fireEvent.change(searchInput, { target: { value: 'normal' } });
      });
      
      // Only the last search should execute after debounce
      act(() => {
        jest.advanceTimersByTime(300 + 150);
      });
      
      await waitFor(() => {
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      });
    });
  });
});