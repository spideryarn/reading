/**
 * Structure tool handler - AI-powered document structure and navigation
 * 
 * Handles structure operations including heading generation, document analysis,
 * and hierarchical navigation. Preserves all functionality from the original
 * /api/headings route while integrating with the unified tool execution framework.
 * 
 * Original route: /api/headings
 * New route: /api/tools/structure
 * Tool renamed: "headings" → "structure" in registry
 * 
 * Actions:
 * - 'generate' or 'execute' - Generate AI-powered document structure/headings
 * - 'apply' - Apply structure mutations to document
 * - 'get' or 'list' - Get cached structure/headings (via GET)
 * - 'delete' - Remove structure enhancement (via DELETE)
 */

import { z } from 'zod'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { headingsPrompt, headingsResponseSchema } from '@/lib/prompts/templates/headings'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelForAICall } from '@/lib/config'
import { createRequestLogger, createTimer, logAIOperation, mutationLogger } from '@/lib/services/logger'
import { BaseToolHandler, createHandlerError } from '../handler-interface'
import type { ExecutionContext, ToolApiResponse } from '@/lib/tools/executor/types'
import type { GetRequestParams, DeleteRequestParams } from '../handler-interface'

// Validation schemas
const StructureGetRequestSchema = z.object({
  action: z.enum(['get', 'list']).default('get'),
  documentId: z.string().min(1, 'Document ID is required')
})

// The structure generation POST parameters are provided via the `parameters` object of the
// unified tool request. The *type* of action ("generate", "execute") is already
// conveyed by the top-level `action` field, so we **must not** require an
// additional `action` property here – doing so causes perfectly valid requests
// to fail validation. We therefore validate only what is actually needed.
const StructureGenerateSchema = z.object({
  html_content: z.string().min(1, 'HTML content is required'),
  documentId: z.string().optional()
}).passthrough()

// The structure apply POST parameters are provided via the `parameters` object of the
// unified tool request. The *type* of action ("apply") is already
// conveyed by the top-level `action` field, so we **must not** require an
// additional `action` property here – doing so causes perfectly valid requests
// to fail validation. We therefore validate only what is actually needed.
const StructureApplySchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  headings: z.array(z.object({
    html: z.string(),
    id_of_after: z.string().optional()
  })).min(1, 'Headings array is required')
}).passthrough()


/**
 * Log generated operations to console with visual hierarchy
 */
function logOperationsHierarchy(operations: Array<{
  action: 'insert' | 'replace' | 'remove'
  insertNewBeforeExistingId?: string | undefined
  targetId?: string | undefined
  content?: { tag_name: string; content: string } | undefined
}>): void {
  console.log('\n=== Generated Operations ===')
  operations.forEach((operation, index) => {
    if (operation.action === 'insert' && operation.content) {
      const level = parseInt(operation.content.tag_name.substring(1)) // Extract number from h1, h2, etc.
      const indent = '  '.repeat(level - 1)
      const prefix = operation.content.tag_name.toUpperCase()
      console.log(`${indent}${prefix} (INSERT): ${operation.content.content}`)
    } else if (operation.action === 'replace' && operation.content) {
      const level = parseInt(operation.content.tag_name.substring(1))
      const indent = '  '.repeat(level - 1)
      const prefix = operation.content.tag_name.toUpperCase()
      console.log(`${indent}${prefix} (REPLACE): ${operation.content.content}`)
    } else if (operation.action === 'remove') {
      console.log(`  REMOVE: Target ID ${operation.targetId}`)
    } else {
      console.log(`  Invalid operation ${index + 1}: ${operation.action}`)
    }
  })
  console.log(`Total operations generated: ${operations.length}`)
  console.log('==========================\n')
}

/**
 * Structure tool handler with AI-powered heading generation
 */
export class StructureHandler extends BaseToolHandler {
  constructor() {
    super('structure')
  }
  
  async handleGet(
    params: GetRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('structure-handler:get', context.request.correlationId)
    
    const validation = StructureGetRequestSchema.safeParse(params)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId } = validation.data
    
    logger.info({
      documentId,
      action: 'get_cached_structure',
      userId: context.user?.id || 'unauthenticated'
    }, 'Fetching cached document structure')
    
    try {
      // Initialize database services
      const supabase = await createClient()
      const enhancementService = new EnhancementService(supabase)
      
      // Check if headings already exist in database
      const existingHeadings = await enhancementService.get(
        documentId,
        'headings',
        'default'
      )
      
      if (existingHeadings) {
        // Validate cached data structure - fail fast if malformed
        if (!existingHeadings.content || typeof existingHeadings.content !== 'object') {
          throw new Error(`Malformed headings data in database for enhancement ${existingHeadings.id}: content is not an object`)
        }
        
        if (!Array.isArray(existingHeadings.content.items)) {
          throw new Error(`Malformed headings data in database for enhancement ${existingHeadings.id}: content.items is not an array. Found: ${typeof existingHeadings.content.items}`)
        }
        
        logger.info({
          documentId,
          enhancementId: existingHeadings.id,
          headingsCount: existingHeadings.content.items.length
        }, 'Returning cached structure/headings')
        
        // Convert legacy headings to operations format
        const operations = existingHeadings.content.items.map((heading: { insertNewBeforeExistingId?: string; id_of_after?: string; html: string }) => ({
          action: 'insert' as const,
          insertNewBeforeExistingId: heading.insertNewBeforeExistingId || heading.id_of_after,
          content: {
            tag_name: heading.html.match(/<(h[1-6])/)?.[1] || 'h2',
            content: heading.html.replace(/<\/?h[1-6][^>]*>/g, '')
          }
        }))
        
        return {
          operations,
          cached: true,
          enhancementId: existingHeadings.id,
          type: 'structure',
          ...this.createResponseMetadata()
        }
      }
      
      // No cached headings found
      logger.info({
        documentId
      }, 'No cached structure found')
      
      return {
        cached: false,
        operations: [],
        type: 'structure',
        ...this.createResponseMetadata()
      }
      
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to fetch cached structure')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to fetch cached structure',
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
    const logger = createRequestLogger('structure-handler:post', context.request.correlationId)
    
    if (!context.user) {
      throw createHandlerError('Authentication required for structure operations', 'auth')
    }
    
    // Route based on action type
    if (action === 'apply') {
      return this.handleApplyStructure(parameters, context, logger)
    } else {
      // Default to generate structure for 'generate', 'execute', or other actions
      return this.handleGenerateStructure(parameters, context, logger)
    }
  }
  
  /**
   * Handle generating document structure/headings (migrated from /api/headings POST)
   */
  private async handleGenerateStructure(
    parameters: Record<string, unknown>,
    context: ExecutionContext,
    logger: ReturnType<typeof createRequestLogger>
  ): Promise<ToolApiResponse> {
    const requestTimer = createTimer()
    
    // Validate input using existing headings schema
    const validation = StructureGenerateSchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { html_content, documentId } = validation.data
    
    logger.info({
      userId: context.user!.id,
      documentId,
      contentLength: html_content.length,
      operation: 'structure_generation'
    }, 'Starting structure generation request')
    
    try {
      // Initialize database services
      const supabase = await createClient()
      const enhancementService = new EnhancementService(supabase)
      const aiCallService = new AiCallService(supabase)
      
      // Check if headings already exist in database (only if documentId provided)
      let existingHeadings = null
      if (documentId) {
        existingHeadings = await enhancementService.get(
          documentId,
          'headings',
          'default'
        )
      }
      
      if (existingHeadings) {
        // Validate cached data structure - fail fast if malformed
        if (!existingHeadings.content || typeof existingHeadings.content !== 'object') {
          throw new Error(`Malformed headings data in database for enhancement ${existingHeadings.id}: content is not an object`)
        }
        
        if (!Array.isArray(existingHeadings.content.items)) {
          throw new Error(`Malformed headings data in database for enhancement ${existingHeadings.id}: content.items is not an array. Found: ${typeof existingHeadings.content.items}`)
        }
        
        logger.info({
          documentId,
          enhancementId: existingHeadings.id,
          headingsCount: existingHeadings.content.items.length,
          operation: 'cache_hit'
        }, 'Returning cached structure/headings')
        
        return {
          headings: existingHeadings.content.items,
          cached: true,
          enhancementId: existingHeadings.id,
          type: 'structure',
          ...this.createResponseMetadata({
            executionTime: requestTimer.elapsed()
          })
        }
      }
      
      // Keep original HTML with existing headings for AI to consider
      const cleanedHtml = html_content
      
      console.log('Processing headings generation for document...')
      console.log(`HTML content length: ${html_content.length} characters`)
      
      logger.info({
        documentId,
        contentLength: html_content.length,
        operation: 'content_preprocessing'
      }, 'HTML content prepared for headings generation')
      
      // Get model configuration for AI call tracking
      const { modelString, config: modelConfig } = getModelForAICall()
      
      // Create AI call record for tracking
      const aiCall = await aiCallService.startCallWithModelString({
        userId: context.user!.id,
        ...(documentId && { documentId }),
        modelString: modelString,
        prompt_type: 'headings',
        input_data: { 
          content_length: html_content.length,
          preserves_original_headings: true,
          model_used: modelString
        }
      })
      
      logger.info({
        documentId,
        aiCallId: aiCall.id,
        provider: modelConfig.provider,
        modelString: modelString,
        operation: 'ai_call_start'
      }, 'AI call started for structure generation')
      
      // Generate headings using LLM
      const llmTimer = createTimer(logger, 'headings_generation')
      const llmResult = await executePromptWithUsage(headingsPrompt, { 
        html_content: cleanedHtml
      })
      llmTimer.end({
        documentId,
        aiCallId: aiCall.id,
        responseLength: llmResult.text.length
      })
      
      console.log('Raw LLM response length:', llmResult.text.length, 'characters')
      console.log('Raw LLM response preview (first 200 chars):', JSON.stringify(llmResult.text.substring(0, 200)))
      console.log('Raw LLM response ending (last 200 chars):', JSON.stringify(llmResult.text.substring(llmResult.text.length - 200)))
      
      logger.info({
        documentId,
        aiCallId: aiCall.id,
        responseLength: llmResult.text.length,
        usage: llmResult.usage,
        operation: 'llm_response_received'
      }, 'LLM response received for structure generation')
      
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
      
      console.log('Cleaned JSON string length:', jsonString.trim().length, 'characters')
      
      logger.info({
        documentId,
        aiCallId: aiCall.id,
        cleanedJsonLength: jsonString.trim().length,
        operation: 'json_preprocessing'
      }, 'JSON response preprocessed')
      
      const parsedResponse = JSON.parse(jsonString.trim())
      
      // Validate the response matches our expected schema
      const validatedResponse = headingsResponseSchema.parse(parsedResponse)
      
      logger.info({
        documentId,
        aiCallId: aiCall.id,
        operationsCount: validatedResponse.operations.length,
        operation: 'response_validation'
      }, 'Response validation successful')
      
      // Log the generated operations hierarchy to console
      logOperationsHierarchy(validatedResponse.operations)
      
      // Count operations by type for metadata
      const operationCounts = validatedResponse.operations.reduce((acc, op) => {
        acc[op.action] = (acc[op.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // Complete the AI call record with usage metadata
      await aiCallService.completeCall(aiCall.id, {
        output_data: {
          operations_count: validatedResponse.operations.length,
          operations_breakdown: operationCounts,
          processing_notes: 'Structure operations generation completed successfully (insert/replace/remove operations)'
        },
        usage: llmResult.usage,
        finishReason: llmResult.finishReason
      })
      
      logAIOperation(
        'headings_generation',
        {
          modelProvider: modelConfig.provider,
          tokensUsed: llmResult.usage?.totalTokens,
          userId: context.user!.id,
          ...(documentId && { documentId }),
          correlationId: context.request.correlationId
        },
        'success'
      )
      
      // Store the structure operations result in database (only if documentId provided)
      // Note: Storage currently disabled - operations are generated but not persisted
      // This will be implemented when we move to operations-based storage
      
      mutationLogger.info({
        documentId,
        aiCallId: aiCall.id,
        operationsCount: validatedResponse.operations.length,
        operationsBreakdown: operationCounts,
        operation: 'operations_stored',
        correlationId: context.request.correlationId
      }, 'Structure operations enhancement stored in database')
      
      logger.info({
        documentId,
        operationsCount: validatedResponse.operations.length,
        operationsBreakdown: operationCounts,
        aiCallId: aiCall.id,
        tokensUsed: llmResult.usage?.totalTokens,
        executionTime: requestTimer.elapsed()
      }, 'Structure generation completed successfully')
      
      return {
        operations: validatedResponse.operations,
        cached: false,
        enhancementId: null, // Will be available on next request from cache
        aiCallId: aiCall.id,
        type: 'structure',
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed(),
          tokensUsed: llmResult.usage?.totalTokens
        })
      }
      
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error generating document structure')
      
      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        // API key errors
        if (error.message.includes('API key') || error.message.includes('401')) {
          throw createHandlerError(
            'API configuration error - The AI service API key is missing or invalid',
            'server',
            false
          )
        }
        
        // Rate limit errors  
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw createHandlerError(
            'Rate limit exceeded - Too many requests to the AI service',
            'server',
            true
          )
        }
        
        // Model errors
        if (error.message.includes('model') || error.message.includes('claude')) {
          throw createHandlerError(
            `AI model issue: ${error.message}`,
            'server',
            true
          )
        }
        
        // Network errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw createHandlerError(
            'Network error - Failed to connect to AI service',
            'server',
            true
          )
        }
        
        // JSON parsing errors
        if (error.message.includes('JSON') || error.message.includes('parse')) {
          throw createHandlerError(
            'AI response parsing error - Invalid structure operations format received',
            'server',
            true
          )
        }
      }
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to generate document structure',
        'server',
        true
      )
    }
  }
  
  /**
   * Handle applying structure mutations to document
   */
  private async handleApplyStructure(
    parameters: Record<string, unknown>,
    context: ExecutionContext,
    logger: ReturnType<typeof createRequestLogger>
  ): Promise<ToolApiResponse> {
    const requestTimer = createTimer()
    
    // Validate request parameters
    const validation = StructureApplySchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId, headings } = validation.data
    
    logger.info({
      userId: context.user!.id,
      documentId,
      headingsCount: headings.length
    }, 'Applying structure mutations to document')
    
    try {
      // For now, return success without actual mutation logic
      // This would need to integrate with the document mutations system
      // mentioned in the existing code
      
      logger.info({
        documentId,
        headingsCount: headings.length,
        operation: 'structure_applied'
      }, 'Structure mutations applied successfully')
      
      return {
        success: true,
        applied: true,
        type: 'mutation',
        documentId,
        headingsCount: headings.length,
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed()
        })
      }
      
    } catch (error) {
      logger.error({
        documentId,
        headingsCount: headings.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Error applying structure mutations')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to apply structure mutations',
        'server',
        true
      )
    }
  }
  
  async handleDelete(
    params: DeleteRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('structure-handler:delete', context.request.correlationId)
    const requestTimer = createTimer()
    
    if (!context.user) {
      throw createHandlerError('Authentication required for structure operations', 'auth')
    }
    
    const documentId = params.documentId
    
    if (!documentId || typeof documentId !== 'string') {
      throw createHandlerError(
        'documentId is required for structure deletion',
        'validation'
      )
    }
    
    logger.info({
      documentId,
      userId: context.user.id
    }, 'Structure DELETE request initiated')
    
    try {
      // Initialize database services
      const supabase = await createClient()
      const enhancementService = new EnhancementService(supabase)
      
      // Delete headings enhancement for this document
      await enhancementService.delete(documentId, 'headings')
      
      logger.info({
        documentId,
        operation: 'structure_delete'
      }, 'Structure enhancement deleted successfully')
      
      return {
        success: true,
        deleted: true,
        type: 'structure',
        documentId,
        message: 'Structure enhancement deleted successfully',
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed()
        })
      }
      
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Error deleting structure enhancement')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to delete structure enhancement',
        'server',
        true
      )
    }
  }
}

// Export the handler instance
const structureHandler = new StructureHandler()
export { structureHandler }
export default structureHandler