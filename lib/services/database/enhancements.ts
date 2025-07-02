import { SupabaseClient } from '@supabase/supabase-js'
import type { 
  Database, 
  DocumentEnhancement, 
  DocumentEnhancementInsert,
  EnhancementType,
  Json
} from '../../types/database-extensions'
import type { JsonObject } from '../../types/json'

export interface CreateEnhancementOptions {
  documentId: string
  aiCallId: string
  type: EnhancementType
  subtype: string
  content: JsonObject
  extra?: JsonObject
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
      subtype: options.subtype,
      content: options.content as Json,
      extra: (options.extra || {}) as Json,
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
      .select('*, ai_calls(*)')
      .eq('document_id', documentId)
      .eq('type', type)

    if (subtype !== undefined) {
      query = query.eq('subtype', subtype)
    } else {
      // When no subtype provided, look for 'default' subtype
      query = query.eq('subtype', 'default')
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
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
      .select('*, ai_calls(*)')
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
      // When no subtype provided, look for 'default' subtype
      query = query.eq('subtype', 'default')
    }

    const { error } = await query

    if (error) {
      throw new Error(`Failed to delete enhancement: ${error.message}`)
    }
  }

  /**
   * Store document summary (single-dimension, legacy)
   */
  async storeSummary(
    documentId: string,
    aiCallId: string,
    summary: {
      text: string
      keyPoints?: string[]
      metadata?: JsonObject
    },
    granularity?: string
  ): Promise<DocumentEnhancement> {
    return await this.upsert({
      documentId,
      aiCallId,
      type: 'summary',
      subtype: granularity || 'document',
      content: summary,
    })
  }

  /**
   * Store multi-dimensional summary (3x3 expertise × length matrix)
   * 
   * Content structure:
   * {
   *   beginner: { 
   *     sentence_or_two: "...", 
   *     single_short_paragraph: "...", 
   *     page: "..." 
   *   },
   *   intermediate: { 
   *     sentence_or_two: "...", 
   *     single_short_paragraph: "...", 
   *     page: "..." 
   *   },
   *   expert: { 
   *     sentence_or_two: "...", 
   *     single_short_paragraph: "...", 
   *     page: "..." 
   *   }
   * }
   */
  async storeMultiSummary(
    documentId: string,
    aiCallIds: { [key: string]: string }, // Map of combination keys to AI call IDs
    summaries: {
      beginner: {
        sentence_or_two: string
        single_short_paragraph: string
        page: string
      }
      intermediate: {
        sentence_or_two: string
        single_short_paragraph: string
        page: string
      }
      expert: {
        sentence_or_two: string
        single_short_paragraph: string
        page: string
      }
    },
    metadata?: JsonObject
  ): Promise<DocumentEnhancement> {
    // Use the first AI call ID as the primary reference
    const primaryAiCallId = Object.values(aiCallIds)[0]
    
    if (!primaryAiCallId) {
      throw new Error('At least one AI call ID must be provided')
    }
    
    return await this.upsert({
      documentId,
      aiCallId: primaryAiCallId,
      type: 'summary',
      subtype: 'multi-dimensional',
      content: {
        summaries,
        ai_call_mapping: aiCallIds,
        metadata: {
          ...metadata,
          generatedAt: new Date().toISOString(),
          totalCombinations: 9,
          expertiseLevels: ['beginner', 'intermediate', 'expert'],
          lengthLevels: ['sentence_or_two', 'single_short_paragraph', 'page']
        }
      },
    })
  }

  /**
   * Get multi-dimensional summary
   */
  async getMultiSummary(documentId: string): Promise<{
    beginner: {
      sentence_or_two: string
      single_short_paragraph: string
      page: string
    }
    intermediate: {
      sentence_or_two: string
      single_short_paragraph: string
      page: string
    }
    expert: {
      sentence_or_two: string
      single_short_paragraph: string
      page: string
    }
  } | null> {
    const enhancement = await this.get(documentId, 'summary', 'multi-dimensional')
    
    if (!enhancement || !enhancement.content) {
      return null
    }
    
    const content = enhancement.content as { summaries?: unknown }
    if (!content.summaries) {
      throw new Error(`Malformed multi-dimensional summary data: missing summaries field`)
    }
    
    return content.summaries as {
      beginner: {
        sentence_or_two: string
        single_short_paragraph: string
        page: string
      }
      intermediate: {
        sentence_or_two: string
        single_short_paragraph: string
        page: string
      }
      expert: {
        sentence_or_two: string
        single_short_paragraph: string
        page: string
      }
    }
  }

  /**
   * Store document glossary
   * @deprecated Use individual entity storage instead via storeIndividualEntities()
   * This method stores all entities in a single row with subtype 'default'.
   * New implementations should use individual entity storage for better performance
   * and granular tracking. This method is kept for backwards compatibility only.
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
      metadata?: JsonObject
    }
  ): Promise<DocumentEnhancement> {
    return await this.upsert({
      documentId,
      aiCallId,
      type: 'glossary',
      subtype: 'default',
      content: glossary as JsonObject,
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
      metadata?: JsonObject
    }
  ): Promise<DocumentEnhancement> {
    return await this.upsert({
      documentId,
      aiCallId,
      type: 'headings',
      subtype: 'default',
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
      metadata?: JsonObject
    }
  ): Promise<DocumentEnhancement> {
    return await this.upsert({
      documentId,
      aiCallId,
      type: 'tweet-thread',
      subtype: 'default',
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
        
        if (enhancement.updated_at && (!acc.lastUpdated || enhancement.updated_at > acc.lastUpdated)) {
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