/**
 * Document Processing Transaction Service
 * 
 * Provides transaction-like behavior for document processing pipelines,
 * allowing rollback of partial operations when failures occur.
 * 
 * Follows the "fail fast with clear error messages" principle by tracking
 * all operations and cleaning up on failure.
 */

import { createRequestLogger } from '@/lib/services/logger'
import { documentAssetsService } from '@/lib/services/database/document-assets'
import { deleteImageAsset } from '@/lib/services/storage'

export interface ProcessingOperation {
  type: 'storage_upload' | 'database_record' | 'temp_file'
  documentId: string
  assetId?: string
  storagePath?: string
  filename?: string
  metadata?: Record<string, unknown>
}

export interface TransactionResult {
  success: boolean
  operationsCompleted: number
  operationsRolledBack: number
  errors: string[]
}

/**
 * Manages document processing operations with rollback capabilities
 */
export class DocumentProcessingTransaction {
  private operations: ProcessingOperation[] = []
  private logger = createRequestLogger('/services/document-processing-transaction')
  private documentId: string
  private completed = false

  constructor(documentId: string) {
    this.documentId = documentId
    this.logger.info('Transaction started', { documentId })
  }

  /**
   * Record a storage upload operation for potential rollback
   */
  recordStorageUpload(filename: string, storagePath: string, metadata?: Record<string, unknown>): void {
    const operation: ProcessingOperation = {
      type: 'storage_upload',
      documentId: this.documentId,
      filename,
      storagePath
    }
    if (metadata !== undefined) {
      operation.metadata = metadata
    }
    this.operations.push(operation)
    
    this.logger.info('Recorded storage upload operation', {
      documentId: this.documentId,
      filename,
      storagePath,
      operationCount: this.operations.length
    })
  }

  /**
   * Record a database record creation for potential rollback
   */
  recordDatabaseRecord(assetId: string, metadata?: Record<string, unknown>): void {
    const operation: ProcessingOperation = {
      type: 'database_record',
      documentId: this.documentId,
      assetId
    }
    if (metadata !== undefined) {
      operation.metadata = metadata
    }
    this.operations.push(operation)
    
    this.logger.info('Recorded database record operation', {
      documentId: this.documentId,
      assetId,
      operationCount: this.operations.length
    })
  }

  /**
   * Record a temporary file creation for potential cleanup
   */
  recordTempFile(filename: string, metadata?: Record<string, unknown>): void {
    const operation: ProcessingOperation = {
      type: 'temp_file',
      documentId: this.documentId,
      filename
    }
    if (metadata !== undefined) {
      operation.metadata = metadata
    }
    this.operations.push(operation)
    
    this.logger.info('Recorded temp file operation', {
      documentId: this.documentId,
      filename,
      operationCount: this.operations.length
    })
  }

  /**
   * Mark transaction as successfully completed (prevents automatic rollback)
   */
  commit(): void {
    this.completed = true
    this.logger.info('Transaction committed successfully', {
      documentId: this.documentId,
      operationCount: this.operations.length
    })
  }

  /**
   * Rollback all operations in reverse order
   */
  async rollback(): Promise<TransactionResult> {
    if (this.completed) {
      this.logger.warn('Attempted to rollback committed transaction', {
        documentId: this.documentId
      })
      return {
        success: true,
        operationsCompleted: this.operations.length,
        operationsRolledBack: 0,
        errors: ['Transaction already committed']
      }
    }

    this.logger.info('Starting transaction rollback', {
      documentId: this.documentId,
      operationCount: this.operations.length
    })

    const errors: string[] = []
    let rolledBackCount = 0

    // Rollback operations in reverse order (LIFO)
    const reversedOps = [...this.operations].reverse()
    
    for (const operation of reversedOps) {
      try {
        await this.rollbackOperation(operation)
        rolledBackCount++
        
        this.logger.info('Operation rolled back successfully', {
          documentId: this.documentId,
          operationType: operation.type,
          filename: operation.filename,
          assetId: operation.assetId
        })
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown rollback error'
        errors.push(`Failed to rollback ${operation.type}: ${errorMessage}`)
        
        this.logger.error('Rollback operation failed', {
          documentId: this.documentId,
          operationType: operation.type,
          error: errorMessage,
          operation
        })
      }
    }

    const result: TransactionResult = {
      success: errors.length === 0,
      operationsCompleted: this.operations.length,
      operationsRolledBack: rolledBackCount,
      errors
    }

    this.logger.info('Transaction rollback completed', {
      documentId: this.documentId,
      result
    })

    return result
  }

  /**
   * Rollback a single operation
   */
  private async rollbackOperation(operation: ProcessingOperation): Promise<void> {
    switch (operation.type) {
      case 'storage_upload':
        if (operation.filename) {
          await deleteImageAsset(this.documentId, operation.filename)
        }
        break

      case 'database_record':
        if (operation.assetId) {
          await documentAssetsService.delete(operation.assetId)
        }
        break

      case 'temp_file':
        // For temp files, we would implement cleanup logic here
        // Currently not needed but provided for extensibility
        this.logger.info('Temp file cleanup skipped (not implemented)', {
          filename: operation.filename
        })
        break

      default:
        throw new Error(`Unknown operation type: ${(operation as ProcessingOperation).type}`)
    }
  }

  /**
   * Get transaction status information
   */
  getStatus(): {
    documentId: string
    operationCount: number
    completed: boolean
    operations: ProcessingOperation[]
  } {
    return {
      documentId: this.documentId,
      operationCount: this.operations.length,
      completed: this.completed,
      operations: [...this.operations] // Return copy to prevent mutation
    }
  }

  /**
   * Automatically rollback on destruction if not committed
   */
  async dispose(): Promise<TransactionResult | null> {
    if (!this.completed && this.operations.length > 0) {
      this.logger.warn('Transaction disposed without commit, performing automatic rollback', {
        documentId: this.documentId,
        operationCount: this.operations.length
      })
      return await this.rollback()
    }
    return null
  }
}

/**
 * Convenience function to create and manage a transaction with automatic cleanup
 */
export async function withDocumentProcessingTransaction<T>(
  documentId: string,
  operation: (transaction: DocumentProcessingTransaction) => Promise<T>
): Promise<T> {
  const transaction = new DocumentProcessingTransaction(documentId)
  
  try {
    const result = await operation(transaction)
    transaction.commit()
    return result
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    await transaction.dispose()
  }
}

/**
 * Error class for transaction-related failures
 */
export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly transactionResult?: TransactionResult,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'TransactionError'
  }
}