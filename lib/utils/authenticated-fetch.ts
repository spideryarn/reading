/**
 * Authenticated Fetch Wrapper
 * 
 * This module provides a centralized fetch wrapper that ensures
 * authentication cookies are included with all API requests.
 * 
 * IMPORTANT: Always use this wrapper for API calls instead of raw fetch()
 * to ensure authentication context is properly propagated.
 */

/**
 * Enhanced fetch that includes credentials for authentication
 * 
 * This wrapper automatically adds `credentials: 'include'` to all fetch requests,
 * ensuring that authentication cookies are sent with API calls. This is critical
 * for maintaining authentication context between the browser and API routes.
 * 
 * @param input - The URL or Request object
 * @param init - Optional RequestInit configuration
 * @returns Promise<Response> - The fetch response
 * 
 * @example
 * ```typescript
 * // Instead of:
 * const response = await fetch('/api/extract-url', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data)
 * })
 * 
 * // Use:
 * import { authenticatedFetch } from '@/lib/utils/authenticated-fetch'
 * const response = await authenticatedFetch('/api/extract-url', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data)
 * })
 * ```
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Ensure credentials are always included
  const enhancedInit: RequestInit = {
    ...init,
    credentials: 'include'
  }
  
  return fetch(input, enhancedInit)
}

/**
 * Convenience wrapper for JSON API calls with authentication
 * 
 * This function simplifies JSON API calls by automatically:
 * - Including credentials
 * - Setting Content-Type header
 * - Stringifying the body
 * - Parsing the JSON response
 * 
 * @param url - The API endpoint URL
 * @param options - Request options including method and body
 * @returns Promise<T> - The parsed JSON response
 * 
 * @example
 * ```typescript
 * interface ApiResponse {
 *   success: boolean
 *   documentId: string
 * }
 * 
 * const response = await authenticatedJsonFetch<ApiResponse>('/api/extract-url', {
 *   method: 'POST',
 *   body: {
 *     url: 'https://example.com',
 *     extractionMethod: 'readability'
 *   }
 * })
 * ```
 */
export async function authenticatedJsonFetch<T = any>(
  url: string,
  options: {
    method?: string
    body?: any
    headers?: HeadersInit
  } = {}
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
  }
  
  return response.json()
}

/**
 * Migration Guide
 * 
 * To fix authentication issues in E2E tests and ensure consistent behavior:
 * 
 * 1. Replace all direct fetch() calls to API endpoints with authenticatedFetch()
 * 2. For JSON APIs, use authenticatedJsonFetch() for cleaner code
 * 3. Always handle errors appropriately (authenticatedJsonFetch throws on non-ok responses)
 * 
 * Common patterns to replace:
 * 
 * OLD:
 * ```typescript
 * fetch('/api/endpoint', { method: 'POST', body: formData })
 * ```
 * 
 * NEW:
 * ```typescript
 * authenticatedFetch('/api/endpoint', { method: 'POST', body: formData })
 * ```
 * 
 * OLD:
 * ```typescript
 * fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data)
 * })
 * ```
 * 
 * NEW:
 * ```typescript
 * authenticatedJsonFetch('/api/endpoint', {
 *   method: 'POST',
 *   body: data
 * })
 * ```
 */