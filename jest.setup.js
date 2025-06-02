import '@testing-library/jest-dom';

// Mock Next.js Web APIs for testing environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Simple Request and Response mocks for testing
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = input;
      this.method = init.method || 'GET';
      this._headers = new Map(Object.entries(init.headers || {}));
    }
    
    get headers() {
      return {
        get: (name) => {
          const lowerName = name.toLowerCase();
          for (const [key, value] of this._headers.entries()) {
            if (key.toLowerCase() === lowerName) {
              return value;
            }
          }
          return null;
        }
      };
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this._headers = new Map(Object.entries(init.headers || {}));
    }
    
    json() {
      if (typeof this.body === 'string') {
        return Promise.resolve(JSON.parse(this.body));
      }
      return Promise.resolve(this.body);
    }
    
    get headers() {
      return {
        get: (name) => {
          const lowerName = name.toLowerCase();
          for (const [key, value] of this._headers.entries()) {
            if (key.toLowerCase() === lowerName) {
              return value;
            }
          }
          return null;
        }
      };
    }
  };
}

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