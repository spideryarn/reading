/**
 * Document ID Generation Utility
 * 
 * Generates UUID v4 identifiers for documents in the browser.
 * Used to create document IDs before uploading to ensure all
 * pages and assets are associated with the same document.
 */

'use client'

/**
 * Generate a UUID v4 document ID
 * Uses the browser's crypto API for secure random generation
 */
export function generateDocumentId(): string {
  // Use browser's crypto API if available
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  
  // Fallback implementation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Validate if a string is a valid UUID v4
 */
export function isValidDocumentId(id: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidV4Regex.test(id)
}

/**
 * Generate a document storage path
 */
export function getDocumentStoragePath(documentId: string, subPath?: string): string {
  if (!isValidDocumentId(documentId)) {
    throw new Error('Invalid document ID')
  }
  
  const basePath = `documents/${documentId}`
  return subPath ? `${basePath}/${subPath}` : basePath
}

/**
 * Generate an asset storage path for a document
 */
export function getDocumentAssetPath(documentId: string, filename: string): string {
  return getDocumentStoragePath(documentId, `assets/${filename}`)
}

/**
 * Generate the original file storage path for a document
 */
export function getDocumentOriginalPath(documentId: string, filename: string): string {
  return getDocumentStoragePath(documentId, `original/${filename}`)
}