import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { tweetThreadPrompt, tweetThreadPromptInputSchema, tweetThreadResponseSchema } from '@/lib/prompts/templates/tweet-thread'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig } from '@/lib/config'
import { createRequestLogger, generateCorrelationId, logAIOperation } from '@/lib/services/logger'

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
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
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
      
      if (!Array.isArray(existingTweetThread.content.tweets)) {
        throw new Error(`Malformed tweet thread data in database for enhancement ${existingTweetThread.id}: content.tweets is not an array`)
      }
      
      return NextResponse.json({ 
        tweets: existingTweetThread.content.tweets,
        thread_summary: existingTweetThread.content.thread_summary,
        metadata: existingTweetThread.content.metadata || {},
        cached: true
      })
    }
    
    // No cached tweet thread found
    return NextResponse.json(
      { error: 'No cached tweet thread found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error fetching cached tweet thread:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error fetching cached tweet thread')
    
    return NextResponse.json(
      { error: 'Failed to fetch cached tweet thread' },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
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
    
    return NextResponse.json(
      { error: 'Failed to delete tweet thread enhancement' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/tweet-thread', correlationId)
  
  try {
    const body = await request.json()
    
    requestLogger.info({
      method: 'POST',
      correlationId
    }, 'Tweet thread POST request initiated')

    // Validate input using Zod schema
    const validationResult = tweetThreadPromptInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error },
        { status: 400 }
      )
    }

    const { content, target_length, documentId } = validationResult.data
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    requestLogger.info({
      correlationId,
      documentId,
      contentLength: content.length,
      targetLength: target_length
    }, 'Starting tweet thread generation process')
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    const aiCallService = new AiCallService(supabase)
    
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
      
      if (!Array.isArray(existingTweetThread.content.tweets)) {
        throw new Error(`Malformed tweet thread data in database for enhancement ${existingTweetThread.id}: content.tweets is not an array`)
      }
      
      requestLogger.info({
        correlationId,
        enhancementId: existingTweetThread.id,
        tweetCount: existingTweetThread.content.tweets.length
      }, 'Returning cached tweet thread from POST request')
      
      return NextResponse.json({ 
        tweets: existingTweetThread.content.tweets,
        thread_summary: existingTweetThread.content.thread_summary,
        metadata: existingTweetThread.content.metadata || {},
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

    // Resolve tier to provider + modelId for database storage
    const modelConfig = getModelConfig()
    
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
      
      return NextResponse.json(
        { error: 'Invalid response format from AI model' },
        { status: 500 }
      )
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
    const aiCall = await aiCallService.create({
      provider: modelConfig.provider,
      modelId: modelConfig.modelId,
      promptTokens: llmResult.usage.promptTokens,
      completionTokens: llmResult.usage.completionTokens,
      totalTokens: llmResult.usage.totalTokens,
      requestData: {
        content: content,
        target_length
      },
      responseData: validatedResponse
    })
    
    // Store tweet thread enhancement in database
    await enhancementService.storeTweetThread(
      documentId,
      aiCall.id,
      {
        tweets: validatedResponse.tweets,
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
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error generating tweet thread')
    
    return NextResponse.json(
      { error: 'Failed to generate tweet thread' },
      { status: 500 }
    )
  }
}