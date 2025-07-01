/**
 * Test edge cases for chat validation in database service layer
 */

import { ChatService } from '../chat'
import { getTestNamespace, createTestUser, getCleanupFunctions } from '@/lib/testing/test-isolation-utils'
import { RealRLSTestSetup } from './rls-test-helpers'
import { createClient } from '@/lib/supabase/server'

describe('ChatService - Validation Edge Cases', () => {
  const namespace = getTestNamespace('chat-validation-edge-cases')
  let rlsSetup: RealRLSTestSetup
  let chatService: ChatService
  let supabase: ReturnType<typeof createClient>
  let testUser: ReturnType<typeof createTestUser>

  beforeAll(async () => {
    rlsSetup = new RealRLSTestSetup()
    supabase = rlsSetup.getAdminClient()
    testUser = createTestUser(namespace)
    
    // Ensure test user profile exists
    await rlsSetup.createTestProfile({ 
      user_id: testUser.id,
      preferences: { display_name: 'Chat Test User' }
    })
  })

  beforeEach(() => {
    chatService = new ChatService(supabase)
  })

  afterEach(async () => {
    const cleanup = getCleanupFunctions(namespace, supabase)
    await cleanup.all()
  })

  afterAll(async () => {
    await rlsSetup.cleanup()
  })

  describe('Empty content handling', () => {
    let threadId: string
    let testDocument: any

    beforeEach(async () => {
      // Create a real test document and chat thread
      testDocument = await rlsSetup.createTestDocument({
        title: 'Chat Validation Test Document',
        created_by: testUser.id,
        html_content: '<p>Test content for chat validation</p>',
        plaintext_content: 'Test content for chat validation',
        word_count: 5
      })

      // Create a real chat thread
      const { data: thread, error } = await supabase
        .from('chat_threads')
        .insert({
          id: `${namespace}-thread-${Date.now()}`,
          document_id: testDocument.id,
          title: 'Test Chat Thread',
          created_by: testUser.id
        })
        .select()
        .single()

      if (error) throw error
      threadId = thread.id
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
      const result = await chatService.addMessage({
        threadId,
        role: 'assistant',
        content: ''
      })

      expect(result.content).toBe('')
      expect(result.role).toBe('assistant')
      expect(result.thread_id).toBe(threadId)
      
      // Verify the message was actually stored in the database
      const { data: storedMessage, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('id', result.id)
        .single()

      expect(error).toBeNull()
      expect(storedMessage.content).toBe('')
      expect(storedMessage.role).toBe('assistant')
    })

    it('should trim whitespace from user messages', async () => {
      const trimmedContent = 'Hello, world!'
      
      const result = await chatService.addMessage({
        threadId,
        role: 'user',
        content: `  ${trimmedContent}  \n`
      })

      expect(result.content).toBe(trimmedContent)
      expect(result.role).toBe('user')
      
      // Verify the message was stored with trimmed content in the database
      const { data: storedMessage, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('id', result.id)
        .single()

      expect(error).toBeNull()
      expect(storedMessage.content).toBe(trimmedContent)
      expect(storedMessage.role).toBe('user')
    })
  })

  describe('Content length validation', () => {
    let threadId: string
    let testDocument: any

    beforeEach(async () => {
      // Create a real test document and chat thread for length validation tests
      testDocument = await rlsSetup.createTestDocument({
        title: 'Chat Length Validation Test Document',
        created_by: testUser.id,
        html_content: '<p>Test content for chat length validation</p>',
        plaintext_content: 'Test content for chat length validation',
        word_count: 6
      })

      // Create a real chat thread
      const { data: thread, error } = await supabase
        .from('chat_threads')
        .insert({
          id: `${namespace}-length-thread-${Date.now()}`,
          document_id: testDocument.id,
          title: 'Test Chat Length Thread',
          created_by: testUser.id
        })
        .select()
        .single()

      if (error) throw error
      threadId = thread.id
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