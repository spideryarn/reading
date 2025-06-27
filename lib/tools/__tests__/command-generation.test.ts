/**
 * Tests for command generation utilities
 * 
 * Comprehensive test suite for dynamic command palette generation,
 * conflict detection, and command transformation logic.
 */

import { 
  generateCommandsFromRegistry,
  detectToolConflicts,
  extractKeywordsFromTool,
  transformShortcuts,
  debugUtils
} from '../command-generation'
import type { Tool } from '../types'
import { List } from '@phosphor-icons/react'

// Mock tools for testing
const mockTools: Tool[] = [
  {
    id: 'test-tool-1',
    name: 'Test Tool One',
    description: 'First test tool for testing functionality',
    category: 'navigation',
    icon: List,
    componentPath: '@/components/tools/TestTool1',
    tabId: 'original',
    requiresDocument: false,
    shortcuts: ['Cmd+1'],
    keywords: ['test', 'first']
  },
  {
    id: 'test-tool-2', 
    name: 'Test Tool Two',
    description: 'Second test tool with different features',
    category: 'analysis',
    icon: List,
    componentPath: '@/components/tools/TestTool2',
    tabId: 'summary',
    requiresDocument: true,
    shortcuts: ['Cmd+2'],
    keywords: ['test', 'second']
  },
  {
    id: 'test-tool-3',
    name: 'Interactive Tool',
    description: 'Tool for interactive user engagement and collaboration',
    category: 'interactive',
    icon: List,
    componentPath: '@/components/tools/InteractiveTool',
    tabId: 'chat',
    requiresDocument: false,
    // No shortcuts defined
    keywords: ['interactive', 'chat', 'user']
  }
]

// Mock tools with conflicts
const conflictingTools: Tool[] = [
  {
    id: 'conflict-1',
    name: 'Conflict Tool One',
    description: 'Tool that conflicts with another',
    category: 'navigation',
    icon: List,
    componentPath: '@/components/tools/ConflictTool1',
    tabId: 'original',
    requiresDocument: false,
    shortcuts: ['Cmd+X'], // Duplicate shortcut
    keywords: ['conflict']
  },
  {
    id: 'conflict-2',
    name: 'Conflict Tool Two', 
    description: 'Another tool with same shortcut',
    category: 'analysis',
    icon: List,
    componentPath: '@/components/tools/ConflictTool2',
    tabId: 'summary',
    requiresDocument: false,
    shortcuts: ['Cmd+X'], // Duplicate shortcut
    keywords: ['conflict'] // Duplicate keyword
  }
]

describe('extractKeywordsFromTool', () => {
  it('should use explicit keywords when provided', () => {
    const keywords = extractKeywordsFromTool(mockTools[0])
    expect(keywords).toContain('test')
    expect(keywords).toContain('first')
  })

  it('should add tool name as keyword', () => {
    const keywords = extractKeywordsFromTool(mockTools[0])
    expect(keywords).toContain('test tool one')
  })

  it('should extract meaningful words from description', () => {
    const keywords = extractKeywordsFromTool(mockTools[0])
    expect(keywords).toContain('tool')
    expect(keywords).toContain('testing')
    expect(keywords).toContain('functionality')
  })

  it('should filter out common words', () => {
    const keywords = extractKeywordsFromTool(mockTools[0])
    expect(keywords).not.toContain('for')
    expect(keywords).not.toContain('the')
    expect(keywords).not.toContain('and')
  })

  it('should limit description words to 5', () => {
    const tool: Tool = {
      ...mockTools[0],
      description: 'This is a very long description with many words that should be limited to only the first five meaningful words',
      keywords: []
    }
    const keywords = extractKeywordsFromTool(tool)
    const descWords = keywords.filter(k => !['test tool one'].includes(k))
    expect(descWords.length).toBeLessThanOrEqual(5)
  })

  it('should remove duplicates', () => {
    const tool: Tool = {
      ...mockTools[0],
      keywords: ['test', 'duplicate'],
      description: 'test duplicate test duplicate'
    }
    const keywords = extractKeywordsFromTool(tool)
    const testCount = keywords.filter(k => k === 'test').length
    const duplicateCount = keywords.filter(k => k === 'duplicate').length
    expect(testCount).toBe(1)
    expect(duplicateCount).toBe(1)
  })
})

describe('detectToolConflicts', () => {
  it('should detect shortcut conflicts', () => {
    const conflicts = detectToolConflicts(conflictingTools)
    
    expect(conflicts.shortcuts.size).toBe(1)
    expect(conflicts.shortcuts.has('Cmd+X')).toBe(true)
    expect(conflicts.shortcuts.get('Cmd+X')).toEqual(['conflict-1', 'conflict-2'])
  })

  it('should detect keyword conflicts', () => {
    const conflicts = detectToolConflicts(conflictingTools)
    
    expect(conflicts.keywords.size).toBeGreaterThan(0)
    expect(conflicts.keywords.has('conflict')).toBe(true)
    expect(conflicts.keywords.get('conflict')).toEqual(['conflict-1', 'conflict-2'])
  })

  it('should track tools with conflicts', () => {
    const conflicts = detectToolConflicts(conflictingTools)
    
    expect(conflicts.toolsWithConflicts.has('conflict-1')).toBe(true)
    expect(conflicts.toolsWithConflicts.has('conflict-2')).toBe(true)
  })

  it('should not report conflicts for unique shortcuts', () => {
    const conflicts = detectToolConflicts(mockTools)
    
    expect(conflicts.shortcuts.size).toBe(0)
  })

  it('should handle tools without shortcuts', () => {
    const toolWithoutShortcuts: Tool = {
      ...mockTools[0],
      shortcuts: undefined
    }
    
    expect(() => detectToolConflicts([toolWithoutShortcuts])).not.toThrow()
  })
})

describe('transformShortcuts', () => {
  it('should return undefined for empty shortcuts', () => {
    expect(transformShortcuts(undefined)).toBeUndefined()
    expect(transformShortcuts([])).toBeUndefined()
  })

  it('should transform Cmd to ⌘ on Mac', () => {
    const result = transformShortcuts(['Cmd+1'], true)
    expect(result).toEqual(['⌘+1'])
  })

  it('should transform Cmd to Ctrl on non-Mac', () => {
    const result = transformShortcuts(['Cmd+1'], false)
    expect(result).toEqual(['Ctrl+1'])
  })

  it('should preserve Ctrl shortcuts', () => {
    const result = transformShortcuts(['Ctrl+1'], true)
    expect(result).toEqual(['⌘+1'])
    
    const result2 = transformShortcuts(['Ctrl+1'], false)
    expect(result2).toEqual(['Ctrl+1'])
  })

  it('should handle multiple shortcuts by selecting the first platform-appropriate one', () => {
    const result = transformShortcuts(['Cmd+1', 'Cmd+Shift+1'], true)
    expect(result).toEqual(['⌘+1']) // Only first Cmd shortcut is selected and transformed
  })
})

describe('generateCommandsFromRegistry', () => {
  const mockNavigateToTab = jest.fn()
  const mockGetCurrentDocument = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate commands from tools', () => {
    const commands = generateCommandsFromRegistry(mockTools, {
      detectConflicts: false,
      getNavigateToTab: () => mockNavigateToTab,
      getCurrentDocument: mockGetCurrentDocument
    })

    expect(commands).toHaveLength(3)
    expect(commands[0].id).toBe('nav-test-tool-1')
    expect(commands[0].name).toBe('Test Tool One')
    expect(commands[0].keywords).toContain('test')
  })

  it('should throw error on shortcut conflicts', () => {
    expect(() => {
      generateCommandsFromRegistry(conflictingTools, {
        detectConflicts: true,
        getNavigateToTab: () => mockNavigateToTab
      })
    }).toThrow('Shortcut conflicts detected')
  })

  it('should warn about keyword conflicts in development', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    // Use tools with only keyword conflicts, no shortcut conflicts
    const keywordConflictTools: Tool[] = [
      {
        ...conflictingTools[0],
        shortcuts: ['Cmd+A'] // Different shortcut
      },
      {
        ...conflictingTools[1], 
        shortcuts: ['Cmd+B'] // Different shortcut
      }
    ]

    generateCommandsFromRegistry(keywordConflictTools, {
      detectConflicts: true,
      getNavigateToTab: () => mockNavigateToTab
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Keyword conflicts detected'),
      expect.any(Object)
    )

    consoleSpy.mockRestore()
    process.env.NODE_ENV = originalEnv
  })

  it('should generate proper command actions', () => {
    const commands = generateCommandsFromRegistry([mockTools[0]], {
      getNavigateToTab: () => mockNavigateToTab
    })

    const command = commands[0]
    command.action()

    expect(mockNavigateToTab).toHaveBeenCalledWith('original')
  })

  it('should throw error when getNavigateToTab not provided', () => {
    const commands = generateCommandsFromRegistry([mockTools[0]])
    const command = commands[0]

    expect(() => command.action()).toThrow('Cannot execute tool')
  })

  it('should add conditions for document-dependent tools', () => {
    const commands = generateCommandsFromRegistry([mockTools[1]], {
      getCurrentDocument: mockGetCurrentDocument
    })

    const command = commands[0]
    expect(command.condition).toBeDefined()

    // Test with document
    mockGetCurrentDocument.mockReturnValue({ id: 'test-doc' })
    expect(command.condition!()).toBe(true)

    // Test without document
    mockGetCurrentDocument.mockReturnValue(null)
    expect(command.condition!()).toBe(false)
  })

  it('should handle missing document provider safely', () => {
    const commands = generateCommandsFromRegistry([mockTools[1]])
    const command = commands[0]
    
    expect(command.condition).toBeDefined()
    expect(command.condition!()).toBe(false) // Safe default
  })

  it('should map categories correctly', () => {
    const commands = generateCommandsFromRegistry(mockTools)
    
    commands.forEach(command => {
      expect(command.category.id).toBe('navigation')
      expect(command.category.name).toBe('Navigation')
      expect(command.category.priority).toBe(1)
    })
  })

  it('should transform shortcuts based on platform', () => {
    const commands = generateCommandsFromRegistry([mockTools[0]], {
      isMac: true
    })

    expect(commands[0].shortcut).toEqual(['⌘+1'])

    const commandsWindows = generateCommandsFromRegistry([mockTools[0]], {
      isMac: false
    })

    expect(commandsWindows[0].shortcut).toEqual(['Ctrl+1'])
  })

  it('should use custom keyword extraction when provided', () => {
    const customExtractor = jest.fn().mockReturnValue(['custom', 'keywords'])
    
    const commands = generateCommandsFromRegistry([mockTools[0]], {
      extractKeywords: customExtractor
    })

    expect(customExtractor).toHaveBeenCalledWith(mockTools[0])
    expect(commands[0].keywords).toEqual(['custom', 'keywords'])
  })
})

describe('debugUtils', () => {
  describe('logGenerationReport', () => {
    it('should log report in development mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const commands = generateCommandsFromRegistry(mockTools, {
        detectConflicts: false
      })

      debugUtils.logGenerationReport(mockTools, commands)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Command Generation Report')
      )

      consoleSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })

    it('should not log in production mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const commands = generateCommandsFromRegistry(mockTools, {
        detectConflicts: false
      })

      debugUtils.logGenerationReport(mockTools, commands)

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('validateCommands', () => {
    it('should validate correct commands', () => {
      const commands = generateCommandsFromRegistry(mockTools, {
        detectConflicts: false,
        getNavigateToTab: () => jest.fn()
      })

      const errors = debugUtils.validateCommands(commands)
      expect(errors).toHaveLength(0)
    })

    it('should detect invalid command structure', () => {
      const invalidCommands = [
        {
          id: '', // Invalid
          name: 'Test',
          keywords: [],
          category: { id: 'nav', name: 'Nav', priority: 1 },
          action: () => {}
        },
        {
          id: 'test',
          name: '', // Invalid
          keywords: [],
          category: { id: 'nav', name: 'Nav', priority: 1 },
          action: () => {}
        },
        {
          id: 'test',
          name: 'Test',
          keywords: 'invalid', // Should be array
          category: { id: 'nav', name: 'Nav', priority: 1 },
          action: () => {}
        }
      ] as any

      const errors = debugUtils.validateCommands(invalidCommands)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors).toContain('Command 0: invalid id')
      expect(errors).toContain('Command 1: invalid name')
      expect(errors).toContain('Command 2: keywords must be array')
    })
  })
  
  describe('Command Ordering', () => {
    it('should order commands according to vertical icon rail sequence', () => {
      const tools: Tool[] = [
        {
          id: 'metadata',
          name: 'Metadata',
          description: 'Document metadata and statistics',
          category: 'navigation',
          icon: List,
          componentPath: '@/components/tools/MetadataPanel',
          tabId: 'metadata',
          requiresDocument: false,
          shortcuts: ['Cmd+I'],
          keywords: ['metadata', 'info']
        },
        {
          id: 'search',
          name: 'Search',
          description: 'Search within document',
          category: 'interactive',
          icon: List,
          componentPath: '@/components/tools/SearchPanel',
          tabId: 'search',
          requiresDocument: false,
          shortcuts: ['Cmd+F'],
          keywords: ['search', 'find']
        },
        {
          id: 'original',
          name: 'Original',
          description: 'Original document view',
          category: 'navigation',
          icon: List,
          componentPath: '@/components/tools/OriginalPanel',
          tabId: 'original',
          requiresDocument: false,
          shortcuts: ['Cmd+1'],
          keywords: ['original', 'source']
        },
        {
          id: 'glossary',
          name: 'Glossary',
          description: 'Key terms and definitions',
          category: 'analysis',
          icon: List,
          componentPath: '@/components/tools/GlossaryPanel',
          tabId: 'glossary',
          requiresDocument: false,
          shortcuts: ['Cmd+5'],
          keywords: ['glossary', 'terms']
        },
        {
          id: 'summary',
          name: 'Summary',
          description: 'Document summary',
          category: 'navigation',
          icon: List,
          componentPath: '@/components/tools/SummaryPanel',
          tabId: 'summary',
          requiresDocument: false,
          shortcuts: ['Cmd+3'],
          keywords: ['summary', 'overview']
        }
      ]
      
      const commands = generateCommandsFromRegistry(tools, {
        getNavigateToTab: () => mockNavigateToTab
      })
      
      // Expected order based on TOOL_ORDER: summary, glossary, search, metadata, then original (not in list, so alphabetically after)
      const expectedOrder = ['summary', 'glossary', 'search', 'metadata', 'original']
      const actualOrder = commands.map(cmd => cmd.id.replace('nav-', ''))
      
      expect(actualOrder).toEqual(expectedOrder)
    })
    
    it('should handle tools not in TOOL_ORDER list alphabetically', () => {
      const tools: Tool[] = [
        {
          id: 'zebra-tool',
          name: 'Zebra Tool',
          description: 'Test tool starting with Z',
          category: 'navigation',
          icon: List,
          componentPath: '@/components/tools/ZebraPanel',
          tabId: 'zebra',
          requiresDocument: false,
          shortcuts: ['Cmd+Z'],
          keywords: ['zebra']
        },
        {
          id: 'alpha-tool',
          name: 'Alpha Tool',
          description: 'Test tool starting with A',
          category: 'navigation',
          icon: List,
          componentPath: '@/components/tools/AlphaPanel',
          tabId: 'alpha',
          requiresDocument: false,
          shortcuts: ['Cmd+A'],
          keywords: ['alpha']
        },
        {
          id: 'original',
          name: 'Original',
          description: 'Original document view',
          category: 'navigation',
          icon: List,
          componentPath: '@/components/tools/OriginalPanel',
          tabId: 'original',
          requiresDocument: false,
          shortcuts: ['Cmd+1'],
          keywords: ['original']
        }
      ]
      
      const commands = generateCommandsFromRegistry(tools, {
        getNavigateToTab: () => mockNavigateToTab
      })
      
      // Expected order: alphabetically since none are in TOOL_ORDER: alpha-tool, original, zebra-tool
      const expectedOrder = ['alpha-tool', 'original', 'zebra-tool']
      const actualOrder = commands.map(cmd => cmd.id.replace('nav-', ''))
      
      expect(actualOrder).toEqual(expectedOrder)
    })
  })
})