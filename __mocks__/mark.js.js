// Mock for mark.js library
module.exports = class Mark {
  constructor(element) {
    this.element = element;
  }
  
  mark(searchTerm, options = {}) {
    // Mock implementation - simulate finding matches based on search term
    if (!searchTerm || !searchTerm.trim()) {
      if (options.done && typeof options.done === 'function') {
        options.done();
      }
      return;
    }
    
    // Simulate finding matches in mock elements
    const mockElements = [
      { id: 'syr-root-1', content: 'Document Title', tag: 'h1' },
      { id: 'syr-para-1', content: 'First paragraph content with John Doe mentioned', tag: 'p' },
      { id: 'syr-section-1', content: 'Section Title', tag: 'h2' }
    ];
    
    // Case-insensitive search by default unless specified
    const searchRegex = new RegExp(searchTerm, options.caseSensitive ? 'g' : 'gi');
    
    let matchCount = 0;
    mockElements.forEach(element => {
      if (element.content.match(searchRegex)) {
        matchCount++;
        // Simulate each callback for found matches
        if (options.each && typeof options.each === 'function') {
          // Create a mock element that simulates the DOM structure
          const mockDomElement = {
            closest: (selector) => {
              if (selector === '[data-element-id]') {
                return {
                  getAttribute: (attr) => {
                    if (attr === 'data-element-id') return element.id;
                    if (attr === 'data-element-tag') return element.tag;
                    return null;
                  }
                };
              }
              return null;
            }
          };
          options.each(mockDomElement);
        }
      }
    });
    
    
    if (options.done && typeof options.done === 'function') {
      options.done();
    }
  }
  
  unmark(options = {}) {
    // Mock implementation - does nothing
    if (options.done && typeof options.done === 'function') {
      options.done();
    }
  }
};