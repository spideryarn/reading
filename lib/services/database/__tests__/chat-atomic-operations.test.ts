/**
 * Integration tests for atomic thread + message creation in database-first chat architecture
 * 
 * Tests the core database-first operations that eliminate race conditions and dual-state management:
 * - Atomic thread creation with first message pair
 * - Single transaction: create thread → insert user message → run AI → insert AI response
 * - Complete database state returned in single response
 * 
 * @see docs/planning/250629a_chat_architecture_database_first_redesign.md for architectural context
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/tools/[toolId]/route'
import { RealRLSTestSetup } from '@/lib/services/database/__tests__/rls-test-helpers'
import { generateCorrelationId } from '@/lib/services/logger'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'
import jwt from 'jsonwebtoken'
// Tool registry setup for Jest environment
import { resetRegistryForTests, registerTool, getTool, getAllTools } from '@/lib/tools/registry'
import { ChatCircle } from '@phosphor-icons/react/dist/ssr'
import type { Tool } from '@/lib/tools/types'

describe('Chat Atomic Operations', () => {
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
    
    // Debug: Verify tool registration
    const allTools = getAllTools()
    const registeredChatTool = getTool('chat')
    console.log('All tools:', allTools.map(t => t.id))
    console.log('Chat tool registered:', !!registeredChatTool)
    
    // Try using the admin user to see if that resolves RLS issues
    const adminUserId = '11111111-1111-1111-1111-111111111111' // hello@spideryarn.com
    
    // Create a test auth token for admin user
    const secret = process.env.SUPABASE_JWT_SECRET!
    const payload = {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
      sub: adminUserId,
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
    }
    testAuthToken = jwt.sign(payload, secret)

    // Create test document for all chat operations (owned by admin)
    testDocument = await testSetup.createTestDocument({
      title: 'Chat Test Document',
      created_by: adminUserId,
      html_content: '<h1>Chat Test Content</h1><p>This is content for chat testing.</p>',
      plaintext_content: 'Chat Test Content\n\nThis is content for chat testing.'
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

  describe('Atomic Thread + Message Creation', () => {
    it('should create thread and message pair atomically with databaseFirst flag', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Hello, this is my first message in a new thread!' }],
          documentContext: 'Chat Test Content\n\nThis is content for chat testing.',
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

      // Debug: Log authentication details if request failed
      if (response.status !== 200) {
        console.log('Error response status:', response.status)
        console.log('Error response data:', responseData)
        console.log('Test user ID:', TEST_USER_IDS.USER_A)
        console.log('Test document created_by:', testDocument.created_by)
        console.log('JWT token sub:', JSON.parse(Buffer.from(testAuthToken.split('.')[1], 'base64').toString()).sub)
      }

      // Verify successful response
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty('thread')
      expect(responseData).toHaveProperty('messages')
      expect(responseData).toHaveProperty('type', 'conversation')

      // Verify thread was created with correct structure
      const thread = responseData.thread
      expect(thread).toHaveProperty('id')
      expect(thread).toHaveProperty('document_id', testDocument.id)
      expect(thread).toHaveProperty('created_by', TEST_USER_IDS.USER_A)
      expect(thread).toHaveProperty('title')
      expect(thread.title).toContain('Hello, this is my first message') // AI-generated title

      // Verify messages array contains both user and assistant messages
      const messages = responseData.messages
      expect(Array.isArray(messages)).toBe(true)
      expect(messages.length).toBeGreaterThanOrEqual(2) // User + assistant

      // Verify user message
      const userMessage = messages.find((m: any) => m.role === 'user')
      expect(userMessage).toBeDefined()
      expect(userMessage.content).toBe('Hello, this is my first message in a new thread!')
      expect(userMessage.thread_id).toBe(thread.id)
      expect(userMessage.created_by).toBe(TEST_USER_IDS.USER_A)
      expect(userMessage).toHaveProperty('sequence_number')

      // Verify assistant message
      const assistantMessage = messages.find((m: any) => m.role === 'assistant')
      expect(assistantMessage).toBeDefined()
      expect(assistantMessage.content).toBeTruthy() // Should have AI response content
      expect(assistantMessage.thread_id).toBe(thread.id)
      expect(assistantMessage.created_by).toBe(TEST_USER_IDS.USER_A) // Inherits thread ownership
      expect(assistantMessage).toHaveProperty('sequence_number')

      // Verify sequence numbers are ordered correctly
      expect(userMessage.sequence_number).toBeLessThan(assistantMessage.sequence_number)

      // Cleanup: Store thread ID for cleanup
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', thread.id)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', thread.id)
      })
    })

    it('should handle existing thread atomic message addition', async () => {
      // First, create a thread with initial message
      const initialRequestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Initial message in thread' }],
          documentContext: 'Chat Test Content',
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

      // Cleanup thread after test
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', threadId)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', threadId)
      })

      // Now add a second message to existing thread
      const followupRequestBody = {
        action: 'execute',
        parameters: {
          messages: [
            { role: 'user', content: 'Initial message in thread' },
            { role: 'assistant', content: initialData.messages.find((m: any) => m.role === 'assistant').content },
            { role: 'user', content: 'This is a follow-up question in the same thread' }
          ],
          threadId: threadId,
          documentContext: 'Chat Test Content',
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

      // Verify successful followup response
      expect(followupResponse.status).toBe(200)
      expect(followupData.thread.id).toBe(threadId) // Same thread

      // Verify all messages are present in chronological order
      const allMessages = followupData.messages
      expect(allMessages.length).toBeGreaterThanOrEqual(4) // 2 user + 2 assistant

      // Verify sequence numbers are strictly increasing
      const sequenceNumbers = allMessages.map((m: any) => m.sequence_number).sort((a: number, b: number) => a - b)
      for (let i = 1; i < sequenceNumbers.length; i++) {
        expect(sequenceNumbers[i]).toBeGreaterThan(sequenceNumbers[i - 1])
      }

      // Verify the latest user message was added
      const latestUserMessage = allMessages
        .filter((m: any) => m.role === 'user')
        .sort((a: any, b: any) => b.sequence_number - a.sequence_number)[0]
      expect(latestUserMessage.content).toBe('This is a follow-up question in the same thread')
    })

    it('should handle database transaction failures gracefully', async () => {
      // Test with invalid document ID to trigger database constraint failure
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'This should fail due to invalid document ID' }],
          documentContext: 'Test content',
          documentId: '00000000-0000-0000-0000-000000000000', // Invalid document ID
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

      // Should fail gracefully with proper error message
      expect(response.status).toBe(400)
      expect(responseData).toHaveProperty('detail')
      expect(responseData.detail).toContain('Document not found or access denied')

      // Verify no partial data was created (atomicity)
      // Check that no thread or messages were created
      const adminClient = testSetup.getAdminClient()
      
      // Check for any threads created for the invalid document
      const { data: orphanThreads } = await adminClient
        .from('chat_threads')
        .select('*')
        .eq('document_id', '00000000-0000-0000-0000-000000000000')
      
      expect(orphanThreads).toEqual([])
    })

    it('should maintain thread ownership isolation in atomic operations', async () => {
      // Create thread as User A
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'User A creates a thread' }],
          documentContext: 'Chat Test Content',
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
          'Authorization': `Bearer ${testAuthToken}`, // User A token
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

      // Try to add message as User B (should fail due to RLS)
      const userBSecret = process.env.SUPABASE_JWT_SECRET!
      const userBPayload = {
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        sub: TEST_USER_IDS.USER_B,
        role: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
      }
      const userBToken = jwt.sign(userBPayload, userBSecret)

      const userBRequestBody = {
        action: 'execute',
        parameters: {
          messages: [
            { role: 'user', content: 'User A creates a thread' },
            { role: 'assistant', content: responseData.messages.find((m: any) => m.role === 'assistant').content },
            { role: 'user', content: 'User B tries to add to User A thread' }
          ],
          threadId: threadId,
          documentContext: 'Chat Test Content',
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

      const userBRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userBToken}`, // User B token
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userBRequestBody)
      })

      const userBResponse = await POST(userBRequest, { params: { toolId: 'chat' } })
      const userBResponseData = await userBResponse.json()

      // Should fail due to RLS policies protecting thread ownership
      expect(userBResponse.status).toBe(403)
      expect(userBResponseData.detail).toContain('access denied')
    })
  })

  describe('Response Format Validation', () => {
    it('should return complete database-first response format', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Test response format' }],
          documentContext: 'Chat Test Content',
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

      // Verify complete response structure
      expect(responseData).toHaveProperty('type', 'conversation')
      expect(responseData).toHaveProperty('thread')
      expect(responseData).toHaveProperty('messages')
      expect(responseData).toHaveProperty('metadata')

      // Verify thread structure
      const thread = responseData.thread
      expect(thread).toHaveProperty('id')
      expect(thread).toHaveProperty('document_id', testDocument.id)
      expect(thread).toHaveProperty('created_by', TEST_USER_IDS.USER_A)
      expect(thread).toHaveProperty('title')
      expect(thread).toHaveProperty('created_at')
      expect(thread).toHaveProperty('updated_at')

      // Verify messages structure
      const messages = responseData.messages
      expect(Array.isArray(messages)).toBe(true)
      messages.forEach((message: any) => {
        expect(message).toHaveProperty('id')
        expect(message).toHaveProperty('thread_id', thread.id)
        expect(message).toHaveProperty('role')
        expect(message).toHaveProperty('content')
        expect(message).toHaveProperty('sequence_number')
        expect(message).toHaveProperty('created_by', TEST_USER_IDS.USER_A)
        expect(message).toHaveProperty('created_at')
        expect(['user', 'assistant']).toContain(message.role)
      })

      // Verify metadata structure
      const metadata = responseData.metadata
      expect(metadata).toHaveProperty('correlationId')
      expect(metadata).toHaveProperty('source')
      expect(metadata).toHaveProperty('timestamp')

      // Cleanup
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', thread.id)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', thread.id)
      })
    })

    it('should maintain backward compatibility with legacy response fields', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Test backward compatibility' }],
          documentContext: 'Chat Test Content',
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

      // Verify legacy compatibility fields are present
      expect(responseData).toHaveProperty('result') // Legacy field
      expect(responseData).toHaveProperty('success', true) // Legacy field
      
      // Verify new database-first fields are also present
      expect(responseData).toHaveProperty('thread')
      expect(responseData).toHaveProperty('messages')
      expect(responseData).toHaveProperty('type', 'conversation')

      // Cleanup
      const thread = responseData.thread
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', thread.id)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', thread.id)
      })
    })
  })
})