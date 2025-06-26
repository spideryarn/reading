/**
 * Debug individual tool module loading
 */

async function debugToolModules() {
  console.log('🔍 Debug: Testing individual tool module loading...\n')

  try {
    console.log('1. Testing glossary module import:')
    const glossaryModule = await import('./lib/tools/implementations/glossary')
    console.log('   Glossary module loaded:', !!glossaryModule)
    console.log('   Has default export:', !!glossaryModule.default)
    if (glossaryModule.default) {
      console.log('   Tool ID:', glossaryModule.default.id)
      console.log('   Tool name:', glossaryModule.default.name)
    }

    console.log('\n2. Testing registry after single import:')
    const { getAllTools } = await import('./lib/tools/registry')
    const tools = getAllTools()
    console.log(`   Found ${tools.length} tools after glossary import`)
    if (tools.length > 0) {
      console.log('   Tools:', tools.map(t => t.id))
    }

    console.log('\n3. Testing manual registration:')
    const { registerTool } = await import('./lib/tools/registry')
    if (glossaryModule.default) {
      registerTool(glossaryModule.default, { allowOverwrite: true })
      console.log('   ✅ Manually registered glossary tool')
      
      const toolsAfterManual = getAllTools()
      console.log(`   Found ${toolsAfterManual.length} tools after manual registration`)
      if (toolsAfterManual.length > 0) {
        console.log('   Tools:', toolsAfterManual.map(t => t.id))
      }
    }

  } catch (error) {
    console.error('❌ Error during module testing:', error)
  }
}

debugToolModules()