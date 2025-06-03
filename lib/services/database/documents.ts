import { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Document, DocumentInsert, DocumentUpdate } from '@/lib/types/database'

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
    delete (validUpdates as any).metadata

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

    return this.list({
      createdBy: userId,
      limit: options?.limit,
      offset: options?.offset
    })
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

    return await this.update(id, {
      html_content: content.html,
      plaintext_content: content.plaintext,
      word_count: wordCount,
    })
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
}