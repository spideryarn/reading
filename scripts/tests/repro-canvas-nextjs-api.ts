/**
 * Test canvas imports in a simulated Next.js-like environment.
 * This attempts to reproduce the NODE_MODULE_VERSION error that occurs
 * in the actual Next.js API routes but not in standalone scripts.
 * 
 * Usage:
 *   npx tsx scripts/tests/repro-canvas-nextjs-api.ts
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Simulate Next.js module resolution by manipulating require paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function testCanvasInApiRoute() {
  console.log('🔍 Testing canvas import as it would happen in Next.js API route...\n')
  
  // First, let's check if the canvas.node file exists
  const fs = await import('fs/promises')
  const canvasNodePath = join(__dirname, '../../node_modules/canvas/build/Release/canvas.node')
  
  try {
    const stats = await fs.stat(canvasNodePath)
    console.log(`✓ canvas.node exists at: ${canvasNodePath}`)
    console.log(`  Size: ${stats.size} bytes`)
    console.log(`  Modified: ${stats.mtime}`)
  } catch (e) {
    console.log(`✗ canvas.node not found at expected path`)
  }
  
  // Try to load the native module info
  try {
    const { execSync } = await import('child_process')
    const nodeAbi = execSync('node -p "process.versions.modules"').toString().trim()
    console.log(`\nCurrent Node.js ABI version: ${nodeAbi}`)
    
    // Check what ABI version the canvas module was built for
    const output = execSync('file node_modules/canvas/build/Release/canvas.node || echo "file command not available"', {
      cwd: join(__dirname, '../..'),
      encoding: 'utf8'
    })
    console.log(`Canvas module info: ${output.trim()}`)
  } catch (e) {
    console.log('Could not inspect native module')
  }
  
  console.log('\n📋 Attempting dynamic import (as used in pdf-image-extractor-server.ts)...')
  
  // Test the exact import pattern used in the code
  const canvasImport = async () => {
    try {
      const canvasModule = await import('@napi-rs/canvas')
      console.log('✅ @napi-rs/canvas imported successfully')
      return canvasModule
    } catch (err) {
      const msg = (err as any)?.message ?? err
      console.warn('⚠️  @napi-rs/canvas import failed:', msg)
      console.log('   Falling back to canvas module...')
      
      try {
        const fallback = await import('canvas')
        console.log('✅ canvas module imported successfully')
        return fallback
      } catch (fallbackErr) {
        console.error('❌ canvas fallback also failed:', (fallbackErr as any)?.message ?? fallbackErr)
        throw fallbackErr
      }
    }
  }
  
  try {
    const canvasModule = await canvasImport()
    console.log('\n✅ Canvas import succeeded (this is unexpected in the error case)')
    
    // Test if we can actually use the canvas
    if ('createCanvas' in canvasModule) {
      const canvas = canvasModule.createCanvas(100, 100)
      console.log('✅ Canvas instance created successfully')
    }
  } catch (error) {
    console.error('\n❌ Canvas import failed with error:')
    console.error(error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('NODE_MODULE_VERSION')) {
      console.log('\n🎯 Successfully reproduced NODE_MODULE_VERSION error!')
    }
  }
}

// Additional test: Check Next.js webpack configuration impact
async function checkWebpackImpact() {
  console.log('\n\n🔧 Checking for Next.js webpack configuration issues...')
  
  // Check if there's a .next directory (built files)
  const fs = await import('fs/promises')
  try {
    await fs.access(join(__dirname, '../../.next'))
    console.log('✓ .next directory exists (app has been built)')
    
    // The NODE_MODULE_VERSION error often happens when:
    // 1. Native modules are built with one Node version
    // 2. Next.js runs with a different Node version
    // 3. Or when webpack bundles incorrectly reference native modules
    
    console.log('\nPossible causes:')
    console.log('1. Node version mismatch between build time and runtime')
    console.log('2. Next.js webpack not configured to handle native modules')
    console.log('3. Canvas module needs rebuilding for current Node version')
    
  } catch (e) {
    console.log('✗ .next directory not found')
  }
}

async function main() {
  await testCanvasInApiRoute()
  await checkWebpackImpact()
  
  console.log('\n\n📊 Summary:')
  console.log('The NODE_MODULE_VERSION error occurs when:')
  console.log('- Native module (canvas.node) was compiled for Node.js with ABI version 127')
  console.log('- Current Node.js runtime expects ABI version 137')
  console.log('- This typically happens in Next.js due to webpack bundling or Node version changes')
  console.log('\nSolution: Rebuild native modules with `npm rebuild canvas @napi-rs/canvas`')
}

main().catch((err) => {
  console.error('\n💥 Test script failed:', err)
  process.exit(1)
}) 