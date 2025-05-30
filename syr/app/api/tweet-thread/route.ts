import { NextRequest, NextResponse } from 'next/server'
import { executePrompt } from '@/lib/prompts/types'
import { tweetThreadPrompt, tweetThreadInputSchema, tweetThreadResponseSchema } from '@/lib/prompts/templates/tweet-thread'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input using Zod schema
    const validationResult = tweetThreadInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error },
        { status: 400 }
      )
    }

    const { content, target_length } = validationResult.data

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

    // Validate response structure
    const validatedResponse = tweetThreadResponseSchema.parse(parsedResponse)

    // Add metadata about processing
    const response = {
      ...validatedResponse,
      metadata: {
        content_length: content.length,
        processed_length: processedContent.length,
        truncated,
        tweet_count: validatedResponse.tweets.length
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error generating tweet thread:', error)
    return NextResponse.json(
      { error: 'Failed to generate tweet thread' },
      { status: 500 }
    )
  }
}