/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Enhanced API Route Testing Utilities for RLS Security
 * 
 * Extends the basic API testing infrastructure with security-focused testing patterns,
 * multi-user context support, and comprehensive authentication scenarios.
 */

import { testApiHandler } from 'next-test-api-route-handler'
import { TEST_USERS, type TestUserKey, mockApiAuth } from './rls-test-context'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * Enhanced options for API route testing with security context
 */
export interface SecurityTestApiOptions {
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
  auth?: {
    user: TestUserKey | null
    bypassValidation?: boolean
  }
  expectedStatus?: number
  expectedError?: string
}

/**
 * Response object for API security tests
 */
export interface SecurityTestResponse {
  status: number
  body: any
  headers: Headers
  isSuccess: boolean
  isClientError: boolean
  isServerError: boolean
  isUnauthorized: boolean
  isForbidden: boolean
  isNotFound: boolean
}

/**
 * Test an API route with security context and enhanced assertions
 */
export async function testSecureApiRoute(
  handler: any,
  options: SecurityTestApiOptions = {}
): Promise<SecurityTestResponse> {
  const {
    url = '/api/test',
    method = 'GET',
    headers = {},
    body,
    auth,
    expectedStatus,
    expectedError
  } = options

  // Set up authentication context
  let authHeaders = {}
  if (auth) {
    authHeaders = mockApiAuth(auth.user)
  }

  let responseBody: any
  let responseStatus: number
  let responseHeaders: Headers

  await testApiHandler({
    appHandler: handler,
    url,
    test: async ({ fetch }) => {
      const response = await fetch({
        method,
        headers: {
          'content-type': 'application/json',
          ...authHeaders,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      responseStatus = response.status
      responseHeaders = response.headers
      
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        responseBody = await response.json()
      } else {
        responseBody = await response.text()
      }
    }
  })

  const result: SecurityTestResponse = {
    status: responseStatus,
    body: responseBody,
    headers: responseHeaders,
    isSuccess: responseStatus >= 200 && responseStatus < 300,
    isClientError: responseStatus >= 400 && responseStatus < 500,
    isServerError: responseStatus >= 500,
    isUnauthorized: responseStatus === 401,
    isForbidden: responseStatus === 403,
    isNotFound: responseStatus === 404,
  }

  // Optional status assertion
  if (expectedStatus !== undefined) {
    expect(result.status).toBe(expectedStatus)
  }

  // Optional error message assertion
  if (expectedError && result.isClientError) {
    expect(result.body).toMatchObject({ error: expectedError })
  }

  return result
}

/**
 * Test authentication requirements for an API endpoint
 */
export async function testAuthenticationRequired(
  handler: any,
  options: Omit<SecurityTestApiOptions, 'auth'> = {}
): Promise<void> {
  const response = await testSecureApiRoute(handler, {
    ...options,
    auth: { user: null }, // No authentication
    expectedStatus: 401,
  })

  expect(response.isUnauthorized).toBe(true)
  expect(response.body).toMatchObject({
    error: expect.stringMatching(/authentication|unauthorized/i)
  })
}

/**
 * Test ownership-based access control for an API endpoint
 */
export async function testOwnershipRequired(
  handler: any,
  resourceSetup: (userKey: TestUserKey) => Promise<any>,
  options: Omit<SecurityTestApiOptions, 'auth'> = {}
): Promise<void> {
  // Create resource as User A
  const resource = await resourceSetup('USER_A')
  
  // Test that User A can access (owner)
  const ownerResponse = await testSecureApiRoute(handler, {
    ...options,
    url: options.url?.replace(':id', resource.id) || `/api/test/${resource.id}`,
    auth: { user: 'USER_A' },
    expectedStatus: 200,
  })
  expect(ownerResponse.isSuccess).toBe(true)

  // Test that User B cannot access (non-owner)
  const nonOwnerResponse = await testSecureApiRoute(handler, {
    ...options,
    url: options.url?.replace(':id', resource.id) || `/api/test/${resource.id}`,
    auth: { user: 'USER_B' },
    expectedStatus: 404, // Should return 404 to prevent info leakage
  })
  expect(nonOwnerResponse.isNotFound).toBe(true)
}

/**
 * Test cross-user isolation for an API endpoint
 */
export async function testCrossUserIsolation(
  handler: any,
  setupA: () => Promise<any>,
  setupB: () => Promise<any>,
  listEndpoint: string
): Promise<void> {
  // Set up resources for both users
  const resourceA = await setupA()
  const resourceB = await setupB()

  // Test User A can only see their own resources
  const userAResponse = await testSecureApiRoute(handler, {
    url: listEndpoint,
    auth: { user: 'USER_A' },
    expectedStatus: 200,
  })
  
  expect(userAResponse.isSuccess).toBe(true)
  expect(Array.isArray(userAResponse.body)).toBe(true)
  
  // Should only contain User A's resources
  const userAIds = userAResponse.body.map((item: any) => item.id)
  expect(userAIds).toContain(resourceA.id)
  expect(userAIds).not.toContain(resourceB.id)

  // Test User B can only see their own resources  
  const userBResponse = await testSecureApiRoute(handler, {
    url: listEndpoint,
    auth: { user: 'USER_B' },
    expectedStatus: 200,
  })
  
  expect(userBResponse.isSuccess).toBe(true)
  expect(Array.isArray(userBResponse.body)).toBe(true)
  
  // Should only contain User B's resources
  const userBIds = userBResponse.body.map((item: any) => item.id)
  expect(userBIds).toContain(resourceB.id)
  expect(userBIds).not.toContain(resourceA.id)
}

/**
 * Test public vs private access patterns
 */
export async function testPublicPrivateAccess(
  handler: any,
  publicResourceSetup: () => Promise<any>,
  privateResourceSetup: () => Promise<any>,
  options: Omit<SecurityTestApiOptions, 'auth'> = {}
): Promise<void> {
  const publicResource = await publicResourceSetup()
  const privateResource = await privateResourceSetup()

  // Authenticated users should access public resources
  const authPublicResponse = await testSecureApiRoute(handler, {
    ...options,
    url: options.url?.replace(':id', publicResource.id) || `/api/test/${publicResource.id}`,
    auth: { user: 'USER_B' }, // Different user than owner
    expectedStatus: 200,
  })
  expect(authPublicResponse.isSuccess).toBe(true)

  // Authenticated users should NOT access others' private resources
  const authPrivateResponse = await testSecureApiRoute(handler, {
    ...options,
    url: options.url?.replace(':id', privateResource.id) || `/api/test/${privateResource.id}`,
    auth: { user: 'USER_B' }, // Different user than owner
    expectedStatus: 404,
  })
  expect(authPrivateResponse.isNotFound).toBe(true)

  // TODO: Test unauthenticated access to public resources (Phase 2)
}

/**
 * Test input validation and security boundaries
 */
export async function testInputValidation(
  handler: any,
  invalidInputs: Array<{ input: any; expectedStatus: number; description: string }>,
  options: Omit<SecurityTestApiOptions, 'body'> = {}
): Promise<void> {
  for (const { input, expectedStatus, description } of invalidInputs) {
    const response = await testSecureApiRoute(handler, {
      ...options,
      body: input,
      auth: options.auth || { user: 'USER_A' },
    })

    expect(response.status).toBe(expectedStatus), 
      `Failed for input: ${description} - Expected ${expectedStatus}, got ${response.status}`
    
    if (response.isClientError) {
      expect(response.body).toHaveProperty('error')
    }
  }
}

/**
 * Test SQL injection and XSS protection
 */
export async function testSecurityBoundaries(
  handler: any,
  options: SecurityTestApiOptions = {}
): Promise<void> {
  const maliciousInputs = [
    {
      input: { title: "'; DROP TABLE documents; --" },
      expectedStatus: 400,
      description: 'SQL injection attempt'
    },
    {
      input: { content: "<script>alert('xss')</script>" },
      expectedStatus: 400,
      description: 'XSS script injection'
    },
    {
      input: { id: '../../../etc/passwd' },
      expectedStatus: 400,
      description: 'Path traversal attempt'
    }
  ]

  await testInputValidation(handler, maliciousInputs, options)
}

/**
 * Test API rate limiting (if implemented)
 */
export async function testRateLimiting(
  handler: any,
  options: SecurityTestApiOptions = {},
  requestCount: number = 100
): Promise<void> {
  const responses: SecurityTestResponse[] = []
  
  // Make multiple rapid requests
  for (let i = 0; i < requestCount; i++) {
    const response = await testSecureApiRoute(handler, {
      ...options,
      auth: options.auth || { user: 'USER_A' },
    })
    responses.push(response)
    
    // Stop if we hit rate limiting
    if (response.status === 429) {
      expect(response.body).toMatchObject({
        error: expect.stringMatching(/rate limit|too many requests/i)
      })
      return
    }
  }

  // If no rate limiting detected, that's okay for now
  console.warn('No rate limiting detected in API endpoint')
}

/**
 * Test error response security (no information leakage)
 */
export async function testErrorResponseSecurity(
  handler: any,
  options: SecurityTestApiOptions = {}
): Promise<void> {
  // Test unauthorized access returns generic 404, not 403
  const unauthorizedResponse = await testSecureApiRoute(handler, {
    ...options,
    auth: { user: 'USER_B' }, // Wrong user
  })

  if (unauthorizedResponse.status === 404) {
    // Good - no information leakage about resource existence
    expect(unauthorizedResponse.body).not.toMatch(/unauthorized|forbidden/i)
  } else if (unauthorizedResponse.status === 403) {
    // Acceptable but logs info about resource existence
    console.warn('API returns 403 instead of 404 - potential info leakage')
  }

  // Test that error messages don't contain sensitive information
  if (unauthorizedResponse.isClientError || unauthorizedResponse.isServerError) {
    const errorBody = JSON.stringify(unauthorizedResponse.body).toLowerCase()
    
    // Should not contain database details
    expect(errorBody).not.toMatch(/postgres|supabase|sql|table|column/)
    
    // Should not contain internal paths
    expect(errorBody).not.toMatch(/\/lib\/|\/app\/|\/src\//)
    
    // Should not contain user IDs in error messages
    expect(errorBody).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
  }
}

/**
 * Comprehensive security test suite for an API endpoint
 */
export async function runSecurityTestSuite(
  handler: any,
  config: {
    endpoint: string
    requiresAuth: boolean
    requiresOwnership: boolean
    supportsPublicAccess?: boolean
    resourceSetup?: (userKey: TestUserKey) => Promise<any>
    publicResourceSetup?: () => Promise<any>
    privateResourceSetup?: () => Promise<any>
    method?: string
    body?: any
  }
): Promise<void> {
  const { 
    endpoint, 
    requiresAuth, 
    requiresOwnership, 
    supportsPublicAccess,
    resourceSetup,
    publicResourceSetup,
    privateResourceSetup,
    method = 'GET',
    body 
  } = config

  console.log(`Running security test suite for ${method} ${endpoint}`)

  // Test 1: Authentication requirements
  if (requiresAuth) {
    await testAuthenticationRequired(handler, { url: endpoint, method, body })
  }

  // Test 2: Ownership requirements
  if (requiresOwnership && resourceSetup) {
    await testOwnershipRequired(handler, resourceSetup, { url: endpoint, method, body })
  }

  // Test 3: Public vs private access
  if (supportsPublicAccess && publicResourceSetup && privateResourceSetup) {
    await testPublicPrivateAccess(handler, publicResourceSetup, privateResourceSetup, {
      url: endpoint,
      method,
      body
    })
  }

  // Test 4: Input validation and security boundaries
  await testSecurityBoundaries(handler, { url: endpoint, method })

  // Test 5: Error response security
  await testErrorResponseSecurity(handler, { url: endpoint, method, body })

  console.log(`✅ Security test suite completed for ${method} ${endpoint}`)
}

/**
 * Create a mock NextRequest for testing
 * (Enhanced version of the basic createMockRequest)
 */
export function createSecureMockRequest(
  url: string, 
  options: {
    method?: string
    headers?: Record<string, string>
    body?: unknown
    auth?: { user: TestUserKey | null }
  } = {}
): Request {
  const { method = 'GET', headers = {}, body, auth } = options
  
  let authHeaders = {}
  if (auth) {
    authHeaders = mockApiAuth(auth.user)
  }

  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...authHeaders,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Test helper for document-specific API security patterns
 */
export const DocumentApiSecurity = {
  /**
   * Test document creation with ownership
   */
  testCreateDocument: async (handler: any, documentData: any) => {
    return testSecureApiRoute(handler, {
      method: 'POST',
      body: documentData,
      auth: { user: 'USER_A' },
      expectedStatus: 201,
    })
  },

  /**
   * Test document retrieval with ownership check
   */
  testGetDocument: async (handler: any, documentId: string, owner: TestUserKey) => {
    // Owner should access successfully
    const ownerResponse = await testSecureApiRoute(handler, {
      url: `/api/documents/${documentId}`,
      auth: { user: owner },
      expectedStatus: 200,
    })
    expect(ownerResponse.isSuccess).toBe(true)

    // Non-owner should get 404
    const nonOwner = owner === 'USER_A' ? 'USER_B' : 'USER_A'
    const nonOwnerResponse = await testSecureApiRoute(handler, {
      url: `/api/documents/${documentId}`,
      auth: { user: nonOwner },
      expectedStatus: 404,
    })
    expect(nonOwnerResponse.isNotFound).toBe(true)
  },

  /**
   * Test document deletion with ownership check
   */
  testDeleteDocument: async (handler: any, documentId: string, owner: TestUserKey) => {
    // Non-owner should not be able to delete
    const nonOwner = owner === 'USER_A' ? 'USER_B' : 'USER_A'
    const nonOwnerResponse = await testSecureApiRoute(handler, {
      url: `/api/documents/${documentId}`,
      method: 'DELETE',
      auth: { user: nonOwner },
      expectedStatus: 404,
    })
    expect(nonOwnerResponse.isNotFound).toBe(true)

    // Owner should be able to delete
    const ownerResponse = await testSecureApiRoute(handler, {
      url: `/api/documents/${documentId}`,
      method: 'DELETE',
      auth: { user: owner },
      expectedStatus: 200,
    })
    expect(ownerResponse.isSuccess).toBe(true)
  }
}