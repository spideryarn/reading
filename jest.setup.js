import '@testing-library/jest-dom';
import { existsSync } from 'fs';
import path from 'path';

// Mock nuqs (ESM-only package)
jest.mock('nuqs');

// Mock server auth for API tests
jest.mock('@/lib/auth/server-auth');

// Mock database services to use mock implementations
jest.mock('@/lib/services/database/ai-calls');
jest.mock('@/lib/services/database/enhancements');
jest.mock('@/lib/services/database/documents');

// Mock prompts module for LLM call mocking
jest.mock('@/lib/prompts/types');

// Mock Next.js headers for tests that use cookies/headers outside request context
jest.mock('next/headers', () => ({
    cookies: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(() => false),
        delete: jest.fn(),
        clear: jest.fn(),
        getAll: jest.fn(() => []),
        toString: jest.fn(() => '')
    })),
    headers: jest.fn(() => ({
        get: jest.fn(),
        has: jest.fn(() => false),
        set: jest.fn(),
        delete: jest.fn(),
        append: jest.fn(),
        getSetCookie: jest.fn(() => []),
        forEach: jest.fn(),
        entries: jest.fn(() => []),
        keys: jest.fn(() => []),
        values: jest.fn(() => [])
    }))
}));

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

// Add Web Streams API polyfills for undici compatibility
if (typeof global.ReadableStream === 'undefined') {
    const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
    global.ReadableStream = ReadableStream;
    global.WritableStream = WritableStream;
    global.TransformStream = TransformStream;
}

// Add MessagePort and MessageChannel for undici compatibility
if (typeof global.MessagePort === 'undefined') {
    const { MessagePort, MessageChannel } = require('node:worker_threads');
    global.MessagePort = MessagePort;
    global.MessageChannel = MessageChannel;
}

// Add structuredClone polyfill for AI SDK compatibility  
if (typeof global.structuredClone === 'undefined') {
    global.structuredClone = (obj) => {
        return JSON.parse(JSON.stringify(obj));
    };
}

// Polyfill setImmediate for pino-pretty/thread-stream in test environment
if (typeof setImmediate === 'undefined') {
    global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
    global.clearImmediate = clearTimeout;
}

// Add Response constructor mock for Jest environment
if (typeof global.Response === 'undefined') {
    global.Response = class Response {
        constructor(body, init = {}) {
            this.body = body;
            this.status = init.status || 200;
            this.statusText = init.statusText || 'OK';
            this.headers = new Map();
            this.ok = this.status >= 200 && this.status < 300;
            
            // Set headers from init
            if (init.headers) {
                if (init.headers instanceof Map) {
                    this.headers = new Map(init.headers);
                } else if (typeof init.headers === 'object') {
                    Object.entries(init.headers).forEach(([key, value]) => {
                        this.headers.set(key.toLowerCase(), value);
                    });
                }
            }
        }

        async json() {
            if (typeof this.body === 'string') {
                return JSON.parse(this.body);
            }
            return this.body;
        }

        async text() {
            return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
        }

        async blob() {
            return new Blob([this.body]);
        }

        clone() {
            return new Response(this.body, {
                status: this.status,
                statusText: this.statusText,
                headers: this.headers
            });
        }
    };
}

// Add Headers constructor mock for Jest environment
if (typeof global.Headers === 'undefined') {
    global.Headers = class Headers {
        constructor(init = {}) {
            this.map = new Map();
            if (init instanceof Map) {
                this.map = new Map(init);
            } else if (typeof init === 'object') {
                Object.entries(init).forEach(([key, value]) => {
                    this.map.set(key.toLowerCase(), value);
                });
            }
        }

        get(name) {
            return this.map.get(name.toLowerCase());
        }

        set(name, value) {
            this.map.set(name.toLowerCase(), value);
        }

        has(name) {
            return this.map.has(name.toLowerCase());
        }

        delete(name) {
            this.map.delete(name.toLowerCase());
        }

        entries() {
            return this.map.entries();
        }

        keys() {
            return this.map.keys();
        }

        values() {
            return this.map.values();
        }

        forEach(callback) {
            this.map.forEach(callback);
        }
    };
}

// Add fetch polyfill for tests - use Node.js built-in fetch in Node 18+
if (typeof fetch === 'undefined') {
    // Check if Node.js built-in fetch is available (Node 18+)
    if (typeof globalThis.fetch === 'function') {
        global.fetch = globalThis.fetch;
        global.Request = globalThis.Request;
        global.Response = globalThis.Response; 
        global.Headers = globalThis.Headers;
        console.log('[jest.setup.js] Using Node.js built-in fetch for tests');
    } else {
        try {
            const { fetch, Request, Response, Headers } = require('undici');
            global.fetch = fetch;
            global.Request = Request; 
            global.Response = Response;
            global.Headers = Headers;
            console.log('[jest.setup.js] Using undici fetch for tests');
        } catch (error) {
            // Basic fallback fetch mock only for cases where undici is unavailable
            // This should rarely be used in modern Node.js environments
            global.fetch = async (url, options = {}) => {
                console.warn(`[jest.setup.js] Fallback fetch mock called for: ${url}`);
                
                // Default mock response for requests
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'content-type': 'application/json' }
                });
            };
        }
    }
}

// Removed custom Request/Response mocking - next-test-api-route-handler will handle this properly
// The custom mocking was causing "Cannot set property url of NextRequest which has only a getter" errors

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

// Polyfill PointerEvent for JSDOM (Node) environment so tests relying on pointer events don't fail.
if (typeof global.PointerEvent === 'undefined') {
    // PointerEvent shares the same constructor signature as MouseEvent for our test purposes.
    // Casting is safe because tests only inspect clientX/clientY and basic props.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.PointerEvent = global.MouseEvent;
}

// Global test cleanup hooks
beforeEach(() => {
    // Clear all mock implementations to ensure clean state
    jest.clearAllMocks();

    // Reset mock service states
    const { AiCallService } = require('@/lib/services/database/ai-calls');
    const { EnhancementService } = require('@/lib/services/database/enhancements');
    const { DocumentService } = require('@/lib/services/database/documents');
    const { clearMockExecutions } = require('@/lib/prompts/types');

    // Clear mock data stores
    if (AiCallService.clearMockCalls) {
        AiCallService.clearMockCalls();
    }
    if (EnhancementService.clearMockEnhancements) {
        EnhancementService.clearMockEnhancements();
    }
    if (DocumentService.clearMockDocuments) {
        DocumentService.clearMockDocuments();
    }
    if (clearMockExecutions) {
        clearMockExecutions();
    }

    // Reset auth mocks
    const { resetAuthMocks } = require('@/lib/auth/server-auth');
    if (resetAuthMocks) {
        resetAuthMocks();
    }

    // Reset tool registry for test isolation
    try {
        const { resetRegistryForTests } = require('@/lib/tools/registry');
        if (resetRegistryForTests) {
            resetRegistryForTests();
        }
    } catch (error) {
        // Registry module may not be loaded in all tests - this is fine
    }
});