/**
 * Unit tests for chat validation utilities
 * 
 * Tests the o3 AI recommendations implementation:
 * - User messages: Reject empty content (strict validation)  
 * - Assistant messages: Allow empty content for streaming/tool-only scenarios
 * - Enhanced input validation for security and robustness
 */

import { describe, it, expect } from '@jest/globals'
import {
  validateUserMessage,
  validateAssistantMessage,
  validateMessage,
  validateConversationLength,
  validateDocumentContext
} from '../chat-validation'
import { CHAT_VALIDATION_CONFIG } from '../../config'

describe('Chat Validation Utilities', () => {
  describe('validateUserMessage', () => {
    it('should reject empty user messages', () => {
      const result = validateUserMessage('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.EMPTY_CONTENT)
    })

    it('should reject whitespace-only user messages', () => {
      const testCases = ['   ', '\n', '\t', '   \n\t   ']
      testCases.forEach(content => {
        const result = validateUserMessage(content)
        expect(result.valid).toBe(false)
        expect(result.error).toBe(CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.EMPTY_CONTENT)
      })
    })

    it('should reject excessively long user messages', () => {
      const longMessage = 'a'.repeat(CHAT_VALIDATION_CONFIG.MAX_MESSAGE_LENGTH + 1)
      const result = validateUserMessage(longMessage)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.MESSAGE_TOO_LONG)
    })

    it('should reject user messages with excessively long words', () => {
      const longWord = 'a'.repeat(CHAT_VALIDATION_CONFIG.MAX_WORD_LENGTH + 1)
      const message = `This message contains ${longWord} which is too long`
      const result = validateUserMessage(message)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.WORD_TOO_LONG)
    })

    it('should accept valid user messages', () => {
      const validMessages = [
        'What is the main topic of this document?',
        'Can you summarize the key points?',
        'Please explain the concept in more detail.',
        'This is a valid message with reasonable words and length.'
      ]
      
      validMessages.forEach(content => {
        const result = validateUserMessage(content)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(result.trimmedContent).toBe(content.trim())
      })
    })

    it('should trim whitespace from valid user messages', () => {
      const content = '   What is the main topic?   '
      const result = validateUserMessage(content)
      expect(result.valid).toBe(true)
      expect(result.trimmedContent).toBe('What is the main topic?')
    })

    it('should handle messages at the exact length limit', () => {
      // Create a message at the max length with proper word boundaries
      const words = Array(50).fill('a'.repeat(100))
      const maxLengthMessage = words.join(' ').substring(0, CHAT_VALIDATION_CONFIG.MAX_MESSAGE_LENGTH)
      const result = validateUserMessage(maxLengthMessage)
      expect(result.valid).toBe(true)
    })

    it('should handle words at the exact word length limit', () => {
      const maxLengthWord = 'a'.repeat(CHAT_VALIDATION_CONFIG.MAX_WORD_LENGTH)
      const message = `This ${maxLengthWord} is at the limit`
      const result = validateUserMessage(message)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateAssistantMessage', () => {
    it('should allow empty assistant messages for streaming scenarios', () => {
      const result = validateAssistantMessage('')
      expect(result.valid).toBe(true)
      expect(result.trimmedContent).toBe('')
    })

    it('should allow whitespace-only assistant messages', () => {
      const testCases = ['   ', '\n', '\t', '   \n\t   ']
      testCases.forEach(content => {
        const result = validateAssistantMessage(content)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject excessively long assistant messages', () => {
      const longMessage = 'a'.repeat(CHAT_VALIDATION_CONFIG.MAX_MESSAGE_LENGTH + 1)
      const result = validateAssistantMessage(longMessage)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.MESSAGE_TOO_LONG)
    })

    it('should accept valid assistant messages', () => {
      const validMessages = [
        'Based on the document, the main topic is...',
        'Here are the key points from the text:',
        'The concept can be explained as follows...'
      ]
      
      validMessages.forEach(content => {
        const result = validateAssistantMessage(content)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(result.trimmedContent).toBe(content)
      })
    })
  })

  describe('validateMessage', () => {
    it('should use user validation for user role', () => {
      const result = validateMessage('user', '')
      expect(result.valid).toBe(false)
      expect(result.error).toBe(CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.EMPTY_CONTENT)
    })

    it('should use assistant validation for assistant role', () => {
      const result = validateMessage('assistant', '')
      expect(result.valid).toBe(true)
    })
  })

  describe('validateConversationLength', () => {
    it('should accept conversations within the limit', () => {
      const result = validateConversationLength(CHAT_VALIDATION_CONFIG.MAX_CONVERSATION_LENGTH)
      expect(result.valid).toBe(true)
    })

    it('should reject conversations exceeding the limit', () => {
      const result = validateConversationLength(CHAT_VALIDATION_CONFIG.MAX_CONVERSATION_LENGTH + 1)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.TOO_MANY_MESSAGES)
    })
  })

  describe('validateDocumentContext', () => {
    it('should accept undefined context', () => {
      const result = validateDocumentContext(undefined)
      expect(result.valid).toBe(true)
    })

    it('should accept context within the limit', () => {
      const context = 'a'.repeat(CHAT_VALIDATION_CONFIG.MAX_DOCUMENT_CONTEXT_LENGTH)
      const result = validateDocumentContext(context)
      expect(result.valid).toBe(true)
    })

    it('should reject context exceeding the limit', () => {
      const context = 'a'.repeat(CHAT_VALIDATION_CONFIG.MAX_DOCUMENT_CONTEXT_LENGTH + 1)
      const result = validateDocumentContext(context)
      expect(result.valid).toBe(false)
      expect(result.error).toBe(CHAT_VALIDATION_CONFIG.ERROR_MESSAGES.CONTEXT_TOO_LONG)
    })
  })
})