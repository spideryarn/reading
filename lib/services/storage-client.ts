/**
 * Client-side Supabase Storage utilities for document asset operations
 * 
 * Handles direct browser uploads of extracted images to Supabase Storage
 * using RLS policies for authentication and authorization
 */

import { createClient } from '@/lib/supabase/client'

// Storage configuration constants
const DOCUMENTS_BUCKET = 'documents'

export interface ClientStorageUploadResult {
  path: string
  fullPath: string
  size: number
  mimeType: string
  publicUrl: string
}

export class ClientStorageError extends Error {
  code?: string
  statusCode?: number
  
  constructor(message: string, code?: string, statusCode?: number) {
    super(message)
    this.name = 'ClientStorageError'
    if (code !== undefined) {
      this.code = code
    }
    if (statusCode !== undefined) {
      this.statusCode = statusCode
    }
  }
}

/**
 * Upload an image asset directly from the browser to Supabase Storage
 * 
 * Uses Supabase client with anon key - RLS policies enforce access control
 * 
 * @param blob - Image blob to upload
 * @param documentId - UUID of the document this asset belongs to
 * @param filename - Filename for the asset (should be descriptive and filename-safe)
 * @param mimeType - MIME type of the image (e.g., 'image/png', 'image/jpeg')
 * @returns Storage upload result with public URL
 */
export async function uploadImageAssetFromBrowser(
  blob: Blob,
  documentId: string,
  filename: string,
  mimeType: string = 'image/png'
): Promise<ClientStorageUploadResult> {
  const supabase = createClient()
  
  // Construct storage path: {document-uuid}/assets/{filename}
  const storagePath = `${documentId}/assets/${filename}`
  
  try {
    // Upload to storage using browser client
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, blob, {
        cacheControl: '3600', // 1 hour cache
        upsert: false, // Prevent overwriting existing files
        contentType: mimeType
      })
    
    if (error) {
      // Handle specific Supabase storage errors
      if (error.message?.includes('row-level security policy')) {
        throw new ClientStorageError(
          'You do not have permission to upload files for this document',
          'PERMISSION_DENIED',
          403
        )
      }
      if (error.message?.includes('The resource already exists')) {
        throw new ClientStorageError(
          `File already exists at path: ${storagePath}`,
          'FILE_EXISTS',
          409
        )
      }
      if (error.message?.includes('Bucket not found')) {
        throw new ClientStorageError(
          'Storage bucket not configured. Please contact support.',
          'BUCKET_NOT_FOUND',
          500
        )
      }
      
      throw new ClientStorageError(
        `Upload failed: ${error.message}`,
        error.name,
        (error as { statusCode?: number }).statusCode
      )
    }
    
    if (!data) {
      throw new ClientStorageError('Upload succeeded but no data returned')
    }
    
    // Get public URL for the uploaded asset
    const { data: urlData } = supabase.storage
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(data.path)
    
    return {
      path: data.path,
      fullPath: data.fullPath,
      size: blob.size,
      mimeType: mimeType,
      publicUrl: urlData.publicUrl
    }
    
  } catch (error) {
    if (error instanceof ClientStorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new ClientStorageError(
      `Unexpected upload error: ${err.message || 'Unknown error'}`,
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * Get a signed URL for an image asset (for private access)
 * 
 * @param documentId - UUID of the document
 * @param filename - Asset filename
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL for temporary access
 */
export async function getSignedImageAssetUrl(
  documentId: string,
  filename: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createClient()
  const storagePath = `${documentId}/assets/${filename}`
  
  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresIn)
    
    if (error) {
      throw new ClientStorageError(`Failed to create signed URL: ${error.message}`)
    }
    
    if (!data?.signedUrl) {
      throw new ClientStorageError(`No signed URL returned for path: ${storagePath}`)
    }
    
    return data.signedUrl
    
  } catch (error) {
    if (error instanceof ClientStorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new ClientStorageError(`Unexpected signed URL error: ${err.message}`)
  }
}

/**
 * Check if a file exists in storage
 * 
 * @param documentId - UUID of the document
 * @param filename - Asset filename to check
 * @returns True if file exists, false otherwise
 */
export async function checkImageAssetExists(
  documentId: string,
  filename: string
): Promise<boolean> {
  const supabase = createClient()
  const storagePath = `${documentId}/assets/${filename}`
  
  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(storagePath, {
        // Just check if file exists, don't download content
        transform: {
          width: 1,
          height: 1
        }
      })
    
    if (error) {
      if (error.message?.includes('not found')) {
        return false
      }
      // If it's a permission error, the file exists but user can't access it
      if (error.message?.includes('row-level security policy')) {
        return true
      }
      throw new ClientStorageError(`Error checking file existence: ${error.message}`)
    }
    
    return data !== null
    
  } catch (error) {
    if (error instanceof ClientStorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new ClientStorageError(`Unexpected error checking file: ${err.message}`)
  }
}

/**
 * Delete an image asset from storage
 * 
 * @param documentId - UUID of the document
 * @param filename - Asset filename to delete
 */
export async function deleteImageAssetFromBrowser(
  documentId: string,
  filename: string
): Promise<void> {
  const supabase = createClient()
  const storagePath = `${documentId}/assets/${filename}`
  
  try {
    const { error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([storagePath])
    
    if (error) {
      if (error.message?.includes('row-level security policy')) {
        throw new ClientStorageError(
          'You do not have permission to delete files for this document',
          'PERMISSION_DENIED',
          403
        )
      }
      
      throw new ClientStorageError(`Delete failed: ${error.message}`)
    }
    
  } catch (error) {
    if (error instanceof ClientStorageError) {
      throw error
    }
    
    const err = error as { message?: string }
    throw new ClientStorageError(`Unexpected delete error: ${err.message}`)
  }
}

/**
 * Upload an image asset with retry logic
 * 
 * @param blob - Image blob to upload
 * @param documentId - UUID of the document this asset belongs to
 * @param filename - Filename for the asset
 * @param mimeType - MIME type of the image
 * @param options - Retry options
 * @returns Storage upload result with public URL
 */
export async function uploadImageAssetWithRetry(
  blob: Blob,
  documentId: string,
  filename: string,
  mimeType: string = 'image/png',
  options: {
    maxRetries?: number
    retryDelay?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<ClientStorageUploadResult> {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await uploadImageAssetFromBrowser(blob, documentId, filename, mimeType)
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on permission errors or file exists errors
      if (error instanceof ClientStorageError) {
        if (error.code === 'PERMISSION_DENIED' || error.code === 'FILE_EXISTS') {
          throw error
        }
      }
      
      // If this isn't the last attempt, retry after delay
      if (attempt < maxRetries - 1) {
        onRetry?.(attempt + 1, lastError)
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }
  
  // All retries failed
  throw lastError || new ClientStorageError('Upload failed after retries')
}

/**
 * Batch upload multiple image assets with progress tracking
 * 
 * @param uploads - Array of upload configurations
 * @param onProgress - Progress callback for each upload
 * @returns Array of upload results
 */
export async function batchUploadImageAssets(
  uploads: Array<{
    blob: Blob
    documentId: string
    filename: string
    mimeType?: string
  }>,
  onProgress?: (completed: number, total: number, currentFile: string) => void
): Promise<ClientStorageUploadResult[]> {
  const results: ClientStorageUploadResult[] = []
  let completed = 0
  
  for (const upload of uploads) {
    onProgress?.(completed, uploads.length, upload.filename)
    
    try {
      const result = await uploadImageAssetFromBrowser(
        upload.blob,
        upload.documentId,
        upload.filename,
        upload.mimeType || 'image/png'
      )
      results.push(result)
    } catch (error) {
      // Re-throw to let caller handle batch failure strategy
      throw error
    }
    
    completed++
    onProgress?.(completed, uploads.length, upload.filename)
  }
  
  return results
}