#!/usr/bin/env tsx

/**
 * Test script for WebAssembly-based PDF rendering
 * Tests basic WASM rendering functionality
 */

import { readFile } from 'fs/promises'
import { extractPdfRegionAndUploadWasm } from '@/lib/services/pdf-renderer-wasm'
import { BoundingBox } from '@/lib/services/html-fragment-processor'

async function testWasmExtraction() {
  console.log('🧪 Testing WASM PDF rendering...\n')

  try {
    // Test with a simple PDF that has images
    const pdfPath = 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf'
    console.log(`📄 Loading test PDF: ${pdfPath}`)
    
    const pdfBuffer = await readFile(pdfPath)
    console.log(`✅ PDF loaded (${pdfBuffer.length} bytes)\n`)

    // Test extracting a region (full page for simplicity)
    const bbox: BoundingBox = {
      x1: 0.1,  // 10% from left
      y1: 0.1,  // 10% from top
      x2: 0.9,  // 90% from left
      y2: 0.9   // 90% from top
    }

    console.log('🔧 Attempting WASM extraction with bbox:', bbox)
    console.log('⏳ This may take a few seconds on first run...\n')

    const startTime = Date.now()
    const result = await extractPdfRegionAndUploadWasm({
      pdfBuffer: Buffer.from(pdfBuffer),
      documentId: '00000000-0000-0000-0000-000000000001', // Test UUID
      pageNumber: 1,
      elementId: 'test-wasm-extraction',
      bbox,
      outputFormat: 'png',
      quality: 0.95,
      scale: 2
    })
    const duration = Date.now() - startTime

    console.log('✅ WASM extraction successful!')
    console.log(`⏱️  Duration: ${duration}ms`)
    console.log('\n📊 Extraction Result:')
    console.log(`   Storage Path: ${result.storagePath}`)
    console.log(`   Dimensions: ${result.width}x${result.height}`)
    console.log(`   File Size: ${result.size} bytes`)
    console.log(`   Signed URL: ${result.signedUrl.substring(0, 80)}...`)

    // Test with a different scale
    console.log('\n🔧 Testing with different scale (1.0)...')
    const result2 = await extractPdfRegionAndUploadWasm({
      pdfBuffer: Buffer.from(pdfBuffer),
      documentId: '00000000-0000-0000-0000-000000000001',
      pageNumber: 1,
      elementId: 'test-wasm-scale1',
      bbox,
      outputFormat: 'jpeg',
      quality: 0.85,
      scale: 1
    })

    console.log('✅ Scale test successful!')
    console.log(`   Dimensions: ${result2.width}x${result2.height}`)
    console.log(`   File Size: ${result2.size} bytes`)

  } catch (error) {
    console.error('❌ WASM extraction failed:', error)
    if (error instanceof Error) {
      console.error('   Error message:', error.message)
      console.error('   Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// Run the test
testWasmExtraction().then(() => {
  console.log('\n✅ All WASM extraction tests passed!')
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})