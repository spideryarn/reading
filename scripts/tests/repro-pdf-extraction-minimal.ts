#!/usr/bin/env tsx

/*
 * Minimal reproduction script for PDF image extraction errors
 * 
 * This script demonstrates the NODE_MODULE_VERSION error when trying to
 * extract images from PDFs using the current skia-canvas based approach.
 * 
 * Usage: ./scripts/tests/repro-pdf-extraction-minimal.ts
 */

import fs from 'fs/promises'
import path from 'path'
import { extractPdfRegionAndUpload } from '../../lib/services/pdf-image-extractor-server'

async function main() {
  console.log('🔍 Minimal PDF Extraction Error Reproduction\n')
  
  // Node.js environment info
  console.log('Environment:')
  console.log(`  Node.js: ${process.version}`)
  console.log(`  ABI Version: ${process.versions.modules}`)
  console.log(`  Platform: ${process.platform}`)
  console.log(`  Arch: ${process.arch}\n`)

  try {
    // Use a simple test PDF
    const testPdfPath = path.join(process.cwd(), 'test-fixtures', 'simple-pdf-one-page.pdf')
    
    // Check if test PDF exists
    try {
      await fs.access(testPdfPath)
    } catch {
      console.error('❌ Test PDF not found at:', testPdfPath)
      console.log('   Please ensure test-fixtures/simple-pdf-one-page.pdf exists')
      process.exit(1)
    }
    
    const pdfBuffer = await fs.readFile(testPdfPath)
    console.log(`✅ Loaded test PDF (${pdfBuffer.length} bytes)\n`)
    
    // Define a simple bounding box for testing
    const testBoundingBox = {
      x: 0.1,  // 10% from left
      y: 0.1,  // 10% from top
      width: 0.8,  // 80% width
      height: 0.3  // 30% height
    }
    
    console.log('📦 Test bounding box:', testBoundingBox)
    console.log('\n🚀 Attempting PDF region extraction...\n')
    
    // This should trigger the NODE_MODULE_VERSION error
    const result = await extractPdfRegionAndUpload(
      pdfBuffer,
      1, // page number
      testBoundingBox,
      'test-doc-id',
      'test-element-id'
    )
    
    // If we get here, extraction succeeded (unlikely with native module issue)
    console.log('✅ Extraction succeeded!')
    console.log('Result:', result)
    
  } catch (error) {
    console.error('❌ Extraction failed with error:\n')
    
    if (error instanceof Error) {
      console.error('Message:', error.message)
      
      // Check for NODE_MODULE_VERSION error
      if (error.message.includes('NODE_MODULE_VERSION')) {
        console.error('\n🔴 NODE_MODULE_VERSION mismatch detected!')
        
        // Extract version numbers if present
        const versionMatch = error.message.match(/NODE_MODULE_VERSION (\d+).*NODE_MODULE_VERSION (\d+)/)
        if (versionMatch) {
          console.error(`   Compiled for: v${versionMatch[1]}`)
          console.error(`   Runtime needs: v${versionMatch[2]}`)
        }
        
        console.error('\n📝 This is the exact error we need to fix by replacing skia-canvas')
        console.error('   with a pure JavaScript solution.')
      }
      
      // Log full stack trace
      if (error.stack) {
        console.error('\nStack trace:')
        console.error(error.stack)
      }
    } else {
      console.error('Unknown error:', error)
    }
    
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)