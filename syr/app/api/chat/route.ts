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
    // Note: 'body' is only accessible within this try block scope
    
    // Validate input
    const validationResult = chatPromptInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.format() },
        { status: 400 }
      )
    }
    
    const { messages, documentContext } = validationResult.data
    
    // Log conversation processing
    console.log('[Chat API] Processing conversation:', {
      messageCount: messages.length,
      documentContextLength: documentContext?.length || 0,
      timestamp: new Date().toISOString()
    })
    
    // Build Claude API messages with system message containing document context
    const systemMessage = {
      role: 'user' as const,
      content: `You are an AI assistant helping users understand and analyze documents. Your role is to provide insightful, accurate, and helpful analysis based on the document content provided.

DOCUMENT CONTEXT:
${documentContext || 'No document context provided.'}

INSTRUCTIONS:
1. Base your responses on the document content provided above
2. Be specific and reference relevant parts of the document when applicable
3. If the document doesn't contain information to fully answer a question, acknowledge this limitation
4. Keep responses concise but comprehensive
5. Use clear, accessible language
6. When appropriate, suggest follow-up questions or areas for deeper exploration
7. Remember the conversation context and refer back to previous questions/answers when relevant

Please respond to the user's messages while considering the full conversation context.`
    }
    
    // Convert conversation to Claude format (system + conversation history)
    const claudeMessages = [
      systemMessage,
      ...messages.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }))
    ]
    
    // Call Claude API directly with conversation history
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0,
      messages: claudeMessages
    })
    
    const response = claudeResponse.content[0].type === 'text' 
      ? claudeResponse.content[0].text 
      : 'Unable to generate response'
    
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
    // Note: 'body' variable is not accessible here - it's scoped to the try block
    const errorDetails = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
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