// Type definitions for test utilities and mocks

// Mock Next.js Request object for API route tests
export interface MockRequest {
  json: () => Promise<unknown>;
  url?: string;
  method?: string;
  headers?: Headers | Record<string, string>;
  body?: unknown;
}

// Mock Next.js Response for API route tests
export interface MockResponse {
  json: (body: unknown) => MockResponse;
  status: (code: number) => MockResponse;
  headers: Headers;
  ok: boolean;
  statusCode?: number;
}

// Mock Next.js NextRequest type
export interface MockNextRequest extends MockRequest {
  nextUrl?: {
    pathname: string;
    searchParams: URLSearchParams;
  };
}

// Helper type for creating typed mock functions
export type MockFunction<T extends (...args: unknown[]) => unknown> = jest.MockedFunction<T>;