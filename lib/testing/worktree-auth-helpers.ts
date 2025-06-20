/**
 * Worktree-aware authentication helpers for browser automation and testing
 * 
 * This module provides utilities for managing authentication across multiple
 * Git worktrees, enabling concurrent browser automation without auth conflicts.
 * 
 * Each worktree gets its own test user to prevent session interference.
 */

import type { User } from '@supabase/supabase-js'

/**
 * Detect current environment ID from PORT environment variable
 * @returns Environment ID: 0 for main repo, 1-6 for worktrees
 */
export function getCurrentEnvironmentId(): number {
  const port = parseInt(process.env.PORT || '3000')
  return port - 3000 // Returns 0 for main (port 3000), 1-6 for worktrees (ports 3001-3006)
}

/**
 * Get environment name from environment ID
 * @param envId - Environment ID (0 for main, 1-6 for worktrees)
 * @returns Environment name
 */
export function getEnvironmentName(envId: number): string {
  return envId === 0 ? 'main' : `worktree${envId}`
}

/**
 * Get test user email for the specified environment
 * @param envId - Environment ID (0 for main, 1-6 for worktrees)
 * @returns Email address for the environment's test user
 */
export function getEnvironmentTestUser(envId: number): string {
  if (envId === 0) {
    return 'hello@spideryarn.com' // Main repository uses original test user
  }
  return `test-user${envId}@spideryarn.com` // Worktree-specific users
}

/**
 * Get test user credentials for the current environment
 * @returns Object with email and password for current environment
 */
export function getCurrentEnvironmentTestUser(): { email: string; password: string } {
  const envId = getCurrentEnvironmentId()
  return {
    email: getEnvironmentTestUser(envId),
    password: 'ASDFasdf1' // Same password for all test users
  }
}

/**
 * Get test user credentials for a specific environment
 * @param envId - Environment ID (0 for main, 1-6 for worktrees)
 * @returns Object with email and password for specified environment
 */
export function getTestUserForEnvironment(envId: number): { email: string; password: string } {
  return {
    email: getEnvironmentTestUser(envId),
    password: 'ASDFasdf1'
  }
}

/**
 * Create a mock User object for the current environment
 * Useful for API tests that need authenticated context
 * @returns User object with current environment's test user data
 */
export function createCurrentEnvironmentTestUser(): User {
  const { email } = getCurrentEnvironmentTestUser()
  const envId = getCurrentEnvironmentId()
  const envName = getEnvironmentName(envId)
  
  return {
    id: `test-user-${envName}-id`,
    email,
    app_metadata: {},
    user_metadata: {
      name: envId === 0 ? 'Admin User' : `Worktree ${envId} Test User`,
      environment: envName,
      worktree_id: envId
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    phone_confirmed_at: '',
    last_sign_in_at: new Date().toISOString(),
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    identities: [],
    is_anonymous: false,
    factors: []
  } as User
}

/**
 * Create a mock User object for a specific environment
 * @param envId - Environment ID (0 for main, 1-6 for worktrees)
 * @returns User object with specified environment's test user data
 */
export function createEnvironmentTestUser(envId: number): User {
  const { email } = getTestUserForEnvironment(envId)
  const envName = getEnvironmentName(envId)
  
  return {
    id: `test-user-${envName}-id`,
    email,
    app_metadata: {},
    user_metadata: {
      name: envId === 0 ? 'Admin User' : `Worktree ${envId} Test User`,
      environment: envName,
      worktree_id: envId
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    phone_confirmed_at: '',
    last_sign_in_at: new Date().toISOString(),
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    identities: [],
    is_anonymous: false,
    factors: []
  } as User
}

/**
 * Enhanced test namespace generation that includes environment awareness
 * Extends the existing getTestNamespace pattern with worktree prefixes
 * @param testName - Descriptive name for the test
 * @param envId - Optional environment ID (defaults to current environment)
 * @returns Environment-aware test namespace
 */
export function getWorktreeTestNamespace(testName: string, envId?: number): string {
  const actualEnvId = envId ?? getCurrentEnvironmentId()
  const envPrefix = actualEnvId === 0 ? 'main' : `wt${actualEnvId}`
  const timestamp = Date.now()
  // Use simple random string instead of crypto.randomUUID for compatibility
  const uuid = Math.random().toString(36).substring(2, 10)
  return `test-${envPrefix}-${testName}-${timestamp}-${uuid}`
}

/**
 * Create test user email with worktree-aware namespace
 * @param namespace - Test namespace from getWorktreeTestNamespace()
 * @param prefix - Optional prefix for the email (default: 'user')
 * @returns Unique email address for testing with worktree context
 */
export function createWorktreeTestEmail(namespace: string, prefix = 'user'): string {
  return `${prefix}_${namespace}@test.local`
}

/**
 * Validate that the current environment setup is correct
 * Checks that PORT is set and corresponds to a valid worktree environment
 * @returns Validation result with environment details
 */
export function validateEnvironmentSetup(): {
  isValid: boolean
  envId: number
  envName: string
  port: number
  testUser: string
  errors: string[]
} {
  const port = parseInt(process.env.PORT || '3000')
  const envId = getCurrentEnvironmentId()
  const envName = getEnvironmentName(envId)
  const testUser = getEnvironmentTestUser(envId)
  const errors: string[] = []
  
  // Check if PORT is valid (3000-3006)
  if (port < 3000 || port > 3006) {
    errors.push(`Invalid PORT ${port}. Expected 3000-3006.`)
  }
  
  // Check if environment ID is valid (0-6)
  if (envId < 0 || envId > 6) {
    errors.push(`Invalid environment ID ${envId}. Expected 0-6.`)
  }
  
  // Warn if PORT environment variable is not set
  if (!process.env.PORT) {
    errors.push('PORT environment variable not set. Defaulting to 3000 (main).')
  }
  
  return {
    isValid: errors.length === 0,
    envId,
    envName,
    port,
    testUser,
    errors
  }
}

/**
 * Generate environment-specific file paths for browser automation
 * @param envId - Environment ID (0 for main, 1-6 for worktrees)
 * @returns Object with all environment-specific paths
 */
export function getEnvironmentPaths(envId: number): {
  envName: string
  authFile: string
  screenshotDir: string
  testResultsDir: string
} {
  const envName = getEnvironmentName(envId)
  return {
    envName,
    authFile: `playwright/.auth/${envName}-user.json`,
    screenshotDir: `playwright/screenshots/${envName}/`,
    testResultsDir: `playwright/test-results/${envName}/`
  }
}

/**
 * Get environment-specific paths for current environment
 * @returns Object with current environment's paths
 */
export function getCurrentEnvironmentPaths(): {
  envName: string
  authFile: string
  screenshotDir: string
  testResultsDir: string
} {
  return getEnvironmentPaths(getCurrentEnvironmentId())
}

/**
 * Environment-aware test utilities combining worktree and auth helpers
 */
export const worktreeAuthUtils = {
  /**
   * Get current environment info
   */
  getCurrentEnv: () => ({
    id: getCurrentEnvironmentId(),
    name: getEnvironmentName(getCurrentEnvironmentId()),
    testUser: getCurrentEnvironmentTestUser(),
    mockUser: createCurrentEnvironmentTestUser(),
    paths: getCurrentEnvironmentPaths()
  }),
  
  /**
   * Get specific environment info
   */
  getEnv: (envId: number) => ({
    id: envId,
    name: getEnvironmentName(envId),
    testUser: getTestUserForEnvironment(envId),
    mockUser: createEnvironmentTestUser(envId),
    paths: getEnvironmentPaths(envId)
  }),
  
  /**
   * Validate current setup
   */
  validate: validateEnvironmentSetup,
  
  /**
   * Create namespace for current environment
   */
  createNamespace: (testName: string) => getWorktreeTestNamespace(testName),
  
  /**
   * Create namespace for specific environment
   */
  createNamespaceFor: (testName: string, envId: number) => getWorktreeTestNamespace(testName, envId),
  
  /**
   * Get paths for current environment
   */
  getPaths: () => getCurrentEnvironmentPaths(),
  
  /**
   * Get paths for specific environment
   */
  getPathsFor: (envId: number) => getEnvironmentPaths(envId)
}