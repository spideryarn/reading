/**
 * Chat tool handler - AI-powered document analysis conversations
 * 
 * Handles chat operations including message sending, thread management, 
 * and conversation history. Preserves all functionality from the original
 * /api/chat route while integrating with the unified tool execution framework.
 * 
 * Original route: /api/chat
 * New route: /api/tools/chat
 * 
 * Actions:
 * - 'send' or 'execute' - Send a chat message and get AI response
 * - 'create' - Create a new conversation thread
 * - 'list' - Get conversation history (via GET)
 * - 'delete' - Delete conversation thread or messages (via DELETE)
 */

import { z } from 'zod'
import { generateText } from 'ai'
import { getModel } from '@/lib/services/llm-provider'
import { AI_CONFIG, getModelForAICall } from '@/lib/config'
import { renderChatSystemPrompt } from '@/lib/prompts/templates/chat-system'
import { createClient } from '@/lib/supabase/server'
import { AiCallService } from '@/lib/services/database/ai-calls'
import { ChatService } from '@/lib/services/database/chat'
import { createRequestLogger, createTimer, logAIOperation } from '@/lib/services/logger'
import { BaseToolHandler, createHandlerError } from '../handler-interface'
import type { ExecutionContext, ToolApiResponse } from '@/lib/tools/executor/types'
import type { GetRequestParams, DeleteRequestParams } from '../handler-interface'

// Validation schemas
const ChatGetRequestSchema = z.object({
  threadId: z.string().optional(),
  documentId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50)
}).passthrough()

const ChatSendMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1)
  })).min(1),
  documentContext: z.string().optional(),
  threadId: z.string().optional(),
  documentId: z.string().optional()
}).passthrough()

const ChatCreateThreadSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  title: z.string().min(1, 'Thread title is required')
}).passthrough()

/**
 * Chat tool handler with conversation management
 */
export class ChatHandler extends BaseToolHandler {
  constructor() {
    super('chat')
  }
  
  async handleGet(
    params: GetRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('chat-handler:get', context.request.correlationId)
    
    if (!context.user) {
      throw createHandlerError('Authentication required for chat operations', 'auth')
    }
    
    const validation = ChatGetRequestSchema.safeParse(params)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { threadId, documentId, limit } = validation.data
    
    logger.info({
      threadId,
      documentId,
      limit,
      userId: context.user.id
    }, 'Getting chat data')
    
    try {
      const supabase = await createClient()
      const chatService = new ChatService(supabase)
      
      if (threadId) {
        // Get specific thread with messages
        const thread = await chatService.getThread(threadId, context.user.id)
        if (!thread) {
          throw createHandlerError('Thread not found or access denied', 'not_found')
        }
        
        const messages = await chatService.getMessages(threadId, { limit })
        
        logger.info({
          threadId,
          messageCount: messages.length,
          userId: context.user.id
        }, 'Retrieved thread with messages')
        
        return {
          thread,
          messages,
          type: 'thread',
          cached: false,
          ...this.createResponseMetadata()
        }
      } else {
        // List threads for user/document
        const threads = documentId 
          ? await chatService.getThreadsForDocument(documentId, context.user.id)
          : await chatService.getThreadsForUser(context.user.id, { limit })
        
        logger.info({
          documentId,
          threadCount: threads.length,
          userId: context.user.id
        }, 'Retrieved thread list')
        
        return {
          threads,
          type: 'list',
          cached: false,
          ...this.createResponseMetadata()
        }
      }
      
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: context.user.id
      }, 'Failed to get chat data')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to retrieve chat data',
        'server',
        true
      )
    }
  }
  
  async handlePost(
    action: string,
    parameters: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('chat-handler:post', context.request.correlationId)
    
    if (!context.user) {
      throw createHandlerError('Authentication required for chat operations', 'auth')
    }
    
    // Route based on action type
    if (action === 'create') {
      return this.handleCreateThread(parameters, context, logger)
    } else {
      // Default to send message for 'send', 'execute', or other actions
      return this.handleSendMessage(parameters, context, logger)
    }
  }
  
  /**
   * Handle sending chat messages (migrated from /api/chat POST)
   */
  private async handleSendMessage(
    parameters: Record<string, unknown>,
    context: ExecutionContext,
    logger: ReturnType<typeof createRequestLogger>
  ): Promise<ToolApiResponse> {
    const requestTimer = createTimer()
    
    // Validate request parameters using existing chat schema
    const validation = ChatSendMessageSchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { messages, documentContext, threadId, documentId } = validation.data
    
    logger.info({
      userId: context.user!.id,
      messageCount: messages.length,
      documentContextLength: documentContext?.length || 0,
      threadId,
      documentId
    }, 'Processing chat conversation')
    
    try {
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
      const chatTimer = createTimer(logger, 'chat-generation')
      
      logger.info({
        modelProvider: modelConfig.provider,
        modelString: modelString,
        messageCount: aiMessages.length,
        maxTokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
        correlationId: context.request.correlationId
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
      let finalThreadId = threadId
      if (!threadId && messages.length === 1 && messages[0]?.role === 'user' && documentId) {
        try {
          const supabase = await createClient()
          const chatService = new ChatService(supabase)
          
          // Create title from first user message
          const title = messages[0]?.content || 'Untitled Chat'
          
          // Create new thread using model string
          const newThread = await chatService.createThread({
            documentId,
            modelString: modelString,
            title,
            userId: context.user!.id
          })
          
          finalThreadId = newThread.id
          
          logger.info({
            threadId: finalThreadId,
            title,
            documentId
          }, 'Created new thread')
          
        } catch (err) {
          logger.warn({
            error: err instanceof Error ? err.message : 'Unknown error'
          }, 'Failed to create thread, continuing without thread creation')
          // Continue without thread creation
        }
      }
      
      // Store AI call in database for tracking (if possible)
      let aiCallId: string | null = null
      if (finalThreadId) {
        try {
          const supabase = await createClient()
          const aiCallService = new AiCallService(supabase)
          
          const aiCall = await aiCallService.createWithModelString({
            userId: context.user!.id,
            modelString: modelString,
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
          
          logger.info({
            aiCallId,
            threadId: finalThreadId,
            usage: result.usage
          }, 'AI call tracked successfully')
          
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
            userId: context.user!.id,
            correlationId: context.request.correlationId
          }
          if (documentId) {
            logData.documentId = documentId
          }
          if (costEstimate !== undefined) {
            logData.cost = costEstimate
          }
          logAIOperation('chat', logData, 'success')
        } catch (err) {
          logger.warn({
            error: err instanceof Error ? err.message : 'Unknown error'
          }, 'Failed to track AI call, continuing without tracking')
          // Don't fail the request if AI call tracking fails
        }
      }
      
      logger.info({
        responseLength: response.length,
        threadId: finalThreadId,
        aiCallId,
        tokensUsed: result.usage?.totalTokens,
        duration: chatDuration,
        correlationId: context.request.correlationId
      }, 'Chat response generated successfully')
      
      return {
        response,
        aiCallId,
        threadId: finalThreadId,
        type: 'message',
        cached: false,
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed(),
          tokensUsed: result.usage?.totalTokens
        })
      }
      
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error processing chat message')
      
      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        // API key errors
        if (error.message.includes('API key') || error.message.includes('401')) {
          throw createHandlerError(
            'API configuration error - The Anthropic API key is missing or invalid',
            'server',
            false
          )
        }
        
        // Rate limit errors  
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw createHandlerError(
            'Rate limit exceeded - Too many requests to the AI service',
            'server',
            true
          )
        }
        
        // Model errors
        if (error.message.includes('model') || error.message.includes('claude')) {
          throw createHandlerError(
            `AI model issue: ${error.message}`,
            'server',
            true
          )
        }
        
        // Network errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw createHandlerError(
            'Network error - Failed to connect to AI service',
            'server',
            true
          )
        }
      }
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to process chat message',
        'server',
        true
      )
    }
  }
  
  /**
   * Handle creating new conversation threads
   */
  private async handleCreateThread(
    parameters: Record<string, unknown>,
    context: ExecutionContext,
    logger: ReturnType<typeof createRequestLogger>
  ): Promise<ToolApiResponse> {
    const requestTimer = createTimer()
    
    // Validate request parameters
    const validation = ChatCreateThreadSchema.safeParse(parameters)
    if (!validation.success) {
      throw createHandlerError(
        `Invalid parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
        'validation'
      )
    }
    
    const { documentId, title } = validation.data
    
    logger.info({
      userId: context.user!.id,
      documentId,
      title
    }, 'Creating new chat thread')
    
    try {
      const supabase = await createClient()
      const chatService = new ChatService(supabase)
      const { modelString } = getModelForAICall()
      
      const newThread = await chatService.createThread({
        documentId,
        modelString: modelString,
        title,
        userId: context.user!.id
      })
      
      logger.info({
        threadId: newThread.id,
        documentId,
        title
      }, 'Chat thread created successfully')
      
      return {
        thread: newThread,
        type: 'create',
        cached: false,
        ...this.createResponseMetadata({
          executionTime: requestTimer.elapsed()
        })
      }
      
    } catch (error) {
      logger.error({
        documentId,
        title,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Error creating chat thread')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to create chat thread',
        'server',
        true
      )
    }
  }
  
  async handleDelete(
    params: DeleteRequestParams,
    context: ExecutionContext
  ): Promise<ToolApiResponse> {
    const logger = createRequestLogger('chat-handler:delete', context.request.correlationId)
    const requestTimer = createTimer()
    
    if (!context.user) {
      throw createHandlerError('Authentication required for chat operations', 'auth')
    }
    
    const threadId = params.threadId
    const messageId = params.messageId
    
    if (!threadId || typeof threadId !== 'string') {
      throw createHandlerError(
        'threadId is required for chat deletion',
        'validation'
      )
    }
    
    logger.info({
      threadId,
      messageId,
      userId: context.user.id
    }, 'Chat DELETE request initiated')
    
    try {
      const supabase = await createClient()
      const chatService = new ChatService(supabase)
      
      if (messageId && typeof messageId === 'string') {
        // Delete specific message
        await chatService.deleteMessage(messageId, context.user.id)
        
        logger.info({
          threadId,
          messageId
        }, 'Chat message deleted successfully')
        
        return {
          success: true,
          deleted: true,
          type: 'message',
          threadId,
          messageId,
          ...this.createResponseMetadata({
            executionTime: requestTimer.elapsed()
          })
        }
      } else {
        // Delete entire thread
        await chatService.deleteThread(threadId)
        
        logger.info({
          threadId
        }, 'Chat thread deleted successfully')
        
        return {
          success: true,
          deleted: true,
          type: 'thread',
          threadId,
          ...this.createResponseMetadata({
            executionTime: requestTimer.elapsed()
          })
        }
      }
      
    } catch (error) {
      logger.error({
        threadId,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Error deleting chat data')
      
      throw createHandlerError(
        error instanceof Error ? error.message : 'Failed to delete chat data',
        'server',
        true
      )
    }
  }
}

// Export the handler instance
const chatHandler = new ChatHandler()
export { chatHandler }
export default chatHandler