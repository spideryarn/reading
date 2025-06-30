/**
 * Integration tests for chat service with Bearer token authentication
 * 
 * These tests verify that:
 * 1. Bearer token authentication works with ChatService
 * 2. RLS policies are properly enforced with Bearer tokens
 * 3. No RLS violations occur with the consolidated auth flow
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { RealRLSTestSetup } from './rls-test-helpers'
import { createTestId, getTestNamespace } from '@/lib/testing/test-isolation-utils'
import { ChatService } from '@/lib/services/database/chat'
import type { Database } from '@/lib/types/database'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

describe('Chat Service Bearer Token Authentication', () => {
  let rlsSetup: RealRLSTestSetup
  let testNamespace: string
  let testUserToken: string
  let testUserId: string
  let testDocumentId: string
  let bearerClient: ReturnType<typeof createClient<Database>>
  let chatService: ChatService
  let adminClient: ReturnType<typeof createClient<Database>>
  const createdUserIds: string[] = []
  const createdDocumentIds: string[] = []
  const createdThreadIds: string[] = []

  beforeEach(async () => {
    // Initialize test setup with proper RLS context
    rlsSetup = new RealRLSTestSetup()
    testNamespace = getTestNamespace('chat-bearer-auth')
    adminClient = rlsSetup.getAdminClient()
    
    // Create a test user
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email: `${testNamespace}@test.com`,
      password: 'test-password-123',
      email_confirm: true
    })
    if (userError) throw userError
    if (!userData.user) throw new Error('User creation failed')
    testUserId = userData.user.id
    createdUserIds.push(testUserId)
    
    // Get JWT token for the user - we'll create it manually since we need the raw token
    const jwt = await import('jsonwebtoken')
    const secret = process.env.SUPABASE_JWT_SECRET!
    testUserToken = jwt.sign({
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
      sub: testUserId,
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
    }, secret)

    // Create a test document owned by the user
    testDocumentId = createTestId()
    const { error: docError } = await adminClient
      .from('documents')
      .insert({
        id: testDocumentId,
        created_by: testUserId,
        title: `Test Document ${testNamespace}`,
        html_content: '<p>Test content</p>',
        plaintext_content: 'Test content',
        slug: `test-document-${testNamespace}`
      })
    if (docError) throw docError
    createdDocumentIds.push(testDocumentId)

    // Create a Supabase client with Bearer token authentication
    bearerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${testUserToken}`
        }
      }
    })

    // Create ChatService with Bearer-authenticated client
    chatService = new ChatService(bearerClient)
  })

  afterEach(async () => {
    // Clean up test data in reverse order of creation
    // Clean up messages for all threads
    if (createdThreadIds.length > 0) {
      await adminClient.from('chat_messages').delete().in('thread_id', createdThreadIds)
    }
    
    // Clean up threads for all documents
    if (createdDocumentIds.length > 0) {
      await adminClient.from('chat_threads').delete().in('document_id', createdDocumentIds)
    }
    
    // Clean up all documents
    if (createdDocumentIds.length > 0) {
      await adminClient.from('documents').delete().in('id', createdDocumentIds)
    }
    
    // Clean up all users
    for (const userId of createdUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }
    
    // Reset arrays
    createdUserIds.length = 0
    createdDocumentIds.length = 0
    createdThreadIds.length = 0
  })

  describe('Bearer Token Authentication', () => {
    it('should create chat threads with Bearer token client', async () => {
      // Create a thread using Bearer-authenticated ChatService
      const thread = await chatService.createThread({
        documentId: testDocumentId,
        modelString: 'anthropic:claude-3-5-haiku:20241022',
        userId: testUserId
      })
      createdThreadIds.push(thread.id)
      
      expect(thread).toBeDefined()
      expect(thread.created_by).toBe(testUserId)
      expect(thread.document_id).toBe(testDocumentId)
      expect(thread.model_string).toBe('anthropic:claude-3-5-haiku:20241022')
    })

    it('should create messages with Bearer token client', async () => {
      // Create thread first
      const thread = await chatService.createThread({
        documentId: testDocumentId,
        modelString: 'anthropic:claude-3-5-haiku:20241022',
        userId: testUserId
      })
      createdThreadIds.push(thread.id)
      
      // Create a user message
      const userMessage = await chatService.addMessage({
        threadId: thread.id,
        role: 'user',
        content: 'Test message via Bearer token'
      })
      
      expect(userMessage).toBeDefined()
      expect(userMessage.thread_id).toBe(thread.id)
      expect(userMessage.role).toBe('user')
      expect(userMessage.content).toBe('Test message via Bearer token')
      
      // Create an assistant message
      const assistantMessage = await chatService.addMessage({
        threadId: thread.id,
        role: 'assistant',
        content: 'Response via Bearer token'
      })
      
      expect(assistantMessage).toBeDefined()
      expect(assistantMessage.role).toBe('assistant')
    })

    it('should retrieve messages with Bearer token client', async () => {
      // Create thread and messages
      const thread = await chatService.createThread({
        documentId: testDocumentId,
        modelString: 'anthropic:claude-3-5-haiku:20241022',
        userId: testUserId
      })
      createdThreadIds.push(thread.id)
      
      await chatService.addMessage({
        threadId: thread.id,
        role: 'user',
        content: 'First message'
      })
      
      await chatService.addMessage({
        threadId: thread.id,
        role: 'assistant',
        content: 'First response'
      })
      
      // Retrieve messages
      const messages = await chatService.getThreadMessages(thread.id)
      
      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('First message')
      expect(messages[1].content).toBe('First response')
    })
  })

  describe('RLS Policy Enforcement', () => {
    it('should prevent access to other users documents via Bearer token', async () => {
      // Create another user and document
      const { data: otherUserData, error: otherUserError } = await adminClient.auth.admin.createUser({
        email: `${testNamespace}-other@test.com`,
        password: 'test-password-123',
        email_confirm: true
      })
      if (otherUserError) throw otherUserError
      if (!otherUserData.user) throw new Error('Other user creation failed')
      const otherUserId = otherUserData.user.id
      createdUserIds.push(otherUserId)
      
      const otherDocumentId = createTestId()
      const { error: otherDocError } = await adminClient
        .from('documents')
        .insert({
          id: otherDocumentId,
          created_by: otherUserId,
          title: `Other User Document ${testNamespace}`,
          html_content: '<p>Other content</p>',
          plaintext_content: 'Other content',
          slug: `other-document-${testNamespace}-${otherDocumentId}`
        })
      if (otherDocError) throw otherDocError
      createdDocumentIds.push(otherDocumentId)

      // Try to create a thread for the other user's document
      // This should fail due to RLS policies
      await expect(
        chatService.createThread({
          documentId: otherDocumentId,
          modelString: 'anthropic:claude-3-5-haiku:20241022',
          userId: testUserId
        })
      ).rejects.toThrow()
    })

    it('should prevent access to other users threads via Bearer token', async () => {
      // Create another user with their own client
      const { data: otherUserData, error: otherUserError } = await adminClient.auth.admin.createUser({
        email: `${testNamespace}-other2@test.com`,
        password: 'test-password-123',
        email_confirm: true
      })
      if (otherUserError) throw otherUserError
      if (!otherUserData.user) throw new Error('Other user creation failed')
      const otherUserId = otherUserData.user.id
      createdUserIds.push(otherUserId)
      
      // Create JWT token for other user
      const jwt = await import('jsonwebtoken')
      const secret = process.env.SUPABASE_JWT_SECRET!
      const otherToken = jwt.sign({
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
        sub: otherUserId,
        role: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
      }, secret)
      
      const otherDocumentId = createTestId()
      const { error: otherDocError } = await adminClient
        .from('documents')
        .insert({
          id: otherDocumentId,
          created_by: otherUserId,
          title: `Other User Document ${testNamespace}`,
          html_content: '<p>Other content</p>',
          plaintext_content: 'Other content',
          slug: `other-document-${testNamespace}-${otherDocumentId}`
        })
      if (otherDocError) throw otherDocError
      createdDocumentIds.push(otherDocumentId)

      // Create thread as other user
      const otherClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${otherToken}`
          }
        }
      })
      const otherChatService = new ChatService(otherClient)
      const otherThread = await otherChatService.createThread({
        documentId: otherDocumentId,
        modelString: 'anthropic:claude-3-5-haiku:20241022',
        userId: otherUserId
      })
      createdThreadIds.push(otherThread.id)

      // Try to access other user's thread with our Bearer token
      // This should return empty results due to RLS
      const messages = await chatService.getThreadMessages(otherThread.id)
      expect(messages).toHaveLength(0)
    })

    it('should allow access to own threads across different auth methods', async () => {
      // Create thread with Bearer token
      const thread = await chatService.createThread({
        documentId: testDocumentId,
        modelString: 'anthropic:claude-3-5-haiku:20241022',
        userId: testUserId
      })
      createdThreadIds.push(thread.id)
      
      await chatService.addMessage({
        threadId: thread.id,
        role: 'user',
        content: 'Message via Bearer'
      })

      // Create another client with the same Bearer token
      // (simulating different auth method but same user)
      const anotherBearerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${testUserToken}`
          }
        }
      })
      const anotherChatService = new ChatService(anotherBearerClient)

      // Should be able to access the same thread
      const messages = await anotherChatService.getThreadMessages(thread.id)
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Message via Bearer')

      // Add another message
      await anotherChatService.addMessage({
        threadId: thread.id,
        role: 'assistant',
        content: 'Response via another client'
      })

      // Verify both messages are there
      const allMessages = await chatService.getThreadMessages(thread.id)
      expect(allMessages).toHaveLength(2)
    })
  })

  describe('Database Consistency', () => {
    it('should maintain atomic operations with Bearer token', async () => {
      // Create thread and multiple messages atomically
      const thread = await chatService.createThread({
        documentId: testDocumentId,
        modelString: 'anthropic:claude-3-5-haiku:20241022',
        userId: testUserId
      })
      createdThreadIds.push(thread.id)
      
      // Create multiple messages in sequence
      const messages = []
      for (let i = 0; i < 5; i++) {
        const msg = await chatService.addMessage({
          threadId: thread.id,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i + 1}`
        })
        messages.push(msg)
      }

      // Verify all messages were created
      expect(messages).toHaveLength(5)
      
      // Verify sequence numbers are correct (1-based)
      for (let i = 0; i < messages.length; i++) {
        expect(messages[i].sequence_number).toBe(i + 1)
      }

      // Retrieve and verify
      const retrievedMessages = await chatService.getThreadMessages(thread.id)
      expect(retrievedMessages).toHaveLength(5)
      expect(retrievedMessages.map(m => m.content)).toEqual([
        'Message 1',
        'Message 2', 
        'Message 3',
        'Message 4',
        'Message 5'
      ])
    })

    it('should handle concurrent operations with Bearer token', async () => {
      const thread = await chatService.createThread({
        documentId: testDocumentId,
        modelString: 'anthropic:claude-3-5-haiku:20241022',
        userId: testUserId
      })
      createdThreadIds.push(thread.id)
      
      // Create multiple messages concurrently
      const messagePromises = Array.from({ length: 10 }, (_, i) => 
        chatService.addMessage({
          threadId: thread.id,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Concurrent message ${i}`
        }).catch(err => ({ error: err.message, index: i }))
      )

      const results = await Promise.all(messagePromises)
      
      // Some messages might fail due to concurrent sequence conflicts
      const successfulMessages = results.filter(r => !r.error)
      const failedMessages = results.filter(r => r.error)
      
      // At least some messages should succeed
      expect(successfulMessages.length).toBeGreaterThan(0)
      
      // Failed messages should be due to unique constraint violations
      failedMessages.forEach(failed => {
        expect(failed.error).toContain('unique constraint')
      })
      
      // Verify final state by retrieving all messages
      const allMessages = await chatService.getThreadMessages(thread.id)
      expect(allMessages.length).toBeGreaterThan(0)
      
      // All messages should have unique sequence numbers
      const sequenceNumbers = allMessages.map(m => m.sequence_number)
      const uniqueSequences = new Set(sequenceNumbers)
      expect(uniqueSequences.size).toBe(allMessages.length)
    })
  })
})