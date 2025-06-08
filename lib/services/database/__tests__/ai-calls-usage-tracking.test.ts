/**
 * AiCallService Usage Tracking Tests
 * 
 * Tests to verify that the enhanced usage tracking functionality in AiCallService
 * properly stores and handles usage metadata from LLM calls, including prompt tokens,
 * completion tokens, reasoning tokens, and finish reasons.
 */

import { AiCallService } from '../ai-calls'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, AiCall } from '@/lib/types/database'
import type { PromptUsage } from '@/lib/prompts/types'

// Mock Supabase client for unit tests
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

    const mockAiCallResponse: AiCall = {
      id: testCallId,
      document_id: 'doc-123',
      model_id: 'model-uuid',
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

    it('should store complete usage metadata successfully', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: mockAiCallResponse,
        error: null
      })

      const result = await aiCallService.completeCall(testCallId, {
        output_data: { text_length: 500 },
        usage: mockUsage,
        finishReason: 'stop'
      })

      expect(result).toEqual(mockAiCallResponse)
      
      // Verify the update call was made with correct usage data
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
      
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', testCallId)
    })

    it('should handle usage metadata without reasoning tokens', async () => {
      const usageWithoutReasoning: PromptUsage = {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250
        // No reasoningTokens
      }

      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: { ...mockAiCallResponse, reasoning_tokens: null },
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

    it('should handle calls without usage metadata (backward compatibility)', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: {
          ...mockAiCallResponse,
          prompt_tokens: null,
          completion_tokens: null,
          total_tokens: null,
          reasoning_tokens: null,
          finish_reason: null
        },
        error: null
      })

      await aiCallService.completeCall(testCallId, {
        output_data: { result: 'success' }
        // No usage or finishReason provided
      })

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'success',
        completed_at: expect.any(String),
        extra: { result: 'success' }
        // No usage fields should be included
      })
    })

    it('should handle calls with only finishReason (no usage)', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: { ...mockAiCallResponse, finish_reason: 'content_filter' },
        error: null
      })

      await aiCallService.completeCall(testCallId, {
        finishReason: 'content_filter'
      })

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'success',
        completed_at: expect.any(String),
        extra: {},
        finish_reason: 'content_filter'
      })
    })

    it('should handle calls with only usage (no finishReason)', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: mockAiCallResponse,
        error: null
      })

      await aiCallService.completeCall(testCallId, {
        usage: mockUsage
      })

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'success',
        completed_at: expect.any(String),
        extra: {},
        prompt_tokens: 150,
        completion_tokens: 200,
        total_tokens: 350,
        reasoning_tokens: 25
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

    it('should throw error for other database errors', async () => {
      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Connection timeout' }
      })

      await expect(aiCallService.completeCall(testCallId, {
        usage: mockUsage
      })).rejects.toThrow('Failed to complete AI call: Connection timeout')
    })

    it('should handle zero values in usage metadata', async () => {
      const zeroUsage: PromptUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        reasoningTokens: 0
      }

      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: {
          ...mockAiCallResponse,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          reasoning_tokens: 0
        },
        error: null
      })

      await aiCallService.completeCall(testCallId, {
        usage: zeroUsage,
        finishReason: 'stop'
      })

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'success',
        completed_at: expect.any(String),
        extra: {},
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        reasoning_tokens: 0,
        finish_reason: 'stop'
      })
    })

    it('should store complex output data alongside usage', async () => {
      const complexOutputData = {
        text_length: 1500,
        processing_notes: 'Summary generation completed successfully',
        model_performance: {
          latency_ms: 2500,
          quality_score: 0.95
        },
        metadata: {
          granularity: 'detailed',
          section_count: 5
        }
      }

      mockSupabaseClient.single = jest.fn().mockResolvedValue({
        data: { ...mockAiCallResponse, extra: complexOutputData },
        error: null
      })

      await aiCallService.completeCall(testCallId, {
        output_data: complexOutputData,
        usage: mockUsage,
        finishReason: 'stop'
      })

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'success',
        completed_at: expect.any(String),
        extra: complexOutputData,
        prompt_tokens: 150,
        completion_tokens: 200,
        total_tokens: 350,
        reasoning_tokens: 25,
        finish_reason: 'stop'
      })
    })

    it('should handle various finish reasons correctly', async () => {
      const finishReasons = ['stop', 'length', 'content_filter', 'function_call', 'tool_calls']

      for (const finishReason of finishReasons) {
        jest.clearAllMocks()
        
        mockSupabaseClient.single = jest.fn().mockResolvedValue({
          data: { ...mockAiCallResponse, finish_reason: finishReason },
          error: null
        })

        await aiCallService.completeCall(testCallId, {
          usage: mockUsage,
          finishReason: finishReason
        })

        expect(mockSupabaseClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            finish_reason: finishReason
          })
        )
      }
    })
  })

  describe('startCall integration with completeCall', () => {
    it('should work with the full start->complete flow', async () => {
      const mockModelUuid = 'model-uuid-123'
      const documentId = 'doc-456'
      
      const integrationCallId = '987e6543-e89b-12d3-a456-426614174000'
      
      const integrationMockAiCallResponse: AiCall = {
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
      
      // Mock model lookup
      mockSupabaseClient.single = jest.fn()
        .mockResolvedValueOnce({
          data: { id: mockModelUuid },
          error: null
        })
        .mockResolvedValueOnce({
          data: { ...integrationMockAiCallResponse, status: 'pending' },
          error: null
        })
        .mockResolvedValueOnce({
          data: integrationMockAiCallResponse,
          error: null
        })

      // Mock startCall insert
      mockSupabaseClient.insert = jest.fn(() => mockSupabaseClient)

      // Start the call
      const startedCall = await aiCallService.startCall({
        documentId,
        provider: 'anthropic',
        modelId: 'claude-3-haiku',
        prompt_type: 'summarise',
        input_data: { content_length: 1000 }
      })

      // Complete the call with usage
      const integrationMockUsage: PromptUsage = {
        promptTokens: 150,
        completionTokens: 200,
        totalTokens: 350,
        reasoningTokens: 25
      }
      
      const completedCall = await aiCallService.completeCall(startedCall.id, {
        output_data: { text_length: 500 },
        usage: integrationMockUsage,
        finishReason: 'stop'
      })

      expect(completedCall).toEqual(integrationMockAiCallResponse)
      expect(completedCall?.status).toBe('success')
      expect(completedCall?.prompt_tokens).toBe(150)
      expect(completedCall?.completion_tokens).toBe(200)
      expect(completedCall?.total_tokens).toBe(350)
      expect(completedCall?.reasoning_tokens).toBe(25)
      expect(completedCall?.finish_reason).toBe('stop')
    })
  })

  describe('getDocumentUsageStats with enhanced usage data', () => {
    const testDocumentId = '123e4567-e89b-12d3-a456-426614174000'

    it('should include reasoning tokens in cost calculation when available', async () => {
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
      // Cost calculation: (1000 * 0.000001) + (500 * 0.000002) = 0.001 + 0.001 = 0.002
      // Note: Reasoning tokens are typically included in completion tokens for billing
      expect(result.totalCost).toBe(0.002)
    })

    it('should handle missing reasoning tokens gracefully in stats', async () => {
      const mockAiCallsWithoutReasoning = [
        {
          id: 'call-1',
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
          reasoning_tokens: null,
          prompt_type: 'summarise',
          ai_models: {
            input_token_cost: 0.000001,
            output_token_cost: 0.000002,
          }
        }
      ]

      mockSupabaseClient.eq = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: mockAiCallsWithoutReasoning,
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