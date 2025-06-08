/**
 * AiCallService Cost Calculation Tests
 * 
 * Tests to verify that the cost calculation fix in getDocumentUsageStats
 * is working correctly. The issue was referencing non-existent column names
 * `input_cost_per_1k` and `output_cost_per_1k` instead of the actual
 * database column names `input_token_cost` and `output_token_cost`.
 */

import { AiCallService } from '../ai-calls'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// Mock Supabase client for unit tests
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
} as unknown as SupabaseClient<Database>

describe('AiCallService - Cost Calculation', () => {
  let aiCallService: AiCallService

  beforeEach(() => {
    jest.clearAllMocks()
    aiCallService = new AiCallService(mockSupabaseClient)
  })

  describe('getDocumentUsageStats', () => {
    const testDocumentId = '123e4567-e89b-12d3-a456-426614174000'

    it('should calculate costs correctly when ai_models have pricing data', async () => {
      // Mock successful AI calls with pricing data
      const mockAiCallsWithPricing = [
        {
          id: 'call-1',
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
          prompt_type: 'chat',
          ai_models: {
            input_token_cost: 0.000001,  // $0.001 per 1k tokens
            output_token_cost: 0.000002, // $0.002 per 1k tokens
          }
        },
        {
          id: 'call-2',
          prompt_tokens: 2000,
          completion_tokens: 800,
          total_tokens: 2800,
          prompt_type: 'summarise',
          ai_models: {
            input_token_cost: 0.000001,
            output_token_cost: 0.000002,
          }
        }
      ]

      mockSupabaseClient.eq = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: mockAiCallsWithPricing,
          error: null
        })
      }))

      const result = await aiCallService.getDocumentUsageStats(testDocumentId)

      // Verify basic stats
      expect(result.totalCalls).toBe(2)
      expect(result.totalTokens).toBe(4300) // 1500 + 2800

      // Verify cost calculation
      // Call 1: (1000 * 0.000001) + (500 * 0.000002) = 0.001 + 0.001 = 0.002
      // Call 2: (2000 * 0.000001) + (800 * 0.000002) = 0.002 + 0.0016 = 0.0036
      // Total: 0.002 + 0.0036 = 0.0056
      expect(result.totalCost).toBe(0.0056)

      // Verify breakdown by prompt type
      expect(result.byPromptType).toEqual({
        chat: { calls: 1, tokens: 1500 },
        summarise: { calls: 1, tokens: 2800 }
      })

      // Verify the correct Supabase calls were made
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_calls')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*, ai_models(*)')
    })

    it('should not break when ai_models have null pricing data', async () => {
      // Mock AI calls with models that have no pricing data
      const mockAiCallsWithoutPricing = [
        {
          id: 'call-1',
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
          prompt_type: 'chat',
          ai_models: {
            input_token_cost: null,
            output_token_cost: null,
          }
        },
        {
          id: 'call-2',
          prompt_tokens: 2000,
          completion_tokens: 800,
          total_tokens: 2800,
          prompt_type: 'glossary',
          ai_models: {
            input_token_cost: null,
            output_token_cost: null,
          }
        }
      ]

      mockSupabaseClient.eq = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: mockAiCallsWithoutPricing,
          error: null
        })
      }))

      const result = await aiCallService.getDocumentUsageStats(testDocumentId)

      // Should still work with zero cost
      expect(result.totalCalls).toBe(2)
      expect(result.totalTokens).toBe(4300) // 1500 + 2800
      expect(result.totalCost).toBe(0) // No pricing data available

      expect(result.byPromptType).toEqual({
        chat: { calls: 1, tokens: 1500 },
        glossary: { calls: 1, tokens: 2800 }
      })
    })

    it('should handle mixed pricing scenarios (some models with pricing, some without)', async () => {
      // Mix of calls with and without pricing
      const mockMixedAiCalls = [
        {
          id: 'call-1',
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
          prompt_type: 'chat',
          ai_models: {
            input_token_cost: 0.000001,
            output_token_cost: 0.000002,
          }
        },
        {
          id: 'call-2',
          prompt_tokens: 2000,
          completion_tokens: 800,
          total_tokens: 2800,
          prompt_type: 'headings',
          ai_models: {
            input_token_cost: null, // No pricing
            output_token_cost: null,
          }
        }
      ]

      mockSupabaseClient.eq = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: mockMixedAiCalls,
          error: null
        })
      }))

      const result = await aiCallService.getDocumentUsageStats(testDocumentId)

      expect(result.totalCalls).toBe(2)
      expect(result.totalTokens).toBe(4300)
      // Only the first call contributes to cost: (1000 * 0.000001) + (500 * 0.000002) = 0.002
      expect(result.totalCost).toBe(0.002)
    })

    it('should handle calls with missing token counts gracefully', async () => {
      const mockCallsWithMissingTokens = [
        {
          id: 'call-1',
          prompt_tokens: null, // Missing
          completion_tokens: null, // Missing
          total_tokens: 1500,
          prompt_type: 'chat',
          ai_models: {
            input_token_cost: 0.000001,
            output_token_cost: 0.000002,
          }
        },
        {
          id: 'call-2',
          prompt_tokens: 2000,
          completion_tokens: 800,
          total_tokens: 2800,
          prompt_type: 'summarise',
          ai_models: {
            input_token_cost: 0.000001,
            output_token_cost: 0.000002,
          }
        }
      ]

      mockSupabaseClient.eq = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: mockCallsWithMissingTokens,
          error: null
        })
      }))

      const result = await aiCallService.getDocumentUsageStats(testDocumentId)

      expect(result.totalCalls).toBe(2)
      expect(result.totalTokens).toBe(4300) // 1500 + 2800
      // Only second call contributes to cost since first has missing prompt/completion tokens
      expect(result.totalCost).toBe(0.0036) // (2000 * 0.000001) + (800 * 0.000002)
    })

    it('should return zero stats when no successful calls exist', async () => {
      mockSupabaseClient.eq = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }))

      const result = await aiCallService.getDocumentUsageStats(testDocumentId)

      expect(result.totalCalls).toBe(0)
      expect(result.totalTokens).toBe(0)
      expect(result.totalCost).toBe(0)
      expect(result.byPromptType).toEqual({})
    })

    it('should handle null data response gracefully', async () => {
      mockSupabaseClient.eq = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))

      const result = await aiCallService.getDocumentUsageStats(testDocumentId)

      expect(result.totalCalls).toBe(0)
      expect(result.totalTokens).toBe(0)
      expect(result.totalCost).toBe(0)
      expect(result.byPromptType).toEqual({})
    })

    it('should throw error when database query fails', async () => {
      mockSupabaseClient.eq = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error' }
        })
      }))

      await expect(aiCallService.getDocumentUsageStats(testDocumentId))
        .rejects.toThrow('Failed to fetch usage stats: Database connection error')
    })

    it('should verify correct database query structure', async () => {
      // Create a mock chain that tracks all eq calls
      const eqMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
      
      mockSupabaseClient.eq = eqMock

      await aiCallService.getDocumentUsageStats(testDocumentId)

      // Verify the query is structured correctly
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_calls')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*, ai_models(*)')
      
      // The first eq call should be for document_id, and the returned object's eq should be called for status
      expect(eqMock).toHaveBeenCalledWith('document_id', testDocumentId)
      expect(eqMock.mock.results[0].value.eq).toHaveBeenCalledWith('status', 'success')
    })
  })
})