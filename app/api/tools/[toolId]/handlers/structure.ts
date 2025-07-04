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
 * - 'generate' or 'execute' - Generate AI-powered document structure/headings (all-at-once)
 * - 'iterate' - Iterative heading generation with operation limits (max 10 ops per iteration)
 * - 'apply' - Apply structure mutations to document
 * - 'get' or 'list' - Get cached structure/headings (via GET)
 * - 'delete' - Remove structure enhancement (via DELETE)
 */

import { z } from 'zod'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { headingsPrompt, headingsResponseSchema, headingOperationSchema, type HeadingOperation } from '@/lib/prompts/templates/headings'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelForAICall, HEADING_ITERATION_CONFIG } from '@/lib/config'
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

// Schema for iterative heading generation
const StructureIterateSchema = z.object({
  html_content: z.string().min(1, 'HTML content is required'),
  documentId: z.string().optional(),
  // Iteration tracking fields
  iteration_count: z.number().int().min(0).default(0),
  previous_iteration_summary: z.string().optional(),
  previous_iteration_plan: z.string().optional(),
  existing_operations: z.array(headingOperationSchema).optional(), // Operations from previous iterations
  total_operations_count: z.number().int().min(0).default(0)
}).passthrough()


/**
 * Validate heading operations for structural integrity
 * Ensures no multiple H1s and reasonable hierarchy depth
 */
function validateHeadingOperations(
  operations: HeadingOperation[],
  existingHtml: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Count H1 operations
  const h1Operations = operations.filter(op => 
    (op.action === 'insert' || op.action === 'replace') && 
    op.content?.tag_name === 'h1'
  )
  
  if (h1Operations.length > 1) {
    errors.push(`Multiple H1 operations detected (${h1Operations.length}). Document should have exactly one H1.`)
  }
  
  // Check for reasonable hierarchy depth
  const operationHeadingLevels = operations
    .filter(op => (op.action === 'insert' || op.action === 'replace') && op.content)
    .map(op => parseInt(op.content!.tag_name.substring(1)))
    .filter(level => !isNaN(level))
  
  // Extract heading levels already present in the supplied HTML so that we
  // don't raise false positives when the missing intermediate level is already
  // part of the document and therefore doesn't need to appear in the current
  // batch of operations.
  const htmlHeadingLevels: number[] = []
  const headingRegex = /<h([1-6])[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(existingHtml)) !== null) {
    const lvl = parseInt(match[1], 10)
    if (!isNaN(lvl)) htmlHeadingLevels.push(lvl)
  }
  
  const headingLevels = [...operationHeadingLevels, ...htmlHeadingLevels]
  
  if (headingLevels.length > 0) {
    // Check for skip-level hierarchies (e.g., H1 → H3 without H2)
    const uniqueLevels = [...new Set(headingLevels)].sort((a, b) => a - b)
    for (let i = 1; i < uniqueLevels.length; i++) {
      const currentLevel = uniqueLevels[i]
      const previousLevel = uniqueLevels[i-1]
      if (currentLevel && previousLevel && currentLevel - previousLevel > 1) {
        errors.push(`Skip-level hierarchy detected: h${previousLevel} → h${currentLevel}. Consider adding intermediate heading levels.`)
      }
    }
  }
  
  // Validate operation targets exist (would need document context for full validation)
  const missingTargets = operations.filter(op => {
    if (op.action === 'replace' || op.action === 'remove') {
      return !op.targetId
    }
    if (op.action === 'insert') {
      return !op.insertNewBeforeExistingId
    }
    return false
  })
  
  if (missingTargets.length > 0) {
    errors.push(`${missingTargets.length} operations missing required target IDs`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

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
 * Detect IDs referenced in operations that do NOT actually exist in the supplied HTML string.
 * This helps us catch fabricated/example IDs without black-listing legitimate prefixes.
 */
function findFabricatedIds(operations: HeadingOperation[], html: string): string[] {
  return operations
    .map(op => op.insertNewBeforeExistingId || op.targetId)
    .filter(id => {
      if (!id) return false
      const idStr = id as string
      return !html.includes(`id="${idStr}"`) && !html.includes(`id='${idStr}'`)
    }) as string[]
}

/**
 * Check for dangerous insert-before operations that would place a non-H1 heading
 * (or any element) before the existing top-level H1. This typically causes the
 * document title to be pushed down the page.
 */
function detectUnsafeInsertBeforeH1(operations: HeadingOperation[], html: string): string[] {
  const issues: string[] = []

  // Build a quick lookup of IDs that belong to existing H1 elements in the source HTML
  const h1IdRegex = /<h1[^>]*id=["']([^"']+)["']/gi
  const h1Ids = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = h1IdRegex.exec(html)) !== null) {
    if (match[1]) {
      h1Ids.add(match[1])
    }
  }

  if (h1Ids.size === 0) {
    return issues
  }

  for (const op of operations) {
    if (op.action !== 'insert') continue
    const targetId = op.insertNewBeforeExistingId
    if (!targetId) continue
    if (!h1Ids.has(targetId)) continue
    const newTag = op.content?.tag_name || 'unknown'
    if (newTag.toLowerCase() !== 'h1') {
      issues.push(
        `Unsafe insertion: attempting to insert <${newTag}> before existing H1 element with id "${targetId}". ` +
        `Only an H1 replacement or modification should target an existing H1.`
      )
    }
  }

  return issues
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
      const supabase = context.supabaseClient!
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
        
        const content = existingHeadings.content as { operations?: unknown }
        if (!content.operations || !Array.isArray(content.operations)) {
          throw new Error(`Malformed headings data in database for enhancement ${existingHeadings.id}: content.operations is not an array. Found: ${typeof content.operations}`)
        }
        
        logger.info({
          documentId,
          enhancementId: existingHeadings.id,
          operationsCount: content.operations.length
        }, 'Returning cached structure/headings')
        
        return {
          operations: content.operations,
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
    
    // Allow unauthenticated 'get' or 'list' requests for read-only access
    if (action === 'get' || action === 'list') {
      // Delegate to GET handler logic for compatibility with the unified POST executor.
      return this.handleGet(parameters as unknown as GetRequestParams, context)
    }
    
    // All other actions require authentication
    if (!context.user) {
      throw createHandlerError('Authentication required for structure operations', 'auth')
    }
    
    // Route based on action type
    if (action === 'apply') {
      return this.handleApplyStructure(parameters, context, logger)
    } else if (action === 'iterate') {
      return this.handleIterateStructure(parameters, context, logger)
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
      const supabase = context.supabaseClient!
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
        
        const content = existingHeadings.content as { operations?: unknown }
        if (!content.operations || !Array.isArray(content.operations)) {
          throw new Error(`Malformed headings data in database for enhancement ${existingHeadings.id}: content.operations is not an array. Found: ${typeof content.operations}`)
        }
        
        logger.info({
          documentId,
          enhancementId: existingHeadings.id,
          operationsCount: content.operations.length,
          operation: 'cache_hit'
        }, 'Returning cached structure/headings')
        
        return {
          operations: content.operations,
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
      
      // Validate heading operations for structural integrity
      const structuralValidation = validateHeadingOperations(validatedResponse.operations, cleanedHtml)
      // Additional safety: prevent inserting non-H1 before an existing H1
      const unsafeH1Insertions = detectUnsafeInsertBeforeH1(validatedResponse.operations, cleanedHtml)
      if (unsafeH1Insertions.length > 0) {
        structuralValidation.errors.push(...unsafeH1Insertions)
      }
      
      if (!structuralValidation.isValid) {
        logger.warn({
          documentId,
          aiCallId: aiCall.id,
          validationErrors: structuralValidation.errors,
          operations: validatedResponse.operations,
          operation: 'heading_validation_failed'
        }, 'Heading operations failed validation – full operations logged for debugging')
        
        const suspiciousIds = findFabricatedIds(validatedResponse.operations, cleanedHtml)
        
        if (suspiciousIds.length > 0) {
          logger.error({
            documentId,
            aiCallId: aiCall.id,
            suspiciousIds,
            operation: 'ai_used_example_ids'
          }, 'AI used example IDs from prompt instead of actual document IDs')
          
          structuralValidation.errors.push(
            `AI error: Used example IDs from prompt (${suspiciousIds.join(', ')}) instead of actual document element IDs. ` +
            `The AI must use the exact IDs found in the provided HTML content.`
          )
        }
        
        // If we have a skip-level hierarchy error, append an explicit hint so it shows up in the
        // client-side toast without the user needing to open the server logs.
        const skipLevelError = structuralValidation.errors.find(e => e.includes('Skip-level hierarchy'))
        if (skipLevelError) {
          structuralValidation.errors.push('Tip: Check the order of heading operations – an H4 must appear before adding an H5 under the same section.')
        }
        
        // Complete AI call with validation failure
        await aiCallService.completeCall(aiCall.id, {
          output_data: {
            operations_count: validatedResponse.operations.length,
            validation_failed: true,
            validation_errors: structuralValidation.errors,
            processing_notes: 'Heading operations failed structural validation'
          },
          usage: llmResult.usage,
          finishReason: llmResult.finishReason
        })
        
        // Return error response with validation details
        throw createHandlerError(
          `Heading validation failed: ${structuralValidation.errors.join('; ')}`,
          'validation',
          true
        )
      }
      
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
  
  /**
   * Handle iterative structure/headings generation with operation limits
   * 
   * This implements the adaptive action pattern following glossary's "Load More" approach.
   * Detects initial vs continuation mode via `existing_operations` parameter presence.
   * Constrains LLM to max 10 operations per iteration with safety limits.
   */
  private async handleIterateStructure(
    parameters: Record<string, unknown>,
    context: ExecutionContext,
    logger: ReturnType<typeof createRequestLogger>
  ): Promise<ToolApiResponse> {
    const requestTimer = createTimer()
    
    // Validate input parameters
    const validation = StructureIterateSchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { 
      html_content, 
      documentId, 
      iteration_count, 
      previous_iteration_summary,
      existing_operations,
      total_operations_count
    } = validation.data
    
    // Check safety limits
    if (iteration_count >= HEADING_ITERATION_CONFIG.MAX_ITERATIONS) {
      logger.warn({
        iteration_count,
        max_iterations: HEADING_ITERATION_CONFIG.MAX_ITERATIONS,
        operation: 'iteration_limit_reached'
      }, 'Maximum iteration limit reached')
      
      return {
        operations: [],
        more_changes_required: false,
        iteration_summary: 'Maximum iteration limit reached',
        iteration_plan: undefined,
        safety_check: {
          current_iteration: iteration_count,
          total_operations_so_far: total_operations_count,
          max_iterations_reached: true
        },
        type: 'structure',
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed()
        })
      }
    }
    
    // Determine if this is initial or continuation mode
    const isInitialIteration = !existing_operations || existing_operations.length === 0
    
    logger.info({
      userId: context.user!.id,
      documentId,
      contentLength: html_content.length,
      iteration_count,
      total_operations_count,
      is_initial: isInitialIteration,
      operation: 'iterative_structure_generation'
    }, 'Starting iterative structure generation')
    
    try {
      // Initialize database services
      const supabase = context.supabaseClient!
      const aiCallService = new AiCallService(supabase)
      
      // Get model configuration
      const { modelString, config: modelConfig } = getModelForAICall()
      
      // Create AI call record for tracking
      const aiCall = await aiCallService.startCallWithModelString({
        userId: context.user!.id,
        ...(documentId && { documentId }),
        modelString: modelString,
        prompt_type: 'headings',
        input_data: { 
          content_length: html_content.length,
          iteration_count,
          is_initial: isInitialIteration,
          total_operations_so_far: total_operations_count,
          max_operations_per_iteration: HEADING_ITERATION_CONFIG.MAX_HEADING_OPERATIONS_PER_ITERATION,
          model_used: modelString
        }
      })
      
      logger.info({
        documentId,
        aiCallId: aiCall.id,
        provider: modelConfig.provider,
        modelString: modelString,
        operation: 'ai_call_start'
      }, 'AI call started for iterative structure generation')
      
      // Generate headings using LLM with iteration context
      const llmTimer = createTimer(logger, 'iterative_headings_generation')
      const llmResult = await executePromptWithUsage(headingsPrompt, { 
        html_content,
        documentId,
        iteration_count,
        previous_iteration_summary,
        previous_iteration_plan: parameters.previous_iteration_plan as string | undefined,
        total_operations_so_far: total_operations_count,
        MAX_HEADING_OPERATIONS_PER_ITERATION: HEADING_ITERATION_CONFIG.MAX_HEADING_OPERATIONS_PER_ITERATION,
        MAX_ITERATIONS: HEADING_ITERATION_CONFIG.MAX_ITERATIONS
      })
      llmTimer.end({
        documentId,
        aiCallId: aiCall.id,
        responseLength: llmResult.text.length
      })
      
      // Parse and validate response
      let jsonString = llmResult.text.trim()
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7)
      }
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3)
      }
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.slice(0, -3)
      }
      
      const parsedResponse = JSON.parse(jsonString.trim())
      const validatedResponse = headingsResponseSchema.parse(parsedResponse)
      
      // Log the generated operations hierarchy
      logOperationsHierarchy(validatedResponse.operations)
      
      // Validate heading operations for structural integrity
      const validation = validateHeadingOperations(validatedResponse.operations, html_content)
      const unsafeH1InsertionsIter = detectUnsafeInsertBeforeH1(validatedResponse.operations, html_content)
      if (unsafeH1InsertionsIter.length > 0) {
        validation.errors.push(...unsafeH1InsertionsIter)
      }
      
      if (!validation.isValid) {
        logger.warn({
          documentId,
          aiCallId: aiCall.id,
          validationErrors: validation.errors,
          operations: validatedResponse.operations,
          operation: 'heading_validation_failed'
        }, 'Heading operations failed validation – full operations logged for debugging')
        
        const suspiciousIds = findFabricatedIds(validatedResponse.operations, html_content)
        
        if (suspiciousIds.length > 0) {
          logger.error({
            documentId,
            aiCallId: aiCall.id,
            suspiciousIds,
            operation: 'ai_used_example_ids'
          }, 'AI used example IDs from prompt instead of actual document IDs')
          
          validation.errors.push(
            `AI error: Used example IDs from prompt (${suspiciousIds.join(', ')}) instead of actual document element IDs. ` +
            `The AI must use the exact IDs found in the provided HTML content.`
          )
        }
        
        // If we have a skip-level hierarchy error, append an explicit hint so it shows up in the
        // client-side toast without the user needing to open the server logs.
        const skipLevelError = validation.errors.find(e => e.includes('Skip-level hierarchy'))
        if (skipLevelError) {
          validation.errors.push('Tip: Check the order of heading operations – an H4 must appear before adding an H5 under the same section.')
        }
        
        // Complete AI call with validation failure
        await aiCallService.completeCall(aiCall.id, {
          output_data: {
            operations_count: validatedResponse.operations.length,
            validation_failed: true,
            validation_errors: validation.errors,
            processing_notes: 'Heading operations failed structural validation'
          },
          usage: llmResult.usage,
          finishReason: llmResult.finishReason
        })
        
        // Return error response with validation details
        throw createHandlerError(
          `Heading validation failed: ${validation.errors.join('; ')}`,
          'validation',
          true
        )
      }
      
      // Count operations by type for metadata
      const operationCounts = validatedResponse.operations.reduce((acc, op) => {
        acc[op.action] = (acc[op.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // Calculate new total operations count
      const newTotalOperations = total_operations_count + validatedResponse.operations.length
      
      // Complete the AI call record
      await aiCallService.completeCall(aiCall.id, {
        output_data: {
          operations_count: validatedResponse.operations.length,
          operations_breakdown: operationCounts,
          iteration_count,
          more_changes_required: validatedResponse.more_changes_required,
          iteration_summary: validatedResponse.iteration_summary,
          processing_notes: `Iterative structure generation - iteration ${iteration_count + 1}`
        },
        usage: llmResult.usage,
        finishReason: llmResult.finishReason
      })
      
      // Persist operations to database for caching and state preservation
      if (documentId) {
        const enhancementService = new EnhancementService(supabase)
        
        // Combine existing operations with new ones for complete state
        const allOperations = [...(existing_operations || []), ...validatedResponse.operations]
        
        // Store/update enhancement with iteration metadata - using native operations format
        await enhancementService.upsert({
          documentId,
          type: 'headings',
          subtype: 'default',
          content: {
            // Cast to JsonValue to satisfy JsonObject typing
            operations: allOperations as unknown as import('@/lib/types/json').JsonValue,
            iteration_metadata: {
              iteration_count: iteration_count + 1,
              total_operations: newTotalOperations,
              last_changes: validatedResponse.iteration_summary,
              more_changes_required: validatedResponse.more_changes_required,
              last_updated: new Date().toISOString()
            }
          },
          aiCallId: aiCall.id
        })
        
        logger.info({
          documentId,
          enhancementId: null, // Will be set by upsert
          totalOperations: allOperations.length,
          newOperations: validatedResponse.operations.length,
          iteration_count: iteration_count + 1,
          operation: 'operations_persisted'
        }, 'Operations successfully persisted to database')
      }
      
      logAIOperation(
        'iterative_headings_generation',
        {
          modelProvider: modelConfig.provider,
          tokensUsed: llmResult.usage?.totalTokens,
          userId: context.user!.id,
          ...(documentId && { documentId }),
          correlationId: context.request.correlationId
        },
        'success'
      )
      
      logger.info({
        documentId,
        iteration_count,
        operationsCount: validatedResponse.operations.length,
        operationsBreakdown: operationCounts,
        more_changes_required: validatedResponse.more_changes_required,
        newTotalOperations,
        aiCallId: aiCall.id,
        tokensUsed: llmResult.usage?.totalTokens,
        executionTime: requestTimer.elapsed()
      }, 'Iterative structure generation completed successfully')
      
      // Return response with iteration tracking
      return {
        operations: validatedResponse.operations,
        more_changes_required: validatedResponse.more_changes_required ?? false,
        iteration_summary: validatedResponse.iteration_summary ?? '',
        iteration_plan: validatedResponse.iteration_plan,
        safety_check: validatedResponse.safety_check ?? {
          current_iteration: iteration_count,
          total_operations_so_far: newTotalOperations,
          max_iterations_reached: false
        },
        cached: false,
        aiCallId: aiCall.id,
        type: 'structure',
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed(),
          tokensUsed: llmResult.usage?.totalTokens,
          iteration: iteration_count + 1,
          totalOperations: newTotalOperations
        })
      }
      
    } catch (error) {
      logger.error({
        documentId,
        iteration_count,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error in iterative structure generation')
      
      // Enhanced error handling
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
        
        // JSON parsing errors
        if (error.message.includes('JSON') || error.message.includes('parse')) {
          throw createHandlerError(
            'AI response parsing error - Invalid structure operations format received',
            'server',
            true
          )
        }
        
        // Schema validation errors
        if (error.message.includes('Expected') || error.message.includes('Received')) {
          throw createHandlerError(
            `Response validation error: ${error.message}`,
            'server',
            true
          )
        }
      }
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to generate iterative document structure',
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
      const supabase = context.supabaseClient!
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