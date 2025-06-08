// AI Summarisation API endpoint with configurable granularity
// See docs/AI_SUMMARISE.md for architecture and usage patterns

import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { summarisePrompt, getMaxTokensForGranularity, getGranularityInstruction } from '@/lib/prompts/templates/summarise'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig, AI_CONFIG } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const granularity = searchParams.get('granularity')
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Check if summary already exists in database
    const existingSummary = await enhancementService.get(
      documentId,
      'summary',
      granularity || undefined
    )
    
    if (existingSummary) {
      // Validate cached data structure - fail fast if malformed
      if (!existingSummary.content || typeof existingSummary.content !== 'object') {
        throw new Error(`Malformed summary data in database for enhancement ${existingSummary.id}: content is not an object`)
      }
      
      if (typeof existingSummary.content.text !== 'string') {
        throw new Error(`Malformed summary data in database for enhancement ${existingSummary.id}: content.text is not a string. Found: ${typeof existingSummary.content.text}`)
      }
      
      return NextResponse.json({ 
        summary: existingSummary.content.text,
        cached: true,
        enhancementId: existingSummary.id,
        metadata: existingSummary.content.metadata || {}
      })
    }
    
    // No cached summary found
    return NextResponse.json({ 
      cached: false,
      summary: null
    })
  } catch (error) {
    console.error('Error fetching cached summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cached summary' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const granularity = searchParams.get('granularity')
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Delete summary enhancement for this document and granularity
    await enhancementService.delete(documentId, 'summary', granularity || undefined)
    
    return NextResponse.json({ 
      success: true,
      message: 'Summary enhancement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting summary enhancement:', error)
    return NextResponse.json(
      { error: 'Failed to delete summary enhancement' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, granularity, documentId, sectionId } = await request.json()
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }
    
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'DocumentId is required and must be a string' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
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
      return NextResponse.json({ 
        summary: existingSummary.content.text,
        cached: true,
        enhancementId: existingSummary.id
      })
    }
    
    // Create a template with granularity-specific maxTokens
    const templateWithTokens = {
      ...summarisePrompt,
      modelConfig: {
        ...summarisePrompt.modelConfig,
        maxTokens: granularity ? getMaxTokensForGranularity(granularity) : 200
      }
    }
    
    // Resolve tier key to actual model details using config
    const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as keyof typeof AI_CONFIG.MODELS
    const modelConfig = getModelConfig(tierKey)
    
    // Start tracking AI call for metrics
    let aiCall
    try {
      aiCall = await aiCallService.startCall({
        documentId,
        provider: modelConfig.provider,
        modelId: modelConfig.modelId,
        prompt_type: 'summarise',
        input_data: { 
          content_length: content.length,
          granularity,
          section_id: sectionId,
          tier_used: tierKey
        }
      })
    } catch (aiCallError) {
      console.error('Failed to create AI call:', aiCallError)
      return NextResponse.json(
        { error: 'Failed to initialize AI call tracking' },
        { status: 500 }
      )
    }
    
    // Performance timing was removed as it's not currently used
    // If needed in future: const startTime = Date.now()
    
    try {
      const summaryResult = await executePromptWithUsage(templateWithTokens, { 
        content, 
        granularity: getGranularityInstruction(granularity)
      })
      
      // Performance timing was removed as it's not currently used
      // If needed in future: const endTime = Date.now()
      
      // Complete AI call tracking with success and usage metadata
      await aiCallService.completeCall(aiCall.id, {
        output_data: {
          text_length: summaryResult.text.length,
          processing_notes: 'Summary generation completed successfully'
        },
        usage: summaryResult.usage,
        finishReason: summaryResult.finishReason
      })
      
      // Store summary in database
      try {
        const enhancement = await enhancementService.storeSummary(
          documentId,
          aiCall.id,
          {
            text: summaryResult.text,
            metadata: {
              granularity,
              sectionId,
              generatedAt: new Date().toISOString(),
              modelUsed: modelConfig.modelId
            }
          },
          cacheKey
        )
        
        return NextResponse.json({ 
          summary: summaryResult.text,
          cached: false,
          enhancementId: enhancement.id,
          aiCallId: aiCall.id
        })
      } catch (dbError) {
        // If database storage fails, still return the generated summary
        console.error('Failed to store summary in database:', dbError)
        return NextResponse.json({ 
          summary: summaryResult.text,
          cached: false,
          warning: 'Summary generated but not saved to database',
          error: dbError instanceof Error ? dbError.message : 'Unknown database error'
        })
      }
    } catch (llmError) {
      // Mark AI call as failed
      await aiCallService.failCall(
        aiCall.id,
        llmError instanceof Error ? llmError.message : 'Unknown LLM error'
      )
      throw llmError
    }
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}