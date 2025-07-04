/**
 * Metadata tool handler - migrated from /api/reading-difficulty
 * 
 * Handles reading difficulty analysis and document metadata extraction.
 * This demonstrates the migration pattern from individual API routes
 * to the unified tool execution framework.
 * 
 * Original route: /api/reading-difficulty
 * New route: /api/tools/metadata
 */

import { z } from 'zod'
import { extractCleanText } from '@/lib/utils/html-text-extraction'
import { logAIOperation, createTimer } from '@/lib/services/logger'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { getModelForAICall } from '@/lib/config'
import { BaseToolHandler, createHandlerError } from '../handler-interface'
import type { ExecutionContext, ToolApiResponse } from '@/lib/tools/executor/types'
import type { GetRequestParams, DeleteRequestParams } from '../handler-interface'
import type { Json } from '@/lib/types/database-auto-generated'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { readingDifficultyPrompt, parseReadingDifficultyResponse } from '@/lib/prompts/templates/reading-difficulty'

// Validation schemas
const ReadingDifficultyRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required')
})

const GetMetadataRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  type: z.enum(['reading-difficulty', 'summary', 'all']).default('all')
})

// ---------------------------------------------------------------------------
// Reading difficulty analysis via LLM prompt
// ---------------------------------------------------------------------------

/**
 * Analyze reading difficulty using the dedicated LLM prompt.
 * - Runs the `readingDifficultyPrompt` against the document text
 * - Parses and validates the JSON response
 * - Returns the level, confidence, rationale, plus token-usage metadata
 */
async function analyzeReadingDifficultyFromPlainText(content: string): Promise<{
  level: string
  confidence: number
  rationale: string
  factors: Record<string, unknown>
}> {
  const timer = createTimer()

  // Execute the prompt and capture token usage
  const { text: rawResponse, usage } = await executePromptWithUsage(
    readingDifficultyPrompt,
    { content }
  )

  // Parse the JSON returned by the model
  const parsed = parseReadingDifficultyResponse(rawResponse)

  return {
    level: parsed.level,
    confidence: parsed.confidence,
    rationale: parsed.rationale,
    factors: {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      analysisTime: timer.elapsed(),
    }
  }
}

/**
 * Metadata tool handler
 */
export class MetadataHandler extends BaseToolHandler {
  constructor() {
    super('metadata')
  }
  
  async handleGet(
    params: GetRequestParams
  ): Promise<ToolApiResponse> {
    const validation = GetMetadataRequestSchema.safeParse(params)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId, type } = validation.data
    
    // For now, return placeholder metadata
    // In a full implementation, this would fetch from database
    const metadata = {
      documentId,
      readingDifficulty: {
        level: 'unknown',
        confidence: 0,
        lastAnalyzed: null
      },
      wordCount: 0,
      estimatedReadingTime: '0 min',
      lastUpdated: new Date().toISOString()
    }
    
    return {
      metadata,
      type,
      ...this.createResponseMetadata({ cached: false })
    }
  }
  
  async handlePost(
    action: string,
    parameters: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    switch (action) {
      case 'analyze-reading-difficulty':
      case 'execute': // Default action maps to reading difficulty analysis
        return this.analyzeReadingDifficulty(parameters, context)
      
      case 'refresh':
        return this.refreshMetadata(parameters)
      
      default:
        throw createHandlerError(
          `Unsupported action: ${action}`,
          'validation'
        )
    }
  }
  
  async handleDelete(
    params: DeleteRequestParams
  ): Promise<ToolApiResponse> {
    const documentId = params.documentId
    if (!documentId || typeof documentId !== 'string') {
      throw createHandlerError(
        'documentId is required for metadata deletion',
        'validation'
      )
    }
    
    // In a full implementation, this would delete metadata from database
    return {
      deleted: true,
      documentId,
      ...this.createResponseMetadata()
    }
  }
  
  /**
   * Analyze reading difficulty for the given content
   */
  private async analyzeReadingDifficulty(
    parameters: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const validation = ReadingDifficultyRequestSchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId } = validation.data
    const timer = createTimer()
    
    try {
      // -------------------------------------------------------------------
      // Fetch HTML content for the document on the server side
      // -------------------------------------------------------------------
      const supabase = context.supabaseClient
      if (!supabase) {
        throw new Error('Supabase client unavailable in execution context')
      }

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('html_content')
        .eq('id', documentId)
        .maybeSingle()

      if (docError) {
        throw new Error(`Failed to fetch document content: ${docError.message}`)
      }

      if (!doc?.html_content) {
        throw new Error('Document content is empty')
      }

      // Convert HTML to plain text and run analysis
      const plainText = extractCleanText(doc.html_content)
      const result = await analyzeReadingDifficultyFromPlainText(plainText)
      
      // -------------------------------------------------------------------
      // Create AI call tracking (even though this analysis is local)
      // -------------------------------------------------------------------
      const { modelString } = getModelForAICall()
      const aiCallService = new AiCallService(supabase)

      const aiCall = await aiCallService.startCallWithModelString({
        userId: context.user!.id,
        documentId,
        modelString,
        prompt_type: 'reading_difficulty',
        input_data: {
          content_length: plainText.length,
          analysis_method: 'local_algorithm_v1'
        }
      })

      // Persist enhancement linked to the AI call
      const enhancementService = new EnhancementService(supabase)
      await enhancementService.upsert({
        documentId,
        aiCallId: aiCall.id,
        type: 'reading_difficulty',
        subtype: 'ai_assessment',
        content: {
          level: result.level,
          confidence: result.confidence,
          rationale: result.rationale,
          factors: result.factors as { [key: string]: Json }
        }
      })

      // Mark AI call as completed successfully
      await aiCallService.completeCall(aiCall.id, {
        output_data: {
          level: result.level,
          confidence: result.confidence,
          factors: result.factors as { [key: string]: Json }
        }
      })

      // Log the operation result
      logAIOperation(
        'reading_difficulty_analysis',
        {
          documentId,
          correlationId: context.request.correlationId
        },
        'success'
      )
      
      return {
        ...result,
        documentId,
        cached: false,
        ...this.createResponseMetadata({
          executionTime: timer.elapsed()
        })
      }
      
    } catch (error) {
      throw createHandlerError(
        error instanceof Error ? error.message : 'Reading difficulty analysis failed',
        'server',
        true
      )
    }
  }
  
  /**
   * Refresh metadata for a document
   */
  private async refreshMetadata(
    parameters: Record<string, unknown>
  ): Promise<ToolApiResponse> {
    const documentId = this.getDocumentId(parameters)
    
    // In a full implementation, this would:
    // 1. Fetch document content
    // 2. Re-analyze reading difficulty
    // 3. Update metadata in database
    // 4. Return updated metadata
    
    return {
      refreshed: true,
      documentId,
      ...this.createResponseMetadata()
    }
  }
}

// Export the handler instance
const metadataHandler = new MetadataHandler()
export default metadataHandler