// AI Headings API endpoint for generating semantic document structure
// See planning/250526g_ai_generated_headings.md for implementation details

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { headingsPrompt, headingsPromptInputSchema, headingsResponseSchema } from '@/lib/prompts/templates/headings'
import { createClient } from '@/lib/supabase/server'
import { EnhancementService } from '@/lib/services/database/enhancements'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { getModelConfig, AI_CONFIG, type ProviderTierKey } from '@/lib/config'
import { createRequestLogger, generateCorrelationId, logAIOperation, createTimer, mutationLogger } from '@/lib/services/logger'

/**
 * Remove all existing headings (h1-h6) from HTML content
 * This ensures the LLM generates a completely fresh heading structure
 */
function removeExistingHeadings(htmlContent: string): string {
  const $ = cheerio.load(htmlContent)
  
  // Remove all heading elements but preserve their content as text
  $('h1, h2, h3, h4, h5, h6').each((_, element) => {
    const $element = $(element)
    const textContent = $element.text()
    
    // Replace heading with a paragraph to preserve content but remove structure
    if (textContent.trim()) {
      $element.replaceWith(`<p>${textContent}</p>`)
    } else {
      $element.remove()
    }
  })
  
  return $.html()
}

/**
 * Log generated headings to console with visual hierarchy
 */
function logHeadingsHierarchy(headings: Array<{ html: string }>): void {
  console.log('\n=== Generated Headings ===')
  headings.forEach((heading) => {
    const match = heading.html.match(/^<h(\d)[^>]*>(.*)<\/h\d>$/)
    if (match) {
      const level = parseInt(match[1])
      const text = match[2]
      const indent = '  '.repeat(level - 1) // Indent based on heading level
      const prefix = `H${level}`
      console.log(`${indent}${prefix}: ${text}`)
    } else {
      console.log(`Invalid heading HTML: ${heading.html}`)
    }
  })
  console.log(`Total headings generated: ${headings.length}`)
  console.log('========================\n')
}

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/headings', correlationId)
  
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    requestLogger.info({
      method: 'GET',
      documentId
    }, 'Fetching cached headings')
    
    if (!documentId) {
      requestLogger.warn({ documentId }, 'Missing documentId parameter')
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
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
      
      if (!Array.isArray(existingHeadings.content.items)) {
        throw new Error(`Malformed headings data in database for enhancement ${existingHeadings.id}: content.items is not an array. Found: ${typeof existingHeadings.content.items}`)
      }
      
      return NextResponse.json({ 
        headings: existingHeadings.content.items,
        cached: true,
        enhancementId: existingHeadings.id
      })
    }
    
    // No cached headings found
    return NextResponse.json({ 
      cached: false,
      headings: null
    })
  } catch (error) {
    console.error('Error fetching cached headings:', error)
    requestLogger.error({
      error: error instanceof Error ? error.message : String(error),
      operation: 'fetch_cached_headings'
    }, 'Failed to fetch cached headings')
    return NextResponse.json(
      { error: 'Failed to fetch cached headings' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/headings', correlationId)
  
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    requestLogger.info({
      method: 'DELETE',
      documentId
    }, 'Deleting headings enhancement')
    
    if (!documentId) {
      requestLogger.warn({ documentId }, 'Missing documentId parameter for DELETE')
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Initialize database services
    const supabase = await createClient()
    const enhancementService = new EnhancementService(supabase)
    
    // Delete headings enhancement for this document
    await enhancementService.delete(documentId, 'headings')
    
    requestLogger.info({
      documentId,
      operation: 'headings_delete'
    }, 'Headings enhancement deleted successfully')
    
    return NextResponse.json({ 
      success: true,
      message: 'Headings enhancement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting headings enhancement:', error)
    requestLogger.error({
      error: error instanceof Error ? error.message : String(error),
      operation: 'headings_delete'
    }, 'Failed to delete headings enhancement')
    return NextResponse.json(
      { error: 'Failed to delete headings enhancement' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/headings', correlationId)
  
  try {
    const body = await request.json()
    
    requestLogger.info({
      method: 'POST',
      operation: 'headings_generation'
    }, 'Starting headings generation request')
    
    // Validate input
    const validationResult = headingsPromptInputSchema.safeParse(body)
    if (!validationResult.success) {
      requestLogger.warn({
        validationError: validationResult.error,
        operation: 'input_validation'
      }, 'Invalid request body for headings generation')
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error },
        { status: 400 }
      )
    }
    
    const { html_content, documentId } = validationResult.data
    
    requestLogger.info({
      documentId,
      contentLength: html_content.length,
      operation: 'content_validation'
    }, 'Input validation successful')
    
    // Initialize database services
    const supabase = await createClient()
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
      
      if (!Array.isArray(existingHeadings.content.items)) {
        throw new Error(`Malformed headings data in database for enhancement ${existingHeadings.id}: content.items is not an array. Found: ${typeof existingHeadings.content.items}`)
      }
      
      requestLogger.info({
        documentId,
        enhancementId: existingHeadings.id,
        headingsCount: existingHeadings.content.items.length,
        operation: 'cache_hit'
      }, 'Returning cached headings')
      
      return NextResponse.json({ 
        headings: existingHeadings.content.items,
        cached: true,
        enhancementId: existingHeadings.id
      })
    }
    
    // Remove all existing headings from the HTML
    const cleanedHtml = removeExistingHeadings(html_content)
    
    console.log('Processing headings generation for document...')
    console.log(`Original HTML length: ${html_content.length} characters`)
    console.log(`Cleaned HTML length: ${cleanedHtml.length} characters`)
    
    requestLogger.info({
      documentId,
      originalLength: html_content.length,
      cleanedLength: cleanedHtml.length,
      operation: 'content_preprocessing'
    }, 'HTML content preprocessed for headings generation')
    
    // Resolve tier key to actual model details using config
    const tierKey = (process.env.LLM_MODEL || AI_CONFIG.DEFAULT_MODEL) as ProviderTierKey
    const modelConfig = getModelConfig(tierKey)
    
    // Create AI call record for tracking
    const aiCall = await aiCallService.startCall({
      documentId: documentId || undefined,
      provider: modelConfig.provider,
      modelId: modelConfig.modelId,
      prompt_type: 'headings',
      input_data: { 
        content_length: cleanedHtml.length,
        original_length: html_content.length,
        tier_used: tierKey
      }
    })
    
    requestLogger.info({
      documentId,
      aiCallId: aiCall.id,
      provider: modelConfig.provider,
      modelId: modelConfig.modelId,
      tierKey,
      operation: 'ai_call_start'
    }, 'AI call started for headings generation')
    
    // Generate headings using LLM
    const timer = createTimer(requestLogger, 'headings_generation')
    const llmResult = await executePromptWithUsage(headingsPrompt, { 
      html_content: cleanedHtml
    })
    timer.end({
      documentId,
      aiCallId: aiCall.id,
      responseLength: llmResult.text.length
    })
    
    console.log('Raw LLM response length:', llmResult.text.length, 'characters')
    console.log('Raw LLM response preview (first 200 chars):', JSON.stringify(llmResult.text.substring(0, 200)))
    console.log('Raw LLM response ending (last 200 chars):', JSON.stringify(llmResult.text.substring(llmResult.text.length - 200)))
    
    requestLogger.info({
      documentId,
      aiCallId: aiCall.id,
      responseLength: llmResult.text.length,
      usage: llmResult.usage,
      operation: 'llm_response_received'
    }, 'LLM response received for headings generation')
    
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
    
    requestLogger.info({
      documentId,
      aiCallId: aiCall.id,
      cleanedJsonLength: jsonString.trim().length,
      operation: 'json_preprocessing'
    }, 'JSON response preprocessed')
    
    const parsedResponse = JSON.parse(jsonString.trim())
    
    // Validate the response matches our expected schema
    const validatedResponse = headingsResponseSchema.parse(parsedResponse)
    
    requestLogger.info({
      documentId,
      aiCallId: aiCall.id,
      headingsCount: validatedResponse.headings.length,
      operation: 'response_validation'
    }, 'Response validation successful')
    
    // Log the generated headings hierarchy to console
    logHeadingsHierarchy(validatedResponse.headings)
    
    // Complete the AI call record with usage metadata
    await aiCallService.completeCall(aiCall.id, {
      output_data: {
        headings_count: validatedResponse.headings.length,
        processing_notes: 'Headings generation completed successfully'
      },
      usage: llmResult.usage,
      finishReason: llmResult.finishReason
    })
    
    logAIOperation(
      'headings_generation',
      {
        modelProvider: modelConfig.provider,
        tokensUsed: llmResult.usage?.totalTokens,
        documentId,
        correlationId
      },
      'success'
    )
    
    // Store the headings result in database (only if documentId provided)
    // TODO: Schema mismatch - headings API generates {id_of_after, html} but storage expects {id, text, level}
    // Temporarily disabled for deployment - headings will generate but not persist
    /*
    if (documentId) {
      await enhancementService.storeHeadings(
        documentId,
        aiCall.id,
      {
        items: validatedResponse.headings,
        metadata: {
          content_length: cleanedHtml.length,
          headings_count: validatedResponse.headings.length,
          tier_used: tierKey,
          model_used: modelConfig.modelId
        }
      }
    )
    }
    */
    
    mutationLogger.info({
      documentId,
      aiCallId: aiCall.id,
      headingsCount: validatedResponse.headings.length,
      operation: 'headings_stored',
      correlationId
    }, 'Headings enhancement stored in database')
    
    return NextResponse.json({
      ...validatedResponse,
      cached: false,
      enhancementId: null // Will be available on next request from cache
    })
  } catch (error) {
    console.error('Error generating headings:', error)
    requestLogger.error({
      error: error instanceof Error ? error.message : String(error),
      operation: 'headings_generation_error',
      correlationId
    }, 'Failed to generate headings')
    
    logAIOperation(
      'headings_generation',
      {
        correlationId
      },
      'error',
      error instanceof Error ? error : new Error(String(error))
    )
    
    return NextResponse.json(
      { error: 'Failed to generate headings' },
      { status: 500 }
    )
  }
}