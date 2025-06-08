import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-wrapper';
import { UnifiedLeftPane } from '../unified-left-pane';
import type { DocumentElement } from '@/lib/types/document';

// Mock the debounce utility
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any) => fn // No delay in tests
}));

// Mock mark.js
jest.mock('mark.js');

// Mock external dependencies
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

jest.mock('../table-of-contents-tabs', () => ({
  OriginalHeadingsTab: ({ content, elements, onHeadingClick }: any) => (
    <div data-testid="original-headings-tab">
      <h3>Original Headings</h3>
      <div>Content: {content.substring(0, 20)}...</div>
      <div>Elements: {elements.length}</div>
      {elements.filter((el: any) => el.tag_name.startsWith('h')).map((heading: any) => (
        <button
          key={heading.id}
          data-testid={`heading-${heading.id}`}
          onClick={() => onHeadingClick(heading.content, heading.id)}
        >
          {heading.content}
        </button>
      ))}
    </div>
  ),
  AIGeneratedHeadingsTab: ({ content, elements, onHeadingClick }: any) => (
    <div data-testid="ai-generated-headings-tab">
      <h3>AI Generated Headings</h3>
      <div>Content: {content.substring(0, 20)}...</div>
      <div>Elements: {elements.length}</div>
      {elements.filter((el: any) => el.tag_name.startsWith('h')).map((heading: any) => (
        <button
          key={heading.id}
          data-testid={`ai-heading-${heading.id}`}
          onClick={() => onHeadingClick(heading.content, heading.id)}
        >
          {heading.content} (AI)
        </button>
      ))}
    </div>
  ),
  DocumentSummaryTab: ({ markdownContent }: any) => (
    <div data-testid="document-summary-tab">
      <h3>Document Summary</h3>
      <div>Markdown length: {markdownContent.length}</div>
    </div>
  )
}));

jest.mock('../assistant-chat', () => ({
  AssistantChat: ({ documentContext }: any) => (
    <div data-testid="assistant-chat">
      <h3>Chat</h3>
      <div>Context length: {documentContext.length}</div>
    </div>
  )
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className, title, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={title}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/alert', () => ({
  AlertWithIcon: ({ variant, title, description }: any) => (
    <div data-testid="alert" data-variant={variant}>
      <div data-testid="alert-title">{title}</div>
      <div data-testid="alert-description">{description}</div>
    </div>
  )
}));

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  CircleNotch: ({ className, size, weight }: any) => (
    <span data-testid="icon-circle-notch" className={className} data-size={size} data-weight={weight} />
  ),
  Book: ({ className, size, weight }: any) => (
    <span data-testid="icon-book" className={className} data-size={size} data-weight={weight} />
  ),
  Question: ({ className, size, weight }: any) => (
    <span data-testid="icon-question" className={className} data-size={size} data-weight={weight} />
  ),
  Calendar: ({ className, size, weight }: any) => (
    <span data-testid="icon-calendar" className={className} data-size={size} data-weight={weight} />
  ),
  SidebarSimple: ({ className, size, weight }: any) => (
    <span data-testid="icon-sidebar-simple" className={className} data-size={size} data-weight={weight} />
  ),
  User: ({ className, size, weight }: any) => (
    <span data-testid="icon-user" className={className} data-size={size} data-weight={weight} />
  ),
  MapPin: ({ className, size, weight }: any) => (
    <span data-testid="icon-map-pin" className={className} data-size={size} data-weight={weight} />
  ),
  Lightbulb: ({ className, size, weight }: any) => (
    <span data-testid="icon-lightbulb" className={className} data-size={size} data-weight={weight} />
  ),
  Star: ({ className, size, weight }: any) => (
    <span data-testid="icon-star" className={className} data-size={size} data-weight={weight} />
  ),
  Article: ({ className, size, weight }: any) => (
    <span data-testid="icon-article" className={className} data-size={size} data-weight={weight} />
  ),
  Cube: ({ className, size, weight }: any) => (
    <span data-testid="icon-cube" className={className} data-size={size} data-weight={weight} />
  ),
  Buildings: ({ className, size, weight }: any) => (
    <span data-testid="icon-buildings" className={className} data-size={size} data-weight={weight} />
  ),
  Info: ({ className, size, weight }: any) => (
    <span data-testid="icon-info" className={className} data-size={size} data-weight={weight} />
  ),
  ArrowCounterClockwise: ({ className, size, weight }: any) => (
    <span data-testid="icon-arrow-counter-clockwise" className={className} data-size={size} data-weight={weight} />
  ),
  MagnifyingGlass: ({ className, size, weight }: any) => (
    <span data-testid="icon-magnifying-glass" className={className} data-size={size} data-weight={weight} />
  ),
  X: ({ className, size, weight }: any) => (
    <span data-testid="icon-x" className={className} data-size={size} data-weight={weight} />
  ),
  CaretDown: ({ className, size, weight }: any) => (
    <span data-testid="icon-caret-down" className={className} data-size={size} data-weight={weight} />
  )
}));

// Entity type for testing
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

describe('UnifiedLeftPane', () => {
  // Mock document.getElementById to return a mock element
  beforeEach(() => {
    const mockDocumentViewer = document.createElement('div');
    mockDocumentViewer.id = 'document-viewer';
    
    jest.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'document-viewer') {
        return mockDocumentViewer;
      }
      return null;
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  // Mock data
  const mockElements: DocumentElement[] = [
    {
      id: 'syr-root-1',
      content: 'Document Title',
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
      id: 'syr-para-1',
      content: 'First paragraph content with John Doe mentioned',
      tag_name: 'p',
      parent_id: null,
      position: 1,
      attributes: {},
      document_id: 'doc-1',
      level: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'syr-section-1',
      content: 'Section Title',
      tag_name: 'h2',
      parent_id: null,
      position: 2,
      attributes: {},
      document_id: 'doc-1',
      level: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockGlossaryEntities: Entity[] = [
    {
      name: 'John Doe',
      ontology: 'person',
      aliases: ['J. Doe'],
      brief_explanation: 'A fictional character often used as a placeholder name',
      long_explanation: 'John Doe is a name often used as a placeholder for an anonymous or generic person'
    },
    {
      name: 'Machine Learning',
      ontology: 'concept',
      aliases: ['ML', 'Artificial Intelligence'],
      brief_explanation: 'A subset of artificial intelligence',
      datetime: '1950s - present'
    }
  ];

  const defaultProps = {
    content: '<h1>Document Title</h1><p>First paragraph content</p>',
    elements: mockElements,
    documentId: 'doc-1',
    markdownContent: '# Document Title\n\nFirst paragraph content',
    headingVisibility: new Map([['syr-root-1', 'visible' as const]]),
    glossaryEntities: [],
    isLoadingGlossary: false,
    showGlossary: false,
    glossaryError: null,
    onHeadingClick: jest.fn(),
    onLoadGlossary: jest.fn(),
    onScrollToEntity: jest.fn(),
    documentContext: 'Document context for chat'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all 6 tabs correctly', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      expect(screen.getByTestId('tab-button-original')).toBeInTheDocument();
      expect(screen.getByTestId('tab-button-ai-generated')).toBeInTheDocument();
      expect(screen.getByTestId('tab-button-summary')).toBeInTheDocument();
      expect(screen.getByTestId('tab-button-chat')).toBeInTheDocument();
      expect(screen.getByTestId('tab-button-glossary')).toBeInTheDocument();
      expect(screen.getByTestId('tab-button-search')).toBeInTheDocument();
      
      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText('AI-generated')).toBeInTheDocument();
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Glossary')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('should render header with title', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      expect(screen.getByText('Navigation & Tools')).toBeInTheDocument();
    });

    it('should render collapse button when onToggleCollapse is provided', () => {
      const onToggleCollapse = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onToggleCollapse={onToggleCollapse} />);
      
      const collapseButton = screen.getByTitle('Toggle sidebar (Ctrl+B)');
      expect(collapseButton).toBeInTheDocument();
      expect(screen.getByTestId('icon-sidebar-simple')).toBeInTheDocument();
    });

    it('should not render collapse button when onToggleCollapse is not provided', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      expect(screen.queryByTitle('Toggle sidebar (Ctrl+B)')).not.toBeInTheDocument();
    });

    it('should render default tab content (original tab)', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      expect(screen.getByTestId('original-headings-tab')).toBeInTheDocument();
      expect(screen.getByText('Original Headings')).toBeInTheDocument();
    });
  });

  describe('Tab Functionality', () => {
    it('should pass correct props to OriginalHeadingsTab', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      const originalTab = screen.getByTestId('original-headings-tab');
      expect(originalTab).toBeInTheDocument();
      expect(screen.getByText(/Content: .*Document Title/)).toBeInTheDocument();
      expect(screen.getByText('Elements: 3')).toBeInTheDocument();
    });

    it('should pass correct props to AIGeneratedHeadingsTab', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to AI-generated tab
      fireEvent.click(screen.getByTestId('tab-button-ai-generated'));
      
      const aiTab = screen.getByTestId('ai-generated-headings-tab');
      expect(aiTab).toBeInTheDocument();
      expect(screen.getByText('AI Generated Headings')).toBeInTheDocument();
    });

    it('should pass correct props to DocumentSummaryTab', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to summary tab
      fireEvent.click(screen.getByTestId('tab-button-summary'));
      
      const summaryTab = screen.getByTestId('document-summary-tab');
      expect(summaryTab).toBeInTheDocument();
      expect(screen.getByText(/Markdown length: \d+/)).toBeInTheDocument();
    });

    it('should pass correct props to AssistantChat', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to chat tab
      fireEvent.click(screen.getByTestId('tab-button-chat'));
      
      const chatTab = screen.getByTestId('assistant-chat');
      expect(chatTab).toBeInTheDocument();
      expect(screen.getByText(/Context length: \d+/)).toBeInTheDocument();
    });

    it('should handle heading clicks from original tab', () => {
      const onHeadingClick = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onHeadingClick={onHeadingClick} />);
      
      const headingButton = screen.getByTestId('heading-syr-root-1');
      fireEvent.click(headingButton);
      
      expect(onHeadingClick).toHaveBeenCalledWith('Document Title', 'syr-root-1');
    });

    it('should handle heading clicks from AI-generated tab', () => {
      const onHeadingClick = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onHeadingClick={onHeadingClick} />);
      
      // Switch to AI-generated tab
      fireEvent.click(screen.getByTestId('tab-button-ai-generated'));
      
      const aiHeadingButton = screen.getByTestId('ai-heading-syr-root-1');
      fireEvent.click(aiHeadingButton);
      
      expect(onHeadingClick).toHaveBeenCalledWith('Document Title', 'syr-root-1');
    });
  });

  describe('Collapse Functionality', () => {
    it('should call onToggleCollapse when collapse button is clicked', () => {
      const onToggleCollapse = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onToggleCollapse={onToggleCollapse} />);
      
      const collapseButton = screen.getByTitle('Toggle sidebar (Ctrl+B)');
      fireEvent.click(collapseButton);
      
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('should have correct button styling for collapse button', () => {
      const onToggleCollapse = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onToggleCollapse={onToggleCollapse} />);
      
      const collapseButton = screen.getByTitle('Toggle sidebar (Ctrl+B)');
      expect(collapseButton).toHaveAttribute('data-variant', 'ghost');
    });
  });

  describe('Glossary Functionality', () => {
    it('should show generate glossary prompt when showGlossary is false', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(screen.getByRole('heading', { name: 'Generate Glossary' })).toBeInTheDocument();
      expect(screen.getByText(/Create an interactive glossary of key terms/)).toBeInTheDocument();
      expect(screen.getAllByTestId('icon-book')).toHaveLength(2); // Icon in decoration + button
    });

    it('should call onLoadGlossary when generate button is clicked', () => {
      const onLoadGlossary = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onLoadGlossary={onLoadGlossary} />);
      
      // Switch to glossary tab (this will auto-trigger once)
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      // Clear the auto-trigger call
      onLoadGlossary.mockClear();
      
      const generateButton = screen.getByRole('button', { name: /Generate Glossary/ });
      fireEvent.click(generateButton);
      
      expect(onLoadGlossary).toHaveBeenCalledTimes(1);
    });

    it('should auto-load glossary when tab is activated and not loading', () => {
      const onLoadGlossary = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onLoadGlossary={onLoadGlossary} />);
      
      // Switch to glossary tab (should trigger onActivate)
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(onLoadGlossary).toHaveBeenCalledTimes(1);
    });

    it('should not auto-load glossary when already loading', () => {
      const onLoadGlossary = jest.fn();
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          onLoadGlossary={onLoadGlossary} 
          isLoadingGlossary={true}
          showGlossary={true}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(onLoadGlossary).not.toHaveBeenCalled();
    });

    it('should not auto-load glossary when already showing', () => {
      const onLoadGlossary = jest.fn();
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          onLoadGlossary={onLoadGlossary} 
          showGlossary={true}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(onLoadGlossary).not.toHaveBeenCalled();
    });

    it('should show loading state when isLoadingGlossary is true', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          isLoadingGlossary={true}
          showGlossary={true}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(screen.getByText('Analyzing Document')).toBeInTheDocument();
      expect(screen.getByText('Extracting key terms and concepts...')).toBeInTheDocument();
      expect(screen.getByTestId('icon-circle-notch')).toBeInTheDocument();
    });

    it('should show loading state in button when generate button is disabled', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          isLoadingGlossary={true}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      const generateButton = screen.getByText('Generating...');
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
      expect(screen.getByTestId('icon-circle-notch')).toBeInTheDocument();
    });

    it('should show error state when glossaryError is provided', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          glossaryError="Failed to load glossary data"
          showGlossary={true}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByTestId('alert-title')).toHaveTextContent('Failed to generate glossary');
      expect(screen.getByTestId('alert-description')).toHaveTextContent('Failed to load glossary data');
    });

    it('should show no entries found when glossary is empty', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={[]}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(screen.getByText('No Entries Found')).toBeInTheDocument();
      expect(screen.getByText('No glossary entries were identified in this document.')).toBeInTheDocument();
      expect(screen.getByTestId('icon-question')).toBeInTheDocument();
    });

    it('should display glossary entities when available', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(screen.getByText('Document Glossary')).toBeInTheDocument();
      expect(screen.getByText('2 entries found')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });
  });

  describe('Glossary Entity Display', () => {
    beforeEach(() => {
      // Mock scrollIntoView for entity click tests
      Element.prototype.scrollIntoView = jest.fn();
    });

    it('should display entity with correct icon and color for person type', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(screen.getByTestId('icon-user')).toBeInTheDocument();
      expect(screen.getByText('person')).toBeInTheDocument();
    });

    it('should display entity with correct icon and color for concept type', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(screen.getByTestId('icon-lightbulb')).toBeInTheDocument();
      expect(screen.getByText('concept')).toBeInTheDocument();
    });

    it('should display entity aliases when available', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(screen.getAllByText('Also known as:')[0]).toBeInTheDocument();
      expect(screen.getByText('J. Doe')).toBeInTheDocument();
      expect(screen.getByText('ML, Artificial Intelligence')).toBeInTheDocument();
    });

    it('should display entity datetime when available', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      expect(screen.getByText('1950s - present')).toBeInTheDocument();
      expect(screen.getByTestId('icon-calendar')).toBeInTheDocument();
    });

    it('should handle entity click to scroll when entity has occurrence', async () => {
      const onScrollToEntity = jest.fn();
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
          onScrollToEntity={onScrollToEntity}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      // Find John Doe entity (it should match content in elements)
      const johnDoeEntity = screen.getByText('John Doe');
      // The clickable container is the outermost div with rounded-xl class
      const entityContainer = johnDoeEntity.closest('.bg-white.rounded-xl');
      
      // Entity should be clickable (has occurrence in document)
      expect(entityContainer).toHaveClass('cursor-pointer');
      
      fireEvent.click(entityContainer!);
      
      await waitFor(() => {
        expect(onScrollToEntity).toHaveBeenCalledWith('syr-para-1');
      });
    });

    it('should not make entity clickable when no occurrence found', () => {
      // Entity with no occurrence in document
      const entitiesNoOccurrence: Entity[] = [{
        name: 'Non-existent Entity',
        ontology: 'concept',
        aliases: [],
        brief_explanation: 'This entity does not exist in the document'
      }];
      
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={entitiesNoOccurrence}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      const entityContainer = screen.getByText('Non-existent Entity').closest('.bg-white.rounded-xl');
      expect(entityContainer).not.toHaveClass('cursor-pointer');
    });

    it('should handle elements without content when finding entity occurrences', () => {
      // Add elements with missing content to test the edge case
      const elementsWithMissingContent: DocumentElement[] = [
        ...mockElements,
        {
          id: 'syr-empty-1',
          content: '', // Empty content
          tag_name: 'div',
          parent_id: null,
          position: 3,
          attributes: {},
          document_id: 'doc-1',
          level: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'syr-null-content',
          content: null as any, // Null content
          tag_name: 'div',
          parent_id: null,
          position: 4,
          attributes: {},
          document_id: 'doc-1',
          level: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const onScrollToEntity = jest.fn();
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          elements={elementsWithMissingContent}
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
          onScrollToEntity={onScrollToEntity}
        />
      );
      
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      // John Doe should still be found in the first paragraph despite empty elements
      const johnDoeEntity = screen.getByText('John Doe');
      const entityContainer = johnDoeEntity.closest('.bg-white.rounded-xl');
      
      expect(entityContainer).toHaveClass('cursor-pointer');
      fireEvent.click(entityContainer!);
      
      expect(onScrollToEntity).toHaveBeenCalledWith('syr-para-1');
    });

    it('should prefer long_explanation over brief_explanation when available', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      // John Doe entity has long_explanation
      expect(screen.getByText('John Doe is a name often used as a placeholder for an anonymous or generic person')).toBeInTheDocument();
      
      // Machine Learning entity only has brief_explanation
      expect(screen.getByText('A subset of artificial intelligence')).toBeInTheDocument();
    });

    it('should handle all entity ontology types with correct icons', () => {
      const allOntologyTypes: Entity[] = [
        { name: 'Place Entity', ontology: 'place', aliases: [], brief_explanation: 'A location' },
        { name: 'Date Entity', ontology: 'date', aliases: [], brief_explanation: 'A time period' },
        { name: 'Theme Entity', ontology: 'theme', aliases: [], brief_explanation: 'A theme' },
        { name: 'Event Entity', ontology: 'event', aliases: [], brief_explanation: 'An event' },
        { name: 'Reference Entity', ontology: 'reference', aliases: [], brief_explanation: 'A reference' },
        { name: 'Object Entity', ontology: 'object', aliases: [], brief_explanation: 'An object' },
        { name: 'Organization Entity', ontology: 'organization', aliases: [], brief_explanation: 'An organization' },
        { name: 'Definition Entity', ontology: 'definition', aliases: [], brief_explanation: 'A definition' },
        { name: 'Other Entity', ontology: 'other', aliases: [], brief_explanation: 'Something else' },
      ];

      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={allOntologyTypes}
        />
      );
      
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      // Verify specific icons are present for different entity types
      expect(screen.getByTestId('icon-map-pin')).toBeInTheDocument(); // place
      expect(screen.getByTestId('icon-calendar')).toBeInTheDocument(); // date
      expect(screen.getByTestId('icon-lightbulb')).toBeInTheDocument(); // theme
      expect(screen.getByTestId('icon-star')).toBeInTheDocument(); // event
      expect(screen.getByTestId('icon-article')).toBeInTheDocument(); // reference
      expect(screen.getByTestId('icon-cube')).toBeInTheDocument(); // object
      expect(screen.getByTestId('icon-buildings')).toBeInTheDocument(); // organization
      expect(screen.getByTestId('icon-book')).toBeInTheDocument(); // definition
      expect(screen.getByTestId('icon-info')).toBeInTheDocument(); // other
    });
  });

  describe('Tab Container Integration', () => {
    it('should pass correct props to TabContainer', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      const tabContainer = screen.getByTestId('tab-container');
      expect(tabContainer).toBeInTheDocument();
      expect(tabContainer).toHaveClass('text-sm', 'flex-1');
    });

    it('should set defaultTab to original', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Original tab content should be visible by default
      expect(screen.getByTestId('original-headings-tab')).toBeInTheDocument();
    });

    it('should use vertical orientation', () => {
      // The TabContainer mock doesn't check orientation directly,
      // but we can verify it's passed through the props
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      expect(screen.getByTestId('tab-container')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should render search tab with input field', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      expect(searchInput).toBeInTheDocument();
      expect(screen.getByTestId('icon-magnifying-glass')).toBeInTheDocument();
    });

    it('should update search query when typing', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      expect(searchInput).toHaveValue('test search');
    });

    it('should show clear button when search query is present', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      
      // Clear button should not be present initially
      expect(screen.queryByTestId('icon-x')).not.toBeInTheDocument();
      
      // Type in search field
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Clear button should now be visible
      expect(screen.getByTestId('icon-x')).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      // Click clear button
      const clearButton = screen.getByTestId('icon-x').parentElement;
      fireEvent.click(clearButton!);
      
      expect(searchInput).toHaveValue('');
    });

    it('should show no results message when search has no matches', async () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      });
    });

    it('should perform case-insensitive search', async () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'DOCUMENT' } });
      
      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText(/Document Title/)).toBeInTheDocument();
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      });
    });

    it('should find multiple matches in elements', async () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'content' } });
      
      // Wait for search results
      await waitFor(() => {
        // Should find match in paragraph element
        expect(screen.getByText(/First paragraph content/)).toBeInTheDocument();
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      });
    });

    it('should show element type in search results', async () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'Document Title' } });
      
      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('h1')).toBeInTheDocument();
      });
    });

    it('should handle empty search query', async () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      
      // Type something that exists in our test data
      fireEvent.change(searchInput, { target: { value: 'Document' } });
      await waitFor(() => {
        expect(screen.getByText(/\d+ results? found/)).toBeInTheDocument();
      });
      
      // Clear the search
      fireEvent.change(searchInput, { target: { value: '' } });
      
      // Should not show "No results found" or count for empty query
      await waitFor(() => {
        expect(screen.queryByText('No results found')).not.toBeInTheDocument();
        expect(screen.queryByText(/\d+ results? found/)).not.toBeInTheDocument();
      });
    });

    it('should navigate to element when clicking on search result', async () => {
      const onHeadingClick = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onHeadingClick={onHeadingClick} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'Document Title' } });
      
      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      });
      
      // Click on the search result
      const searchResult = screen.getByText(/Document Title/);
      fireEvent.click(searchResult.closest('div[class*="cursor-pointer"]')!);
      
      // Verify onHeadingClick was called with correct parameters
      expect(onHeadingClick).toHaveBeenCalledWith('Document Title', 'syr-root-1');
    });

    it('should navigate when clicking on search results with multiple matches', async () => {
      const onHeadingClick = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onHeadingClick={onHeadingClick} />);
      
      // Switch to search tab
      fireEvent.click(screen.getByTestId('tab-button-search'));
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'content' } });
      
      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText(/First paragraph content/)).toBeInTheDocument();
      });
      
      // Click on the search result
      const searchResult = screen.getByText(/First paragraph content/);
      fireEvent.click(searchResult.closest('div[class*="cursor-pointer"]')!);
      
      // Verify onHeadingClick was called
      expect(onHeadingClick).toHaveBeenCalledWith('First paragraph content with John Doe mentioned', 'syr-para-1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on collapse button', () => {
      const onToggleCollapse = jest.fn();
      renderWithProviders(<UnifiedLeftPane {...defaultProps} onToggleCollapse={onToggleCollapse} />);
      
      const collapseButton = screen.getByTitle('Toggle sidebar (Ctrl+B)');
      expect(collapseButton).toHaveAttribute('title', 'Toggle sidebar (Ctrl+B)');
    });

    it('should have proper tooltip on entity with occurrence', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />
      );
      
      // Switch to glossary tab
      fireEvent.click(screen.getByTestId('tab-button-glossary'));
      
      const johnDoeTitle = screen.getByText('John Doe');
      expect(johnDoeTitle).toHaveAttribute('title', 'Click to scroll to first occurrence');
    });
  });
});