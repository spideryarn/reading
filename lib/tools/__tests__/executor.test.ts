/**
 * Tests for the tool execution framework
 * 
 * This test suite verifies that the executor correctly handles both local
 * and server execution paths, error handling, and integration with the registry.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { executeTool, getErrorMessage, isRetryableError } from '../executor/executor'
import { 
  ToolNotFoundError, 
  ToolValidationError, 
  ToolTimeoutError,
  ToolAuthenticationError,
  ToolServerError,
  ToolCancelledError
} from '../executor/types'
import { resetRegistryForTests, registerTool } from '../registry'

// Mock fetch globally
global.fetch = jest.fn()

// Mock tool for testing
const mockTool = {
  id: 'test-tool',
  name: 'Test Tool',
  description: 'A tool for testing',
  category: 'analysis' as const,
  icon: () => null,
  componentPath: '@/components/test',
  tabId: 'test',
  requiresDocument: true,
  apiEndpoint: {
    route: 'test-tool',
    methods: ['GET', 'POST'] as const,
    requiresAuth: true
  },
  preferredExecution: 'server' as const,
  serverOperations: ['execute']
}

describe('Tool Execution Framework', () => {
  beforeEach(() => {
    resetRegistryForTests()
    jest.clearAllMocks()
  })

  describe('executeTool() - Basic functionality', () => {
    it('should throw ToolNotFoundError for unregistered tool', async () => {
      await expect(
        executeTool('non-existent-tool', 'execute')
      ).rejects.toThrow(ToolNotFoundError)
    })

    it('should handle local navigation action', async () => {
      registerTool(mockTool)
      
      const result = await executeTool('test-tool', 'open', { param1: 'value1' })
      
      expect(result.type).toBe('navigation')
      expect(result.metadata.executionType).toBe('local')
      expect(result.metadata.toolId).toBe('test-tool')
      expect(result.data).toEqual({
        tab: 'test',
        parameters: { param1: 'value1' }
      })
    })

    it('should attempt server execution for execute action', async () => {
      registerTool(mockTool)
      
      // Mock successful API response
      const mockResponse = {
        success: true,
        data: { result: 'test data' }
      }
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await executeTool('test-tool', 'execute', { param1: 'value1' })
      
      expect(result.type).toBe('data')
      expect(result.metadata.executionType).toBe('server')
      expect(result.data).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tools/test-tool',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('"action":"execute"')
        })
      )
    })
  })

  describe('executeTool() - Error handling', () => {
    beforeEach(() => {
      registerTool(mockTool)
    })

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(
        executeTool('test-tool', 'execute')
      ).rejects.toThrow(ToolServerError)
    })

    it('should handle API error responses', async () => {
      const problemDetails = {
        type: 'https://spideryarn.com/problems/validation-failed',
        title: 'Validation Failed',
        status: 400,
        detail: 'Missing required parameter',
        instance: '/api/tools/test-tool',
        toolId: 'test-tool',
        correlationId: 'test-correlation-id',
        retryable: false
      }

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => problemDetails
      })

      await expect(
        executeTool('test-tool', 'execute')
      ).rejects.toThrow(ToolValidationError)
    })

    it('should handle timeout with AbortController', async () => {
      // Mock fetch that respects AbortController signal
      global.fetch = jest.fn().mockImplementation(
        (url, options) => new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve({
            ok: true,
            json: async () => ({ data: 'delayed' })
          }), 500)
          
          // Listen for abort signal
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId)
              const error = new Error('The operation was aborted')
              error.name = 'AbortError'
              reject(error)
            })
          }
        })
      )

      // Set timeout to 100ms, should abort before fetch completes
      await expect(
        executeTool('test-tool', 'execute', {}, { timeout: 100 })
      ).rejects.toThrow(ToolTimeoutError)
    }, 2000)
  })

  describe('Error message generation', () => {
    it('should provide user-friendly error messages', () => {
      const timeoutError = new ToolTimeoutError('test-tool', 5000)
      expect(getErrorMessage(timeoutError)).toContain('Operation timed out')

      const authError = new ToolAuthenticationError()
      expect(getErrorMessage(authError)).toContain('Authentication required')

      const validationError = new ToolValidationError(['Invalid parameter'])
      expect(getErrorMessage(validationError)).toContain('Invalid parameters')

      const notFoundError = new ToolNotFoundError('test-tool')
      expect(getErrorMessage(notFoundError)).toContain('Tool not available')

      const serverError = new ToolServerError('Server error', 500)
      expect(getErrorMessage(serverError)).toContain('Service temporarily unavailable')

      const cancelledError = new ToolCancelledError('test-tool')
      expect(getErrorMessage(cancelledError)).toContain('cancelled')
    })
  })

  describe('Retry logic', () => {
    it('should correctly identify retryable errors', () => {
      const timeoutError = new ToolTimeoutError('test-tool', 5000)
      expect(isRetryableError(timeoutError)).toBe(true)

      const authError = new ToolAuthenticationError()
      expect(isRetryableError(authError)).toBe(false)

      const serverError = new ToolServerError('Server error', 500)
      expect(isRetryableError(serverError)).toBe(true)

      const validationError = new ToolValidationError(['Invalid'])
      expect(isRetryableError(validationError)).toBe(false)
    })
  })

  describe('Execution path determination', () => {
    it('should prefer local execution for open action', async () => {
      const localTool = {
        ...mockTool,
        preferredExecution: 'server' as const
      }
      registerTool(localTool)

      const result = await executeTool('test-tool', 'open')
      expect(result.metadata.executionType).toBe('local')
    })

    it('should use force execution type when specified', async () => {
      registerTool(mockTool)

      // Mock successful response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' })
      })

      const result = await executeTool('test-tool', 'open', {}, { 
        forceExecutionType: 'server' 
      })
      
      expect(result.metadata.executionType).toBe('server')
    })
  })
})