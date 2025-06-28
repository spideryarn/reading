import { testApiHandler } from 'next-test-api-route-handler';

interface TestApiOptions {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

// Legacy helper for backward compatibility with existing tests
function createMockRequest(url: string, options: MockRequestOptions = {}) {
  // Convert relative URLs to full URLs
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  
  const requestInit: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    }
  };
  
  if (options.body) {
    requestInit.body = JSON.stringify(options.body);
  }
  
  return new Request(fullUrl, requestInit);
}

// Helper to test API routes using next-test-api-route-handler
// For Next.js 15 App Router, NTARH requires the entire route module, not individual handlers
async function testApiRoute(
  routeModule: Record<string, unknown>, // The entire route module (e.g., import * as route from './route')
  options: TestApiOptions = {}
) {
  let responseBody: unknown = null;
  let responseStatus: number = 0;
  let responseHeaders: Headers = new Headers();

  await testApiHandler({
    appHandler: routeModule, // Pass the entire route module
    url: options.url || '/api/test',
    test: async ({ fetch }) => {
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers: {
          'content-type': 'application/json',
          ...options.headers
        }
      };
      
      if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }
      
      const response = await fetch(fetchOptions);

      responseStatus = response.status;
      responseHeaders = response.headers;
      
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }
    }
  });

  return {
    status: responseStatus,
    body: responseBody,
    headers: responseHeaders
  };
}

export { testApiRoute, createMockRequest };