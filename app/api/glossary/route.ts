// AI Glossary API endpoint for entity extraction
// See docs/TOOL_GLOSSARY.md for architecture and usage patterns

import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { glossaryPrompt, glossaryPromptInputSchema, glossaryResponseSchema } from '@/lib/prompts/templates/glossary'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelForAICall } from '@/lib/config'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer } from '@/lib/services/logger'
import { validateAuth } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/glossary', correlationId)
  const requestTimer = createTimer(requestLogger, 'glossary-request')
  
  try {
    // Validate authentication first
    const user = await validateAuth()
    
    const body = await request.json()
    
    requestLogger.info({
      method: 'POST',
      userId: user.id,
      correlationId
    }, 'Glossary generation request initiated')
    
    // Validate input
    const validationResult = glossaryPromptInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error },
        { status: 400 }
      )
    }
    
    const { content, already_entities, documentId } = validationResult.data
    
    requestLogger.info({
      correlationId,
      documentId,
      contentLength: content.length,
      alreadyEntitiesCount: already_entities?.length || 0
    }, 'Starting glossary generation process')
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    const aiCallService = new AiCallService(supabase)
    
    // Check if glossary already exists in database (only if documentId provided)
    let existingGlossary = null
    if (documentId) {
      existingGlossary = await enhancementService.get(
        documentId,
        'glossary',
        'default'
      )
    }
    
    if (existingGlossary) {
      // Validate cached data structure - fail fast if malformed
      if (!existingGlossary.content || typeof existingGlossary.content !== 'object') {
        throw new Error(`Malformed glossary data in database for enhancement ${existingGlossary.id}: content is not an object`)
      }
      
      if (!Array.isArray(existingGlossary.content.entities)) {
        throw new Error(`Malformed glossary data in database for enhancement ${existingGlossary.id}: content.entities is not an array. Found: ${typeof existingGlossary.content.entities}`)
      }
      
      requestLogger.info({
        correlationId,
        enhancementId: existingGlossary.id,
        entityCount: existingGlossary.content.entities.length
      }, 'Returning cached glossary')
      
      return NextResponse.json({ 
        entities: existingGlossary.content.entities,
        cached: true,
        enhancementId: existingGlossary.id
      })
    }
    
    // Debug: Log content length
    console.log(`Processing glossary (${Math.round(content.length/1000)}k chars)`)
    
    // Get model configuration for AI call tracking
    const { modelString, config: modelConfig } = getModelForAICall()
    
    // Create AI call record for tracking
    const aiCall = await aiCallService.startCallWithModelString({
      userId: user.id,
      documentId: documentId || undefined,
      modelString: modelString,
      prompt_type: 'glossary',
      input_data: { 
        content_length: content.length,
        already_entities_count: already_entities?.length || 0,
        model_used: modelString
      }
    })
    
    requestLogger.info({
      correlationId,
      documentId,
      modelProvider: modelConfig.provider,
      modelString: modelString,
      aiCallId: aiCall.id
    }, 'Starting AI glossary generation')
    
    // Use real LLM processing - no fallback
    const llmResult = await executePromptWithUsage(glossaryPrompt, { 
      content,
      already_entities 
    })
    
    // Log AI operation completion
    logAIOperation('glossary-generation', {
      modelProvider: modelConfig.provider,
      tokensUsed: llmResult.usage.totalTokens,
      userId: user.id,
      documentId,
      correlationId
    }, 'success')
    
    // Parse the JSON response from LLM (strip markdown code blocks if present)
    let jsonString = llmResult.text.trim()
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.slice(7) // Remove ```json
    }
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.slice(3) // Remove ```
    }
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.slice(0, -3) // Remove ending ```
    }
    const parsedResponse = JSON.parse(jsonString.trim())
    
    // Debug: Log the parsed LLM response summary
    console.log(`LLM Response: ${parsedResponse.entities?.length || 0} entities`)
    
    // Validate the response matches our expected schema
    const validatedResponse = glossaryResponseSchema.parse(parsedResponse)
    
    // Complete the AI call record with usage metadata
    await aiCallService.completeCall(aiCall.id, {
      output_data: {
        entities_count: validatedResponse.entities.length,
        processing_notes: 'Glossary generation completed successfully'
      },
      usage: llmResult.usage,
      finishReason: llmResult.finishReason
    })
    
    // Store the glossary result in database (only if documentId provided)
    if (documentId) {
      await enhancementService.storeGlossary(
        documentId,
        aiCall.id,
      {
        entities: validatedResponse.entities,
        metadata: {
          content_length: content.length,
          entities_count: validatedResponse.entities.length,
          tier_used: modelString,
          model_used: modelString
        }
      }
    )
    }
    
    requestLogger.info({
      correlationId,
      documentId,
      aiCallId: aiCall.id,
      entityCount: validatedResponse.entities.length,
      tokensUsed: llmResult.usage.totalTokens
    }, 'Glossary generation completed and stored successfully')
    
    // Complete request timing
    requestTimer.end({
      userId: user.id,
      documentId,
      entityCount: validatedResponse.entities.length,
      tokensUsed: llmResult.usage.totalTokens,
      correlationId
    })
    
    return NextResponse.json({
      ...validatedResponse,
      cached: false,
      enhancementId: null // Will be available on next request from cache
    })
  } catch (error) {
    console.error('Error generating glossary:', error)
    
    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('User not authenticated'))) {
      return new NextResponse('Authentication required', { status: 401 })
    }
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error generating glossary')
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate glossary'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/glossary', correlationId)
  const requestTimer = createTimer(requestLogger, 'glossary-delete-request')
  
  try {
    const body = await request.json()
    const { documentId } = body
    
    requestLogger.info({
      method: 'DELETE',
      documentId,
      correlationId
    }, 'Glossary DELETE request initiated')
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Delete the glossary enhancement
    await enhancementService.delete(documentId, 'glossary')
    
    requestLogger.info({
      correlationId,
      documentId
    }, 'Glossary enhancement deleted successfully')
    
    // Complete request timing
    requestTimer.end({
      documentId,
      correlationId
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting glossary:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error deleting glossary')
    
    return NextResponse.json(
      { error: 'Failed to delete glossary' },
      { status: 500 }
    )
  }
}