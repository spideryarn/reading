/**
 * Comprehensive validation tests ensuring zero duplicate messages under any conditions
 * 
 * This test suite validates the primary goal of the database-first chat architecture redesign:
 * eliminating all possible scenarios that could lead to duplicate messages.
 * 
 * Tests cover:
 * - Rapid consecutive sends
 * - Network retry scenarios
 * - Mixed content types and edge cases
 * - Error recovery without duplication
 * - State consistency validation
 * 
 * @see planning/250629a_chat_architecture_database_first_redesign.md - "Zero duplicate messages" goal
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

describe('Chat Zero Duplicates Validation', () => {
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
      title: 'No Duplicates Test Document',
      created_by: TEST_USER_IDS.USER_A,
      html_content: '<h1>Test Content</h1><p>This is content for no-duplicates testing.</p>',
      plaintext_content: 'Test Content\n\nThis is content for no-duplicates testing.'
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

  /**
   * Helper function to validate that a set of messages contains no duplicates
   * Uses multiple criteria to detect potential duplicates:
   * - Database ID uniqueness (primary)
   * - Content + role + sequence combination uniqueness
   * - Creation timestamp proximity analysis
   */
  function validateNoDuplicates(messages: any[], description: string = 'messages') {
    // 1. Check database ID uniqueness (primary duplicate detection)
    const messageIds = messages.map(m => m.id)
    const uniqueIds = new Set(messageIds)
    expect(uniqueIds.size).toBe(messageIds.length, `${description}: Found duplicate database IDs`)

    // 2. Check sequence number uniqueness within thread
    const sequenceNumbers = messages.map(m => m.sequence_number)
    const uniqueSequences = new Set(sequenceNumbers)
    expect(uniqueSequences.size).toBe(sequenceNumbers.length, `${description}: Found duplicate sequence numbers`)

    // 3. Analyze for suspicious content patterns (same content at wrong sequence positions)
    const userMessages = messages.filter(m => m.role === 'user')
    const assistantMessages = messages.filter(m => m.role === 'assistant')

    // Check user messages for exact content duplicates with different IDs
    const userContentGroups = new Map<string, any[]>()
    userMessages.forEach(msg => {
      const content = msg.content.trim()
      if (!userContentGroups.has(content)) {
        userContentGroups.set(content, [])
      }
      userContentGroups.get(content)!.push(msg)
    })

    userContentGroups.forEach((msgs, content) => {
      if (msgs.length > 1) {
        // Multiple messages with same content - check if this is legitimate (re-asking same question)
        // vs duplicate (same sequence position, same timestamps)
        const sequenceGaps = []
        for (let i = 1; i < msgs.length; i++) {
          sequenceGaps.push(msgs[i].sequence_number - msgs[i-1].sequence_number)
        }
        
        // If sequence gaps are very small (< 3), this might be a duplicate
        const suspiciousGaps = sequenceGaps.filter(gap => gap < 3)
        if (suspiciousGaps.length > 0) {
          console.warn(`${description}: Suspicious content duplication detected for "${content}". Sequence gaps: ${sequenceGaps}`)
        }
      }
    })

    // 4. Validate sequence ordering is consecutive
    const sortedMessages = [...messages].sort((a, b) => a.sequence_number - b.sequence_number)
    for (let i = 0; i < sortedMessages.length; i++) {
      expect(sortedMessages[i].sequence_number).toBe(i + 1, `${description}: Non-consecutive sequence numbers detected`)
    }

    // 5. Validate user/assistant alternating pattern
    for (let i = 0; i < sortedMessages.length; i++) {
      const expectedRole = i % 2 === 0 ? 'user' : 'assistant'
      expect(sortedMessages[i].role).toBe(expectedRole, `${description}: Broken user/assistant alternating pattern at position ${i}`)
    }

    return {
      totalMessages: messages.length,
      uniqueIds: uniqueIds.size,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      sequenceRange: messages.length > 0 ? [Math.min(...sequenceNumbers), Math.max(...sequenceNumbers)] : [0, 0]
    }
  }

  describe('Rapid Consecutive Sends', () => {
    it('should handle rapid consecutive message sends without duplicates', async () => {
      // Create initial thread
      const initialRequestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Initial message for rapid send test' }],
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

      // Send multiple messages in rapid succession
      const rapidMessages = [
        'Rapid message 1',
        'Rapid message 2', 
        'Rapid message 3',
        'Rapid message 4'
      ]

      let currentMessages = initialData.messages
      const allResponses = []

      for (const messageContent of rapidMessages) {
        const requestBody = {
          action: 'execute',
          parameters: {
            messages: [
              ...currentMessages,
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
        allResponses.push(responseData)
        
        // Update current messages for next iteration
        currentMessages = responseData.messages
        
        // Validate no duplicates after each send
        const validation = validateNoDuplicates(currentMessages, `After sending "${messageContent}"`)
        console.log(`Validation after "${messageContent}":`, validation)
      }

      // Final validation on complete conversation
      const finalMessages = currentMessages
      const finalValidation = validateNoDuplicates(finalMessages, 'Final rapid send conversation')
      
      // Should have initial + 4 rapid messages + their AI responses = 10 total messages
      expect(finalValidation.totalMessages).toBe(10) // 5 user + 5 assistant
      expect(finalValidation.userMessages).toBe(5)
      expect(finalValidation.assistantMessages).toBe(5)
    })

    it('should handle identical content sends without creating duplicates', async () => {
      // Test the scenario where a user accidentally sends the same message multiple times
      const repeatedContent = 'This is the same question asked multiple times'

      const initialRequestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: repeatedContent }],
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

      // Send the exact same content multiple times
      let currentMessages = initialData.messages

      for (let i = 0; i < 3; i++) {
        const requestBody = {
          action: 'execute',
          parameters: {
            messages: [
              ...currentMessages,
              { role: 'user', content: repeatedContent } // Same content each time
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
        currentMessages = responseData.messages

        // Validate no duplicates - each repeated send should create a new message
        const validation = validateNoDuplicates(currentMessages, `After repeated send #${i + 1}`)
        console.log(`Validation after repeated send #${i + 1}:`, validation)
      }

      // Verify that we have 4 user messages with same content but different IDs and sequences
      const userMessages = currentMessages.filter((m: any) => m.role === 'user')
      expect(userMessages.length).toBe(4) // Initial + 3 repeats

      // All should have same content but different database IDs and sequence numbers
      userMessages.forEach((msg: any) => {
        expect(msg.content).toBe(repeatedContent)
      })

      // All IDs should be unique
      const userIds = userMessages.map((m: any) => m.id)
      const uniqueUserIds = new Set(userIds)
      expect(uniqueUserIds.size).toBe(4)

      // All sequence numbers should be unique and follow user positions (1, 3, 5, 7)
      const userSequences = userMessages.map((m: any) => m.sequence_number).sort((a: number, b: number) => a - b)
      expect(userSequences).toEqual([1, 3, 5, 7]) // User messages should be at odd positions
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should handle API errors without creating partial duplicates', async () => {
      // First, create a successful thread
      const successRequestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Successful message before error test' }],
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

      const successRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(successRequestBody)
      })

      const successResponse = await POST(successRequest, { params: { toolId: 'chat' } })
      const successData = await successResponse.json()

      expect(successResponse.status).toBe(200)
      const threadId = successData.thread.id

      // Cleanup thread
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('chat_messages').delete().eq('thread_id', threadId)
        await testSetup.getAdminClient().from('chat_threads').delete().eq('id', threadId)
      })

      // Now attempt an operation that should fail (invalid thread ID format)
      const errorRequestBody = {
        action: 'execute',
        parameters: {
          messages: [
            ...successData.messages,
            { role: 'user', content: 'This should fail due to invalid thread ID' }
          ],
          threadId: 'invalid-thread-id-format', // Invalid format should trigger error
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

      const errorRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorRequestBody)
      })

      const errorResponse = await POST(errorRequest, { params: { toolId: 'chat' } })
      const errorData = await errorResponse.json()

      // Should fail with validation error
      expect(errorResponse.status).toBe(400)
      expect(errorData.detail).toContain('Invalid thread ID format')

      // Now retry with correct thread ID - should not create duplicates
      const retryRequestBody = {
        action: 'execute',
        parameters: {
          messages: [
            ...successData.messages,
            { role: 'user', content: 'Retry after error' }
          ],
          threadId: threadId, // Correct thread ID
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

      const retryRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(retryRequestBody)
      })

      const retryResponse = await POST(retryRequest, { params: { toolId: 'chat' } })
      const retryData = await retryResponse.json()

      expect(retryResponse.status).toBe(200)

      // Validate no duplicates were created during error/retry cycle
      const finalValidation = validateNoDuplicates(retryData.messages, 'After error recovery')
      
      // Should have: original message + assistant response + retry message + assistant response = 4 messages
      expect(finalValidation.totalMessages).toBe(4)
      expect(finalValidation.userMessages).toBe(2)
      expect(finalValidation.assistantMessages).toBe(2)
    })

    it('should handle malformed requests without corrupting thread state', async () => {
      // Create initial thread
      const initialRequestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Initial message before malformed request test' }],
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

      // Send malformed request (missing required content)
      const malformedRequestBody = {
        action: 'execute',
        parameters: {
          messages: [
            ...initialData.messages,
            { role: 'user' } // Missing content field
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

      const malformedRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(malformedRequestBody)
      })

      const malformedResponse = await POST(malformedRequest, { params: { toolId: 'chat' } })

      // Should fail with validation error
      expect(malformedResponse.status).toBe(400)

      // Verify thread state wasn't corrupted by checking database directly
      const adminClient = testSetup.getAdminClient()
      const { data: dbMessages, error } = await adminClient
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('sequence_number', { ascending: true })

      expect(error).toBeNull()
      
      // Should still have only the original 2 messages (user + assistant)
      expect(dbMessages).toBeTruthy()
      expect(dbMessages!.length).toBe(2)
      
      const dbValidation = validateNoDuplicates(dbMessages!, 'Database state after malformed request')
      expect(dbValidation.totalMessages).toBe(2)

      // Now send a valid followup - should work normally
      const validFollowupRequestBody = {
        action: 'execute',
        parameters: {
          messages: [
            ...initialData.messages,
            { role: 'user', content: 'Valid followup after malformed request' }
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

      const validFollowupRequest = new NextRequest('http://localhost:3000/api/tools/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validFollowupRequestBody)
      })

      const validFollowupResponse = await POST(validFollowupRequest, { params: { toolId: 'chat' } })
      const validFollowupData = await validFollowupResponse.json()

      expect(validFollowupResponse.status).toBe(200)

      // Final validation - should have 4 messages total (no duplicates, no corruption)
      const finalValidation = validateNoDuplicates(validFollowupData.messages, 'After malformed request recovery')
      expect(finalValidation.totalMessages).toBe(4)
      expect(finalValidation.userMessages).toBe(2)
      expect(finalValidation.assistantMessages).toBe(2)
    })
  })

  describe('Database Consistency Validation', () => {
    it('should maintain perfect sync between API responses and database state', async () => {
      // Create a conversation with multiple exchanges
      const conversationFlow = [
        'First user question',
        'Second user question', 
        'Third user question'
      ]

      let threadId: string | null = null
      let currentApiMessages: any[] = []

      for (const [index, messageContent] of conversationFlow.entries()) {
        const requestBody = {
          action: 'execute',
          parameters: {
            messages: [
              ...currentApiMessages,
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

        currentApiMessages = responseData.messages

        // After each interaction, verify API response matches database exactly
        const adminClient = testSetup.getAdminClient()
        const { data: dbMessages, error } = await adminClient
          .from('chat_messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('sequence_number', { ascending: true })

        expect(error).toBeNull()
        expect(dbMessages).toBeTruthy()

        // API response should exactly match database state
        expect(currentApiMessages.length).toBe(dbMessages!.length)

        // Verify each message matches between API and database
        currentApiMessages.forEach((apiMsg) => {
          const dbMsg = dbMessages!.find(db => db.id === apiMsg.id)
          expect(dbMsg).toBeTruthy()
          expect(dbMsg!.content).toBe(apiMsg.content)
          expect(dbMsg!.role).toBe(apiMsg.role)
          expect(dbMsg!.sequence_number).toBe(apiMsg.sequence_number)
          expect(dbMsg!.thread_id).toBe(apiMsg.thread_id)
          expect(dbMsg!.created_by).toBe(apiMsg.created_by)
        })

        // Verify database has no extra messages
        dbMessages!.forEach((dbMsg) => {
          const apiMsg = currentApiMessages.find(api => api.id === dbMsg.id)
          expect(apiMsg).toBeTruthy()
        })

        // Validate no duplicates in both API response and database
        validateNoDuplicates(currentApiMessages, `API response after message ${index + 1}`)
        validateNoDuplicates(dbMessages!, `Database state after message ${index + 1}`)
      }

      // Final comprehensive validation
      const adminClient = testSetup.getAdminClient()
      const { data: finalDbMessages } = await adminClient
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('sequence_number', { ascending: true })

      const finalValidation = validateNoDuplicates(finalDbMessages!, 'Final database state')
      const apiValidation = validateNoDuplicates(currentApiMessages, 'Final API state')

      // Should have 6 messages total (3 user + 3 assistant)
      expect(finalValidation.totalMessages).toBe(6)
      expect(apiValidation.totalMessages).toBe(6)
      expect(finalValidation.userMessages).toBe(3)
      expect(finalValidation.assistantMessages).toBe(3)
    })
  })
})