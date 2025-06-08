import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersistentChat } from '../usePersistentChat';
import { createClient } from '@/lib/supabase/client';
import { ChatService } from '@/lib/services/database/chat';
import { AiCallService } from '@/lib/services/database/ai-calls';
import { getModelConfig } from '@/lib/config';
import type { ChatThread, ChatMessage } from '@/lib/types/database';

// Mock dependencies
jest.mock('@/lib/supabase/client');
jest.mock('@/lib/services/database/chat');
jest.mock('@/lib/services/database/ai-calls');
jest.mock('@/lib/config');
jest.mock('@assistant-ui/react', () => ({
  useLocalRuntime: jest.fn((adapter) => ({
    // Mock runtime object
    adapter,
    messages: [],
    append: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('usePersistentChat', () => {
  const mockSupabaseClient = {};
  const mockChatService = {
    listThreadsByDocument: jest.fn(),
    createThread: jest.fn(),
    getThreadMessages: jest.fn(),
    addMessage: jest.fn(),
  };
  const mockAiCallService = {
    getModelUuidByProviderAndId: jest.fn(),
  };

  const mockDocumentId = 'test-document-id';
  const mockDocumentContext = 'Test document context';
  const mockThreadId = 'test-thread-id';
  const mockModelUuid = 'test-model-uuid';
  const mockSystemUserId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    (ChatService as jest.Mock).mockImplementation(() => mockChatService);
    (AiCallService as jest.Mock).mockImplementation(() => mockAiCallService);
    (getModelConfig as jest.Mock).mockReturnValue({
      provider: 'anthropic',
      modelId: 'claude-3-5-haiku-20241022',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Test response', aiCallId: 'test-ai-call-id' }),
    });
  });

  describe('Service Initialization', () => {
    it('should initialize services on mount', async () => {
      mockAiCallService.getModelUuidByProviderAndId.mockResolvedValue(mockModelUuid);
      mockChatService.listThreadsByDocument.mockResolvedValue([]);

      renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(createClient).toHaveBeenCalled();
        expect(ChatService).toHaveBeenCalledWith(mockSupabaseClient);
        expect(AiCallService).toHaveBeenCalledWith(mockSupabaseClient);
      });
    });

    it('should handle model lookup failure gracefully', async () => {
      mockAiCallService.getModelUuidByProviderAndId.mockRejectedValue(new Error('Model not found'));
      mockChatService.listThreadsByDocument.mockResolvedValue([]);

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
        expect(result.current.error).toBeNull(); // Should not set error state
      });
    });

    it('should handle service initialization failure', async () => {
      (createClient as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create client');
      });

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to initialize chat persistence');
      });
    });
  });

  describe('Thread Management', () => {
    beforeEach(() => {
      mockAiCallService.getModelUuidByProviderAndId.mockResolvedValue(mockModelUuid);
    });

    it('should find existing thread for document', async () => {
      const existingThread: ChatThread = {
        id: mockThreadId,
        document_id: mockDocumentId,
        model_id: mockModelUuid,
        title: 'Existing Thread',
        created_by: mockSystemUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra: {},
      };

      mockChatService.listThreadsByDocument.mockResolvedValue([existingThread]);
      mockChatService.getThreadMessages.mockResolvedValue([]);

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
        expect(result.current.threadId).toBe(mockThreadId);
        expect(mockChatService.listThreadsByDocument).toHaveBeenCalledWith(mockDocumentId, 1);
      });
    });

    it('should handle no existing thread', async () => {
      mockChatService.listThreadsByDocument.mockResolvedValue([]);

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
        expect(result.current.threadId).toBeNull();
      });
    });

    it('should create thread on first message', async () => {
      mockChatService.listThreadsByDocument.mockResolvedValue([]);
      mockChatService.createThread.mockResolvedValue({
        id: mockThreadId,
        document_id: mockDocumentId,
        model_id: mockModelUuid,
        title: 'What is the main topic?',
        created_by: mockSystemUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra: {},
      });

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Simulate sending first message
      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'What is the main topic of this document?' }],
          }],
        });
      });

      expect(mockChatService.createThread).toHaveBeenCalledWith({
        documentId: mockDocumentId,
        modelId: mockModelUuid,
        title: 'What is the main topic of this document?',
        userId: mockSystemUserId,
      });
    });

    it('should generate thread title with truncation', async () => {
      const longMessage = 'This is a very long message that exceeds the fifty character limit for thread titles and should be truncated';
      
      mockChatService.listThreadsByDocument.mockResolvedValue([]);
      mockChatService.createThread.mockResolvedValue({
        id: mockThreadId,
        document_id: mockDocumentId,
        model_id: mockModelUuid,
        title: 'This is a very long message that exceeds the...',
        created_by: mockSystemUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra: {},
      });

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: longMessage }],
          }],
        });
      });

      const createThreadCall = mockChatService.createThread.mock.calls[0][0];
      expect(createThreadCall.title).toHaveLength(47); // 44 chars + '...'
      expect(createThreadCall.title.endsWith('...')).toBe(true);
    });

    it('should handle thread creation failure', async () => {
      mockChatService.listThreadsByDocument.mockResolvedValue([]);
      mockChatService.createThread.mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      let response;
      await act(async () => {
        response = await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'Test message' }],
          }],
        });
      });

      // Should continue without persistence
      expect(response).toBeDefined();
      expect(result.current.error).toContain('Failed to create chat thread');
    });
  });

  describe('Message Persistence', () => {
    beforeEach(() => {
      mockAiCallService.getModelUuidByProviderAndId.mockResolvedValue(mockModelUuid);
      mockChatService.listThreadsByDocument.mockResolvedValue([{
        id: mockThreadId,
        document_id: mockDocumentId,
        model_id: mockModelUuid,
        title: 'Existing Thread',
        created_by: mockSystemUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra: {},
      }]);
      mockChatService.getThreadMessages.mockResolvedValue([]);
    });

    it('should save user message before API call', async () => {
      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'Test user message' }],
          }],
        });
      });

      expect(mockChatService.addMessage).toHaveBeenCalledWith({
        threadId: mockThreadId,
        role: 'user',
        content: 'Test user message',
      });
    });

    it('should save assistant response after API call', async () => {
      const mockResponse = 'This is the AI response';
      const mockAiCallId = 'test-ai-call-id';
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ response: mockResponse, aiCallId: mockAiCallId }),
      });

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'Test message' }],
          }],
        });
      });

      expect(mockChatService.addMessage).toHaveBeenCalledWith({
        threadId: mockThreadId,
        role: 'assistant',
        content: mockResponse,
        aiCallId: mockAiCallId,
      });
    });

    it('should continue on message save failure without breaking conversation', async () => {
      mockChatService.addMessage.mockRejectedValueOnce(new Error('Database error'));

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      let response;
      await act(async () => {
        response = await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'Test message' }],
          }],
        });
      });

      // Should still get response despite save failure
      expect(response.content[0].text).toBe('Test response');
      expect(result.current.error).toBeNull(); // Should not set error state
    });
  });

  describe('Conversation Loading', () => {
    beforeEach(() => {
      mockAiCallService.getModelUuidByProviderAndId.mockResolvedValue(mockModelUuid);
    });

    it('should load existing conversation history', async () => {
      const existingMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          thread_id: mockThreadId,
          sequence_number: 1,
          role: 'user',
          content: 'First message',
          ai_call_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          extra: {},
        },
        {
          id: 'msg-2',
          thread_id: mockThreadId,
          sequence_number: 2,
          role: 'assistant',
          content: 'First response',
          ai_call_id: 'call-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          extra: {},
        },
      ];

      mockChatService.listThreadsByDocument.mockResolvedValue([{
        id: mockThreadId,
        document_id: mockDocumentId,
        model_id: mockModelUuid,
        title: 'Existing Thread',
        created_by: mockSystemUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra: {},
      }]);
      mockChatService.getThreadMessages.mockResolvedValue(existingMessages);

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
        expect(mockChatService.getThreadMessages).toHaveBeenCalledWith(mockThreadId);
      });
    });

    it('should handle conversation loading failure', async () => {
      mockChatService.listThreadsByDocument.mockResolvedValue([{
        id: mockThreadId,
        document_id: mockDocumentId,
        model_id: mockModelUuid,
        title: 'Existing Thread',
        created_by: mockSystemUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra: {},
      }]);
      mockChatService.getThreadMessages.mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
        expect(result.current.error).toContain('Failed to load conversation');
      });
    });
  });

  describe('API Integration', () => {
    beforeEach(() => {
      mockAiCallService.getModelUuidByProviderAndId.mockResolvedValue(mockModelUuid);
      mockChatService.listThreadsByDocument.mockResolvedValue([{
        id: mockThreadId,
        document_id: mockDocumentId,
        model_id: mockModelUuid,
        title: 'Existing Thread',
        created_by: mockSystemUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra: {},
      }]);
      mockChatService.getThreadMessages.mockResolvedValue([]);
    });

    it('should pass thread ID to API', async () => {
      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'Test message' }],
          }],
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      }));
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ 
          error: 'Internal Server Error',
          details: 'Something went wrong',
          code: 'SERVER_ERROR',
        }),
      });

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      let response;
      await act(async () => {
        response = await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'Test message' }],
          }],
        });
      });

      expect(response.content[0].text).toContain('❌ Error: Internal Server Error');
      expect(response.content[0].text).toContain('Something went wrong');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      let response;
      await act(async () => {
        response = await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'Test message' }],
          }],
        });
      });

      expect(response.content[0].text).toContain('❌ Error: Network connection failed');
    });

    it('should support abort signal', async () => {
      const abortController = new AbortController();
      
      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'Test message' }],
          }],
          abortSignal: abortController.signal,
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        signal: abortController.signal,
      }));
    });
  });

  describe('Multi-message Conversations', () => {
    beforeEach(() => {
      mockAiCallService.getModelUuidByProviderAndId.mockResolvedValue(mockModelUuid);
      mockChatService.listThreadsByDocument.mockResolvedValue([{
        id: mockThreadId,
        document_id: mockDocumentId,
        model_id: mockModelUuid,
        title: 'Existing Thread',
        created_by: mockSystemUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra: {},
      }]);
      mockChatService.getThreadMessages.mockResolvedValue([]);
    });

    it('should handle conversation with multiple messages', async () => {
      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [
            {
              id: '1',
              role: 'user' as const,
              content: [{ type: 'text' as const, text: 'First message' }],
            },
            {
              id: '2',
              role: 'assistant' as const,
              content: [{ type: 'text' as const, text: 'First response' }],
            },
            {
              id: '3',
              role: 'user' as const,
              content: [{ type: 'text' as const, text: 'Second message' }],
            },
          ],
        });
      });

      // Should only save the latest user message
      expect(mockChatService.addMessage).toHaveBeenCalledWith({
        threadId: mockThreadId,
        role: 'user',
        content: 'Second message',
      });

      // API should receive full conversation history
      expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'First response' },
            { role: 'user', content: 'Second message' },
          ],
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      }));
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockAiCallService.getModelUuidByProviderAndId.mockResolvedValue(mockModelUuid);
    });

    it('should handle empty message content', async () => {
      mockChatService.listThreadsByDocument.mockResolvedValue([]);

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [],
          }],
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        body: JSON.stringify({
          messages: [{ role: 'user', content: '' }],
          documentContext: mockDocumentContext,
          threadId: null,
        }),
      }));
    });

    it('should extract first text content from multi-part messages', async () => {
      mockChatService.listThreadsByDocument.mockResolvedValue([]);

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [
              { type: 'text' as const, text: 'First part' },
              { type: 'text' as const, text: 'Second part' },
            ],
          }],
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'First part' }],
          documentContext: mockDocumentContext,
          threadId: null,
        }),
      }));
    });

    it('should not create thread without model ID', async () => {
      // Simulate model lookup failure
      mockAiCallService.getModelUuidByProviderAndId.mockRejectedValue(new Error('Model not found'));
      mockChatService.listThreadsByDocument.mockResolvedValue([]);

      const { result } = renderHook(() => 
        usePersistentChat({ documentId: mockDocumentId, documentContext: mockDocumentContext })
      );

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const adapter = result.current.runtime.adapter;
      await act(async () => {
        await adapter.run({
          messages: [{
            id: '1',
            role: 'user' as const,
            content: [{ type: 'text' as const, text: 'Test message' }],
          }],
        });
      });

      // Should not attempt to create thread
      expect(mockChatService.createThread).not.toHaveBeenCalled();
      
      // Should still make API call without thread ID
      expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
          threadId: null,
        }),
      }));
    });
  });
});