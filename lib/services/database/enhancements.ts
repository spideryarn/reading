import { SupabaseClient } from '@supabase/supabase-js'
import type { 
  Database, 
  DocumentEnhancement, 
  DocumentEnhancementInsert,
  EnhancementType 
} from '@/lib/types/database'

export interface CreateEnhancementOptions {
  documentId: string
  aiCallId: string
  type: EnhancementType
  subtype?: string
  content: Record<string, any>
  extra?: Record<string, any>
}

export class EnhancementService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create or update an enhancement
   */
  async upsert(options: CreateEnhancementOptions): Promise<DocumentEnhancement> {
    const enhancement: Omit<DocumentEnhancementInsert, 'id' | 'created_at' | 'updated_at'> = {
      document_id: options.documentId,
      ai_call_id: options.aiCallId,
      type: options.type,
      subtype: options.subtype || null,
      content: options.content,
      extra: options.extra || {},
    }

    const { data, error } = await this.supabase
      .from('document_enhancements')
      .upsert(enhancement, {
        onConflict: 'document_id,type,subtype',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to upsert enhancement: ${error.message}`)
    }

    return data
  }

  /**
   * Get a specific enhancement
   */
  async get(
    documentId: string,
    type: EnhancementType,
    subtype?: string
  ): Promise<DocumentEnhancement | null> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(documentId)) {
      return null
    }

    let query = this.supabase
      .from('document_enhancements')
      .select('*, ai_calls(*, ai_models(*))')
      .eq('document_id', documentId)
      .eq('type', type)

    if (subtype !== undefined) {
      query = query.eq('subtype', subtype)
    } else {
      query = query.is('subtype', null)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null
      }
      throw new Error(`Failed to fetch enhancement: ${error.message}`)
    }

    return data
  }

  /**
   * Get all enhancements for a document
   */
  async getByDocument(documentId: string): Promise<DocumentEnhancement[]> {
    const { data, error } = await this.supabase
      .from('document_enhancements')
      .select('*, ai_calls(*, ai_models(*))')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch document enhancements: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get enhancements by type across all documents
   */
  async getByType(
    type: EnhancementType,
    limit: number = 10
  ): Promise<DocumentEnhancement[]> {
    const { data, error } = await this.supabase
      .from('document_enhancements')
      .select('*, documents(title)')
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch enhancements by type: ${error.message}`)
    }

    return data || []
  }

  /**
   * Delete an enhancement
   */
  async delete(
    documentId: string,
    type: EnhancementType,
    subtype?: string
  ): Promise<void> {
    let query = this.supabase
      .from('document_enhancements')
      .delete()
      .eq('document_id', documentId)
      .eq('type', type)

    if (subtype !== undefined) {
      query = query.eq('subtype', subtype)
    } else {
      query = query.is('subtype', null)
    }

    const { error } = await query

    if (error) {
      throw new Error(`Failed to delete enhancement: ${error.message}`)
    }
  }

  /**
   * Store document summary
   */
  async storeSummary(
    documentId: string,
    aiCallId: string,
    summary: {
      text: string
      keyPoints?: string[]
      metadata?: Record<string, any>
    },
    granularity?: string
  ): Promise<DocumentEnhancement> {
    return await this.upsert({
      documentId,
      aiCallId,
      type: 'summary',
      subtype: granularity,
      content: summary,
    })
  }

  /**
   * Store document glossary
   */
  async storeGlossary(
    documentId: string,
    aiCallId: string,
    glossary: {
      entities: Array<{
        name: string
        ontology: string
        aliases: string[]
        brief_explanation: string
        long_explanation?: string
        datetime?: string
        url?: string
        extra?: Record<string, unknown>
      }>
      metadata?: Record<string, any>
    }
  ): Promise<DocumentEnhancement> {
    return await this.upsert({
      documentId,
      aiCallId,
      type: 'glossary',
      content: glossary,
    })
  }

  /**
   * Store AI-generated headings
   */
  async storeHeadings(
    documentId: string,
    aiCallId: string,
    headings: {
      items: Array<{
        id: string
        text: string
        level: number
        parentId?: string
        elementId?: string
      }>
      metadata?: Record<string, any>
    }
  ): Promise<DocumentEnhancement> {
    return await this.upsert({
      documentId,
      aiCallId,
      type: 'headings',
      content: headings,
    })
  }

  /**
   * Store tweet thread
   */
  async storeTweetThread(
    documentId: string,
    aiCallId: string,
    thread: {
      tweets: Array<{
        id: string
        text: string
        mediaHint?: string
      }>
      metadata?: Record<string, any>
    }
  ): Promise<DocumentEnhancement> {
    return await this.upsert({
      documentId,
      aiCallId,
      type: 'tweet-thread',
      content: thread,
    })
  }

  /**
   * Check if an enhancement exists
   */
  async exists(
    documentId: string,
    type: EnhancementType,
    subtype?: string
  ): Promise<boolean> {
    const enhancement = await this.get(documentId, type, subtype)
    return enhancement !== null
  }

  /**
   * Get enhancement statistics for a document
   */
  async getDocumentStats(documentId: string): Promise<{
    totalEnhancements: number
    byType: Record<EnhancementType, number>
    lastUpdated: string | null
  }> {
    const enhancements = await this.getByDocument(documentId)

    const stats = enhancements.reduce(
      (acc, enhancement) => {
        acc.totalEnhancements++
        const type = enhancement.type as EnhancementType
        acc.byType[type] = (acc.byType[type] || 0) + 1
        
        if (!acc.lastUpdated || enhancement.updated_at > acc.lastUpdated) {
          acc.lastUpdated = enhancement.updated_at
        }
        
        return acc
      },
      {
        totalEnhancements: 0,
        byType: {} as Record<EnhancementType, number>,
        lastUpdated: null as string | null,
      }
    )

    return stats
  }
}