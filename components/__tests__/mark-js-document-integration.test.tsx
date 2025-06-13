import React from 'react';
import { render, screen } from '@testing-library/react';
import Mark from 'mark.js';

describe('Mark.js Document Integration Tests', () => {
  it('should work with our document element structure', async () => {
    // Simulate our SimpleDocumentViewer structure
    const TestDocument = () => (
      <div id="document-viewer" data-testid="document-viewer" className="prose prose-lg">
        <div data-element-id="heading-1" data-element-tag="h1">
          <h1>Introduction to Consciousness</h1>
        </div>
        <div data-element-id="para-1" data-element-tag="p">
          <p>The hard problem of <em>consciousness</em> refers to the difficulty</p>
        </div>
        <div data-element-id="para-2" data-element-tag="p">
          <p>of explaining <strong>subjective experience</strong> in physical terms.</p>
        </div>
      </div>
    );

    render(<TestDocument />);
    const container = screen.getByTestId('document-viewer');
    const markInstance = new Mark(container);

    const searchResults: Array<{
      elementId: string;
      elementTag: string;
      textExcerpt: string;
    }> = [];

    // Search for text within elements - Mark.js acrossElements only works for inline elements within the same block
    await new Promise((resolve) => {
      markInstance.mark('problem of consciousness', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        each: function(element) {
          const elementContainer = element.closest('[data-element-id]');
          if (elementContainer) {
            const elementId = elementContainer.getAttribute('data-element-id') || '';
            // Check if we already have this element in results
            if (!searchResults.some(r => r.elementId === elementId)) {
              searchResults.push({
                elementId,
                elementTag: elementContainer.getAttribute('data-element-tag') || '',
                textExcerpt: element.textContent || ''
              });
            }
          }
        },
        done: () => resolve(undefined)
      });
    });

    // Should find matches in para-1
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.some(r => r.elementId === 'para-1')).toBe(true);

    // Also test that it can handle inline elements like em and strong
    searchResults.length = 0;
    markInstance.unmark();

    await new Promise((resolve) => {
      markInstance.mark('consciousness refers', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        each: function(element) {
          const elementContainer = element.closest('[data-element-id]');
          if (elementContainer) {
            const elementId = elementContainer.getAttribute('data-element-id') || '';
            searchResults.push({
              elementId,
              elementTag: elementContainer.getAttribute('data-element-tag') || '',
              textExcerpt: element.textContent || ''
            });
          }
        },
        done: () => resolve(undefined)
      });
    });

    // Should find matches spanning across the em element
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.some(r => r.elementId === 'para-1')).toBe(true);

    markInstance.unmark();
  });

  it('should handle existing data-highlight-target attributes', async () => {
    const TestDocument = () => (
      <div id="document-viewer" data-testid="document-viewer">
        <div data-element-id="para-1" data-element-tag="p" data-highlight-target="true">
          <p>This element is already highlighted from navigation</p>
        </div>
        <div data-element-id="para-2" data-element-tag="p">
          <p>This element contains searchable text</p>
        </div>
      </div>
    );

    render(<TestDocument />);
    const container = screen.getByTestId('document-viewer');
    const markInstance = new Mark(container);

    // Apply search highlights
    await new Promise((resolve) => {
      markInstance.mark('highlighted from navigation', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        done: () => resolve(undefined)
      });
    });

    // Verify both highlight systems can coexist
    const navHighlight = container.querySelector('[data-highlight-target="true"]');
    const searchHighlights = container.querySelectorAll('.search-highlight');
    
    expect(navHighlight).toBeTruthy();
    expect(searchHighlights.length).toBeGreaterThan(0);

    markInstance.unmark();
  });

  it('should handle Markdown-rendered content correctly', async () => {
    // Simulate content that was rendered from Markdown
    const TestDocument = () => (
      <div id="document-viewer" data-testid="document-viewer">
        <div data-element-id="para-1" data-element-tag="p">
          <p>This has <strong>bold text</strong> and <em>italic text</em> from Markdown</p>
        </div>
        <div data-element-id="para-2" data-element-tag="p">
          <p>And some <code>inline code</code> as well</p>
        </div>
      </div>
    );

    render(<TestDocument />);
    const container = screen.getByTestId('document-viewer');
    const markInstance = new Mark(container);

    // Search for text that includes formatted content
    await new Promise((resolve) => {
      markInstance.mark('bold text and italic', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        done: () => resolve(undefined)
      });
    });

    const highlights = container.querySelectorAll('.search-highlight');
    expect(highlights.length).toBeGreaterThan(0);

    markInstance.unmark();
  });

  it('should perform well with typical document sizes', async () => {
    // Create a larger document similar to the Chalmers paper
    const TestDocument = () => (
      <div id="document-viewer" data-testid="document-viewer">
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} data-element-id={`para-${i}`} data-element-tag="p">
            <p>
              This is paragraph {i} with some content about consciousness and 
              the <em>hard problem</em> of explaining subjective experience. 
              David Chalmers argues that phenomenal consciousness cannot be 
              reduced to physical processes.
            </p>
          </div>
        ))}
      </div>
    );

    render(<TestDocument />);
    const container = screen.getByTestId('document-viewer');
    const markInstance = new Mark(container);

    const startTime = performance.now();
    
    await new Promise((resolve) => {
      markInstance.mark('consciousness cannot be reduced', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        done: () => resolve(undefined)
      });
    });

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    // Should complete reasonably quickly (under 100ms for 50 paragraphs)
    expect(searchTime).toBeLessThan(100);

    const highlights = container.querySelectorAll('.search-highlight');
    expect(highlights.length).toBeGreaterThan(0);

    markInstance.unmark();
  });

  it('should handle edge cases correctly', async () => {
    const TestDocument = () => (
      <div id="document-viewer" data-testid="document-viewer">
        <div data-element-id="para-1" data-element-tag="p">
          <p>Text with    multiple   spaces</p>
        </div>
        <div data-element-id="para-2" data-element-tag="p">
          <p>Text with
            newlines in the HTML</p>
        </div>
      </div>
    );

    render(<TestDocument />);
    const container = screen.getByTestId('document-viewer');
    const markInstance = new Mark(container);

    // Test with empty query
    await new Promise((resolve) => {
      markInstance.mark('', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        done: () => resolve(undefined)
      });
    });

    let highlights = container.querySelectorAll('.search-highlight');
    expect(highlights.length).toBe(0);

    // Test with whitespace normalization
    await new Promise((resolve) => {
      markInstance.mark('multiple spaces', {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        done: () => resolve(undefined)
      });
    });

    highlights = container.querySelectorAll('.search-highlight');
    expect(highlights.length).toBeGreaterThan(0);

    markInstance.unmark();
  });
});