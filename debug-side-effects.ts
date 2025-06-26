/**
 * Debug side-effect registration in tool modules
 */

async function debugSideEffects() {
  console.log('🔍 Debug: Testing side-effect registration...\n')

  try {
    // First check registry before any imports
    console.log('1. Registry state before any imports:')
    const { getAllTools: getToolsBefore, getRegistryStats: getStatsBefore } = await import('./lib/tools/registry')
    const toolsBefore = getToolsBefore()
    const statsBefore = getStatsBefore()
    console.log(`   Tools before: ${toolsBefore.length}`)
    console.log('   Registry before:', statsBefore)

    // Import glossary module and check if side effect ran
    console.log('\n2. Importing glossary module...')
    const glossaryModule = await import('./lib/tools/implementations/glossary')
    console.log('   Glossary module imported')

    // Check registry after import
    console.log('\n3. Registry state after glossary import:')
    const toolsAfter = getToolsBefore() // Using same import reference
    console.log(`   Tools after import: ${toolsAfter.length}`)
    if (toolsAfter.length > 0) {
      console.log('   Tools:', toolsAfter.map(t => t.id))
    }

    // Let's test the exact same pattern from the registry loader
    console.log('\n4. Testing registry loader pattern:')
    const { registerTool } = await import('./lib/tools/registry')
    
    if (glossaryModule.default) {
      console.log('   Re-registering with allowOverwrite...')
      registerTool(glossaryModule.default, { allowOverwrite: true })
      
      const toolsAfterReregister = getToolsBefore()
      console.log(`   Tools after re-register: ${toolsAfterReregister.length}`)
      if (toolsAfterReregister.length > 0) {
        console.log('   Tools:', toolsAfterReregister.map(t => t.id))
      }
    }

  } catch (error) {
    console.error('❌ Error during side effect testing:', error)
    if (error instanceof Error) {
      console.error('   Stack:', error.stack)
    }
  }
}

debugSideEffects()