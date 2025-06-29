/**
 * Summary tool handler - unified implementation combining single and multi-level summaries
 * 
 * Handles both single summary generation and multi-dimensional (hierarchical) summary
 * generation through action-based routing. This demonstrates migration from separate
 * API routes to the unified tool execution framework.
 * 
 * Original routes:
 * - /api/summarise - single summary with configurable granularity
 * - /api/multi-summarise - hierarchical 9-combination summaries
 * 
 * New route: /api/tools/summary
 * Actions:
 * - 'generate' or 'execute' - single summary generation
 * - 'multi-summarise' - multi-dimensional summary generation
 */

import { z } from 'zod'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { 
  summarisePrompt, 
  getMaxTokensForGranularity, 
  getGranularityInstruction,
  type GranularityKey 
} from '@/lib/prompts/templates/summarise'
import { 
  multiSummarisePrompt, 
  multiSummaryOutputSchema,
  type MultiSummaryOutput
} from '@/lib/prompts/templates/multi-summarise'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelForAICall } from '@/lib/config'
import { createRequestLogger, logAIOperation, createTimer } from '@/lib/services/logger'
import { BaseToolHandler, createHandlerError } from '../handler-interface'
import type { ExecutionContext, ToolApiResponse } from '@/lib/tools/executor/types'
import type { GetRequestParams, DeleteRequestParams } from '../handler-interface'

// Validation schemas
const SummaryGetRequestSchema = z.object({
  action: z.enum(['get', 'list']).default('get'),
  documentId: z.string().min(1, 'Document ID is required'),
  granularity: z.string().optional(),
  type: z.enum(['single', 'multi-summarise', 'all']).default('all')
})

const SingleSummaryPostRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  documentId: z.string().min(1, 'Document ID is required'),
  granularity: z.string().optional(),
  sectionId: z.string().optional()
}).passthrough()

// The multi-summary POST parameters are provided via the `parameters` object of the
// unified tool request. The *type* of action ("multi-summarise") is already
// conveyed by the top-level `action` field, so we **must not** require an
// additional `action` property here – doing so causes perfectly valid requests
// to fail validation.  We therefore validate only what is actually needed.
const MultiSummaryPostRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  documentId: z.string().min(1, 'Document ID is required')
}).passthrough()

/**
 * Summary tool handler with unified single/multi-level functionality
 */
export class SummaryHandler extends BaseToolHandler {
  constructor() {
    super('summary')
  }
  
  async handleGet(
    params: GetRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('summary-handler:get', context.request.correlationId)
    
    const validation = SummaryGetRequestSchema.safeParse(params)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId, granularity, type } = validation.data
    
    logger.info({
      documentId,
      granularity,
      type,
      userId: context.user?.id
    }, 'Getting summary data')
    
    try {
      // Initialize database services
      const supabase = context.supabaseClient!
      const enhancementService = new EnhancementService(supabase)
      
      if (type === 'single' || (type === 'all' && granularity)) {
        // Get single summary
        const existingSummary = await enhancementService.get(
          documentId,
          'summary',
          granularity || undefined
        )
        
        if (existingSummary) {
          // Validate cached data structure
          if (!existingSummary.content || typeof existingSummary.content !== 'object') {
            throw new Error(`Malformed summary data in database for enhancement ${existingSummary.id}: content is not an object`)
          }
          
          if (typeof existingSummary.content.text !== 'string') {
            throw new Error(`Malformed summary data in database for enhancement ${existingSummary.id}: content.text is not a string`)
          }
          
          logger.info({
            enhancementId: existingSummary.id,
            textLength: existingSummary.content.text.length,
            documentId,
            granularity
          }, 'Returning cached single summary')
          
          return {
            summary: existingSummary.content.text,
            type: 'single',
            cached: true,
            enhancementId: existingSummary.id,
            metadata: existingSummary.content.metadata || {},
            ...this.createResponseMetadata()
          }
        }
        
        // No cached single summary found
        logger.info({ documentId, granularity }, 'No cached single summary found')
        return {
          cached: false,
          summary: null,
          type: 'single',
          ...this.createResponseMetadata()
        }
      } else if (type === 'multi-summarise' || type === 'all') {
        // Get multi-dimensional summary
        const existingMultiSummary = await enhancementService.getMultiSummary(documentId)
        
        if (existingMultiSummary) {
          logger.info({ documentId, cached: true }, 'Returning cached multi-dimensional summary')
          return {
            summaries: existingMultiSummary,
            type: 'multi-summarise',
            cached: true,
            ...this.createResponseMetadata()
          }
        }
        
        // No cached multi-summary found
        logger.info({ documentId, cached: false }, 'No cached multi-dimensional summary found')
        return {
          cached: false,
          summaries: null,
          type: 'multi-summarise',
          ...this.createResponseMetadata()
        }
      }
      
      // Default case for 'all' type
      return {
        cached: false,
        summary: null,
        summaries: null,
        type: 'all',
        ...this.createResponseMetadata()
      }
      
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to get summary data')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to retrieve summary data',
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
    const logger = createRequestLogger('summary-handler:post', context.request.correlationId)
    
    // Validate user is authenticated
    if (!context.user) {
      throw createHandlerError('Authentication required for summary operations', 'auth')
    }
    
    // Check for mode parameter to support new pattern
    const mode = parameters.mode as string | undefined
    
    // Route based on action type or mode
    // Note: We use 'multi-summarise' as the canonical action name. 
    // Previously supported aliases ('multi', 'hierarchical') have been removed for cleaner codebase.
    if (action === 'multi-summarise' || mode === 'multi-summarise') {
      return this.handleMultiLevelSummary(parameters, context, logger)
    } else {
      // Default to single summary for 'execute', 'generate', 'refresh'
      return this.handleSingleSummary(parameters, context, logger)
    }
  }
  
  /**
   * Handle single summary generation (migrated from /api/summarise)
   */
  private async handleSingleSummary(
    parameters: Record<string, unknown>,
    context: ExecutionContext,
    logger: ReturnType<typeof createRequestLogger>
  ): Promise<ToolApiResponse> {
    const requestTimer = createTimer()
    
    // Validate request parameters
    const validation = SingleSummaryPostRequestSchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { content, documentId, granularity, sectionId } = validation.data
    
    logger.info({
      userId: context.user!.id,
      documentId,
      granularity,
      sectionId,
      contentLength: content.length
    }, 'Starting single summary generation')
    
    try {
      // Initialize database services
      const supabase = context.supabaseClient!
      const enhancementService = new EnhancementService(supabase)
      const aiCallService = new AiCallService(supabase)
      
      // Check if summary already exists in database
      // Use sectionId for section-specific caching, or granularity for document-level caching
      const cacheKey = sectionId || (granularity || undefined)
      const existingSummary = await enhancementService.get(
        documentId,
        'summary',
        cacheKey
      )
      
      if (existingSummary) {
        logger.info({
          enhancementId: existingSummary.id,
          textLength: existingSummary.content.text.length,
          cacheKey
        }, 'Returning cached summary from POST request')
        
        return {
          summary: existingSummary.content.text,
          type: 'single',
          cached: true,
          enhancementId: existingSummary.id,
          ...this.createResponseMetadata()
        }
      }
      
      // Create a template with granularity-specific maxTokens
      const templateWithTokens = {
        ...summarisePrompt,
        modelConfig: {
          ...summarisePrompt.modelConfig,
          maxTokens: granularity ? getMaxTokensForGranularity(granularity as GranularityKey) : 200
        }
      }
      
      // Get model configuration for AI call tracking
      const { modelString, config: modelConfig } = getModelForAICall()
      
      // Start tracking AI call for metrics
      const aiCall = await aiCallService.startCallWithModelString({
        userId: context.user!.id,
        documentId,
        modelString: modelString,
        prompt_type: 'summarise',
        input_data: { 
          content_length: content.length,
          granularity: granularity || null,
          section_id: sectionId || null,
          model_used: modelString
        }
      })
      
      // Create performance timer for AI operation
      const operationTimer = createTimer(logger, 'summarise-generation')
      
      try {
        logger.info({
          aiCallId: aiCall.id,
          modelProvider: modelConfig.provider,
          modelString: modelString,
          contentLength: content.length,
          granularity,
          sectionId
        }, 'Starting AI summary generation')
        
        const summaryResult = await executePromptWithUsage(templateWithTokens, { 
          content, 
          granularity: getGranularityInstruction(granularity as GranularityKey | undefined)
        })
        
        operationTimer.end({
          tokensUsed: summaryResult.usage?.totalTokens,
          outputLength: summaryResult.text.length
        })
        
        // Complete AI call tracking with success and usage metadata
        await aiCallService.completeCall(aiCall.id, {
          output_data: {
            text_length: summaryResult.text.length,
            processing_notes: 'Summary generation completed successfully'
          },
          usage: summaryResult.usage,
          finishReason: summaryResult.finishReason
        })
        
        // Log successful AI operation
        logAIOperation('summarise', {
          modelProvider: modelConfig.provider,
          tokensUsed: summaryResult.usage?.totalTokens,
          userId: context.user!.id,
          documentId,
          correlationId: context.request.correlationId
        }, 'success')
        
        // Store summary in database
        try {
          const enhancement = await enhancementService.storeSummary(
            documentId,
            aiCall.id,
            {
              text: summaryResult.text,
              metadata: {
                ...(granularity && { granularity }),
                ...(sectionId && { sectionId }),
                generatedAt: new Date().toISOString(),
                modelUsed: modelString
              }
            },
            cacheKey
          )
          
          logger.info({
            enhancementId: enhancement.id,
            aiCallId: aiCall.id,
            textLength: summaryResult.text.length,
            tokensUsed: summaryResult.usage?.totalTokens
          }, 'Single summary generated and stored successfully')
          
          return {
            summary: summaryResult.text,
            type: 'single',
            cached: false,
            enhancementId: enhancement.id,
            aiCallId: aiCall.id,
            ...this.createResponseMetadata({
              executionTime: requestTimer.elapsed(),
              tokensUsed: summaryResult.usage?.totalTokens
            })
          }
        } catch (dbError) {
          // If database storage fails, still return the generated summary
          logger.error({
            error: dbError instanceof Error ? dbError.message : 'Unknown database error'
          }, 'Failed to store summary in database')
          
          return {
            summary: summaryResult.text,
            type: 'single',
            cached: false,
            warning: 'Summary generated but not saved to database',
            error: dbError instanceof Error ? dbError.message : 'Unknown database error',
            ...this.createResponseMetadata({
              executionTime: requestTimer.elapsed(),
              tokensUsed: summaryResult.usage?.totalTokens
            })
          }
        }
      } catch (llmError) {
        // Mark AI call as failed
        await aiCallService.failCall(
          aiCall.id,
          llmError instanceof Error ? llmError.message : 'Unknown LLM error'
        )
        
        // Log failed AI operation
        logAIOperation('summarise', {
          modelProvider: modelConfig.provider,
          userId: context.user!.id,
          documentId,
          correlationId: context.request.correlationId
        }, 'error', llmError instanceof Error ? llmError : new Error('Unknown LLM error'))
        
        throw llmError
      }
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error processing single summary')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to generate single summary',
        'server',
        true
      )
    }
  }
  
  /**
   * Handle multi-level summary generation (migrated from /api/multi-summarise)
   */
  private async handleMultiLevelSummary(
    parameters: Record<string, unknown>,
    context: ExecutionContext,
    logger: ReturnType<typeof createRequestLogger>
  ): Promise<ToolApiResponse> {
    const overallTimer = createTimer(logger, 'multi-dimensional-summary-generation')
    
    // Validate request parameters
    const validation = MultiSummaryPostRequestSchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { content, documentId } = validation.data
    
    logger.info({
      userId: context.user!.id,
      documentId,
      contentLength: content.length
    }, 'Multi-dimensional summary generation request initiated')
    
    try {
      // Initialize database services
      const supabase = context.supabaseClient!
      const enhancementService = new EnhancementService(supabase)
      const aiCallService = new AiCallService(supabase)
      
      // Check if multi-dimensional summary already exists
      logger.info({ documentId }, 'Checking for existing multi-dimensional summary')
      const existingSummary = await enhancementService.getMultiSummary(documentId)
      
      if (existingSummary) {
        logger.info({ documentId, cached: true }, 'Returning cached multi-dimensional summary')
        return {
          summaries: existingSummary,
          type: 'multi-summarise',
          cached: true,
          ...this.createResponseMetadata()
        }
      }
      
      logger.info({ documentId }, 'No existing summary found, proceeding with generation')
      
      // Get model configuration for AI call tracking
      const { modelString, config: modelConfig } = getModelForAICall()
      
      logger.info({
        documentId,
        modelString,
        modelProvider: modelConfig.provider
      }, 'Configured AI model for multi-dimensional summary generation')
      
      // Create AI call tracking for the single multi-summary generation
      const aiCall = await aiCallService.startCallWithModelString({
        userId: context.user!.id,
        documentId,
        modelString: modelString,
        prompt_type: 'multi-summarise',
        input_data: { 
          content_length: content.length,
          approach: 'single-prompt-structured-output',
          combinations_count: 9,
          model_used: modelString
        }
      })
      
      // Generate all 9 summaries in a single structured LLM call
      logger.info({
        documentId,
        aiCallId: aiCall.id,
        contentLength: content.length,
        approach: 'single-prompt-structured-output'
      }, 'Starting multi-dimensional summary generation with AI')
      
      const aiTimer = createTimer(logger, 'ai-summary-generation')
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
            userId: context.user!.id,
            documentId,
            correlationId: context.request.correlationId
          },
          'success'
        )
      } catch (summaryError) {
        // Mark AI call as failed
        await aiCallService.failCall(
          aiCall.id,
          summaryError instanceof Error ? summaryError.message : 'Unknown summary generation error'
        )
        
        logger.error({
          documentId,
          aiCallId: aiCall.id,
          error: summaryError instanceof Error ? summaryError.message : 'Unknown error',
          fullError: summaryError,
          modelProvider: modelConfig.provider,
          modelString: modelString
        }, 'Failed to generate multi-dimensional summary')
        
        logAIOperation(
          'multi-dimensional-summary-generation',
          {
            modelProvider: modelConfig.provider,
            userId: context.user!.id,
            documentId,
            correlationId: context.request.correlationId
          },
          'error',
          summaryError instanceof Error ? summaryError : new Error('Unknown summary generation error')
        )
        
        throw createHandlerError(
          'Failed to generate multi-dimensional summary',
          'server',
          true
        )
      }
      
      // Parse and validate the structured JSON response
      logger.info({
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
        
        logger.error({
          documentId,
          aiCallId: aiCall.id,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          rawResponseLength: summaryResult.text.length,
          rawResponsePreview: summaryResult.text.substring(0, 500)
        }, 'Failed to parse/validate multi-summary JSON response')
        
        throw createHandlerError(
          'Invalid JSON response from LLM - failed to parse structured summary output',
          'server',
          true
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
        logger.warn({
          documentId,
          aiCallId: aiCall.id,
          trackingError: trackingError instanceof Error ? trackingError.message : 'Unknown error'
        }, 'Failed to complete AI call tracking, but continuing with summary storage')
        // Continue - the summaries were generated successfully even if tracking failed
      }
      
      // Store in database
      logger.info({
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
            modelUsed: modelString,
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
        
        logger.info({
          documentId,
          enhancementId: enhancement.id,
          aiCallId: aiCall.id,
          totalCombinations: 9,
          totalDuration,
          tokensUsed: summaryResult.usage?.totalTokens
        }, 'Multi-dimensional summary generation completed successfully')
        
        return {
          summaries: parsedSummaries,
          type: 'multi-summarise',
          cached: false,
          enhancementId: enhancement.id,
          totalCombinations: 9,
          aiCallId: aiCall.id,
          approach: 'single-prompt',
          ...this.createResponseMetadata({
            executionTime: totalDuration,
            tokensUsed: summaryResult.usage?.totalTokens
          })
        }
      } catch (dbError) {
        // If database storage fails, still return the generated summaries
        logger.error({
          documentId,
          aiCallId: aiCall.id,
          dbError: dbError instanceof Error ? dbError.message : 'Unknown database error'
        }, 'Failed to store multi-summary in database, returning generated summaries anyway')
        
        return {
          summaries: parsedSummaries,
          type: 'multi-summarise',
          cached: false,
          warning: 'Summaries generated but not saved to database',
          error: dbError instanceof Error ? dbError.message : 'Unknown database error',
          aiCallId: aiCall.id,
          ...this.createResponseMetadata({
            tokensUsed: summaryResult.usage?.totalTokens
          })
        }
      }
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error processing multi-dimensional summary')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to generate multi-dimensional summary',
        'server',
        true
      )
    }
  }
  
  async handleDelete(
    params: DeleteRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('summary-handler:delete', context.request.correlationId)
    const requestTimer = createTimer()
    
    const documentId = params.documentId
    const granularity = typeof params.granularity === 'string' ? params.granularity : undefined
    const type = params.type || 'all'
    
    if (!documentId || typeof documentId !== 'string') {
      throw createHandlerError(
        'documentId is required for summary deletion',
        'validation'
      )
    }
    
    logger.info({
      documentId,
      granularity,
      type,
      userId: context.user?.id
    }, 'Summary DELETE request initiated')
    
    try {
      // Initialize database services
      const supabase = context.supabaseClient!
      const enhancementService = new EnhancementService(supabase)
      
      if (type === 'single' || (type === 'all' && granularity)) {
        // Delete specific single summary enhancement
        await enhancementService.delete(documentId, 'summary', granularity || undefined)
        
        logger.info({
          documentId,
          granularity
        }, 'Single summary enhancement deleted successfully')
        
        return {
          success: true,
          deleted: true,
          type: 'single',
          documentId,
          granularity,
          ...this.createResponseMetadata({
            executionTime: requestTimer.elapsed()
          })
        }
      } else if (type === 'multi-summarise') {
        // Delete multi-dimensional summary enhancement
        await enhancementService.delete(documentId, 'summary', 'multi-dimensional')
        
        logger.info({
          documentId
        }, 'Multi-dimensional summary enhancement deleted successfully')
        
        return {
          success: true,
          deleted: true,
          type: 'multi-summarise',
          documentId,
          ...this.createResponseMetadata({
            executionTime: requestTimer.elapsed()
          })
        }
      } else {
        // Delete all summary enhancements for this document
        const { error } = await supabase
          .from('document_enhancements')
          .delete()
          .eq('document_id', documentId)
          .eq('type', 'summary')
        
        if (error) {
          logger.error({
            documentId,
            error: error.message
          }, 'Error deleting all summary enhancements')
          
          throw createHandlerError(
            'Failed to delete summary enhancements',
            'server',
            true
          )
        }
        
        logger.info({
          documentId
        }, 'All summary enhancements deleted successfully')
        
        return {
          success: true,
          deleted: true,
          type: 'all',
          documentId,
          ...this.createResponseMetadata({
            executionTime: requestTimer.elapsed()
          })
        }
      }
      
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Error deleting summary enhancements')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to delete summary enhancements',
        'server',
        true
      )
    }
  }
}

// Export the handler instance
const summaryHandler = new SummaryHandler()
export { summaryHandler }
export default summaryHandler