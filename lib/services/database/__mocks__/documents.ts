// Mock for documents service module to use in tests
import type { 
  Document, 
  DocumentInsert, 
  DocumentUpdate,
  Database
} from '@/lib/types/database'
import type { StorageUploadResult } from '@/lib/services/storage'

export class DocumentService {
  // Mock storage for tracking documents
  private static mockDocuments: Document[] = []
  private static nextId = 1

  constructor(private supabase: any) {}

  // Helper to generate unique IDs
  private static generateId(): string {
    return `mock-document-id-${this.nextId++}`
  }

  /**
   * Create a new document
   */
  async create(document: Omit<DocumentInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
    const newDocument: Document = {
      id: DocumentService.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...document
    } as Document

    DocumentService.mockDocuments.push(newDocument)
    return newDocument
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

    return DocumentService.mockDocuments.find(d => d.id === id) || null
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

    const index = DocumentService.mockDocuments.findIndex(d => d.id === id)
    if (index === -1) {
      return null
    }

    const baseDocument = DocumentService.mockDocuments[index]
    const updated: Document = {
      ...baseDocument,
      ...validUpdates,
      updated_at: new Date().toISOString()
    } as Document

    DocumentService.mockDocuments[index] = updated
    return updated
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

    const index = DocumentService.mockDocuments.findIndex(d => d.id === id)
    if (index === -1) {
      return false
    }

    DocumentService.mockDocuments.splice(index, 1)
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
    let docs = [...DocumentService.mockDocuments]

    if (options?.isPublic !== undefined) {
      docs = docs.filter(d => d.is_public === options.isPublic)
    }

    if (options?.createdBy) {
      docs = docs.filter(d => d.created_by === options.createdBy)
    }

    // Apply pagination
    const offset = options?.offset || 0
    const limit = options?.limit || 20
    const paginatedDocs = docs.slice(offset, offset + limit)
    const hasMore = offset + limit < docs.length

    return { documents: paginatedDocs, hasMore }
  }

  /**
   * List all documents for a specific user
   */
  async listByUser(userId: string): Promise<Document[]> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return []
    }

    return DocumentService.mockDocuments.filter(d => d.created_by === userId)
  }

  /**
   * Check if a document is owned by a specific user
   */
  async isOwnedByUser(documentId: string, userId: string): Promise<boolean> {
    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(documentId) || !uuidRegex.test(userId)) {
      return false
    }

    const doc = DocumentService.mockDocuments.find(d => d.id === documentId)
    return doc ? doc.created_by === userId : false
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
    const lowerSearch = searchTerm.toLowerCase()
    return DocumentService.mockDocuments
      .filter(d => 
        d.plaintext_content?.toLowerCase().includes(lowerSearch) ||
        d.title.toLowerCase().includes(lowerSearch)
      )
      .slice(0, limit)
  }

  /**
   * Get document with all enhancements
   */
  async getWithEnhancements(id: string): Promise<{
    document: Document | null
    enhancements: Database['public']['Tables']['document_enhancements']['Row'][]
  }> {
    const document = await this.getById(id)
    
    // Mock enhancements - in real tests these would be set up separately
    return {
      document,
      enhancements: []
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
  ): Promise<Document | null> {
    const wordCount = content.plaintext.trim().split(/\s+/).length

    return await this.update(id, {
      html_content: content.html,
      plaintext_content: content.plaintext,
      word_count: wordCount,
    })
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
    uploadAiCallId?: string
  ): Promise<{ document: Document; storageResult?: StorageUploadResult }> {
    // Generate document ID early so we can use it for storage path
    const documentId = DocumentService.generateId()
    
    // Mock storage result if file provided
    const storageResult: StorageUploadResult | undefined = originalFile ? {
      path: `documents/${documentId}/original`,
      fullPath: `documents/${documentId}/original/${originalFile instanceof File ? originalFile.name : 'blob'}`,
      size: originalFile.size,
      mimeType: originalFile.type
    } : undefined
    
    // Create document record with explicit ID and storage path
    const documentToCreate: DocumentInsert = {
      ...document,
      id: documentId,
      created_by: userId,
      storage_path: storageResult?.path || null,
      original_file_type: originalFile?.type || null,
      upload_metadata: uploadMetadata || null,
      upload_ai_call_id: uploadAiCallId || null
    }
    
    const createdDoc = await this.create(documentToCreate)
    
    const result: { document: Document; storageResult?: StorageUploadResult } = {
      document: createdDoc
    }
    
    if (storageResult !== undefined) {
      result.storageResult = storageResult
    }
    
    return result
  }

  /**
   * Download original file from storage
   */
  async downloadOriginalFile(documentId: string): Promise<{ blob: Blob; filename: string } | null> {
    const document = await this.getById(documentId)
    if (!document || !document.storage_path) {
      return null
    }

    // Mock blob response
    const blob = new Blob(['Mock file content'], { type: document.original_file_type || 'text/plain' })
    const filename = `${document.title}.${document.original_file_type?.split('/')[1] || 'txt'}`
    
    return { blob, filename }
  }

  /**
   * Get signed URL for original file download
   */
  async getOriginalFileUrl(documentId: string, expiresIn: number = 3600): Promise<string | null> {
    const document = await this.getById(documentId)
    if (!document || !document.storage_path) {
      return null
    }

    // Mock signed URL
    return `https://mock-storage.example.com/${document.storage_path}?token=mock-token&expires=${Date.now() + expiresIn * 1000}`
  }

  /**
   * Delete original file from storage (admin function)
   */
  async deleteOriginalFile(documentId: string): Promise<boolean> {
    const document = await this.getById(documentId)
    if (!document || !document.storage_path) {
      return false
    }

    // Update document to remove storage path
    await this.update(documentId, { storage_path: null })
    return true
  }

  // Test helper methods
  static clearMockDocuments(): void {
    this.mockDocuments = []
    this.nextId = 1
  }

  static getMockDocuments(): Document[] {
    return [...this.mockDocuments]
  }

  static setMockDocuments(documents: Document[]): void {
    this.mockDocuments = [...documents]
  }
}

// Export mock as default and named export for flexibility
export default DocumentService