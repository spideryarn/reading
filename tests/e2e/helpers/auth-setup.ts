import { test as base, expect, type TestInfo } from '@playwright/test'
import { RobustAuthManager } from '../../helpers/robust-auth'
import { getCurrentEnvironmentPaths, getEnvironmentName, getCurrentEnvironmentId } from '../../../lib/testing/worktree-auth-helpers'

/**
 * Enhanced authentication setup with per-worker storage state files
 * 
 * This pattern prevents write-contention when tests run in parallel by
 * giving each worker its own authentication state file.
 */

// Extend the base test with per-worker storage state file
export const test = base.extend<{ storageStateFile: string }>({
  storageStateFile: async ({}, use, workerInfo) => {
    const { envName } = getCurrentEnvironmentPaths()
    // Each worker gets its own auth file to avoid write contention
    const file = `playwright/.auth/${envName}-user-w${workerInfo.workerIndex}.json`
    await use(file)
  },
})

/**
 * Setup authentication for the current worker
 * 
 * This should be called in test.beforeAll() to create the auth state file
 * for the current worker. Each worker maintains its own auth state to enable
 * safe parallel execution.
 */
export async function setupWorkerAuthentication(browser: any, storageStateFile: string) {
  // Create a temporary context solely for authentication
  const context = await browser.newContext()
  const page = await context.newPage()
  const authManager = new RobustAuthManager(page)
  
  try {
    // Force re-authentication to ensure fresh state
    await authManager.loginAs('user', { forceReauth: true })
    
    // Save authentication state to worker-specific file
    await context.storageState({ 
      path: storageStateFile,
      // Include IndexedDB for Supabase auth persistence
      indexedDB: true
    })
    
    console.log(`✅ Authentication state saved to ${storageStateFile}`)
  } finally {
    // Clean up the temporary context
    await context.close()
  }
}

/**
 * Verify authentication is working for the current context
 * 
 * This helper can be used in tests to ensure auth state is correctly loaded.
 */
export async function verifyAuthentication(page: any) {
  // Navigate to a protected route
  await page.goto('/read')
  
  // Verify we're not redirected to login
  const currentUrl = page.url()
  if (currentUrl.includes('/auth/login') || currentUrl.includes('/auth/signin')) {
    throw new Error('Authentication verification failed - redirected to login')
  }
  
  // Additional check: verify we can see authenticated content
  await expect(page.locator('body')).not.toContainText('Sign in')
  await expect(page.locator('body')).not.toContainText('Log in')
}

/**
 * Create a unique namespace for test data to avoid collisions
 * 
 * This is especially important when running tests in parallel, as each
 * worker needs to work with its own data to avoid conflicts.
 */
export function createWorkerTestNamespace(testTitle: string, workerIndex: number): string {
  const envId = getCurrentEnvironmentId()
  const envName = getEnvironmentName(envId)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `test-${envName}-w${workerIndex}-${testTitle.replace(/\s+/g, '-').toLowerCase()}-${timestamp}-${random}`
}

/**
 * Helper to clean up test data created with a specific namespace
 * 
 * This should be called in test.afterEach() or test.afterAll() to ensure
 * test data doesn't accumulate in the database.
 */
export async function cleanupTestData(page: any, namespace: string) {
  // This would typically make API calls to delete test data
  // For now, we'll log the intention
  console.log(`🧹 Would clean up test data with namespace: ${namespace}`)
  // TODO: Implement actual cleanup once we have API endpoints for test data deletion
}

// Re-export expect for convenience
export { expect }