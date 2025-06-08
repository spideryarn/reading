// Mock for mark.js library
module.exports = class Mark {
  constructor(element) {
    this.element = element;
  }
  
  mark(searchTerm, options = {}) {
    // Mock implementation - actually search through real DOM content and create highlights
    if (!searchTerm || !searchTerm.trim()) {
      if (options.done && typeof options.done === 'function') {
        options.done();
      }
      return;
    }
    
    // Search through actual DOM content in the element
    if (!this.element) {
      if (options.done && typeof options.done === 'function') {
        options.done();
      }
      return;
    }
    
    // Create case-sensitive or case-insensitive regex based on options
    const flags = options.caseSensitive ? 'g' : 'gi';
    
    // Handle whitespace normalization - replace multiple whitespace with flexible whitespace pattern
    let regexPattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace sequences of whitespace in the search term with flexible whitespace regex
    regexPattern = regexPattern.replace(/\s+/g, '\\s+');
    
    const searchRegex = new RegExp(regexPattern, flags);
    
    const highlightedElements = [];
    
    if (options.acrossElements) {
      // For cross-element search, we need to search the combined text content
      // but still be able to highlight individual parts
      this.performCrossElementSearch(searchRegex, options, highlightedElements);
    } else {
      // Standard search within individual text nodes
      this.performStandardSearch(searchRegex, options, highlightedElements);
    }
    
    // Call the each callback for each highlighted element
    if (options.each && typeof options.each === 'function') {
      highlightedElements.forEach(element => {
        // Add textContent property for compatibility
        if (!element.textContent) {
          element.textContent = element.innerHTML;
        }
        options.each(element);
      });
    }
    
    // Call done callback
    if (options.done && typeof options.done === 'function') {
      // Use setTimeout to simulate async behavior
      setTimeout(() => {
        options.done();
      }, 0);
    }
  }
  
  performStandardSearch(searchRegex, options, highlightedElements) {
    // Find all text nodes that contain the search term
    const textNodes = this.getTextNodes(this.element);
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const matches = [...text.matchAll(searchRegex)];
      
      if (matches.length > 0) {
        // Create highlight elements for each match
        const parent = textNode.parentNode;
        if (!parent) return;
        
        let lastOffset = 0;
        const fragments = [];
        
        matches.forEach(match => {
          const matchStart = match.index || 0;
          const matchEnd = matchStart + match[0].length;
          
          // Add text before match
          if (matchStart > lastOffset) {
            const beforeText = text.substring(lastOffset, matchStart);
            if (beforeText) {
              fragments.push(document.createTextNode(beforeText));
            }
          }
          
          // Create highlight element
          const highlightElement = document.createElement('mark');
          highlightElement.className = options.className || 'search-highlight';
          highlightElement.textContent = match[0];
          fragments.push(highlightElement);
          highlightedElements.push(highlightElement);
          
          lastOffset = matchEnd;
        });
        
        // Add remaining text after last match
        if (lastOffset < text.length) {
          const afterText = text.substring(lastOffset);
          if (afterText) {
            fragments.push(document.createTextNode(afterText));
          }
        }
        
        // Replace the original text node with fragments
        if (fragments.length > 0) {
          fragments.forEach(fragment => {
            parent.insertBefore(fragment, textNode);
          });
          parent.removeChild(textNode);
        }
      }
    });
  }
  
  performCrossElementSearch(searchRegex, options, highlightedElements) {
    // For cross-element search, we need to examine block-level elements
    // and search their combined text content
    const blockElements = this.getBlockElements(this.element);
    
    blockElements.forEach(blockElement => {
      // Get the combined text content of this block
      const combinedText = blockElement.textContent || '';
      const matches = [...combinedText.matchAll(searchRegex)];
      
      if (matches.length > 0) {
        // For simplicity in the mock, create a single highlight element
        // representing the match and place it at the beginning of the first text node
        const firstTextNode = this.getFirstTextNode(blockElement);
        if (firstTextNode && firstTextNode.parentNode) {
          matches.forEach(match => {
            const highlightElement = document.createElement('mark');
            highlightElement.className = options.className || 'search-highlight';
            highlightElement.textContent = match[0];
            
            // Insert the highlight at the beginning (this is a simplified approach)
            firstTextNode.parentNode.insertBefore(highlightElement, firstTextNode);
            highlightedElements.push(highlightElement);
          });
        }
      }
    });
  }
  
  getBlockElements(element) {
    // Get all elements that have data-element-id (our document elements)
    return Array.from(element.querySelectorAll('[data-element-id]'));
  }
  
  getFirstTextNode(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (!node.textContent || !node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    return walker.nextNode();
  }
  
  unmark(options = {}) {
    // Remove all highlight elements
    if (this.element) {
      const highlights = this.element.querySelectorAll('.search-highlight, mark[class*="highlight"]');
      highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
          // Replace highlight element with its text content
          const textNode = document.createTextNode(highlight.textContent || '');
          parent.insertBefore(textNode, highlight);
          parent.removeChild(highlight);
        }
      });
      
      // Normalize adjacent text nodes
      this.normalizeTextNodes(this.element);
    }
    
    if (options.done && typeof options.done === 'function') {
      options.done();
    }
  }
  
  // Helper method to get all text nodes within an element
  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip empty text nodes and nodes that are already inside highlights
          if (!node.textContent || !node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Check if this text node is inside a highlight
          let parent = node.parentNode;
          while (parent && parent !== element) {
            if (parent.tagName === 'MARK' || (parent.className && parent.className.includes('highlight'))) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentNode;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    return textNodes;
  }
  
  // Helper method to normalize adjacent text nodes
  normalizeTextNodes(element) {
    // This is a simplified version - just normalize direct children
    element.normalize();
    
    // Recursively normalize children
    Array.from(element.children).forEach(child => {
      this.normalizeTextNodes(child);
    });
  }
};