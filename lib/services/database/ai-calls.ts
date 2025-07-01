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
import { getModelConfig, validateModelStringStrict } from '@/lib/config/models'

export interface AiCallMetrics {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  reasoningTokens?: number
  latencyMs: number
}

// Model string-based interface
export interface CreateAiCallWithModelStringOptions {
  documentId?: string
  userId: string  // Required for RLS
  modelString: string  // e.g., "anthropic:claude-3-5-haiku:20241022"
  prompt_type: PromptType
  input_data?: JsonObject
  extra?: JsonObject
}

// Model string-based simple interface
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
   * Start tracking an AI call using model string
   */
  async startCallWithModelString(options: CreateAiCallWithModelStringOptions): Promise<AiCall> {
    // Strict validation of model string
    const validation = validateModelStringStrict(options.modelString)
    if (!validation.valid) {
      throw new Error(`Invalid model string for AI call: ${validation.error}`)
    }

    const aiCall: Omit<AiCallInsert, 'id' | 'created_at' | 'updated_at'> = {
      document_id: options.documentId || null,
      created_by: options.userId,  // Set created_by for RLS
      model_string: options.modelString,  // Store model string directly
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
      .select('*')
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
    let query = this.supabase.from('ai_calls').select('*')

    if (options?.documentId) {
      query = query.eq('document_id', options.documentId)
    }

    if (options?.aiModelId) {
      query = query.eq('model_string', options.aiModelId)
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
      .select('*')
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

        // Calculate cost using model string configuration
        let cost = 0
        if (call.model_string && call.prompt_tokens && call.completion_tokens) {
          try {
            const modelConfig = getModelConfig(call.model_string)
            if (modelConfig.pricing) {
              // Convert from per 1M tokens to per token cost
              cost = 
                (call.prompt_tokens * modelConfig.pricing.inputPer1M / 1_000_000) +
                (call.completion_tokens * modelConfig.pricing.outputPer1M / 1_000_000)
            }
          } catch {
            // Model not found in config, skip cost calculation
          }
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
   * Simple create method for completed AI calls using model string
   */
  async createWithModelString(options: SimpleCreateAiCallWithModelStringOptions): Promise<AiCall> {
    // Strict validation of model string
    const validation = validateModelStringStrict(options.modelString)
    if (!validation.valid) {
      throw new Error(`Invalid model string for AI call: ${validation.error}`)
    }

    const aiCall: Omit<AiCallInsert, 'id' | 'created_at' | 'updated_at'> = {
      document_id: null, // No document association for this simple method
      created_by: options.userId,  // Set created_by for RLS
      model_string: options.modelString,  // Store model string directly
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
   * Get recent AI calls across all documents
   */
  async getRecentCalls(limit: number = 10): Promise<AiCall[]> {
    const { data, error } = await this.supabase
      .from('ai_calls')
      .select('*, documents(title)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch recent calls: ${error.message}`)
    }

    return data || []
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
                    (response.finishTimestamp && response.startTimestamp 
                      ? response.finishTimestamp - response.startTimestamp 
                      : 0) || 
                    0

    return {
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      totalTokens: usage.totalTokens || 0,
      reasoningTokens: (usage as any).reasoningTokens,
      latencyMs: latency,
    }
  }
}