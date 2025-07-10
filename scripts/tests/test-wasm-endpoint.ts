#!/usr/bin/env tsx
/**
 * Test the WASM PDF endpoint locally and on Vercel
 * 
 * Usage:
 *   npx tsx scripts/tests/test-wasm-endpoint.ts [local|vercel-preview|vercel-prod]
 */

import { readFile } from 'fs/promises'
import { join } from 'path'

async function testEndpoint(baseUrl: string) {
  console.log(`\n🧪 Testing WASM PDF endpoint at: ${baseUrl}\n`)
  
  // Test 1: Health check
  console.log('1️⃣ Health Check:')
  try {
    const healthRes = await fetch(`${baseUrl}/api/test-pdf-wasm`)
    const health = await healthRes.json()
    console.log('✅ Health check passed:', health)
  } catch (err) {
    console.error('❌ Health check failed:', err)
  }
  
  // Test each method
  const methods = ['direct', 'napi', 'wasm', 'auto']
  
  for (const method of methods) {
    console.log(`\n2️⃣ Testing ${method.toUpperCase()} method:`)
    
    try {
      const res = await fetch(`${baseUrl}/api/test-pdf-wasm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType: 'bbox',
          method
        })
      })
      
      const result = await res.json()
      
      if (result.success) {
        console.log(`✅ ${method} method succeeded:`)
        console.log(`   - Extract duration: ${result.performance.extractDuration}ms`)
        console.log(`   - Cold start (approx): ${result.performance.coldStartApprox}ms`)
        console.log(`   - Memory used: ${result.performance.memoryMB.heapUsed}MB`)
        console.log(`   - Image size: ${result.result.width}x${result.result.height}`)
      } else {
        console.log(`❌ ${method} method failed:`)
        console.log(`   - Error: ${result.error}`)
        console.log(`   - Type: ${JSON.stringify(result.errorType)}`)
      }
    } catch (err) {
      console.error(`❌ ${method} method request failed:`, err)
    }
  }
  
  // Test 3: Performance test
  console.log('\n3️⃣ Performance Test (multiple extractions):')
  try {
    const startTime = Date.now()
    const promises = []
    
    // Run 3 concurrent requests
    for (let i = 0; i < 3; i++) {
      promises.push(
        fetch(`${baseUrl}/api/test-pdf-wasm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testType: 'performance',
            method: 'auto'
          })
        }).then(r => r.json())
      )
    }
    
    const results = await Promise.all(promises)
    const totalTime = Date.now() - startTime
    
    const successCount = results.filter(r => r.success).length
    console.log(`✅ Completed ${successCount}/3 requests in ${totalTime}ms`)
    console.log(`   - Average time: ${Math.round(totalTime / 3)}ms per request`)
    
  } catch (err) {
    console.error('❌ Performance test failed:', err)
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
}

// Main execution
async function main() {
  const target = process.argv[2] || 'local'
  
  let baseUrl: string
  
  switch (target) {
    case 'local':
      const port = process.env.PORT || '3000'
      baseUrl = `http://localhost:${port}`
      break
    case 'vercel-preview':
      // You'll need to update this with your actual preview URL
      baseUrl = process.env.VERCEL_PREVIEW_URL || 'https://spideryarn-preview.vercel.app'
      break
    case 'vercel-prod':
      baseUrl = 'https://www.spideryarn.com'
      break
    default:
      console.error('Unknown target:', target)
      console.log('Usage: test-wasm-endpoint.ts [local|vercel-preview|vercel-prod]')
      process.exit(1)
  }
  
  console.log(`🔧 Testing target: ${target}`)
  console.log(`🌐 Base URL: ${baseUrl}`)
  
  // Test local endpoint
  await testEndpoint(baseUrl)
  
  // Summary
  console.log('📊 Test Summary:')
  console.log('- Direct extraction: Works for embedded images only')
  console.log('- NAPI Canvas: Should work on Vercel (WASM-based)')
  console.log('- Pure WASM: Fallback for complex PDFs')
  console.log('- Auto mode: Tries methods in order for best performance')
  
  if (target === 'local') {
    console.log('\n💡 Next steps:')
    console.log('1. Deploy to Vercel preview: git push to a branch')
    console.log('2. Test on preview: npx tsx scripts/tests/test-wasm-endpoint.ts vercel-preview')
    console.log('3. Check Vercel logs for any deployment issues')
  }
}

main().catch(console.error)