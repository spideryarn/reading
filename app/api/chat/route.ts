// Chat API endpoint for AI-powered document analysis
// Uses Vercel AI SDK Core for multi-provider support

import { NextRequest, NextResponse } from 'next/server'
import { createProblemDetail } from '@/lib/api/error-utils'
import { generateText } from 'ai'
import { getModel } from '@/lib/services/llm-provider'
import { AI_CONFIG, getModelForAICall } from '@/lib/config'
import { chatPromptInputSchema } from '@/lib/prompts/templates/chat'
import { renderChatSystemPrompt } from '@/lib/prompts/templates/chat-system'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { ChatService } from '@/lib/services/database/chat'
import { createRequestLogger, createTimer, logAIOperation, generateCorrelationId } from '@/lib/services/logger'
import { requireAuth } from '@/lib/auth/server-auth'
import { createAIResponseLogger } from '@/lib/services/ai-response-logger'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/chat', correlationId)
  
  try {
    // Validate authentication (required for chat)
    const user = await requireAuth({ allowBearer: true, request })
    
    const body = await request.json()
    // Note: 'body' is only accessible within this try block scope
    
    requestLogger.info({
      method: 'POST',
      userId: user.id,
      userEmail: user.email,
      bodyKeys: Object.keys(body),
      hasMessages: !!body.messages,
      hasDocumentContext: !!body.documentContext
    }, 'Starting chat request processing')
    
    // Validate input with detailed error reporting
    const validationResult = chatPromptInputSchema.safeParse(body)
    if (!validationResult.success) {
      const errorDetails = {
        message: 'Request validation failed',
        issues: validationResult.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          received: 'received' in issue ? issue.received : undefined
        }))
      }
      
      console.error('[Chat API] Validation error:', {
        body: JSON.stringify(body, null, 2),
        errors: errorDetails,
        timestamp: new Date().toISOString()
      })
      
      requestLogger.warn({
        validationErrors: errorDetails,
        bodyKeys: Object.keys(body)
      }, 'Chat request validation failed')
      
      return createProblemDetail({
        type: '/errors/validation',
        title: 'Invalid request',
        status: 400,
        detail: 'Request validation failed',
        issues: errorDetails.issues,
        instance: request.nextUrl?.pathname ?? '/api/chat',
        correlationId
      })
    }
    
    const { messages, documentContext, threadId, documentId } = validationResult.data
    
    // Log conversation processing
    console.log('[Chat API] Processing conversation:', {
      messageCount: messages.length,
      documentContextLength: documentContext?.length || 0,
      threadId: threadId || 'none',
      timestamp: new Date().toISOString()
    })
    
    requestLogger.info({
      messageCount: messages.length,
      documentContextLength: documentContext?.length || 0,
      threadId,
      documentId,
      correlationId
    }, 'Processing chat conversation')
    
    // Build the system prompt with document context using Nunjucks template
    const systemPrompt = renderChatSystemPrompt({
      documentContext: documentContext || 'No document context provided.'
    })
    
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
    const { modelString, config: modelConfig } = getModelForAICall()
    
    // Create performance timer for AI operation
    const chatTimer = createTimer(requestLogger, 'chat-generation')
    
    requestLogger.info({
      modelProvider: modelConfig.provider,
      modelString: modelString,
      messageCount: aiMessages.length,
      maxTokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
      correlationId
    }, 'Starting AI chat generation')
    
    // Generate response using Vercel AI SDK Core
    const result = await generateText({
      model,
      messages: aiMessages,
      maxTokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
      temperature: 0, // Keep deterministic for document analysis
    })
    
    const chatDuration = chatTimer.end({
      tokensUsed: result.usage?.totalTokens,
      responseLength: result.text.length
    })
    
    const response = result.text
    
    // Handle thread creation for first message (if needed)
    let finalThreadId = threadId;
    if (!threadId && messages.length === 1 && messages[0]?.role === 'user' && documentId) {
      try {
        const supabase = await getSupabaseServerClient(request, { allowBearer: true })
        const chatService = new ChatService(supabase)
        
        // Create title from first user message
        const title = messages[0]?.content || 'Untitled Chat';
        
        // Create new thread using model string
        const newThread = await chatService.createThread({
          documentId,
          modelString: modelString,
          title,
          userId: user.id
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
        const supabase = await getSupabaseServerClient(request, { allowBearer: true })
        const aiCallService = new AiCallService(supabase)
        const aiResponseLogger = createAIResponseLogger(aiCallService)
        
        // Start AI call tracking (pending)
        const pendingCall = await aiCallService.startCallWithModelString({
          userId: user.id,
          modelString: modelString,
          prompt_type: 'chat',
          input_data: {
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            documentContext: documentContext ? documentContext.substring(0, 1000) + '...' : null,
            threadId: finalThreadId
          }
        })
        
        // Complete AI call with comprehensive logging
        await aiResponseLogger.completeAICall({
          aiCallId: pendingCall.id,
          response: {
            text: result.text,
            usage: result.usage,
            finishReason: result.finishReason
          },
          outputData: {
            response,
            threadId: finalThreadId,
            duration: chatDuration
          },
          correlationId
        })
        
        aiCallId = pendingCall.id
        
        console.log('[Chat API] AI call tracked:', {
          aiCallId,
          threadId: finalThreadId,
          usage: result.usage
        })
        
        // Log successful AI operation
        const costEstimate = result.usage?.totalTokens ? result.usage.totalTokens * 0.000003 : undefined
        const logData: {
          modelProvider: string
          tokensUsed?: number
          userId: string
          documentId?: string
          correlationId: string
          cost?: number
        } = {
          modelProvider: modelConfig.provider,
          tokensUsed: result.usage?.totalTokens,
          userId: user.id,
          correlationId
        }
        if (documentId) {
          logData.documentId = documentId
        }
        if (costEstimate !== undefined) {
          logData.cost = costEstimate
        }
        logAIOperation('chat', logData, 'success')
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
    
    requestLogger.info({
      responseLength: response.length,
      threadId: finalThreadId,
      aiCallId,
      tokensUsed: result.usage?.totalTokens,
      duration: chatDuration,
      correlationId
    }, 'Chat response generated successfully')
    
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
    
    requestLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Chat request failed')
    
    // Provide detailed error information to the client as Problem Details
    if (error instanceof Error) {
      // API key errors
      if (error.message.includes('API key') || error.message.includes('401')) {
        return createProblemDetail({
          type: '/errors/api-config',
          title: 'API configuration error',
          status: 500,
          detail: 'The Anthropic API key is missing or invalid. Please check server configuration.',
          correlationId,
          retryable: false
        })
      }

      // Rate limit errors
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return createProblemDetail({
          type: '/errors/rate-limit',
          title: 'Rate limit exceeded',
          status: 429,
          detail: 'Too many requests to the AI service. Please wait a moment before trying again.',
          correlationId,
          retryable: true
        })
      }

      // Model errors
      if (error.message.includes('model') || error.message.includes('claude')) {
        return createProblemDetail({
          type: '/errors/model',
          title: 'Model configuration error',
          status: 500,
          detail: `AI model issue: ${error.message}`,
          correlationId
        })
      }

      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return createProblemDetail({
          type: '/errors/network',
          title: 'Network error',
          status: 503,
          detail: 'Failed to connect to AI service. Please check your internet connection.',
          correlationId,
          retryable: true
        })
      }
    }

    // Generic error fallback with details
    return createProblemDetail({
      type: '/errors/internal',
      title: 'Failed to process chat message',
      status: 500,
      detail: error instanceof Error ? error.message : 'An unexpected error occurred',
      correlationId
    })
  }
}