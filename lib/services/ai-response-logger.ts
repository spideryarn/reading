/**
 * AI Response Logger Service
 * 
 * Standardized service for capturing and logging complete AI API responses
 * to the ai_calls table. Ensures consistent logging of raw responses, latency,
 * and metadata across all prompt types and providers.
 * 
 * @see docs/planning/250706a_comprehensive_ai_response_logging.md
 */

import type { AiCallService } from './database/ai-calls'
import type { PromptUsage } from '@/lib/prompts/types'
import type { JsonObject, JsonValue } from '@/lib/types/json'
import { createRequestLogger } from './logger'
import { safeJsonValue } from '@/lib/utils/safe-json'

/**
 * Complete AI response structure from Vercel AI SDK
 * Based on the generateText and streamText result types
 */
export interface VercelAIResponse {
  // Core response fields
  text: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    reasoningTokens?: number
  }
  finishReason?: string
  
  // Timing information
  startTimestamp?: number
  finishTimestamp?: number
  
  // Provider-specific metadata
  experimental_providerMetadata?: Record<string, unknown>
  
  // Response metadata
  response?: {
    id?: string
    modelId?: string
    headers?: Record<string, string>
    timestamp?: Date
  }
  
  // Tool calls (if applicable)
  toolCalls?: Array<{
    toolCallId: string
    toolName: string
    args: unknown
    result?: unknown
  }>
  
  // Additional fields that might be present
  [key: string]: unknown
}

/**
 * Options for completing an AI call with comprehensive logging
 */
export interface CompleteAICallOptions {
  aiCallId: string
  response: VercelAIResponse
  outputData?: JsonObject
  correlationId?: string
}

/**
 * Result of AI call completion
 */
export interface AICallCompletionResult {
  aiCallId: string
  latencyMs?: number
}

/**
 * AI Response Logger Service
 * 
 * Provides a standardized interface for capturing and logging AI responses
 * with comprehensive metadata, latency tracking, and error handling.
 */
export class AIResponseLogger {
  constructor(
    private aiCallService: AiCallService
  ) {}

  /**
   * Complete an AI call with comprehensive response logging
   * 
   * This method:
   * 1. Serializes the complete raw API response
   * 2. Calculates latency from available sources
   * 3. Extracts usage metadata
   * 4. Handles provider-specific fields
   * 5. Logs everything to the database
   * 
   * @param options - AI call completion options
   * @returns Completion result with success status
   */
  async completeAICall(options: CompleteAICallOptions): Promise<AICallCompletionResult> {
    const { aiCallId, response, outputData, correlationId } = options
    const logger = correlationId 
      ? createRequestLogger('ai-response-logger', correlationId)
      : console

    try {
      // Calculate latency using the priority order from planning doc
      let latencyMs: number | undefined
      
      // Priority 1: SDK timestamps
      if (response.finishTimestamp && response.startTimestamp) {
        latencyMs = response.finishTimestamp - response.startTimestamp
      }
      // Priority 2: Provider metadata latency
      else if (response.experimental_providerMetadata && typeof response.experimental_providerMetadata === 'object') {
        // Check each provider's metadata for latency
        for (const [_key, providerData] of Object.entries(response.experimental_providerMetadata)) {
          if (typeof providerData === 'object' && providerData && 'latency' in providerData) {
            const providerObj = providerData as Record<string, unknown>
            if (typeof providerObj.latency === 'number') {
              latencyMs = providerObj.latency
              break
            }
          }
        }
      }

      // Serialize the complete response for storage
      const rawApiResponse = this.serializeResponse(response)

      // Extract usage data with defaults
      const usage: PromptUsage = {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
        ...(response.usage?.reasoningTokens !== undefined && {
          reasoningTokens: response.usage.reasoningTokens
        })
      }

      // Log response size for monitoring
      const responseSize = JSON.stringify(rawApiResponse).length
      logger.info({
        aiCallId,
        responseSize,
        latencyMs,
        finishReason: response.finishReason,
        hasToolCalls: !!response.toolCalls?.length
      }, 'Logging AI response')

      // Complete the AI call with all data
      const result = await this.aiCallService.completeCall(aiCallId, {
        ...(outputData && { output_data: outputData }),
        usage,
        ...(response.finishReason && { finishReason: response.finishReason }),
        rawApiResponse,
        ...(latencyMs !== undefined && { latencyMs })
      })

      if (!result) {
        throw new Error(`AI call ${aiCallId} not found`)
      }

      return {
        aiCallId,
        ...(latencyMs !== undefined && { latencyMs })
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Calculate response size safely
      let responseSize = 0
      try {
        responseSize = JSON.stringify(response).length
      } catch {
        responseSize = -1 // Indicates serialization failure
      }
      
      const errorDetails = {
        aiCallId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        responseSize
      }
      
      logger.error(errorDetails, 'Failed to complete AI call with response logging')
      
      // Fail fatally with clear error message
      throw new Error(
        `AI response logging failed for call ${aiCallId}: ${errorMessage}. ` +
        `This is a critical error that prevents proper tracking of AI usage and costs. ` +
        `Response size: ${errorDetails.responseSize} bytes`
      )
    }
  }

  /**
   * Serialize the AI response for database storage
   * 
   * Handles provider-specific fields and ensures safe JSON serialization
   * 
   * @param response - Raw AI response
   * @returns Serialized response safe for JSONB storage
   */
  private serializeResponse(response: VercelAIResponse): JsonObject {
    try {
      // Create a clean object for serialization
      const serialized: JsonObject = {
        text: response.text,
        finishReason: response.finishReason || null,
        timestamp: new Date().toISOString()
      }

      // Add usage if present
      if (response.usage) {
        serialized.usage = response.usage as JsonObject
      }

      // Add timing information
      if (response.startTimestamp) {
        serialized.startTimestamp = response.startTimestamp
      }
      if (response.finishTimestamp) {
        serialized.finishTimestamp = response.finishTimestamp
      }

      // Add provider metadata if present
      if (response.experimental_providerMetadata) {
        serialized.experimental_providerMetadata = this.sanitizeProviderMetadata(
          response.experimental_providerMetadata
        )
      }

      // Add response metadata if present
      if (response.response) {
        serialized.response = this.sanitizeResponseMetadata(response.response)
      }

      // Add tool calls if present
      if (response.toolCalls && response.toolCalls.length > 0) {
        serialized.toolCalls = response.toolCalls.map(call => ({
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          args: this.sanitizeValue(call.args),
          ...(call.result !== undefined && { result: this.sanitizeValue(call.result) })
        })) as JsonObject[]
      }

      // Add any other top-level fields that might be useful
      const ignoredFields = new Set([
        'text', 'usage', 'finishReason', 'startTimestamp', 
        'finishTimestamp', 'experimental_providerMetadata', 
        'response', 'toolCalls'
      ])

      for (const [key, value] of Object.entries(response)) {
        if (!ignoredFields.has(key) && value !== undefined) {
          serialized[key] = this.sanitizeValue(value) as JsonValue
        }
      }

      return serialized

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorDetails = {
        responseTextLength: response.text?.length || 0,
        responseKeys: Object.keys(response),
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      }
      
      // Fail fatally with detailed error information
      throw new Error(
        `Failed to serialize AI response: ${errorMessage}. ` +
        `Response contains ${errorDetails.responseKeys.length} keys, ` +
        `text length: ${errorDetails.responseTextLength}. ` +
        `Keys: ${errorDetails.responseKeys.join(', ')}`
      )
    }
  }

  /**
   * Sanitize provider metadata for safe storage
   */
  private sanitizeProviderMetadata(metadata: Record<string, unknown>): JsonObject {
    const sanitized: JsonObject = {}
    
    for (const [provider, data] of Object.entries(metadata)) {
      if (data === null) {
        sanitized[provider] = null
      } else if (typeof data === 'object') {
        sanitized[provider] = this.sanitizeValue(data) as JsonValue
      } else {
        sanitized[provider] = data as JsonValue
      }
    }
    
    return sanitized
  }

  /**
   * Sanitize response metadata for safe storage
   */
  private sanitizeResponseMetadata(response: Record<string, unknown>): JsonObject {
    const sanitized: JsonObject = {}
    
    // Handle common fields
    if (response.id) sanitized.id = String(response.id)
    if (response.modelId) sanitized.modelId = String(response.modelId)
    if (response.timestamp) {
      sanitized.timestamp = response.timestamp instanceof Date 
        ? response.timestamp.toISOString() 
        : String(response.timestamp)
    }
    
    // Handle headers if present
    if (response.headers && typeof response.headers === 'object') {
      sanitized.headers = {}
      for (const [key, value] of Object.entries(response.headers)) {
        sanitized.headers[key] = String(value)
      }
    }
    
    return sanitized
  }

  /**
   * Sanitize a value for JSON storage
   * 
   * Handles circular references, functions, and other non-serializable types
   */
  private sanitizeValue(value: unknown): unknown {
    // Use shared utility that removes circular references by inserting a
    // placeholder string instead of throwing.  This preserves as much of the
    // provider payload as possible while keeping the data JSON-serialisable.
    return safeJsonValue(value, {
      placeholder: '[Circular]',
      onCircular: ({ path, keys }) => {
        // Log a warning so we notice potentially problematic provider payloads
        // We avoid using the structured logger here to keep this util generic –
        // higher-level callers can intercept console warnings if needed.
        console.warn(
          `Circular reference removed during AI response serialisation. ` +
          `Path: ${path.join('.') || '<root>'}. Keys at cycle root: ${keys.join(', ')}`
        )
      }
    })
  }
}

/**
 * Factory function to create an AI response logger instance
 */
export function createAIResponseLogger(aiCallService: AiCallService): AIResponseLogger {
  return new AIResponseLogger(aiCallService)
}