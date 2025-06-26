/**
 * Debug exact registry loader code 
 */

// Copy the exact loadAllTools function from registry-loader.ts
async function loadAllTools() {
  // Import all tool implementations
  // Each file will register its tool during import
  
  try {
    // Get registry functions - force re-registration with allowOverwrite
    const { registerTool } = await import('./lib/tools/registry')
    
    // Analysis tools
    const glossaryModule = await import('./lib/tools/implementations/glossary')
    const metadataModule = await import('./lib/tools/implementations/metadata')
    
    // Navigation tools
    const originalTocModule = await import('./lib/tools/implementations/toc-original')
    const aiTocModule = await import('./lib/tools/implementations/toc-ai')
    
    // Interactive tools
    const chatModule = await import('./lib/tools/implementations/chat')
    const searchModule = await import('./lib/tools/implementations/search')
    
    // Generation tools
    const summaryModule = await import('./lib/tools/implementations/summary')
    const highlightsModule = await import('./lib/tools/implementations/highlights')
    
    // Re-register all tools in TOOL_ORDER sequence to ensure consistent ordering
    // This matches the expected order in command-generation.ts TOOL_ORDER array
    const toolModules = [
      originalTocModule,   // 'original' - should be first
      aiTocModule,         // 'ai-generated' - should be second  
      summaryModule,       // 'summary' - should be third
      chatModule,          // 'chat' - should be fourth
      glossaryModule,      // 'glossary' - should be fifth
      searchModule,        // 'search' - should be sixth
      highlightsModule,    // 'highlights' - should be seventh
      metadataModule       // 'metadata' - should be last
    ]
    
    for (const toolModule of toolModules) {
      if (toolModule.default) {
        registerTool(toolModule.default, { allowOverwrite: true })
      }
    }
    
    console.log('✅ All tool implementations loaded successfully')
  } catch (error) {
    console.error('❌ Failed to load tool implementations:', error)
    throw error
  }
}

async function initializeToolRegistry() {
  try {
    // Check registry before loading
    const { getAllTools: getToolsBefore, getRegistryStats, lockRegistry } = await import('./lib/tools/registry')
    const toolsBefore = getToolsBefore()
    console.log(`🔧 Registry before loading: ${toolsBefore.length} tools`)
    
    // Load all tool implementations
    await loadAllTools()
    
    // Check registry after loading
    const toolsAfterLoad = getToolsBefore()
    console.log(`🔧 Registry after loading: ${toolsAfterLoad.length} tools`)
    if (toolsAfterLoad.length > 0) {
      console.log(`   Tools: ${toolsAfterLoad.map(t => t.id).join(', ')}`)
    }
    
    // Lock the registry to prevent further registrations
    lockRegistry()
    
    // Log registry statistics
    const stats = getRegistryStats()
    console.log(`🔧 Tool registry initialized with ${stats.totalTools} tools:`)
    console.log(`   Categories: ${JSON.stringify(stats.categories)}`)
    console.log(`   Tools: ${stats.toolIds.join(', ')}`)
    
    if (process.env.NODE_ENV === 'development') {
      // Additional development logging
      console.log('🛠️  Development mode: UNREGISTERED_TOOL_GUARD enabled')
    }
  } catch (error) {
    console.error('💥 Failed to initialize tool registry:', error)
    throw error
  }
}

// Run the debug
initializeToolRegistry()