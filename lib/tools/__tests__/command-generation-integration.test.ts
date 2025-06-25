/**
 * Integration tests for command generation with real tool structure
 * 
 * Tests the command generation utilities against tools that match
 * the real tool registry structure from 250614b implementation.
 */

import { generateCommandsFromRegistry } from '../command-generation'
import type { Tool } from '../types'
import { BookOpen, ChatCircle, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'

// Real tool structure based on 250614b implementation
const realToolStructures: Tool[] = [
  {
    id: 'glossary',
    name: 'Glossary',
    description: 'Extract and display key terms and concepts from the document',
    category: 'analysis',
    icon: BookOpen,
    componentPath: '@/components/tools/GlossaryPanel',
    tabId: 'glossary',
    shortcuts: ['Cmd+5', 'Ctrl+5'],
    keywords: ['terms', 'definitions', 'concepts', 'vocabulary', 'entities'],
    requiresDocument: true,
    autoLoad: false,
    capabilities: { search: true, export: true, realtime: true },
    urlStateKeys: ['term']
  },
  {
    id: 'chat',
    name: 'Chat',
    description: 'Interactive AI chat about document content',
    category: 'interactive',
    icon: ChatCircle,
    componentPath: '@/components/tools/ChatPanel',
    tabId: 'chat',
    shortcuts: ['Cmd+4', 'Ctrl+4'],
    keywords: ['ai', 'assistant', 'questions', 'conversation'],
    requiresDocument: true,
    autoLoad: false,
    capabilities: { realtime: true },
    urlStateKeys: ['chat']
  },
  {
    id: 'search',
    name: 'Search',
    description: 'Search within document content',
    category: 'interactive',
    icon: MagnifyingGlass,
    componentPath: '@/components/tools/SearchPanel',
    tabId: 'search',
    shortcuts: ['Cmd+F', 'Ctrl+F'],
    keywords: ['find', 'search', 'query', 'locate'],
    requiresDocument: true,
    autoLoad: false,
    capabilities: { search: true },
    urlStateKeys: ['q', 'query']
  }
]

describe('Command Generation Integration', () => {
  it('should generate commands from real tool structures', () => {
    const tools = realToolStructures
    
    // Mock required dependencies
    const mockNavigateToTab = jest.fn()
    const mockGetCurrentDocument = jest.fn().mockReturnValue({ id: 'test-doc' })
    
    const commands = generateCommandsFromRegistry(tools, {
      getNavigateToTab: () => mockNavigateToTab,
      getCurrentDocument: mockGetCurrentDocument,
      isMac: true // Test with Mac platform
    })
    
    expect(commands).toHaveLength(3)
    
    // Verify command structure
    commands.forEach(command => {
      expect(command.id).toMatch(/^nav-/)
      expect(command.name).toBeTruthy()
      expect(command.keywords).toBeInstanceOf(Array)
      expect(command.keywords.length).toBeGreaterThan(0)
      expect(command.category.id).toBe('navigation')
      expect(command.action).toBeInstanceOf(Function)
      expect(command.icon).toBeInstanceOf(Function)
    })
    
    // Verify specific command mappings
    const glossaryCommand = commands.find(cmd => cmd.id === 'nav-glossary')
    expect(glossaryCommand?.name).toBe('Glossary')
    expect(glossaryCommand?.keywords).toContain('terms')
    expect(glossaryCommand?.shortcut).toEqual(['⌘+5']) // Mac shortcuts
  })
  
  it('should handle tools with shortcuts correctly', () => {
    const toolsWithShortcuts = realToolStructures.filter(tool => tool.shortcuts && tool.shortcuts.length > 0)
    
    // All our test tools have shortcuts
    expect(toolsWithShortcuts.length).toBe(3)
    
    const commands = generateCommandsFromRegistry(toolsWithShortcuts, {
      getNavigateToTab: () => jest.fn(),
      isMac: true
    })
    
    // Verify shortcuts are transformed properly for Mac
    commands.forEach(command => {
      if (command.shortcut) {
        command.shortcut.forEach(shortcut => {
          expect(shortcut).toMatch(/⌘/) // Should contain Mac command symbol
        })
      }
    })
  })
  
  it('should handle tools requiring documents', () => {
    const documentTools = realToolStructures.filter(tool => tool.requiresDocument)
    
    // All our test tools require documents
    expect(documentTools.length).toBe(3)
    
    const commands = generateCommandsFromRegistry(documentTools, {
      getNavigateToTab: () => jest.fn(),
      getCurrentDocument: () => null // No document available
    })
    
    // All commands should have condition functions
    commands.forEach(command => {
      expect(command.condition).toBeInstanceOf(Function)
      expect(command.condition!()).toBe(false) // Should return false when no document
    })
  })
  
  it('should execute commands correctly with real tool IDs', () => {
    const tools = realToolStructures
    const mockNavigateToTab = jest.fn()
    
    const commands = generateCommandsFromRegistry(tools, {
      getNavigateToTab: () => mockNavigateToTab
    })
    
    // Test executing the glossary command
    const glossaryCommand = commands.find(cmd => cmd.id === 'nav-glossary')
    const glossaryTool = tools.find(t => t.id === 'glossary')
    
    expect(glossaryCommand).toBeDefined()
    expect(glossaryTool).toBeDefined()
    
    glossaryCommand!.action()
    
    expect(mockNavigateToTab).toHaveBeenCalledWith(glossaryTool!.tabId)
  })
  
  it('should not have any shortcut conflicts in real tools', () => {
    const tools = realToolStructures
    
    // This should not throw since our tools were designed without conflicts
    expect(() => {
      generateCommandsFromRegistry(tools, {
        detectConflicts: true,
        getNavigateToTab: () => jest.fn()
      })
    }).not.toThrow()
  })
  
  it('should generate meaningful keywords from real tool data', () => {
    const tools = realToolStructures
    
    const commands = generateCommandsFromRegistry(tools, {
      getNavigateToTab: () => jest.fn()
    })
    
    // Verify each command has meaningful keywords
    commands.forEach(command => {
      // Find the corresponding tool by matching command ID to tool ID
      const toolId = command.id.replace('nav-', '') // Remove nav- prefix
      const tool = tools.find(t => t.id === toolId)
      
      if (!tool) {
        throw new Error(`Could not find tool for command ${command.id}`)
      }
      
      // Should contain tool name in some form
      const hasNameKeyword = command.keywords.some(keyword => 
        keyword.toLowerCase().includes(tool.name.toLowerCase()) ||
        tool.name.toLowerCase().includes(keyword.toLowerCase())
      )
      
      expect(hasNameKeyword).toBe(true)
      
      // Should have at least 2 keywords (name + description words)
      expect(command.keywords.length).toBeGreaterThanOrEqual(2)
      
      // Should contain explicit keywords from tool definition
      if (tool.keywords) {
        tool.keywords.forEach(toolKeyword => {
          expect(command.keywords).toContain(toolKeyword)
        })
      }
    })
  })
})