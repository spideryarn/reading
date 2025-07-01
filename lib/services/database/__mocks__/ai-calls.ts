// Mock for ai-calls service module to use in tests
import type { 
  AiCall, 
  CallStatus,
  PromptType,
  Json
} from '@/lib/types/database'
import type { PromptUsage } from '@/lib/prompts/types'
import type { JsonObject } from '@/lib/types/json'
import type {
  AiCallMetrics,
  CreateAiCallWithModelStringOptions,
  SimpleCreateAiCallWithModelStringOptions
} from '../ai-calls'

// Default mock AI call
const createMockAiCall = (overrides?: Partial<AiCall>): AiCall => ({
  id: 'mock-ai-call-id',
  document_id: null,
  created_by: 'mock-user-id',
  model_string: 'anthropic:claude-3-5-haiku:20241022',
  prompt_type: 'chat' as PromptType,
  prompt_input: '{}',
  prompt_template: null,
  status: 'pending' as CallStatus,
  created_at: new Date().toISOString(),
  completed_at: null,
  prompt_tokens: null,
  completion_tokens: null,
  total_tokens: null,
  reasoning_tokens: null,
  finish_reason: null,
  error_message: null,
  error_code: null,
  extra: {} as Json,
  extra_usage: null,
  latency_ms: null,
  response_text: null,
  ...overrides
})

export class AiCallService {
  // Mock storage for tracking calls
  private static mockCalls: AiCall[] = []
  private static nextId = 1

  constructor(private supabase: any) {}

  // Helper to generate unique IDs
  private static generateId(): string {
    return `mock-ai-call-id-${this.nextId++}`
  }


  // NEW: Model string-based startCall
  async startCallWithModelString(options: CreateAiCallWithModelStringOptions): Promise<AiCall> {
    const aiCall = createMockAiCall({
      id: AiCallService.generateId(),
      document_id: options.documentId || null,
      created_by: options.userId,
      model_string: options.modelString,
      prompt_type: options.prompt_type,
      prompt_input: JSON.stringify(options.input_data || {}),
      extra: (options.extra || {}) as Json,
      status: 'pending'
    })
    
    AiCallService.mockCalls.push(aiCall)
    return aiCall
  }


  // Complete an AI call
  async completeCall(
    id: string,
    data: { 
      output_data?: JsonObject
      usage?: PromptUsage
      finishReason?: string
    }
  ): Promise<AiCall | null> {
    const call = AiCallService.mockCalls.find(c => c.id === id)
    if (!call) return null

    const completed: AiCall = {
      ...call,
      status: 'success',
      completed_at: new Date().toISOString(),
      extra: (data.output_data || {}) as Json,
      prompt_tokens: data.usage?.promptTokens || null,
      completion_tokens: data.usage?.completionTokens || null,
      total_tokens: data.usage?.totalTokens || null,
      reasoning_tokens: data.usage?.reasoningTokens || null,
      finish_reason: data.finishReason || null
    }

    // Update in our mock storage
    const index = AiCallService.mockCalls.findIndex(c => c.id === id)
    AiCallService.mockCalls[index] = completed

    return completed
  }

  // Fail an AI call
  async failCall(
    id: string,
    errorMessage: string,
    errorCode?: string,
    extra?: JsonObject
  ): Promise<AiCall> {
    const call = AiCallService.mockCalls.find(c => c.id === id)
    if (!call) {
      throw new Error(`AI call ${id} not found`)
    }

    const failed: AiCall = {
      ...call,
      status: 'failed',
      error_message: errorMessage,
      error_code: errorCode || null,
      completed_at: new Date().toISOString(),
      extra: (extra || {}) as Json
    }

    // Update in our mock storage
    const index = AiCallService.mockCalls.findIndex(c => c.id === id)
    AiCallService.mockCalls[index] = failed

    return failed
  }

  // Get AI call by ID
  async getById(id: string): Promise<AiCall | null> {
    return AiCallService.mockCalls.find(c => c.id === id) || null
  }

  // List AI calls
  async list(options?: {
    documentId?: string
    aiModelId?: string
    promptType?: PromptType
    status?: CallStatus
    limit?: number
    offset?: number
  }): Promise<AiCall[]> {
    let calls = [...AiCallService.mockCalls]

    if (options?.documentId) {
      calls = calls.filter(c => c.document_id === options.documentId)
    }

    if (options?.status) {
      calls = calls.filter(c => c.status === options.status)
    }

    if (options?.promptType) {
      calls = calls.filter(c => c.prompt_type === options.promptType)
    }

    // Apply pagination
    const offset = options?.offset || 0
    const limit = options?.limit || 10
    calls = calls.slice(offset, offset + limit)

    return calls
  }

  // Get document usage stats
  async getDocumentUsageStats(documentId: string): Promise<{
    totalCalls: number
    totalTokens: number
    totalCost: number
    byPromptType: Record<PromptType, { calls: number; tokens: number }>
  }> {
    const documentCalls = AiCallService.mockCalls.filter(
      c => c.document_id === documentId && c.status === 'success'
    )

    const stats = {
      totalCalls: documentCalls.length,
      totalTokens: 0,
      totalCost: 0,
      byPromptType: {} as Record<PromptType, { calls: number; tokens: number }>
    }

    documentCalls.forEach(call => {
      const tokens = call.total_tokens || 0
      stats.totalTokens += tokens

      const promptType = call.prompt_type as PromptType
      if (!stats.byPromptType[promptType]) {
        stats.byPromptType[promptType] = { calls: 0, tokens: 0 }
      }
      stats.byPromptType[promptType].calls++
      stats.byPromptType[promptType].tokens += tokens
    })

    return stats
  }

  // Get recent calls
  async getRecentCalls(limit: number = 10): Promise<AiCall[]> {
    return AiCallService.mockCalls
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, limit)
  }

  // NEW: Simple create with model string
  async createWithModelString(options: SimpleCreateAiCallWithModelStringOptions): Promise<AiCall> {
    const aiCall = createMockAiCall({
      id: AiCallService.generateId(),
      created_by: options.userId,
      model_string: options.modelString,
      prompt_type: 'chat',
      prompt_input: JSON.stringify(options.requestData || {}),
      status: 'success',
      completed_at: new Date().toISOString(),
      prompt_tokens: options.promptTokens || null,
      completion_tokens: options.completionTokens || null,
      total_tokens: options.totalTokens || null,
      extra: (options.responseData || {}) as Json
    })
    
    AiCallService.mockCalls.push(aiCall)
    return aiCall
  }


  // Extract metrics helper
  extractMetricsFromAiResponse(response: {
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
      reasoningTokens?: number
    }
    experimental_providerMetadata?: {
      latency?: number
    }
    finishTimestamp?: number
    startTimestamp?: number
    finishReason?: string
  }): AiCallMetrics {
    const usage = response.usage || {}
    const latency = response.experimental_providerMetadata?.latency || 
                    (response.finishTimestamp && response.startTimestamp ? 
                      response.finishTimestamp - response.startTimestamp : 0) || 
                    0

    const metrics: AiCallMetrics = {
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      totalTokens: usage.totalTokens || 0,
      latencyMs: latency,
    }
    
    if (usage.reasoningTokens !== undefined) {
      metrics.reasoningTokens = usage.reasoningTokens
    }
    
    return metrics
  }

  // Test helper methods
  static clearMockCalls(): void {
    this.mockCalls = []
    this.nextId = 1
  }

  static getMockCalls(): AiCall[] {
    return [...this.mockCalls]
  }

  static setMockCalls(calls: AiCall[]): void {
    this.mockCalls = [...calls]
  }
}

// Export mock as default and named export for flexibility
export default AiCallService