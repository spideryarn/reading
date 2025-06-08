// Semantic Search API endpoint for LLM-powered semantic document analysis
// See planning/250606a_semantic_search_implementation.md for architecture details

import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { 
  semanticSearchPrompt, 
  semanticSearchApiInputSchema, 
  semanticSearchResponseSchema 
} from '@/lib/prompts/templates/semantic-search'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { DocumentParser } from '@/lib/services/document-parser'
import { getModelConfig, AI_CONFIG } from '@/lib/config'
import { normalizeSemanticSearchQuery } from '@/lib/utils/semantic-search'
import { 
  formatDocumentForSemanticSearch, 
  validateSemanticSearchElementIds,
  getDocumentStats,
  estimateTokenCount 
} from '@/lib/services/semantic-search-formatter'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId query parameter is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Get all semantic search enhancements for this document
    const { data: enhancements, error } = await supabase
      .from('document_enhancements')
      .select('subtype, created_at, content')
      .eq('document_id', documentId)
      .eq('type', 'semantic-search')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[SemanticSearch] Error fetching query history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch query history' },
        { status: 500 }
      )
    }
    
    // Extract query information from the cached data
    const queries = (enhancements || []).map(enhancement => {
      const content = enhancement.content as {
        originalQuery?: string
        normalizedQuery: string
        matches?: Array<any>
        searchedAt?: string
      }
      
      return {
        query: content.originalQuery || enhancement.subtype, // Fallback to subtype if originalQuery not available
        normalizedQuery: enhancement.subtype,
        searchedAt: content.searchedAt || enhancement.created_at,
        resultCount: Array.isArray(content.matches) ? content.matches.length : 0
      }
    })
    
    console.log(`[SemanticSearch] Found ${queries.length} cached queries for document ${documentId}`)
    
    return NextResponse.json({
      documentId,
      queries
    })
  } catch (error) {
    console.error('[SemanticSearch] Error in GET handler:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch query history'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = semanticSearchApiInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error },
        { status: 400 }
      )
    }
    
    const { query, documentId } = validationResult.data
    
    // Validate required fields for API usage
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required for semantic search' },
        { status: 400 }
      )
    }
    
    // Normalize the query for consistent caching
    const normalizedQuery = normalizeSemanticSearchQuery(query)
    
    // Initialize database services
    const supabase = await createClient()
    const documentService = new DocumentService(supabase)
    const aiCallService = new AiCallService(supabase)
    const enhancementService = new EnhancementService(supabase)
    const documentParser = new DocumentParser()
    
    // Check for cached results first
    const cachedResult = await enhancementService.get(
      documentId,
      'semantic-search', // Type is just a string in the database
      normalizedQuery
    )
    
    if (cachedResult) {
      console.log(`[SemanticSearch] Returning cached results for query: "${query}" (normalized: "${normalizedQuery}")`)
      
      // Validate cached data structure
      if (!cachedResult.content || typeof cachedResult.content !== 'object') {
        throw new Error(`Malformed semantic search cache data for enhancement ${cachedResult.id}: content is not an object`)
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
      
      return NextResponse.json({
        matches: cachedContent.matches,
        query: cachedContent.originalQuery || query,
        documentId,
        stats: cachedContent.stats,
        aiCallId: cachedResult.ai_call_id,
        cached: true,
        cachedAt: cachedResult.created_at,
        enhancementId: cachedResult.id
      })
    }
    
    // Load document from database
    const document = await documentService.getById(documentId)
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }
    
    // Parse HTML content into document elements
    if (!document.html_content) {
      return NextResponse.json(
        { error: 'Document has no HTML content for semantic analysis' },
        { status: 400 }
      )
    }
    
    const elements = documentParser.parse(document.html_content, documentId)
    if (!elements || elements.length === 0) {
      return NextResponse.json(
        { error: 'No document elements found after parsing' },
        { status: 404 }
      )
    }
    
    // Convert document to annotated format for LLM
    const annotatedContent = formatDocumentForSemanticSearch(elements)
    if (!annotatedContent.trim()) {
      return NextResponse.json(
        { error: 'Document contains no meaningful content for semantic analysis' },
        { status: 400 }
      )
    }
    
    // Get document stats for debugging and monitoring
    const stats = getDocumentStats(elements)
    const estimatedTokens = estimateTokenCount(annotatedContent, query)
    
    console.log(`[SemanticSearch] Processing query: "${query}" for document ${documentId}`)
    console.log(`[SemanticSearch] Document stats:`, stats)
    console.log(`[SemanticSearch] Estimated tokens: ${estimatedTokens}`)
    
    // Check token limit (conservative threshold)
    const MAX_TOKENS = 50000 // Conservative limit for semantic search
    if (estimatedTokens > MAX_TOKENS) {
      return NextResponse.json(
        { 
          error: 'Document too large for semantic search',
          details: `Estimated ${estimatedTokens} tokens, maximum is ${MAX_TOKENS}`
        },
        { status: 413 }
      )
    }
    
    // Resolve tier key to actual model details using config
    const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as any
    const modelConfig = getModelConfig(tierKey)
    
    // Create AI call record for tracking
    const aiCall = await aiCallService.startCall({
      documentId,
      provider: modelConfig.provider,
      modelId: modelConfig.modelId,
      prompt_type: 'semantic-search',
      input_data: { 
        query,
        content_length: annotatedContent.length,
        elements_count: stats.meaningfulElements,
        estimated_tokens: estimatedTokens,
        tier_used: tierKey
      }
    })
    
    // Execute semantic search prompt with LLM
    const llmResult = await executePromptWithUsage(semanticSearchPrompt, { 
      content: annotatedContent,
      query,
      documentId
    })
    
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
      console.error(`[SemanticSearch] JSON parse error for query "${query}":`, parseError)
      console.error(`[SemanticSearch] Raw LLM response length: ${llmResult.text.length}`)
      console.error(`[SemanticSearch] Cleaned JSON string length: ${jsonString.length}`)
      
      // Try to extract JSON from the response if it's embedded in other text
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0])
          console.log(`[SemanticSearch] Successfully recovered JSON from embedded response`)
        } catch (recoveryError) {
          throw new Error(`Failed to parse LLM JSON response: ${parseError.message}`)
        }
      } else {
        throw new Error(`Failed to parse LLM JSON response: ${parseError.message}`)
      }
    }
    
    // Debug: Log the parsed LLM response
    console.log(`[SemanticSearch] LLM Response:`, JSON.stringify(parsedResponse, null, 2))
    
    // Validate the response matches our expected schema
    const validatedResponse = semanticSearchResponseSchema.parse(parsedResponse)
    
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
      console.warn(`[SemanticSearch] Filtered ${filteredCount} matches: ${invalidIdCount} invalid element IDs, ${lowConfidenceCount} low confidence (<0.25)`)
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
    
    console.log(`[SemanticSearch] Found ${validMatches.length} semantic matches for query: "${query}"`)
    
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
      
      console.log(`[SemanticSearch] Cached results for query: "${query}" (normalized: "${normalizedQuery}")`)
    } catch (cacheError) {
      // Log error but don't fail the request - results are still valid
      console.error('[SemanticSearch] Failed to cache results:', cacheError)
    }
    
    return NextResponse.json({
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
      cached: false
    })
  } catch (error) {
    console.error('[SemanticSearch] Error processing semantic search:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process semantic search'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}