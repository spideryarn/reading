/**
 * Integration tests for the tool registry system.
 * 
 * Tests that tools can be registered and discovered correctly
 * in realistic scenarios.
 */

import { getTool, getAllTools, getRegistryStats } from '../registry'
import { initializeToolRegistry } from '../registry-loader'

describe('Tool Registry Integration', () => {
  
  it('should load glossary tool from implementation', async () => {
    // Manually initialize for this test
    await initializeToolRegistry()
    
    const glossaryTool = getTool('glossary')
    
    expect(glossaryTool).toBeDefined()
    expect(glossaryTool?.name).toBe('Glossary')
    expect(glossaryTool?.category).toBe('analysis')
    expect(glossaryTool?.requiresDocument).toBe(true)
    expect(glossaryTool?.capabilities?.search).toBe(true)
    expect(glossaryTool?.urlStateKeys).toContain('term')
  })

  it('should include glossary in analysis tools', async () => {
    await initializeToolRegistry()
    
    const analysisTools = getAllTools({ category: 'analysis' })
    
    expect(analysisTools.length).toBeGreaterThan(0)
    expect(analysisTools.some(tool => tool.id === 'glossary')).toBe(true)
  })

  it('should find glossary by keyword search', async () => {
    await initializeToolRegistry()
    
    const searchResults = getAllTools({ search: 'terms' })
    
    expect(searchResults.some(tool => tool.id === 'glossary')).toBe(true)
  })

  it('should reflect loaded tools in registry stats', async () => {
    await initializeToolRegistry()
    
    const stats = getRegistryStats()
    
    expect(stats.totalTools).toBeGreaterThan(0)
    expect(stats.toolIds).toContain('glossary')
    expect(stats.categories.analysis).toBeGreaterThan(0)
    expect(stats.registryLocked).toBe(true)
  })

  it('should have valid tool configurations', async () => {
    await initializeToolRegistry()
    
    const tools = getAllTools()
    
    tools.forEach(tool => {
      expect(tool.id).toBeTruthy()
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.componentPath).toBeTruthy()
      expect(tool.icon).toBeTruthy()
      expect(['navigation', 'analysis', 'generation', 'interactive']).toContain(tool.category)
    })
  })
})