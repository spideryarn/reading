// Multi-Dimensional AI Summarisation API endpoint
// Generates 9 summaries in parallel (3×3 expertise × length combinations)
// See planning/250608b_multiple_summary_granularities.md for architecture

import { NextRequest, NextResponse } from 'next/server'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { 
  multiSummarisePrompt, 
  getAllCombinations, 
  getLengthInstruction,
  getMaxTokensForLength
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
    
    // Generate all 9 combinations
    const combinations = getAllCombinations()
    
    // Create AI call tracking for each combination
    const aiCalls: { [key: string]: { id: string } } = {}
    const aiCallPromises = combinations.map(async ({ expertise, length }) => {
      const combinationKey = `${expertise}_${length}`
      
      try {
        const aiCall = await aiCallService.startCall({
          documentId,
          provider: modelConfig.provider,
          modelId: modelConfig.modelId,
          prompt_type: 'multi-summarise',
          input_data: { 
            content_length: content.length,
            expertise_level: expertise,
            length_level: length,
            combination_key: combinationKey,
            tier_used: tierKey
          }
        })
        
        aiCalls[combinationKey] = aiCall
        return { combinationKey, aiCall }
      } catch (aiCallError) {
        console.error(`Failed to create AI call for ${combinationKey}:`, aiCallError)
        throw new Error(`Failed to initialize AI call tracking for ${combinationKey}`)
      }
    })
    
    // Wait for all AI call initializations
    await Promise.all(aiCallPromises)
    
    // Generate all summaries in parallel
    const summaryPromises = combinations.map(async ({ expertise, length }) => {
      const combinationKey = `${expertise}_${length}`
      const aiCall = aiCalls[combinationKey]
      
      try {
        // Create template with length-specific maxTokens
        const templateWithTokens = {
          ...multiSummarisePrompt,
          modelConfig: {
            ...multiSummarisePrompt.modelConfig,
            maxTokens: getMaxTokensForLength(length)
          }
        }
        
        const summaryResult = await executePromptWithUsage(templateWithTokens, { 
          content, 
          expertise_level: expertise,
          length_instruction: getLengthInstruction(length)
        })
        
        // Complete AI call tracking with success
        await aiCallService.completeCall(aiCall.id, {
          output_data: {
            text_length: summaryResult.text.length,
            expertise_level: expertise,
            length_level: length,
            processing_notes: 'Multi-dimensional summary generation completed successfully'
          },
          usage: summaryResult.usage,
          finishReason: summaryResult.finishReason
        })
        
        return {
          expertise,
          length,
          text: summaryResult.text,
          combinationKey,
          aiCallId: aiCall.id
        }
      } catch (summaryError) {
        // Mark AI call as failed
        await aiCallService.failCall(
          aiCall.id,
          summaryError instanceof Error ? summaryError.message : 'Unknown summary generation error'
        )
        throw summaryError
      }
    })
    
    let summaryResults
    try {
      // All-or-nothing: if any summary fails, entire operation fails
      summaryResults = await Promise.all(summaryPromises)
    } catch (error) {
      console.error('Failed to generate one or more summaries:', error)
      return NextResponse.json(
        { error: 'Failed to generate complete summary set - all-or-nothing policy' },
        { status: 500 }
      )
    }
    
    // Organize results into nested structure
    const organizedSummaries: {
      beginner: { sentence_or_two: string; single_short_paragraph: string; page: string }
      intermediate: { sentence_or_two: string; single_short_paragraph: string; page: string }
      expert: { sentence_or_two: string; single_short_paragraph: string; page: string }
    } = {
      beginner: { sentence_or_two: '', single_short_paragraph: '', page: '' },
      intermediate: { sentence_or_two: '', single_short_paragraph: '', page: '' },
      expert: { sentence_or_two: '', single_short_paragraph: '', page: '' }
    }
    
    const aiCallMapping: { [key: string]: string } = {}
    
    summaryResults.forEach(({ expertise, length, text, combinationKey, aiCallId }) => {
      organizedSummaries[expertise][length] = text
      aiCallMapping[combinationKey] = aiCallId
    })
    
    // Store in database
    try {
      const enhancement = await enhancementService.storeMultiSummary(
        documentId,
        aiCallMapping,
        organizedSummaries,
        {
          generatedAt: new Date().toISOString(),
          modelUsed: modelConfig.modelId,
          tierUsed: tierKey
        }
      )
      
      return NextResponse.json({ 
        summaries: organizedSummaries,
        cached: false,
        enhancementId: enhancement.id,
        totalCombinations: 9,
        aiCallMapping
      })
    } catch (dbError) {
      // If database storage fails, still return the generated summaries
      console.error('Failed to store multi-summary in database:', dbError)
      return NextResponse.json({ 
        summaries: organizedSummaries,
        cached: false,
        warning: 'Summaries generated but not saved to database',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
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