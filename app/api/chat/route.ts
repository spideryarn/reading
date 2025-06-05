// Chat API endpoint for AI-powered document analysis
// Uses Vercel AI SDK Core for multi-provider support

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getModel } from '@/lib/services/llm-provider'
import { AI_CONFIG, getModelConfig } from '@/lib/config'
import { chatPromptInputSchema } from '@/lib/prompts/templates/chat'
import { createClient } from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { ChatService } from '@/lib/services/database/chat'

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
    
    const { messages, documentContext, threadId, documentId } = validationResult.data
    
    // Log conversation processing
    console.log('[Chat API] Processing conversation:', {
      messageCount: messages.length,
      documentContextLength: documentContext?.length || 0,
      threadId: threadId || 'none',
      timestamp: new Date().toISOString()
    })
    
    // Build the system prompt with document context
    const systemPrompt = `You are an AI assistant helping users understand and analyze documents. Your role is to provide insightful, accurate, and helpful analysis based on the document content provided.

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

Please respond to the user's latest message while considering the full conversation context.`
    
    // Convert messages to Vercel AI SDK format
    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ]
    
    // Get the appropriate model based on configuration
    const model = getModel()
    
    // Generate response using Vercel AI SDK Core
    const result = await generateText({
      model,
      messages: aiMessages,
      maxTokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
      temperature: 0, // Keep deterministic for document analysis
    })
    
    const response = result.text
    
    // Handle thread creation for first message (if needed)
    let finalThreadId = threadId;
    if (!threadId && messages.length === 1 && messages[0].role === 'user' && documentId) {
      try {
        const supabase = await createClient()
        const chatService = new ChatService(supabase)
        const modelConfig = getModelConfig()
        
        // Create title from first user message
        const userMessage = messages[0].content;
        const title = userMessage.length > 50 
          ? userMessage.substring(0, 47) + '...'
          : userMessage;
        
        // Get model UUID for thread creation
        const aiCallService = new AiCallService(supabase)
        const modelUuid = await aiCallService.getModelUuidByProviderAndId(
          modelConfig.provider, 
          modelConfig.modelId
        );
        
        // Create new thread
        const newThread = await chatService.createThread({
          documentId,
          modelId: modelUuid,
          title,
          userId: '00000000-0000-0000-0000-000000000001' // Mock system user
        });
        
        finalThreadId = newThread.id;
        
        console.log('[Chat API] Created new thread:', {
          threadId: finalThreadId,
          title,
          documentId
        });
        
      } catch (err) {
        console.warn('[Chat API] Failed to create thread:', err)
        // Continue without thread creation
      }
    }
    
    // Store AI call in database for tracking (if possible)
    let aiCallId: string | null = null;
    if (finalThreadId) {
      try {
        const supabase = await createClient()
        const aiCallService = new AiCallService(supabase)
        const modelConfig = getModelConfig()
        
        const aiCall = await aiCallService.create({
          provider: modelConfig.provider,
          modelId: modelConfig.modelId,
          promptTokens: result.usage?.promptTokens || null,
          completionTokens: result.usage?.completionTokens || null,
          totalTokens: result.usage?.totalTokens || null,
          requestData: {
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            documentContext: documentContext ? documentContext.substring(0, 1000) + '...' : null,
            threadId: finalThreadId
          },
          responseData: { response }
        })
        
        aiCallId = aiCall.id
        
        console.log('[Chat API] AI call tracked:', {
          aiCallId,
          threadId: finalThreadId,
          usage: result.usage
        })
      } catch (err) {
        console.warn('[Chat API] Failed to track AI call:', err)
        // Don't fail the request if AI call tracking fails
      }
    }
    
    console.log('[Chat API] Response generated successfully:', {
      responseLength: response.length,
      threadId: finalThreadId || 'none',
      aiCallId: aiCallId || 'none',
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({ 
      response,
      aiCallId,
      threadId: finalThreadId,
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