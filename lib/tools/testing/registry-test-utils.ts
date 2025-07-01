/**
 * Test utilities for the tool registry system.
 * 
 * Provides helper functions for creating test tools and ensuring
 * proper test isolation without registry pollution.
 * 
 * @see docs/reference/TESTING_OVERVIEW.md for testing patterns
 */

import type { Tool, ToolCategory, TabValue } from '../types'
import { registerTool, resetRegistryForTests } from '../registry'
import { BookOpen, MagnifyingGlass, Robot, ChatCircle, type Icon } from '@phosphor-icons/react/dist/ssr'

/**
 * Reset registry before each test
 * 
 * This should be called in jest.setup.js or beforeEach blocks
 * to ensure tests don't pollute each other.
 */
export function setupRegistryForTests(): void {
  resetRegistryForTests()
}

/**
 * Create a test tool with sensible defaults
 * 
 * @param overrides - Properties to override
 * @returns Complete tool definition for testing
 */
export function createTestTool(overrides: Partial<Tool> = {}): Tool {
  const defaults: Tool = {
    id: 'test-tool',
    name: 'Test Tool',
    description: 'A tool for testing purposes',
    category: 'analysis',
    icon: BookOpen,
    componentPath: '@/components/tools/TestTool',
    tabId: 'test-tool' as TabValue,
    shortcuts: ['Cmd+9', 'Ctrl+9'],
    keywords: ['test', 'testing'],
    requiresDocument: true,
    autoLoad: false,
    capabilities: {
      search: false,
      export: false,
      realtime: false
    }
  }
  
  return { ...defaults, ...overrides }
}

/**
 * Create multiple test tools with different categories
 * 
 * @param count - Number of tools to create
 * @returns Array of test tools
 */
export function createTestTools(count: number = 3): Tool[] {
  const categories: ToolCategory[] = ['navigation', 'analysis', 'generation', 'interactive']
  const icons = [BookOpen, MagnifyingGlass, Robot, ChatCircle]
  
  return Array.from({ length: count }, (_, index) => {
    const category = categories[index % categories.length] as ToolCategory
    const icon = icons[index % icons.length] as Icon
    
    return createTestTool({
      id: `test-tool-${index + 1}`,
      name: `Test Tool ${index + 1}`,
      description: `Test tool ${index + 1} for ${category} testing`,
      category,
      icon,
      tabId: `test-tool-${index + 1}` as TabValue,
      shortcuts: [`Cmd+${index + 1}`, `Ctrl+${index + 1}`],
      keywords: [`test-${index + 1}`, `tool-${index + 1}`, category ?? 'test'] // Unique keywords per tool
    })
  })
}

/**
 * Register a test tool and return it
 * 
 * Convenience function that creates and registers a tool in one call
 * 
 * @param overrides - Tool properties to override
 * @returns The registered tool
 */
export function registerTestTool(overrides: Partial<Tool> = {}): Tool {
  const tool = createTestTool(overrides)
  registerTool(tool, { allowOverwrite: true })
  return tool
}

/**
 * Register multiple test tools
 * 
 * @param count - Number of tools to register
 * @returns Array of registered tools
 */
export function registerTestTools(count: number = 3): Tool[] {
  const tools = createTestTools(count)
  tools.forEach(tool => registerTool(tool, { allowOverwrite: true }))
  return tools
}

/**
 * Create a tool with invalid properties for testing validation
 * 
 * @param invalidField - Which field to make invalid
 * @returns Invalid tool definition
 */
export function createInvalidTestTool(invalidField: string): any {
  const baseTool = createTestTool()
  
  switch (invalidField) {
    case 'id':
      return { ...baseTool, id: null }
    case 'name':
      return { ...baseTool, name: 123 }
    case 'description':
      return { ...baseTool, description: '' }
    case 'category':
      return { ...baseTool, category: 'invalid-category' }
    case 'icon':
      return { ...baseTool, icon: 'not-a-component' }
    case 'componentPath':
      return { ...baseTool, componentPath: null }
    case 'tabId':
      return { ...baseTool, tabId: undefined }
    case 'requiresDocument':
      return { ...baseTool, requiresDocument: 'true' }
    case 'shortcuts':
      return { ...baseTool, shortcuts: 'not-an-array' }
    case 'missing-required':
      return { description: 'Only has description' }
    default:
      throw new Error(`Unknown invalid field: ${invalidField}`)
  }
}

/**
 * Create tools with conflicting properties for testing conflict detection
 * 
 * @returns Array of tools with conflicts
 */
export function createConflictingTestTools(): Tool[] {
  return [
    createTestTool({
      id: 'tool-1',
      name: 'Tool 1',
      shortcuts: ['Cmd+1', 'Ctrl+1'],
      keywords: ['shared', 'tool1']
    }),
    createTestTool({
      id: 'tool-2', 
      name: 'Tool 2',
      shortcuts: ['Cmd+1', 'Ctrl+2'], // Conflicts with tool-1
      keywords: ['shared', 'tool2']   // Conflicts with tool-1
    }),
    createTestTool({
      id: 'tool-3',
      name: 'Tool 3',
      shortcuts: ['Cmd+3', 'Ctrl+3'],
      keywords: ['unique', 'tool3']
    })
  ]
}

/**
 * Mock tool component for testing
 * 
 * @returns Mock React component
 */
export function createMockToolComponent() {
  return function MockToolComponent() {
    return null // React component that renders nothing
  }
}

/**
 * Create a complete test registry with realistic tools
 * 
 * Populates registry with tools similar to the real application
 * for integration testing.
 * 
 * @returns Array of all registered tools
 */
export function createRealisticTestRegistry(): Tool[] {
  const tools: Tool[] = [
    createTestTool({
      id: 'structure',
      name: 'Document Structure',
      description: 'View document structure with original and AI-generated headings',
      category: 'navigation',
      tabId: 'structure',
      shortcuts: ['Cmd+1', 'Ctrl+1'],
      keywords: ['structure', 'headings', 'navigation']
    }),
    createTestTool({
      id: 'summary',
      name: 'Summary',
      description: 'Hierarchical document summaries',
      category: 'generation',
      tabId: 'summary',
      shortcuts: ['Cmd+3', 'Ctrl+3'],
      keywords: ['summary', 'overview', 'hierarchy'],
      capabilities: { export: true }
    }),
    createTestTool({
      id: 'glossary',
      name: 'Glossary',
      description: 'Extract key terms and concepts',
      category: 'analysis',
      tabId: 'glossary',
      shortcuts: ['Cmd+5', 'Ctrl+5'],
      keywords: ['terms', 'definitions', 'concepts'],
      capabilities: { search: true, export: true },
      urlStateKeys: ['term']
    }),
    createTestTool({
      id: 'search',
      name: 'Search',
      description: 'Text and semantic search',
      category: 'interactive',
      tabId: 'search',
      shortcuts: ['Cmd+6', 'Ctrl+6'],
      keywords: ['search', 'find', 'query'],
      capabilities: { search: true, realtime: true },
      urlStateKeys: ['q', 'type', 'case']
    }),
    createTestTool({
      id: 'chat',
      name: 'Chat',
      description: 'AI conversation interface',
      category: 'interactive',
      tabId: 'chat',
      shortcuts: ['Cmd+4', 'Ctrl+4'],
      keywords: ['chat', 'conversation', 'ai'],
      capabilities: { realtime: true },
      urlStateKeys: ['conversation']
    })
  ]
  
  tools.forEach(tool => registerTool(tool, { allowOverwrite: true }))
  return tools
}

/**
 * Assert that registry is empty
 * 
 * Utility for testing registry cleanup
 */
export function assertRegistryEmpty(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stats = require('../registry').getRegistryStats()
  
  if (stats.totalTools !== 0) {
    throw new Error(
      `Registry not empty: ${stats.totalTools} tools remaining. ` +
      `Tool IDs: ${stats.toolIds.join(', ')}`
    )
  }
}

/**
 * Get test-safe registry stats
 * 
 * @returns Registry statistics for testing
 */
export function getTestRegistryStats() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../registry').getRegistryStats()
}

/**
 * Create test tool with specific URL state for testing URL integration
 * 
 * @param urlStateKeys - URL parameters this tool uses
 * @returns Tool with URL state configuration
 */
export function createUrlStateTool(urlStateKeys: string[]): Tool {
  return createTestTool({
    id: 'url-state-tool',
    name: 'URL State Tool',
    description: 'Tool with URL state integration',
    urlStateKeys,
    capabilities: { realtime: true }
  })
}

/**
 * Verify tool registration was successful
 * 
 * @param toolId - Tool ID to verify
 * @throws Error if tool not properly registered
 */
export function verifyToolRegistration(toolId: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getTool } = require('../registry')
  const tool = getTool(toolId)
  
  if (!tool) {
    throw new Error(`Tool not registered: ${toolId}`)
  }
  
  if (tool.id !== toolId) {
    throw new Error(`Tool ID mismatch: expected ${toolId}, got ${tool.id}`)
  }
}

/**
 * Test data sets for common testing scenarios
 */
export const TEST_DATA = {
  /** Valid tool categories */
  VALID_CATEGORIES: ['navigation', 'analysis', 'generation', 'interactive'] as ToolCategory[],
  
  /** Invalid tool categories for testing validation */
  INVALID_CATEGORIES: ['invalid', 'wrong', 'bad-category'],
  
  /** Common keyboard shortcuts */
  COMMON_SHORTCUTS: [
    ['Cmd+1', 'Ctrl+1'],
    ['Cmd+2', 'Ctrl+2'], 
    ['Cmd+3', 'Ctrl+3'],
    ['Cmd+4', 'Ctrl+4'],
    ['Cmd+5', 'Ctrl+5']
  ],
  
  /** Common tool keywords */
  COMMON_KEYWORDS: [
    ['search', 'find', 'query'],
    ['glossary', 'terms', 'definitions'],
    ['summary', 'overview', 'hierarchy'],
    ['chat', 'conversation', 'ai'],
    ['navigation', 'browse', 'view']
  ]
} as const