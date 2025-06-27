/**
 * Integration tests for the tool execution framework with real tools
 * 
 * This test suite verifies that the executor works correctly with actual
 * registered tools like the metadata tool.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { executeTool } from '../executor/executor'
import { getTool, registerTool, resetRegistryForTests } from '../registry'
import { Tag } from '@phosphor-icons/react/dist/ssr'

// Metadata tool definition (from implementations/metadata.ts)
const metadataTool = {
  id: 'metadata',
  name: 'Metadata',
  description: 'View document metadata, statistics, and properties including reading time and word count',
  category: 'analysis' as const,
  icon: Tag,
  componentPath: '@/components/tools/MetadataPanel',
  tabId: 'metadata',
  shortcuts: ['Cmd+I', 'Ctrl+I'],
  keywords: ['metadata', 'info', 'statistics', 'document', 'properties', 'reading time'],
  requiresDocument: true,
  autoLoad: false,
  capabilities: {
    search: false,
    export: true,
    realtime: false
  },
  urlStateKeys: [],
  apiEndpoint: {
    route: 'metadata',
    methods: ['GET', 'POST', 'DELETE'] as const,
    cacheable: true,
    requiresAuth: true,
    timeout: {
      default: 30000,
      ai: 45000,
      analysis: 60000
    }
  },
  preferredExecution: 'server' as const,
  localOperations: ['open'],
  serverOperations: ['execute', 'refresh', 'analyze-reading-difficulty'],
  timeouts: {
    default: 30000,
    ai: 45000,
    analysis: 60000,
    upload: 30000
  }
}

// Mock fetch for server calls
global.fetch = jest.fn()

describe('Tool Execution Framework - Integration', () => {
  beforeEach(() => {
    resetRegistryForTests()
    registerTool(metadataTool)
    jest.clearAllMocks()
  })

  describe('Real tool integration', () => {
    it('should work with registered metadata tool for navigation', async () => {
      const result = await executeTool('metadata', 'open', { info: 'document-stats' })
      
      expect(result.type).toBe('navigation')
      expect(result.metadata.executionType).toBe('local')
      expect(result.metadata.toolId).toBe('metadata')
      expect(result.data?.tab).toBe('metadata')
    })

    it('should find the metadata tool in registry', () => {
      const tool = getTool('metadata')
      
      expect(tool).toBeDefined()
      expect(tool?.id).toBe('metadata')
      expect(tool?.name).toBe('Metadata')
      expect(tool?.category).toBe('analysis')
    })

    it('should respect metadata tool execution configuration', async () => {
      // Mock successful API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          readingDifficulty: {
            level: 'intermediate',
            confidence: 0.85
          },
          metadata: {
            wordCount: 1500,
            readingTime: 6
          }
        })
      })

      const result = await executeTool('metadata', 'execute', { 
        documentId: 'test-doc-123',
        content: '<p>Test content for analysis</p>'
      })
      
      expect(result.type).toBe('data')
      expect(result.metadata.executionType).toBe('server')
      expect(result.metadata.toolId).toBe('metadata')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tools/metadata',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
    })

    it('should use custom timeouts for metadata tool', () => {
      const tool = getTool('metadata')
      
      // Check that the tool has execution framework configuration
      expect(tool).toBeDefined()
      
      const executableTool = tool as any
      expect(executableTool.timeouts).toBeDefined()
      expect(executableTool.timeouts.ai).toBe(45000)
      expect(executableTool.timeouts.analysis).toBe(60000)
      expect(executableTool.apiEndpoint).toBeDefined()
      expect(executableTool.apiEndpoint.route).toBe('metadata')
    })

    it('should handle metadata tool server operations', async () => {
      const tool = getTool('metadata')
      const executableTool = tool as any
      
      expect(executableTool.serverOperations).toContain('execute')
      expect(executableTool.serverOperations).toContain('refresh')
      expect(executableTool.localOperations).toContain('open')
    })
  })

  describe('Error handling with real tools', () => {
    it('should handle API errors for metadata tool', async () => {
      const problemDetails = {
        type: 'https://spideryarn.com/problems/validation-failed',
        title: 'Validation Failed',
        status: 400,
        detail: 'Missing document content',
        instance: '/api/tools/metadata',
        toolId: 'metadata',
        correlationId: 'test-correlation-id',
        retryable: false
      }

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => problemDetails
      })

      await expect(
        executeTool('metadata', 'execute', { documentId: 'test' })
      ).rejects.toThrow('Missing document content')
    })
  })
})