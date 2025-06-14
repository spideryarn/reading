// Multi-Dimensional AI Summarisation API endpoint
// Generates all 9 summaries in a single LLM call using structured JSON output
// See planning/250608b_multiple_summary_granularities.md for architecture

import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { 
  multiSummarisePrompt, 
  multiSummaryOutputSchema,
  type MultiSummaryOutput
} from '@/lib/prompts/templates/multi-summarise'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig, getModelVersion, AI_CONFIG, type ProviderTierKey } from '@/lib/config'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/multi-summarise', correlationId)
  
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      requestLogger.warn({ documentId }, 'GET request missing required documentId parameter')
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    requestLogger.info({ documentId }, 'Checking for cached multi-dimensional summary')
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Check if multi-dimensional summary already exists in database
    const existingSummary = await enhancementService.getMultiSummary(documentId)
    
    if (existingSummary) {
      requestLogger.info({ documentId, cached: true }, 'Cached multi-dimensional summary found')
      return NextResponse.json({ 
        summaries: existingSummary,
        cached: true
      })
    }
    
    // No cached summary found
    requestLogger.info({ documentId, cached: false }, 'No cached multi-dimensional summary found')
    return NextResponse.json({ 
      cached: false,
      summaries: null
    })
  } catch (error) {
    console.error('Error fetching cached multi-summary:', error)
    requestLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to fetch cached multi-summary')
    return NextResponse.json(
      { error: 'Failed to fetch cached multi-summary' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/multi-summarise', correlationId)
  
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      requestLogger.warn({ documentId }, 'DELETE request missing required documentId parameter')
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    requestLogger.info({ documentId }, 'Deleting multi-dimensional summary enhancement')
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Delete multi-dimensional summary enhancement
    await enhancementService.delete(documentId, 'summary', 'multi-dimensional')
    
    requestLogger.info({ documentId }, 'Multi-dimensional summary enhancement deleted successfully')
    return NextResponse.json({ 
      success: true,
      message: 'Multi-dimensional summary enhancement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting multi-summary enhancement:', error)
    requestLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to delete multi-summary enhancement')
    return NextResponse.json(
      { error: 'Failed to delete multi-summary enhancement' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/multi-summarise', correlationId)
  const overallTimer = createTimer(requestLogger, 'multi-dimensional-summary-generation')
  
  try {
    const { content, documentId } = await request.json()
    
    if (!content || typeof content !== 'string') {
      requestLogger.warn({ hasContent: !!content, contentType: typeof content }, 'POST request missing or invalid content parameter')
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }
    
    if (!documentId || typeof documentId !== 'string') {
      requestLogger.warn({ hasDocumentId: !!documentId, documentIdType: typeof documentId }, 'POST request missing or invalid documentId parameter')
      return NextResponse.json(
        { error: 'DocumentId is required and must be a string' },
        { status: 400 }
      )
    }
    
    requestLogger.info({
      documentId,
      contentLength: content.length
    }, 'Multi-dimensional summary generation request initiated')
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    const aiCallService = new AiCallService(supabase)
    
    // Check if multi-dimensional summary already exists
    requestLogger.info({ documentId }, 'Checking for existing multi-dimensional summary')
    const existingSummary = await enhancementService.getMultiSummary(documentId)
    
    if (existingSummary) {
      requestLogger.info({ documentId, cached: true }, 'Returning cached multi-dimensional summary')
      return NextResponse.json({ 
        summaries: existingSummary,
        cached: true
      })
    }
    
    requestLogger.info({ documentId }, 'No existing summary found, proceeding with generation')
    
    // Resolve tier key to actual model details using config
    const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as ProviderTierKey
    const modelConfig = getModelConfig(tierKey)
    const modelVersion = getModelVersion(tierKey)
    
    requestLogger.info({
      documentId,
      tierKey,
      modelProvider: modelConfig.provider,
      modelId: modelConfig.modelId
    }, 'Configured AI model for multi-dimensional summary generation')
    
    // Create AI call tracking for the single multi-summary generation
    let aiCall
    try {
      aiCall = await aiCallService.startCall({
        documentId,
        provider: modelConfig.provider,
        modelId: modelConfig.modelId,
        version: modelVersion,
        prompt_type: 'multi-summarise',
        input_data: { 
          content_length: content.length,
          approach: 'single-prompt-structured-output',
          combinations_count: 9,
          tier_used: tierKey
        }
      })
    } catch (aiCallError) {
      console.error('Failed to create AI call:', aiCallError)
      requestLogger.error({
        documentId,
        error: aiCallError instanceof Error ? aiCallError.message : 'Unknown error',
        modelProvider: modelConfig.provider,
        modelId: modelConfig.modelId
      }, 'Failed to initialize AI call tracking')
      return NextResponse.json(
        { error: 'Failed to initialize AI call tracking' },
        { status: 500 }
      )
    }
    
    // Generate all 9 summaries in a single structured LLM call
    requestLogger.info({
      documentId,
      aiCallId: aiCall.id,
      contentLength: content.length,
      approach: 'single-prompt-structured-output'
    }, 'Starting multi-dimensional summary generation with AI')
    
    const aiTimer = createTimer(requestLogger, 'ai-summary-generation')
    let summaryResult
    try {
      summaryResult = await executePromptWithUsage(multiSummarisePrompt, { content })
      
      aiTimer.end({
        documentId,
        aiCallId: aiCall.id,
        tokensUsed: summaryResult.usage?.totalTokens,
        textLength: summaryResult.text.length
      })
      
      logAIOperation(
        'multi-dimensional-summary-generation',
        {
          modelProvider: modelConfig.provider,
          tokensUsed: summaryResult.usage?.totalTokens,
          documentId,
          correlationId
        },
        'success'
      )
    } catch (summaryError) {
      // Mark AI call as failed
      await aiCallService.failCall(
        aiCall.id,
        summaryError instanceof Error ? summaryError.message : 'Unknown summary generation error'
      )
      
      console.error('Failed to generate multi-dimensional summary:', summaryError)
      requestLogger.error({
        documentId,
        aiCallId: aiCall.id,
        error: summaryError instanceof Error ? summaryError.message : 'Unknown error',
        modelProvider: modelConfig.provider,
        modelId: modelConfig.modelId
      }, 'Failed to generate multi-dimensional summary')
      
      logAIOperation(
        'multi-dimensional-summary-generation',
        {
          modelProvider: modelConfig.provider,
          documentId,
          correlationId
        },
        'error',
        summaryError instanceof Error ? summaryError : new Error('Unknown summary generation error')
      )
      
      return NextResponse.json(
        { error: 'Failed to generate multi-dimensional summary' },
        { status: 500 }
      )
    }
    
    // Parse and validate the structured JSON response
    requestLogger.info({
      documentId,
      aiCallId: aiCall.id,
      rawResponseLength: summaryResult.text.length
    }, 'Parsing and validating structured JSON response')
    
    let parsedSummaries: MultiSummaryOutput
    try {
      // Attempt to parse JSON from the LLM response
      const jsonText = summaryResult.text.trim()
      
      // Handle cases where the response might be wrapped in markdown code blocks
      const cleanJsonText = jsonText.startsWith('```json') 
        ? jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        : jsonText.startsWith('```')
        ? jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
        : jsonText
      
      const rawParsed = JSON.parse(cleanJsonText)
      
      // Validate the structure using Zod schema
      parsedSummaries = multiSummaryOutputSchema.parse(rawParsed)
      
    } catch (parseError) {
      // Mark AI call as failed
      await aiCallService.failCall(
        aiCall.id,
        `JSON parsing/validation failed: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`
      )
      
      console.error('Failed to parse multi-summary JSON:', parseError)
      console.error('Raw LLM response:', summaryResult.text)
      requestLogger.error({
        documentId,
        aiCallId: aiCall.id,
        parseError: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        rawResponseLength: summaryResult.text.length,
        rawResponsePreview: summaryResult.text.substring(0, 500)
      }, 'Failed to parse/validate multi-summary JSON response')
      
      return NextResponse.json(
        { error: 'Invalid JSON response from LLM - failed to parse structured summary output' },
        { status: 500 }
      )
    }
    
    // Complete AI call tracking with success
    try {
      await aiCallService.completeCall(aiCall.id, {
        output_data: {
          text_length: summaryResult.text.length,
          combinations_generated: 9,
          json_structure_valid: true,
          processing_notes: 'Multi-dimensional summary generation completed successfully using single structured prompt'
        },
        usage: summaryResult.usage,
        finishReason: summaryResult.finishReason
      })
    } catch (trackingError) {
      console.error('Failed to complete AI call tracking:', trackingError)
      requestLogger.warn({
        documentId,
        aiCallId: aiCall.id,
        trackingError: trackingError instanceof Error ? trackingError.message : 'Unknown error'
      }, 'Failed to complete AI call tracking, but continuing with summary storage')
      // Continue - the summaries were generated successfully even if tracking failed
    }
    
    // Store in database
    requestLogger.info({
      documentId,
      aiCallId: aiCall.id,
      combinationsGenerated: 9
    }, 'Storing multi-dimensional summary in database')
    
    try {
      const enhancement = await enhancementService.storeMultiSummary(
        documentId,
        { 'single-call': aiCall.id }, // Simple mapping since it's one call
        parsedSummaries,
        {
          generatedAt: new Date().toISOString(),
          modelUsed: modelConfig.modelId,
          tierUsed: tierKey,
          approach: 'single-prompt-structured-output'
        }
      )
      
      const totalDuration = overallTimer.end({
        documentId,
        enhancementId: enhancement.id,
        aiCallId: aiCall.id,
        combinationsGenerated: 9,
        tokensUsed: summaryResult.usage?.totalTokens
      })
      
      requestLogger.info({
        documentId,
        enhancementId: enhancement.id,
        aiCallId: aiCall.id,
        totalCombinations: 9,
        totalDuration,
        tokensUsed: summaryResult.usage?.totalTokens
      }, 'Multi-dimensional summary generation completed successfully')
      
      return NextResponse.json({ 
        summaries: parsedSummaries,
        cached: false,
        enhancementId: enhancement.id,
        totalCombinations: 9,
        aiCallId: aiCall.id,
        approach: 'single-prompt'
      })
    } catch (dbError) {
      // If database storage fails, still return the generated summaries
      console.error('Failed to store multi-summary in database:', dbError)
      requestLogger.error({
        documentId,
        aiCallId: aiCall.id,
        dbError: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, 'Failed to store multi-summary in database, returning generated summaries anyway')
      
      return NextResponse.json({ 
        summaries: parsedSummaries,
        cached: false,
        warning: 'Summaries generated but not saved to database',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        aiCallId: aiCall.id
      })
    }
  } catch (error) {
    console.error('Error generating multi-dimensional summary:', error)
    requestLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Unexpected error in multi-dimensional summary generation')
    
    return NextResponse.json(
      { error: 'Failed to generate multi-dimensional summary' },
      { status: 500 }
    )
  }
}