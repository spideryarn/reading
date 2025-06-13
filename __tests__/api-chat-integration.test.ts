/**
 * API & Chat Integration Tests
 * 
 * Tests end-to-end API and chat functionality integration.
 * Consolidates glossary API and chat runtime unit tests into
 * integrated workflow scenarios.
 */

import { testApiHandler } from 'next-test-api-route-handler'
import handler from '@/app/api/glossary/route'
import { useChatRuntime } from '@/src/lib/hooks/useChatRuntime'
import { renderHook, waitFor } from '@testing-library/react'

// Mock AI response for consistent testing
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => ({
    chat: jest.fn().mockResolvedValue({
      content: [{ 
        type: 'text', 
        text: JSON.stringify({
          entities: [
            { term: "Machine Learning", definition: "A subset of AI that enables computers to learn without explicit programming" },
            { term: "Neural Network", definition: "Computing system inspired by biological neural networks" }
          ]
        })
      }],
      usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 }
    }))
  }))
}))

// Mock document for testing
const mockDocumentContext = {
  title: 'Introduction to Machine Learning',
  content: 'Machine learning is a subset of artificial intelligence that focuses on neural networks and deep learning algorithms.',
  plaintext: 'Machine learning is a subset of artificial intelligence that focuses on neural networks and deep learning algorithms.'
}

describe('API & Chat Integration', () => {
  describe('Glossary API Workflow', () => {
    it('should extract entities from document content end-to-end', async () => {
      await testApiHandler({
        appHandler: { POST: handler.POST },
        test: async ({ fetch }) => {
          // Test complete glossary extraction workflow
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId: 'test-doc-123',
              content: mockDocumentContext.content,
              title: mockDocumentContext.title
            })
          })

          expect(response.status).toBe(200)
          
          const result = await response.json()
          expect(result).toHaveProperty('entities')
          expect(result.entities).toHaveLength(2)
          
          // Verify extracted entities
          expect(result.entities[0]).toMatchObject({
            term: 'Machine Learning',
            definition: expect.stringContaining('subset of AI')
          })
          
          expect(result.entities[1]).toMatchObject({
            term: 'Neural Network',
            definition: expect.stringContaining('biological neural networks')
          })

          // Verify AI call metadata
          expect(result).toHaveProperty('aiCallId')
          expect(result).toHaveProperty('tokensUsed')
          expect(result.tokensUsed).toBe(250)
        }
      })
    })

    it('should handle API errors gracefully in chat context', async () => {
      // Test error handling when glossary API fails
      await testApiHandler({
        appHandler: { POST: handler.POST },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // Missing required fields to trigger validation error
              documentId: 'test-doc-123'
            })
          })

          expect(response.status).toBe(400)
          
          const error = await response.json()
          expect(error).toHaveProperty('error')
          expect(error.error).toContain('validation')
        }
      })
    })

    it('should integrate with document processing pipeline', async () => {
      await testApiHandler({
        appHandler: { POST: handler.POST },
        test: async ({ fetch }) => {
          // Test with realistic document content
          const complexDocument = {
            documentId: 'complex-doc-456',
            title: 'Advanced Deep Learning Techniques',
            content: `
              <h1>Deep Learning Architecture</h1>
              <p>Convolutional Neural Networks (CNNs) are fundamental to computer vision.</p>
              <h2>Transformer Models</h2>
              <p>The attention mechanism revolutionized natural language processing.</p>
              <p>Generative Adversarial Networks (GANs) enable realistic data generation.</p>
            `
          }

          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(complexDocument)
          })

          expect(response.status).toBe(200)
          
          const result = await response.json()
          expect(result.entities).toBeDefined()
          expect(Array.isArray(result.entities)).toBe(true)
          
          // Should handle complex HTML content
          expect(result.entities.length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Chat Runtime Integration', () => {
    it('should process chat messages with document context', async () => {
      const { result } = renderHook(() => useChatRuntime({
        documentId: 'test-doc-123',
        documentContext: mockDocumentContext.plaintext
      }))

      // Initial state should be ready
      expect(result.current.isLoading).toBe(false)
      expect(result.current.messages).toEqual([])
      expect(result.current.error).toBeNull()

      // Send a message with document context
      const testMessage = "What are the key concepts in this document?"
      
      await waitFor(async () => {
        await result.current.sendMessage(testMessage)
      })

      // Should process message successfully
      expect(result.current.messages).toHaveLength(2) // user + assistant
      expect(result.current.messages[0]).toMatchObject({
        role: 'user',
        content: testMessage
      })
      expect(result.current.messages[1]).toMatchObject({
        role: 'assistant',
        content: expect.any(String)
      })
    })

    it('should handle rate limiting and retries', async () => {
      // Mock rate limit error followed by success
      const mockChatWithRetry = jest.fn()
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValueOnce({
          content: 'Successfully processed after retry',
          usage: { totalTokens: 50 }
        })

      const { result } = renderHook(() => useChatRuntime({
        documentId: 'test-doc-123',
        documentContext: mockDocumentContext.plaintext,
        chatFunction: mockChatWithRetry
      }))

      await waitFor(async () => {
        await result.current.sendMessage("Test retry mechanism")
      })

      // Should handle retry logic
      expect(mockChatWithRetry).toHaveBeenCalledTimes(2)
      expect(result.current.error).toBeNull()
      expect(result.current.messages).toHaveLength(2)
    })

    it('should maintain conversation history with document context', async () => {
      const { result } = renderHook(() => useChatRuntime({
        documentId: 'test-doc-123',
        documentContext: mockDocumentContext.plaintext
      }))

      // Send first message
      await waitFor(async () => {
        await result.current.sendMessage("What is machine learning?")
      })

      expect(result.current.messages).toHaveLength(2)

      // Send follow-up message - should maintain context
      await waitFor(async () => {
        await result.current.sendMessage("Can you explain it more simply?")
      })

      expect(result.current.messages).toHaveLength(4)
      
      // All messages should be preserved
      expect(result.current.messages[0].content).toBe("What is machine learning?")
      expect(result.current.messages[2].content).toBe("Can you explain it more simply?")
      
      // Should include document context in conversation
      expect(result.current.documentContext).toBe(mockDocumentContext.plaintext)
    })
  })

  describe('End-to-End Integration Workflows', () => {
    it('should handle complete document analysis workflow', async () => {
      // Step 1: Extract glossary from document
      await testApiHandler({
        appHandler: { POST: handler.POST },
        test: async ({ fetch }) => {
          const glossaryResponse = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId: 'workflow-test-789',
              title: mockDocumentContext.title,
              content: mockDocumentContext.content
            })
          })

          expect(glossaryResponse.status).toBe(200)
          const glossaryResult = await glossaryResponse.json()
          
          // Step 2: Use glossary results in chat context
          const { result } = renderHook(() => useChatRuntime({
            documentId: 'workflow-test-789',
            documentContext: mockDocumentContext.plaintext,
            glossaryEntities: glossaryResult.entities
          }))

          // Step 3: Ask chat about glossary terms
          await waitFor(async () => {
            await result.current.sendMessage("Tell me about the neural networks mentioned in this document")
          })

          // Should successfully integrate both APIs
          expect(result.current.messages).toHaveLength(2)
          expect(result.current.error).toBeNull()
        }
      })
    })

    it('should handle concurrent API operations', async () => {
      const promises = []

      // Simulate multiple concurrent glossary extractions
      for (let i = 0; i < 3; i++) {
        const promise = testApiHandler({
          appHandler: { POST: handler.POST },
          test: async ({ fetch }) => {
            const response = await fetch({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentId: `concurrent-test-${i}`,
                title: `Document ${i}`,
                content: `Content for document ${i} about machine learning and AI.`
              })
            })
            return response.json()
          }
        })
        promises.push(promise)
      }

      // All requests should complete successfully
      const results = await Promise.all(promises)
      results.forEach(result => {
        expect(result).toHaveProperty('entities')
        expect(Array.isArray(result.entities)).toBe(true)
      })
    })
  })
})