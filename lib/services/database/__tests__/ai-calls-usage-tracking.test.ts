/**
 * AiCallService Usage Tracking Tests
 * 
 * Tests enhanced usage tracking functionality for LLM calls
 */

import { AiCallService } from '../ai-calls'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, AiCall } from '@/lib/types/database'
import type { PromptUsage } from '@/lib/prompts/types'

const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
} as unknown as SupabaseClient<Database>

describe('AiCallService - Usage Tracking', () => {
  let aiCallService: AiCallService

  beforeEach(() => {
    jest.clearAllMocks()
    aiCallService = new AiCallService(mockSupabaseClient)
  })

  describe('completeCall with usage metadata', () => {
    const testCallId = '123e4567-e89b-12d3-a456-426614174000'
    const mockUsage: PromptUsage = {
      promptTokens: 150,
      completionTokens: 200,
      totalTokens: 350,
      reasoningTokens: 25
    }

    const createMockResponse = (overrides = {}): AiCall => ({
      id: testCallId,
      document_id: 'doc-123',
      model_string: 'anthropic:claude-3-5-haiku:20241022',
      prompt_type: 'summarise',
      prompt_input: '{}',
      prompt_template: null,
      status: 'success',
      created_at: '2025-06-08T10:00:00Z',
      updated_at: '2025-06-08T10:01:00Z',
      completed_at: '2025-06-08T10:01:00Z',
      prompt_tokens: 150,
      completion_tokens: 200,
      total_tokens: 350,
      reasoning_tokens: 25,
      finish_reason: 'stop',
      error_message: null,
      error_code: null,
      extra: {},
      created_by: null,
      latency_ms: null,
      extra_usage: null,
      response_text: null,
      ...overrides
    })

    it('should store complete usage metadata successfully', async () => {
      const mockResponse = createMockResponse()
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: mockResponse,
        error: null
      })

      const result = await aiCallService.completeCall(testCallId, {
        output_data: { text_length: 500 },
        usage: mockUsage,
        finishReason: 'stop'
      })

      expect(result).toEqual(mockResponse)
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'success',
        completed_at: expect.any(String),
        extra: { text_length: 500 },
        prompt_tokens: 150,
        completion_tokens: 200,
        total_tokens: 350,
        reasoning_tokens: 25,
        finish_reason: 'stop'
      })
    })

    it('should handle usage metadata without reasoning tokens', async () => {
      const usageWithoutReasoning: PromptUsage = {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250
        // No reasoningTokens
      }

      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: createMockResponse({ reasoning_tokens: null }),
        error: null
      })

      await aiCallService.completeCall(testCallId, {
        usage: usageWithoutReasoning,
        finishReason: 'length'
      })

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'success',
        completed_at: expect.any(String),
        extra: {},
        prompt_tokens: 100,
        completion_tokens: 150,
        total_tokens: 250,
        finish_reason: 'length'
        // reasoning_tokens should not be included if undefined
      })
    })

    it('should handle calls without usage metadata', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: createMockResponse({
          prompt_tokens: null,
          completion_tokens: null,
          total_tokens: null,
          reasoning_tokens: null,
          finish_reason: null
        }),
        error: null
      })

      await aiCallService.completeCall(testCallId, {
        output_data: { result: 'success' }
      })

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'success',
        completed_at: expect.any(String),
        extra: { result: 'success' }
      })
    })

    it('should reject invalid UUID format', async () => {
      const invalidId = 'invalid-uuid'

      await expect(aiCallService.completeCall(invalidId, {
        usage: mockUsage
      })).rejects.toThrow('Invalid UUID format: invalid-uuid')

      // Should not make any database calls
      expect(mockSupabaseClient.update).not.toHaveBeenCalled()
    })

    it('should return null when AI call not found', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      })

      const result = await aiCallService.completeCall(testCallId, {
        usage: mockUsage
      })

      expect(result).toBeNull()
    })



  })

  describe('startCall integration with completeCall', () => {
    it('should work with the full start->complete flow', async () => {
      const mockModelUuid = 'model-uuid-123'
      const documentId = 'doc-456'
      const integrationCallId = '987e6543-e89b-12d3-a456-426614174000'
      
      const mockResponse: AiCall = {
        id: integrationCallId,
        document_id: documentId,
        model_id: mockModelUuid,
        prompt_type: 'summarise',
        prompt_input: '{}',
        prompt_template: null,
        status: 'success',
        created_at: '2025-06-08T10:00:00Z',
        updated_at: '2025-06-08T10:01:00Z',
        completed_at: '2025-06-08T10:01:00Z',
        prompt_tokens: 150,
        completion_tokens: 200,
        total_tokens: 350,
        reasoning_tokens: 25,
        finish_reason: 'stop',
        error_message: null,
        error_code: null,
        extra: {}
      }
      
      // Mock calls
      mockSupabaseClient.single = jest.fn()
        .mockResolvedValueOnce({ data: { id: mockModelUuid }, error: null })
        .mockResolvedValueOnce({ data: { ...mockResponse, status: 'pending' }, error: null })
        .mockResolvedValueOnce({ data: mockResponse, error: null })

      mockSupabaseClient.insert = jest.fn(() => mockSupabaseClient)

      const startedCall = await aiCallService.startCall({
        documentId,
        provider: 'anthropic',
        modelId: 'claude-3-haiku',
        prompt_type: 'summarise',
        input_data: { content_length: 1000 }
      })

      const completedCall = await aiCallService.completeCall(startedCall.id, {
        output_data: { text_length: 500 },
        usage: { promptTokens: 150, completionTokens: 200, totalTokens: 350, reasoningTokens: 25 },
        finishReason: 'stop'
      })

      expect(completedCall?.status).toBe('success')
      expect(completedCall?.total_tokens).toBe(350)
    })
  })

  describe('getDocumentUsageStats with enhanced usage data', () => {
    const testDocumentId = '123e4567-e89b-12d3-a456-426614174000'

    it('should calculate cost correctly with reasoning tokens', async () => {
      const mockAiCallsWithReasoning = [
        {
          id: 'call-1',
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
          reasoning_tokens: 200,
          prompt_type: 'chat',
          ai_models: {
            input_token_cost: 0.000001,
            output_token_cost: 0.000002,
          }
        }
      ]

      mockSupabaseClient.eq = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: mockAiCallsWithReasoning,
          error: null
        })
      }))

      const result = await aiCallService.getDocumentUsageStats(testDocumentId)

      expect(result.totalCalls).toBe(1)
      expect(result.totalTokens).toBe(1500)
      expect(result.totalCost).toBe(0.002)
    })

  })
})