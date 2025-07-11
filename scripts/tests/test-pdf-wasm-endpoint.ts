#!/usr/bin/env npx tsx
/**
 * Test the /api/test-pdf-wasm endpoint to reproduce the native binding error
 * 
 * This endpoint already exists and can test the hybrid extractor methods
 * in the proper Next.js request context.
 */

async function main() {
  console.log('=== Test PDF WASM Endpoint ===\n')
  
  const apiUrl = `http://localhost:${process.env.PORT || 3001}/api/test-pdf-wasm`
  
  const testConfigs = [
    { method: 'auto', description: 'Auto (try all methods)' },
    { method: 'direct', description: 'Direct extraction only' },
    { method: 'napi', description: '@napi-rs/canvas only' },
    { method: 'wasm', description: 'Pure WASM only' }
  ]
  
  for (const config of testConfigs) {
    console.log(`\nTesting ${config.description}...`)
    console.log('=' .repeat(40))
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testType: 'simple',
          method: config.method
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ Success!')
        console.log(`- Method: ${config.method}`)
        console.log(`- Extract duration: ${result.performance.extractDuration}ms`)
        console.log(`- Memory used: ${result.performance.memoryMB.heapUsed}MB`)
        console.log(`- Image size: ${result.result.width}x${result.result.height}`)
      } else {
        console.error('❌ Failed!')
        console.error(`- Error: ${result.error}`)
        
        // Check for native binding error
        if (result.error && (result.error.includes('native binding') || result.error.includes('NODE_MODULE_VERSION'))) {
          console.error('⚠️  Native binding error detected!')
          console.error(`- Is NODE_MODULE_VERSION error: ${result.errorType.isNodeModuleError}`)
          console.error(`- Is WASM error: ${result.errorType.isWasmError}`)
          console.error(`- Is memory error: ${result.errorType.isMemoryError}`)
        }
      }
    } catch (error) {
      console.error('❌ Request failed!')
      console.error(`- Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  console.log('\n' + '=' .repeat(40))
  console.log('Test complete!')
}

// Run the test
main().catch(console.error)