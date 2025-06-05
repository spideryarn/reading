// AI Glossary API endpoint for entity extraction
// See docs/AI_GLOSSARY.md for architecture and usage patterns

import { NextRequest, NextResponse } from 'next/server'
import { executePrompt } from '@/lib/prompts/types'
import { glossaryPrompt, glossaryPromptInputSchema, glossaryResponseSchema } from '@/lib/prompts/templates/glossary'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig, AI_CONFIG } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = glossaryPromptInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error },
        { status: 400 }
      )
    }
    
    const { content, already_entities, documentId } = validationResult.data
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    const aiCallService = new AiCallService(supabase)
    
    // Check if glossary already exists in database
    const existingGlossary = await enhancementService.get(
      documentId,
      'glossary'
    )
    
    if (existingGlossary) {
      // Validate cached data structure - fail fast if malformed
      if (!existingGlossary.content || typeof existingGlossary.content !== 'object') {
        throw new Error(`Malformed glossary data in database for enhancement ${existingGlossary.id}: content is not an object`)
      }
      
      if (!Array.isArray(existingGlossary.content.entities)) {
        throw new Error(`Malformed glossary data in database for enhancement ${existingGlossary.id}: content.entities is not an array. Found: ${typeof existingGlossary.content.entities}`)
      }
      
      return NextResponse.json({ 
        entities: existingGlossary.content.entities,
        cached: true,
        enhancementId: existingGlossary.id
      })
    }
    
    // Debug: Log content length
    console.log(`Processing glossary for content length: ${content.length} characters`)
    
    // Resolve tier key to actual model details using config
    const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as any
    const modelConfig = getModelConfig(tierKey)
    
    // Create AI call record for tracking
    const aiCall = await aiCallService.startCall({
      documentId,
      provider: modelConfig.provider,
      modelId: modelConfig.modelId,
      prompt_type: 'glossary',
      input_data: { 
        content_length: content.length,
        already_entities_count: already_entities?.length || 0,
        tier_used: tierKey
      }
    })
    
    // Use real LLM processing - no fallback
    const llmResponse = await executePrompt(glossaryPrompt, { 
      content,
      already_entities 
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
    console.log('LLM Response (parsed):', JSON.stringify(parsedResponse, null, 2))
    
    // Validate the response matches our expected schema
    const validatedResponse = glossaryResponseSchema.parse(parsedResponse)
    
    // Complete the AI call record
    await aiCallService.completeCall(aiCall.id, {
      output_data: {
        entities_count: validatedResponse.entities.length,
        processing_notes: 'Glossary generation completed successfully'
      }
    })
    
    // Store the glossary result in database
    await enhancementService.storeGlossary(
      documentId,
      aiCall.id,
      {
        entities: validatedResponse.entities,
        metadata: {
          content_length: content.length,
          entities_count: validatedResponse.entities.length,
          tier_used: tierKey,
          model_used: modelConfig.modelId
        }
      }
    )
    
    return NextResponse.json({
      ...validatedResponse,
      cached: false,
      enhancementId: null // Will be available on next request from cache
    })
  } catch (error) {
    console.error('Error generating glossary:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate glossary'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId } = body
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Delete the glossary enhancement
    await enhancementService.delete(documentId, 'glossary')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting glossary:', error)
    return NextResponse.json(
      { error: 'Failed to delete glossary' },
      { status: 500 }
    )
  }
}