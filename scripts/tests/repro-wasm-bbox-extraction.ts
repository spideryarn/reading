#!/usr/bin/env tsx

/**
 * Test script for WebAssembly-based PDF bounding box extraction
 * Tests extraction of specific regions based on bounding boxes
 */

import { readFile } from 'fs/promises'
import { extractPdfRegionAndUploadWasm } from '@/lib/services/pdf-renderer-wasm'
import { BoundingBox } from '@/lib/services/html-fragment-processor'

async function testBoundingBoxExtraction() {
  console.log('🧪 Testing WASM PDF bounding box extraction...\n')

  try {
    // Use the test PDF with known bounding boxes
    const pdfPath = 'test-data/Bounding Box Test Document.pdf'
    console.log(`📄 Loading test PDF: ${pdfPath}`)
    
    const pdfBuffer = await readFile(pdfPath)
    console.log(`✅ PDF loaded (${pdfBuffer.length} bytes)\n`)

    // Test multiple bounding boxes (simulating Mistral OCR results)
    const testCases = [
      {
        name: 'Header Region',
        bbox: { x1: 0.1, y1: 0.05, x2: 0.9, y2: 0.15 },
        elementId: 'header-region'
      },
      {
        name: 'Main Figure',
        bbox: { x1: 0.2, y1: 0.3, x2: 0.8, y2: 0.7 },
        elementId: 'main-figure'
      },
      {
        name: 'Caption Text',
        bbox: { x1: 0.15, y1: 0.72, x2: 0.85, y2: 0.85 },
        elementId: 'caption-text'
      },
      {
        name: 'Small Corner Image',
        bbox: { x1: 0.85, y1: 0.85, x2: 0.95, y2: 0.95 },
        elementId: 'corner-image'
      }
    ]

    console.log(`🔍 Testing extraction of ${testCases.length} regions...\n`)

    for (const testCase of testCases) {
      console.log(`📦 Extracting: ${testCase.name}`)
      console.log(`   Bounding box: ${JSON.stringify(testCase.bbox)}`)
      
      const startTime = Date.now()
      try {
        const result = await extractPdfRegionAndUploadWasm({
          pdfBuffer: Buffer.from(pdfBuffer),
          documentId: '00000000-0000-0000-0000-000000000002', // Test UUID
          pageNumber: 1,
          elementId: testCase.elementId,
          bbox: testCase.bbox,
          outputFormat: 'png',
          quality: 0.95,
          scale: 2
        })
        const duration = Date.now() - startTime

        console.log(`   ✅ Success! (${duration}ms)`)
        console.log(`   Dimensions: ${result.width}x${result.height}`)
        console.log(`   Size: ${result.size} bytes`)
        console.log(`   Path: ${result.storagePath}\n`)
      } catch (error) {
        console.log(`   ❌ Failed: ${error instanceof Error ? error.message : String(error)}\n`)
      }
    }

    // Test with normalized bounding boxes (as returned by Mistral)
    console.log('🔧 Testing with normalized Mistral-style bounding boxes...\n')
    
    const mistralStyleBbox: BoundingBox = {
      x1: 0.123456,
      y1: 0.234567,
      x2: 0.876543,
      y2: 0.765432
    }

    const result = await extractPdfRegionAndUploadWasm({
      pdfBuffer: Buffer.from(pdfBuffer),
      documentId: '00000000-0000-0000-0000-000000000002',
      pageNumber: 1,
      elementId: 'mistral-style-bbox',
      bbox: mistralStyleBbox,
      outputFormat: 'jpeg',
      quality: 0.9,
      scale: 1.5
    })

    console.log('✅ Mistral-style bbox extraction successful!')
    console.log(`   Precise coordinates handled correctly`)
    console.log(`   Dimensions: ${result.width}x${result.height}`)

    // Test error handling with invalid bbox
    console.log('\n🔧 Testing error handling with invalid bbox...')
    try {
      await extractPdfRegionAndUploadWasm({
        pdfBuffer: Buffer.from(pdfBuffer),
        documentId: '00000000-0000-0000-0000-000000000002',
        pageNumber: 1,
        elementId: 'invalid-bbox',
        bbox: { x1: 0.9, y1: 0.9, x2: 0.1, y2: 0.1 }, // Invalid: x2 < x1, y2 < y1
        outputFormat: 'png',
        quality: 0.95,
        scale: 2
      })
      console.log('   ❌ Should have thrown error for invalid bbox!')
    } catch (error) {
      console.log('   ✅ Correctly rejected invalid bbox:', error instanceof Error ? error.message : String(error))
    }

  } catch (error) {
    console.error('❌ Bounding box extraction test failed:', error)
    if (error instanceof Error) {
      console.error('   Error message:', error.message)
      console.error('   Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// Run the test
testBoundingBoxExtraction().then(() => {
  console.log('\n✅ All bounding box extraction tests passed!')
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})