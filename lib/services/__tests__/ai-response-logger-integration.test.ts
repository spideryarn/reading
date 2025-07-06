/**
 * Integration tests for AI Response Logger
 * 
 * Verifies end-to-end AI response logging with real database operations
 * ensuring that raw API responses and latency are correctly persisted.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { AiCallService } from '../database/ai-calls'
import { createAIResponseLogger } from '../ai-response-logger'
import type { VercelAIResponse } from '../ai-response-logger'
import { RealRLSTestSetup } from '../database/__tests__/rls-test-helpers'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'

// Skip unless INTEGRATION_TESTS is set
const describeIntegration = process.env.INTEGRATION_TESTS ? describe : describe.skip

describeIntegration('AI Response Logger Integration', () => {
  let testSetup: RealRLSTestSetup
  let cleanupFunctions: Array<() => Promise<void>>
  let testUserId: string
  let testDocumentId: string
  
  beforeEach(async () => {
    testSetup = new RealRLSTestSetup()
    cleanupFunctions = []
    testUserId = TEST_USER_IDS.USER_1
    
    // Create a test document using admin client
    const adminClient = testSetup.getAdminClient()
    const documentSuffix = `ai-response-logger-test-${Date.now()}`
    const { data: document, error } = await adminClient
      .from('documents')
      .insert({
        title: `Test Document ${documentSuffix}`,
        content_state: { content: 'Test content' },
        folder: 'test',
        created_by: testUserId
      })
      .select()
      .single()
    
    if (error) throw error
    testDocumentId = document.id
    
    // Add cleanup function
    cleanupFunctions.push(async () => {
      await adminClient.from('documents').delete().eq('id', testDocumentId)
    })
  })
  
  afterEach(async () => {
    // Run all cleanup functions
    for (const cleanup of cleanupFunctions) {
      await cleanup()
    }
  })
  
  it('should persist complete AI response with all metadata to database', async () => {
    const userClient = await testSetup.createUserClient(testUserId)
    const aiCallService = new AiCallService(userClient)
    const aiResponseLogger = createAIResponseLogger(aiCallService)
    
    // Create a mock AI response mimicking Vercel AI SDK structure
    const mockResponse: VercelAIResponse = {
      text: 'This is a test AI response for integration testing.',
      usage: {
        promptTokens: 250,
        completionTokens: 100,
        totalTokens: 350,
        reasoningTokens: 50
      },
      finishReason: 'stop',
      startTimestamp: Date.now(),
      finishTimestamp: Date.now() + 1500, // 1.5 second latency
      experimental_providerMetadata: {
        anthropic: {
          id: 'msg_test_123',
          modelId: 'claude-3-5-haiku',
          latency: 1450,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 25
        }
      },
      response: {
        id: 'resp_test_123',
        modelId: 'claude-3-5-haiku',
        headers: {
          'x-request-id': 'req_test_123',
          'anthropic-ratelimit-requests-remaining': '999'
        }
      }
    }
    
    // Start an AI call
    const aiCall = await aiCallService.startCallWithModelString({
      documentId: testDocumentId,
      userId: testUserId,
      modelString: 'anthropic:claude-3-5-haiku:20241022',
      prompt_type: 'summarise',
      input_data: {
        text: 'Test input for summarization',
        maxLength: 100
      }
    })
    
    expect(aiCall).toBeDefined()
    expect(aiCall.id).toBeTruthy()
    expect(aiCall.status).toBe('pending')
    
    // Complete the AI call with comprehensive logging
    const result = await aiResponseLogger.completeAICall({
      aiCallId: aiCall.id,
      response: mockResponse,
      outputData: {
        summary: 'This is a test summary',
        wordCount: 5
      },
      correlationId: 'test-correlation-123'
    })
    
    expect(result.aiCallId).toBe(aiCall.id)
    expect(result.latencyMs).toBe(1500) // Should use timestamp difference
    
    // Fetch the completed AI call from database to verify persistence
    const adminClient = testSetup.getAdminClient()
    const { data: persistedCall, error } = await adminClient
      .from('ai_calls')
      .select('*')
      .eq('id', aiCall.id)
      .single()
    
    expect(error).toBeNull()
    expect(persistedCall).toBeDefined()
    
    // Verify all fields were correctly persisted
    expect(persistedCall.status).toBe('success')
    expect(persistedCall.prompt_tokens).toBe(250)
    expect(persistedCall.completion_tokens).toBe(100)
    expect(persistedCall.total_tokens).toBe(350)
    expect(persistedCall.reasoning_tokens).toBe(50)
    expect(persistedCall.finish_reason).toBe('stop')
    expect(persistedCall.latency_ms).toBe(1500)
    
    // Verify raw API response was persisted correctly
    expect(persistedCall.raw_api_response).toBeDefined()
    expect(persistedCall.raw_api_response).toMatchObject({
      text: 'This is a test AI response for integration testing.',
      usage: {
        promptTokens: 250,
        completionTokens: 100,
        totalTokens: 350,
        reasoningTokens: 50
      },
      finishReason: 'stop',
      timestamp: expect.any(String),
      startTimestamp: expect.any(Number),
      finishTimestamp: expect.any(Number),
      experimental_providerMetadata: {
        anthropic: expect.objectContaining({
          id: 'msg_test_123',
          modelId: 'claude-3-5-haiku',
          latency: 1450
        })
      },
      response: expect.objectContaining({
        id: 'resp_test_123',
        modelId: 'claude-3-5-haiku'
      })
    })
    
    // Verify extra output data
    expect(persistedCall.extra).toMatchObject({
      summary: 'This is a test summary',
      wordCount: 5
    })
    
    // Add cleanup function for AI call
    cleanupFunctions.push(async () => {
      await testSetup.getAdminClient().from('ai_calls').delete().eq('id', aiCall.id)
    })
  })
  
  it('should handle Google Gemini responses correctly', async () => {
    const userClient = await testSetup.createUserClient(testUserId)
    const aiCallService = new AiCallService(userClient)
    const aiResponseLogger = createAIResponseLogger(aiCallService)
    
    const mockGeminiResponse: VercelAIResponse = {
      text: 'Gemini response for testing.',
      usage: {
        promptTokens: 180,
        completionTokens: 80,
        totalTokens: 260
      },
      finishReason: 'stop',
      experimental_providerMetadata: {
        google: {
          groundingMetadata: {
            groundingSupports: [],
            webSearchQueries: []
          },
          safetyRatings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' }
          ],
          latency: 950
        }
      }
    }
    
    const aiCall = await aiCallService.startCallWithModelString({
      documentId: testDocumentId,
      userId: testUserId,
      modelString: 'google:gemini-1.5-flash:20241022',
      prompt_type: 'glossary',
      input_data: { text: 'Test text for glossary' }
    })
    
    const result = await aiResponseLogger.completeAICall({
      aiCallId: aiCall.id,
      response: mockGeminiResponse
    })
    
    expect(result.latencyMs).toBe(950)
    
    // Verify in database
    const adminClient = testSetup.getAdminClient()
    const { data: persistedCall } = await adminClient
      .from('ai_calls')
      .select('*')
      .eq('id', aiCall.id)
      .single()
    
    expect(persistedCall.raw_api_response).toMatchObject({
      text: 'Gemini response for testing.',
      experimental_providerMetadata: {
        google: expect.objectContaining({
          latency: 950,
          safetyRatings: expect.any(Array)
        })
      }
    })
    
    cleanupFunctions.push(async () => {
      await testSetup.getAdminClient().from('ai_calls').delete().eq('id', aiCall.id)
    })
  })
  
  it('should handle responses without latency information', async () => {
    const userClient = await testSetup.createUserClient(testUserId)
    const aiCallService = new AiCallService(userClient)
    const aiResponseLogger = createAIResponseLogger(aiCallService)
    
    const mockMinimalResponse: VercelAIResponse = {
      text: 'Minimal response without timing data.',
      usage: {
        promptTokens: 50,
        completionTokens: 20,
        totalTokens: 70
      },
      finishReason: 'stop'
    }
    
    const aiCall = await aiCallService.startCallWithModelString({
      documentId: testDocumentId,
      userId: testUserId,
      modelString: 'anthropic:claude-3-5-haiku:20241022',
      prompt_type: 'chat',
      input_data: { message: 'Hello' }
    })
    
    const result = await aiResponseLogger.completeAICall({
      aiCallId: aiCall.id,
      response: mockMinimalResponse
    })
    
    expect(result.latencyMs).toBeUndefined()
    
    // Verify in database
    const adminClient = testSetup.getAdminClient()
    const { data: persistedCall } = await adminClient
      .from('ai_calls')
      .select('*')
      .eq('id', aiCall.id)
      .single()
    
    expect(persistedCall.latency_ms).toBeNull()
    expect(persistedCall.raw_api_response).toBeDefined()
    expect(persistedCall.raw_api_response.text).toBe('Minimal response without timing data.')
    
    cleanupFunctions.push(async () => {
      await testSetup.getAdminClient().from('ai_calls').delete().eq('id', aiCall.id)
    })
  })
  
  it('should handle large responses efficiently', async () => {
    const userClient = await testSetup.createUserClient(testUserId)
    const aiCallService = new AiCallService(userClient)
    const aiResponseLogger = createAIResponseLogger(aiCallService)
    
    // Create a large response (100KB of text)
    const largeText = 'Lorem ipsum dolor sit amet. '.repeat(4000)
    
    const mockLargeResponse: VercelAIResponse = {
      text: largeText,
      usage: {
        promptTokens: 50000,
        completionTokens: 25000,
        totalTokens: 75000
      },
      finishReason: 'length',
      startTimestamp: Date.now(),
      finishTimestamp: Date.now() + 5000 // 5 second processing
    }
    
    const aiCall = await aiCallService.startCallWithModelString({
      documentId: testDocumentId,
      userId: testUserId,
      modelString: 'anthropic:claude-3-5-haiku:20241022',
      prompt_type: 'structure',
      input_data: { documentLength: 'large' }
    })
    
    const startTime = Date.now()
    const result = await aiResponseLogger.completeAICall({
      aiCallId: aiCall.id,
      response: mockLargeResponse
    })
    const serializationTime = Date.now() - startTime
    
    // Serialization should be reasonably fast even for large responses
    expect(serializationTime).toBeLessThan(1000) // Less than 1 second
    expect(result.latencyMs).toBe(5000)
    
    // Verify in database
    const adminClient = testSetup.getAdminClient()
    const { data: persistedCall } = await adminClient
      .from('ai_calls')
      .select('*')
      .eq('id', aiCall.id)
      .single()
    
    expect(persistedCall.raw_api_response).toBeDefined()
    expect(persistedCall.raw_api_response.text.length).toBe(largeText.length)
    expect(persistedCall.total_tokens).toBe(75000)
    
    cleanupFunctions.push(async () => {
      await testSetup.getAdminClient().from('ai_calls').delete().eq('id', aiCall.id)
    })
  })
})