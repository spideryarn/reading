/**
 * Test utilities for cleaning up documents created during E2E tests
 * 
 * Provides functions to track and clean up test documents to prevent
 * accumulation of test data in the database.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database-auto-generated'

// Track created documents per test file
const testDocuments = new Map<string, Set<string>>()

// Admin client for cleanup - lazy initialization
let adminClient: ReturnType<typeof createClient<Database>> | null = null

function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
  return adminClient
}

/**
 * Track a document ID for cleanup after tests
 * 
 * @param testName - Name of the test file or test suite
 * @param documentId - The document ID to track for cleanup
 */
export function trackDocumentForCleanup(testName: string, documentId: string): void {
  if (!testDocuments.has(testName)) {
    testDocuments.set(testName, new Set())
  }
  testDocuments.get(testName)!.add(documentId)
  console.log(`📝 Tracked document ${documentId} for cleanup in ${testName}`)
}

/**
 * Clean up all documents created by a specific test
 * 
 * @param testName - Name of the test file or test suite
 * @returns Number of documents cleaned up
 */
export async function cleanupTestDocuments(testName: string): Promise<number> {
  const documentIds = testDocuments.get(testName)
  if (!documentIds || documentIds.size === 0) {
    return 0
  }

  const client = getAdminClient()
  let cleanedCount = 0

  for (const docId of documentIds) {
    try {
      const { error } = await client
        .from('documents')
        .delete()
        .eq('id', docId)
      
      if (!error) {
        cleanedCount++
        console.log(`🧹 Cleaned up document ${docId}`)
      } else {
        console.warn(`⚠️ Failed to cleanup document ${docId}:`, error)
      }
    } catch (error) {
      console.warn(`⚠️ Error cleaning up document ${docId}:`, error)
    }
  }

  // Clear the tracked documents for this test
  testDocuments.delete(testName)
  
  return cleanedCount
}

/**
 * Clean up all tracked documents across all tests
 * 
 * @returns Total number of documents cleaned up
 */
export async function cleanupAllTestDocuments(): Promise<number> {
  let totalCleaned = 0
  
  for (const [testName, _] of testDocuments) {
    const cleaned = await cleanupTestDocuments(testName)
    totalCleaned += cleaned
  }
  
  return totalCleaned
}

/**
 * Extract document ID from a URL path
 * 
 * @param url - The full URL or path containing the document ID
 * @returns The extracted document ID or null if not found
 * 
 * @example
 * extractDocumentIdFromUrl('http://localhost:3000/read/abc123')
 * // Returns: 'abc123'
 */
export function extractDocumentIdFromUrl(url: string): string | null {
  const match = url.match(/\/read\/([a-zA-Z0-9\-]+)/)
  return match?.[1] ?? null
}

/**
 * Clean up documents older than a specified age
 * 
 * @param ageInHours - Age threshold in hours
 * @returns Number of documents cleaned up
 */
export async function cleanupOldTestDocuments(ageInHours: number = 24): Promise<number> {
  const client = getAdminClient()
  const cutoffDate = new Date(Date.now() - ageInHours * 60 * 60 * 1000).toISOString()
  
  try {
    // Only clean up documents with test-related patterns in their slugs
    const { data, error } = await client
      .from('documents')
      .delete()
      .lt('created_at', cutoffDate)
      .or('slug.ilike.%test-%,slug.ilike.%timestamp-%')
      .select('id')
    
    if (error) {
      console.error('Failed to cleanup old test documents:', error)
      return 0
    }
    
    const count = data?.length || 0
    if (count > 0) {
      console.log(`🧹 Cleaned up ${count} old test documents`)
    }
    
    return count
  } catch (error) {
    console.error('Error cleaning up old test documents:', error)
    return 0
  }
}