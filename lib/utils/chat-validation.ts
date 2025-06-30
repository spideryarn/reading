/**
 * Shared chat message validation utilities
 * 
 * Provides consistent validation logic across client and server
 * following o3 AI recommendations for content handling
 */

import { CHAT_VALIDATION_CONFIG } from '../config'

export interface ChatValidationResult {
  valid: boolean
  error?: string
  trimmedContent?: string
}

/**
 * Validates user message content following o3 AI recommendations:
 * - User messages must have non-empty content after trimming
 * - Enforces character limits and word length security checks
 * - Returns trimmed content for consistent storage
 */
export function validateUserMessage(content: string): ChatValidationResult {
  const trimmedContent = content.trim()
  
  // Check for empty content
  if (trimmedContent.length === 0) {
    return {
      valid: false,
      error: CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.EMPTY_CONTENT
    }
  }
  
  // Check message length
  if (trimmedContent.length > CHAT_VALIDATION_CONFIG.MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.MESSAGE_TOO_LONG
    }
  }
  
  // Check for excessively long words (security check)
  const words = trimmedContent.split(/\s+/)
  const hasExcessivelyLongWord = words.some(word => word.length > CHAT_VALIDATION_CONFIG.MAX_WORD_LENGTH)
  if (hasExcessivelyLongWord) {
    return {
      valid: false,
      error: CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.WORD_TOO_LONG
    }
  }
  
  return {
    valid: true,
    trimmedContent
  }
}

/**
 * Validates assistant message content following o3 AI recommendations:
 * - Assistant messages can be empty (for streaming or tool-only responses)
 * - Still enforces character limits when content is present
 */
export function validateAssistantMessage(content: string): ChatValidationResult {
  // Assistant messages can be empty
  if (content.length === 0) {
    return { valid: true, trimmedContent: '' }
  }
  
  // Check message length
  if (content.length > CHAT_VALIDATION_CONFIG.MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.MESSAGE_TOO_LONG
    }
  }
  
  return {
    valid: true,
    trimmedContent: content
  }
}

/**
 * Validates messages based on role
 */
export function validateMessage(role: 'user' | 'assistant', content: string): ChatValidationResult {
  return role === 'user' ? validateUserMessage(content) : validateAssistantMessage(content)
}

/**
 * Validates conversation length
 */
export function validateConversationLength(messageCount: number): ChatValidationResult {
  // If the configured limit is 0 treat it as "unlimited" – never invalidate.
  if (CHAT_VALIDATION_CONFIG.MAX_CONVERSATION_LENGTH > 0 &&
      messageCount > CHAT_VALIDATION_CONFIG.MAX_CONVERSATION_LENGTH) {
    return {
      valid: false,
      error: CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.TOO_MANY_MESSAGES
    }
  }
  return { valid: true }
}

/**
 * Validates document context length
 */
export function validateDocumentContext(context: string | undefined): ChatValidationResult {
  if (!context) {
    return { valid: true }
  }
  
  if (context.length > CHAT_VALIDATION_CONFIG.MAX_DOCUMENT_CONTEXT_LENGTH) {
    return {
      valid: false,
      error: CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.CONTEXT_TOO_LONG
    }
  }
  
  return { valid: true }
}