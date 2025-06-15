import { POST } from '../chat/route';
import { generateText } from 'ai';
import { getModel } from '@/lib/services/llm-provider';
import { getModelConfig, getModelForAICall } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';
import { AiCallService } from '@/lib/services/database/ai-calls';

// Mock dependencies
jest.mock('ai');
jest.mock('@/lib/services/llm-provider');
jest.mock('@/lib/config');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/services/database/ai-calls');

// Mock NextRequest and NextResponse
import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url: string, init: Record<string, unknown> = {}) {
      this.url = url;
      this.method = init.method as string || 'GET';
      this.body = init.body;
    }
    
    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }
  },
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => ({
      json: async () => data,
      status: init?.status || 200,
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
    }),
  },
}));

describe('Chat API Route with Persistence', () => {
  const mockGenerateText = generateText as jest.Mock;
  const mockGetModel = getModel as jest.Mock;
  const mockGetModelConfig = getModelConfig as jest.Mock;
  const mockGetModelForAICall = getModelForAICall as jest.Mock;
  const mockCreateClient = createClient as jest.Mock;
  const mockAiCallService = {
    create: jest.fn(),
  };

  const mockSupabaseClient = {};
  const mockModel = { modelId: 'test-model' };
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174000';
  const mockDocumentContext = 'Test document context';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGetModel.mockReturnValue(mockModel);
    mockGetModelConfig.mockReturnValue({
      provider: 'anthropic',
      modelId: 'claude-3-5-haiku-20241022',
    });
    mockGetModelForAICall.mockReturnValue({
      modelString: 'anthropic:claude-3-5-haiku:20241022',
      config: {
        provider: 'anthropic',
        modelName: 'claude-3-5-haiku',
        version: '20241022',
        thinking: false,
      }
    });
    mockCreateClient.mockResolvedValue(mockSupabaseClient);
    (AiCallService as jest.Mock).mockImplementation(() => mockAiCallService);
    mockGenerateText.mockResolvedValue({
      text: 'Test AI response',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
  });

  describe('Basic Functionality', () => {
    it('should process chat request successfully', async () => {
      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBe('Test AI response');
      expect(data.timestamp).toBeDefined();
    });

    it('should validate request input', async () => {
      const mockRequest = {
        json: async () => ({
          // Missing required fields
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request format');
      expect(data.details).toBeDefined();
    });
  });

  describe('Thread Management', () => {
    it('should accept and process thread ID', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBe('Test AI response');
      
      // Verify thread ID was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Chat API] Processing conversation:'),
        expect.objectContaining({
          threadId: mockThreadId,
        })
      );
    });

    it('should work without thread ID', async () => {
      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBe('Test AI response');
      expect(data.aiCallId).toBeNull();
    });
  });

  describe('AI Call Tracking', () => {
    it('should track AI call when thread ID is provided', async () => {
      const mockAiCallId = '456e7890-e89b-12d3-a456-426614174000';
      mockAiCallService.create.mockResolvedValue({ id: mockAiCallId });

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.aiCallId).toBe(mockAiCallId);
      
      expect(mockAiCallService.create).toHaveBeenCalledWith({
        provider: 'anthropic',
        modelId: 'claude-3-5-haiku-20241022',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        requestData: {
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext + '...',
          threadId: mockThreadId,
        },
        responseData: { response: 'Test AI response' },
      });
    });

    it('should not track AI call without thread ID', async () => {
      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.aiCallId).toBeNull();
      expect(mockAiCallService.create).not.toHaveBeenCalled();
    });

    it('should continue on AI call tracking failure', async () => {
      mockAiCallService.create.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'warn');

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBe('Test AI response');
      expect(data.aiCallId).toBeNull();
      
      // Verify warning was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Chat API] Failed to track AI call:'),
        expect.any(Error)
      );
    });

    it('should handle missing token usage data', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test AI response',
        usage: null,
      });

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      await response.json();

      expect(response.status).toBe(200);
      expect(mockAiCallService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
        })
      );
    });
  });

  describe('System Prompt and Context', () => {
    it('should include document context in system prompt', async () => {
      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'What is this about?' }],
          documentContext: 'This document is about AI and machine learning.',
        }),
      };

      await POST(mockRequest as unknown as NextRequest);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('This document is about AI and machine learning.'),
            }),
          ]),
        })
      );
    });

    it('should handle missing document context', async () => {
      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: '', // Empty string instead of null
        }),
      };

      await POST(mockRequest as unknown as NextRequest);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('No document context provided.'),
            }),
          ]),
        })
      );
    });
  });

  describe('Multi-message Conversations', () => {
    it('should handle conversation with multiple messages', async () => {
      const conversationMessages = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Follow-up question' },
      ];

      const mockRequest = {
        json: async () => ({
          messages: conversationMessages,
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      };

      await POST(mockRequest as unknown as NextRequest);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({ role: 'system' }),
            ...conversationMessages,
          ],
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API key errors', async () => {
      mockGenerateText.mockRejectedValue(new Error('401 Unauthorized: Invalid API key'));

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('API configuration error');
      expect(data.details).toContain('API key is missing or invalid');
      expect(data.code).toBe('API_KEY_ERROR');
    });

    it('should handle rate limit errors', async () => {
      mockGenerateText.mockRejectedValue(new Error('429: Rate limit exceeded'));

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should handle model errors', async () => {
      mockGenerateText.mockRejectedValue(new Error('Model claude-3 not found'));

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Model configuration error');
      expect(data.code).toBe('MODEL_ERROR');
    });

    it('should handle network errors', async () => {
      mockGenerateText.mockRejectedValue(new Error('fetch failed: Network error'));

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Network error');
      expect(data.code).toBe('NETWORK_ERROR');
    });

    it('should handle generic errors', async () => {
      mockGenerateText.mockRejectedValue(new Error('Something went wrong'));

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process chat message');
      expect(data.details).toBe('Something went wrong');
      expect(data.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle non-Error exceptions', async () => {
      mockGenerateText.mockRejectedValue('String error');

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      const response = await POST(mockRequest as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process chat message');
      expect(data.details).toBe('An unexpected error occurred');
    });
  });

  describe('Logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log request processing', async () => {
      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      };

      await POST(mockRequest as unknown as NextRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Chat API] Processing conversation:',
        expect.objectContaining({
          messageCount: 1,
          documentContextLength: mockDocumentContext.length,
          threadId: mockThreadId,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log successful response', async () => {
      const mockAiCallId = '789e1234-e89b-12d3-a456-426614174000';
      mockAiCallService.create.mockResolvedValue({ id: mockAiCallId });

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      };

      await POST(mockRequest as unknown as NextRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Chat API] Response generated successfully:',
        expect.objectContaining({
          responseLength: 'Test AI response'.length,
          threadId: mockThreadId,
          aiCallId: mockAiCallId,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log AI call tracking', async () => {
      const mockAiCallId = '987e6543-e89b-12d3-a456-426614174000';
      mockAiCallService.create.mockResolvedValue({ id: mockAiCallId });

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
          threadId: mockThreadId,
        }),
      };

      await POST(mockRequest as unknown as NextRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Chat API] AI call tracked:',
        expect.objectContaining({
          aiCallId: mockAiCallId,
          threadId: mockThreadId,
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
        })
      );
    });
  });

  describe('Configuration', () => {
    it('should use configured model', async () => {
      const customModel = { modelId: 'custom-model' };
      mockGetModel.mockReturnValue(customModel);

      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      await POST(mockRequest as unknown as NextRequest);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: customModel,
        })
      );
    });

    it('should use configured temperature and max tokens', async () => {
      const mockRequest = {
        json: async () => ({
          messages: [{ role: 'user', content: 'Test message' }],
          documentContext: mockDocumentContext,
        }),
      };

      await POST(mockRequest as unknown as NextRequest);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0,
          maxTokens: expect.any(Number),
        })
      );
    });
  });
});