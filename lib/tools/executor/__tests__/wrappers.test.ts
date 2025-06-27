/**
 * Tests for the auto-generated typed wrapper functions.
 * 
 * This test suite verifies that the wrapper generation works correctly,
 * produces type-safe wrappers, and integrates properly with the executor.
 */

import { generateToolWrappers, createSingleToolWrapper, wrapperValidation, debugUtils } from '../wrappers'
import type { Tool } from '@/lib/tools/types'
import { BookOpen, Chat, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'
import type { ToolExecutionResult } from '../types'
import { ToolNotFoundError } from '../types'

// Mock the executor to avoid actual API calls in tests
jest.mock('../executor', () => ({
  executeTool: jest.fn()
}))

import { executeTool } from '../executor'
const mockedExecuteTool = executeTool as jest.MockedFunction<typeof executeTool>

// Test data - move to module level
const testTools: Tool[] = [
    {
      id: 'glossary',
      name: 'Glossary',
      description: 'Extract key terms from document',
      category: 'analysis',
      icon: BookOpen,
      componentPath: '@/components/tools/GlossaryPanel',
      tabId: 'glossary',
      shortcuts: ['Cmd+5', 'Ctrl+5'],
      keywords: ['terms', 'definitions'],
      requiresDocument: true,
      autoLoad: false,
      capabilities: { search: true }
    },
    {
      id: 'chat',
      name: 'Chat',
      description: 'Interactive AI assistant',
      category: 'interactive',
      icon: Chat,
      componentPath: '@/components/tools/ChatPanel',
      tabId: 'chat',
      shortcuts: ['Cmd+3', 'Ctrl+3'],
      requiresDocument: false,
      autoLoad: false
    },
    {
      id: 'search',
      name: 'Search',
      description: 'Find content in document',
      category: 'interactive',
      icon: MagnifyingGlass,
      componentPath: '@/components/tools/SearchPanel',
      tabId: 'search',
      shortcuts: ['Cmd+F', 'Ctrl+F'],
      requiresDocument: true,
      autoLoad: false
    }
  ]

describe('generateToolWrappers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate wrappers for all provided tools', () => {
    const wrappers = generateToolWrappers(testTools)
    
    expect(Object.keys(wrappers)).toHaveLength(3)
    expect(wrappers).toHaveProperty('glossary')
    expect(wrappers).toHaveProperty('chat')
    expect(wrappers).toHaveProperty('search')
  })

  it('should create wrappers with all required methods', () => {
    const wrappers = generateToolWrappers(testTools)
    
    // Check each wrapper has the required methods
    Object.values(wrappers).forEach(wrapper => {
      expect(typeof wrapper.execute).toBe('function')
      expect(typeof wrapper.open).toBe('function')
      expect(typeof wrapper.refresh).toBe('function')
    })
  })

  it('should handle empty tools array', () => {
    const wrappers = generateToolWrappers([])
    
    expect(Object.keys(wrappers)).toHaveLength(0)
  })

  it('should validate tools array and throw for invalid input', () => {
    expect(() => {
      // @ts-expect-error - Testing invalid input
      generateToolWrappers('not-an-array')
    }).toThrow('generateToolWrappers: tools must be an array')
  })

  it('should skip tools with missing IDs and log warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    const toolsWithMissingId = [
      testTools[0],
      { ...testTools[1], id: undefined } as any,
      testTools[2]
    ]
    
    const wrappers = generateToolWrappers(toolsWithMissingId)
    
    expect(Object.keys(wrappers)).toHaveLength(2)
    expect(wrappers).toHaveProperty('glossary')
    expect(wrappers).toHaveProperty('search')
    expect(wrappers).not.toHaveProperty('chat')
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'generateToolWrappers: Skipping tool with missing ID:',
      expect.any(Object)
    )
    
    consoleSpy.mockRestore()
  })
})

describe('wrapper method functionality', () => {
  const testTool: Tool = testTools[0] // glossary tool
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call executeTool with correct parameters for execute method', async () => {
    const mockResult: ToolExecutionResult = {
      type: 'data',
      data: { terms: ['AI', 'machine learning'] },
      metadata: {
        toolId: 'glossary',
        action: 'execute',
        executionType: 'server',
        executionTime: 100,
        correlationId: 'test-correlation-id'
      }
    }
    
    mockedExecuteTool.mockResolvedValue(mockResult)
    
    const wrapper = createSingleToolWrapper(testTool)
    const parameters = { refresh: true }
    const options = { timeout: 5000 }
    
    const result = await wrapper.execute(parameters, options)
    
    expect(mockedExecuteTool).toHaveBeenCalledWith(
      'glossary',
      'execute',
      parameters,
      {
        source: 'direct',
        timeout: 5000
      }
    )
    
    expect(result).toEqual(mockResult)
  })

  it('should call executeTool with correct parameters for open method', async () => {
    const mockResult: ToolExecutionResult = {
      type: 'navigation',
      data: { tab: 'glossary' },
      metadata: {
        toolId: 'glossary',
        action: 'open',
        executionType: 'local',
        executionTime: 50,
        correlationId: 'test-correlation-id'
      }
    }
    
    mockedExecuteTool.mockResolvedValue(mockResult)
    
    const wrapper = createSingleToolWrapper(testTool)
    const parameters = { term: 'AI' }
    
    const result = await wrapper.open(parameters)
    
    expect(mockedExecuteTool).toHaveBeenCalledWith(
      'glossary',
      'open',
      parameters,
      {
        source: 'direct',
        forceExecutionType: 'local'
      }
    )
    
    expect(result).toEqual(mockResult)
  })

  it('should call executeTool with correct parameters for refresh method', async () => {
    const mockResult: ToolExecutionResult = {
      type: 'data',
      data: { refreshed: true },
      metadata: {
        toolId: 'glossary',
        action: 'refresh',
        executionType: 'server',
        executionTime: 75,
        correlationId: 'test-correlation-id'
      }
    }
    
    mockedExecuteTool.mockResolvedValue(mockResult)
    
    const wrapper = createSingleToolWrapper(testTool)
    
    const result = await wrapper.refresh()
    
    expect(mockedExecuteTool).toHaveBeenCalledWith(
      'glossary',
      'refresh',
      {},
      {
        source: 'direct'
      }
    )
    
    expect(result).toEqual(mockResult)
  })

  it('should handle executor errors properly', async () => {
    const executorError = new ToolNotFoundError('glossary')
    mockedExecuteTool.mockRejectedValue(executorError)
    
    const wrapper = createSingleToolWrapper(testTool)
    
    await expect(wrapper.execute()).rejects.toThrow(ToolNotFoundError)
  })

  it('should pass through empty parameters by default', async () => {
    const mockResult: ToolExecutionResult = {
      type: 'data',
      data: {},
      metadata: {
        toolId: 'glossary',
        action: 'execute',
        executionType: 'server',
        executionTime: 100,
        correlationId: 'test-correlation-id'
      }
    }
    
    mockedExecuteTool.mockResolvedValue(mockResult)
    
    const wrapper = createSingleToolWrapper(testTool)
    
    await wrapper.execute()
    
    expect(mockedExecuteTool).toHaveBeenCalledWith(
      'glossary',
      'execute',
      {},
      {
        source: 'direct'
      }
    )
  })
})

describe('createSingleToolWrapper', () => {
  it('should create a wrapper for a single tool', () => {
    const wrapper = createSingleToolWrapper(testTools[0])
    
    expect(typeof wrapper.execute).toBe('function')
    expect(typeof wrapper.open).toBe('function')
    expect(typeof wrapper.refresh).toBe('function')
  })

  it('should throw error for tool without ID', () => {
    const toolWithoutId = { ...testTools[0], id: undefined } as any
    
    expect(() => {
      createSingleToolWrapper(toolWithoutId)
    }).toThrow('createSingleToolWrapper: tool must have an ID')
  })
})

describe('wrapperValidation', () => {
  it('should validate tools array correctly', () => {
    const errors = wrapperValidation.validateToolsArray(testTools)
    expect(errors).toHaveLength(0)
  })

  it('should detect non-array input', () => {
    const errors = wrapperValidation.validateToolsArray('not-array' as any)
    expect(errors).toContain('Tools must be an array')
  })

  it('should detect missing required fields', () => {
    const invalidTools = [
      { name: 'Test' }, // missing id
      { id: 'test' } // missing name and tabId
    ]
    
    const errors = wrapperValidation.validateToolsArray(invalidTools)
    
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(error => error.includes('must have a string ID'))).toBe(true)
    expect(errors.some(error => error.includes('must have a string name'))).toBe(true)
    expect(errors.some(error => error.includes('must have a string tabId'))).toBe(true)
  })

  it('should detect duplicate tool IDs', () => {
    const duplicateTools = [
      testTools[0],
      { ...testTools[1], id: 'glossary' } // duplicate ID
    ]
    
    const errors = wrapperValidation.validateUniqueIds(duplicateTools)
    expect(errors).toContain('Duplicate tool ID: glossary')
  })

  it('should pass validation for unique tools', () => {
    const errors = wrapperValidation.validateUniqueIds(testTools)
    expect(errors).toHaveLength(0)
  })
})

describe('debugUtils', () => {
  beforeEach(() => {
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()  
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should log wrapper report in development', () => {
    // Mock development environment
    const oldEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    const wrappers = generateToolWrappers(testTools)
    debugUtils.logWrapperReport(testTools, wrappers)
    
    expect(console.log).toHaveBeenCalledWith('🔧 Tool Wrapper Generation Report:')
    expect(console.log).toHaveBeenCalledWith('  • 3 tools processed')
    expect(console.log).toHaveBeenCalledWith('  • 3 wrappers generated')
    
    process.env.NODE_ENV = oldEnv
  })

  it('should not log in production', () => {
    const oldEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    const wrappers = generateToolWrappers(testTools)
    debugUtils.logWrapperReport(testTools, wrappers)
    
    expect(console.log).not.toHaveBeenCalled()
    
    process.env.NODE_ENV = oldEnv
  })

  it('should detect validation errors', () => {
    const oldEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    const invalidWrappers = {
      broken: { execute: 'not-a-function' } as any
    }
    
    debugUtils.logWrapperReport([], invalidWrappers)
    
    expect(console.error).toHaveBeenCalledWith(
      '  • Validation errors:',
      ['broken: missing execute method', 'broken: missing open method', 'broken: missing refresh method']
    )
    
    process.env.NODE_ENV = oldEnv
  })
})