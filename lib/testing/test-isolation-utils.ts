/**
 * Test isolation utilities for shared database testing
 * 
 * These utilities enable tests to run safely in a shared database environment
 * by providing UUID-based namespacing and automatic cleanup tracking.
 * 
 * Following Supabase's recommendation: "Application-level tests should not rely 
 * on a clean database state. Instead, design your tests to be independent by 
 * using unique user IDs for each test case."
 */

import { v4 as uuidv4 } from 'uuid'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Tracks test data created during test execution for cleanup
 */
interface TestDataTracker {
  documents: string[]
  users: string[]
  threads: string[]
  enhancements: string[]
  aiCalls: string[]
  messages: string[]
}

/**
 * Global test data trackers keyed by test namespace
 */
const testDataTrackers = new Map<string, TestDataTracker>()

/**
 * Generate a unique test namespace for isolating test data
 * @param testName - Descriptive name for the test (e.g., 'auth-test', 'rls-policy-test')
 * @returns Unique namespace string combining test name and UUID
 */
export function getTestNamespace(testName: string): string {
  const timestamp = Date.now()
  const uuid = uuidv4().slice(0, 8) // Use first 8 chars for brevity
  return `test_${testName}_${timestamp}_${uuid}`
}

/**
 * Create a test-scoped email address
 * @param namespace - Test namespace from getTestNamespace()
 * @param prefix - Optional prefix for the email (default: 'user')
 * @returns Unique email address for testing
 */
export function createTestEmail(namespace: string, prefix = 'user'): string {
  return `${prefix}_${namespace}@test.local`
}

/**
 * Initialize tracking for a test namespace
 * @param namespace - Test namespace to track
 */
export function initTestTracking(namespace: string): void {
  if (!testDataTrackers.has(namespace)) {
    testDataTrackers.set(namespace, {
      documents: [],
      users: [],
      threads: [],
      enhancements: [],
      aiCalls: [],
      messages: []
    })
  }
}

/**
 * Track a created test record for later cleanup
 * @param namespace - Test namespace
 * @param type - Type of record (documents, users, etc.)
 * @param id - ID of the created record
 */
export function trackTestData(
  namespace: string,
  type: keyof TestDataTracker,
  id: string
): void {
  const tracker = testDataTrackers.get(namespace)
  if (!tracker) {
    throw new Error(`Test namespace ${namespace} not initialized. Call initTestTracking() first.`)
  }
  tracker[type].push(id)
}

/**
 * Get all tracked data for a namespace
 * @param namespace - Test namespace
 * @returns TestDataTracker with all tracked IDs
 */
export function getTrackedData(namespace: string): TestDataTracker | undefined {
  return testDataTrackers.get(namespace)
}

/**
 * Clear tracked data for a namespace (after cleanup)
 * @param namespace - Test namespace
 */
export function clearTestTracking(namespace: string): void {
  testDataTrackers.delete(namespace)
}

/**
 * Generate a test-safe ID
 * @returns UUID for test data
 */
export function createTestId(): string {
  const uuid = uuidv4()
  // Store namespace info in a comment-like format that won't break UUID parsing
  // but allows us to identify test data if needed
  return uuid
}

/**
 * Create test metadata object that includes namespace
 * This can be added to any record to mark it as test data
 * @param namespace - Test namespace
 * @param additionalMetadata - Any additional metadata to include
 */
export function createTestMetadata(
  namespace: string,
  additionalMetadata?: Record<string, unknown>
): Record<string, unknown> {
  return {
    test_namespace: namespace,
    test_created_at: new Date().toISOString(),
    is_test_data: true,
    ...additionalMetadata
  }
}

/**
 * Helper to create a test user object with proper namespacing
 * @param namespace - Test namespace
 * @param overrides - Optional overrides for user properties
 */
export function createTestUser(
  namespace: string,
  overrides?: Partial<{
    email: string
    fullName: string
    metadata: Record<string, unknown>
  }>
) {
  initTestTracking(namespace)
  
  return {
    id: createTestId(),
    email: overrides?.email || createTestEmail(namespace),
    full_name: overrides?.fullName || `Test User ${namespace}`,
    metadata: {
      ...createTestMetadata(namespace),
      ...overrides?.metadata
    }
  }
}

/**
 * Helper to create a test document object with proper namespacing
 * @param namespace - Test namespace
 * @param overrides - Optional overrides for document properties
 */
export function createTestDocument(
  namespace: string,
  overrides?: Partial<{
    title: string
    content: string
    metadata: Record<string, unknown>
  }>
) {
  initTestTracking(namespace)
  
  return {
    id: createTestId(),
    title: overrides?.title || `Test Document ${namespace}`,
    html_content: overrides?.content || `<p>Test content for ${namespace}</p>`,
    plaintext_content: overrides?.content?.replace(/<[^>]*>/g, '') || `Test content for ${namespace}`,
    metadata: {
      ...createTestMetadata(namespace),
      ...overrides?.metadata
    }
  }
}

/**
 * Batch cleanup helper for removing all test data in a namespace
 * Returns an object with cleanup functions for each data type
 * 
 * Usage:
 * ```
 * const cleanup = getCleanupFunctions(namespace, supabase)
 * await cleanup.documents()
 * await cleanup.users()
 * // or cleanup everything:
 * await cleanup.all()
 * ```
 */
export function getCleanupFunctions(namespace: string, supabase: SupabaseClient) {
  const tracker = getTrackedData(namespace)
  
  const cleanupFunctions = {
    documents: async () => {
      if (tracker?.documents.length) {
        const { error } = await supabase
          .from('documents')
          .delete()
          .in('id', tracker.documents)
        if (error) throw error
      }
    },
    
    users: async () => {
      if (tracker?.users.length) {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .in('id', tracker.users)
        if (error) throw error
      }
    },
    
    threads: async () => {
      if (tracker?.threads.length) {
        const { error } = await supabase
          .from('chat_threads')
          .delete()
          .in('id', tracker.threads)
        if (error) throw error
      }
    },
    
    enhancements: async () => {
      if (tracker?.enhancements.length) {
        const { error } = await supabase
          .from('document_enhancements')
          .delete()
          .in('id', tracker.enhancements)
        if (error) throw error
      }
    },
    
    aiCalls: async () => {
      if (tracker?.aiCalls.length) {
        const { error } = await supabase
          .from('ai_calls')
          .delete()
          .in('id', tracker.aiCalls)
        if (error) throw error
      }
    },
    
    messages: async () => {
      if (tracker?.messages.length) {
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .in('id', tracker.messages)
        if (error) throw error
      }
    },
    
    all: async () => {
      // Clean up in reverse dependency order
      await cleanupFunctions.messages()
      await cleanupFunctions.enhancements()
      await cleanupFunctions.aiCalls()
      await cleanupFunctions.threads()
      await cleanupFunctions.documents()
      await cleanupFunctions.users()
      
      // Clear tracking after successful cleanup
      clearTestTracking(namespace)
    }
  }
  
  return cleanupFunctions
}