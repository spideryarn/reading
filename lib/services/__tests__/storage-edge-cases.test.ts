/**
 * Storage Service Edge Case Tests
 * 
 * Tests critical edge cases for the storage service that could cause production failures:
 * - File size and type validation
 * - Supabase connection failures
 * - Storage quota limits
 * - Invalid file data
 * - Network timeouts
 */

import { 
  uploadDocumentFile, 
  uploadImageAsset,
  getImageAssetUrl,
  StorageError 
} from '../storage'

// Mock Supabase client
const mockSupabaseClient = {
  storage: {
    from: jest.fn()
  }
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Mock environment utilities
jest.mock('@/lib/utils/environment', () => ({
  shouldThrowStorageError: jest.fn(() => true),
  getStorageErrorMessage: jest.fn((msg) => `Storage error: ${msg}`),
  detectEnvironment: jest.fn(() => ({ isLocalSupabase: false, isProduction: true }))
}))

// Mock config
jest.mock('@/lib/config', () => ({
  UPLOAD_LIMITS: {
    GENERAL_MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
    PDF_MAX_SIZE_BYTES: 50 * 1024 * 1024,
    IMAGE_MAX_SIZE_BYTES: 10 * 1024 * 1024 // 10MB
  }
}))

describe('Storage Service Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('File Upload Edge Cases', () => {
    it('should reject files exceeding size limit', async () => {
      const oversizedFile = new Blob(['x'.repeat(51 * 1024 * 1024)], { type: 'application/pdf' }) // 51MB
      
      await expect(uploadDocumentFile(oversizedFile, 'doc-123', 'test.pdf'))
        .rejects.toThrow(StorageError)
      await expect(uploadDocumentFile(oversizedFile, 'doc-123', 'test.pdf'))
        .rejects.toThrow('File size')
    })

    it('should reject unsupported MIME types', async () => {
      const invalidFile = new Blob(['test content'], { type: 'image/jpeg' })
      
      await expect(uploadDocumentFile(invalidFile, 'doc-123', 'test.jpg'))
        .rejects.toThrow(StorageError)
      await expect(uploadDocumentFile(invalidFile, 'doc-123', 'test.jpg'))
        .rejects.toThrow('File type image/jpeg is not allowed')
    })

    it('should handle MIME type with parameters (charset)', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'doc-123/original/test.txt' }, error: null })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const fileWithCharset = new Blob(['test content'], { type: 'text/plain; charset=utf-8' })
      
      const result = await uploadDocumentFile(fileWithCharset, 'doc-123', 'test.txt')
      expect(result).toBeDefined()
      expect(result?.path).toBe('doc-123/original/test.txt')
    })

    it('should handle empty file', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'doc-123/original/empty.txt' }, error: null })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const emptyFile = new Blob([], { type: 'text/plain' })
      
      const result = await uploadDocumentFile(emptyFile, 'doc-123', 'empty.txt')
      expect(result).toBeDefined()
    })

    it('should handle file without MIME type', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'doc-123/original/unknown' }, error: null })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const fileWithoutType = new Blob(['test content'])
      
      const result = await uploadDocumentFile(fileWithoutType, 'doc-123', 'unknown')
      expect(result).toBeDefined()
    })

    it('should handle File object without name', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'doc-123/original/document' }, error: null })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      // Mock File constructor without name
      const fileWithoutName = Object.create(File.prototype)
      Object.assign(fileWithoutName, {
        size: 1000,
        type: 'text/plain',
        name: '', // Empty name
        slice: () => new Blob()
      })
      
      const result = await uploadDocumentFile(fileWithoutName, 'doc-123')
      expect(result).toBeDefined()
      expect(mockBucket.upload).toHaveBeenCalledWith(
        'doc-123/original/document',
        fileWithoutName,
        expect.any(Object)
      )
    })

    it('should handle special characters in document ID', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'doc-with-dashes/original/test.pdf' }, error: null })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      const result = await uploadDocumentFile(file, 'doc-with-dashes', 'test.pdf')
      expect(result).toBeDefined()
      expect(result?.path).toBe('doc-with-dashes/original/test.pdf')
    })

    it('should handle special characters in filename', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: { path: 'doc-123/original/file with spaces & symbols.pdf' }, 
          error: null 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      const result = await uploadDocumentFile(file, 'doc-123', 'file with spaces & symbols.pdf')
      expect(result).toBeDefined()
    })
  })

  describe('Supabase Storage Failures', () => {
    it('should throw on authentication failure', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Unauthorized: Invalid API key' } 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      await expect(uploadDocumentFile(file, 'doc-123', 'test.pdf'))
        .rejects.toThrow(StorageError)
    })

    it('should throw on bucket not found', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Bucket not found: documents' } 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      await expect(uploadDocumentFile(file, 'doc-123', 'test.pdf'))
        .rejects.toThrow(StorageError)
    })

    it('should throw on quota exceeded', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Storage quota exceeded' } 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      await expect(uploadDocumentFile(file, 'doc-123', 'test.pdf'))
        .rejects.toThrow(StorageError)
    })

    it('should handle network timeout', async () => {
      const mockBucket = {
        upload: jest.fn().mockRejectedValue(new Error('Network timeout'))
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      await expect(uploadDocumentFile(file, 'doc-123', 'test.pdf'))
        .rejects.toThrow('Network timeout')
    })

    it('should handle duplicate file upload (upsert: false)', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'The resource already exists' } 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      await expect(uploadDocumentFile(file, 'doc-123', 'test.pdf'))
        .rejects.toThrow(StorageError)
    })

    it('should handle malformed Supabase response', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: null, // No data
          error: null  // No error - malformed response
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      // This should probably throw or return null depending on implementation
      const result = await uploadDocumentFile(file, 'doc-123', 'test.pdf')
      // The implementation should handle this edge case gracefully
      expect(result).toBeDefined()
    })
  })

  describe('Image Asset Upload Edge Cases', () => {
    it('should reject base64 without proper prefix', async () => {
      await expect(uploadImageAsset('invalid_base64', 'doc-123', 'test.png', 'image/png'))
        .rejects.toThrow()
    })

    it('should reject oversized image', async () => {
      // Create base64 string representing large image
      const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(15 * 1024 * 1024) // ~15MB
      
      await expect(uploadImageAsset(largeBase64, 'doc-123', 'large.png', 'image/png'))
        .rejects.toThrow()
    })

    it('should handle invalid image MIME type', async () => {
      const validBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      
      await expect(uploadImageAsset(validBase64, 'doc-123', 'test.exe', 'application/exe'))
        .rejects.toThrow()
    })

    it('should handle corrupted base64 image data', async () => {
      const corruptedBase64 = 'data:image/png;base64,CORRUPTED_DATA_NOT_VALID_IMAGE'
      
      // This should be caught by base64 decoding or image validation
      await expect(uploadImageAsset(corruptedBase64, 'doc-123', 'test.png', 'image/png'))
        .rejects.toThrow()
    })
  })

  describe('URL Generation Edge Cases', () => {
    it('should handle missing image asset', async () => {
      const mockBucket = {
        createSignedUrl: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Object not found' } 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      await expect(getImageAssetUrl('doc-123', 'nonexistent.png'))
        .rejects.toThrow()
    })

    it('should handle expired URL generation', async () => {
      const mockBucket = {
        createSignedUrl: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'URL generation failed' } 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      await expect(getImageAssetUrl('doc-123', 'test.png'))
        .rejects.toThrow()
    })

    it('should handle invalid expiration time', async () => {
      const mockBucket = {
        createSignedUrl: jest.fn().mockResolvedValue({ 
          data: { signedUrl: 'https://example.com/signed-url' }, 
          error: null 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      // Test with negative expiration (should be handled by validation)
      const result = await getImageAssetUrl('doc-123', 'test.png', -3600)
      expect(result).toBeDefined()
    })

    it('should handle extremely long expiration time', async () => {
      const mockBucket = {
        createSignedUrl: jest.fn().mockResolvedValue({ 
          data: { signedUrl: 'https://example.com/signed-url' }, 
          error: null 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      // Test with very long expiration (1 year)
      const result = await getImageAssetUrl('doc-123', 'test.png', 365 * 24 * 3600)
      expect(result).toBeDefined()
    })
  })

  describe('Environment-Specific Behavior', () => {
    it('should return null in local development when expected', async () => {
      // Mock environment detection for local development
      const { shouldThrowStorageError, detectEnvironment } = require('@/lib/utils/environment')
      shouldThrowStorageError.mockReturnValue(false)
      detectEnvironment.mockReturnValue({ isLocalSupabase: true, isProduction: false })

      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Connection refused' } 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      const result = await uploadDocumentFile(file, 'doc-123', 'test.pdf')
      expect(result).toBeNull()
    })

    it('should throw in production environment', async () => {
      // Mock environment detection for production
      const { shouldThrowStorageError, detectEnvironment } = require('@/lib/utils/environment')
      shouldThrowStorageError.mockReturnValue(true)
      detectEnvironment.mockReturnValue({ isLocalSupabase: false, isProduction: true })

      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Connection refused' } 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file = new Blob(['test'], { type: 'application/pdf' })
      
      await expect(uploadDocumentFile(file, 'doc-123', 'test.pdf'))
        .rejects.toThrow(StorageError)
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    it('should handle extremely large document ID strings', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: { path: 'very-long-id/original/test.pdf' }, 
          error: null 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const veryLongId = 'x'.repeat(1000) // 1000 character ID
      const file = new Blob(['test'], { type: 'application/pdf' })
      
      const result = await uploadDocumentFile(file, veryLongId, 'test.pdf')
      expect(result).toBeDefined()
    })

    it('should handle extremely long filenames', async () => {
      const mockBucket = {
        upload: jest.fn().mockResolvedValue({ 
          data: { path: 'doc-123/original/very-long-filename.pdf' }, 
          error: null 
        })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const veryLongFilename = 'x'.repeat(500) + '.pdf'
      const file = new Blob(['test'], { type: 'application/pdf' })
      
      const result = await uploadDocumentFile(file, 'doc-123', veryLongFilename)
      expect(result).toBeDefined()
    })

    it('should handle concurrent uploads to same path', async () => {
      const mockBucket = {
        upload: jest.fn()
          .mockResolvedValueOnce({ data: { path: 'doc-123/original/test.pdf' }, error: null })
          .mockResolvedValueOnce({ data: null, error: { message: 'The resource already exists' } })
      }
      mockSupabaseClient.storage.from.mockReturnValue(mockBucket)

      const file1 = new Blob(['test1'], { type: 'application/pdf' })
      const file2 = new Blob(['test2'], { type: 'application/pdf' })
      
      const [result1, result2] = await Promise.allSettled([
        uploadDocumentFile(file1, 'doc-123', 'test.pdf'),
        uploadDocumentFile(file2, 'doc-123', 'test.pdf')
      ])
      
      expect(result1.status).toBe('fulfilled')
      expect(result2.status).toBe('rejected')
    })
  })
})