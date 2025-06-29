/**
 * Integration tests for enhanced chat content validation
 * 
 * Tests the o3 AI recommendations implementation:
 * - User messages: Reject empty content (strict validation)  
 * - Assistant messages: Allow empty content for streaming/tool-only scenarios
 * - Enhanced error handling to eliminate "refresh to fix" scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST } from '../[toolId]/route'
import { RealRLSTestSetup } from '@/lib/services/database/__tests__/rls-test-helpers'
import { generateCorrelationId } from '@/lib/services/logger'
import { TEST_USER_IDS } from '@/lib/testing/rls-test-context'
import jwt from 'jsonwebtoken'
// Import to ensure tool registry is initialized
import '@/lib/tools/registry-loader'
// Directly import chat tool to force registration
import '@/lib/tools/implementations/chat'
import { getTool, getAllTools } from '@/lib/tools/registry'

describe('Chat Content Validation', () => {
  let testSetup: RealRLSTestSetup
  let cleanupFunctions: Array<() => Promise<void>>
  let testAuthToken: string

  beforeEach(async () => {
    testSetup = new RealRLSTestSetup()
    cleanupFunctions = []
    
    // Debug: Check tool registry
    const allTools = getAllTools()
    const chatTool = getTool('chat')
    console.log('All tools:', allTools.map(t => t.id))
    console.log('Chat tool found:', !!chatTool)
    
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
  })

  afterEach(async () => {
    if (cleanupFunctions.length > 0) {
      await Promise.all(cleanupFunctions.map(fn => fn()))
    }
    await testSetup.cleanup()
  })

  describe('User Message Validation', () => {
    it('should reject empty user messages with helpful error', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: '' }],
          documentContext: 'Test document',
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

      // Debug logging for unexpected status
      if (response.status !== 400) {
        console.log('Unexpected status:', response.status)
        console.log('Response data:', responseData)
      }

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('empty or contain only whitespace')
      expect(responseData.detail).toContain('Please enter a message')
    })

    it('should reject whitespace-only user messages', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: '   \n\t   ' }],
          documentContext: 'Test document',
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

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('empty or contain only whitespace')
    })

    it('should reject excessively long user messages', async () => {
      // Create content exceeding 50,000 characters
      const longContent = 'A'.repeat(50001)

      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: longContent }],
          documentContext: 'Test document',
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

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('Message content too long')
      expect(responseData.detail).toContain('max 50,000 characters')
    })

    it('should reject user messages with excessively long words', async () => {
      // Create content with a word exceeding 1000 characters
      const longWord = 'A'.repeat(1001)
      const content = `This is a normal sentence with a ${longWord} in it.`

      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content }],
          documentContext: 'Test document',
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

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('excessively long words')
    })

    it('should accept valid user messages', async () => {
      // Create test document first
      const documentData = await testSetup.createTestDocument({
        title: 'Test Document',
        created_by: TEST_USER_IDS.USER_A,
        html_content: '<p>This is test content</p>',
        plaintext_content: 'This is test content'
      })
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('documents').delete().eq('id', documentData.id)
      })

      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Hello, this is a valid message!' }],
          documentContext: 'Test document content',
          documentId: documentData.id,
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
      expect(responseData.thread).toBeDefined()
      expect(responseData.messages).toBeDefined()
      expect(responseData.messages.length).toBeGreaterThanOrEqual(2) // User + assistant

      // Verify user message was trimmed and saved correctly
      const userMessage = responseData.messages.find((m: any) => m.role === 'user')
      expect(userMessage).toBeDefined()
      expect(userMessage.content).toBe('Hello, this is a valid message!')
    })

    it('should trim whitespace from valid user messages', async () => {
      // Create test document first
      const documentData = await testSetup.createTestDocument({
        title: 'Test Document',
        created_by: TEST_USER_IDS.USER_A,
        html_content: '<p>This is test content</p>',
        plaintext_content: 'This is test content'
      })
      cleanupFunctions.push(async () => {
        await testSetup.getAdminClient().from('documents').delete().eq('id', documentData.id)
      })

      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: '  \n  Hello with whitespace!  \n  ' }],
          documentContext: 'Test document content',
          documentId: documentData.id,
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
      
      // Verify user message was trimmed correctly
      const userMessage = responseData.messages.find((m: any) => m.role === 'user')
      expect(userMessage).toBeDefined()
      expect(userMessage.content).toBe('Hello with whitespace!')
    })
  })

  describe('Assistant Message Validation', () => {
    it('should allow empty assistant messages for streaming scenarios', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: '', status: 'streaming' }
          ],
          documentContext: 'Test document',
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

      // Should not fail validation due to empty assistant message
      expect(response.status).not.toBe(400)
    })
  })

  describe('Enhanced Error Handling', () => {
    it('should provide helpful error for invalid thread ID format', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Valid message' }],
          threadId: 'invalid-uuid-format',
          documentContext: 'Test document',
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

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('Invalid thread ID format')
    })

    it('should provide helpful error for invalid document ID format', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Valid message' }],
          documentId: 'invalid-uuid-format',
          documentContext: 'Test document',
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

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('Invalid document ID format')
    })

    it('should provide helpful error for too many messages in conversation', async () => {
      // Create more than 20 messages
      const tooManyMessages = Array.from({ length: 21 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant' as const,
        content: `Message ${i + 1}`
      }))

      const requestBody = {
        action: 'execute',
        parameters: {
          messages: tooManyMessages,
          documentContext: 'Test document',
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

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('Too many messages in conversation')
      expect(responseData.detail).toContain('max 20')
    })

    it('should provide helpful error for excessively long document context', async () => {
      // Create document context exceeding 100,000 characters
      const longContext = 'A'.repeat(100001)

      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'user', content: 'Valid message' }],
          documentContext: longContext,
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

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('Document context too long')
    })
  })

  describe('Schema Validation Edge Cases', () => {
    it('should reject request with no messages', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [],
          documentContext: 'Test document',
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

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('Array must contain at least 1 element(s)')
    })

    it('should reject messages with invalid role', async () => {
      const requestBody = {
        action: 'execute',
        parameters: {
          messages: [{ role: 'invalid', content: 'Valid content' }],
          documentContext: 'Test document',
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

      expect(response.status).toBe(400)
      expect(responseData.detail).toContain('Invalid enum value')
    })
  })
})