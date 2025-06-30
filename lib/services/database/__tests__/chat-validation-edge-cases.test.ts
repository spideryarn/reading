/**
 * Test edge cases for chat validation in database service layer
 */

import { ChatService } from '../chat'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

describe('ChatService - Validation Edge Cases', () => {
  let chatService: ChatService
  let mockSupabase: any
  const testId = 'test-chat-validation'
  const testUserId = 'test-user-id'

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }

    const { createClient } = require('@/lib/supabase/server') as any
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    chatService = new ChatService(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Empty content handling', () => {
    const threadId = `${testId}-thread`

    beforeEach(() => {
      // Mock sequence number query
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'chat_messages') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnValue({
              data: [],
              error: null
            })
          }
        }
        return mockSupabase
      })
    })

    it('should reject empty user messages', async () => {
      await expect(
        chatService.addMessage({
          threadId,
          role: 'user',
          content: ''
        })
      ).rejects.toThrow('Invalid message content: Message content cannot be empty or contain only whitespace. Please enter a message.')
    })

    it('should reject whitespace-only user messages', async () => {
      await expect(
        chatService.addMessage({
          threadId,
          role: 'user',
          content: '   \n\t   '
        })
      ).rejects.toThrow('Invalid message content: Message content cannot be empty or contain only whitespace. Please enter a message.')
    })

    it('should allow empty assistant messages (for streaming)', async () => {
      // Mock successful insert
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'msg-1',
          thread_id: threadId,
          sequence_number: 1,
          role: 'assistant',
          content: '',
          ai_call_id: null,
          extra: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      })

      const result = await chatService.addMessage({
        threadId,
        role: 'assistant',
        content: ''
      })

      expect(result.content).toBe('')
      expect(result.role).toBe('assistant')
    })

    it('should trim whitespace from user messages', async () => {
      const trimmedContent = 'Hello, world!'
      
      // Mock successful insert
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'msg-1',
          thread_id: threadId,
          sequence_number: 1,
          role: 'user',
          content: trimmedContent,
          ai_call_id: null,
          extra: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      })

      await chatService.addMessage({
        threadId,
        role: 'user',
        content: `  ${trimmedContent}  \n`
      })

      // Verify the insert was called with trimmed content
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: trimmedContent,
          role: 'user'
        })
      )
    })
  })

  describe('Content length validation', () => {
    const threadId = `${testId}-thread`

    beforeEach(() => {
      // Mock sequence number query
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'chat_messages') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnValue({
              data: [],
              error: null
            })
          }
        }
        return mockSupabase
      })
    })

    it('should reject messages exceeding length limit', async () => {
      const longContent = 'a'.repeat(50001)
      
      await expect(
        chatService.addMessage({
          threadId,
          role: 'user',
          content: longContent
        })
      ).rejects.toThrow('Invalid message content: Message is too long (maximum 50,000 characters)')
    })

    it('should reject messages with excessively long words', async () => {
      const longWord = 'a'.repeat(1001)
      
      await expect(
        chatService.addMessage({
          threadId,
          role: 'user',
          content: `This has a ${longWord} word`
        })
      ).rejects.toThrow('Invalid message content: Message contains excessively long words. Please break up long text.')
    })
  })
})