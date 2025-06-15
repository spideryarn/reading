import { SupabaseClient } from '@supabase/supabase-js'
import type { 
  Database, 
  AiCall, 
  AiCallInsert, 
  CallStatus,
  PromptType
} from '@/lib/types/database'
import type { PromptUsage } from '@/lib/prompts/types'
import type { JsonObject } from '@/lib/types/json'
import { parseModelString } from '@/lib/config/models'

export interface AiCallMetrics {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  reasoningTokens?: number
  latencyMs: number
}

// DEPRECATED: Use CreateAiCallWithModelStringOptions instead
export interface CreateAiCallOptions {
  documentId?: string
  userId: string  // Required for RLS
  provider: 'anthropic' | 'google'
  modelId: string
  version: string
  prompt_type: PromptType
  input_data?: JsonObject
  extra?: JsonObject
}

// NEW: Model string-based interface
export interface CreateAiCallWithModelStringOptions {
  documentId?: string
  userId: string  // Required for RLS
  modelString: string  // e.g., "anthropic:claude-3-5-haiku:20241022"
  prompt_type: PromptType
  input_data?: JsonObject
  extra?: JsonObject
}

// DEPRECATED: Use SimpleCreateAiCallWithModelStringOptions instead
export interface SimpleCreateAiCallOptions {
  userId: string  // Required for RLS
  provider: 'anthropic' | 'google'
  modelId: string
  version: string
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  requestData?: JsonObject
  responseData?: JsonObject
}

// NEW: Model string-based simple interface
export interface SimpleCreateAiCallWithModelStringOptions {
  userId: string  // Required for RLS
  modelString: string  // e.g., "anthropic:claude-3-5-haiku:20241022"
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  requestData?: JsonObject
  responseData?: JsonObject
}

export class AiCallService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Look up model UUID by provider, model ID, and version
   */
  async getModelUuidByProviderAndId(provider: string, modelId: string, version: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('ai_models')
      .select('id')
      .eq('provider', provider)
      .eq('model_id', modelId)
      .eq('version', version)
      .single()
    
    if (error || !data) {
      throw new Error(`Model not found: provider='${provider}', model_id='${modelId}', version='${version}'. Check that the model exists in the ai_models table.`)
    }
    
    return data.id
  }

  /**
   * Start tracking an AI call (DEPRECATED - use startCallWithModelString)
   */
  async startCall(options: CreateAiCallOptions): Promise<AiCall> {
    // Look up model UUID by provider, model ID, and version
    const modelUuid = await this.getModelUuidByProviderAndId(options.provider, options.modelId, options.version)

    const aiCall: Omit<AiCallInsert, 'id' | 'created_at' | 'updated_at'> = {
      document_id: options.documentId || null,
      created_by: options.userId,  // Set created_by for RLS
      model_id: modelUuid,
      prompt_type: options.prompt_type,
      prompt_input: JSON.stringify(options.input_data || {}),
      prompt_template: null,
      status: 'pending',
      extra: options.extra || {},
    }

    const { data, error } = await this.supabase
      .from('ai_calls')
      .insert(aiCall)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create AI call: ${error.message}`)
    }

    return data
  }

  /**
   * Start tracking an AI call using model string
   */
  async startCallWithModelString(options: CreateAiCallWithModelStringOptions): Promise<AiCall> {
    // Validate and parse model string
    const parsedModel = parseModelString(options.modelString)

    const aiCall: Omit<AiCallInsert, 'id' | 'created_at' | 'updated_at'> = {
      document_id: options.documentId || null,
      created_by: options.userId,  // Set created_by for RLS
      model_string: options.modelString,  // Store model string directly
      model_id: null, // Not used with model strings
      prompt_type: options.prompt_type,
      prompt_input: JSON.stringify(options.input_data || {}),
      prompt_template: null,
      status: 'pending',
      extra: options.extra || {},
    }

    const { data, error } = await this.supabase
      .from('ai_calls')
      .insert(aiCall)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create AI call: ${error.message}`)
    }

    return data
  }

  /**
   * Complete an AI call with success
   */
  async completeCall(
    id: string,
    data: { 
      output_data?: JsonObject
      usage?: PromptUsage
      finishReason?: string
    }
  ): Promise<AiCall | null> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      throw new Error(`Invalid UUID format: ${id}`)
    }

    const completedAt = new Date().toISOString()
    
    // Build update object with usage metadata if provided
    const updateData: Partial<AiCallInsert> = {
      status: 'success',
      completed_at: completedAt,
      extra: data.output_data || {},
    }
    
    // Add usage metadata if provided
    if (data.usage) {
      updateData.prompt_tokens = data.usage.promptTokens
      updateData.completion_tokens = data.usage.completionTokens
      updateData.total_tokens = data.usage.totalTokens
      if (data.usage.reasoningTokens !== undefined) {
        updateData.reasoning_tokens = data.usage.reasoningTokens
      }
    }
    
    // Add finish reason if provided
    if (data.finishReason) {
      updateData.finish_reason = data.finishReason
    }
    
    const { data: result, error } = await this.supabase
      .from('ai_calls')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null
      }
      throw new Error(`Failed to complete AI call: ${error.message}`)
    }

    return result
  }

  /**
   * Mark an AI call as failed
   */
  async failCall(
    id: string,
    errorMessage: string,
    errorCode?: string,
    extra?: JsonObject
  ): Promise<AiCall> {
    const { data, error } = await this.supabase
      .from('ai_calls')
      .update({
        status: 'failed',
        error_message: errorMessage,
        error_code: errorCode || null,
        completed_at: new Date().toISOString(),
        extra: extra || {},
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update AI call as failed: ${error.message}`)
    }

    return data
  }

  /**
   * Get AI call by ID
   */
  async getById(id: string): Promise<AiCall | null> {
    const { data, error } = await this.supabase
      .from('ai_calls')
      .select('*, ai_models(*)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null
      }
      throw new Error(`Failed to fetch AI call: ${error.message}`)
    }

    return data
  }

  /**
   * List AI calls with filters
   */
  async list(options?: {
    documentId?: string
    aiModelId?: string
    promptType?: PromptType
    status?: CallStatus
    limit?: number
    offset?: number
  }): Promise<AiCall[]> {
    let query = this.supabase.from('ai_calls').select('*, ai_models(*)')

    if (options?.documentId) {
      query = query.eq('document_id', options.documentId)
    }

    if (options?.aiModelId) {
      query = query.eq('model_id', options.aiModelId)
    }

    if (options?.promptType) {
      query = query.eq('prompt_type', options.promptType)
    }

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to list AI calls: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get usage statistics for a document
   */
  async getDocumentUsageStats(documentId: string): Promise<{
    totalCalls: number
    totalTokens: number
    totalCost: number
    byPromptType: Record<PromptType, { calls: number; tokens: number }>
  }> {
    const { data, error } = await this.supabase
      .from('ai_calls')
      .select('*, ai_models(*)')
      .eq('document_id', documentId)
      .eq('status', 'success')

    if (error) {
      throw new Error(`Failed to fetch usage stats: ${error.message}`)
    }

    if (!data) {
      return {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        byPromptType: {} as Record<PromptType, { calls: number; tokens: number }>,
      }
    }

    const stats = data.reduce(
      (acc, call) => {
        const tokens = call.total_tokens || 0
        const model = call.ai_models as Database['public']['Tables']['ai_models']['Row'] | null

        // Calculate cost if model has pricing info
        let cost = 0
        if (model && call.prompt_tokens && call.completion_tokens) {
          cost = 
            (call.prompt_tokens * (model.input_token_cost || 0)) +
            (call.completion_tokens * (model.output_token_cost || 0))
        }

        acc.totalCalls++
        acc.totalTokens += tokens
        acc.totalCost += cost

        const promptType = call.prompt_type as PromptType
        if (!acc.byPromptType[promptType]) {
          acc.byPromptType[promptType] = { calls: 0, tokens: 0 }
        }
        acc.byPromptType[promptType].calls++
        acc.byPromptType[promptType].tokens += tokens

        return acc
      },
      {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        byPromptType: {} as Record<PromptType, { calls: number; tokens: number }>,
      }
    )

    return stats
  }

  /**
   * Get recent AI calls across all documents
   */
  async getRecentCalls(limit: number = 10): Promise<AiCall[]> {
    const { data, error } = await this.supabase
      .from('ai_calls')
      .select('*, ai_models(*), documents(title)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch recent calls: ${error.message}`)
    }

    return data || []
  }

  /**
   * Simple create method for completed AI calls (DEPRECATED - use createWithModelString)
   */
  async create(options: SimpleCreateAiCallOptions): Promise<AiCall> {
    // Look up model UUID by provider, model ID, and version
    const modelUuid = await this.getModelUuidByProviderAndId(options.provider, options.modelId, options.version)

    const aiCall: Omit<AiCallInsert, 'id' | 'created_at' | 'updated_at'> = {
      document_id: null, // No document association for this simple method
      created_by: options.userId,  // Set created_by for RLS
      model_id: modelUuid,
      prompt_type: 'chat', // Default to chat for this simple interface
      prompt_input: JSON.stringify(options.requestData || {}),
      prompt_template: null,
      status: 'success', // Mark as completed immediately
      completed_at: new Date().toISOString(),
      prompt_tokens: options.promptTokens,
      completion_tokens: options.completionTokens,
      total_tokens: options.totalTokens,
      extra: options.responseData || {},
    }

    const { data, error } = await this.supabase
      .from('ai_calls')
      .insert(aiCall)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create AI call: ${error.message}`)
    }

    return data
  }

  /**
   * Simple create method for completed AI calls using model string
   */
  async createWithModelString(options: SimpleCreateAiCallWithModelStringOptions): Promise<AiCall> {
    // Validate and parse model string
    const parsedModel = parseModelString(options.modelString)

    const aiCall: Omit<AiCallInsert, 'id' | 'created_at' | 'updated_at'> = {
      document_id: null, // No document association for this simple method
      created_by: options.userId,  // Set created_by for RLS
      model_string: options.modelString,  // Store model string directly
      model_id: null, // Not used with model strings
      prompt_type: 'chat', // Default to chat for this simple interface
      prompt_input: JSON.stringify(options.requestData || {}),
      prompt_template: null,
      status: 'success', // Mark as completed immediately
      completed_at: new Date().toISOString(),
      prompt_tokens: options.promptTokens,
      completion_tokens: options.completionTokens,
      total_tokens: options.totalTokens,
      extra: options.responseData || {},
    }

    const { data, error } = await this.supabase
      .from('ai_calls')
      .insert(aiCall)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create AI call: ${error.message}`)
    }

    return data
  }

  /**
   * Helper to extract metrics from Vercel AI SDK response
   */
  extractMetricsFromAiResponse(response: {
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    }
    experimental_providerMetadata?: {
      latency?: number
    }
    finishTimestamp?: number
    startTimestamp?: number
    finishReason?: string
  }): AiCallMetrics {
    // Based on Vercel AI SDK structure
    const usage = response.usage || {}
    const latency = response.experimental_providerMetadata?.latency || 
                    (response.finishTimestamp - response.startTimestamp) || 
                    0

    return {
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      totalTokens: usage.totalTokens || 0,
      reasoningTokens: usage.reasoningTokens,
      latencyMs: latency,
    }
  }
}