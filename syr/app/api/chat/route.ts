// Chat API endpoint for AI-powered document analysis
// Integrates with Anthropic Claude for intelligent conversation about documents

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { executePrompt } from '@/lib/prompts/types'
import { chatPrompt, chatPromptInputSchema } from '@/lib/prompts/templates/chat'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = chatPromptInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      )
    }
    
    const { message, documentContext } = validationResult.data
    
    // Execute the chat prompt with real LLM (no automatic retry)
    console.log('[Chat API] Processing message:', {
      messageLength: message.length,
      documentContextLength: documentContext?.length || 0,
      timestamp: new Date().toISOString()
    })
    
    const response = await executePrompt(anthropic, chatPrompt, {
      message,
      documentContext: documentContext || 'No document context provided.'
    })
    
    console.log('[Chat API] Response generated successfully:', {
      responseLength: response.length,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({ 
      response,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    // Enhanced error logging with full context
    const errorDetails = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      context: {
        messageLength: body.message?.length,
        hasDocumentContext: !!body.documentContext
      }
    }
    
    console.error('[Chat API] Error occurred:', errorDetails)
    
    // Provide detailed error information to the client
    if (error instanceof Error) {
      // API key errors
      if (error.message.includes('API key') || error.message.includes('401')) {
        return NextResponse.json(
          { 
            error: 'API configuration error',
            details: 'The Anthropic API key is missing or invalid. Please check server configuration.',
            code: 'API_KEY_ERROR'
          },
          { status: 500 }
        )
      }
      
      // Rate limit errors
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            details: 'Too many requests to the AI service. Please wait a moment before trying again.',
            code: 'RATE_LIMIT_ERROR'
          },
          { status: 429 }
        )
      }
      
      // Model errors
      if (error.message.includes('model') || error.message.includes('claude')) {
        return NextResponse.json(
          { 
            error: 'Model configuration error',
            details: `AI model issue: ${error.message}`,
            code: 'MODEL_ERROR'
          },
          { status: 500 }
        )
      }
      
      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return NextResponse.json(
          { 
            error: 'Network error',
            details: 'Failed to connect to AI service. Please check your internet connection.',
            code: 'NETWORK_ERROR'
          },
          { status: 503 }
        )
      }
    }
    
    // Generic error fallback with details
    return NextResponse.json(
      { 
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}