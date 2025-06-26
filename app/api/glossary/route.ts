// AI Glossary API endpoint for entity extraction
// See docs/TOOL_GLOSSARY.md for architecture and usage patterns

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { glossaryPrompt, glossaryPromptInputSchema, glossaryResponseSchema, entitySchema } from '@/lib/prompts/templates/glossary'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { storeIndividualEntities, getIndividualEntities, deleteAllIndividualEntities } from '@/lib/services/database/individual-entity-storage'
import { getModelForAICall, GLOSSARY_CONFIG } from '@/lib/config'
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
    
    const { content, already_entities, documentId, max_entities, existing_entities } = validationResult.data
    
    // Apply default entity limit if not specified
    const entityLimit = max_entities || GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST
    
    // Enforce maximum limit for safety
    const safeEntityLimit = Math.min(entityLimit, GLOSSARY_CONFIG.MAX_TOTAL_ENTITY_LIMIT)
    
    requestLogger.info({
      correlationId,
      documentId,
      contentLength: content.length,
      alreadyEntitiesCount: already_entities?.length || 0,
      existingEntitiesCount: existing_entities?.length || 0,
      entityLimit: safeEntityLimit,
      generateMoreMode: !!existing_entities
    }, 'Starting glossary generation process')
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    const aiCallService = new AiCallService(supabase)
    
    // Check if individual entities already exist in database (only if documentId provided)
    let existingEntities: any[] = []
    if (documentId) {
      existingEntities = await getIndividualEntities(supabase, documentId)
      
      // Also check for legacy bulk storage for backwards compatibility
      const legacyGlossary = await enhancementService.get(documentId, 'glossary', 'default')
      if (legacyGlossary && legacyGlossary.content && Array.isArray(legacyGlossary.content.entities)) {
        existingEntities = [...existingEntities, ...legacyGlossary.content.entities]
      }
    }
    
    if (existingEntities.length > 0 && !existing_entities) {
      // Return cached entities for initial glossary requests (not "Load More" requests)
      requestLogger.info({
        correlationId,
        entityCount: existingEntities.length
      }, 'Returning cached individual entities')
      
      // Check if cached result hit the entity limit (indicating more entities might be available)
      const hasMore = existingEntities.length >= GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST
      
      return NextResponse.json({ 
        entities: existingEntities,
        cached: true,
        enhancementId: null, // Individual storage doesn't have single enhancement ID
        hasMore,
        more_entities_available: hasMore // For backwards compatibility and consistency
      })
    }
    
    // Debug: Log content length
    console.log(`Processing glossary (${Math.round(content.length/1000)}k chars)`)
    
    // Get model configuration for AI call tracking
    const { modelString, config: modelConfig } = getModelForAICall()
    
    // Create AI call record for tracking
    const aiCallOptions: Parameters<typeof aiCallService.startCallWithModelString>[0] = {
      userId: user.id,
      modelString: modelString,
      prompt_type: 'glossary',
      input_data: { 
        content_length: content.length,
        already_entities_count: already_entities?.length || 0,
        existing_entities_count: existing_entities?.length || 0,
        entity_limit: safeEntityLimit,
        generate_more_mode: !!existing_entities,
        model_used: modelString
      }
    }
    if (documentId) {
      aiCallOptions.documentId = documentId
    }
    const aiCall = await aiCallService.startCallWithModelString(aiCallOptions)
    
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
      already_entities,
      max_entities: safeEntityLimit,
      existing_entities,
      include_scoring: true // Enable difficulty and centrality scoring
    })
    
    // Log AI operation completion
    const logData: {
      modelProvider: string
      tokensUsed: number
      userId: string
      documentId?: string
      correlationId: string
    } = {
      modelProvider: modelConfig.provider,
      tokensUsed: llmResult.usage.totalTokens,
      userId: user.id,
      correlationId
    }
    if (documentId) {
      logData.documentId = documentId
    }
    logAIOperation('glossary-generation', logData, 'success')
    
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
    
    // Store entities individually in database (only if documentId provided)
    if (documentId) {
      // Clean entities to remove undefined properties for exactOptionalPropertyTypes compliance
      const cleanedEntities = validatedResponse.entities.map(entity => {
        const cleaned: Partial<z.infer<typeof entitySchema>> = {
          name: entity.name,
          ontology: entity.ontology,
          aliases: entity.aliases,
          brief_explanation: entity.brief_explanation
        }
        if (entity.long_explanation !== undefined) cleaned.long_explanation = entity.long_explanation
        if (entity.datetime !== undefined) cleaned.datetime = entity.datetime
        if (entity.url !== undefined) cleaned.url = entity.url
        if (entity.extra !== undefined) cleaned.extra = entity.extra
        return cleaned
      })
      
      // Store each entity individually with the same AI call ID
      await storeIndividualEntities(supabase, documentId, aiCall.id, cleanedEntities)
      
      requestLogger.info({
        correlationId,
        documentId,
        aiCallId: aiCall.id,
        entityCount: cleanedEntities.length,
        storageMethod: 'individual'
      }, 'Entities stored individually in database')
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
    
    // Use LLM's completion signal or fallback to entity count check
    const hasMore = validatedResponse.more_entities_available ?? (validatedResponse.entities.length >= safeEntityLimit)
    
    return NextResponse.json({
      ...validatedResponse,
      cached: false,
      enhancementId: null, // Will be available on next request from cache
      hasMore
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
    
    // Delete individual entities and legacy bulk storage
    await deleteAllIndividualEntities(supabase, documentId)
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