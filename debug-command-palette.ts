/**
 * Debug script to test command palette command generation
 * Run with: npx tsx debug-command-palette.ts
 */

import { getAllTools, getRegistryStats } from './lib/tools/registry'
import { generateCommandsFromRegistry } from './lib/tools/command-generation'
import { initializeToolRegistry } from './lib/tools/registry-loader'

async function debugCommandGeneration() {
  console.log('🔍 Debug: Testing command palette command generation...\n')

  try {
    // First, test the tool registry before initialization
    console.log('1. Testing getAllTools() before initialization:')
    const toolsBeforeInit = getAllTools()
    console.log(`   Found ${toolsBeforeInit.length} tools`)
    
    if (toolsBeforeInit.length === 0) {
      const stats = getRegistryStats()
      console.log('   Registry stats before init:', stats)
    } else {
      console.log('   Tools found before init:', toolsBeforeInit.map(t => t.id))
    }

    // Initialize tool registry
    console.log('\n2. Initializing tool registry...')
    await initializeToolRegistry()
    console.log('   ✅ Tool registry initialized')

    // Test again after initialization
    console.log('\n3. Testing getAllTools() after initialization:')
    const tools = getAllTools()
    console.log(`   Found ${tools.length} tools`)
    
    if (tools.length === 0) {
      console.log('   ❌ Still no tools found in registry!')
      const stats = getRegistryStats()
      console.log('   Registry stats after init:', stats)
      return
    }
    
    console.log('   Tools found:', tools.map(t => t.id))

    // Test command generation
    console.log('\n4. Testing generateCommandsFromRegistry():')
    const commands = generateCommandsFromRegistry(tools, {
      getNavigateToTab: () => (tabId: string) => console.log(`Navigate to: ${tabId}`),
      getCurrentDocument: () => ({ id: 'test-doc' }),
      isMac: false
    })
    
    console.log(`   Generated ${commands.length} commands`)
    
    if (commands.length === 0) {
      console.log('   ❌ No commands generated!')
    } else {
      console.log('   Commands:', commands.map(c => c.id))
      
      // Show first command details
      console.log('\n   First command details:')
      const firstCommand = commands[0]
      console.log('   ID:', firstCommand.id)
      console.log('   Name:', firstCommand.name)
      console.log('   Keywords:', firstCommand.keywords)
      console.log('   Shortcut:', firstCommand.shortcut)
      console.log('   Category:', firstCommand.category)
      console.log('   Has action:', typeof firstCommand.action === 'function')
      console.log('   Has condition:', typeof firstCommand.condition === 'function')
      console.log('   Has icon:', typeof firstCommand.icon === 'function')
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error)
    if (error instanceof Error) {
      console.error('   Stack trace:', error.stack)
    }
  }
}

// Run the debug function
debugCommandGeneration()