/**
 * Direct test of canvas module imports to reproduce NODE_MODULE_VERSION mismatch.
 * This bypasses the PDF extraction pipeline to isolate the canvas import issue.
 * 
 * Usage:
 *   npx tsx scripts/tests/repro-canvas-import-direct.ts
 */

async function testCanvasImport(moduleName: string): Promise<void> {
  console.log(`\n🔍 Testing import of "${moduleName}"...`)
  
  try {
    const start = Date.now()
    const canvasModule = await import(moduleName)
    const elapsed = Date.now() - start
    
    console.log(`✅ Successfully imported in ${elapsed}ms`)
    
    // Check for common canvas exports
    const exports = Object.keys(canvasModule)
    console.log(`   Exports: ${exports.slice(0, 5).join(', ')}${exports.length > 5 ? '...' : ''}`)
    
    // Try to access Canvas constructor (the main export we need)
    if ('Canvas' in canvasModule || 'createCanvas' in canvasModule) {
      console.log('   Canvas constructor/factory found ✓')
    }
    
    // Check for Path2D which is needed by PDF.js
    if ('Path2D' in canvasModule) {
      console.log('   Path2D found ✓ (required by PDF.js)')
    }
    
  } catch (error) {
    console.error(`❌ Failed to import "${moduleName}"`)
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    
    // Check if it's the NODE_MODULE_VERSION error
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('NODE_MODULE_VERSION')) {
      console.log('\n⚠️  NODE_MODULE_VERSION mismatch detected!')
      
      // Extract version numbers from error message
      const match127 = errorMessage.match(/NODE_MODULE_VERSION (\d+)/)
      const match137 = errorMessage.match(/NODE_MODULE_VERSION (\d+).*This version.*NODE_MODULE_VERSION (\d+)/)
      
      if (match137) {
        console.log(`   Module compiled for: NODE_MODULE_VERSION ${match137[1]}`)
        console.log(`   Current Node requires: NODE_MODULE_VERSION ${match137[2]}`)
      }
    }
    
    throw error
  }
}

async function main() {
  console.log('Node.js version:', process.version)
  console.log('Platform:', process.platform)
  console.log('Architecture:', process.arch)
  
  let napiSuccess = false
  let canvasSuccess = false
  
  // Test @napi-rs/canvas first (preferred)
  try {
    await testCanvasImport('@napi-rs/canvas')
    napiSuccess = true
  } catch (e) {
    // Failed to import
  }
  
  // Test fallback canvas module
  try {
    await testCanvasImport('canvas')
    canvasSuccess = true
  } catch (e) {
    // Failed to import
  }
  
  console.log('\n📊 Summary:')
  if (napiSuccess && canvasSuccess) {
    console.log('✅ Both canvas modules imported successfully.')
    console.log('PDF image extraction should work correctly.')
  } else if (napiSuccess || canvasSuccess) {
    console.log(`⚠️  Partial success: ${napiSuccess ? '@napi-rs/canvas' : 'canvas'} imported successfully.`)
    console.log('PDF image extraction may work with fallback.')
  } else {
    console.log('❌ Both canvas modules failed to import due to NODE_MODULE_VERSION mismatch.')
    console.log('This confirms the issue affecting PDF image extraction.')
  }
}

main().catch((err) => {
  console.error('\n💥 Test failed:', err)
  process.exit(1)
}) 