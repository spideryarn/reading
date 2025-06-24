/**
 * @jest-environment node
 */
/**
 * API Routes Usage Tracking Integration Tests
 * 
 * Integration tests to verify that API routes properly capture and store 
 * LLM token usage metadata end-to-end, from prompt execution through 
 * database storage.
 */

import * as summariseRoute from '../summarise/route'
import * as tweetThreadRoute from '../tweet-thread/route'
import { createMockRequest } from './test-helpers'
import * as promptTypes from '@/lib/prompts/types'
import * as supabaseServer from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { getModelForAICall } from '@/lib/config'
import { tweetThreadPromptInputSchema, tweetThreadResponseSchema } from '@/lib/prompts/templates/tweet-thread'
import type { MockSupabaseClient, MockAiCall } from './test-types'
import type { ModelConfig } from '@/lib/config'

// Mock external dependencies
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/database/ai-calls')
jest.mock('@/lib/services/database/enhancements')
jest.mock('@/lib/config')
jest.mock('@/lib/prompts/templates/summarise', () => ({
  ...jest.requireActual('@/lib/prompts/templates/summarise'),
  summarisePrompt: {
    name: 'summarise',
    description: 'Test summarise prompt',
    schema: {},
    templatePath: 'test.njk',
    modelConfig: {
      maxTokens: 0  // This gets overridden by getMaxTokensForGranularity
    }
  },
  getMaxTokensForGranularity: jest.fn().mockReturnValue(200),
  getGranularityInstruction: jest.fn().mockReturnValue('Write at most a detailed.')
}))

// Mock the prompt execution to return the correct structure
jest.mock('@/lib/prompts/templates/tweet-thread', () => ({
  ...jest.requireActual('@/lib/prompts/templates/tweet-thread'),
  tweetThreadPrompt: {
    name: 'tweet-thread',
    description: 'Test tweet thread prompt',
    schema: {},
    templatePath: 'test.njk',
    modelConfig: {
      maxTokens: 300
    }
  },
  tweetThreadPromptInputSchema: {
    safeParse: jest.fn()
  },
  tweetThreadResponseSchema: {
    parse: jest.fn()
  }
}))

// Type the mocked modules
const mockPromptTypes = promptTypes as jest.Mocked<typeof promptTypes>
const mockSupabaseServer = supabaseServer as jest.Mocked<typeof supabaseServer>
const mockGetModelForAICall = getModelForAICall as jest.MockedFunction<typeof getModelForAICall>
const mockTweetThreadInputSchema = tweetThreadPromptInputSchema as jest.Mocked<typeof tweetThreadPromptInputSchema>
const mockTweetThreadResponseSchema = tweetThreadResponseSchema as jest.Mocked<typeof tweetThreadResponseSchema>

const mockSupabaseClient: MockSupabaseClient = {
  // Mock client methods as needed
}

describe('API Routes Usage Tracking Integration', () => {
  let mockAiCallService: AiCallService
  let mockEnhancementService: EnhancementService

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Clear any persisted mock data
    if ('clearMockEnhancements' in EnhancementService) {
      (EnhancementService as any).clearMockEnhancements()
    }
    
    // Setup common mocks
    mockSupabaseServer.createClient.mockResolvedValue(mockSupabaseClient)
    
    // Create service instances
    mockAiCallService = new AiCallService(mockSupabaseClient)
    mockEnhancementService = new EnhancementService(mockSupabaseClient)
    
    // Set up service method spies
    jest.spyOn(mockAiCallService, 'startCall').mockResolvedValue({
      id: 'test-ai-call-id',
      document_id: null,
      model_string: 'anthropic:claude-3-5-haiku:20241022',
      prompt_type: 'chat',
      status: 'pending'
    } as any)
    jest.spyOn(mockAiCallService, 'completeCall').mockResolvedValue({} as any)
    jest.spyOn(mockAiCallService, 'failCall').mockResolvedValue({} as any)
    
    jest.spyOn(mockEnhancementService, 'get').mockResolvedValue(null)
    jest.spyOn(mockEnhancementService, 'storeSummary').mockResolvedValue({} as any)
    jest.spyOn(mockEnhancementService, 'storeHeadings').mockResolvedValue({} as any)
    jest.spyOn(mockEnhancementService, 'delete').mockResolvedValue(undefined)
    jest.spyOn(mockEnhancementService, 'upsert').mockResolvedValue({} as any)
    
    // Mock getModelForAICall to return model string and config
    mockGetModelForAICall.mockReturnValue({
      modelString: 'anthropic:claude-3-5-haiku:20241022',
      config: {
        provider: 'anthropic',
        modelName: 'claude-3-5-haiku',
        version: '20241022',
        thinking: false,
        contextWindow: 200_000,
        outputTokens: 8192,
        description: 'Claude 3.5 Haiku - cost-effective',
        pricing: {
          inputPer1M: 1.00,
          outputPer1M: 5.00
        }
      } as ModelConfig
    })
    
    // Setup executePromptWithUsage mock with proper structure
    mockPromptTypes.executePromptWithUsage.mockResolvedValue({
      text: 'Default mock response',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        reasoningTokens: 0
      },
      finishReason: 'stop'
    })
  })

  describe('Summarise API Route', () => {
    const mockUsageResult = {
      text: 'This is a comprehensive summary of the document content.',
      usage: {
        promptTokens: 500,
        completionTokens: 150,
        totalTokens: 650,
        reasoningTokens: 25
      },
      finishReason: 'stop'
    }

    const mockAiCall = {
      id: 'ai-call-uuid-123',
      document_id: 'doc-456',
      status: 'pending'
    }

    const mockEnhancement = {
      id: 'enhancement-uuid-789'
    }

    it('should capture and store usage metadata on successful summary generation', async () => {
      // Mock no existing summary
      mockEnhancementService.get.mockResolvedValue(null)
      
      // Mock AI call creation
      mockAiCallService.startCall.mockResolvedValue(mockAiCall as MockAiCall)
      
      // Mock prompt execution with usage
      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockUsageResult)
      
      // Mock successful completion and storage
      mockAiCallService.completeCall.mockResolvedValue({} as MockAiCall)
      mockEnhancementService.storeSummary.mockResolvedValue(mockEnhancement as { id: string })

      const request = createMockRequest('http://localhost/api/summarise', {
        method: 'POST',
        body: {
          content: 'Document content to summarize...',
          granularity: 'detailed',
          documentId: 'doc-456'
        }
      })

      const response = await summariseRoute.POST(request)
      const responseData = await response.json()

      // Verify response structure
      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        summary: 'This is a comprehensive summary of the document content.',
        cached: false,
        enhancementId: 'enhancement-uuid-789',
        aiCallId: 'ai-call-uuid-123'
      })

      // Verify AI call was started with correct metadata
      expect(mockAiCallService.startCall).toHaveBeenCalledWith({
        documentId: 'doc-456',
        modelString: 'anthropic:claude-3-5-haiku:20241022',
        prompt_type: 'summarise',
        input_data: {
          content_length: expect.any(Number),
          granularity: 'detailed',
          section_id: undefined,
          tier_used: expect.any(String)
        }
      })

      // Verify prompt was executed with usage tracking
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          modelConfig: expect.objectContaining({
            maxTokens: expect.any(Number)
          })
        }),
        {
          content: 'Document content to summarize...',
          granularity: expect.any(String)
        }
      )

      // Verify AI call was completed with usage metadata
      expect(mockAiCallService.completeCall).toHaveBeenCalledWith('ai-call-uuid-123', {
        output_data: {
          text_length: mockUsageResult.text.length,
          processing_notes: 'Summary generation completed successfully'
        },
        usage: mockUsageResult.usage,
        finishReason: mockUsageResult.finishReason
      })

      // Verify enhancement was stored
      expect(mockEnhancementService.storeSummary).toHaveBeenCalledWith(
        'doc-456',
        'ai-call-uuid-123',
        {
          text: mockUsageResult.text,
          metadata: {
            granularity: 'detailed',
            sectionId: undefined,
            generatedAt: expect.any(String),
            modelUsed: 'anthropic:claude-3-5-haiku:20241022'
          }
        },
        'detailed'
      )
    })

    it('should handle LLM errors and mark AI call as failed', async () => {
      mockEnhancementService.get.mockResolvedValue(null)
      mockAiCallService.startCall.mockResolvedValue(mockAiCall as MockAiCall)
      
      // Mock LLM error
      const llmError = new Error('LLM API rate limit exceeded')
      mockPromptTypes.executePromptWithUsage.mockRejectedValue(llmError)
      
      // Mock fail call
      mockAiCallService.failCall.mockResolvedValue({} as MockAiCall)

      const request = createMockRequest('http://localhost/api/summarise', {
        method: 'POST',
        body: {
          content: 'Document content...',
          documentId: 'doc-456'
        }
      })

      const response = await summariseRoute.POST(request)

      expect(response.status).toBe(500)

      // Verify AI call was marked as failed
      expect(mockAiCallService.failCall).toHaveBeenCalledWith(
        'ai-call-uuid-123',
        'LLM API rate limit exceeded'
      )

      // Verify completeCall was not called
      expect(mockAiCallService.completeCall).not.toHaveBeenCalled()
    })

    it('should return cached summary without creating new AI call', async () => {
      const cachedSummary = {
        id: 'cached-enhancement',
        content: {
          text: 'Cached summary text',
          metadata: { granularity: 'brief' }
        }
      }

      mockEnhancementService.get.mockResolvedValue(cachedSummary as { 
        id: string
        type: string 
        document_id: string
        content: { text: string; metadata: { granularity: string } }
      })

      const request = createMockRequest('http://localhost/api/summarise', {
        method: 'POST',
        body: {
          content: 'Document content...',
          documentId: 'doc-456',
          granularity: 'brief'
        }
      })

      const response = await summariseRoute.POST(request)
      const responseData = await response.json()

      expect(responseData).toEqual({
        summary: 'Cached summary text',
        cached: true,
        enhancementId: 'cached-enhancement'
      })

      // Verify no AI call was made
      expect(mockAiCallService.startCall).not.toHaveBeenCalled()
      expect(mockPromptTypes.executePromptWithUsage).not.toHaveBeenCalled()
    })
  })

  describe('Tweet Thread API Route', () => {
    const mockTweetThreadResult = {
      text: '{"tweets": ["Tweet 1 content", "Tweet 2 content"], "thread_summary": "Summary of tweet thread"}',
      usage: {
        promptTokens: 300,
        completionTokens: 250,
        totalTokens: 550,
        reasoningTokens: 50
      },
      finishReason: 'stop'
    }

    const mockParsedResponse = {
      tweets: ["Tweet 1 content", "Tweet 2 content"],
      thread_summary: "Summary of tweet thread"
    }

    const mockAiCall = {
      id: 'tweet-ai-call-456'
    }

    it('should capture and store usage metadata for tweet thread generation', async () => {
      // Mock no existing tweet thread
      mockEnhancementService.get.mockResolvedValue(null)
      
      // Mock input schema validation
      mockTweetThreadInputSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          content: 'Long article content to convert to tweet thread...',
          target_length: 'medium',
          documentId: 'doc-789'
        }
      })
      
      // Mock response schema parsing
      mockTweetThreadResponseSchema.parse.mockReturnValue(mockParsedResponse)
      
      // Mock prompt execution with usage
      mockPromptTypes.executePromptWithUsage.mockResolvedValue(mockTweetThreadResult)
      
      // Mock AI call service create method (used by tweet-thread route)
      jest.spyOn(mockAiCallService, 'create').mockResolvedValue(mockAiCall as MockAiCall)
      
      // Mock enhancement storage
      mockEnhancementService.upsert.mockResolvedValue({} as { id: string })

      const request = createMockRequest('http://localhost/api/tweet-thread', {
        method: 'POST',
        body: {
          content: 'Long article content to convert to tweet thread...',
          target_length: 'medium',
          documentId: 'doc-789'
        }
      })

      const response = await tweetThreadRoute.POST(request)
      const responseData = await response.json()

      // Verify response structure
      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        tweets: ["Tweet 1 content", "Tweet 2 content"],
        thread_summary: "Summary of tweet thread",
        metadata: {
          content_length: expect.any(Number),
          processed_length: expect.any(Number),
          tweet_count: 2
        }
      })

      // Verify prompt was executed with usage tracking
      expect(mockPromptTypes.executePromptWithUsage).toHaveBeenCalledWith(
        expect.any(Object),
        {
          content: 'Long article content to convert to tweet thread...',
          target_length: 'medium',
          documentId: 'doc-789'
        }
      )

      // Verify AI call was created with usage metadata
      expect(mockAiCallService.create).toHaveBeenCalledWith({
        modelString: 'anthropic:claude-3-5-haiku:20241022',
        promptTokens: 300,
        completionTokens: 250,
        totalTokens: 550,
        requestData: {
          content: 'Long article content to convert to tweet thread...',
          target_length: 'medium'
        },
        responseData: mockParsedResponse
      })

      // Verify enhancement was stored
      expect(mockEnhancementService.upsert).toHaveBeenCalledWith({
        documentId: 'doc-789',
        aiCallId: 'tweet-ai-call-456',
        type: 'tweet-thread',
        content: {
          tweets: ["Tweet 1 content", "Tweet 2 content"],
          thread_summary: "Summary of tweet thread",
          metadata: expect.objectContaining({
            content_length: expect.any(Number),
            tweet_count: 2
          })
        }
      })
    })

    it('should handle invalid JSON response from LLM', async () => {
      mockEnhancementService.get.mockResolvedValue(null)
      
      // Mock LLM returning invalid JSON
      const invalidJsonResult = {
        text: 'This is not valid JSON',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        },
        finishReason: 'stop'
      }
      
      mockPromptTypes.executePromptWithUsage.mockResolvedValue(invalidJsonResult)

      const request = createMockRequest('http://localhost/api/tweet-thread', {
        method: 'POST',
        body: {
          content: 'Content...',
          target_length: 'short',
          documentId: 'doc-789'
        }
      })

      const response = await tweetThreadRoute.POST(request)

      expect(response.status).toBe(500)
      
      const responseData = await response.json()
      expect(responseData.error).toBe('Invalid response format from AI model')

      // Verify no AI call was created due to parsing failure
      expect(mockAiCallService.create).not.toHaveBeenCalled()
    })

    it('should handle markdown code blocks in LLM response', async () => {
      mockEnhancementService.get.mockResolvedValue(null)
      
      // Mock input schema validation
      mockTweetThreadInputSchema.safeParse.mockReturnValue({
        success: true,
        data: {
          content: 'Content...',
          target_length: 'medium',
          documentId: 'doc-789'
        }
      })
      
      // Mock LLM returning JSON wrapped in markdown code blocks
      const markdownWrappedResult = {
        text: '```json\n{"tweets": ["Clean tweet 1", "Clean tweet 2"], "thread_summary": "Clean summary"}\n```',
        usage: {
          promptTokens: 200,
          completionTokens: 100,
          totalTokens: 300
        },
        finishReason: 'stop'
      }
      
      // Mock the parsed response after markdown stripping
      const expectedParsedResponse = {
        tweets: ["Clean tweet 1", "Clean tweet 2"],
        thread_summary: "Clean summary"
      }
      
      mockPromptTypes.executePromptWithUsage.mockResolvedValue(markdownWrappedResult)
      mockTweetThreadResponseSchema.parse.mockReturnValue(expectedParsedResponse)
      jest.spyOn(mockAiCallService, 'create').mockResolvedValue(mockAiCall as MockAiCall)
      mockEnhancementService.upsert.mockResolvedValue({} as { id: string })

      const request = createMockRequest('http://localhost/api/tweet-thread', {
        method: 'POST',
        body: {
          content: 'Content...',
          target_length: 'medium',
          documentId: 'doc-789'
        }
      })

      const response = await tweetThreadRoute.POST(request)
      const responseData = await response.json()

      // Verify the markdown was properly stripped and JSON parsed
      expect(responseData.tweets).toEqual(["Clean tweet 1", "Clean tweet 2"])
      expect(responseData.thread_summary).toBe("Clean summary")

      // Verify AI call was created with correct usage
      expect(mockAiCallService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          promptTokens: 200,
          completionTokens: 100,
          totalTokens: 300
        })
      )
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle AI call service initialization failure', async () => {
      // Mock Supabase client creation failure
      mockSupabaseServer.createClient.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('http://localhost/api/summarise', {
        method: 'POST',
        body: {
          content: 'Content...',
          documentId: 'doc-456'
        }
      })

      const response = await summariseRoute.POST(request)

      expect(response.status).toBe(500)
    })

    it('should handle model configuration errors', async () => {
      mockGetModelForAICall.mockImplementation(() => {
        throw new Error('Invalid model configuration')
      })

      const request = createMockRequest('http://localhost/api/summarise', {
        method: 'POST',
        body: {
          content: 'Content...',
          documentId: 'doc-456'
        }
      })

      const response = await summariseRoute.POST(request)

      expect(response.status).toBe(500)
    })
  })
})