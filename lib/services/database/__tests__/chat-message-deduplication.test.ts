/**
 * Integration tests for message deduplication and ordering guarantees in database-first chat
 * 
 * Tests the core guarantees that eliminate duplicate messages and ensure proper ordering:
 * - Message deduplication based on database IDs (not content)
 * - Sequence number ordering guarantees
 * - Concurrent message handling without duplicates
 * - Database-first approach prevents dual-state management issues
 * 
 * @see planning/250629a_chat_architecture_database_first_redesign.md for architectural context
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/tools/[toolId]/route'
import { RealRLSTestSetup } from '@/lib/services/database/__tests__/rls-test-helpers'
import { generateCorrelationId } from '@/lib/services/logger'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'
import jwt from 'jsonwebtoken'
// Tool registry setup for Jest environment
import { resetRegistryForTests, registerTool } from '@/lib/tools/registry'
import { ChatCircle } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '@/lib/tools/types'

describe('Chat Message Deduplication and Ordering', () => {
  let testSetup: RealRLSTestSetup
  let cleanupFunctions: Array<() => Promise<void>>
  let testAuthToken: string
  let testDocument: any

  beforeEach(async () => {
    testSetup = new RealRLSTestSetup()
    cleanupFunctions = []
    
    // Reset and setup tool registry for Jest environment
    resetRegistryForTests()
    
    // Register chat tool manually for Jest environment
    const chatTool: Tool = {
      id: 'chat',
      name: 'Chat',
      description: 'Ask questions and get AI-powered answers about the document content',
      category: 'interactive',
      icon: ChatCircle,
      componentPath: '@/components/assistant-chat',
      tabId: 'chat',
      shortcuts: ['Cmd+4', 'Ctrl+4'],
      keywords: ['chat', 'ask', 'questions', 'ai', 'assistant', 'conversation'],
      requiresDocument: true,
      autoLoad: false,
      capabilities: {
        search: false,
        export: false,
        realtime: true
      },
      urlStateKeys: ['conversation'],
      executorConfig: {
        apiEndpoint: '/api/tools/chat',
        timeout: 60000,
        supportedActions: ['send', 'execute', 'create', 'get', 'list', 'delete'],
        requiresAuth: true,
        cacheable: false
      }
    }
    
    registerTool(chatTool)
    
    // Create a test auth token
    const secret = process.env.SUPABASE_JWT_SECRET!
    const payload = {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
      sub: TEST_USER_IDS.USER_A,
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
    }
    testAuthToken = jwt.sign(payload, secret)

    // Create test document for all chat operations
    testDocument = await testSetup.createTestDocument({
      title: 'Deduplication Test Document',
      created_by: TEST_USER_IDS.USER_A,
      html_content: '<h1>Test Content</h1><p>This is content for deduplication testing.</p>',
      plaintext_content: 'Test Content\n\nThis is content for deduplication testing.'
    })
    cleanupFunctions.push(async () => {
      await testSetup.getAdminClient().from('documents').delete().eq('id', testDocument.id)
    })
  })

  afterEach(async () => {
    if (cleanupFunctions.length > 0) {
      await Promise.all(cleanupFunctions.map(fn => fn()))
    }
    await testSetup.cleanup()
  })

  describe('Message Deduplication by Database ID', () => {
    it('should deduplicate messages based on database IDs, not content', async () => {
      // Create initial thread with first message
      const initialRequestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Duplicate content test' }],
          documentContext: 'Test Content',
          documentId: testDocument.id,
          databaseFirst: true,
          atomic: true
        },
        metadata: {
          correlationId: generateCorrelationId(),
          source: 'api',
          timestamp: new Date().toISOString()
        }
      }

      const initialRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialRequestBody)
      })

      const initialResponse = await POST(initialRequest, { params: { toolId: 'chat' } })
      const initialData = await initialResponse.json()

      expect(initialResponse.status).toBe(200)
      const threadId = initialData.thread.id

      // Cleanup thread
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', threadId)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', threadId)
      })

      // Send another message with same content (should create new message, not duplicate)
      const duplicateContentRequestBody = {
        action: 'execute',
        parameters: {
          messages: [
            { role: 'user', content: 'Duplicate content test' },
            { role: 'assistant', content: initialData.messages.find((m: any) => m.role === 'assistant').content },
            { role: 'user', content: 'Duplicate content test' } // Same content as first message
          ],
          threadId: threadId,
          documentContext: 'Test Content',
          documentId: testDocument.id,
          databaseFirst: true,
          atomic: true
        },
        metadata: {
          correlationId: generateCorrelationId(),
          source: 'api',
          timestamp: new Date().toISOString()
        }
      }

      const duplicateRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateContentRequestBody)
      })

      const duplicateResponse = await POST(duplicateRequest, { params: { toolId: 'chat' } })
      const duplicateData = await duplicateResponse.json()

      expect(duplicateResponse.status).toBe(200)

      // Verify that both messages with same content exist as separate database entries
      const allMessages = duplicateData.messages
      const userMessages = allMessages.filter((m: any) => m.role === 'user')
      
      // Should have 2 user messages with same content but different IDs
      expect(userMessages.length).toBe(2)
      expect(userMessages[0].content).toBe('Duplicate content test')
      expect(userMessages[1].content).toBe('Duplicate content test')
      expect(userMessages[0].id).not.toBe(userMessages[1].id) // Different database IDs
      expect(userMessages[0].sequence_number).not.toBe(userMessages[1].sequence_number) // Different sequence numbers

      // Verify proper sequence ordering
      expect(userMessages[0].sequence_number).toBeLessThan(userMessages[1].sequence_number)
    })

    it('should handle message arrays with pre-existing database IDs correctly', async () => {
      // Create thread with initial messages
      const initialRequestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'First message' }],
          documentContext: 'Test Content',
          documentId: testDocument.id,
          databaseFirst: true,
          atomic: true
        },
        metadata: {
          correlationId: generateCorrelationId(),
          source: 'api',
          timestamp: new Date().toISOString()
        }
      }

      const initialRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialRequestBody)
      })

      const initialResponse = await POST(initialRequest, { params: { toolId: 'chat' } })
      const initialData = await initialResponse.json()

      expect(initialResponse.status).toBe(200)
      const threadId = initialData.thread.id

      // Cleanup thread
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', threadId)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', threadId)
      })

      // Get the actual database IDs from the response
      const existingUserMessage = initialData.messages.find((m: any) => m.role === 'user')
      const existingAssistantMessage = initialData.messages.find((m: any) => m.role === 'assistant')

      // Send followup with existing messages included (simulating client state)
      const followupRequestBody = {
        action: 'execute',
        parameters: {
          messages: [
            { 
              id: existingUserMessage.id, // Include existing database ID
              role: 'user', 
              content: 'First message',
              sequence_number: existingUserMessage.sequence_number
            },
            { 
              id: existingAssistantMessage.id, // Include existing database ID
              role: 'assistant', 
              content: existingAssistantMessage.content,
              sequence_number: existingAssistantMessage.sequence_number
            },
            { role: 'user', content: 'Second message' } // New message without ID
          ],
          threadId: threadId,
          documentContext: 'Test Content',
          documentId: testDocument.id,
          databaseFirst: true,
          atomic: true
        },
        metadata: {
          correlationId: generateCorrelationId(),
          source: 'api',
          timestamp: new Date().toISOString()
        }
      }

      const followupRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(followupRequestBody)
      })

      const followupResponse = await POST(followupRequest, { params: { toolId: 'chat' } })
      const followupData = await followupResponse.json()

      expect(followupResponse.status).toBe(200)

      // Verify no duplication occurred - existing messages should not be duplicated
      const allMessages = followupData.messages
      const userMessages = allMessages.filter((m: any) => m.role === 'user')
      
      // Should have exactly 2 user messages (original + new one)
      expect(userMessages.length).toBe(2)
      
      // Verify the first message ID remains the same (not duplicated)
      const firstUserMessage = userMessages.find((m: any) => m.content === 'First message')
      expect(firstUserMessage.id).toBe(existingUserMessage.id)
      
      // Verify the second message has a new ID
      const secondUserMessage = userMessages.find((m: any) => m.content === 'Second message')
      expect(secondUserMessage.id).not.toBe(existingUserMessage.id)
      expect(secondUserMessage.id).toBeTruthy()
    })

    it('should prevent phantom messages through database-first approach', async () => {
      // This test simulates the scenario that caused the original "refresh to fix" bug
      // where optimistic updates would create phantom messages

      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Test phantom message prevention' }],
          documentContext: 'Test Content',
          documentId: testDocument.id,
          databaseFirst: true,
          atomic: true
        },
        metadata: {
          correlationId: generateCorrelationId(),
          source: 'api',
          timestamp: new Date().toISOString()
        }
      }

      const request = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request, { params: { toolId: 'chat' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      const threadId = responseData.thread.id

      // Cleanup thread
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', threadId)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', threadId)
      })

      // Verify what's actually in the database matches exactly what was returned
      const adminClient = testSetup.getAdminClient()
      const { data: dbMessages, error } = await adminClient
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('sequence_number', { ascending: true })

      expect(error).toBeNull()
      expect(dbMessages).toBeTruthy()

      // Response messages should exactly match database state
      const responseMessages = responseData.messages
      expect(responseMessages.length).toBe(dbMessages!.length)

      // Verify each message in response has corresponding database entry
      responseMessages.forEach((responseMsg: any) => {
        const dbMsg = dbMessages!.find(db => db.id === responseMsg.id)
        expect(dbMsg).toBeTruthy()
        expect(dbMsg!.content).toBe(responseMsg.content)
        expect(dbMsg!.role).toBe(responseMsg.role)
        expect(dbMsg!.sequence_number).toBe(responseMsg.sequence_number)
      })

      // Verify no extra messages exist in database
      dbMessages!.forEach((dbMsg) => {
        const responseMsg = responseMessages.find((rm: any) => rm.id === dbMsg.id)
        expect(responseMsg).toBeTruthy()
      })
    })
  })

  describe('Sequence Number Ordering Guarantees', () => {
    it('should maintain strict sequence number ordering across multiple interactions', async () => {
      // Create thread with multiple back-and-forth messages
      const messages = [
        'First user message',
        'Second user message', 
        'Third user message'
      ]

      let threadId: string | null = null
      let allResponses: any[] = []

      // Send messages sequentially to build up conversation
      for (let i = 0; i < messages.length; i++) {
        const previousMessages: any[] = []
        
        // Include all previous messages in the conversation
        for (let j = 0; j < i; j++) {
          const prevResponse = allResponses[j]
          if (prevResponse) {
            previousMessages.push(
              ...prevResponse.messages.filter((m: any) => m.sequence_number <= prevResponse.messages.reduce((max: any, msg: any) => Math.max(max, msg.sequence_number), 0))
            )
          }
        }

        // Add the current message
        previousMessages.push({ role: 'user', content: messages[i] })

        const requestBody = {
          action: 'execute',
          parameters: {
            messages: previousMessages,
            threadId: threadId,
            documentContext: 'Test Content',
            documentId: testDocument.id,
            databaseFirst: true,
            atomic: true
          },
          metadata: {
            correlationId: generateCorrelationId(),
            source: 'api',
            timestamp: new Date().toISOString()
          }
        }

        const request = new NextRequest('http://localhost:3000/api/tools/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testAuthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        const response = await POST(request, { params: { toolId: 'chat' } })
        const responseData = await response.json()

        expect(response.status).toBe(200)
        
        if (threadId === null) {
          threadId = responseData.thread.id
          // Cleanup thread
          cleanupFunctions.push(async () => {
            await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', threadId)
            await testSetup.getAdminClient().from('chat_threads').delete().eq('id', threadId)
          })
        }

        allResponses.push(responseData)
      }

      // Verify final conversation has proper sequence ordering
      const finalResponse = allResponses[allResponses.length - 1]
      const finalMessages = finalResponse.messages

      // Sort by sequence number
      const sortedMessages = [...finalMessages].sort((a, b) => a.sequence_number - b.sequence_number)

      // Verify sequence numbers are consecutive and start from 1
      for (let i = 0; i < sortedMessages.length; i++) {
        expect(sortedMessages[i].sequence_number).toBe(i + 1)
      }

      // Verify alternating user/assistant pattern in sequence order
      const userMessageIndices = sortedMessages
        .map((msg, index) => msg.role === 'user' ? index : -1)
        .filter(index => index !== -1)
      
      const assistantMessageIndices = sortedMessages
        .map((msg, index) => msg.role === 'assistant' ? index : -1)
        .filter(index => index !== -1)

      // User messages should come at positions 0, 2, 4, 6... (even indices)
      userMessageIndices.forEach((index, i) => {
        expect(index).toBe(i * 2) // 0, 2, 4, 6...
      })

      // Assistant messages should come at positions 1, 3, 5, 7... (odd indices)  
      assistantMessageIndices.forEach((index, i) => {
        expect(index).toBe(i * 2 + 1) // 1, 3, 5, 7...
      })
    })

    it('should handle concurrent sequence number generation correctly', async () => {
      // This test simulates concurrent message sends to the same thread
      // to verify sequence number generation handles race conditions

      // Create initial thread
      const initialRequestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Initial message for concurrency test' }],
          documentContext: 'Test Content',
          documentId: testDocument.id,
          databaseFirst: true,
          atomic: true
        },
        metadata: {
          correlationId: generateCorrelationId(),
          source: 'api',
          timestamp: new Date().toISOString()
        }
      }

      const initialRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialRequestBody)
      })

      const initialResponse = await POST(initialRequest, { params: { toolId: 'chat' } })
      const initialData = await initialResponse.json()

      expect(initialResponse.status).toBe(200)
      const threadId = initialData.thread.id

      // Cleanup thread
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', threadId)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', threadId)
      })

      // Note: True concurrency testing is challenging in Jest environment
      // This test simulates what would happen with near-concurrent requests
      // by rapidly sending multiple requests in sequence

      const concurrentMessages = [
        'Concurrent message 1',
        'Concurrent message 2',
        'Concurrent message 3'
      ]

      const concurrentRequests = concurrentMessages.map((messageContent, index) => {
        const existingMessages = initialData.messages
        
        const requestBody = {
          action: 'execute',
          parameters: {
            messages: [
              ...existingMessages,
              { role: 'user', content: messageContent }
            ],
            threadId: threadId,
            documentContext: 'Test Content',
            documentId: testDocument.id,
            databaseFirst: true,
            atomic: true
          },
          metadata: {
            correlationId: generateCorrelationId(),
            source: 'api',
            timestamp: new Date().toISOString()
          }
        }

        return new NextRequest('http://localhost:3000/api/tools/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testAuthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })
      })

      // Send requests in rapid succession (simulating concurrency)
      const responses = await Promise.all(
        concurrentRequests.map(request => POST(request, { params: { toolId: 'chat' } }))
      )

      // At least one should succeed (atomic operations should handle conflicts)
      const successfulResponses = responses.filter(r => r.status === 200)
      expect(successfulResponses.length).toBeGreaterThan(0)

      // Verify that successful operations maintain sequence integrity
      for (const response of successfulResponses) {
        const data = await response.json()
        const messages = data.messages

        // Verify sequence numbers are consecutive
        const sortedMessages = [...messages].sort((a, b) => a.sequence_number - b.sequence_number)
        for (let i = 0; i < sortedMessages.length; i++) {
          expect(sortedMessages[i].sequence_number).toBe(i + 1)
        }
      }
    })

    it('should maintain sequence integrity across thread reloads', async () => {
      // Create thread with multiple messages
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Test sequence integrity across reloads' }],
          documentContext: 'Test Content',
          documentId: testDocument.id,
          databaseFirst: true,
          atomic: true
        },
        metadata: {
          correlationId: generateCorrelationId(),
          source: 'api',
          timestamp: new Date().toISOString()
        }
      }

      const request = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request, { params: { toolId: 'chat' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      const threadId = responseData.thread.id

      // Cleanup thread
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', threadId)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', threadId)
      })

      // Simulate a "page reload" by fetching thread messages directly from database
      const adminClient = testSetup.getAdminClient()
      const { data: reloadedMessages, error } = await adminClient
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('sequence_number', { ascending: true })

      expect(error).toBeNull()
      expect(reloadedMessages).toBeTruthy()

      // Verify sequence numbers are consecutive starting from 1
      reloadedMessages!.forEach((message, index) => {
        expect(message.sequence_number).toBe(index + 1)
      })

      // Add another message after "reload"
      const followupRequestBody = {
        action: 'execute',
        parameters: {
          messages: [
            ...responseData.messages,
            { role: 'user', content: 'Message after reload' }
          ],
          threadId: threadId,
          documentContext: 'Test Content',
          documentId: testDocument.id,
          databaseFirst: true,
          atomic: true
        },
        metadata: {
          correlationId: generateCorrelationId(),
          source: 'api',
          timestamp: new Date().toISOString()
        }
      }

      const followupRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(followupRequestBody)
      })

      const followupResponse = await POST(followupRequest, { params: { toolId: 'chat' } })
      const followupData = await followupResponse.json()

      expect(followupResponse.status).toBe(200)

      // Verify sequence integrity is maintained after reload + new message
      const allMessages = followupData.messages
      const sortedMessages = [...allMessages].sort((a, b) => a.sequence_number - b.sequence_number)
      
      for (let i = 0; i < sortedMessages.length; i++) {
        expect(sortedMessages[i].sequence_number).toBe(i + 1)
      }
    })
  })
})