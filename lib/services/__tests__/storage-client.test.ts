/**
 * @jest-environment jsdom
 */

import { uploadImageAssetFromBrowser, uploadImageAssetWithRetry, getSignedImageAssetUrl, checkImageAssetExists, deleteImageAssetFromBrowser, batchUploadImageAssets, ClientStorageError } from '../storage-client'
import { createClient } from '@/lib/supabase/client'

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

describe('storage-client', () => {
  let mockSupabaseClient: any
  let mockStorage: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup mock storage
    mockStorage = {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
      createSignedUrl: jest.fn(),
      download: jest.fn(),
      remove: jest.fn()
    }

    // Setup mock Supabase client
    mockSupabaseClient = {
      storage: mockStorage
    }

    // Mock createClient to return our mock client
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('uploadImageAssetFromBrowser', () => {
    it('should upload image blob successfully', async () => {
      const mockBlob = new Blob(['test image data'], { type: 'image/png' })
      const documentId = '123e4567-e89b-12d3-a456-426614174000'
      const filename = 'test-image.png'
      
      mockStorage.upload.mockResolvedValue({
        data: {
          path: `${documentId}/assets/${filename}`,
          fullPath: `documents/${documentId}/assets/${filename}`
        },
        error: null
      })

      mockStorage.getPublicUrl.mockReturnValue({
        data: {
          publicUrl: `https://example.supabase.co/storage/v1/object/public/documents/${documentId}/assets/${filename}`
        }
      })

      const result = await uploadImageAssetFromBrowser(mockBlob, documentId, filename)

      expect(mockStorage.from).toHaveBeenCalledWith('documents')
      expect(mockStorage.upload).toHaveBeenCalledWith(
        `${documentId}/assets/${filename}`,
        mockBlob,
        {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/png'
        }
      )
      expect(result).toEqual({
        path: `${documentId}/assets/${filename}`,
        fullPath: `documents/${documentId}/assets/${filename}`,
        size: mockBlob.size,
        mimeType: 'image/png',
        publicUrl: `https://example.supabase.co/storage/v1/object/public/documents/${documentId}/assets/${filename}`
      })
    })

    it('should throw permission denied error on RLS policy violation', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' })
      
      mockStorage.upload.mockResolvedValue({
        data: null,
        error: { 
          message: 'row-level security policy violation',
          name: 'StorageError',
          statusCode: 403
        }
      })

      await expect(
        uploadImageAssetFromBrowser(mockBlob, 'doc-id', 'image.png')
      ).rejects.toThrow(ClientStorageError)

      await expect(
        uploadImageAssetFromBrowser(mockBlob, 'doc-id', 'image.png')
      ).rejects.toMatchObject({
        message: 'You do not have permission to upload files for this document',
        code: 'PERMISSION_DENIED',
        statusCode: 403
      })
    })

    it('should throw error when file already exists', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' })
      
      mockStorage.upload.mockResolvedValue({
        data: null,
        error: { message: 'The resource already exists' }
      })

      await expect(
        uploadImageAssetFromBrowser(mockBlob, 'doc-id', 'existing.png')
      ).rejects.toMatchObject({
        message: expect.stringContaining('File already exists'),
        code: 'FILE_EXISTS',
        statusCode: 409
      })
    })

    it('should handle bucket not found error', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' })
      
      mockStorage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Bucket not found' }
      })

      await expect(
        uploadImageAssetFromBrowser(mockBlob, 'doc-id', 'image.png')
      ).rejects.toMatchObject({
        message: 'Storage bucket not configured. Please contact support.',
        code: 'BUCKET_NOT_FOUND',
        statusCode: 500
      })
    })

    it('should handle unexpected errors', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' })
      
      mockStorage.upload.mockRejectedValue(new Error('Network error'))

      await expect(
        uploadImageAssetFromBrowser(mockBlob, 'doc-id', 'image.png')
      ).rejects.toMatchObject({
        message: 'Unexpected upload error: Network error',
        code: 'UNKNOWN_ERROR'
      })
    })
  })

  describe('getSignedImageAssetUrl', () => {
    it('should create signed URL successfully', async () => {
      const documentId = '123e4567-e89b-12d3-a456-426614174000'
      const filename = 'test-image.png'
      const signedUrl = 'https://example.supabase.co/storage/v1/object/sign/documents/path?token=abc123'
      
      mockStorage.createSignedUrl.mockResolvedValue({
        data: { signedUrl },
        error: null
      })

      const result = await getSignedImageAssetUrl(documentId, filename)

      expect(mockStorage.from).toHaveBeenCalledWith('documents')
      expect(mockStorage.createSignedUrl).toHaveBeenCalledWith(
        `${documentId}/assets/${filename}`,
        3600
      )
      expect(result).toBe(signedUrl)
    })

    it('should use custom expiration time', async () => {
      const documentId = 'doc-id'
      const filename = 'image.png'
      const customExpiry = 7200 // 2 hours
      
      mockStorage.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://signed.url' },
        error: null
      })

      await getSignedImageAssetUrl(documentId, filename, customExpiry)

      expect(mockStorage.createSignedUrl).toHaveBeenCalledWith(
        `${documentId}/assets/${filename}`,
        customExpiry
      )
    })

    it('should throw error when signed URL creation fails', async () => {
      mockStorage.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Failed to create signed URL' }
      })

      await expect(
        getSignedImageAssetUrl('doc-id', 'image.png')
      ).rejects.toThrow('Failed to create signed URL')
    })
  })

  describe('checkImageAssetExists', () => {
    it('should return true when file exists', async () => {
      mockStorage.download.mockResolvedValue({
        data: new Blob(['data']),
        error: null
      })

      const exists = await checkImageAssetExists('doc-id', 'image.png')

      expect(exists).toBe(true)
      expect(mockStorage.download).toHaveBeenCalledWith(
        'doc-id/assets/image.png',
        { transform: { width: 1, height: 1 } }
      )
    })

    it('should return false when file not found', async () => {
      mockStorage.download.mockResolvedValue({
        data: null,
        error: { message: 'Object not found' }
      })

      const exists = await checkImageAssetExists('doc-id', 'missing.png')

      expect(exists).toBe(false)
    })

    it('should return true on permission error (file exists but no access)', async () => {
      mockStorage.download.mockResolvedValue({
        data: null,
        error: { message: 'row-level security policy' }
      })

      const exists = await checkImageAssetExists('doc-id', 'protected.png')

      expect(exists).toBe(true)
    })

    it('should throw error on unexpected errors', async () => {
      mockStorage.download.mockRejectedValue(new Error('Network error'))

      await expect(
        checkImageAssetExists('doc-id', 'image.png')
      ).rejects.toThrow('Unexpected error checking file: Network error')
    })
  })

  describe('deleteImageAssetFromBrowser', () => {
    it('should delete file successfully', async () => {
      mockStorage.remove.mockResolvedValue({
        data: {},
        error: null
      })

      await deleteImageAssetFromBrowser('doc-id', 'image.png')

      expect(mockStorage.from).toHaveBeenCalledWith('documents')
      expect(mockStorage.remove).toHaveBeenCalledWith(['doc-id/assets/image.png'])
    })

    it('should throw permission error on RLS violation', async () => {
      mockStorage.remove.mockResolvedValue({
        data: null,
        error: { message: 'row-level security policy' }
      })

      await expect(
        deleteImageAssetFromBrowser('doc-id', 'image.png')
      ).rejects.toMatchObject({
        message: 'You do not have permission to delete files for this document',
        code: 'PERMISSION_DENIED',
        statusCode: 403
      })
    })

    it('should handle delete errors', async () => {
      mockStorage.remove.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' }
      })

      await expect(
        deleteImageAssetFromBrowser('doc-id', 'image.png')
      ).rejects.toThrow('Delete failed')
    })
  })

  describe('uploadImageAssetWithRetry', () => {
    it('should upload successfully on first attempt', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' })
      
      mockStorage.upload.mockResolvedValue({
        data: { path: 'path', fullPath: 'fullPath' },
        error: null
      })
      mockStorage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://public.url' }
      })

      const result = await uploadImageAssetWithRetry(
        mockBlob, 'doc-id', 'image.png'
      )

      expect(result.publicUrl).toBe('https://public.url')
      expect(mockStorage.upload).toHaveBeenCalledTimes(1)
    })

    it('should retry on network errors', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' })
      const onRetry = jest.fn()
      
      // Fail twice, then succeed
      mockStorage.upload
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Network error' }
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Timeout' }
        })
        .mockResolvedValueOnce({
          data: { path: 'path', fullPath: 'fullPath' },
          error: null
        })

      mockStorage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://public.url' }
      })

      const result = await uploadImageAssetWithRetry(
        mockBlob, 'doc-id', 'image.png', 'image/png',
        { maxRetries: 3, retryDelay: 10, onRetry }
      )

      expect(result.publicUrl).toBe('https://public.url')
      expect(mockStorage.upload).toHaveBeenCalledTimes(3)
      expect(onRetry).toHaveBeenCalledTimes(2)
    })

    it('should not retry on permission errors', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' })
      
      mockStorage.upload.mockResolvedValue({
        data: null,
        error: { 
          message: 'row-level security policy violation',
          name: 'StorageError',
          statusCode: 403
        }
      })

      await expect(
        uploadImageAssetWithRetry(mockBlob, 'doc-id', 'image.png')
      ).rejects.toMatchObject({
        code: 'PERMISSION_DENIED'
      })

      expect(mockStorage.upload).toHaveBeenCalledTimes(1) // No retries
    })

    it('should not retry on file exists errors', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' })
      
      mockStorage.upload.mockResolvedValue({
        data: null,
        error: { message: 'The resource already exists' }
      })

      await expect(
        uploadImageAssetWithRetry(mockBlob, 'doc-id', 'image.png')
      ).rejects.toMatchObject({
        code: 'FILE_EXISTS'
      })

      expect(mockStorage.upload).toHaveBeenCalledTimes(1) // No retries
    })

    it('should throw after max retries', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' })
      
      mockStorage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Network error' }
      })

      await expect(
        uploadImageAssetWithRetry(
          mockBlob, 'doc-id', 'image.png', 'image/png',
          { maxRetries: 2, retryDelay: 10 }
        )
      ).rejects.toThrow('Network error')

      expect(mockStorage.upload).toHaveBeenCalledTimes(2)
    })
  })

  describe('batchUploadImageAssets', () => {
    it('should upload multiple files successfully', async () => {
      const uploads = [
        {
          blob: new Blob(['image1'], { type: 'image/png' }),
          documentId: 'doc-id',
          filename: 'image1.png'
        },
        {
          blob: new Blob(['image2'], { type: 'image/jpeg' }),
          documentId: 'doc-id',
          filename: 'image2.jpg',
          mimeType: 'image/jpeg'
        }
      ]

      // Mock successful uploads
      mockStorage.upload.mockResolvedValue({
        data: { path: 'path', fullPath: 'fullPath' },
        error: null
      })
      mockStorage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://public.url' }
      })

      const progressCallback = jest.fn()
      const results = await batchUploadImageAssets(uploads, progressCallback)

      expect(results).toHaveLength(2)
      expect(progressCallback).toHaveBeenCalledTimes(4) // Before and after each upload
      expect(progressCallback).toHaveBeenCalledWith(0, 2, 'image1.png')
      expect(progressCallback).toHaveBeenCalledWith(1, 2, 'image1.png')
      expect(progressCallback).toHaveBeenCalledWith(1, 2, 'image2.jpg')
      expect(progressCallback).toHaveBeenCalledWith(2, 2, 'image2.jpg')
    })

    it('should throw error if any upload fails', async () => {
      const uploads = [
        {
          blob: new Blob(['image1'], { type: 'image/png' }),
          documentId: 'doc-id',
          filename: 'image1.png'
        },
        {
          blob: new Blob(['image2'], { type: 'image/png' }),
          documentId: 'doc-id',
          filename: 'image2.png'
        }
      ]

      // First upload succeeds, second fails
      mockStorage.upload
        .mockResolvedValueOnce({
          data: { path: 'path', fullPath: 'fullPath' },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Upload failed' }
        })

      mockStorage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://public.url' }
      })

      await expect(
        batchUploadImageAssets(uploads)
      ).rejects.toThrow('Upload failed')
    })
  })
})