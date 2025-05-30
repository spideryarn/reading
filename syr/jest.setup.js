import '@testing-library/jest-dom';

// Mock IntersectionObserver globally for all tests
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.elements = new Set();
  }
  
  observe(element) {
    this.elements.add(element);
  }
  
  unobserve(element) {
    this.elements.delete(element);
  }
  
  disconnect() {
    this.elements.clear();
  }
  
  // Helper method for tests to trigger visibility changes
  trigger(entries) {
    this.callback(entries, this);
  }
};