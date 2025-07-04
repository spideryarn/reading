/**
 * Search tool handler - migrated from /api/semantic-search
 * 
 * Handles semantic search functionality including LLM-powered semantic document
 * analysis, query history, and caching. This demonstrates migration from individual
 * API routes to the unified tool execution framework.
 * 
 * Original route: /api/semantic-search
 * New route: /api/tools/search
 */

import { z } from 'zod'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { 
  semanticSearchPrompt, 
  semanticSearchApiInputSchema, 
  semanticSearchResponseSchema 
} from '@/lib/prompts/templates/semantic-search'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { DocumentParser } from '@/lib/services/document-parser'
import { getModelForAICall } from '@/lib/config'
import { normalizeSemanticSearchQuery } from '@/lib/utils/semantic-search'
import { 
  formatDocumentForSemanticSearch, 
  validateSemanticSearchElementIds,
  getDocumentStats,
  estimateTokenCount 
} from '@/lib/services/semantic-search-formatter'
import { createRequestLogger, logAIOperation, createTimer } from '@/lib/services/logger'
import { BaseToolHandler, createHandlerError } from '../handler-interface'
import type { ExecutionContext, ToolApiResponse } from '@/lib/tools/executor/types'
import type { GetRequestParams, DeleteRequestParams } from '../handler-interface'

// Validation schemas
const SearchGetRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  type: z.enum(['history', 'all']).default('history')
}).passthrough()

const SearchPostRequestSchema = z.object({
  ...semanticSearchApiInputSchema.shape
}).passthrough()

/**
 * Search tool handler
 */
export class SearchHandler extends BaseToolHandler {
  constructor() {
    super('search')
  }
  
  async handleGet(
    params: GetRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('search-handler:get', context.request.correlationId)
    
    const validation = SearchGetRequestSchema.safeParse(params)
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
    }, 'Getting search query history')
    
    try {
      // Initialize database client
      const supabase = context.supabaseClient!
      
      // Get all semantic search enhancements for this document
      const { data: enhancements, error } = await supabase
        .from('document_enhancements')
        .select('subtype, created_at, content')
        .eq('document_id', documentId)
        .eq('type', 'semantic-search')
        .order('created_at', { ascending: false })
      
      if (error) {
        logger.error({
          documentId,
          error: error.message
        }, 'Failed to fetch semantic search query history from database')
        
        throw createHandlerError(
          'Failed to fetch query history',
          'server',
          true
        )
      }
      
      // Extract query information from the cached data
      const queries = (enhancements || []).map((enhancement) => {
        // Ensure content is not null and is an object
        if (!enhancement.content || typeof enhancement.content !== 'object') {
          // Return a default query object for malformed data
          return {
            query: enhancement.subtype || 'Unknown query',
            normalizedQuery: enhancement.subtype || '',
            searchedAt: enhancement.created_at || new Date().toISOString(),
            resultCount: 0
          }
        }
        
        const content = enhancement.content as {
          originalQuery?: string
          normalizedQuery: string
          matches?: Array<{
            elementId: string
            confidence: number
            reasoning: string
            relevantText: string
          }>
          searchedAt?: string
        }
        
        return {
          query: content.originalQuery || enhancement.subtype || 'Unknown query',
          normalizedQuery: enhancement.subtype || '',
          searchedAt: content.searchedAt || enhancement.created_at || new Date().toISOString(),
          resultCount: Array.isArray(content.matches) ? content.matches.length : 0
        }
      })
      
      logger.info({
        documentId,
        queryCount: queries.length
      }, 'Successfully retrieved semantic search query history')
      
      return {
        documentId,
        queries,
        ...this.createResponseMetadata({
          queryCount: queries.length
        })
      }
      
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to get search query history')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to retrieve search history',
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
    const logger = createRequestLogger('search-handler:post', context.request.correlationId)
    const requestTimer = createTimer()
    
    // Validate user is authenticated
    if (!context.user) {
      throw createHandlerError('Authentication required for search operations', 'auth')
    }
    
    // Validate request parameters
    const validation = SearchPostRequestSchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { query, documentId } = validation.data
    
    logger.info({
      userId: context.user.id,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''), // Truncate query for privacy
      documentId
    }, 'Starting semantic search request')
    
    // Validate required fields
    if (!documentId) {
      throw createHandlerError(
        'documentId is required for semantic search',
        'validation'
      )
    }
    
    try {
      // Normalize the query for consistent caching
      const normalizedQuery = normalizeSemanticSearchQuery(query)
      
      // Initialize database services
      const supabase = context.supabaseClient!
      const documentService = new DocumentService(supabase)
      const aiCallService = new AiCallService(supabase)
      const enhancementService = new EnhancementService(supabase)
      const documentParser = new DocumentParser()
      
      // Check for cached results first
      const cachedResult = await enhancementService.get(
        documentId,
        'semantic-search',
        normalizedQuery
      )
      
      if (cachedResult) {
        logger.info({
          query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
          normalizedQuery,
          documentId,
          enhancementId: cachedResult.id
        }, 'Returning cached semantic search results')
        
        // Validate cached data structure
        if (!cachedResult.content || typeof cachedResult.content !== 'object') {
          const errorMsg = `Malformed semantic search cache data for enhancement ${cachedResult.id}: content is not an object`
          logger.error({
            enhancementId: cachedResult.id,
            documentId
          }, 'Malformed cached data structure')
          throw new Error(errorMsg)
        }
        
        const cachedContent = cachedResult.content as {
          originalQuery?: string
          normalizedQuery: string
          matches: Array<{
            elementId: string
            confidence: number
            reasoning: string
            relevantText?: string
          }>
          stats?: {
            totalElements: number
            searchableElements: number
            matchesFound: number
            estimatedTokensUsed?: number
          }
          searchedAt: string
        }
        
        if (!Array.isArray(cachedContent.matches)) {
          throw new Error(`Malformed semantic search cache data for enhancement ${cachedResult.id}: matches is not an array`)
        }
        
        return {
          matches: cachedContent.matches,
          query: cachedContent.originalQuery || query,
          documentId,
          stats: cachedContent.stats,
          aiCallId: cachedResult.ai_call_id,
          cached: true,
          cachedAt: cachedResult.created_at,
          enhancementId: cachedResult.id,
          ...this.createResponseMetadata({
            matchCount: cachedContent.matches.length
          })
        }
      }
      
      // Load document from database
      const document = await documentService.getById(documentId)
      if (!document) {
        throw createHandlerError('Document not found', 'not_found')
      }
      
      // Parse HTML content into document elements
      if (!document.html_content) {
        throw createHandlerError(
          'Document has no HTML content for semantic analysis',
          'validation'
        )
      }
      
      const elements = documentParser.parse(document.html_content, documentId)
      if (!elements || elements.length === 0) {
        throw createHandlerError(
          'No document elements found after parsing',
          'not_found'
        )
      }
      
      // Convert document to annotated format for LLM
      const annotatedContent = formatDocumentForSemanticSearch(elements)
      if (!annotatedContent.trim()) {
        throw createHandlerError(
          'Document contains no meaningful content for semantic analysis',
          'validation'
        )
      }
      
      // Get document stats for debugging and monitoring
      const stats = getDocumentStats(elements)
      const estimatedTokens = estimateTokenCount(annotatedContent, query)
      
      logger.info({
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        documentId,
        documentStats: stats,
        estimatedTokens
      }, 'Processing semantic search for document')
      
      // Check token limit (conservative threshold)
      const MAX_TOKENS = 50000 // Conservative limit for semantic search
      if (estimatedTokens > MAX_TOKENS) {
        throw createHandlerError(
          `Document too large for semantic search. Estimated ${estimatedTokens} tokens, maximum is ${MAX_TOKENS}`,
          'validation'
        )
      }
      
      // Get model configuration for AI call tracking
      const { modelString, config: modelConfig } = getModelForAICall()
      
      // Create AI call record for tracking
      const aiCall = await aiCallService.startCallWithModelString({
        userId: context.user.id,
        documentId,
        modelString: modelString,
        prompt_type: 'semantic-search',
        input_data: { 
          query,
          content_length: annotatedContent.length,
          elements_count: stats.meaningfulElements,
          estimated_tokens: estimatedTokens,
          model_used: modelString
        }
      })
      
      logger.info({
        documentId,
        modelProvider: modelConfig.provider,
        modelString: modelString,
        aiCallId: aiCall.id
      }, 'Starting AI semantic search')
      
      // Execute semantic search prompt with LLM
      const aiTimer = createTimer(logger, 'semantic-search-llm-call')
      let llmResult
      
      try {
        llmResult = await executePromptWithUsage(semanticSearchPrompt, { 
          content: annotatedContent,
          query,
          documentId
        })
        
        const aiDuration = aiTimer.end({
          documentId,
          modelProvider: modelConfig.provider,
          modelString: modelString,
          tokensUsed: llmResult.usage?.totalTokens
        })
        
        // Log AI operation success
        logAIOperation('semantic-search', {
          modelProvider: modelConfig.provider,
          tokensUsed: llmResult.usage?.totalTokens,
          userId: context.user.id,
          documentId,
          correlationId: context.request.correlationId
        }, 'success')
        
        logger.info({
          documentId,
          aiCallId: aiCall.id,
          modelProvider: modelConfig.provider,
          modelString: modelString,
          tokensUsed: llmResult.usage?.totalTokens,
          duration: aiDuration
        }, 'LLM semantic search call completed successfully')
      } catch (aiError) {
        // Log AI operation failure
        logAIOperation('semantic-search', {
          modelProvider: modelConfig.provider,
          userId: context.user.id,
          documentId,
          correlationId: context.request.correlationId
        }, 'error', aiError instanceof Error ? aiError : new Error('Unknown AI error'))
        
        logger.error({
          error: aiError instanceof Error ? aiError.message : 'Unknown AI error',
          documentId,
          aiCallId: aiCall.id
        }, 'LLM semantic search call failed')
        
        throw aiError
      }
      
      // Parse the JSON response from LLM with improved robustness
      let jsonString = llmResult.text.trim()
      
      // Strip markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7) // Remove ```json
      }
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3) // Remove ```
      }
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.slice(0, -3) // Remove ending ```
      }
      
      // Clean up the JSON string
      jsonString = jsonString.trim()
      
      // Try to parse JSON with better error handling
      let parsedResponse
      try {
        parsedResponse = JSON.parse(jsonString)
      } catch (parseError) {
        logger.error({
          error: parseError instanceof Error ? parseError.message : 'JSON parse error',
          query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
          documentId,
          rawResponseLength: llmResult.text.length,
          cleanedResponseLength: jsonString.length
        }, 'Failed to parse LLM JSON response')
        
        // Try to extract JSON from the response if it's embedded in other text
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedResponse = JSON.parse(jsonMatch[0])
            logger.info({
              documentId
            }, 'Successfully recovered JSON from embedded LLM response')
          } catch (recoveryError) {
            logger.error({
              error: recoveryError instanceof Error ? recoveryError.message : 'JSON recovery failed',
              documentId
            }, 'Failed to recover JSON from embedded LLM response')
            throw new Error(`Failed to parse LLM JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
          }
        } else {
          throw new Error(`Failed to parse LLM JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
        }
      }
      
      // Validate the response matches our expected schema
      const validatedResponse = semanticSearchResponseSchema.parse(parsedResponse)
      
      logger.info({
        documentId,
        totalMatches: validatedResponse.matches.length
      }, 'LLM response validated successfully')
      
      // Validate that all returned element IDs exist in the document
      const elementIds = validatedResponse.matches.map(match => match.elementId)
      const validElementIds = validateSemanticSearchElementIds(elements, elementIds)
      
      // Filter matches: valid element IDs + confidence >= 0.25 (conservative threshold)
      const validMatches = validatedResponse.matches.filter(match => 
        validElementIds.includes(match.elementId) && match.confidence >= 0.25
      )
      
      const filteredCount = validatedResponse.matches.length - validMatches.length
      if (filteredCount > 0) {
        const lowConfidenceCount = validatedResponse.matches.filter(match => match.confidence < 0.25).length
        const invalidIdCount = filteredCount - lowConfidenceCount
        
        logger.warn({
          documentId,
          totalMatches: validatedResponse.matches.length,
          validMatches: validMatches.length,
          filteredCount,
          invalidIdCount,
          lowConfidenceCount
        }, 'Filtered semantic search matches due to invalid IDs or low confidence')
      }
      
      // Complete the AI call record with usage metadata
      await aiCallService.completeCall(aiCall.id, {
        output_data: {
          matches_found: validMatches.length,
          total_matches_returned: validatedResponse.matches.length,
          invalid_ids_filtered: validatedResponse.matches.length - validMatches.length,
          processing_notes: 'Semantic search completed successfully'
        },
        usage: llmResult.usage,
        finishReason: llmResult.finishReason
      })
      
      logger.info({
        documentId,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        matchesFound: validMatches.length
      }, 'Semantic search completed successfully')
      
      // Store the results in cache
      try {
        const cacheContent = {
          originalQuery: query,
          normalizedQuery: normalizedQuery,
          matches: validMatches,
          stats: {
            totalElements: stats.totalElements,
            searchableElements: stats.meaningfulElements,
            matchesFound: validMatches.length,
            estimatedTokensUsed: estimatedTokens
          },
          searchedAt: new Date().toISOString()
        }
        
        await enhancementService.upsert({
          documentId,
          aiCallId: aiCall.id,
          type: 'semantic-search',
          subtype: normalizedQuery,
          content: cacheContent
        })
        
        logger.info({
          documentId,
          normalizedQuery
        }, 'Successfully cached semantic search results')
      } catch (cacheError) {
        // Log error but don't fail the request - results are still valid
        logger.error({
          error: cacheError instanceof Error ? cacheError.message : 'Unknown cache error',
          documentId
        }, 'Failed to cache semantic search results')
      }
      
      return {
        matches: validMatches,
        query,
        documentId,
        stats: {
          totalElements: stats.totalElements,
          searchableElements: stats.meaningfulElements,
          matchesFound: validMatches.length,
          estimatedTokensUsed: estimatedTokens
        },
        aiCallId: aiCall.id,
        cached: false,
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed(),
          matchCount: validMatches.length,
          tokensUsed: llmResult.usage?.totalTokens,
          aiCallId: aiCall.id
        })
      }
      
    } catch (error) {
      logger.error({
        documentId: parameters.documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error processing semantic search')
      
      // Handle authentication errors specifically
      if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('User not authenticated'))) {
        throw createHandlerError('Authentication required for search operations', 'auth')
      }
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to process semantic search',
        'server',
        true
      )
    }
  }
  
  async handleDelete(
    params: DeleteRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('search-handler:delete', context.request.correlationId)
    const requestTimer = createTimer()
    
    const documentId = params.documentId
    if (!documentId || typeof documentId !== 'string') {
      throw createHandlerError(
        'documentId is required for search history deletion',
        'validation'
      )
    }
    
    logger.info({
      documentId,
      userId: context.user?.id
    }, 'Search DELETE request initiated')
    
    try {
      // Initialize database services
      const supabase = context.supabaseClient!
      
      // Delete all semantic search enhancements for this document
      const { error } = await supabase
        .from('document_enhancements')
        .delete()
        .eq('document_id', documentId)
        .eq('type', 'semantic-search')
      
      if (error) {
        logger.error({
          documentId,
          error: error.message
        }, 'Error deleting search history')
        
        throw createHandlerError(
          'Failed to delete search history',
          'server',
          true
        )
      }
      
      logger.info({
        documentId
      }, 'Search history deleted successfully')
      
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
      }, 'Error deleting search history')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to delete search history',
        'server',
        true
      )
    }
  }
}

// Export the handler instance
const searchHandler = new SearchHandler()
export default searchHandler