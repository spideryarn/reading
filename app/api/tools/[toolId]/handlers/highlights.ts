/**
 * Highlights tool handler - Semantic highlighting and annotation management
 * 
 * Handles highlight operations including semantic highlight generation, 
 * highlight retrieval, and highlight management. This handler interfaces with
 * the existing semantic search functionality to provide AI-powered highlighting
 * based on user-defined criteria.
 * 
 * Actions:
 * - 'generate' or 'execute' - Generate semantic highlights based on criteria
 * - 'get' or 'list' - Get cached highlights for a document (via GET)
 * - 'delete' - Remove highlights/semantic search cache (via DELETE)
 * 
 * @see docs/reference/TOOL_HIGHLIGHT.md for complete highlighting system documentation
 * @see components/highlight-management.tsx for UI integration
 * @see app/api/semantic-search/route.ts for underlying semantic search functionality
 */

import { z } from 'zod'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { normalizeSemanticSearchQuery } from '@/lib/utils/semantic-search'
import { createRequestLogger, createTimer } from '@/lib/services/logger'
import { BaseToolHandler, createHandlerError } from '../handler-interface'
import type { ExecutionContext, ToolApiResponse } from '@/lib/tools/executor/types'
import type { GetRequestParams, DeleteRequestParams } from '../handler-interface'

// Validation schemas
const HighlightsGetRequestSchema = z.object({
  action: z.enum(['get', 'list']).default('get'),
  documentId: z.string().min(1, 'Document ID is required')
})

const HighlightsGenerateSchema = z.object({
  action: z.enum(['generate', 'execute']).default('generate'),
  documentId: z.string().min(1, 'Document ID is required'),
  criterion: z.string().min(1, 'Highlight criterion is required').max(500, 'Criterion too long'),
  // Optional parameters for advanced highlighting
  confidenceThreshold: z.number().min(0).max(1).optional().default(0.25),
  maxResults: z.number().int().min(1).max(100).optional().default(50)
})

const HighlightsDeleteSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  criterion: z.string().optional() // Optional - if provided, delete specific highlight set
})

/**
 * Interface for semantic highlight data (matching component usage)
 */
interface SemanticHighlight {
  elementId: string
  confidence: number
}

/**
 * Interface for full highlight data with metadata
 */
interface HighlightData {
  id: string
  criterion: string
  elementId: string
  elementType: string
  textExcerpt: string
  confidence: number
  reasoning: string
  createdAt: string
}

/**
 * Highlights tool handler for semantic highlighting operations
 */
export class HighlightsHandler extends BaseToolHandler {
  constructor() {
    super('highlights')
  }
  
  async handleGet(
    params: GetRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('highlights-handler:get', context.request.correlationId)
    
    const validation = HighlightsGetRequestSchema.safeParse(params)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId } = validation.data
    
    logger.info({
      documentId,
      action: 'get_cached_highlights',
      userId: context.user?.id || 'unauthenticated'
    }, 'Fetching cached document highlights')
    
    try {
      // Initialize database services
      const supabase = await createClient()
      
      // Get all semantic search enhancements for this document (these are our highlights)
      const { data: enhancements, error } = await supabase
        .from('document_enhancements')
        .select('id, subtype, created_at, content, ai_call_id')
        .eq('document_id', documentId)
        .eq('type', 'semantic-search')
        .order('created_at', { ascending: false })
      
      if (error) {
        logger.error({
          error: error.message,
          documentId
        }, 'Failed to fetch highlights from database')
        
        throw createHandlerError(
          'Failed to fetch cached highlights',
          'server',
          true
        )
      }
      
      // Transform enhancements into highlight query list
      const highlights = (enhancements || []).map(enhancement => {
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
          stats?: {
            totalElements: number
            searchableElements: number
            matchesFound: number
          }
        }
        
        return {
          id: enhancement.id,
          criterion: content.originalQuery || enhancement.subtype,
          normalizedQuery: enhancement.subtype,
          createdAt: content.searchedAt || enhancement.created_at,
          matchCount: Array.isArray(content.matches) ? content.matches.length : 0,
          matches: content.matches || [],
          stats: content.stats,
          aiCallId: enhancement.ai_call_id
        }
      })
      
      logger.info({
        documentId,
        highlightCount: highlights.length,
        totalMatches: highlights.reduce((sum, h) => sum + h.matchCount, 0)
      }, 'Retrieved cached highlights successfully')
      
      return {
        highlights,
        documentId,
        cached: true,
        type: 'highlights',
        ...this.createResponseMetadata()
      }
      
    } catch (error) {
      logger.error({
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to fetch cached highlights')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to fetch cached highlights',
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
    const logger = createRequestLogger('highlights-handler:post', context.request.correlationId)
    
    if (!context.user) {
      throw createHandlerError('Authentication required for highlight operations', 'auth')
    }
    
    // Route based on action type
    if (action === 'generate' || action === 'execute') {
      return this.handleGenerateHighlights(parameters, context, logger)
    } else {
      throw createHandlerError(
        `Unsupported action: ${action}. Supported actions: generate, execute`,
        'validation'
      )
    }
  }
  
  /**
   * Handle generating semantic highlights by delegating to semantic search API
   */
  private async handleGenerateHighlights(
    parameters: Record<string, unknown>,
    context: ExecutionContext,
    logger: ReturnType<typeof createRequestLogger>
  ): Promise<ToolApiResponse> {
    const requestTimer = createTimer()
    
    // Validate input
    const validation = HighlightsGenerateSchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId, criterion, confidenceThreshold, maxResults } = validation.data
    
    logger.info({
      userId: context.user!.id,
      documentId,
      criterion: criterion.substring(0, 100) + (criterion.length > 100 ? '...' : ''),
      confidenceThreshold,
      maxResults,
      operation: 'highlight_generation'
    }, 'Starting highlight generation request')
    
    try {
      // Normalize the criterion for caching consistency
      const normalizedCriterion = normalizeSemanticSearchQuery(criterion)
      
      // Initialize database services
      const supabase = await createClient()
      const enhancementService = new EnhancementService(supabase)
      
      // Check for cached results first
      const cachedResult = await enhancementService.get(
        documentId,
        'semantic-search',
        normalizedCriterion
      )
      
      if (cachedResult) {
        logger.info({
          documentId,
          criterion: criterion.substring(0, 100) + (criterion.length > 100 ? '...' : ''),
          enhancementId: cachedResult.id,
          operation: 'cache_hit'
        }, 'Returning cached highlight results')
        
        // Validate cached data structure
        const cachedContent = cachedResult.content as {
          originalQuery?: string
          normalizedQuery: string
          matches: Array<{
            elementId: string
            confidence: number
            reasoning: string
            relevantText: string
          }>
          stats?: {
            totalElements: number
            searchableElements: number
            matchesFound: number
          }
          searchedAt: string
        }
        
        if (!Array.isArray(cachedContent.matches)) {
          throw new Error(`Malformed highlight cache data for enhancement ${cachedResult.id}: matches is not an array`)
        }
        
        // Filter matches by confidence threshold
        const filteredMatches = cachedContent.matches.filter(
          match => match.confidence >= confidenceThreshold
        ).slice(0, maxResults)
        
        // Convert to semantic highlights format
        const semanticHighlights: SemanticHighlight[] = filteredMatches.map(match => ({
          elementId: match.elementId,
          confidence: match.confidence
        }))
        
        // Convert to full highlight data format
        const highlightData: HighlightData[] = filteredMatches.map((match, index) => ({
          id: `${normalizedCriterion}-${match.elementId}-${index}`,
          criterion,
          elementId: match.elementId,
          elementType: 'paragraph', // Would need document parsing to get actual type
          textExcerpt: match.relevantText || '',
          confidence: match.confidence,
          reasoning: match.reasoning,
          createdAt: cachedResult.created_at
        }))
        
        return {
          highlights: highlightData,
          semanticHighlights,
          criterion,
          documentId,
          cached: true,
          cachedAt: cachedResult.created_at,
          enhancementId: cachedResult.id,
          aiCallId: cachedResult.ai_call_id,
          stats: cachedContent.stats,
          type: 'highlights',
          ...this.createResponseMetadata({
            executionTime: requestTimer.elapsed(),
            matchCount: filteredMatches.length,
            totalCachedMatches: cachedContent.matches.length
          })
        }
      }
      
      // No cached results - delegate to semantic search API
      // Create a new request to the semantic search endpoint
      const semanticSearchRequest = new Request('http://localhost/api/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward authentication headers if available
          ...(context.request && 'cookie' in context.request ? {
            'Cookie': context.request.cookie
          } : {})
        },
        body: JSON.stringify({
          query: criterion,
          documentId
        })
      })
      
      // Import and call the semantic search API directly
      // This avoids HTTP overhead while maintaining the same logic
      const semanticSearchModule = await import('../../../semantic-search/route')
      const semanticSearchResponse = await semanticSearchModule.POST(semanticSearchRequest as NextRequest)
      
      if (!semanticSearchResponse.ok) {
        const errorData = await semanticSearchResponse.json()
        throw new Error(errorData.error || 'Semantic search failed')
      }
      
      const semanticSearchData = await semanticSearchResponse.json()
      
      // Define the shape of semantic search match data
      interface SemanticSearchMatch {
        elementId: string
        confidence: number
        reasoning: string
        relevantText: string
      }
      
      // Filter matches by confidence threshold
      const filteredMatches = (semanticSearchData.matches as SemanticSearchMatch[]).filter(
        (match) => match.confidence >= confidenceThreshold
      ).slice(0, maxResults)
      
      // Convert to semantic highlights format
      const semanticHighlights: SemanticHighlight[] = filteredMatches.map((match) => ({
        elementId: match.elementId,
        confidence: match.confidence
      }))
      
      // Convert to full highlight data format
      const highlightData: HighlightData[] = filteredMatches.map((match, index: number) => ({
        id: `${normalizedCriterion}-${match.elementId}-${index}`,
        criterion,
        elementId: match.elementId,
        elementType: 'paragraph',
        textExcerpt: match.relevantText || '',
        confidence: match.confidence,
        reasoning: match.reasoning,
        createdAt: new Date().toISOString()
      }))
      
      logger.info({
        documentId,
        criterion: criterion.substring(0, 100) + (criterion.length > 100 ? '...' : ''),
        matchesFound: filteredMatches.length,
        totalMatches: semanticSearchData.matches.length,
        aiCallId: semanticSearchData.aiCallId,
        executionTime: requestTimer.elapsed()
      }, 'Highlight generation completed successfully')
      
      return {
        highlights: highlightData,
        semanticHighlights,
        criterion,
        documentId,
        cached: false,
        enhancementId: null, // Will be available on next request from cache
        aiCallId: semanticSearchData.aiCallId,
        stats: semanticSearchData.stats,
        type: 'highlights',
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed(),
          matchCount: filteredMatches.length,
          totalMatches: semanticSearchData.matches.length
        })
      }
      
    } catch (error) {
      logger.error({
        documentId,
        criterion: criterion.substring(0, 100) + (criterion.length > 100 ? '...' : ''),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error generating highlights')
      
      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        // Document not found errors
        if (error.message.includes('Document not found')) {
          throw createHandlerError(
            'Document not found for highlight generation',
            'not_found',
            false
          )
        }
        
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
        
        // Network/connectivity errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw createHandlerError(
            'Network error - Failed to connect to AI service',
            'server',
            true
          )
        }
      }
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to generate highlights',
        'server',
        true
      )
    }
  }
  
  async handleDelete(
    params: DeleteRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('highlights-handler:delete', context.request.correlationId)
    const requestTimer = createTimer()
    
    if (!context.user) {
      throw createHandlerError('Authentication required for highlight operations', 'auth')
    }
    
    const validation = HighlightsDeleteSchema.safeParse(params)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId, criterion } = validation.data
    
    logger.info({
      documentId,
      criterion,
      userId: context.user.id
    }, 'Highlights DELETE request initiated')
    
    try {
      // Initialize database services
      const supabase = await createClient()
      
      if (criterion) {
        // Delete specific highlight set based on criterion
        const normalizedCriterion = normalizeSemanticSearchQuery(criterion)
        
        const { error } = await supabase
          .from('document_enhancements')
          .delete()
          .eq('document_id', documentId)
          .eq('type', 'semantic-search')
          .eq('subtype', normalizedCriterion)
        
        if (error) {
          throw new Error(error.message)
        }
        
        logger.info({
          documentId,
          criterion,
          normalizedCriterion,
          operation: 'specific_highlights_delete'
        }, 'Specific highlight set deleted successfully')
        
        return {
          success: true,
          deleted: true,
          type: 'highlights',
          documentId,
          criterion,
          message: `Highlights for criterion "${criterion}" deleted successfully`,
          ...this.createResponseMetadata({
            executionTime: requestTimer.elapsed()
          })
        }
      } else {
        // Delete all highlight sets for this document
        const { error } = await supabase
          .from('document_enhancements')
          .delete()
          .eq('document_id', documentId)
          .eq('type', 'semantic-search')
        
        if (error) {
          throw new Error(error.message)
        }
        
        logger.info({
          documentId,
          operation: 'all_highlights_delete'
        }, 'All highlight sets deleted successfully')
        
        return {
          success: true,
          deleted: true,
          type: 'highlights',
          documentId,
          message: 'All highlights deleted successfully',
          ...this.createResponseMetadata({
            executionTime: requestTimer.elapsed()
          })
        }
      }
      
    } catch (error) {
      logger.error({
        documentId,
        criterion,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Error deleting highlights')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to delete highlights',
        'server',
        true
      )
    }
  }
}

// Export the handler instance
const highlightsHandler = new HighlightsHandler()
export { highlightsHandler }
export default highlightsHandler