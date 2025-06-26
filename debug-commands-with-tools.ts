/**
 * Debug command generation with manually loaded tools
 */

async function debugCommandsWithTools() {
  console.log('🔍 Debug: Testing command generation with loaded tools...\n')

  try {
    // First load all tools using our working method
    console.log('1. Loading tools manually...')
    const { registerTool, getAllTools } = await import('./lib/tools/registry')
    
    // Import all tools (they auto-register via side effects)
    await import('./lib/tools/implementations/glossary')
    await import('./lib/tools/implementations/metadata')
    await import('./lib/tools/implementations/toc-original')
    await import('./lib/tools/implementations/toc-ai')
    await import('./lib/tools/implementations/chat')
    await import('./lib/tools/implementations/search')
    await import('./lib/tools/implementations/summary')
    await import('./lib/tools/implementations/highlights')
    
    const tools = getAllTools()
    console.log(`   Loaded ${tools.length} tools: ${tools.map(t => t.id).join(', ')}`)

    // Test command generation
    console.log('\n2. Testing generateCommandsFromRegistry():')
    const { generateCommandsFromRegistry } = await import('./lib/tools/command-generation')
    
    const commands = generateCommandsFromRegistry(tools, {
      getNavigateToTab: () => (tabId: string) => console.log(`Navigate to: ${tabId}`),
      getCurrentDocument: () => ({ id: 'test-doc' }),
      isMac: false
    })
    
    console.log(`   Generated ${commands.length} commands`)
    
    if (commands.length === 0) {
      console.log('   ❌ No commands generated!')
    } else {
      console.log('   ✅ Commands generated successfully!')
      console.log('   Command IDs:', commands.map(c => c.id).join(', '))
      
      // Show sample command structure
      const firstCommand = commands[0]
      console.log('\n   Sample command structure:')
      console.log('   {')
      console.log(`     id: '${firstCommand.id}',`)
      console.log(`     name: '${firstCommand.name}',`)
      console.log(`     keywords: [${firstCommand.keywords.map(k => `'${k}'`).join(', ')}],`)
      console.log(`     shortcut: ${JSON.stringify(firstCommand.shortcut)},`)
      console.log(`     category: { id: '${firstCommand.category.id}', name: '${firstCommand.category.name}' },`)
      console.log(`     hasAction: ${typeof firstCommand.action === 'function'},`)
      console.log(`     hasCondition: ${typeof firstCommand.condition === 'function'},`)
      console.log(`     hasIcon: ${typeof firstCommand.icon === 'function'}`)
      console.log('   }')
    }
    
  } catch (error) {
    console.error('❌ Error during command generation test:', error)
    if (error instanceof Error) {
      console.error('   Stack:', error.stack)
    }
  }
}

debugCommandsWithTools()