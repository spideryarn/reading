/**
 * TypeScript interfaces for the new database-first chat API
 * 
 * These types support the atomic message operations that eliminate
 * dual-state management and race conditions in the chat system.
 */

import type { ChatThread, ChatMessage } from './database'
import type { ToolApiResponse } from '@/lib/tools/executor/types'

/**
 * Request format for chat operations (unchanged from current)
 */
export interface ChatApiRequest {
  action: 'execute' | 'send'
  parameters: {
    messages: Array<{
      role: 'user' | 'assistant'
      content: string
    }>
    documentContext?: string
    threadId?: string      // Optional - if not provided, creates new thread
    documentId?: string    // Required for new thread creation
  }
  metadata: {
    correlationId: string
    source: string
    timestamp: string
  }
}

/**
 * New atomic response format for database-first chat operations
 * 
 * This response contains everything needed for the client to replace
 * its entire message store with authoritative database state.
 */
export interface ChatApiResponse extends ToolApiResponse {
  // Core data - single source of truth from database
  thread: ChatThread
  messages: ChatMessage[]
  
  // Response type indicator
  type: 'conversation'
  
  // Legacy compatibility fields (deprecated)
  // These support gradual migration from existing dual-state clients
  response?: string    // Last assistant message content (for backward compatibility)
  aiCallId?: string    // Last assistant message AI call ID (for backward compatibility)
  threadId?: string    // Thread ID (for backward compatibility, = thread.id)
}

/**
 * Request options for sending chat messages
 */
export interface SendMessageRequest {
  content: string
  threadId?: string
  documentId?: string
  documentContext?: string
}

/**
 * Response from atomic message operations
 */
export interface SendMessageResponse {
  thread: ChatThread
  messages: ChatMessage[]
  userMessage: ChatMessage    // The user message that was saved
  assistantMessage: ChatMessage // The AI response that was generated and saved
}

/**
 * Thread creation request
 */
export interface CreateThreadRequest {
  documentId: string
  title: string
  modelString?: string
}

/**
 * Thread creation response
 */
export interface CreateThreadResponse {
  thread: ChatThread
  type: 'create'
}

/**
 * Interface for the database-first message store with single database-driven state.
 */
export interface ChatStore {
  // State
  messages: ChatMessage[]
  thread: ChatThread | null
  isLoading: boolean
  error: string | null
  
  // Actions
  sendMessage: (content: string) => Promise<void>
  loadThread: (threadId: string) => Promise<void>
  createThread: (documentId: string, title: string) => Promise<void>
  clearMessages: () => void
  refreshFromDatabase: () => Promise<void>
}

/**
 * Configuration for useExternalStoreRuntime integration
 */
export interface ExternalStoreRuntimeConfig {
  messages: ChatMessage[]
  isRunning: boolean
  onNew: (message: { content: string }) => Promise<void>
  convertMessage: (message: ChatMessage) => {
    id: string
    role: 'user' | 'assistant'
    content: Array<{ type: 'text'; text: string }>
    createdAt: Date
  }
}

/**
 * Error types for enhanced error handling
 */
export type ChatApiErrorType = 
  | 'validation'     // Invalid request parameters
  | 'auth'          // Authentication required
  | 'not_found'     // Thread/message not found
  | 'server'        // Server/database error
  | 'rate_limit'    // Rate limiting
  | 'ai_service'    // AI service unavailable

export interface ChatApiError extends Error {
  type: ChatApiErrorType
  retryable: boolean
  details?: Record<string, unknown>
}