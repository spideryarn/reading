/**
 * @jest-environment node
 */
import * as tweetThreadRoute from '../tweet-thread/route'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { createMockRequest } from './test-helpers'
import type { MockSupabaseClient } from './test-types'

// Mock the dependencies
jest.mock('@/lib/prompts/types')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))
jest.mock('@/lib/services/database/enhancements')
jest.mock('@/lib/services/database/ai-calls')
jest.mock('@/lib/config', () => ({
  getModelConfig: jest.fn(() => ({ provider: 'anthropic', modelId: 'claude-3-haiku' }))
}))
jest.mock('@/lib/prompts/templates/tweet-thread', () => ({
  tweetThreadPrompt: {
    name: 'tweet-thread',
    description: 'Test tweet thread prompt',
    schema: {},
    templatePath: 'test.njk',
    modelConfig: {
      maxTokens: 2000
    }
  },
  tweetThreadPromptInputSchema: {
    safeParse: jest.fn(),
    parse: jest.fn()
  },
  tweetThreadResponseSchema: {
    parse: jest.fn()
  }
}))

const mockExecutePromptWithUsage = executePromptWithUsage as jest.MockedFunction<typeof executePromptWithUsage>

// Mock the services after importing them
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// Import after mocking to get mocked versions
import { tweetThreadPromptInputSchema, tweetThreadResponseSchema } from '@/lib/prompts/templates/tweet-thread'

// Test document ID - valid UUID
const TEST_DOCUMENT_ID = '123e4567-e89b-12d3-a456-426614174000'

// Sample academic content for testing
const sampleAcademicContent = `
# The Impact of Climate Change on Marine Ecosystems

## Abstract
This study examines the effects of rising ocean temperatures on marine biodiversity. Our research shows that ocean warming has led to significant shifts in species distribution and abundance patterns.

## Introduction
Marine ecosystems are particularly vulnerable to climate change impacts. Rising sea temperatures, ocean acidification, and changing current patterns are reshaping marine habitats worldwide.

## Methods
We analyzed temperature and species data from 50 monitoring stations across the Pacific Ocean over a 20-year period (2003-2023).

## Results
Our findings reveal:
- Average sea surface temperatures have increased by 0.8°C
- 60% of observed species have shifted their range northward
- Fish populations have declined by 25% in warming regions
- Coral bleaching events have increased by 300%

## Discussion
These results demonstrate the urgent need for climate action to protect marine biodiversity. The rapid pace of change threatens ecosystem stability and fisheries sustainability.

## Conclusion
Marine ecosystems are experiencing unprecedented changes due to climate warming. Immediate conservation efforts are essential to preserve ocean biodiversity for future generations.
`.trim()

// Mock successful LLM response with usage
const mockLLMResponse = {
  text: `{
    "tweets": [
      {
        "number": 1,
        "text": "🧵 THREAD: New research reveals dramatic impacts of climate change on marine ecosystems - 60% of species are shifting northward as oceans warm 🌊"
      },
      {
        "number": 2,
        "text": "Why does this matter? Marine ecosystems support billions of people and are crucial for global food security and climate regulation 🐟"
      },
      {
        "number": 3,
        "text": "The study analyzed 20 years of data from 50 Pacific monitoring stations, tracking both temperature changes and species movement patterns 📊"
      },
      {
        "number": 4,
        "text": "Key finding: Ocean surface temperatures have risen 0.8°C - seemingly small but huge for marine life adapted to stable conditions 🌡️"
      },
      {
        "number": 5,
        "text": "Result: Fish populations have declined 25% in warming regions while coral bleaching events increased by 300% - a biodiversity crisis 🐠"
      },
      {
        "number": 6,
        "text": "The implications are clear: we need immediate climate action to protect ocean biodiversity and ensure sustainable fisheries for future generations ⚡"
      }
    ],
    "thread_summary": "Research on climate change impacts on marine ecosystems showing species migration, population decline, and urgent need for conservation action"
  }`,
  usage: {
    promptTokens: 500,
    completionTokens: 200,
    totalTokens: 700
  }
}

describe('/api/tweet-thread', () => {
  let mockEnhancementService: EnhancementService
  let mockAiCallService: AiCallService

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    
    // Clear any persisted mock data
    if ('clearMockEnhancements' in EnhancementService) {
      (EnhancementService as any).clearMockEnhancements()
    }
    
    // Set up database service mocks
    const mockSupabaseClient = {} as MockSupabaseClient
    mockCreateClient.mockResolvedValue(mockSupabaseClient)
    
    // Create service instances
    mockEnhancementService = new EnhancementService(mockSupabaseClient)
    mockAiCallService = new AiCallService(mockSupabaseClient)
    
    // Set up service method spies
    jest.spyOn(mockEnhancementService, 'get').mockResolvedValue(null) // No cached tweet thread by default
    jest.spyOn(mockEnhancementService, 'upsert').mockResolvedValue({} as any)
    jest.spyOn(mockAiCallService, 'create').mockResolvedValue({ id: 'test-ai-call-id' } as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should generate tweet thread from academic content', async () => {
    // Mock validation success
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { content: sampleAcademicContent, target_length: 6, documentId: TEST_DOCUMENT_ID }
    })

    // Mock LLM response
    mockExecutePromptWithUsage.mockResolvedValue(mockLLMResponse)

    // Mock response validation
    const expectedResponse = JSON.parse(mockLLMResponse.text)
    ;(tweetThreadResponseSchema.parse as jest.Mock).mockReturnValueOnce(expectedResponse)

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: sampleAcademicContent,
        target_length: 6,
        documentId: TEST_DOCUMENT_ID
      }
    })

    const response = await tweetThreadRoute.POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tweets).toHaveLength(6)
    expect(data.thread_summary).toBeTruthy()
    expect(data.metadata.tweet_count).toBe(6)
  })

  it('should validate tweet character limits', async () => {
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { content: sampleAcademicContent, target_length: 6, documentId: TEST_DOCUMENT_ID }
    })

    mockExecutePromptWithUsage.mockResolvedValue(mockLLMResponse)
    const expectedResponse = JSON.parse(mockLLMResponse.text)
    ;(tweetThreadResponseSchema.parse as jest.Mock).mockReturnValueOnce(expectedResponse)

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: sampleAcademicContent,
        target_length: 6,
        documentId: TEST_DOCUMENT_ID
      }
    })

    const response = await tweetThreadRoute.POST(request)
    const data = await response.json()

    // Verify each tweet is within 280 character limit (Twitter standard)
    data.tweets.forEach((tweet: { text: string; number: number }) => {
      expect(tweet.text.length).toBeLessThanOrEqual(280)
      expect(tweet.number).toBeGreaterThan(0)
    })
  })

  it('should validate input parameters', async () => {
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: false,
      error: { message: 'Invalid input' }
    })

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: 'Too short', // Under 100 chars should fail
        target_length: 25 // Over max limit should fail
      }
    })

    const response = await tweetThreadRoute.POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid request body')
  })

  it('should handle missing content parameter', async () => {
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: false,
      error: { message: 'Missing required field: content' }
    })

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        target_length: 10
        // Missing content parameter
      }
    })

    const response = await tweetThreadRoute.POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid request body')
  })

  it('should handle LLM errors gracefully', async () => {
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { content: sampleAcademicContent, target_length: 8, documentId: TEST_DOCUMENT_ID }
    })

    mockExecutePromptWithUsage.mockRejectedValue(new Error('LLM service unavailable'))

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: sampleAcademicContent,
        target_length: 8,
        documentId: TEST_DOCUMENT_ID
      }
    })

    const response = await tweetThreadRoute.POST(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to generate tweet thread')
  })

  it('should handle invalid JSON response from LLM', async () => {
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { content: sampleAcademicContent, target_length: 5, documentId: TEST_DOCUMENT_ID }
    })

    mockExecutePromptWithUsage.mockResolvedValue({
      text: 'Invalid JSON response',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    })

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: sampleAcademicContent,
        target_length: 5,
        documentId: TEST_DOCUMENT_ID
      }
    })

    const response = await tweetThreadRoute.POST(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Invalid response format from AI model')
  })

  describe('character limit validation', () => {
    it('should reject oversized tweets with validation error', async () => {
      // Mock LLM response with tweets exceeding 280 characters
      const oversizedLLMResponse = `{
        "tweets": [
          {
            "number": 1,
            "text": "🧵 THREAD: This is an extremely long tweet that definitely exceeds the 280 character limit that we've set for our application and should trigger schema validation to fail with proper error handling rather than accepting invalid data that would break Twitter's character constraints"
          }
        ],
        "thread_summary": "Test thread with oversized tweet"
      }`

      ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { content: sampleAcademicContent, target_length: 1, documentId: TEST_DOCUMENT_ID }
      })

      mockExecutePromptWithUsage.mockResolvedValue({
        text: oversizedLLMResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Mock the schema validation to fail (oversized tweet)
      ;(tweetThreadResponseSchema.parse as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Tweet must be 280 characters or less')
      })

      const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
        method: 'POST',
        body: {
          content: sampleAcademicContent,
          target_length: 1,
          documentId: TEST_DOCUMENT_ID
        }
      })

      const response = await tweetThreadRoute.POST(request)

      // Should return 500 error due to validation failure
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to generate tweet thread')
    })

    it('should handle validation errors without crashing', async () => {
      // Mock LLM response with a tweet that's way over the limit
      const extremelyOversizedResponse = `{
        "tweets": [
          {
            "number": 1,
            "text": "${"This is an extremely long tweet that definitely exceeds any reasonable character limit. ".repeat(10)}This content should trigger a validation error."
          }
        ],
        "thread_summary": "Test for validation error handling"
      }`

      ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
        success: true,
        data: { content: sampleAcademicContent, target_length: 1, documentId: TEST_DOCUMENT_ID }
      })

      mockExecutePromptWithUsage.mockResolvedValue({
        text: extremelyOversizedResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      })

      // Mock schema validation to fail (oversized tweet)
      ;(tweetThreadResponseSchema.parse as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Tweet must be 280 characters or less')
      })

      const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
        method: 'POST',
        body: {
          content: sampleAcademicContent,
          target_length: 1,
          documentId: TEST_DOCUMENT_ID
        }
      })

      const response = await tweetThreadRoute.POST(request)

      // Should return 500 error, not crash the server
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to generate tweet thread')
    })
  })
})