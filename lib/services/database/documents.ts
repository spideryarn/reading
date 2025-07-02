import { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Document, DocumentInsert, DocumentUpdate } from '@/lib/types/database-extensions'
import { 
  uploadDocumentFile, 
  downloadDocumentFile, 
  deleteDocumentFile, 
  getSignedDocumentUrl,
  StorageUploadResult 
} from '@/lib/services/storage'
import { logger } from '../logger'

// Create database-specific logger
const dbLogger = logger.child({ component: 'database-documents' })

export class DocumentService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new document
   */
  async create(document: Omit<DocumentInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
    const { data, error } = await this.supabase
      .from('documents')
      .insert(document)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create document: ${error.message}`)
    }

    return data
  }

  /**
   * Create a new document with explicit user ownership
   */
  async createForUser(
    userId: string, 
    document: Omit<DocumentInsert, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<Document> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      throw new Error('Invalid user ID format')
    }

    return this.create({
      ...document,
      created_by: userId
    })
  }

  /**
   * Get a document by ID
   */
  async getById(id: string): Promise<Document | null> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return null
    }

    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      // Check for "not found" error (PGRST116)
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch document: ${error.message}`)
    }

    return data
  }

  /**
   * Update a document
   */
  async update(id: string, updates: DocumentUpdate): Promise<Document | null> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return null
    }

    // Filter out invalid fields like 'metadata' that don't exist in the schema
    const validUpdates = { ...updates }
    delete (validUpdates as Record<string, unknown>).metadata

    const { data, error } = await this.supabase
      .from('documents')
      .update(validUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null
      }
      throw new Error(`Failed to update document: ${error.message}`)
    }

    return data
  }

  /**
   * Delete a document (cascades to related tables)
   */
  async delete(id: string): Promise<boolean> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return false
    }

    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) {
      // For delete, we'll return false on error instead of throwing
      return false
    }

    return true
  }

  /**
   * List documents with optional filters
   */
  async list(options?: {
    isPublic?: boolean
    createdBy?: string
    limit?: number
    offset?: number
  }): Promise<{ documents: Document[]; hasMore: boolean }> {
    let query = this.supabase.from('documents').select('*', { count: 'exact' })

    if (options?.isPublic !== undefined) {
      query = query.eq('is_public', options.isPublic)
    }

    if (options?.createdBy) {
      query = query.eq('created_by', options.createdBy)
    }

    const limit = options?.limit || 10
    const offset = options?.offset || 0

    // Request one more than the limit to check if there are more
    query = query.range(offset, offset + limit)

    const { data, error, count } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to list documents: ${error.message}`)
    }

    const documents = data || []
    const hasMore = count ? count > offset + documents.length : documents.length > limit

    // Return only the requested limit
    return {
      documents: documents.slice(0, limit),
      hasMore
    }
  }

  /**
   * Get all documents owned by a specific user
   */
  async getByUserId(userId: string, options?: {
    includePublic?: boolean
    limit?: number
    offset?: number
  }): Promise<{ documents: Document[]; hasMore: boolean }> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return { documents: [], hasMore: false }
    }

    const listOptions: Parameters<typeof this.list>[0] = {
      createdBy: userId
    }
    
    if (options?.limit !== undefined) {
      listOptions.limit = options.limit
    }
    if (options?.offset !== undefined) {
      listOptions.offset = options.offset
    }
    
    return this.list(listOptions)
  }

  /**
   * Check if a user owns a specific document
   */
  async isOwnedByUser(documentId: string, userId: string): Promise<boolean> {
    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(documentId) || !uuidRegex.test(userId)) {
      return false
    }

    const { data, error } = await this.supabase
      .from('documents')
      .select('created_by')
      .eq('id', documentId)
      .single()

    if (error || !data) {
      return false
    }

    return data.created_by === userId
  }

  /**
   * Update document ownership (admin function)
   */
  async updateOwnership(documentId: string, newOwnerId: string): Promise<Document | null> {
    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(documentId) || !uuidRegex.test(newOwnerId)) {
      throw new Error('Invalid ID format')
    }

    return this.update(documentId, { created_by: newOwnerId })
  }

  /**
   * Search documents by plaintext content
   */
  async search(searchTerm: string, limit: number = 10): Promise<Document[]> {
    // Using PostgreSQL full-text search
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .textSearch('plaintext_content', searchTerm, {
        type: 'websearch',
        config: 'english',
      })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to search documents: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get document with all enhancements
   */
  async getWithEnhancements(id: string): Promise<{
    document: Document | null
    enhancements: Database['public']['Tables']['document_enhancements']['Row'][]
  }> {
    const { data: document, error: docError } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (docError) {
      // Check for "not found" error
      if (docError.code === 'PGRST116') {
        return { document: null, enhancements: [] }
      }
      throw new Error(`Failed to fetch document: ${docError.message}`)
    }

    const { data: enhancements, error: enhError } = await this.supabase
      .from('document_enhancements')
      .select('*')
      .eq('document_id', id)

    if (enhError) {
      throw new Error(`Failed to fetch enhancements: ${enhError.message}`)
    }

    return {
      document,
      enhancements: enhancements || [],
    }
  }

  /**
   * Calculate and update word count for a document
   */
  async updateWordCount(id: string): Promise<number> {
    const document = await this.getById(id)
    if (!document || !document.plaintext_content) {
      throw new Error('Document not found or has no plaintext content')
    }

    // Simple word count calculation
    const wordCount = document.plaintext_content.trim().split(/\s+/).length

    await this.update(id, { word_count: wordCount })
    return wordCount
  }

  /**
   * Store processed HTML and plaintext versions
   */
  async storeProcessedContent(
    id: string,
    content: { html: string; plaintext: string }
  ): Promise<Document> {
    const wordCount = content.plaintext.trim().split(/\s+/).length

    const updatedDocument = await this.update(id, {
      html_content: content.html,
      plaintext_content: content.plaintext,
      word_count: wordCount,
    })
    
    if (!updatedDocument) {
      throw new Error(`Document with ID ${id} not found or could not be updated`)
    }
    
    return updatedDocument
  }

  /**
   * Create a document with original file storage
   * Uploads the original file to storage and creates the database record
   */
  async createWithStorage(
    userId: string,
    document: Omit<DocumentInsert, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'storage_path' | 'upload_metadata' | 'upload_ai_call_id'>,
    originalFile?: File | Blob,
    originalFilename?: string,
    uploadMetadata?: Record<string, string | number | boolean | null>,
    uploadAiCallId?: string,
    explicitDocumentId?: string // Optional explicit document ID
  ): Promise<{ document: Document; storageResult?: StorageUploadResult | null }> {
    // Use provided document ID or generate a new one
    const documentId = explicitDocumentId || crypto.randomUUID()
    
    let storageResult: StorageUploadResult | null = null
    let storagePath: string | null = null
    
    // Upload to storage first if file provided
    if (originalFile) {
      try {
        // Parse MIME type for metadata logging
        const baseMimeType = originalFile.type?.split(';')[0]?.trim() || ''
        const mimeTypeParameters = originalFile.type?.includes(';') 
          ? originalFile.type.split(';').slice(1).map(p => p.trim()).join('; ') 
          : null
        
        dbLogger.info({
          operation: 'createWithStorage',
          documentId,
          fileSize: originalFile.size,
          fileType: originalFile.type,
          baseMimeType,
          mimeTypeParameters,
          filename: originalFilename
        }, 'Uploading original file to storage')
        
        storageResult = await uploadDocumentFile(originalFile, documentId, originalFilename)
        
        if (storageResult) {
          storagePath = storageResult.path
          
          dbLogger.info({
            operation: 'createWithStorage',
            documentId,
            storagePath,
            uploadedSize: storageResult.size
          }, 'File uploaded to storage successfully')
        } else {
          // Storage upload failed but was handled gracefully (e.g., local dev without RLS policies)
          dbLogger.info({
            operation: 'createWithStorage',
            documentId,
            reason: 'Storage upload failed gracefully (expected in some environments)'
          }, 'Document will be created without original file storage')
        }
      } catch (error) {
        // Log storage error but continue with document creation
        const baseMimeType = originalFile.type?.split(';')[0]?.trim() || ''
        const mimeTypeParameters = originalFile.type?.includes(';') 
          ? originalFile.type.split(';').slice(1).map(p => p.trim()).join('; ') 
          : null
          
        dbLogger.warn({
          operation: 'createWithStorage',
          documentId,
          fileSize: originalFile.size,
          fileType: originalFile.type,
          baseMimeType,
          mimeTypeParameters,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Storage upload failed, creating document without original file')
        
        console.warn('Storage upload failed, creating document without original file:', error)
      }
    }
    
    // Create document record with explicit ID and storage path
    const documentToCreate: DocumentInsert = {
      ...document,
      id: documentId,
      created_by: userId,
      storage_path: storagePath,
      original_file_type: originalFile?.type || null,
      upload_metadata: uploadMetadata || null,
      upload_ai_call_id: uploadAiCallId || null
    }
    
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .insert(documentToCreate)
        .select()
        .single()

      if (error) {
        // If document creation fails after successful storage upload, clean up
        if (storagePath) {
          try {
            await deleteDocumentFile(storagePath)
            dbLogger.info({
              operation: 'createWithStorage',
              documentId,
              storagePath,
              action: 'cleanup_after_db_failure'
            }, 'Cleaned up storage after document creation failure')
          } catch (cleanupError) {
            dbLogger.warn({
              operation: 'createWithStorage',
              documentId,
              storagePath,
              error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
              action: 'cleanup_failed'
            }, 'Failed to clean up storage after document creation failure')
            
            console.warn('Failed to clean up storage after document creation failure:', cleanupError)
          }
        }
        throw new Error(`Failed to create document: ${error.message}`)
      }

      return { document: data, storageResult }
      
    } catch (error) {
      // Clean up storage on any failure
      if (storagePath) {
        try {
          await deleteDocumentFile(storagePath)
          dbLogger.info({
            operation: 'createWithStorage',
            documentId,
            storagePath,
            action: 'cleanup_after_error'
          }, 'Cleaned up storage after error')
        } catch (cleanupError) {
          dbLogger.warn({
            operation: 'createWithStorage',
            documentId,
            storagePath,
            error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
            action: 'cleanup_failed'
          }, 'Failed to clean up storage after error')
          
          console.warn('Failed to clean up storage after error:', cleanupError)
        }
      }
      throw error
    }
  }

  /**
   * Get original file from storage for a document
   */
  async getOriginalFile(documentId: string): Promise<Blob | null> {
    const document = await this.getById(documentId)
    
    if (!document?.storage_path) {
      return null
    }
    
    try {
      dbLogger.info({
        operation: 'getOriginalFile',
        documentId,
        storagePath: document.storage_path
      }, 'Downloading original file from storage')
      
      const file = await downloadDocumentFile(document.storage_path)
      
      dbLogger.info({
        operation: 'getOriginalFile',
        documentId,
        storagePath: document.storage_path,
        fileSize: file.size
      }, 'Original file downloaded successfully')
      
      return file
    } catch (error) {
      dbLogger.warn({
        operation: 'getOriginalFile',
        documentId,
        storagePath: document.storage_path,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to download original file')
      
      console.warn(`Failed to download original file for document ${documentId}:`, error)
      return null
    }
  }

  /**
   * Get a signed URL for accessing the original file
   */
  async getOriginalFileUrl(documentId: string, expiresIn?: number): Promise<string | null> {
    const document = await this.getById(documentId)
    
    if (!document?.storage_path) {
      return null
    }
    
    try {
      dbLogger.info({
        operation: 'getOriginalFileUrl',
        documentId,
        storagePath: document.storage_path,
        expiresIn
      }, 'Generating signed URL for original file')
      
      const url = await getSignedDocumentUrl(document.storage_path, expiresIn)
      
      dbLogger.info({
        operation: 'getOriginalFileUrl',
        documentId,
        storagePath: document.storage_path,
        hasUrl: !!url
      }, 'Signed URL generated successfully')
      
      return url
    } catch (error) {
      dbLogger.warn({
        operation: 'getOriginalFileUrl',
        documentId,
        storagePath: document.storage_path,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to get signed URL')
      
      console.warn(`Failed to get signed URL for document ${documentId}:`, error)
      return null
    }
  }

  /**
   * Check if a document has an original file in storage
   */
  async hasOriginalFile(documentId: string): Promise<boolean> {
    const document = await this.getById(documentId)
    return !!(document?.storage_path)
  }

  /**
   * Delete a document and its storage files
   */
  async deleteWithStorage(id: string): Promise<boolean> {
    // Get document to find storage path
    const document = await this.getById(id)
    
    if (!document) {
      return false
    }
    
    // Delete from database first
    const deleted = await this.delete(id)
    
    if (!deleted) {
      return false
    }
    
    // Clean up storage file if it exists
    if (document.storage_path) {
      try {
        dbLogger.info({
          operation: 'deleteWithStorage',
          documentId: id,
          storagePath: document.storage_path
        }, 'Deleting storage file')
        
        await deleteDocumentFile(document.storage_path)
        
        dbLogger.info({
          operation: 'deleteWithStorage',
          documentId: id,
          storagePath: document.storage_path
        }, 'Storage file deleted successfully')
      } catch (error) {
        dbLogger.warn({
          operation: 'deleteWithStorage',
          documentId: id,
          storagePath: document.storage_path,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Failed to delete storage file')
        
        console.warn(`Failed to delete storage file for document ${id}:`, error)
        // Don't fail the entire operation if storage cleanup fails
      }
    }
    
    // NEW: Clean up any asset files (cropped images) that live under `{documentId}/assets/`
    try {
      const { data: assetFiles, error: listError } = await this.supabase.storage
        .from('documents')
        .list(`${id}/assets`, { limit: 1000 })

      if (listError) {
        throw new Error(listError.message)
      }

      const assetPaths = (assetFiles || [])
        .filter((f) => (f as any).metadata) // filter out folder prefixes
        .map((f) => `${id}/assets/${f.name}`)

      if (assetPaths.length > 0) {
        dbLogger.info({
          operation: 'deleteWithStorage',
          documentId: id,
          assetCount: assetPaths.length
        }, 'Deleting asset files')

        const { error: removeError } = await this.supabase.storage
          .from('documents')
          .remove(assetPaths)

        if (removeError) {
          throw new Error(removeError.message)
        }
      }
    } catch (assetErr) {
      dbLogger.warn({
        operation: 'deleteWithStorage',
        documentId: id,
        error: assetErr instanceof Error ? assetErr.message : 'Unknown error',
        action: 'asset_cleanup_failed'
      }, 'Failed to delete one or more asset files')

      console.warn(`Failed to delete asset files for document ${id}:`, assetErr)
      // Non-fatal – continue
    }
    
    return true
  }

  /**
   * Update storage path for an existing document
   */
  async updateStoragePath(
    documentId: string, 
    originalFile: File | Blob, 
    originalFilename?: string
  ): Promise<{ document: Document | null; storageResult?: StorageUploadResult }> {
    const existingDocument = await this.getById(documentId)
    
    if (!existingDocument) {
      throw new Error('Document not found')
    }
    
    // Upload new file
    const storageResult = await uploadDocumentFile(originalFile, documentId, originalFilename)
    
    // Update document with new storage path
    const updatedDocument = await this.update(documentId, {
      storage_path: storageResult?.path || null,
      original_file_type: originalFile.type || null
    })
    
    // Clean up old storage file if it existed
    if (existingDocument.storage_path && storageResult?.path && existingDocument.storage_path !== storageResult.path) {
      try {
        dbLogger.info({
          operation: 'updateStoragePath',
          documentId,
          oldStoragePath: existingDocument.storage_path,
          newStoragePath: storageResult?.path
        }, 'Cleaning up old storage file')
        
        await deleteDocumentFile(existingDocument.storage_path)
        
        dbLogger.info({
          operation: 'updateStoragePath',
          documentId,
          oldStoragePath: existingDocument.storage_path
        }, 'Old storage file deleted successfully')
      } catch (error) {
        dbLogger.warn({
          operation: 'updateStoragePath',
          documentId,
          oldStoragePath: existingDocument.storage_path,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Failed to clean up old storage file')
        
        console.warn(`Failed to clean up old storage file:`, error)
      }
    }
    
    const result: { document: Document | null; storageResult?: StorageUploadResult } = { 
      document: updatedDocument 
    }
    if (storageResult) {
      result.storageResult = storageResult
    }
    return result
  }

  /**
   * Get a document by slug (direct database lookup)
   */
  async getBySlug(slug: string): Promise<Document | null> {
    // Validate slug format (basic validation)
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return null
    }

    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('slug', slug.trim())
      .single()

    if (error) {
      // Check for "not found" error (PGRST116)
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch document by slug: ${error.message}`)
    }

    return data
  }

  /**
   * Check which enhancement types exist for a document
   * Returns a Set of enhancement types that exist in the database
   */
  async getExistingEnhancementTypes(documentId: string): Promise<Set<string>> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(documentId)) {
      return new Set()
    }

    // Query for all enhancement types
    const { data, error } = await this.supabase
      .from('document_enhancements')
      .select('type')
      .eq('document_id', documentId)

    if (error) {
      throw new Error(`Failed to fetch enhancement types: ${error.message}`)
    }

    // Return set of existing types
    return new Set(data?.map(row => row.type) || [])
  }

  /**
   * Check if specific enhancement types exist for a document
   * Returns flags indicating whether each enhancement type exists
   * This is a convenience method for backward compatibility and UI components
   */
  async getEnhancementFlags(documentId: string): Promise<{
    aiHeadingsGenerated: boolean
    summaryGenerated: boolean
    glossaryGenerated: boolean
  }> {
    const existingTypes = await this.getExistingEnhancementTypes(documentId)
    
    return {
      aiHeadingsGenerated: existingTypes.has('headings'),
      summaryGenerated: existingTypes.has('summary'),
      glossaryGenerated: existingTypes.has('glossary')
    }
  }

  /**
   * Check if a specific enhancement type exists for a document
   */
  async hasEnhancement(documentId: string, enhancementType: string): Promise<boolean> {
    const existingTypes = await this.getExistingEnhancementTypes(documentId)
    return existingTypes.has(enhancementType)
  }
}