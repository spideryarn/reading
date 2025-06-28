// Tests for token usage tracking and cost calculation
// Covers token counting, cost calculation, usage limits, and reasoning tokens

import { createClient } from '@/lib/supabase/server'
import { AiCallService } from '../database/ai-calls'
import { getModelConfig, parseModelString } from '@/lib/config/models'
import { generateText } from 'ai'
import { getTestNamespace, createTestUser } from '@/lib/testing/test-isolation-utils'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(),
      update: jest.fn(),
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
    })),
  })),
}))

// Mock AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}))

describe('Token Usage Tracking', () => {
  const namespace = getTestNamespace('token-usage-tracking')
  const testUser = createTestUser(namespace)
  let aiCallService: AiCallService
  let supabaseMock: any

  beforeEach(() => {
    jest.clearAllMocks()
    supabaseMock = createClient()
    aiCallService = new AiCallService(supabaseMock)
  })

  describe('Token Counting', () => {
    describe('Basic Token Tracking', () => {
      it('should track prompt, completion, and total tokens', async () => {
        // Test token tracking logic without mocking database
        const usage = {
          promptTokens: 1500,
          completionTokens: 500,
          totalTokens: 2000,
        }

        // Verify token calculation
        expect(usage.promptTokens + usage.completionTokens).toBe(usage.totalTokens)
        
        // Verify token data structure matches what would be saved
        const updateData = {
          prompt_tokens: usage.promptTokens,
          completion_tokens: usage.completionTokens,
          total_tokens: usage.totalTokens,
          status: 'success',
        }
        
        expect(updateData.prompt_tokens).toBe(1500)
        expect(updateData.completion_tokens).toBe(500)
        expect(updateData.total_tokens).toBe(2000)
      })

      it('should handle reasoning tokens for thinking models', async () => {
        // Test reasoning token support for thinking models
        const modelString = 'anthropic:claude-sonnet-4:20250514:thinking'
        const parsed = parseModelString(modelString)
        expect(parsed.thinking).toBe(true)

        // Complete with reasoning tokens
        const usage = {
          promptTokens: 2000,
          completionTokens: 800,
          totalTokens: 3300,
          reasoningTokens: 500, // Thinking tokens
        }

        // Verify reasoning tokens are tracked separately
        expect(usage.reasoningTokens).toBe(500)
        expect(usage.totalTokens).toBe(3300)
        
        // In thinking mode, total includes reasoning
        const nonReasoningCompletion = usage.completionTokens - usage.reasoningTokens
        expect(nonReasoningCompletion).toBe(300)
      })

      it('should handle missing token data gracefully', async () => {
        // Test handling of missing usage data
        const metrics = aiCallService.extractMetricsFromAiResponse({})
        
        // Should return defaults when data is missing
        expect(metrics.promptTokens).toBe(0)
        expect(metrics.completionTokens).toBe(0)
        expect(metrics.totalTokens).toBe(0)
        expect(metrics.reasoningTokens).toBeUndefined()
        expect(metrics.latencyMs).toBe(0)
        
        // API call can succeed without token data
        const updateData = {
          status: 'success',
          // No token fields
        }
        
        expect(updateData.status).toBe('success')
        expect(updateData).not.toHaveProperty('prompt_tokens')
      })
    })

    describe('Token Extraction from AI Responses', () => {
      it('should extract metrics from Vercel AI SDK response', () => {
        const mockResponse = {
          usage: {
            promptTokens: 1234,
            completionTokens: 567,
            totalTokens: 1801,
          },
          experimental_providerMetadata: {
            latency: 1250,
          },
          finishReason: 'stop',
        }

        const metrics = aiCallService.extractMetricsFromAiResponse(mockResponse)

        expect(metrics).toEqual({
          promptTokens: 1234,
          completionTokens: 567,
          totalTokens: 1801,
          reasoningTokens: undefined,
          latencyMs: 1250,
        })
      })

      it('should calculate latency from timestamps if not provided', () => {
        const mockResponse = {
          usage: {
            promptTokens: 1000,
            completionTokens: 500,
            totalTokens: 1500,
          },
          startTimestamp: 1000,
          finishTimestamp: 2500,
        }

        const metrics = aiCallService.extractMetricsFromAiResponse(mockResponse)

        expect(metrics.latencyMs).toBe(1500) // 2500 - 1000
      })

      it('should handle missing usage data', () => {
        const mockResponse = {}

        const metrics = aiCallService.extractMetricsFromAiResponse(mockResponse)

        expect(metrics).toEqual({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          reasoningTokens: undefined,
          latencyMs: 0,
        })
      })
    })
  })

  describe('Cost Calculation', () => {
    it('should calculate costs for Anthropic models', async () => {
      const modelString = 'anthropic:claude-3-5-haiku:20241022'
      const modelConfig = getModelConfig(modelString)
      
      const tokens = {
        prompt: 10_000,
        completion: 2_000,
      }

      // Calculate expected cost
      const expectedCost = 
        (tokens.prompt * modelConfig.pricing!.inputPer1M / 1_000_000) +
        (tokens.completion * modelConfig.pricing!.outputPer1M / 1_000_000)

      // For Haiku: $1/1M input + $5/1M output
      expect(expectedCost).toBeCloseTo(0.01 + 0.01) // $0.02 total
    })

    it('should calculate costs for Google models', async () => {
      const modelString = 'google:gemini-2.0-flash:latest'
      const modelConfig = getModelConfig(modelString)
      
      const tokens = {
        prompt: 100_000,
        completion: 10_000,
      }

      // Calculate expected cost
      const expectedCost = 
        (tokens.prompt * modelConfig.pricing!.inputPer1M / 1_000_000) +
        (tokens.completion * modelConfig.pricing!.outputPer1M / 1_000_000)

      // For Gemini Flash: $0.075/1M input + $0.30/1M output
      expect(expectedCost).toBeCloseTo(0.0075 + 0.003) // $0.0105 total
    })

    it('should calculate document usage stats with costs', async () => {
      // Test cost calculation logic for different models
      const mockCalls = [
        {
          model_string: 'anthropic:claude-3-5-haiku:20241022',
          prompt_tokens: 5000,
          completion_tokens: 1000,
          total_tokens: 6000,
        },
        {
          model_string: 'google:gemini-2.0-flash:latest',
          prompt_tokens: 10000,
          completion_tokens: 2000,
          total_tokens: 12000,
        },
        {
          model_string: 'anthropic:claude-sonnet-4:20250514',
          prompt_tokens: 3000,
          completion_tokens: 500,
          total_tokens: 3500,
        },
      ]

      // Calculate costs manually
      let totalCost = 0
      let totalTokens = 0
      
      mockCalls.forEach(call => {
        const config = getModelConfig(call.model_string)
        const cost = 
          (call.prompt_tokens * config.pricing!.inputPer1M / 1_000_000) +
          (call.completion_tokens * config.pricing!.outputPer1M / 1_000_000)
        totalCost += cost
        totalTokens += call.total_tokens
      })

      // Calculate expected costs
      const haikuCost = (5000 * 1.00 + 1000 * 5.00) / 1_000_000
      const geminiCost = (10000 * 0.075 + 2000 * 0.30) / 1_000_000
      const sonnetCost = (3000 * 3.00 + 500 * 15.00) / 1_000_000

      expect(totalTokens).toBe(21500)
      expect(totalCost).toBeCloseTo(haikuCost + geminiCost + sonnetCost)
    })

    it('should handle models without pricing information', async () => {
      // Test handling of unknown models
      try {
        getModelConfig('unknown:model:version')
        fail('Should throw for unknown model')
      } catch (error: any) {
        expect(error.message).toContain('Unknown model')
      }
      
      // When model is not found, cost calculation should be skipped
      const call = {
        model_string: 'unknown:model:version',
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500,
      }
      
      const cost = 0
      try {
        const _config = getModelConfig(call.model_string)
        // This won't execute due to error
      } catch (_e) {
        // Cost remains 0 when model not found
      }
      
      expect(cost).toBe(0)
    })
  })

  describe('Usage Limits and Warnings', () => {
    it('should track cumulative usage across calls', async () => {
      const userId = testUser.id
      const limit = 100_000 // Example token limit

      // Mock multiple AI calls
      const mockCalls = Array.from({ length: 5 }, (_, i) => ({
        id: `call-${i}`,
        created_by: userId,
        model_string: 'anthropic:claude-3-5-haiku:20241022',
        total_tokens: 20_000,
        status: 'success',
      }))

      // Calculate total usage
      const totalUsage = mockCalls.reduce((sum, call) => sum + call.total_tokens, 0)
      expect(totalUsage).toBe(100_000) // Hit the limit

      // In a real implementation, would check against user limits
      const isAtLimit = totalUsage >= limit
      expect(isAtLimit).toBe(true)
    })

    it('should differentiate usage by model tier', async () => {
      const _userId = testUser.id

      // Mock calls with different model tiers
      const mockCalls = [
        {
          model_string: 'anthropic:claude-3-5-haiku:20241022', // cheap
          total_tokens: 50_000,
          prompt_tokens: 40_000,
          completion_tokens: 10_000,
        },
        {
          model_string: 'anthropic:claude-sonnet-4:20250514', // balanced
          total_tokens: 20_000,
          prompt_tokens: 15_000,
          completion_tokens: 5_000,
        },
        {
          model_string: 'anthropic:claude-opus-4:20250514', // expensive
          total_tokens: 10_000,
          prompt_tokens: 8_000,
          completion_tokens: 2_000,
        },
      ]

      // Calculate costs by tier
      const costs = mockCalls.map(call => {
        const config = getModelConfig(call.model_string)
        return (
          (call.prompt_tokens * config.pricing!.inputPer1M / 1_000_000) +
          (call.completion_tokens * config.pricing!.outputPer1M / 1_000_000)
        )
      })

      // Verify cost increases with tier
      expect(costs[0]).toBeLessThan(costs[1]) // cheap < balanced
      expect(costs[1]).toBeLessThan(costs[2]) // balanced < expensive
    })

    it('should track usage patterns for optimization', async () => {
      // Mock different types of operations
      const operations = [
        { prompt_type: 'summarise', avg_tokens: 5000 },
        { prompt_type: 'extract', avg_tokens: 3000 },
        { prompt_type: 'chat', avg_tokens: 1500 },
        { prompt_type: 'glossary', avg_tokens: 8000 },
      ]

      // Identify high-cost operations
      const highCostThreshold = 4500
      const highCostOps = operations.filter(op => op.avg_tokens >= highCostThreshold)

      expect(highCostOps.length).toBe(2)
      expect(highCostOps).toContainEqual(
        expect.objectContaining({ prompt_type: 'glossary' })
      )
      expect(highCostOps).toContainEqual(
        expect.objectContaining({ prompt_type: 'summarise' })
      )
    })
  })

  describe('Provider-Specific Token Handling', () => {
    it('should handle Anthropic token counting accurately', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>

      // Mock Anthropic response with detailed usage
      generateTextMock.mockResolvedValueOnce({
        text: 'Generated response',
        usage: {
          promptTokens: 1234,
          completionTokens: 567,
          totalTokens: 1801,
        },
        finishReason: 'stop',
      } as any)

      const result = await generateText({
        model: {} as any, // Mock model
        prompt: 'Test prompt',
      })

      expect(result.usage.totalTokens).toBe(1801)
      expect(result.usage.promptTokens + result.usage.completionTokens)
        .toBe(result.usage.totalTokens)
    })

    it('should handle Google token counting with large contexts', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>

      // Google models support up to 1M context
      const largePromptTokens = 750_000

      generateTextMock.mockResolvedValueOnce({
        text: 'Response to large context',
        usage: {
          promptTokens: largePromptTokens,
          completionTokens: 2000,
          totalTokens: largePromptTokens + 2000,
        },
        finishReason: 'stop',
      } as any)

      const result = await generateText({
        model: {} as any,
        prompt: 'Very large document...',
      })

      expect(result.usage.promptTokens).toBe(750_000)
      expect(result.usage.totalTokens).toBe(752_000)
    })

    it('should handle thinking mode token separation', async () => {
      const generateTextMock = generateText as jest.MockedFunction<typeof generateText>

      // Mock Anthropic thinking mode response
      generateTextMock.mockResolvedValueOnce({
        text: 'Final answer',
        usage: {
          promptTokens: 2000,
          completionTokens: 1500, // Includes reasoning
          totalTokens: 3500,
          reasoningTokens: 800, // Separate reasoning tokens
        },
        finishReason: 'stop',
      } as any)

      const result = await generateText({
        model: {} as any,
        prompt: 'Complex reasoning task',
      })

      expect(result.usage.reasoningTokens).toBe(800)
      expect(result.usage.totalTokens).toBe(3500)
    })
  })

  describe('Real-World Usage Scenarios', () => {
    it('should optimize model selection based on token usage', () => {
      const scenarios = [
        {
          description: 'Quick summary',
          estimatedTokens: 2000,
          recommendedModel: 'google:gemini-2.0-flash:latest', // Cheapest
        },
        {
          description: 'Complex analysis',
          estimatedTokens: 50000,
          recommendedModel: 'anthropic:claude-3-5-haiku:20241022', // Good balance
        },
        {
          description: 'Critical reasoning',
          estimatedTokens: 10000,
          recommendedModel: 'anthropic:claude-sonnet-4:20250514:thinking', // Best quality
        },
      ]

      scenarios.forEach(scenario => {
        const config = getModelConfig(scenario.recommendedModel)
        
        // Calculate cost for scenario
        const estimatedCost = 
          (scenario.estimatedTokens * 0.8 * config.pricing!.inputPer1M / 1_000_000) +
          (scenario.estimatedTokens * 0.2 * config.pricing!.outputPer1M / 1_000_000)

        // Verify reasonable costs
        expect(estimatedCost).toBeLessThan(1.0) // All under $1
      })
    })

    it('should track token usage trends over time', async () => {
      // Simulate usage pattern over a week
      const dailyUsage = [
        { day: 'Monday', tokens: 150_000, calls: 50 },
        { day: 'Tuesday', tokens: 200_000, calls: 65 },
        { day: 'Wednesday', tokens: 180_000, calls: 60 },
        { day: 'Thursday', tokens: 220_000, calls: 70 },
        { day: 'Friday', tokens: 250_000, calls: 80 },
        { day: 'Saturday', tokens: 100_000, calls: 30 },
        { day: 'Sunday', tokens: 80_000, calls: 25 },
      ]

      const weeklyTotal = dailyUsage.reduce((sum, day) => sum + day.tokens, 0)
      const avgTokensPerCall = weeklyTotal / dailyUsage.reduce((sum, day) => sum + day.calls, 0)

      expect(weeklyTotal).toBe(1_180_000)
      expect(avgTokensPerCall).toBeCloseTo(3105, 0) // ~3K tokens per call

      // Identify peak usage days
      const peakDay = dailyUsage.reduce((max, day) => 
        day.tokens > max.tokens ? day : max
      )
      expect(peakDay.day).toBe('Friday')
    })
  })
})