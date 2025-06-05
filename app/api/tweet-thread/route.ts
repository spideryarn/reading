import { NextRequest, NextResponse } from 'next/server'
import { executePrompt } from '@/lib/prompts/types'
import { tweetThreadPrompt, tweetThreadPromptInputSchema, tweetThreadResponseSchema } from '@/lib/prompts/templates/tweet-thread'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
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
      'tweet_thread'
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
    return NextResponse.json(
      { error: 'Failed to fetch cached tweet thread' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
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
    await enhancementService.delete(documentId, 'tweet_thread')
    
    return NextResponse.json({ 
      success: true,
      message: 'Tweet thread enhancement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting tweet thread enhancement:', error)
    return NextResponse.json(
      { error: 'Failed to delete tweet thread enhancement' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    const aiCallService = new AiCallService(supabase)
    
    // Check if tweet thread already exists in database
    const existingTweetThread = await enhancementService.get(
      documentId,
      'tweet_thread'
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

    // Log content length for monitoring
    console.log(`Generating tweet thread for content: ${content.length} characters`)

    // Handle oversized content (truncate if too long)
    const MAX_CONTENT_LENGTH = 50000 // Characters
    let processedContent = content
    let truncated = false

    if (content.length > MAX_CONTENT_LENGTH) {
      processedContent = content.substring(0, MAX_CONTENT_LENGTH)
      truncated = true
      console.log(`Content truncated from ${content.length} to ${MAX_CONTENT_LENGTH} characters`)
    }

    // Resolve tier to provider + modelId for database storage
    const modelConfig = getModelConfig()
    
    // Generate tweet thread using LLM template
    const llmResponse = await executePrompt(tweetThreadPrompt, {
      content: processedContent,
      target_length
    })

    // Handle markdown code blocks in LLM response
    let jsonString = llmResponse.trim()
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
      return NextResponse.json(
        { error: 'Invalid response format from AI model' },
        { status: 500 }
      )
    }

    // Validate response structure with graceful degradation
    let validatedResponse
    try {
      validatedResponse = tweetThreadResponseSchema.parse(parsedResponse)
    } catch (validationError) {
      console.warn('Tweet thread validation failed, applying graceful degradation:', validationError)
      
      // Apply graceful fixes to the response
      const fixedResponse = {
        ...parsedResponse,
        tweets: parsedResponse.tweets?.map((tweet: { number?: number; text?: string }, index: number) => ({
          number: tweet.number || index + 1,
          text: typeof tweet.text === 'string' && tweet.text.length > 270 
            ? tweet.text.substring(0, 267) + '...' 
            : tweet.text || 'Error processing tweet'
        })) || [],
        thread_summary: parsedResponse.thread_summary || 'Generated tweet thread'
      }
      
      // Try validation again with fixed response
      validatedResponse = tweetThreadResponseSchema.parse(fixedResponse)
    }

    // Add metadata about processing
    const metadata = {
      content_length: content.length,
      processed_length: processedContent.length,
      truncated,
      tweet_count: validatedResponse.tweets.length
    }
    
    const response = {
      ...validatedResponse,
      metadata
    }
    
    // Store AI call in database for tracking
    const aiCall = await aiCallService.create({
      provider: modelConfig.provider,
      modelId: modelConfig.modelId,
      promptTokens: null, // Not available from executePrompt
      completionTokens: null,
      totalTokens: null,
      requestData: {
        content: processedContent,
        target_length
      },
      responseData: validatedResponse
    })
    
    // Store tweet thread enhancement in database
    await enhancementService.upsert({
      documentId: documentId,
      aiCallId: aiCall.id,
      type: 'tweet_thread',
      content: {
        tweets: validatedResponse.tweets,
        thread_summary: validatedResponse.thread_summary,
        metadata
      }
    })
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error generating tweet thread:', error)
    return NextResponse.json(
      { error: 'Failed to generate tweet thread' },
      { status: 500 }
    )
  }
}