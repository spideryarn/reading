/**
 * Glossary tool handler - migrated from /api/glossary
 * 
 * Handles AI-powered entity extraction and glossary generation.
 * This demonstrates migration from individual API routes to the unified
 * tool execution framework.
 * 
 * Original route: /api/glossary
 * New route: /api/tools/glossary
 */

import { z } from 'zod'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { glossaryPrompt, glossaryPromptInputSchema, glossaryResponseSchema, entitySchema } from '@/lib/prompts/templates/glossary'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { storeIndividualEntities, getIndividualEntities, deleteAllIndividualEntities } from '@/lib/services/database/individual-entity-storage'
import { getModelForAICall, GLOSSARY_CONFIG } from '@/lib/config'
import { createRequestLogger, logAIOperation, createTimer } from '@/lib/services/logger'
import { BaseToolHandler, createHandlerError } from '../handler-interface'
import type { ExecutionContext, ToolApiResponse } from '@/lib/tools/executor/types'
import type { GetRequestParams, DeleteRequestParams } from '../handler-interface'

// Validation schemas
const GlossaryGetRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  type: z.enum(['entities', 'all']).default('all')
})

const GlossaryPostRequestSchema = z.object({
  action: z.enum(['execute', 'generate', 'refresh']).default('execute'),
  ...glossaryPromptInputSchema.shape
})

/**
 * Glossary tool handler
 */
export class GlossaryHandler extends BaseToolHandler {
  constructor() {
    super('glossary')
  }
  
  async handleGet(
    params: GetRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('glossary-handler:get', context.request.correlationId)
    
    const validation = GlossaryGetRequestSchema.safeParse(params)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId, type } = validation.data
    
    logger.info({
      documentId,
      type,
      userId: context.user?.id
    }, 'Getting glossary entities')
    
    try {
      // Initialize database client
      const supabase = await createClient()
      
      // Get individual entities from database
      const existingEntities = await getIndividualEntities(supabase, documentId)
      
      // Also check for legacy bulk storage for backwards compatibility
      let legacyEntities: any[] = []
      if (existingEntities.length === 0) {
        const enhancementService = new EnhancementService(supabase)
        const legacyGlossary = await enhancementService.get(documentId, 'glossary', 'default')
        if (legacyGlossary && legacyGlossary.content && Array.isArray(legacyGlossary.content.entities)) {
          legacyEntities = legacyGlossary.content.entities
        }
      }
      
      const allEntities = [...existingEntities, ...legacyEntities]
      
      // Check if cached result hit the entity limit (indicating more entities might be available)
      const hasMore = allEntities.length >= GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST
      
      logger.info({
        documentId,
        entityCount: allEntities.length,
        hasLegacyEntities: legacyEntities.length > 0
      }, 'Retrieved glossary entities')
      
      return {
        entities: allEntities,
        cached: true,
        enhancementId: null, // Individual storage doesn't have single enhancement ID
        hasMore,
        more_entities_available: hasMore, // For backwards compatibility
        ...this.createResponseMetadata({
          entityCount: allEntities.length
        })
      }
      
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to get glossary entities')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to retrieve glossary entities',
        'server',
        true
      )
    }
  }
  
  async handlePost(
    action: string,
    parameters: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('glossary-handler:post', context.request.correlationId)
    const requestTimer = createTimer()
    
    // Validate user is authenticated
    if (!context.user) {
      throw createHandlerError('Authentication required for glossary generation', 'auth')
    }
    
    // Validate request parameters
    const validation = GlossaryPostRequestSchema.safeParse({
      action,
      ...parameters
    })
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { content, already_entities, documentId, max_entities, existing_entities } = validation.data
    
    // Apply default entity limit if not specified
    const entityLimit = max_entities || GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST
    
    // Enforce maximum limit for safety
    const safeEntityLimit = Math.min(entityLimit, GLOSSARY_CONFIG.MAX_TOTAL_ENTITY_LIMIT)
    
    logger.info({
      documentId,
      contentLength: content.length,
      alreadyEntitiesCount: already_entities?.length || 0,
      existingEntitiesCount: existing_entities?.length || 0,
      entityLimit: safeEntityLimit,
      generateMoreMode: !!existing_entities,
      userId: context.user.id
    }, 'Starting glossary generation process')
    
    try {
      // Initialize database services
      const supabase = await createClient()
      const enhancementService = new EnhancementService(supabase)
      
      // Check if individual entities already exist in database (only if documentId provided)
      let existingEntitiesInDb: any[] = []
      if (documentId) {
        existingEntitiesInDb = await getIndividualEntities(supabase, documentId)
        
        // Also check for legacy bulk storage for backwards compatibility
        const legacyGlossary = await enhancementService.get(documentId, 'glossary', 'default')
        if (legacyGlossary && legacyGlossary.content && Array.isArray(legacyGlossary.content.entities)) {
          existingEntitiesInDb = [...existingEntitiesInDb, ...legacyGlossary.content.entities]
        }
      }
      
      // Return cached entities for initial glossary requests (not "Load More" requests)
      if (existingEntitiesInDb.length > 0 && !existing_entities) {
        logger.info({
          entityCount: existingEntitiesInDb.length
        }, 'Returning cached individual entities')
        
        // Check if cached result hit the entity limit (indicating more entities might be available)
        const hasMore = existingEntitiesInDb.length >= GLOSSARY_CONFIG.DEFAULT_ENTITY_LIMIT_PER_REQUEST
        
        return { 
          entities: existingEntitiesInDb,
          cached: true,
          enhancementId: null, // Individual storage doesn't have single enhancement ID
          hasMore,
          more_entities_available: hasMore, // For backwards compatibility and consistency
          ...this.createResponseMetadata({
            entityCount: existingEntitiesInDb.length
          })
        }
      }
      
      // Debug: Log content length
      console.log(`Processing glossary (${Math.round(content.length/1000)}k chars)`)
      
      // Get model configuration for AI call tracking
      const { modelString, config: modelConfig } = getModelForAICall()
      
      // Create AI call record for tracking
      const aiCallService = new AiCallService(supabase)
      const aiCallOptions: Parameters<typeof aiCallService.startCallWithModelString>[0] = {
        userId: context.user.id,
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
      
      logger.info({
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
        userId: context.user.id,
        correlationId: context.request.correlationId
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
        
        logger.info({
          documentId,
          aiCallId: aiCall.id,
          entityCount: cleanedEntities.length,
          storageMethod: 'individual'
        }, 'Entities stored individually in database')
      }
      
      logger.info({
        documentId,
        aiCallId: aiCall.id,
        entityCount: validatedResponse.entities.length,
        tokensUsed: llmResult.usage.totalTokens
      }, 'Glossary generation completed and stored successfully')
      
      // Complete request timing
      const executionTime = requestTimer.elapsed()
      
      // Use LLM's completion signal or fallback to entity count check
      const hasMore = validatedResponse.more_entities_available ?? (validatedResponse.entities.length >= safeEntityLimit)
      
      return {
        ...validatedResponse,
        cached: false,
        enhancementId: null, // Will be available on next request from cache
        hasMore,
        ...this.createResponseMetadata({
          executionTime,
          entityCount: validatedResponse.entities.length,
          tokensUsed: llmResult.usage.totalTokens,
          aiCallId: aiCall.id
        })
      }
      
    } catch (error) {
      logger.error({
        documentId: parameters.documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error generating glossary')
      
      // Handle authentication errors specifically
      if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('User not authenticated'))) {
        throw createHandlerError('Authentication required for glossary generation', 'auth')
      }
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to generate glossary',
        'server',
        true
      )
    }
  }
  
  async handleDelete(
    params: DeleteRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('glossary-handler:delete', context.request.correlationId)
    const requestTimer = createTimer()
    
    const documentId = params.documentId
    if (!documentId || typeof documentId !== 'string') {
      throw createHandlerError(
        'documentId is required for glossary deletion',
        'validation'
      )
    }
    
    logger.info({
      documentId,
      userId: context.user?.id
    }, 'Glossary DELETE request initiated')
    
    try {
      // Initialize database services
      const supabase = await createClient()
      const enhancementService = new EnhancementService(supabase)
      
      // Delete individual entities and legacy bulk storage
      await deleteAllIndividualEntities(supabase, documentId)
      await enhancementService.delete(documentId, 'glossary')
      
      logger.info({
        documentId
      }, 'Glossary enhancement deleted successfully')
      
      return {
        success: true,
        deleted: true,
        documentId,
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed()
        })
      }
      
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Error deleting glossary')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to delete glossary',
        'server',
        true
      )
    }
  }
}

// Export the handler instance
const glossaryHandler = new GlossaryHandler()
export default glossaryHandler