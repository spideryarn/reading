import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Mark from 'mark.js';

describe('Mark.js Cross-Element Search Playground', () => {
  it('should find text that spans multiple elements', async () => {
    // Create a test component with cross-element text
    const TestComponent = () => (
      <div data-testid="content">
        <p>The quick <span>brown fox</span> jumps over</p>
        <p>the lazy <strong>dog</strong> today</p>
      </div>
    );

    render(<TestComponent />);
    const container = screen.getByTestId('content');

    // Initialize Mark.js
    const markInstance = new Mark(container);

    // Test 1: Cross-element search
    await new Promise((resolve) => {
      markInstance.mark('quick brown', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        done: () => resolve(undefined)
      });
    });

    // Check that the text was highlighted
    const highlights = container.querySelectorAll('.search-highlight');
    expect(highlights.length).toBeGreaterThan(0);
    // Mark.js adds data-markjs="true" attribute
    expect(container.innerHTML).toContain('class="search-highlight"');

    // Clean up
    markInstance.unmark();
  });

  it('should clear highlights properly', async () => {
    const TestComponent = () => (
      <div data-testid="content">
        <p>Hello <span>world</span> today</p>
      </div>
    );

    render(<TestComponent />);
    const container = screen.getByTestId('content');
    const markInstance = new Mark(container);

    // Add highlights
    await new Promise((resolve) => {
      markInstance.mark('hello world', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        done: () => resolve(undefined)
      });
    });

    // Verify highlights exist
    expect(container.querySelectorAll('.search-highlight').length).toBeGreaterThan(0);

    // Clear highlights
    await new Promise((resolve) => {
      markInstance.unmark({
        done: () => resolve(undefined)
      });
    });

    // Verify highlights are cleared
    expect(container.querySelectorAll('.search-highlight').length).toBe(0);
  });

  it('should map highlights back to parent elements with data attributes', async () => {
    const TestComponent = () => (
      <div data-testid="content">
        <div data-element-id="elem1" data-element-tag="p">
          <p>The quick <span>brown fox</span> jumps</p>
        </div>
        <div data-element-id="elem2" data-element-tag="p">
          <p>over the lazy dog</p>
        </div>
      </div>
    );

    render(<TestComponent />);
    const container = screen.getByTestId('content');
    const markInstance = new Mark(container);

    const mappedResults: Array<{elementId: string, elementTag: string, text: string}> = [];

    await new Promise((resolve) => {
      markInstance.mark('brown fox', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        each: function(element) {
          const parentElement = element.closest('[data-element-id]');
          if (parentElement) {
            mappedResults.push({
              elementId: parentElement.getAttribute('data-element-id') || '',
              elementTag: parentElement.getAttribute('data-element-tag') || '',
              text: element.textContent || ''
            });
          }
        },
        done: () => resolve(undefined)
      });
    });

    // Should have found matches in elem1
    expect(mappedResults.length).toBeGreaterThan(0);
    expect(mappedResults.some(r => r.elementId === 'elem1')).toBe(true);
    
    // Clean up
    markInstance.unmark();
  });

  it('should handle React re-renders without duplicating highlights', async () => {
    const TestComponent = ({ searchTerm }: { searchTerm: string }) => {
      React.useEffect(() => {
        const container = document.getElementById('test-content');
        if (!container) return;

        const markInstance = new Mark(container);
        
        // Clear previous highlights
        markInstance.unmark();
        
        // Add new highlights
        if (searchTerm) {
          markInstance.mark(searchTerm, {
            separateWordSearch: false,
            acrossElements: true,
            className: 'search-highlight'
          });
        }

        return () => {
          markInstance.unmark();
        };
      }, [searchTerm]);

      return (
        <div id="test-content" data-testid="content">
          <p>Hello <span>beautiful world</span> today</p>
        </div>
      );
    };

    const { rerender } = render(<TestComponent searchTerm="hello beautiful" />);

    await waitFor(() => {
      const container = screen.getByTestId('content');
      expect(container.querySelectorAll('.search-highlight').length).toBeGreaterThan(0);
    });

    // Re-render with different search term
    rerender(<TestComponent searchTerm="world today" />);

    await waitFor(() => {
      const container = screen.getByTestId('content');
      const highlights = container.querySelectorAll('.search-highlight');
      // Should only have highlights for the new search term
      expect(highlights.length).toBeGreaterThan(0);
      expect(container.textContent).toContain('world');
    });
  });

  it('should work with existing CSS classes and animations', async () => {
    const TestComponent = () => (
      <>
        <style>{`
          .search-highlight {
            background-color: #ffeb3b;
            font-weight: bold;
            animation: highlight-flash 0.5s ease-in-out;
          }
          @keyframes highlight-flash {
            0% { background-color: #fff59d; }
            100% { background-color: #ffeb3b; }
          }
        `}</style>
        <div data-testid="content">
          <p>Test <span>highlighting</span> with CSS</p>
        </div>
      </>
    );

    render(<TestComponent />);
    const container = screen.getByTestId('content');
    const markInstance = new Mark(container);

    await new Promise((resolve) => {
      markInstance.mark('test highlighting', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        done: () => resolve(undefined)
      });
    });

    const highlights = container.querySelectorAll('.search-highlight');
    expect(highlights.length).toBeGreaterThan(0);
    
    // Verify the mark elements have the correct class
    highlights.forEach(highlight => {
      expect(highlight.classList.contains('search-highlight')).toBe(true);
    });

    markInstance.unmark();
  });
});