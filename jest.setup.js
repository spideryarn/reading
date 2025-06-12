import '@testing-library/jest-dom';
import { existsSync } from 'fs';
import path from 'path';

// Validate .env.test exists - tests should abort if missing
const envTestPath = path.join(process.cwd(), '.env.test');
if (!existsSync(envTestPath)) {
  console.error('❌ TESTING ABORTED: .env.test file is missing');
  console.error('   Create it by running: cp .env.local .env.test');
  console.error('   See docs/reference/TESTING_SETUP.md for setup instructions');
  process.exit(1);
}

// Mock Next.js Web APIs for testing environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add fetch polyfill for next-test-api-route-handler
if (typeof fetch === 'undefined') {
  try {
    const { fetch } = require('undici');
    global.fetch = fetch;
  } catch (error) {
    // Fallback working fetch mock for Supabase operations
    global.fetch = async (url, options = {}) => {
      // Mock successful responses for common Supabase operations
      if (url.includes('supabase') || url.includes('/rest/v1/')) {
        return new Response(JSON.stringify({ data: [], error: null }), {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' }
        });
      }
      
      // Default mock response for other requests
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        statusText: 'OK', 
        headers: { 'content-type': 'application/json' }
      });
    };
  }
}

// Basic Request polyfill for imports - next-test-api-route-handler handles the runtime
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body;
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