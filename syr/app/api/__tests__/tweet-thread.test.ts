/**
 * @jest-environment node
 */
import { POST } from '../tweet-thread/route'
import { executePrompt } from '@/lib/prompts/types'
import { createMockRequest } from './test-helpers.js'

// Mock the dependencies
jest.mock('@/lib/prompts/types')
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

const mockExecutePrompt = executePrompt as jest.MockedFunction<typeof executePrompt>

// Import after mocking to get mocked versions
import { tweetThreadPromptInputSchema, tweetThreadResponseSchema } from '@/lib/prompts/templates/tweet-thread'

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

// Mock successful LLM response
const mockLLMResponse = `{
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
}`

describe('/api/tweet-thread', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should generate tweet thread from academic content', async () => {
    // Mock validation success
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { content: sampleAcademicContent, target_length: 6 }
    })

    // Mock LLM response
    mockExecutePrompt.mockResolvedValue(mockLLMResponse)

    // Mock response validation
    const expectedResponse = JSON.parse(mockLLMResponse)
    ;(tweetThreadResponseSchema.parse as jest.Mock).mockReturnValueOnce(expectedResponse)

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: sampleAcademicContent,
        target_length: 6
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tweets).toHaveLength(6)
    expect(data.thread_summary).toBeTruthy()
    expect(data.metadata.tweet_count).toBe(6)
    expect(data.metadata.truncated).toBe(false)
  })

  it('should validate tweet character limits', async () => {
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { content: sampleAcademicContent, target_length: 6 }
    })

    mockExecutePrompt.mockResolvedValue(mockLLMResponse)
    const expectedResponse = JSON.parse(mockLLMResponse)
    ;(tweetThreadResponseSchema.parse as jest.Mock).mockReturnValueOnce(expectedResponse)

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: sampleAcademicContent,
        target_length: 6
      }
    })

    const response = await POST(request)
    const data = await response.json()

    // Verify each tweet is within 280 character limit
    data.tweets.forEach((tweet: { text: string; number: number }) => {
      expect(tweet.text.length).toBeLessThanOrEqual(280)
      expect(tweet.number).toBeGreaterThan(0)
    })
  })

  it('should handle content truncation for large documents', async () => {
    // Create oversized content (over 50k characters)
    const largeContent = sampleAcademicContent.repeat(500)
    
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { content: largeContent, target_length: 10 }
    })

    mockExecutePrompt.mockResolvedValue(mockLLMResponse)
    const expectedResponse = JSON.parse(mockLLMResponse)
    ;(tweetThreadResponseSchema.parse as jest.Mock).mockReturnValueOnce(expectedResponse)

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: largeContent,
        target_length: 10
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.metadata.truncated).toBe(true)
    expect(data.metadata.processed_length).toBe(50000)
    expect(data.metadata.content_length).toBeGreaterThan(50000)
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

    const response = await POST(request)

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

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid request body')
  })

  it('should handle LLM errors gracefully', async () => {
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { content: sampleAcademicContent, target_length: 8 }
    })

    mockExecutePrompt.mockRejectedValue(new Error('LLM service unavailable'))

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: sampleAcademicContent,
        target_length: 8
      }
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to generate tweet thread')
  })

  it('should handle invalid JSON response from LLM', async () => {
    ;(tweetThreadPromptInputSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { content: sampleAcademicContent, target_length: 5 }
    })

    mockExecutePrompt.mockResolvedValue('Invalid JSON response')

    const request = createMockRequest('http://localhost:3000/api/tweet-thread', {
      method: 'POST',
      body: {
        content: sampleAcademicContent,
        target_length: 5
      }
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Invalid response format from AI model')
  })
})