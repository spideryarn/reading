/**
 * Server-side storage utilities for system operations
 * 
 * These functions use the service role client and bypass RLS policies.
 * They should only be used for trusted server-side operations like
 * PDF processing, image extraction, etc.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { UPLOAD_LIMITS } from '@/lib/config'
import { StorageError, type StorageUploadResult } from './storage'

// Storage configuration constants
const DOCUMENTS_BUCKET = 'documents'

/**
 * Upload an image asset using service role (bypasses RLS)
 * 
 * This is for server-side operations like PDF image extraction where
 * the system is creating assets on behalf of users.
 * 
 * @param imageData - Image data as Blob or Buffer
 * @param documentId - UUID of the document this asset belongs to
 * @param filename - Filename for the asset
 * @param mimeType - MIME type of the image
 * @returns Storage upload result
 */
export async function uploadImageAssetServerSide(
  imageData: Blob | Buffer,
  documentId: string,
  filename: string,
  mimeType: string = 'image/png'
): Promise<StorageUploadResult> {
  const supabase = createServiceRoleClient()
  
  // Convert Buffer to Blob if needed
  let fileBlob: Blob
  if (Buffer.isBuffer(imageData)) {
    fileBlob = new Blob([imageData], { type: mimeType })
  } else {
    fileBlob = imageData
  }
  
  // Validate file size
  if (fileBlob.size > UPLOAD_LIMITS.GENERAL_MAX_SIZE_BYTES) {
    throw new StorageError(
      `Image size ${fileBlob.size} exceeds maximum allowed size of ${UPLOAD_LIMITS.GENERAL_MAX_SIZE_BYTES} bytes`
    )
  }
  
  // Construct storage path: {document-uuid}/extracted-images/{filename}
  // Using 'extracted-images' to differentiate from user uploads
  const storagePath = `${documentId}/extracted-images/${filename}`
  
  try {
    // Upload to storage with service role (bypasses RLS)
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, fileBlob, {
        cacheControl: '3600', // 1 hour cache
        upsert: false, // Prevent overwriting
        contentType: mimeType
      })
    
    if (error) {
      throw new StorageError(`Server-side upload failed: ${error.message}`)
    }
    
    if (!data) {
      throw new StorageError('Server-side upload returned no data')
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
    
    const err = error as { message?: string }
    const errorMessage = err.message || 'Unknown error'
    
    if (errorMessage.includes('Asset Already Exists')) {
      throw new StorageError(`Image already exists at path: ${storagePath}`)
    }
    
    throw new StorageError(`Unexpected server-side upload error: ${errorMessage}`)
  }
}

/**
 * Get a signed URL for an image asset using service role
 * 
 * @param storagePath - Storage path of the asset
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL for temporary access
 */
export async function getSignedUrlServerSide(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createServiceRoleClient()
  
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