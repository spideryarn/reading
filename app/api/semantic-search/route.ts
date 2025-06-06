// Semantic Search API endpoint for LLM-powered semantic document analysis
// See planning/250606a_semantic_search_implementation.md for architecture details

import { NextRequest, NextResponse } from 'next/server'
import { executePrompt } from '@/lib/prompts/types'
import { 
  semanticSearchPrompt, 
  semanticSearchApiInputSchema, 
  semanticSearchResponseSchema 
} from '@/lib/prompts/templates/semantic-search'
import { createClient } from '@/lib/supabase/server'
import { DocumentService } from '@/lib/services/database/documents'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { DocumentParser } from '@/lib/services/document-parser'
import { getModelConfig, AI_CONFIG } from '@/lib/config'
import { 
  formatDocumentForSemanticSearch, 
  validateSemanticSearchElementIds,
  getDocumentStats,
  estimateTokenCount 
} from '@/lib/services/semantic-search-formatter'

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
    
    // Initialize database services
    const supabase = await createClient()
    const documentService = new DocumentService(supabase)
    const aiCallService = new AiCallService(supabase)
    const documentParser = new DocumentParser()
    
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
    const llmResponse = await executePrompt(semanticSearchPrompt, { 
      content: annotatedContent,
      query,
      documentId
    })
    
    // Parse the JSON response from LLM (strip markdown code blocks if present)
    let jsonString = llmResponse.trim()
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
    
    // Debug: Log the parsed LLM response
    console.log(`[SemanticSearch] LLM Response:`, JSON.stringify(parsedResponse, null, 2))
    
    // Validate the response matches our expected schema
    const validatedResponse = semanticSearchResponseSchema.parse(parsedResponse)
    
    // Validate that all returned element IDs exist in the document
    const elementIds = validatedResponse.matches.map(match => match.elementId)
    const validElementIds = validateSemanticSearchElementIds(elements, elementIds)
    
    // Filter matches to only include valid element IDs
    const validMatches = validatedResponse.matches.filter(match => 
      validElementIds.includes(match.elementId)
    )
    
    if (validMatches.length !== validatedResponse.matches.length) {
      console.warn(`[SemanticSearch] Filtered ${validatedResponse.matches.length - validMatches.length} invalid element IDs`)
    }
    
    // Complete the AI call record
    await aiCallService.completeCall(aiCall.id, {
      output_data: {
        matches_found: validMatches.length,
        total_matches_returned: validatedResponse.matches.length,
        invalid_ids_filtered: validatedResponse.matches.length - validMatches.length,
        processing_notes: 'Semantic search completed successfully'
      }
    })
    
    console.log(`[SemanticSearch] Found ${validMatches.length} semantic matches for query: "${query}"`)
    
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
      aiCallId: aiCall.id
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