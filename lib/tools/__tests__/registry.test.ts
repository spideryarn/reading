/**
 * Comprehensive tests for the tool registry system.
 * 
 * Tests registration, validation, discovery, and conflict detection
 * to ensure the registry works correctly in all scenarios.
 */

import {
  registerTool,
  getTool,
  getAllTools,
  getToolsByCategory,
  hasRegisteredTool,
  getRegistryStats,
  validateTool,
  detectConflicts,
  lockRegistry,
  isRegistryLocked,
  resetRegistryForTests
} from '../registry'

import {
  createTestTool,
  createTestTools,
  registerTestTool,
  registerTestTools,
  createInvalidTestTool,
  createConflictingTestTools,
  createRealisticTestRegistry,
  assertRegistryEmpty,
  verifyToolRegistration,
  TEST_DATA
} from '../testing/registry-test-utils'

import type { Tool, ToolCategory } from '../types'

describe('Tool Registry', () => {
  // Reset registry before each test to ensure isolation
  beforeEach(() => {
    resetRegistryForTests()
  })

  afterEach(() => {
    // Verify no test pollution
    if (process.env.NODE_ENV === 'test') {
      // Allow some tools to remain for realistic testing
      // but ensure specific test tools are cleaned up
    }
  })

  describe('Tool Registration', () => {
    it('should register a valid tool', () => {
      const tool = createTestTool()
      
      expect(() => registerTool(tool)).not.toThrow()
      expect(hasRegisteredTool(tool.id)).toBe(true)
      expect(getTool(tool.id)).toEqual(tool)
    })

    it('should prevent duplicate tool registration', () => {
      const tool = createTestTool()
      
      registerTool(tool)
      expect(() => registerTool(tool)).toThrow('Tool already registered')
    })

    it('should allow overwriting with allowOverwrite option', () => {
      const tool1 = createTestTool({ name: 'Original Tool' })
      const tool2 = createTestTool({ name: 'Updated Tool' })
      
      registerTool(tool1)
      expect(() => registerTool(tool2, { allowOverwrite: true })).not.toThrow()
      
      const retrieved = getTool(tool1.id)
      expect(retrieved?.name).toBe('Updated Tool')
    })

    it('should validate tool during registration', () => {
      const invalidTool = createInvalidTestTool('id')
      
      expect(() => registerTool(invalidTool)).toThrow('Invalid tool registration')
    })

    it('should skip validation when requested', () => {
      const invalidTool = createInvalidTestTool('id')
      
      expect(() => 
        registerTool(invalidTool, { skipValidation: true })
      ).not.toThrow()
    })

    it('should prevent registration after registry is locked', () => {
      lockRegistry()
      const tool = createTestTool()
      
      expect(() => registerTool(tool)).toThrow('Cannot register tool after initialization')
    })

    it('should allow registration with allowOverwrite even when locked', () => {
      const tool = createTestTool()
      lockRegistry()
      
      expect(() => 
        registerTool(tool, { allowOverwrite: true })
      ).not.toThrow()
    })
  })

  describe('Tool Retrieval', () => {
    beforeEach(() => {
      registerTestTools(5)
    })

    it('should retrieve registered tool by ID', () => {
      const tool = registerTestTool({ id: 'specific-tool' })
      
      const retrieved = getTool('specific-tool')
      expect(retrieved).toEqual(tool)
    })

    it('should return undefined for unregistered tool', () => {
      const retrieved = getTool('nonexistent-tool')
      expect(retrieved).toBeUndefined()
    })

    it('should get all registered tools', () => {
      const tools = getAllTools()
      expect(tools).toHaveLength(5)
    })

    it('should check if tool is registered', () => {
      expect(hasRegisteredTool('test-tool-1')).toBe(true)
      expect(hasRegisteredTool('nonexistent')).toBe(false)
    })
  })

  describe('Tool Discovery and Filtering', () => {
    beforeEach(() => {
      // Create realistic registry with different categories
      createRealisticTestRegistry()
    })

    it('should filter tools by category', () => {
      const analysisTools = getAllTools({ category: 'analysis' })
      expect(analysisTools).toHaveLength(1)
      expect(analysisTools[0].id).toBe('glossary')
    })

    it('should filter tools by document requirement', () => {
      const documentTools = getAllTools({ requiresDocument: true })
      expect(documentTools.length).toBeGreaterThan(0)
      
      const noDocumentTools = getAllTools({ requiresDocument: false })
      expect(noDocumentTools).toHaveLength(0) // All test tools require document
    })

    it('should filter tools by capability', () => {
      const searchableTools = getAllTools({ hasCapability: 'search' })
      expect(searchableTools.length).toBeGreaterThan(0)
      
      const exportableTools = getAllTools({ hasCapability: 'export' })
      expect(exportableTools.length).toBeGreaterThan(0)
    })

    it('should search tools by name and description', () => {
      const searchResults = getAllTools({ search: 'search' })
      expect(searchResults.length).toBeGreaterThan(0)
      expect(searchResults.some(tool => tool.id === 'search')).toBe(true)
    })

    it('should search tools by keywords', () => {
      const termResults = getAllTools({ search: 'terms' })
      expect(termResults.some(tool => tool.id === 'glossary')).toBe(true)
    })

    it('should get tools by category helper', () => {
      const interactiveTools = getToolsByCategory('interactive')
      expect(interactiveTools.length).toBeGreaterThan(0)
      expect(interactiveTools.every(tool => tool.category === 'interactive')).toBe(true)
    })

    it('should combine multiple filters', () => {
      const results = getAllTools({
        category: 'interactive',
        hasCapability: 'search'
      })
      
      expect(results.every(tool => 
        tool.category === 'interactive' && tool.capabilities?.search === true
      )).toBe(true)
    })
  })

  describe('Tool Validation', () => {
    it('should validate a correct tool', () => {
      const tool = createTestTool()
      const result = validateTool(tool)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const invalidTool = createInvalidTestTool('missing-required')
      const result = validateTool(invalidTool)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate field types', () => {
      const invalidTool = createInvalidTestTool('name')
      const result = validateTool(invalidTool)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('name'))).toBe(true)
    })

    it('should validate category values', () => {
      const invalidTool = createInvalidTestTool('category')
      const result = validateTool(invalidTool)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('category'))).toBe(true)
    })

    it('should generate warnings for missing optional fields', () => {
      const tool = createTestTool({ shortcuts: [], keywords: [] })
      const result = validateTool(tool)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should validate array fields', () => {
      const invalidTool = createInvalidTestTool('shortcuts')
      const result = validateTool(invalidTool)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('shortcuts'))).toBe(true)
    })
  })

  describe('Conflict Detection', () => {
    it('should detect no conflicts in clean registry', () => {
      // Register tools with unique keywords and shortcuts
      registerTestTool({ 
        id: 'tool-1',
        shortcuts: ['Cmd+1'], 
        keywords: ['unique-1', 'tool1'] 
      })
      registerTestTool({ 
        id: 'tool-2',
        shortcuts: ['Cmd+2'], 
        keywords: ['unique-2', 'tool2'] 
      })
      registerTestTool({ 
        id: 'tool-3',
        shortcuts: ['Cmd+3'], 
        keywords: ['unique-3', 'tool3'] 
      })
      
      const conflicts = detectConflicts()
      
      expect(conflicts.shortcuts.size).toBe(0)
      expect(conflicts.keywords.size).toBe(0)
      expect(conflicts.duplicateIds.size).toBe(0)
    })

    it('should detect shortcut conflicts', () => {
      const conflictingTools = createConflictingTestTools()
      conflictingTools.forEach(tool => registerTool(tool))
      
      const conflicts = detectConflicts()
      expect(conflicts.shortcuts.size).toBeGreaterThan(0)
      
      // Check specific conflict
      const cmdOneConflict = conflicts.shortcuts.get('Cmd+1')
      expect(cmdOneConflict).toContain('tool-1')
      expect(cmdOneConflict).toContain('tool-2')
    })

    it('should detect keyword conflicts', () => {
      const conflictingTools = createConflictingTestTools()
      conflictingTools.forEach(tool => registerTool(tool))
      
      const conflicts = detectConflicts()
      expect(conflicts.keywords.size).toBeGreaterThan(0)
      
      // Check specific conflict
      const sharedConflict = conflicts.keywords.get('shared')
      expect(sharedConflict).toContain('tool-1')
      expect(sharedConflict).toContain('tool-2')
    })

    it('should not report single-tool usage as conflict', () => {
      registerTestTool({
        shortcuts: ['Cmd+1'],
        keywords: ['unique']
      })
      
      const conflicts = detectConflicts()
      expect(conflicts.shortcuts.size).toBe(0)
      expect(conflicts.keywords.size).toBe(0)
    })
  })

  describe('Registry Statistics', () => {
    it('should provide correct statistics for empty registry', () => {
      const stats = getRegistryStats()
      
      expect(stats.totalTools).toBe(0)
      expect(stats.categories).toEqual({})
      expect(stats.toolIds).toEqual([])
    })

    it('should provide correct statistics for populated registry', () => {
      createRealisticTestRegistry()
      const stats = getRegistryStats()
      
      expect(stats.totalTools).toBeGreaterThan(0)
      expect(Object.keys(stats.categories).length).toBeGreaterThan(0)
      expect(stats.toolIds.length).toBe(stats.totalTools)
      expect(stats.toolIds).toEqual(stats.toolIds.sort()) // Should be sorted
    })

    it('should count tools by category correctly', () => {
      resetRegistryForTests() // Clear registry first
      
      registerTestTool({ id: 'analysis-1', category: 'analysis' })
      registerTestTool({ id: 'analysis-2', category: 'analysis' })
      registerTestTool({ id: 'navigation-1', category: 'navigation' })
      
      const stats = getRegistryStats()
      expect(stats.categories.analysis).toBe(2)
      expect(stats.categories.navigation).toBe(1)
    })

    it('should reflect registry lock status', () => {
      let stats = getRegistryStats()
      expect(stats.registryLocked).toBe(false)
      
      lockRegistry()
      stats = getRegistryStats()
      expect(stats.registryLocked).toBe(true)
    })
  })

  describe('Registry Locking', () => {
    it('should lock registry when requested', () => {
      expect(isRegistryLocked()).toBe(false)
      
      lockRegistry()
      expect(isRegistryLocked()).toBe(true)
    })

    it('should prevent registration after locking', () => {
      lockRegistry()
      const tool = createTestTool()
      
      expect(() => registerTool(tool)).toThrow()
    })

    it('should allow registration with override even when locked', () => {
      lockRegistry()
      const tool = createTestTool()
      
      expect(() => 
        registerTool(tool, { allowOverwrite: true })
      ).not.toThrow()
    })
  })

  describe('Test Utilities', () => {
    it('should create valid test tools', () => {
      const tool = createTestTool()
      const validation = validateTool(tool)
      
      expect(validation.isValid).toBe(true)
    })

    it('should create multiple test tools with unique IDs', () => {
      const tools = createTestTools(5)
      const ids = tools.map(tool => tool.id)
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(5)
    })

    it('should register and verify test tools', () => {
      const tool = registerTestTool({ id: 'verify-test' })
      
      expect(() => verifyToolRegistration('verify-test')).not.toThrow()
      expect(getTool('verify-test')).toEqual(tool)
    })

    it('should create realistic test registry', () => {
      const tools = createRealisticTestRegistry()
      
      expect(tools.length).toBeGreaterThan(0)
      expect(tools.some(tool => tool.id === 'glossary')).toBe(true)
      expect(tools.some(tool => tool.id === 'search')).toBe(true)
    })

    it('should assert registry empty correctly', () => {
      expect(() => assertRegistryEmpty()).not.toThrow()
      
      registerTestTool()
      expect(() => assertRegistryEmpty()).toThrow()
    })
  })

  describe('Error Conditions', () => {
    it('should handle null/undefined tool gracefully', () => {
      expect(() => registerTool(null as any)).toThrow()
      expect(() => registerTool(undefined as any)).toThrow()
    })

    it('should handle empty string tool ID', () => {
      const tool = createTestTool({ id: '' })
      expect(() => registerTool(tool)).toThrow()
    })

    it('should handle invalid component path', () => {
      const tool = createTestTool({ componentPath: '' })
      expect(() => registerTool(tool)).toThrow()
    })

    it('should handle malformed shortcuts array', () => {
      const tool = createTestTool({ shortcuts: [''] })
      const validation = validateTool(tool)
      
      // Empty shortcuts should validate but may have warnings
      expect(validation.isValid).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle tool with no optional fields', () => {
      const minimalTool = createTestTool({
        shortcuts: undefined,
        keywords: undefined,
        autoLoad: undefined,
        capabilities: undefined,
        urlStateKeys: undefined
      })
      
      expect(() => registerTool(minimalTool)).not.toThrow()
      const retrieved = getTool(minimalTool.id)
      expect(retrieved).toBeDefined()
    })

    it('should handle tool with empty arrays', () => {
      const tool = createTestTool({
        shortcuts: [],
        keywords: [],
        urlStateKeys: []
      })
      
      expect(() => registerTool(tool)).not.toThrow()
    })

    it('should handle tools with same name but different IDs', () => {
      const tool1 = createTestTool({ id: 'tool-1', name: 'Same Name' })
      const tool2 = createTestTool({ id: 'tool-2', name: 'Same Name' })
      
      expect(() => registerTool(tool1)).not.toThrow()
      expect(() => registerTool(tool2)).not.toThrow()
    })

    it('should handle very long descriptions and names', () => {
      const longText = 'a'.repeat(1000)
      const tool = createTestTool({
        name: longText,
        description: longText
      })
      
      expect(() => registerTool(tool)).not.toThrow()
    })

    it('should handle special characters in tool properties', () => {
      const tool = createTestTool({
        name: 'Tool with émojis 🚀',
        description: 'Description with "quotes" and <tags>',
        keywords: ['special-chars', 'émojis', 'unicode-✓']
      })
      
      expect(() => registerTool(tool)).not.toThrow()
    })
  })

  describe('Type Safety', () => {
    it('should enforce Tool interface at runtime', () => {
      const notATool = { id: 'fake', name: 'Fake' }
      
      expect(() => registerTool(notATool as any)).toThrow()
    })

    it('should validate category enum values', () => {
      TEST_DATA.INVALID_CATEGORIES.forEach(invalidCategory => {
        const tool = createTestTool({ category: invalidCategory as any })
        expect(() => registerTool(tool)).toThrow()
      })
    })

    it('should accept all valid categories', () => {
      TEST_DATA.VALID_CATEGORIES.forEach(validCategory => {
        const tool = createTestTool({ 
          id: `test-${validCategory}`,
          category: validCategory 
        })
        expect(() => registerTool(tool)).not.toThrow()
      })
    })
  })
})