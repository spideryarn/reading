// Multi-Dimensional AI Summarisation API endpoint
// Generates all 9 summaries in a single LLM call using structured JSON output
// See planning/250608b_multiple_summary_granularities.md for architecture

import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { 
  multiSummarisePrompt, 
  multiSummaryOutputSchema,
  type MultiSummaryOutput
} from '@/lib/prompts/templates/multi-summarise'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig, AI_CONFIG } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Check if multi-dimensional summary already exists in database
    const existingSummary = await enhancementService.getMultiSummary(documentId)
    
    if (existingSummary) {
      return NextResponse.json({ 
        summaries: existingSummary,
        cached: true
      })
    }
    
    // No cached summary found
    return NextResponse.json({ 
      cached: false,
      summaries: null
    })
  } catch (error) {
    console.error('Error fetching cached multi-summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cached multi-summary' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Delete multi-dimensional summary enhancement
    await enhancementService.delete(documentId, 'summary', 'multi-dimensional')
    
    return NextResponse.json({ 
      success: true,
      message: 'Multi-dimensional summary enhancement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting multi-summary enhancement:', error)
    return NextResponse.json(
      { error: 'Failed to delete multi-summary enhancement' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, documentId } = await request.json()
    
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
    
    // Check if multi-dimensional summary already exists
    const existingSummary = await enhancementService.getMultiSummary(documentId)
    
    if (existingSummary) {
      return NextResponse.json({ 
        summaries: existingSummary,
        cached: true
      })
    }
    
    // Resolve tier key to actual model details using config
    const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as keyof typeof AI_CONFIG.MODELS
    const modelConfig = getModelConfig(tierKey)
    
    // Create AI call tracking for the single multi-summary generation
    let aiCall
    try {
      aiCall = await aiCallService.startCall({
        documentId,
        provider: modelConfig.provider,
        modelId: modelConfig.modelId,
        prompt_type: 'multi-summarise',
        input_data: { 
          content_length: content.length,
          approach: 'single-prompt-structured-output',
          combinations_count: 9,
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
    
    // Generate all 9 summaries in a single structured LLM call
    let summaryResult
    try {
      summaryResult = await executePromptWithUsage(multiSummarisePrompt, { content })
    } catch (summaryError) {
      // Mark AI call as failed
      await aiCallService.failCall(
        aiCall.id,
        summaryError instanceof Error ? summaryError.message : 'Unknown summary generation error'
      )
      
      console.error('Failed to generate multi-dimensional summary:', summaryError)
      return NextResponse.json(
        { error: 'Failed to generate multi-dimensional summary' },
        { status: 500 }
      )
    }
    
    // Parse and validate the structured JSON response
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
      
      console.error('Failed to parse multi-summary JSON:', parseError)
      console.error('Raw LLM response:', summaryResult.text)
      return NextResponse.json(
        { error: 'Invalid JSON response from LLM - failed to parse structured summary output' },
        { status: 500 }
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
      console.error('Failed to complete AI call tracking:', trackingError)
      // Continue - the summaries were generated successfully even if tracking failed
    }
    
    // Store in database
    try {
      const enhancement = await enhancementService.storeMultiSummary(
        documentId,
        { 'single-call': aiCall.id }, // Simple mapping since it's one call
        parsedSummaries,
        {
          generatedAt: new Date().toISOString(),
          modelUsed: modelConfig.modelId,
          tierUsed: tierKey,
          approach: 'single-prompt-structured-output'
        }
      )
      
      return NextResponse.json({ 
        summaries: parsedSummaries,
        cached: false,
        enhancementId: enhancement.id,
        totalCombinations: 9,
        aiCallId: aiCall.id,
        approach: 'single-prompt'
      })
    } catch (dbError) {
      // If database storage fails, still return the generated summaries
      console.error('Failed to store multi-summary in database:', dbError)
      return NextResponse.json({ 
        summaries: parsedSummaries,
        cached: false,
        warning: 'Summaries generated but not saved to database',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        aiCallId: aiCall.id
      })
    }
  } catch (error) {
    console.error('Error generating multi-dimensional summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate multi-dimensional summary' },
      { status: 500 }
    )
  }
}