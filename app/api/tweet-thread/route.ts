import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { tweetThreadPrompt, tweetThreadPromptInputSchema, tweetThreadResponseSchema } from '@/lib/prompts/templates/tweet-thread'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { createProblemDetail } from '@/lib/api/error-utils'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelForAICall } from '@/lib/config'
import { createRequestLogger, generateCorrelationId, logAIOperation } from '@/lib/services/logger'
import { requireAuth } from '@/lib/auth/server-auth'
import type { JsonObject } from '@/lib/types/json'
import { createAIResponseLogger } from '@/lib/services/ai-response-logger'

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/tweet-thread', correlationId)
  
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    requestLogger.info({
      method: 'GET',
      documentId,
      correlationId
    }, 'Tweet thread GET request initiated')
    
    if (!documentId) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/invalid-input',
        title: 'documentId required',
        status: 400,
        detail: 'documentId is required.',
        correlationId
      })
    }
    
    // Initialize database services
    const supabase = await getSupabaseServerClient(request)
    const enhancementService = new EnhancementService(supabase)
    
    // Check if tweet thread already exists in database
    const existingTweetThread = await enhancementService.get(
      documentId,
      'tweet-thread',
      'default'
    )
    
    if (existingTweetThread) {
      // Validate cached data structure
      if (!existingTweetThread.content || typeof existingTweetThread.content !== 'object') {
        throw new Error(`Malformed tweet thread data in database for enhancement ${existingTweetThread.id}: content is not an object`)
      }
      
      const content = existingTweetThread.content as { tweets?: unknown; thread_summary?: unknown; metadata?: unknown }
      if (!Array.isArray(content.tweets)) {
        throw new Error(`Malformed tweet thread data in database for enhancement ${existingTweetThread.id}: content.tweets is not an array`)
      }
      
      return NextResponse.json({ 
        tweets: content.tweets,
        thread_summary: content.thread_summary,
        metadata: content.metadata || {},
        cached: true
      })
    }
    
    // No cached tweet thread found
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/enhancement-not-found',
      title: 'Tweet thread not found',
      status: 404,
      detail: 'No cached tweet thread found.',
      correlationId
    })
  } catch (error) {
    console.error('Error fetching cached tweet thread:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error fetching cached tweet thread')
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/internal-server-error',
      title: 'Failed to fetch cached tweet thread',
      status: 500,
      detail: 'Failed to fetch cached tweet thread.',
      correlationId
    })
  }
}

export async function DELETE(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/tweet-thread', correlationId)
  
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    requestLogger.info({
      method: 'DELETE',
      documentId,
      correlationId
    }, 'Tweet thread DELETE request initiated')
    
    if (!documentId) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/invalid-input',
        title: 'documentId required',
        status: 400,
        detail: 'documentId is required.',
        correlationId
      })
    }
    
    // Initialize database services
    const supabase = await getSupabaseServerClient(request)
    const enhancementService = new EnhancementService(supabase)
    
    // Delete tweet thread enhancement for this document
    await enhancementService.delete(documentId, 'tweet-thread')
    
    requestLogger.info({
      correlationId,
      documentId
    }, 'Tweet thread enhancement deleted successfully')
    
    return NextResponse.json({ 
      success: true,
      message: 'Tweet thread enhancement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting tweet thread enhancement:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error deleting tweet thread enhancement')
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/internal-server-error',
      title: 'Failed to delete tweet thread enhancement',
      status: 500,
      detail: 'Failed to delete tweet thread enhancement.',
      correlationId
    })
  }
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/tweet-thread', correlationId)
  
  try {
    // Validate authentication first
    const user = await requireAuth({ allowBearer: true, request })
    
    const body = await request.json()
    
    requestLogger.info({
      method: 'POST',
      userId: user.id,
      correlationId
    }, 'Tweet thread POST request initiated')

    // Validate input using Zod schema
    const validationResult = tweetThreadPromptInputSchema.safeParse(body)
    if (!validationResult.success) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/invalid-input',
        title: 'Invalid request body',
        status: 400,
        detail: 'Invalid request body',
        correlationId
      })
    }

    const { content, target_length, documentId } = validationResult.data
    
    if (!documentId) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/invalid-input',
        title: 'documentId required',
        status: 400,
        detail: 'documentId is required.',
        correlationId
      })
    }
    
    requestLogger.info({
      correlationId,
      documentId,
      contentLength: content.length,
      targetLength: target_length
    }, 'Starting tweet thread generation process')
    
    // Initialize database services
    const supabase = await getSupabaseServerClient(request)
    const enhancementService = new EnhancementService(supabase)
    const aiCallService = new AiCallService(supabase)
    const aiResponseLogger = createAIResponseLogger(aiCallService)
    
    // Check if tweet thread already exists in database
    const existingTweetThread = await enhancementService.get(
      documentId,
      'tweet-thread',
      'default'
    )
    
    if (existingTweetThread) {
      // Validate cached data structure
      if (!existingTweetThread.content || typeof existingTweetThread.content !== 'object') {
        throw new Error(`Malformed tweet thread data in database for enhancement ${existingTweetThread.id}: content is not an object`)
      }
      
      const content = existingTweetThread.content as { tweets?: unknown; thread_summary?: unknown; metadata?: unknown }
      if (!Array.isArray(content.tweets)) {
        throw new Error(`Malformed tweet thread data in database for enhancement ${existingTweetThread.id}: content.tweets is not an array`)
      }
      
      requestLogger.info({
        correlationId,
        enhancementId: existingTweetThread.id,
        tweetCount: content.tweets.length
      }, 'Returning cached tweet thread from POST request')
      
      return NextResponse.json({ 
        tweets: content.tweets,
        thread_summary: content.thread_summary,
        metadata: content.metadata || {},
        cached: true
      })
    }

    // Log content length for monitoring
    console.log(`Generating tweet thread for content: ${content.length} characters`)
    
    requestLogger.info({
      correlationId,
      documentId,
      contentLength: content.length,
      targetLength: target_length
    }, 'Starting tweet thread generation')

    // Get model configuration for AI call tracking
    const { modelString, config: modelConfig } = getModelForAICall()
    
    // Generate tweet thread using LLM template
    const llmResult = await executePromptWithUsage(tweetThreadPrompt, {
      content: content,
      target_length,
      documentId
    })
    
    // Log AI operation completion
    logAIOperation('tweet-thread-generation', {
      modelProvider: modelConfig.provider,
      tokensUsed: llmResult.usage.totalTokens,
      userId: user.id,
      documentId,
      correlationId
    }, 'success')

    // Handle markdown code blocks in LLM response
    let jsonString = llmResult.text.trim()
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.slice(7)
    }
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.slice(0, -3)
    }

    // Parse and validate the LLM response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonString.trim())
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', parseError)
      
      requestLogger.error({
        correlationId,
        parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        llmResponseLength: jsonString.length
      }, 'Failed to parse LLM response as JSON')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/internal-server-error',
        title: 'Invalid response format from AI model',
        status: 500,
        detail: 'Invalid response format from AI model',
        correlationId
      })
    }

    // Validate response structure - fail fast if invalid
    const validatedResponse = tweetThreadResponseSchema.parse(parsedResponse)

    // Add metadata about processing
    const metadata = {
      content_length: content.length,
      processed_length: content.length,
      tweet_count: validatedResponse.tweets.length
    }
    
    const response = {
      ...validatedResponse,
      metadata
    }
    
    // Store AI call in database for tracking with usage metadata
    // Ensure responseData is a proper JsonObject by handling undefined metadata
    const responseDataForStorage: JsonObject = {
      ...validatedResponse,
      metadata: validatedResponse.metadata || {}
    }
    
    /*
     * Migrate to new AI call tracking workflow: begin with startCallWithModelString
     * then finalise with AIResponseLogger.completeAICall so we capture raw response
     * and latency consistently.
     */
    const startedCall = await aiCallService.startCallWithModelString({
      userId: user.id,
      modelString: modelString,
      prompt_type: 'chat',
      input_data: {
        content_length: content.length,
        target_length
      }
    })

    await aiResponseLogger.completeAICall({
      aiCallId: startedCall.id,
      response: llmResult.rawResponse || {
        text: llmResult.text,
        usage: llmResult.usage,
        finishReason: llmResult.finishReason
      },
      outputData: responseDataForStorage,
      correlationId
    })

    const aiCall = { id: startedCall.id }

    // Store tweet thread enhancement in database
    await enhancementService.storeTweetThread(
      documentId,
      aiCall.id,
      {
        tweets: validatedResponse.tweets.map(tweet => ({
          id: `tweet-${tweet.number}`,
          text: tweet.text
        })),
        metadata: {
          thread_summary: validatedResponse.thread_summary,
          ...metadata
        }
      }
    )
    
    requestLogger.info({
      correlationId,
      documentId,
      aiCallId: aiCall.id,
      tweetCount: validatedResponse.tweets.length,
      tokensUsed: llmResult.usage.totalTokens
    }, 'Tweet thread generated and stored successfully')
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error generating tweet thread:', error)
    
    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('User not authenticated'))) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/auth-required',
        title: 'Authentication required',
        status: 401,
        detail: 'Authentication required.',
        correlationId
      })
    }
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error generating tweet thread')
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/internal-server-error',
      title: 'Failed to generate tweet thread',
      status: 500,
      detail: 'Failed to generate tweet thread',
      correlationId
    })
  }
}