/**
 * Supabase Storage utilities for document file operations
 * 
 * Handles upload, download, and management of original document files
 * in the documents bucket following the path format: {document-uuid}/original/{filename}
 */

import { createClient } from '@/lib/supabase/server'
import { shouldThrowStorageError, getStorageErrorMessage, detectEnvironment } from '@/lib/utils/environment'
import { UPLOAD_LIMITS } from '@/lib/config'

// Storage configuration constants
const DOCUMENTS_BUCKET = 'documents'
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
    if (code !== undefined) {
      this.code = code
    }
    if (statusCode !== undefined) {
      this.statusCode = statusCode
    }
  }
}

/**
 * Upload a document file to Supabase Storage
 * 
 * @param file - File to upload (File or Blob)
 * @param documentId - UUID of the document this file belongs to
 * @param originalFilename - Original filename (optional, will use file.name if File object)
 * @returns Storage path for database reference, or null if upload failed but should be handled gracefully
 */
export async function uploadDocumentFile(
  file: File | Blob,
  documentId: string,
  originalFilename?: string
): Promise<StorageUploadResult | null> {
  const supabase = await createClient()
  
  // Validate file size using centralized limits
  if (file.size > UPLOAD_LIMITS.GENERAL_MAX_SIZE_BYTES) {
    throw new StorageError(`File size ${file.size} exceeds maximum allowed size of ${UPLOAD_LIMITS.GENERAL_MAX_SIZE_BYTES} bytes`)
  }
  
  // Validate MIME type (parse base type, ignoring parameters like charset)
  const baseMimeType = file.type?.split(';')[0]?.trim() || ''
  if (file.type && !ALLOWED_MIME_TYPES.includes(baseMimeType)) {
    throw new StorageError(`File type ${baseMimeType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`)
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
      const env = detectEnvironment()
      
      // Environment-aware error handling
      if (shouldThrowStorageError(error.message)) {
        throw new StorageError(getStorageErrorMessage(error.message))
      } else {
        // Expected failure in this environment - log but don't throw
        console.warn(`Storage upload failed (expected in ${env.isLocalSupabase ? 'local development' : 'this environment'}):`, error.message)
        return null // Indicate storage failed but document can still be created
      }
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
    
    // Handle specific Supabase storage errors with environment awareness
    const err = error as { message?: string }
    const errorMessage = err.message || 'Unknown error'
    
    if (errorMessage.includes('Asset Already Exists')) {
      throw new StorageError(`File already exists at path: ${storagePath}`)
    }
    if (errorMessage.includes('Bucket not found')) {
      throw new StorageError(`Storage bucket '${DOCUMENTS_BUCKET}' not found. Run storage setup first.`)
    }
    
    // Environment-aware error handling for unexpected errors
    if (shouldThrowStorageError(errorMessage)) {
      throw new StorageError(getStorageErrorMessage(errorMessage))
    } else {
      // Expected failure in this environment - log but return null
      const env = detectEnvironment()
      console.warn(`Storage upload failed (expected in ${env.isLocalSupabase ? 'local development' : 'this environment'}):`, errorMessage)
      return null
    }
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
 * Upload an image asset to Supabase Storage
 * 
 * @param imageData - Image data as Blob or base64 string  
 * @param documentId - UUID of the document this asset belongs to
 * @param filename - Filename for the asset (should be descriptive and filename-safe)
 * @param mimeType - MIME type of the image (e.g., 'image/png', 'image/jpeg')
 * @returns Storage path for database reference, or null if upload failed but should be handled gracefully
 */
export async function uploadImageAsset(
  imageData: Blob | string,
  documentId: string,
  filename: string,
  mimeType: string = 'image/png'
): Promise<StorageUploadResult | null> {
  const supabase = await createClient()
  
  // Convert base64 string to Blob if needed
  let fileBlob: Blob
  if (typeof imageData === 'string') {
    // Handle base64 data URLs
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    fileBlob = new Blob([bytes], { type: mimeType })
  } else {
    fileBlob = imageData
  }
  
  // Validate file size using centralized limits  
  if (fileBlob.size > UPLOAD_LIMITS.GENERAL_MAX_SIZE_BYTES) {
    throw new StorageError(`Image size ${fileBlob.size} exceeds maximum allowed size of ${UPLOAD_LIMITS.GENERAL_MAX_SIZE_BYTES} bytes`)
  }
  
  // Construct storage path: {document-uuid}/assets/{filename}
  const storagePath = `${documentId}/assets/${filename}`
  
  try {
    // Upload to storage
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, fileBlob, {
        cacheControl: '3600', // 1 hour cache
        upsert: false, // Prevent overwriting existing files
        contentType: mimeType
      })
    
    if (error) {
      const env = detectEnvironment()
      
      // Environment-aware error handling
      if (shouldThrowStorageError(error.message)) {
        throw new StorageError(getStorageErrorMessage(error.message))
      } else {
        // Expected failure in this environment - log but don't throw
        console.warn(`Image asset upload failed (expected in ${env.isLocalSupabase ? 'local development' : 'this environment'}):`, error.message)
        return null // Indicate storage failed but processing can continue
      }
    }
    
    return {
      path: data.path,
      fullPath: data.fullPath,
      size: fileBlob.size,
      mimeType: mimeType
    }
    
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    
    // Handle specific Supabase storage errors with environment awareness
    const err = error as { message?: string }
    const errorMessage = err.message || 'Unknown error'
    
    if (errorMessage.includes('Asset Already Exists')) {
      throw new StorageError(`Image asset already exists at path: ${storagePath}`)
    }
    if (errorMessage.includes('Bucket not found')) {
      throw new StorageError(`Storage bucket '${DOCUMENTS_BUCKET}' not found. Run storage setup first.`)
    }
    
    // Environment-aware error handling for unexpected errors
    if (shouldThrowStorageError(errorMessage)) {
      throw new StorageError(getStorageErrorMessage(errorMessage))
    } else {
      // Expected failure in this environment - log but return null
      const env = detectEnvironment()
      console.warn(`Image asset upload failed (expected in ${env.isLocalSupabase ? 'local development' : 'this environment'}):`, errorMessage)
      return null
    }
  }
}

/**
 * Get a signed URL for an image asset
 * 
 * @param documentId - UUID of the document
 * @param filename - Asset filename
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL for temporary access
 */
export async function getImageAssetUrl(
  documentId: string,
  filename: string,
  expiresIn: number = 3600
): Promise<string> {
  const storagePath = `${documentId}/assets/${filename}`
  return getSignedDocumentUrl(storagePath, expiresIn)
}

/**
 * Get a public URL for an image asset (only works if file has public access)
 * 
 * @param documentId - UUID of the document
 * @param filename - Asset filename  
 * @returns Public URL (no expiration)
 */
export function getPublicImageAssetUrl(documentId: string, filename: string): string {
  const storagePath = `${documentId}/assets/${filename}`
  return getPublicDocumentUrl(storagePath)
}

/**
 * Delete an image asset from storage
 * 
 * @param documentId - UUID of the document
 * @param filename - Asset filename to delete
 */
export async function deleteImageAsset(documentId: string, filename: string): Promise<void> {
  const storagePath = `${documentId}/assets/${filename}`
  return deleteDocumentFile(storagePath)
}

/**
 * List all image assets for a specific document
 * 
 * @param documentId - UUID of the document
 * @returns Array of asset file objects in the document assets folder
 */
export async function listDocumentImageAssets(documentId: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list(`${documentId}/assets`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    
    if (error) {
      throw new StorageError(`Asset list failed: ${error.message}`)
    }
    
    return data || []
    
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new StorageError(`Unexpected asset list error: ${err.message}`)
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