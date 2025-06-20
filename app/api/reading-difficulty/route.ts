import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { readingDifficultyPrompt, parseReadingDifficultyResponse } from '@/lib/prompts/templates/reading-difficulty'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'
import { createClient } from '@/lib/supabase/server'
import { extractCleanText } from '@/lib/utils/html-text-extraction'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelForAICall } from '@/lib/config'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/reading-difficulty', correlationId)
  const requestTimer = createTimer(requestLogger, 'reading-difficulty-request')
  
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      requestLogger.warn({ correlationId }, 'Unauthorized reading difficulty request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, documentId } = body

    if (!content || typeof content !== 'string') {
      requestLogger.warn({ correlationId, userId: user.id }, 'Invalid content provided')
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Clean the content for analysis
    const cleanText = extractCleanText(content)
    
    if (cleanText.length < 50) {
      requestLogger.warn({ 
        correlationId, 
        userId: user.id, 
        documentId,
        contentLength: cleanText.length 
      }, 'Content too short for analysis')
      return NextResponse.json({ error: 'Content too short for reading difficulty analysis' }, { status: 400 })
    }

    requestLogger.info({
      userId: user.id,
      documentId,
      contentLength: cleanText.length,
      correlationId
    }, 'Reading difficulty analysis initiated')

    // Model configuration for this AI call
    const { modelString, config: modelConfig } = getModelForAICall()

    // Start AI call tracking *before* the LLM call so we capture failures too
    const aiCallService = new AiCallService(supabase)
    const aiCall = await aiCallService.startCallWithModelString({
      userId: user.id,
      documentId: documentId || undefined,
      modelString,
      prompt_type: 'reading-difficulty-assessment',
      input_data: {
        content_length: cleanText.length,
        model_used: modelString
      }
    })

    // LLM assessment – may throw
    const llmResult = await executePromptWithUsage(readingDifficultyPrompt, {
      content: cleanText.substring(0, 8000) // Limit content length for LLM
    })

    // Parse and validate response
    const result = parseReadingDifficultyResponse(llmResult.text)

    // Complete AI call tracking with usage metadata
    await aiCallService.completeCall(aiCall.id, {
      output_data: {
        level: result.level,
        confidence: result.confidence,
        factors: [result.rationale]
      },
      usage: llmResult.usage,
      finishReason: llmResult.finishReason
    })

    // Log AI operation (structured)
    logAIOperation('reading-difficulty-assessment', {
      modelProvider: modelConfig.provider,
      tokensUsed: llmResult.usage.totalTokens,
      userId: user.id,
      documentId,
      correlationId
    }, 'success')

    // Store reading difficulty enhancement
    const enhancementService = new EnhancementService(supabase)
    await enhancementService.upsert({
      documentId: documentId || '',
      aiCallId: aiCall.id,
      type: 'reading_difficulty',
      subtype: 'ai_assessment',
      content: {
        level: result.level,
        confidence: result.confidence,
        factors: [result.rationale]
      },
      extra: {
        content_length: cleanText.length,
        model_provider: 'anthropic',
        assessment_version: '1.0'
      }
    })
    
    requestLogger.info({
      userId: user.id,
      documentId,
      level: result.level,
      confidence: result.confidence,
      tokensUsed: llmResult.usage.totalTokens,
      correlationId
    }, 'Reading difficulty assessment completed and stored')

    requestTimer.end({ 
      userId: user.id, 
      documentId, 
      level: result.level,
      correlationId 
    })

    return NextResponse.json({
      level: result.level,
      confidence: result.confidence >= 0.8 ? 'High' : result.confidence >= 0.6 ? 'Medium' : 'Low',
      factors: [result.rationale] // Convert rationale to single-item factors array for UI compatibility
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    requestLogger.error({
      error: message,
      correlationId
    }, 'Reading difficulty assessment failed')

    requestTimer.end({ 
      correlationId,
      status: 'error' 
    })

    // Expose detailed error only in development; generic message otherwise
    const isDev = process.env.NODE_ENV !== 'production'
    return NextResponse.json(
      { error: isDev ? message : 'Failed to assess reading difficulty' },
      { status: 500 }
    )
  }
}