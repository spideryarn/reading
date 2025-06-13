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
  return new Request(url, {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

// Helper to test API routes using next-test-api-route-handler
async function testApiRoute(
  handler: (request: Request) => Promise<Response>,
  options: TestApiOptions = {}
) {
  let responseBody: unknown;
  let responseStatus: number;
  let responseHeaders: Headers;

  await testApiHandler({
    appHandler: handler,
    url: options.url || '/api/test',
    test: async ({ fetch }) => {
      const response = await fetch({
        method: options.method || 'GET',
        headers: {
          'content-type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

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