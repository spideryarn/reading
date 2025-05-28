import { renderHook, act } from '@testing-library/react';
import { useChatRuntime } from '../useChatRuntime';
import { useLocalRuntime } from '@assistant-ui/react';

// Mock @assistant-ui/react
jest.mock('@assistant-ui/react', () => ({
  ...jest.requireActual('@assistant-ui/react'), // Import and retain default behavior
  useLocalRuntime: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useChatRuntime', () => {
  const mockUseLocalRuntime = useLocalRuntime as jest.Mock;
  const mockFetch = global.fetch as jest.Mock;

  beforeEach(() => {
    // Clear mocks before each test
    mockUseLocalRuntime.mockClear();
    mockFetch.mockClear();
  });

  it('should call useLocalRuntime with a chatModelAdapter', () => {
    const documentContext = 'Test document context';
    renderHook(() => useChatRuntime({ documentContext }));

    expect(mockUseLocalRuntime).toHaveBeenCalledTimes(1);
    expect(mockUseLocalRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        run: expect.any(Function),
      })
    );
  });

  describe('chatModelAdapter', () => {
    let adapterRun: Function;
    const documentContext = 'Test document context';

    beforeEach(() => {
      // Render the hook to get access to the adapter's run function
      renderHook(() => useChatRuntime({ documentContext }));
      const adapter = mockUseLocalRuntime.mock.calls[0][0];
      adapterRun = adapter.run;
    });

    it('should call fetch with the correct parameters on successful response', async () => {
      const messages = [{ id: '1', role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] }];
      const mockResponse = { response: 'Hi there' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await act(async () => {
        await adapterRun({ messages });
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello',
          documentContext,
        }),
        signal: undefined, // AbortSignal is undefined if not passed
      });
    });

    it('should return the correct content on successful API call', async () => {
      const messages = [{ id: '1', role: 'user' as const, content: [{ type: 'text' as const, text: 'Test message' }] }];
      const mockApiResponse = { response: 'Test response' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      let result;
      await act(async () => {
        result = await adapterRun({ messages });
      });

      expect(result).toEqual({
        content: [
          {
            type: "text" as const,
            text: 'Test response',
          },
        ],
      });
    });

    it('should handle API error and return an error message', async () => {
      const messages = [{ id: '1', role: 'user' as const, content: [{ type: 'text' as const, text: 'Error test' }] }];
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      let result;
      await act(async () => {
        result = await adapterRun({ messages });
      });

      expect(result).toEqual({
        content: [
          {
            type: "text" as const,
            text: 'Sorry, an error occurred: HTTP error 500',
          },
        ],
      });
    });

    it('should use abortSignal if provided', async () => {
      const messages = [{ id: '1', role: 'user' as const, content: [{ type: 'text' as const, text: 'Abort test' }] }];
      const abortController = new AbortController();
      const signal = abortController.signal;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Aborted response' }),
      });

      await act(async () => {
        await adapterRun({ messages, abortSignal: signal });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/chat', 
        expect.objectContaining({
          signal: signal,
        })
      );
    });
  });
}); 