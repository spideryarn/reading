import { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Document, DocumentInsert, DocumentUpdate } from '@/lib/types/database'

export class DocumentService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new document
   */
  async create(document: Omit<DocumentInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Document | null> {
    const { data, error } = await this.supabase
      .from('documents')
      .insert(document)
      .select()
      .single()

    if (error) {
      console.error('Error creating document:', error)
      return null
    }

    return data
  }

  /**
   * Get a document by ID
   */
  async getById(id: string): Promise<Document | null> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching document:', error)
      return null
    }

    return data
  }

  /**
   * Update a document
   */
  async update(id: string, updates: DocumentUpdate): Promise<Document | null> {
    const { data, error } = await this.supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating document:', error)
      return null
    }

    return data
  }

  /**
   * Delete a document (cascades to related tables)
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting document:', error)
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
  }): Promise<Document[]> {
    let query = this.supabase.from('documents').select('*')

    if (options?.isPublic !== undefined) {
      query = query.eq('is_public', options.isPublic)
    }

    if (options?.createdBy) {
      query = query.eq('created_by', options.createdBy)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing documents:', error)
      return []
    }

    return data || []
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
      console.error('Error searching documents:', error)
      return []
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

    if (docError || !document) {
      console.error('Error fetching document:', docError)
      return { document: null, enhancements: [] }
    }

    const { data: enhancements, error: enhError } = await this.supabase
      .from('document_enhancements')
      .select('*')
      .eq('document_id', id)

    if (enhError) {
      console.error('Error fetching enhancements:', enhError)
    }

    return {
      document,
      enhancements: enhancements || [],
    }
  }

  /**
   * Calculate and update word count for a document
   */
  async updateWordCount(id: string): Promise<number | null> {
    const document = await this.getById(id)
    if (!document || !document.plaintext_content) return null

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
}