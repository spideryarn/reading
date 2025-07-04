/**
 * API Route Test Utilities
 * 
 * Provides standardized patterns for testing Next.js App Router API routes using next-test-api-route-handler.
 * Designed to work with the new authentication test utilities and shared database testing approach.
 */

import { testApiHandler } from 'next-test-api-route-handler'
import { authTestScenarios, type TestUser, createAuthHeaders } from './auth-test-utils'

/**
 * Configuration for API route tests
 */
export interface ApiTestConfig {
  /** API route module (import * as route from './route') - entire route module required for Next.js 15 App Router */
  handler: { 
    GET?: (request: Request) => Response | Promise<Response>
    POST?: (request: Request) => Response | Promise<Response>
    PUT?: (request: Request) => Response | Promise<Response>
    DELETE?: (request: Request) => Response | Promise<Response>
    PATCH?: (request: Request) => Response | Promise<Response>
    OPTIONS?: (request: Request) => Response | Promise<Response>
    HEAD?: (request: Request) => Response | Promise<Response>
  }
  /** API route URL path (e.g., '/api/upload-pdf') */
  url: string
  /** HTTP method (default: POST) */
  method?: string
  /** Request headers */
  headers?: Record<string, string>
  /** Request body (will be JSON stringified) */
  body?: unknown
  /** Test user for authentication (null for unauthenticated tests) */
  user?: TestUser | null
  /** Authentication scenario to set up ('authenticated' | 'unauthenticated' | 'authFailure') */
  authScenario?: 'authenticated' | 'unauthenticated' | 'authFailure'
  /** Custom error message for auth failure scenario */
  authError?: string
}

/**
 * Response wrapper for API test results
 */
export interface ApiTestResponse {
  status: number
  body: unknown
  headers: Headers
}

/**
 * Main API testing utility that handles authentication setup and request execution
 */
export async function testApiRoute(config: ApiTestConfig): Promise<ApiTestResponse> {
  const {
    handler,
    url,
    method = 'POST',
    headers = {},
    body,
    user,
    authScenario = 'authenticated',
    authError
  } = config

  // Set up authentication based on scenario
  let authHeaders: Record<string, string> = {}
  
  if (authScenario === 'authenticated') {
    const authSetup = authTestScenarios.authenticated()
    authHeaders = authSetup.headers
  } else if (authScenario === 'unauthenticated') {
    authTestScenarios.unauthenticated()
  } else if (authScenario === 'authFailure') {
    authTestScenarios.authFailure(authError)
  }

  // If a specific user is provided, use it
  if (user) {
    authHeaders = createAuthHeaders(user)
  }

  let responseStatus: number
  let responseBody: unknown
  let responseHeaders: Headers

  await testApiHandler({
    appHandler: handler,
    url,
    test: async ({ fetch }) => {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers
        }
      }
      
      if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body)
      }
      
      const response = await fetch(fetchOptions)

      responseStatus = response.status
      responseHeaders = response.headers

      // Handle different response types
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        responseBody = await response.json()
      } else if (contentType?.includes('text/plain')) {
        responseBody = await response.text()
      } else {
        // Handle streaming responses or binary data
        responseBody = await response.text()
      }
    }
  })

  return {
    status: responseStatus!,
    body: responseBody,
    headers: responseHeaders!
  }
}

/**
 * Simplified test utilities for common API testing patterns
 */
export const apiTestPatterns = {
  /**
   * Test authenticated API route with valid user
   */
  authenticated: async (routeModule: ApiTestConfig['handler'], url: string, body?: unknown) => {
    return await testApiRoute({
      handler: routeModule,
      url,
      body,
      authScenario: 'authenticated'
    })
  },

  /**
   * Test unauthenticated API route (should return 401)
   */
  unauthenticated: async (routeModule: ApiTestConfig['handler'], url: string, body?: unknown) => {
    return await testApiRoute({
      handler: routeModule,
      url,
      body,
      authScenario: 'unauthenticated'
    })
  },

  /**
   * Test API route with authentication failure
   */
  authFailure: async (routeModule: ApiTestConfig['handler'], url: string, body?: unknown, error?: string) => {
    const config: ApiTestConfig = {
      handler: routeModule,
      url,
      body,
      authScenario: 'authFailure'
    }
    
    if (error !== undefined) {
      config.authError = error
    }
    
    return await testApiRoute(config)
  },

  /**
   * Test API route with invalid JSON body (should return 400)
   */
  invalidBody: async (routeModule: ApiTestConfig['handler'], url: string) => {
    return await testApiRoute({
      handler: routeModule,
      url,
      body: { invalid: 'data' },
      authScenario: 'authenticated'
    })
  }
}

/**
 * Utilities for testing specific API route types
 */
export const apiTestHelpers = {
  /**
   * Helper for testing file upload APIs (FormData)
   */
  fileUpload: async (config: Omit<ApiTestConfig, 'body'> & { file: File, formData?: Record<string, string> }) => {
    const { file, formData = {} } = config

    return new Promise<ApiTestResponse>((resolve) => {
      testApiHandler({
        appHandler: config.handler,
        url: config.url,
        test: async ({ fetch }) => {
          // Set up authentication
          let authHeaders: Record<string, string> = {}
          if (config.authScenario === 'authenticated') {
            const authSetup = authTestScenarios.authenticated()
            authHeaders = authSetup.headers
          }

          const formDataObj = new FormData()
          formDataObj.append('file', file)
          
          // Add additional form fields
          Object.entries(formData).forEach(([key, value]) => {
            formDataObj.append(key, value)
          })

          const response = await fetch({
            method: config.method || 'POST',
            headers: {
              // Don't set Content-Type for FormData - let fetch set it with boundary
              ...authHeaders,
              ...config.headers
            },
            body: formDataObj
          })

          const contentType = response.headers.get('content-type')
          let responseBody: unknown
          
          if (contentType?.includes('application/json')) {
            responseBody = await response.json()
          } else {
            responseBody = await response.text()
          }

          resolve({
            status: response.status,
            body: responseBody,
            headers: response.headers
          })
        }
      })
    })
  },

  /**
   * Helper for testing streaming response APIs
   */
  streamingResponse: async (config: ApiTestConfig) => {
    return new Promise<{ status: number, chunks: string[], headers: Headers }>((resolve) => {
      testApiHandler({
        appHandler: config.handler,
        url: config.url,
        test: async ({ fetch }) => {
          // Set up authentication
          let authHeaders: Record<string, string> = {}
          if (config.authScenario === 'authenticated') {
            const authSetup = authTestScenarios.authenticated()
            authHeaders = authSetup.headers
          }

          const fetchOptions: RequestInit = {
            method: config.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
              ...config.headers
            }
          }
          
          if (config.body !== undefined) {
            fetchOptions.body = JSON.stringify(config.body)
          }
          
          const response = await fetch(fetchOptions)

          const chunks: string[] = []
          
          if (response.body) {
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              
              const chunk = decoder.decode(value, { stream: true })
              chunks.push(chunk)
            }
          }

          resolve({
            status: response.status,
            chunks,
            headers: response.headers
          })
        }
      })
    })
  }
}

/**
 * Common assertion helpers for API responses
 */
export const apiAssertions = {
  /**
   * Assert successful API response
   */
  expectSuccess: (response: ApiTestResponse, expectedStatus: number = 200) => {
    expect(response.status).toBe(expectedStatus)
    return response.body
  },

  /**
   * Assert validation error response
   */
  expectValidationError: (response: ApiTestResponse) => {
    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: expect.any(String),
      code: 'VALIDATION_ERROR'
    })
  },

  /**
   * Assert authentication error response
   */
  expectAuthError: (response: ApiTestResponse) => {
    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      error: expect.any(String)
    })
  },

  /**
   * Assert server error response
   */
  expectServerError: (response: ApiTestResponse, code?: string) => {
    expect(response.status).toBe(500)
    if (code) {
      expect(response.body).toMatchObject({
        error: expect.any(String),
        code
      })
    }
  },

  /**
   * Assert response contains specific properties
   */
  expectResponseProperties: (response: ApiTestResponse, properties: string[], status: number = 200) => {
    expect(response.status).toBe(status)
    
    properties.forEach(prop => {
      expect(response.body).toHaveProperty(prop)
    })
  }
}