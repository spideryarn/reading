import { SupabaseClient } from '@supabase/supabase-js'
import type { 
  Database, 
  ChatThread, 
  ChatThreadInsert,
  ChatMessage,
  ChatMessageInsert,
  MessageRole
} from '@/lib/types/database'
import type { JsonObject } from '@/lib/types/json'

export interface CreateThreadOptions {
  documentId: string
  modelId: string
  title?: string
  userId?: string
  extra?: JsonObject
}

export interface CreateMessageOptions {
  threadId: string
  role: MessageRole
  content: string
  aiCallId?: string
  extra?: JsonObject
}

export class ChatService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new chat thread
   */
  async createThread(options: CreateThreadOptions): Promise<ChatThread> {
    const thread: Omit<ChatThreadInsert, 'id' | 'created_at' | 'updated_at'> = {
      document_id: options.documentId,
      model_id: options.modelId,
      title: options.title || 'New Chat',
      created_by: options.userId || null,
      extra: options.extra || {},
    }

    const { data, error } = await this.supabase
      .from('chat_threads')
      .insert(thread)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create chat thread: ${error.message}`)
    }

    return data
  }

  /**
   * Get a chat thread by ID
   */
  async getThread(id: string): Promise<ChatThread | null> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return null
    }

    const { data, error } = await this.supabase
      .from('chat_threads')
      .select('*, ai_models(*), documents(title)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null
      }
      throw new Error(`Failed to fetch chat thread: ${error.message}`)
    }

    return data
  }

  /**
   * Update thread title or metadata
   */
  async updateThread(
    id: string,
    updates: { title?: string; extra?: JsonObject }
  ): Promise<ChatThread> {
    const { data, error } = await this.supabase
      .from('chat_threads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update chat thread: ${error.message}`)
    }

    return data
  }

  /**
   * List threads for a document
   */
  async listThreadsByDocument(
    documentId: string,
    limit: number = 10
  ): Promise<ChatThread[]> {
    const { data, error } = await this.supabase
      .from('chat_threads')
      .select('*, ai_models(*)')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to list chat threads: ${error.message}`)
    }

    return data || []
  }

  /**
   * Add a message to a thread
   */
  async addMessage(options: CreateMessageOptions): Promise<ChatMessage> {
    // Get current max sequence number
    const { data: existingMessages, error: seqError } = await this.supabase
      .from('chat_messages')
      .select('sequence_number')
      .eq('thread_id', options.threadId)
      .order('sequence_number', { ascending: false })
      .limit(1)

    if (seqError && seqError.code !== 'PGRST116') {
      throw new Error(`Failed to get message sequence: ${seqError.message}`)
    }

    const nextSequence = existingMessages?.[0]?.sequence_number 
      ? existingMessages[0].sequence_number + 1 
      : 1

    const message: Omit<ChatMessageInsert, 'id' | 'created_at' | 'updated_at'> = {
      thread_id: options.threadId,
      sequence_number: nextSequence,
      role: options.role,
      content: options.content,
      ai_call_id: options.aiCallId || null,
      extra: options.extra || {},
    }

    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to add chat message: ${error.message}`)
    }

    return data
  }

  /**
   * Get all messages in a thread
   */
  async getThreadMessages(threadId: string): Promise<ChatMessage[]> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(threadId)) {
      return []
    }

    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*, ai_calls(*, ai_models(*))')
      .eq('thread_id', threadId)
      .order('sequence_number', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch chat messages: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get thread with all messages
   */
  async getThreadWithMessages(threadId: string): Promise<{
    thread: ChatThread | null
    messages: ChatMessage[]
  }> {
    const thread = await this.getThread(threadId)
    const messages = await this.getThreadMessages(threadId)

    return { thread, messages }
  }

  /**
   * Delete a thread (cascades to messages)
   */
  async deleteThread(id: string): Promise<void> {
    // Validate UUID format - for delete, we'll still throw on invalid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      // For delete, we don't throw error on invalid UUID, just return
      return
    }

    const { error } = await this.supabase
      .from('chat_threads')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete chat thread: ${error.message}`)
    }
  }

  /**
   * Get recent threads across all documents
   */
  async getRecentThreads(
    options?: { userId?: string; limit?: number }
  ): Promise<ChatThread[]> {
    let query = this.supabase
      .from('chat_threads')
      .select('*, documents(title), ai_models(*)')

    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(options?.limit || 10)

    if (error) {
      throw new Error(`Failed to fetch recent threads: ${error.message}`)
    }

    return data || []
  }

  /**
   * Generate a thread title based on first few messages
   */
  async generateThreadTitle(threadId: string): Promise<string> {
    const messages = await this.getThreadMessages(threadId)
    
    if (messages.length === 0) return 'New Chat'
    
    // Get first user message
    const firstUserMessage = messages.find(m => m.role === 'user')
    if (!firstUserMessage) return 'New Chat'
    
    // Truncate to reasonable title length
    const title = firstUserMessage.content.slice(0, 100)
    return title.length < firstUserMessage.content.length ? `${title}...` : title
  }

  /**
   * Auto-update thread title based on first user message
   */
  async autoUpdateThreadTitle(threadId: string): Promise<ChatThread> {
    const title = await this.generateThreadTitle(threadId)
    return await this.updateThread(threadId, { title })
  }
}