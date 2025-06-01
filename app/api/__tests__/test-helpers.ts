import { NextRequest } from 'next/server';

interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

// Helper to create NextRequest instances for testing
function createMockRequest(url: string, options: MockRequestOptions = {}): NextRequest {
  let body = options.body;
  
  // Convert body to proper format if it's not already a string
  if (body && typeof body !== 'string') {
    body = JSON.stringify(body);
  }
  
  // Create a proper Request object
  const request = new Request(url, {
    method: options.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    },
    body: body as string
  });
  
  // Return as NextRequest
  return new NextRequest(request);
}

export { createMockRequest };