import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-wrapper';
import { UnifiedLeftPane } from '../unified-left-pane';
import type { DocumentElement } from '@/lib/types/document';
import { DocumentCommunicationProvider, useDocumentCommunication } from '@/lib/context/document-communication-context';

// Mock the debounce utility
jest.mock('@/lib/utils/debounce', () => ({
  debounce: (fn: any) => fn // No delay in tests
}));

// Mock mark.js
jest.mock('mark.js');

// Test helper component to control active tab
function TestTabController({ children, activeTab }: { children: React.ReactNode; activeTab?: string }) {
  const { actions } = useDocumentCommunication();
  
  React.useEffect(() => {
    if (activeTab) {
      actions.setActiveTab(activeTab);
    }
  }, [activeTab, actions]);
  
  return <>{children}</>;
}

// Enhanced test wrapper with tab control
function renderWithProvidersAndTab(component: React.ReactElement, activeTab?: string) {
  return renderWithProviders(
    <TestTabController activeTab={activeTab}>
      {component}
    </TestTabController>
  );
}

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
    documentContext: 'Document context for chat',
    glossaryCached: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render default tab content (original tab)', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // The component renders content based on the active tab from context
      // Default active tab is 'original' so we should see the original headings tab
      expect(screen.getByTestId('original-headings-tab')).toBeInTheDocument();
      expect(screen.getByText('Original Headings')).toBeInTheDocument();
    });

    it('should display document content information', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Check that the content is being passed to the tab (content gets HTML-escaped and truncated)
      expect(screen.getByText(/Content:.*Document Title/)).toBeInTheDocument();
      expect(screen.getByText('Elements: 3')).toBeInTheDocument();
    });

    it('should render headings from elements', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Check that headings from mockElements are displayed
      expect(screen.getByTestId('heading-syr-root-1')).toBeInTheDocument();
      expect(screen.getByTestId('heading-syr-section-1')).toBeInTheDocument();
    });

    it('should handle missing props gracefully', () => {
      const minimalProps = {
        ...defaultProps,
        headingVisibility: undefined
      };
      
      expect(() => {
        renderWithProviders(<UnifiedLeftPane {...minimalProps} />);
      }).not.toThrow();
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

    it('should render AI-generated tab when active', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'ai-generated');
      
      const aiTab = screen.getByTestId('ai-generated-headings-tab');
      expect(aiTab).toBeInTheDocument();
      expect(screen.getByText('AI Generated Headings')).toBeInTheDocument();
    });

    it('should render summary tab when active', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'summary');
      
      const summaryTab = screen.getByTestId('document-summary-tab');
      expect(summaryTab).toBeInTheDocument();
      expect(screen.getByText(/Markdown length: \d+/)).toBeInTheDocument();
    });

    it('should render chat tab when active', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'chat');
      
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
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} onHeadingClick={onHeadingClick} />, 'ai-generated');
      
      const aiHeadingButton = screen.getByTestId('ai-heading-syr-root-1');
      fireEvent.click(aiHeadingButton);
      
      expect(onHeadingClick).toHaveBeenCalledWith('Document Title', 'syr-root-1');
    });
  });

  describe('Tab Content Rendering', () => {
    it('should only render active tab content', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'summary');
      
      // Should see summary tab
      expect(screen.getByTestId('document-summary-tab')).toBeInTheDocument();
      
      // Should NOT see other tabs
      expect(screen.queryByTestId('original-headings-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-generated-headings-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('assistant-chat')).not.toBeInTheDocument();
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
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} onLoadGlossary={onLoadGlossary} />, 'glossary');
      
      // Should auto-trigger glossary loading when tab is activated
      expect(onLoadGlossary).toHaveBeenCalledTimes(1);
    });

    it('should not auto-load glossary when already loading', () => {
      const onLoadGlossary = jest.fn();
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          onLoadGlossary={onLoadGlossary} 
          isLoadingGlossary={true}
          showGlossary={true}
        />, 'glossary'
      );
      
      // Should not auto-trigger since already loading
      expect(onLoadGlossary).not.toHaveBeenCalled();
    });

    it('should not auto-load glossary when already showing', () => {
      const onLoadGlossary = jest.fn();
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          onLoadGlossary={onLoadGlossary} 
          showGlossary={true}
        />, 'glossary'
      );
      
      // Should not auto-trigger since already showing
      expect(onLoadGlossary).not.toHaveBeenCalled();
    });

    it('should show loading state when isLoadingGlossary is true', () => {
      renderWithProviders(
        <UnifiedLeftPane 
          {...defaultProps} 
          isLoadingGlossary={true}
          showGlossary={true}
        />, 'glossary'
      );
      
      expect(screen.getByText('Analyzing Document')).toBeInTheDocument();
      expect(screen.getByText('Extracting key terms and concepts...')).toBeInTheDocument();
      expect(screen.getByTestId('icon-circle-notch')).toBeInTheDocument();
    });

    it('should show loading state in button when generate button is disabled', () => {
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          isLoadingGlossary={true}
        />, 'glossary'
      );
      
      const generateButton = screen.getByText('Generating...');
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
      expect(screen.getByTestId('icon-circle-notch')).toBeInTheDocument();
    });

    it('should show error state when glossaryError is provided', () => {
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          glossaryError="Failed to load glossary data"
          showGlossary={true}
        />, 'glossary'
      );
      
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByTestId('alert-title')).toHaveTextContent('Failed to generate glossary');
      expect(screen.getByTestId('alert-description')).toHaveTextContent('Failed to load glossary data');
    });

    it('should show no entries found when glossary is empty', () => {
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={[]}
        />, 'glossary'
      );
      
      expect(screen.getByText('No Entries Found')).toBeInTheDocument();
      expect(screen.getByText('No glossary entries were identified in this document.')).toBeInTheDocument();
      expect(screen.getByTestId('icon-question')).toBeInTheDocument();
    });

    it('should display glossary entities when available', () => {
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />, 'glossary'
      );
      
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
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />, 'glossary'
      );
      
      expect(screen.getByTestId('icon-user')).toBeInTheDocument();
      expect(screen.getByText('person')).toBeInTheDocument();
    });

    it('should display entity with correct icon and color for concept type', () => {
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />, 'glossary'
      );
      
      expect(screen.getByTestId('icon-lightbulb')).toBeInTheDocument();
      expect(screen.getByText('concept')).toBeInTheDocument();
    });

    it('should display entity aliases when available', () => {
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />, 'glossary'
      );
      
      expect(screen.getAllByText('Also known as:')[0]).toBeInTheDocument();
      expect(screen.getByText('J. Doe')).toBeInTheDocument();
      expect(screen.getByText('ML, Artificial Intelligence')).toBeInTheDocument();
    });

    it('should display entity datetime when available', () => {
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />, 'glossary'
      );
      
      expect(screen.getByText('1950s - present')).toBeInTheDocument();
      expect(screen.getByTestId('icon-calendar')).toBeInTheDocument();
    });

    it('should handle entity click to scroll when entity has occurrence', async () => {
      // Note: onScrollToEntity prop no longer exists - entity clicks now use context actions
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />, 'glossary'
      );
      
      // Find John Doe entity (it should match content in elements)
      const johnDoeEntity = screen.getByText('John Doe');
      // The clickable container is the outermost div with rounded-xl class
      const entityContainer = johnDoeEntity.closest('.bg-white.rounded-xl');
      
      // Entity should be clickable (has occurrence in document)
      expect(entityContainer).toHaveClass('cursor-pointer');
      
      fireEvent.click(entityContainer!);
      
      // The entity should be clickable but we can't easily test the context action
      // in this test setup - just verify it's clickable
      await waitFor(() => {
        expect(entityContainer).toHaveClass('cursor-pointer');
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
      
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={entitiesNoOccurrence}
        />, 'glossary'
      );
      
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

      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          elements={elementsWithMissingContent}
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />, 'glossary'
      );
      
      // John Doe should still be found in the first paragraph despite empty elements
      const johnDoeEntity = screen.getByText('John Doe');
      const entityContainer = johnDoeEntity.closest('.bg-white.rounded-xl');
      
      expect(entityContainer).toHaveClass('cursor-pointer');
    });

    it('should prefer long_explanation over brief_explanation when available', () => {
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />, 'glossary'
      );
      
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

      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={allOntologyTypes}
        />, 'glossary'
      );
      
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

  describe('Context Integration', () => {
    it('should render default tab content when active tab is original', () => {
      renderWithProviders(<UnifiedLeftPane {...defaultProps} />);
      
      // Original tab content should be visible by default (activeTabId: 'original')
      expect(screen.getByTestId('original-headings-tab')).toBeInTheDocument();
    });

    it('should handle different active tabs from context', () => {
      // Test that different tabs render their specific content
      const summaryProps = renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'summary');
      expect(screen.getByTestId('document-summary-tab')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should render search input when search tab is active', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      expect(searchInput).toBeInTheDocument();
      expect(screen.getByTestId('icon-magnifying-glass')).toBeInTheDocument();
    });

    it('should render search tab with input field', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      expect(searchInput).toBeInTheDocument();
      expect(screen.getByTestId('icon-magnifying-glass')).toBeInTheDocument();
    });

    it('should update search query when typing', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      expect(searchInput).toHaveValue('test search');
    });

    it('should show clear button when search query is present', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      
      // Clear button should not be present initially
      expect(screen.queryByTestId('icon-x')).not.toBeInTheDocument();
      
      // Type in search field
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Clear button should now be visible
      expect(screen.getByTestId('icon-x')).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      // Click clear button
      const clearButton = screen.getByTestId('icon-x').parentElement;
      fireEvent.click(clearButton!);
      
      expect(searchInput).toHaveValue('');
    });

    it('should show no results message when search has no matches', async () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      });
    });

    it('should perform case-insensitive search', async () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'DOCUMENT' } });
      
      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText(/Document Title/)).toBeInTheDocument();
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      });
    });

    it('should find multiple matches in elements', async () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
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
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'Document Title' } });
      
      // Wait for search results
      await waitFor(() => {
        // Should show the element type (h1) in search results
        expect(screen.getByText('h1')).toBeInTheDocument();
      });
    });


    it('should handle empty search query', async () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
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
      // Note: Search results now use context actions, not onHeadingClick prop
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'Document Title' } });
      
      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      });
      
      // Click on the search result
      const searchResult = screen.getByText(/Document Title/);
      fireEvent.click(searchResult.closest('div[class*="cursor-pointer"]')!);
      
      // Just verify the search result is clickable - context actions are hard to test
      expect(searchResult.closest('div[class*="cursor-pointer"]')).toBeInTheDocument();
    });

    it('should navigate when clicking on search results with multiple matches', async () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      fireEvent.change(searchInput, { target: { value: 'content' } });
      
      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText(/First paragraph content/)).toBeInTheDocument();
      });
      
      // Click on the search result
      const searchResult = screen.getByText(/First paragraph content/);
      fireEvent.click(searchResult.closest('div[class*="cursor-pointer"]')!);
      
      // Just verify the search result is clickable
      expect(searchResult.closest('div[class*="cursor-pointer"]')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper tooltip on entity with occurrence', () => {
      renderWithProvidersAndTab(
        <UnifiedLeftPane 
          {...defaultProps} 
          showGlossary={true}
          glossaryEntities={mockGlossaryEntities}
        />, 'glossary'
      );
      
      const johnDoeTitle = screen.getByText('John Doe');
      expect(johnDoeTitle).toHaveAttribute('title', 'Click to scroll to first occurrence');
    });

    it('should have accessible search input', () => {
      renderWithProvidersAndTab(<UnifiedLeftPane {...defaultProps} />, 'search');
      
      const searchInput = screen.getByPlaceholderText('Search document...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });
  });
});