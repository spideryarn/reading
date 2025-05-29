// AI Glossary API endpoint for entity extraction
// See docs/AI_GLOSSARY.md for architecture and usage patterns

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { executePrompt } from '@/lib/prompts/types'
import { glossaryPrompt, glossaryPromptInputSchema, glossaryResponseSchema } from '@/lib/prompts/templates/glossary'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
    
    const { content, already_entities } = validationResult.data
    
    // Debug: Log content length
    console.log(`Processing glossary for content length: ${content.length} characters`)
    
    // Truncate content if it's too long (roughly estimate for token limits)
    // Claude models have different context windows, but we'll be conservative
    const MAX_CONTENT_LENGTH = 50000 // Roughly 12-15k tokens
    let processedContent = content
    if (content.length > MAX_CONTENT_LENGTH) {
      console.log(`Content too long (${content.length} chars), truncating to ${MAX_CONTENT_LENGTH} chars`)
      processedContent = content.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated for processing...]'
    }
    
    // Use real LLM processing - no fallback
    const llmResponse = await executePrompt(anthropic, glossaryPrompt, { 
      content: processedContent,
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
    
    // Validate the response matches our expected schema
    const validatedResponse = glossaryResponseSchema.parse(parsedResponse)
    
    return NextResponse.json(validatedResponse)
  } catch (error) {
    console.error('Error generating glossary:', error)
    return NextResponse.json(
      { error: 'Failed to generate glossary' },
      { status: 500 }
    )
  }
}