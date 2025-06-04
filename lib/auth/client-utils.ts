/**
 * Client-side authentication utilities
 * 
 * This module provides utilities that can be used in client components
 * for handling authentication-related operations.
 */

/**
 * Get the redirect URL from the 'next' query parameter.
 * 
 * This function safely extracts and validates the return URL
 * from the query parameters, typically used after login.
 * 
 * @param searchParams - URLSearchParams object from Next.js
 * @param fallback - Default URL to use if no valid 'next' parameter
 * @returns string - The validated redirect URL
 * 
 * @example
 * ```typescript
 * // In a login form component
 * const searchParams = useSearchParams()
 * const redirectUrl = getRedirectUrl(searchParams, '/')
 * // After successful login:
 * router.push(redirectUrl)
 * ```
 */
export function getRedirectUrl(searchParams: URLSearchParams, fallback = '/'): string {
  const next = searchParams.get('next')
  
  if (!next) {
    return fallback
  }
  
  // Basic validation: ensure it's a relative URL to prevent open redirects
  if (!next.startsWith('/') || next.startsWith('//')) {
    return fallback
  }
  
  // Prevent redirect loops by avoiding auth pages
  if (next.startsWith('/auth/')) {
    return fallback
  }
  
  return next
}