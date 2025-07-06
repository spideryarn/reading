/**
 * Tests for AI Response Logger Service
 * 
 * Verifies that the logger correctly captures and serializes responses
 * from all supported providers (Anthropic, Google, OpenAI) and handles
 * edge cases like large responses, special characters, and errors.
 */

import { AIResponseLogger, createAIResponseLogger } from '../ai-response-logger'
import { AiCallService } from '../database/ai-calls'
import type { VercelAIResponse } from '../ai-response-logger'

// Mock the AiCallService
jest.mock('../database/ai-calls')

describe('AIResponseLogger', () => {
  let logger: AIResponseLogger
  let mockAiCallService: jest.Mocked<AiCallService>

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock AiCallService
    mockAiCallService = {
      completeCall: jest.fn().mockResolvedValue({
        id: 'test-ai-call-id',
        status: 'success'
      })
    } as unknown as jest.Mocked<AiCallService>
    
    // Create logger instance
    logger = createAIResponseLogger(mockAiCallService)
  })

  describe('completeAICall', () => {
    it('should capture complete response with all metadata', async () => {
      const mockResponse: VercelAIResponse = {
        text: 'Test response from AI',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          reasoningTokens: 10
        },
        finishReason: 'stop',
        startTimestamp: 1000,
        finishTimestamp: 2500,
        experimental_providerMetadata: {
          anthropic: {
            id: 'msg_123',
            modelId: 'claude-3-5-haiku',
            latency: 1500
          }
        },
        response: {
          id: 'resp_123',
          headers: {
            'x-request-id': 'req_123'
          }
        }
      }

      const result = await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse,
        outputData: { processed: true }
      })

      expect(result.aiCallId).toBe('test-ai-call-id')
      expect(result.latencyMs).toBe(1500) // Should use timestamp difference

      // Verify completeCall was called with correct data
      expect(mockAiCallService.completeCall).toHaveBeenCalledWith('test-ai-call-id', {
        output_data: { processed: true },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          reasoningTokens: 10
        },
        finishReason: 'stop',
        rawApiResponse: expect.objectContaining({
          text: 'Test response from AI',
          usage: expect.any(Object),
          finishReason: 'stop',
          timestamp: expect.any(String),
          startTimestamp: 1000,
          finishTimestamp: 2500,
          experimental_providerMetadata: expect.any(Object)
        }),
        latencyMs: 1500
      })
    })

    it('should handle Google provider metadata format', async () => {
      const mockResponse: VercelAIResponse = {
        text: 'Test response from Gemini',
        usage: {
          promptTokens: 80,
          completionTokens: 40,
          totalTokens: 120
        },
        finishReason: 'stop',
        experimental_providerMetadata: {
          google: {
            modelId: 'gemini-1.5-flash',
            latency: 800
          }
        }
      }

      const result = await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      expect(result.latencyMs).toBe(800)
    })

    it('should handle OpenAI provider metadata format', async () => {
      const mockResponse: VercelAIResponse = {
        text: 'Test response from GPT',
        usage: {
          promptTokens: 60,
          completionTokens: 30,
          totalTokens: 90
        },
        finishReason: 'stop',
        experimental_providerMetadata: {
          openai: {
            id: 'chatcmpl_123',
            model: 'gpt-4',
            latency: 1200
          }
        }
      }

      const result = await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      expect(result.latencyMs).toBe(1200)
    })

    it('should prioritize SDK timestamps over provider latency', async () => {
      const mockResponse: VercelAIResponse = {
        text: 'Test response',
        usage: {
          promptTokens: 50,
          completionTokens: 25,
          totalTokens: 75
        },
        finishReason: 'stop',
        startTimestamp: 1000,
        finishTimestamp: 3000, // 2000ms difference
        experimental_providerMetadata: {
          anthropic: {
            latency: 1800 // Different from timestamp calculation
          }
        }
      }

      const result = await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      expect(result.latencyMs).toBe(2000) // Should use timestamp difference, not provider latency
    })

    it('should handle responses without latency information', async () => {
      const mockResponse: VercelAIResponse = {
        text: 'Test response without timing',
        usage: {
          promptTokens: 40,
          completionTokens: 20,
          totalTokens: 60
        },
        finishReason: 'stop'
      }

      const result = await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      expect(result.latencyMs).toBeUndefined()
    })

    it('should handle tool call responses', async () => {
      const mockResponse: VercelAIResponse = {
        text: 'I will search for that information.',
        usage: {
          promptTokens: 120,
          completionTokens: 80,
          totalTokens: 200
        },
        finishReason: 'tool_calls',
        toolCalls: [
          {
            toolCallId: 'call_123',
            toolName: 'search',
            args: { query: 'AI response logging' },
            result: { found: 5, items: ['item1', 'item2'] }
          }
        ]
      }

      await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      
      const callArgs = mockAiCallService.completeCall.mock.calls[0][1]
      expect(callArgs.rawApiResponse).toHaveProperty('toolCalls')
      expect(callArgs.rawApiResponse.toolCalls).toHaveLength(1)
      expect(callArgs.rawApiResponse.toolCalls[0]).toMatchObject({
        toolCallId: 'call_123',
        toolName: 'search',
        args: { query: 'AI response logging' }
      })
    })

    it('should handle large responses gracefully', async () => {
      // Create a large response
      const largeText = 'x'.repeat(100000) // 100KB of text
      const mockResponse: VercelAIResponse = {
        text: largeText,
        usage: {
          promptTokens: 50000,
          completionTokens: 25000,
          totalTokens: 75000
        },
        finishReason: 'length'
      }

      await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      
      const callArgs = mockAiCallService.completeCall.mock.calls[0][1]
      expect(callArgs.rawApiResponse.text).toBe(largeText)
    })

    it('should handle special characters in responses', async () => {
      const mockResponse: VercelAIResponse = {
        text: 'Response with special chars: "quotes", \'apostrophes\', \n\nnewlines, \ttabs, and emoji 🚀',
        usage: {
          promptTokens: 30,
          completionTokens: 15,
          totalTokens: 45
        },
        finishReason: 'stop'
      }

      await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      
      const callArgs = mockAiCallService.completeCall.mock.calls[0][1]
      expect(callArgs.rawApiResponse.text).toBe(mockResponse.text)
    })

    it('should handle circular references gracefully by replacing with placeholder', async () => {
      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj // Create circular reference
      
      const mockResponse: VercelAIResponse = {
        text: 'Response with circular ref',
        usage: {
          promptTokens: 20,
          completionTokens: 10,
          totalTokens: 30
        },
        finishReason: 'stop',
        customData: circularObj
      }

      // Spy on console.warn to verify warning is logged
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

      await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      // Should log warning about circular reference
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circular reference removed during AI response serialisation')
      )

      // Verify the circular reference was replaced with placeholder
      const callArgs = mockAiCallService.completeCall.mock.calls[0][1]
      expect(callArgs.rawApiResponse.customData).toEqual({
        name: 'test',
        self: '[Circular]'
      })

      warnSpy.mockRestore()
    })

    it('should fail fatally on AiCallService errors', async () => {
      mockAiCallService.completeCall.mockRejectedValueOnce(new Error('Database error'))

      const mockResponse: VercelAIResponse = {
        text: 'Test response',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        finishReason: 'stop'
      }

      await expect(logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })).rejects.toThrow('AI response logging failed for call test-ai-call-id: Database error')
    })

    it('should fail fatally when AI call not found', async () => {
      mockAiCallService.completeCall.mockResolvedValueOnce(null)

      const mockResponse: VercelAIResponse = {
        text: 'Test response',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        finishReason: 'stop'
      }

      await expect(logger.completeAICall({
        aiCallId: 'non-existent-id',
        response: mockResponse
      })).rejects.toThrow('AI response logging failed for call non-existent-id: AI call non-existent-id not found')
    })

    it('should fail fatally on serialization errors', async () => {
      // Create a getter that throws during property access
      const badObj = {}
      Object.defineProperty(badObj, 'problematicProp', {
        enumerable: true,
        get() {
          throw new Error('Getter error during serialization')
        }
      })
      
      const mockResponse: VercelAIResponse = {
        text: 'Response with bad object',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        finishReason: 'stop',
        badData: badObj
      }

      await expect(logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })).rejects.toThrow(/Failed to serialize AI response.*Getter error during serialization/)
    })

    it('should include correlation ID in logging when provided', async () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      
      const mockResponse: VercelAIResponse = {
        text: 'Test response',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        finishReason: 'stop'
      }

      await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse,
        correlationId: 'test-correlation-123'
      })

      // Logger should be created with correlation ID
      expect(consoleSpy).not.toHaveBeenCalled() // Should use request logger, not console
      
      consoleSpy.mockRestore()
    })

    it('should handle responses with no usage data', async () => {
      const mockResponse: VercelAIResponse = {
        text: 'Response without usage',
        finishReason: 'stop'
      }

      await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      
      const callArgs = mockAiCallService.completeCall.mock.calls[0][1]
      expect(callArgs.usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      })
    })

    it('should preserve all top-level fields in raw response', async () => {
      const mockResponse: VercelAIResponse = {
        text: 'Test response',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        finishReason: 'stop',
        customField1: 'value1',
        customField2: { nested: 'value' },
        customField3: ['array', 'values']
      }

      await logger.completeAICall({
        aiCallId: 'test-ai-call-id',
        response: mockResponse
      })

      
      const callArgs = mockAiCallService.completeCall.mock.calls[0][1]
      expect(callArgs.rawApiResponse).toHaveProperty('customField1', 'value1')
      expect(callArgs.rawApiResponse).toHaveProperty('customField2', { nested: 'value' })
      expect(callArgs.rawApiResponse).toHaveProperty('customField3', ['array', 'values'])
    })
  })

  describe('factory function', () => {
    it('should create AIResponseLogger instance', () => {
      const instance = createAIResponseLogger(mockAiCallService)
      expect(instance).toBeInstanceOf(AIResponseLogger)
    })
  })
})