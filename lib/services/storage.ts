/**
 * Supabase Storage utilities for document file operations
 * 
 * Handles upload, download, and management of original document files
 * in the documents bucket following the path format: {document-uuid}/original/{filename}
 */

import { createClient } from '@/lib/supabase/server'

// Storage configuration constants
const DOCUMENTS_BUCKET = 'documents'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/html',
  'text/plain'
]

export interface StorageUploadResult {
  path: string
  fullPath: string
  size: number
  mimeType: string
}

export class StorageError extends Error {
  code?: string
  statusCode?: number
  
  constructor(message: string, code?: string, statusCode?: number) {
    super(message)
    this.name = 'StorageError'
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * Upload a document file to Supabase Storage
 * 
 * @param file - File to upload (File or Blob)
 * @param documentId - UUID of the document this file belongs to
 * @param originalFilename - Original filename (optional, will use file.name if File object)
 * @returns Storage path for database reference
 */
export async function uploadDocumentFile(
  file: File | Blob,
  documentId: string,
  originalFilename?: string
): Promise<StorageUploadResult> {
  const supabase = await createClient()
  
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new StorageError(`File size ${file.size} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`)
  }
  
  // Validate MIME type
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new StorageError(`File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`)
  }
  
  // Determine filename
  const filename = originalFilename || (file as File).name || 'document'
  
  // Construct storage path: {document-uuid}/original/{filename}
  const storagePath = `${documentId}/original/${filename}`
  
  try {
    // Upload to storage
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600', // 1 hour cache
        upsert: false // Prevent overwriting existing files
      })
    
    if (error) {
      throw new StorageError(`Upload failed: ${error.message}`)
    }
    
    return {
      path: data.path,
      fullPath: data.fullPath,
      size: file.size,
      mimeType: file.type || 'application/octet-stream'
    }
    
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    
    // Handle specific Supabase storage errors
    const err = error as { message?: string }
    if (err.message?.includes('Asset Already Exists')) {
      throw new StorageError(`File already exists at path: ${storagePath}`)
    }
    if (err.message?.includes('Bucket not found')) {
      throw new StorageError(`Storage bucket '${DOCUMENTS_BUCKET}' not found. Run storage setup first.`)
    }
    
    throw new StorageError(`Unexpected upload error: ${err.message}`)
  }
}

/**
 * Download a document file from Supabase Storage
 * 
 * @param storagePath - Storage path returned from upload operation
 * @returns File blob data
 */
export async function downloadDocumentFile(storagePath: string): Promise<Blob> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(storagePath)
    
    if (error) {
      throw new StorageError(`Download failed: ${error.message}`)
    }
    
    if (!data) {
      throw new StorageError(`No data returned for path: ${storagePath}`)
    }
    
    return data
    
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    if (err.message?.includes('Object not found')) {
      throw new StorageError(`File not found at path: ${storagePath}`)
    }
    
    throw new StorageError(`Unexpected download error: ${err.message}`)
  }
}

/**
 * Get a signed URL for temporary access to a private file
 * 
 * @param storagePath - Storage path of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL for temporary access
 */
export async function getSignedDocumentUrl(
  storagePath: string, 
  expiresIn: number = 3600
): Promise<string> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresIn)
    
    if (error) {
      throw new StorageError(`Failed to create signed URL: ${error.message}`)
    }
    
    if (!data?.signedUrl) {
      throw new StorageError(`No signed URL returned for path: ${storagePath}`)
    }
    
    return data.signedUrl
    
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new StorageError(`Unexpected signed URL error: ${err.message}`)
  }
}

/**
 * Get a public URL for a file (only works if file has public access)
 * 
 * @param storagePath - Storage path of the file
 * @returns Public URL (no expiration)
 */
export function getPublicDocumentUrl(storagePath: string): string {
  const supabase = createClient()
  
  const { data } = supabase.storage
    .from(DOCUMENTS_BUCKET)
    .getPublicUrl(storagePath)
  
  return data.publicUrl
}

/**
 * Delete a document file from storage
 * 
 * @param storagePath - Storage path of the file to delete
 */
export async function deleteDocumentFile(storagePath: string): Promise<void> {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([storagePath])
    
    if (error) {
      throw new StorageError(`Delete failed: ${error.message}`)
    }
    
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new StorageError(`Unexpected delete error: ${err.message}`)
  }
}

/**
 * List all files for a specific document
 * 
 * @param documentId - UUID of the document
 * @returns Array of file objects in the document folder
 */
export async function listDocumentFiles(documentId: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list(documentId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    
    if (error) {
      throw new StorageError(`List failed: ${error.message}`)
    }
    
    return data || []
    
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new StorageError(`Unexpected list error: ${err.message}`)
  }
}

/**
 * Clean up orphaned files that don't have corresponding database records
 * 
 * @param documentIds - Array of valid document IDs from database
 * @returns Number of files cleaned up
 */
export async function cleanupOrphanedFiles(documentIds: string[]): Promise<number> {
  const supabase = await createClient()
  
  try {
    // List all files in the bucket
    const { data: allFiles, error: listError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list('', { limit: 1000 })
    
    if (listError) {
      throw new StorageError(`Failed to list files for cleanup: ${listError.message}`)
    }
    
    if (!allFiles) return 0
    
    // Identify orphaned files
    const validDocumentIds = new Set(documentIds)
    const orphanedPaths: string[] = []
    
    for (const file of allFiles) {
      if (file.name) {
        const documentId = file.name.split('/')[0]
        if (!validDocumentIds.has(documentId)) {
          orphanedPaths.push(file.name)
        }
      }
    }
    
    // Remove orphaned files
    if (orphanedPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove(orphanedPaths)
      
      if (removeError) {
        throw new StorageError(`Failed to remove orphaned files: ${removeError.message}`)
      }
    }
    
    return orphanedPaths.length
    
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new StorageError(`Unexpected cleanup error: ${err.message}`)
  }
}

/**
 * Get storage usage statistics for monitoring
 */
export async function getStorageStats() {
  const supabase = await createClient()
  
  try {
    const { data: files, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list('', { limit: 1000 })
    
    if (error) {
      throw new StorageError(`Failed to get storage stats: ${error.message}`)
    }
    
    if (!files) {
      return { totalFiles: 0, totalSize: 0 }
    }
    
    const totalFiles = files.length
    const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
    
    return {
      totalFiles,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize)
    }
    
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new StorageError(`Unexpected stats error: ${err.message}`)
  }
}

/**
 * Helper function to format bytes in human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}