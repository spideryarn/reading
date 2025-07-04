/**
 * Tests for Document Processing Transaction Service
 * 
 * Verifies transaction-like behavior with rollback capabilities
 * for document processing operations.
 */

import { DocumentProcessingTransaction, withDocumentProcessingTransaction } from '../document-processing-transaction'
import { documentAssetsService } from '../database/document-assets'
import { deleteImageAsset } from '../storage'

// Mock dependencies
jest.mock('../database/document-assets')
jest.mock('../storage')

const mockDocumentAssetsService = documentAssetsService as jest.Mocked<typeof documentAssetsService>
const mockDeleteImageAsset = deleteImageAsset as jest.MockedFunction<typeof deleteImageAsset>

describe('DocumentProcessingTransaction', () => {
  const testDocumentId = '123e4567-e89b-12d3-a456-426614174000'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Transaction Operations', () => {
    it('should initialize transaction with document ID', () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      const status = transaction.getStatus()
      
      expect(status.documentId).toBe(testDocumentId)
      expect(status.operationCount).toBe(0)
      expect(status.completed).toBe(false)
      expect(status.operations).toEqual([])
    })

    it('should record storage upload operations', () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      
      transaction.recordStorageUpload('test-image.png', 'doc-123/assets/test-image.png', { page: 1 })
      
      const status = transaction.getStatus()
      expect(status.operationCount).toBe(1)
      expect(status.operations[0]).toEqual({
        type: 'storage_upload',
        documentId: testDocumentId,
        filename: 'test-image.png',
        storagePath: 'doc-123/assets/test-image.png',
        metadata: { page: 1 }
      })
    })

    it('should record database record operations', () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      
      transaction.recordDatabaseRecord('asset-456', { elementId: 'img-1' })
      
      const status = transaction.getStatus()
      expect(status.operationCount).toBe(1)
      expect(status.operations[0]).toEqual({
        type: 'database_record',
        documentId: testDocumentId,
        assetId: 'asset-456',
        metadata: { elementId: 'img-1' }
      })
    })

    it('should record temp file operations', () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      
      transaction.recordTempFile('temp-file.tmp')
      
      const status = transaction.getStatus()
      expect(status.operationCount).toBe(1)
      expect(status.operations[0]).toEqual({
        type: 'temp_file',
        documentId: testDocumentId,
        filename: 'temp-file.tmp',
        metadata: undefined
      })
    })
  })

  describe('Transaction Commit', () => {
    it('should mark transaction as completed when committed', () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      transaction.recordStorageUpload('test.png', 'path/test.png')
      
      transaction.commit()
      
      const status = transaction.getStatus()
      expect(status.completed).toBe(true)
    })

    it('should prevent rollback after commit', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      transaction.recordStorageUpload('test.png', 'path/test.png')
      transaction.commit()
      
      const result = await transaction.rollback()
      
      expect(result.success).toBe(true)
      expect(result.operationsRolledBack).toBe(0)
      expect(result.errors).toEqual(['Transaction already committed'])
    })
  })

  describe('Transaction Rollback', () => {
    it('should rollback storage upload operations', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      transaction.recordStorageUpload('test.png', 'doc-123/assets/test.png')
      
      const result = await transaction.rollback()
      
      expect(mockDeleteImageAsset).toHaveBeenCalledWith(testDocumentId, 'test.png')
      expect(result.success).toBe(true)
      expect(result.operationsRolledBack).toBe(1)
      expect(result.errors).toEqual([])
    })

    it('should rollback database record operations', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      transaction.recordDatabaseRecord('asset-123')
      
      const result = await transaction.rollback()
      
      expect(mockDocumentAssetsService.delete).toHaveBeenCalledWith('asset-123')
      expect(result.success).toBe(true)
      expect(result.operationsRolledBack).toBe(1)
      expect(result.errors).toEqual([])
    })

    it('should rollback operations in reverse order', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      const deleteOrder: string[] = []
      
      mockDeleteImageAsset.mockImplementation(async (docId, filename) => {
        deleteOrder.push(`storage-${filename}`)
      })
      
      mockDocumentAssetsService.delete.mockImplementation(async (id) => {
        deleteOrder.push(`db-${id}`)
      })
      
      // Add operations in order: storage1, db1, storage2, db2
      transaction.recordStorageUpload('image1.png', 'path1')
      transaction.recordDatabaseRecord('asset1')
      transaction.recordStorageUpload('image2.png', 'path2')
      transaction.recordDatabaseRecord('asset2')
      
      await transaction.rollback()
      
      // Should rollback in reverse order: db2, storage2, db1, storage1
      expect(deleteOrder).toEqual([
        'db-asset2',
        'storage-image2.png',
        'db-asset1',
        'storage-image1.png'
      ])
    })

    it('should handle rollback failures gracefully', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      transaction.recordStorageUpload('test1.png', 'path1')
      transaction.recordDatabaseRecord('asset1')
      transaction.recordStorageUpload('test2.png', 'path2')
      
      // Mock first storage delete to fail
      mockDeleteImageAsset
        .mockRejectedValueOnce(new Error('Storage delete failed'))
        .mockResolvedValueOnce(undefined)
      
      const result = await transaction.rollback()
      
      expect(result.success).toBe(false)
      expect(result.operationsRolledBack).toBe(2) // db record and second storage
      expect(result.errors).toEqual(['Failed to rollback storage_upload: Storage delete failed'])
    })

    it('should handle unknown operation types', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      
      // Manually add an unknown operation type
      const unknownOp = {
        type: 'unknown_type' as any,
        documentId: testDocumentId
      }
      ;(transaction as any).operations = [unknownOp]
      
      const result = await transaction.rollback()
      
      expect(result.success).toBe(false)
      expect(result.errors).toEqual(['Failed to rollback unknown_type: Unknown operation type: unknown_type'])
    })
  })

  describe('Transaction Disposal', () => {
    it('should automatically rollback on disposal if not committed', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      transaction.recordStorageUpload('test.png', 'path')
      
      const result = await transaction.dispose()
      
      expect(result).not.toBeNull()
      expect(result!.operationsRolledBack).toBe(1)
      expect(mockDeleteImageAsset).toHaveBeenCalled()
    })

    it('should not rollback on disposal if committed', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      transaction.recordStorageUpload('test.png', 'path')
      transaction.commit()
      
      const result = await transaction.dispose()
      
      expect(result).toBeNull()
      expect(mockDeleteImageAsset).not.toHaveBeenCalled()
    })

    it('should not rollback on disposal if no operations', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      
      const result = await transaction.dispose()
      
      expect(result).toBeNull()
      expect(mockDeleteImageAsset).not.toHaveBeenCalled()
    })
  })

  describe('withDocumentProcessingTransaction helper', () => {
    it('should commit transaction on successful operation', async () => {
      let transactionStatus: any

      const result = await withDocumentProcessingTransaction(testDocumentId, async (transaction) => {
        transaction.recordStorageUpload('test.png', 'path')
        transactionStatus = transaction.getStatus()
        return 'success'
      })
      
      expect(result).toBe('success')
      expect(transactionStatus.completed).toBe(true)
      expect(mockDeleteImageAsset).not.toHaveBeenCalled()
    })

    it('should rollback transaction on operation failure', async () => {
      const testError = new Error('Operation failed')
      
      await expect(
        withDocumentProcessingTransaction(testDocumentId, async (transaction) => {
          transaction.recordStorageUpload('test.png', 'path')
          throw testError
        })
      ).rejects.toThrow('Operation failed')
      
      expect(mockDeleteImageAsset).toHaveBeenCalledWith(testDocumentId, 'test.png')
    })

    it('should dispose transaction even if rollback fails', async () => {
      mockDeleteImageAsset.mockRejectedValueOnce(new Error('Rollback failed'))
      
      await expect(
        withDocumentProcessingTransaction(testDocumentId, async (transaction) => {
          transaction.recordStorageUpload('test.png', 'path')
          throw new Error('Operation failed')
        })
      ).rejects.toThrow('Operation failed')
      
      expect(mockDeleteImageAsset).toHaveBeenCalled()
    })
  })

  describe('Multiple Operations', () => {
    it('should handle mixed operation types correctly', async () => {
      const transaction = new DocumentProcessingTransaction(testDocumentId)
      
      transaction.recordStorageUpload('image1.png', 'path1')
      transaction.recordDatabaseRecord('asset1')
      transaction.recordStorageUpload('image2.png', 'path2')
      transaction.recordTempFile('temp.tmp')
      transaction.recordDatabaseRecord('asset2')
      
      const status = transaction.getStatus()
      expect(status.operationCount).toBe(5)
      
      const result = await transaction.rollback()
      
      expect(result.operationsRolledBack).toBe(5)
      expect(mockDeleteImageAsset).toHaveBeenCalledTimes(2)
      expect(mockDocumentAssetsService.delete).toHaveBeenCalledTimes(2)
    })
  })
})