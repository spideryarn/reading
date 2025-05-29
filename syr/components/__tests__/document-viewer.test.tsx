import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentViewer } from '../document-viewer';
import type { DocumentElement } from '@/lib/types/document';

// Mock the tab-container component
jest.mock('../tab-container', () => ({
  TabContainer: ({ tabs, title }: any) => (
    <div data-testid="tab-container">
      <h2>{title}</h2>
      {tabs.map((tab: any) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`}>
          {tab.content}
        </div>
      ))}
    </div>
  )
}));

// Mock the assistant-chat component
jest.mock('../assistant-chat', () => ({
  AssistantChat: ({ documentContext }: any) => (
    <div data-testid="assistant-chat">
      Chat component with context: {documentContext.substring(0, 50)}...
    </div>
  )
}));

describe('DocumentViewer', () => {
  const mockElements: DocumentElement[] = [
    {
      id: 'syr-root-1',
      content: 'Document Title',
      tag_name: 'h1',
      parent_id: null,
      position: 0,
      attributes: {},
      document_id: 'doc-1'
    },
    {
      id: 'syr-para-1',
      content: 'First paragraph content',
      tag_name: 'p',
      parent_id: null,
      position: 1,
      attributes: {},
      document_id: 'doc-1'
    },
    {
      id: 'syr-section-1',
      content: 'Section Title',
      tag_name: 'h2',
      parent_id: null,
      position: 2,
      attributes: {},
      document_id: 'doc-1'
    },
    {
      id: 'syr-para-2',
      content: 'Section paragraph',
      tag_name: 'p',
      parent_id: 'syr-section-1',
      position: 3,
      attributes: { class: 'highlighted' },
      document_id: 'doc-1'
    }
  ];

  it('should render the merged Document pane', () => {
    render(<DocumentViewer elements={mockElements} />);
    
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('Document Title')).toBeInTheDocument();
    expect(screen.getByText('First paragraph content')).toBeInTheDocument();
    expect(screen.getByText('Section Title')).toBeInTheDocument();
    expect(screen.getByText('Section paragraph')).toBeInTheDocument();
  });

  it('should display truncated IDs without syr- prefix', () => {
    render(<DocumentViewer elements={mockElements} />);
    
    // IDs should be truncated and not show syr- prefix
    expect(screen.getByText('root-1')).toBeInTheDocument();
    expect(screen.getByText('para-1')).toBeInTheDocument();
    expect(screen.getByText('section-')).toBeInTheDocument();
    expect(screen.getByText('para-2')).toBeInTheDocument();
  });

  it('should show full ID and tag in tooltip', () => {
    render(<DocumentViewer elements={mockElements} />);
    
    const idSpan = screen.getByText('root-1');
    expect(idSpan).toHaveAttribute('title', 'syr-root-1 (h1)');
  });

  it('should render empty elements with placeholder text', () => {
    const elementsWithEmpty: DocumentElement[] = [
      {
        id: 'syr-empty-div',
        content: '',
        tag_name: 'div',
        parent_id: null,
        position: 0,
        attributes: {},
        document_id: 'doc-1'
      }
    ];
    
    render(<DocumentViewer elements={elementsWithEmpty} />);
    
    expect(screen.getByText('(empty div)')).toBeInTheDocument();
  });

  it('should handle element selection', () => {
    const onElementSelect = jest.fn();
    render(
      <DocumentViewer 
        elements={mockElements} 
        onElementSelect={onElementSelect}
      />
    );
    
    const firstElement = screen.getByText('Document Title').parentElement;
    fireEvent.click(firstElement!);
    
    expect(onElementSelect).toHaveBeenCalledWith(mockElements[0]);
  });

  it('should highlight selected element', () => {
    render(
      <DocumentViewer 
        elements={mockElements} 
        selectedElement={mockElements[1]}
      />
    );
    
    const selectedElementDiv = screen.getByText('First paragraph content').closest('[data-element-id]');
    expect(selectedElementDiv).toHaveClass('bg-blue-50');
  });

  it('should render nested elements correctly', () => {
    render(<DocumentViewer elements={mockElements} />);
    
    // Check that nested element is rendered with proper indentation
    const nestedElement = screen.getByText('Section paragraph');
    const nestedContainer = nestedElement.closest('[data-element-id]');
    
    // Parent should have nested content
    expect(nestedContainer).toHaveAttribute('data-element-id', 'syr-para-2');
  });

  it('should render Tools pane with glossary and chat tabs', () => {
    render(<DocumentViewer elements={mockElements} />);
    
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByTestId('tab-glossary')).toBeInTheDocument();
    expect(screen.getByTestId('tab-chat')).toBeInTheDocument();
  });

  it('should show load glossary button when glossary not loaded', () => {
    render(<DocumentViewer elements={mockElements} />);
    
    expect(screen.getByText('Load glossary')).toBeInTheDocument();
  });

  it('should show loading state when glossary is loading', () => {
    render(
      <DocumentViewer 
        elements={mockElements} 
        isLoadingGlossary={true}
        showGlossary={true}
      />
    );
    
    expect(screen.getByText('Loading glossary...')).toBeInTheDocument();
  });

  it('should show glossary error when provided', () => {
    render(
      <DocumentViewer 
        elements={mockElements} 
        glossaryError="Failed to load glossary"
        showGlossary={true}
      />
    );
    
    expect(screen.getByText('Failed to generate glossary')).toBeInTheDocument();
    expect(screen.getByText('Failed to load glossary')).toBeInTheDocument();
  });

  it('should call onLoadGlossary when load button is clicked', () => {
    const onLoadGlossary = jest.fn();
    render(
      <DocumentViewer 
        elements={mockElements} 
        onLoadGlossary={onLoadGlossary}
      />
    );
    
    fireEvent.click(screen.getByText('Load glossary'));
    expect(onLoadGlossary).toHaveBeenCalled();
  });

  it('should render chat tab with document context', () => {
    render(<DocumentViewer elements={mockElements} />);
    
    expect(screen.getByTestId('assistant-chat')).toBeInTheDocument();
    expect(screen.getByText(/Chat component with context:/)).toBeInTheDocument();
  });

  it('should handle scroll to entity from glossary', async () => {
    const mockGlossaryEntities = [{
      name: 'First',
      ontology: 'concept' as const,
      aliases: ['initial'],
      brief_explanation: 'The first item',
      long_explanation: 'The very first item in a sequence'
    }];
    
    render(
      <DocumentViewer 
        elements={mockElements}
        glossaryEntities={mockGlossaryEntities}
        showGlossary={true}
      />
    );
    
    // Find and click the glossary entity (it will match "First paragraph content")
    const entityLink = screen.getByText('First');
    expect(entityLink).toHaveClass('text-blue-600');
    
    // Mock scrollIntoView
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    
    fireEvent.click(entityLink);
    
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('should maintain grid layout with wider document pane', () => {
    const { container } = render(<DocumentViewer elements={mockElements} />);
    
    const gridContainer = container.querySelector('.grid.grid-cols-3');
    expect(gridContainer).toBeInTheDocument();
    
    // Check that document pane spans 2 columns
    const documentPane = screen.getByText('Document').parentElement;
    expect(documentPane).toHaveClass('col-span-2');
  });

  it('should have scrollable panes', () => {
    render(<DocumentViewer elements={mockElements} />);
    
    const documentPane = screen.getByText('Document').parentElement;
    expect(documentPane).toHaveClass('overflow-y-auto');
    
    const toolsPane = screen.getByText('Tools').parentElement?.parentElement;
    expect(toolsPane).toHaveClass('overflow-y-auto');
  });

  describe('Typography formatting', () => {
    it('should apply correct styling to headings', () => {
      const headingElements: DocumentElement[] = [
        { id: 'syr-h1', tag_name: 'h1', content: 'Heading 1', position: 0, parent_id: null, attributes: {}, document_id: 'doc-1' },
        { id: 'syr-h2', tag_name: 'h2', content: 'Heading 2', position: 1, parent_id: null, attributes: {}, document_id: 'doc-1' },
        { id: 'syr-h3', tag_name: 'h3', content: 'Heading 3', position: 2, parent_id: null, attributes: {}, document_id: 'doc-1' },
      ];
      
      render(<DocumentViewer elements={headingElements} />);
      
      const h1 = screen.getByText('Heading 1');
      expect(h1.parentElement).toHaveClass('text-3xl', 'font-bold');
      
      const h2 = screen.getByText('Heading 2');
      expect(h2.parentElement).toHaveClass('text-2xl', 'font-semibold');
      
      const h3 = screen.getByText('Heading 3');
      expect(h3.parentElement).toHaveClass('text-xl', 'font-semibold');
    });

    it('should apply correct styling to paragraphs', () => {
      const paragraphElements: DocumentElement[] = [
        { id: 'syr-p1', tag_name: 'p', content: 'This is a paragraph', position: 0, parent_id: null, attributes: {}, document_id: 'doc-1' },
      ];
      
      render(<DocumentViewer elements={paragraphElements} />);
      
      const paragraph = screen.getByText('This is a paragraph');
      expect(paragraph.parentElement).toHaveClass('text-base', 'leading-relaxed');
    });

    it('should render list items with bullets and numbers', () => {
      const listElements: DocumentElement[] = [
        { id: 'syr-ul1', tag_name: 'ul', content: '', position: 0, parent_id: null, attributes: {}, document_id: 'doc-1' },
        { id: 'syr-li1', tag_name: 'li', content: 'First unordered item', position: 0, parent_id: 'syr-ul1', attributes: {}, document_id: 'doc-1' },
        { id: 'syr-li2', tag_name: 'li', content: 'Second unordered item', position: 1, parent_id: 'syr-ul1', attributes: {}, document_id: 'doc-1' },
        { id: 'syr-ol1', tag_name: 'ol', content: '', position: 1, parent_id: null, attributes: {}, document_id: 'doc-1' },
        { id: 'syr-li3', tag_name: 'li', content: 'First ordered item', position: 0, parent_id: 'syr-ol1', attributes: {}, document_id: 'doc-1' },
        { id: 'syr-li4', tag_name: 'li', content: 'Second ordered item', position: 1, parent_id: 'syr-ol1', attributes: {}, document_id: 'doc-1' },
      ];
      
      render(<DocumentViewer elements={listElements} />);
      
      // Check unordered list items have bullets
      const bullets = screen.getAllByText('•');
      expect(bullets).toHaveLength(2);
      
      // Check ordered list items have numbers
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
    });

    it('should display IDs in smaller grey text', () => {
      render(<DocumentViewer elements={mockElements} />);
      
      // Find an ID span by its truncated ID text
      const idSpan = screen.getByText('root-1');
      expect(idSpan).toHaveClass('text-xs', 'font-mono', 'text-gray-500');
      expect(idSpan).toHaveStyle({ fontSize: '0.65rem' });
    });
  });
});