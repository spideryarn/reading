/**
 * Test Error Page - For Testing 500 Error Page
 * 
 * This page intentionally throws a JavaScript error during component rendering
 * to trigger React's error boundary and display our custom 500 error page.
 * 
 * Used for E2E testing to ensure the 500 error page displays correctly.
 * Access at: /error
 */

export default function TestErrorPage() {
  // Throw error only in non-production builds so E2E tests can still verify 500 pages.
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      'Test error for 500 page testing – this is intentional for E2E testing purposes',
    )
  }

  // In production just render a minimal placeholder (page is inaccessible in normal navigation)
  return null
}