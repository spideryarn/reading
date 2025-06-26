/**
 * Debug full tool loading process
 */

async function debugFullLoading() {
  console.log('🔍 Debug: Testing full tool loading process...\n')

  try {
    // Replicate the exact loadAllTools() process
    console.log('1. Getting registry functions...')
    const { registerTool, getAllTools, getRegistryStats } = await import('./lib/tools/registry')
    
    const checkRegistry = () => {
      const tools = getAllTools()
      const stats = getRegistryStats()
      console.log(`   Registry: ${tools.length} tools, locked: ${stats.registryLocked}`)
      if (tools.length > 0) {
        console.log(`   Tools: ${tools.map(t => t.id).join(', ')}`)
      }
    }
    
    checkRegistry()

    console.log('\n2. Importing tool modules...')
    
    // Try each import individually to catch errors
    const toolModules: any[] = []
    
    try {
      console.log('   Importing glossary...')
      const glossaryModule = await import('./lib/tools/implementations/glossary')
      toolModules.push({ name: 'glossary', module: glossaryModule })
      checkRegistry()
    } catch (e) {
      console.error('   ❌ Failed to import glossary:', e)
    }
    
    try {
      console.log('   Importing metadata...')
      const metadataModule = await import('./lib/tools/implementations/metadata')
      toolModules.push({ name: 'metadata', module: metadataModule })
      checkRegistry()
    } catch (e) {
      console.error('   ❌ Failed to import metadata:', e)
    }
    
    try {
      console.log('   Importing toc-original...')
      const originalTocModule = await import('./lib/tools/implementations/toc-original')
      toolModules.push({ name: 'toc-original', module: originalTocModule })
      checkRegistry()
    } catch (e) {
      console.error('   ❌ Failed to import toc-original:', e)
    }
    
    try {
      console.log('   Importing toc-ai...')
      const aiTocModule = await import('./lib/tools/implementations/toc-ai')
      toolModules.push({ name: 'toc-ai', module: aiTocModule })
      checkRegistry()
    } catch (e) {
      console.error('   ❌ Failed to import toc-ai:', e)
    }
    
    try {
      console.log('   Importing chat...')
      const chatModule = await import('./lib/tools/implementations/chat')
      toolModules.push({ name: 'chat', module: chatModule })
      checkRegistry()
    } catch (e) {
      console.error('   ❌ Failed to import chat:', e)
    }
    
    try {
      console.log('   Importing search...')
      const searchModule = await import('./lib/tools/implementations/search')
      toolModules.push({ name: 'search', module: searchModule })
      checkRegistry()
    } catch (e) {
      console.error('   ❌ Failed to import search:', e)
    }
    
    try {
      console.log('   Importing summary...')
      const summaryModule = await import('./lib/tools/implementations/summary')
      toolModules.push({ name: 'summary', module: summaryModule })
      checkRegistry()
    } catch (e) {
      console.error('   ❌ Failed to import summary:', e)
    }
    
    try {
      console.log('   Importing highlights...')
      const highlightsModule = await import('./lib/tools/implementations/highlights')
      toolModules.push({ name: 'highlights', module: highlightsModule })
      checkRegistry()
    } catch (e) {
      console.error('   ❌ Failed to import highlights:', e)
    }

    console.log('\n3. Summary of imported modules:')
    toolModules.forEach(({ name, module }) => {
      console.log(`   ${name}: has default = ${!!module.default}`)
      if (module.default) {
        console.log(`     ID: ${module.default.id}, Name: ${module.default.name}`)
      }
    })

    console.log('\n4. Final registry state after all imports:')
    checkRegistry()

  } catch (error) {
    console.error('❌ Error during full loading test:', error)
    if (error instanceof Error) {
      console.error('   Stack:', error.stack)
    }
  }
}

debugFullLoading()