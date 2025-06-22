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

// Polyfill setImmediate for pino-pretty/thread-stream in test environment
if (typeof setImmediate === 'undefined') {
    global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
    global.clearImmediate = clearTimeout;
}

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
});