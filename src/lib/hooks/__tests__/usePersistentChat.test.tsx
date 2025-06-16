/**
 * @jest-environment jsdom
 */

import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { usePersistentChat } from '../usePersistentChat'
import { createClient } from '@/lib/supabase/client'
import { ChatService } from '@/lib/services/database/chat'
import type { ChatThread, ChatMessage } from '@/lib/types/database'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

jest.mock('@/lib/services/database/chat', () => ({
  ChatService: jest.fn()
}))

jest.mock('@assistant-ui/react', () => ({
  useLocalRuntime: jest.fn((adapter) => ({
    thread: {
      messages: [],
      isRunning: false
    },
    composer: {
      send: jest.fn(),
      text: '',
      setText: jest.fn()
    },
    adapter
  }))
}))

// Mock global fetch
global.fetch = jest.fn()

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('usePersistentChat', () => {
  let mockChatService: jest.Mocked<ChatService>
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock ChatService instance
    mockChatService = {
      getThread: jest.fn(),
      listThreadsByDocument: jest.fn(),
      getThreadMessages: jest.fn(),
      createThread: jest.fn(),
      addMessage: jest.fn()
    } as any

    // Mock Supabase client
    mockSupabaseClient = {}
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    
    // Mock ChatService constructor
    ;(ChatService as jest.MockedClass<typeof ChatService>).mockImplementation(() => mockChatService)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should start with isLoaded = true to avoid hanging loading state', () => {
      const { result } = renderHook(() => 
        usePersistentChat({
          documentId: 'doc-123',
          documentContext: 'Test context'
        })
      )

      expect(result.current.isLoaded).toBe(true)
      expect(result.current.threadId).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.isRefreshing).toBe(false)
    })
  })

  describe('Loading Messages', () => {
    it('should load existing thread messages for a document', async () => {
      const mockThread: Partial<ChatThread> = {
        id: 'thread-123',
        document_id: 'doc-123',
        created_at: new Date().toISOString()
      }

      const mockMessages: Partial<ChatMessage>[] = [
        {
          id: 'msg-1',
          thread_id: 'thread-123',
          role: 'user',
          content: 'Hello',
          created_at: new Date().toISOString()
        },
        {
          id: 'msg-2',
          thread_id: 'thread-123',
          role: 'assistant',
          content: 'Hi there!',
          created_at: new Date().toISOString()
        }
      ]

      mockChatService.listThreadsByDocument.mockResolvedValue([mockThread as ChatThread])
      mockChatService.getThreadMessages.mockResolvedValue(mockMessages as ChatMessage[])

      const { result } = renderHook(() => 
        usePersistentChat({
          documentId: 'doc-123',
          documentContext: 'Test context'
        })
      )

      // Wait for async loading to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(mockChatService.listThreadsByDocument).toHaveBeenCalledWith('doc-123', 1)
      expect(mockChatService.getThreadMessages).toHaveBeenCalledWith('thread-123')
      expect(result.current.threadId).toBe('thread-123')
    })

    it('should load specific conversation from URL if provided', async () => {
      const mockThread: Partial<ChatThread> = {
        id: 'specific-thread-123',
        document_id: 'doc-123',
        created_at: new Date().toISOString()
      }

      mockChatService.getThread.mockResolvedValue(mockThread as ChatThread)
      mockChatService.getThreadMessages.mockResolvedValue([])

      const { result } = renderHook(() => 
        usePersistentChat({
          documentId: 'doc-123',
          documentContext: 'Test context',
          conversationId: 'specific-thread-123'
        })
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(mockChatService.getThread).toHaveBeenCalledWith('specific-thread-123')
      expect(result.current.threadId).toBe('specific-thread-123')
    })

    it('should handle error when loading messages fails', async () => {
      mockChatService.listThreadsByDocument.mockRejectedValue(new Error('Database error'))

      const { result } = renderHook(() => 
        usePersistentChat({
          documentId: 'doc-123',
          documentContext: 'Test context'
        })
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(result.current.error).toContain('Failed to load chat history')
      expect(result.current.threadId).toBeNull()
    })
  })

  describe('Sending Messages', () => {
    it('should send message to API and save to database', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'AI response',
          threadId: 'new-thread-123',
          aiCallId: 'ai-call-123'
        })
      } as Response)

      const { result } = renderHook(() => 
        usePersistentChat({
          documentId: 'doc-123',
          documentContext: 'Test context'
        })
      )

      // Access the chat model adapter
      const adapter = result.current.runtime.adapter

      // Simulate sending a message
      await act(async () => {
        const response = await adapter.run({
          messages: [
            { role: 'user', content: 'Test message' }
          ],
          abortSignal: new AbortController().signal
        })
        
        expect(response.content[0]).toEqual({
          type: 'text',
          text: 'AI response'
        })
      })

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: 'Test context',
          documentId: 'doc-123'
        }),
        signal: expect.any(AbortSignal)
      })

      // Verify messages were saved
      expect(mockChatService.addMessage).toHaveBeenCalledTimes(2) // User and assistant messages
    })

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Rate limit exceeded'
        })
      } as Response)

      const { result } = renderHook(() => 
        usePersistentChat({
          documentId: 'doc-123',
          documentContext: 'Test context'
        })
      )

      const adapter = result.current.runtime.adapter

      await act(async () => {
        const response = await adapter.run({
          messages: [{ role: 'user', content: 'Test message' }],
          abortSignal: new AbortController().signal
        })
        
        expect(response.content[0].text).toContain('Error: Rate limit exceeded')
      })
    })

    it('should handle network errors', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => 
        usePersistentChat({
          documentId: 'doc-123',
          documentContext: 'Test context'
        })
      )

      const adapter = result.current.runtime.adapter

      await act(async () => {
        const response = await adapter.run({
          messages: [{ role: 'user', content: 'Test message' }],
          abortSignal: new AbortController().signal
        })
        
        expect(response.content[0].text).toContain('Network error')
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('should refresh messages when requested', async () => {
      const mockThread: Partial<ChatThread> = {
        id: 'thread-123',
        document_id: 'doc-123',
        created_at: new Date().toISOString()
      }

      mockChatService.listThreadsByDocument.mockResolvedValue([mockThread as ChatThread])
      mockChatService.getThreadMessages.mockResolvedValue([])

      const { result } = renderHook(() => 
        usePersistentChat({
          documentId: 'doc-123',
          documentContext: 'Test context'
        })
      )

      // Clear initial calls
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      jest.clearAllMocks()

      // Trigger refresh
      await act(async () => {
        await result.current.refreshMessages()
      })

      expect(result.current.isRefreshing).toBe(false)
      expect(mockChatService.listThreadsByDocument).toHaveBeenCalledWith('doc-123', 1)
    })
  })

  describe('Document Changes', () => {
    it('should reset state when document ID changes', async () => {
      const { result, rerender } = renderHook(
        ({ documentId, documentContext }) => 
          usePersistentChat({ documentId, documentContext }),
        {
          initialProps: {
            documentId: 'doc-123',
            documentContext: 'Test context'
          }
        }
      )

      // Load initial document
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Change document
      rerender({
        documentId: 'doc-456',
        documentContext: 'New context'
      })

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(mockChatService.listThreadsByDocument).toHaveBeenLastCalledWith('doc-456', 1)
    })

    it('should handle missing documentId', () => {
      const { result } = renderHook(() => 
        usePersistentChat({
          documentId: '',
          documentContext: 'Test context'
        })
      )

      expect(result.current.threadId).toBeNull()
      expect(mockChatService.listThreadsByDocument).not.toHaveBeenCalled()
    })
  })
})