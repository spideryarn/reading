#!/usr/bin/env tsx

/**
 * Test script for hybrid PDF extraction approach
 * Tests the combination of direct extraction and WASM fallback
 */

import { readFile } from 'fs/promises'
import { extractPdfRegionAndUploadHybrid, PdfImageExtractorHybrid } from '@/lib/services/pdf-image-extractor-hybrid'
import { BoundingBox } from '@/lib/services/html-fragment-processor'

async function testHybridExtraction() {
  console.log('🧪 Testing hybrid PDF extraction approach...\n')

  const testPDFs = [
    {
      name: 'PDF with embedded images',
      path: 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf',
      expectedMethod: 'direct' as const,
      description: 'Should use direct extraction for PDFs with embedded images'
    },
    {
      name: 'Text-only PDF',
      path: 'static/examples/text-only - Lawrence Kuhn (2024) - cropped 2 pages no images.pdf',
      expectedMethod: 'wasm' as const,
      description: 'Should fall back to WASM for text-only PDFs'
    }
  ]

  const bbox: BoundingBox = {
    x1: 0.15,
    y1: 0.15,
    x2: 0.85,
    y2: 0.85
  }

  // Test with different environment configurations
  const configs = [
    {
      name: 'Default (Direct + WASM)',
      env: {},
    },
    {
      name: '@napi-rs/canvas enabled',
      env: { PDF_USE_NAPI_CANVAS: 'true' },
    },
    {
      name: 'Direct extraction only',
      env: { PDF_USE_WASM_FALLBACK: 'false' },
    },
    {
      name: 'WASM only',
      env: { PDF_DIRECT_EXTRACTION: 'false' },
    }
  ]

  for (const config of configs) {
    console.log(`\n🔧 Testing configuration: ${config.name}`)
    console.log(`   Environment:`, config.env)
    
    // Apply environment variables
    Object.assign(process.env, config.env)
    
    const extractor = new PdfImageExtractorHybrid()
    console.log(`   Stats:`, extractor.getStats())

    for (const testPDF of testPDFs) {
      console.log(`\n📄 Testing: ${testPDF.name}`)
      console.log(`   File: ${testPDF.path}`)
      console.log(`   ${testPDF.description}`)

      try {
        const pdfBuffer = await readFile(testPDF.path)
        console.log(`   PDF loaded (${pdfBuffer.length} bytes)`)

        const startTime = Date.now()
        const result = await extractPdfRegionAndUploadHybrid({
          pdfBuffer: Buffer.from(pdfBuffer),
          documentId: '00000000-0000-0000-0000-000000000004',
          pageNumber: 1,
          elementId: `test-hybrid-${testPDF.expectedMethod}`,
          bbox,
          outputFormat: 'png',
          quality: 0.95,
          scale: 1.5
        })
        const duration = Date.now() - startTime

        console.log(`   ✅ Extraction successful!`)
        console.log(`   Method used: ${result.method}`)
        if (result.fallbackReason) {
          console.log(`   Fallback reason: ${result.fallbackReason}`)
        }
        console.log(`   Duration: ${duration}ms`)
        console.log(`   Dimensions: ${result.width}x${result.height}`)
        console.log(`   Size: ${result.size} bytes`)

        // Check if the expected method was used (when applicable)
        if (config.name === 'Default (Direct + WASM)' && result.method !== testPDF.expectedMethod) {
          console.log(`   ⚠️  Expected ${testPDF.expectedMethod} but got ${result.method}`)
        }

      } catch (error) {
        console.log(`   ❌ Extraction failed: ${error instanceof Error ? error.message : String(error)}`)
        
        // Some failures are expected (e.g., direct-only mode with text PDF)
        if (config.name === 'Direct extraction only' && testPDF.expectedMethod === 'wasm') {
          console.log(`   ℹ️  This failure is expected in direct-only mode`)
        }
      }
    }

    // Reset environment
    for (const key of Object.keys(config.env)) {
      delete process.env[key]
    }
  }

  // Test performance comparison
  console.log('\n📊 Performance Comparison Test')
  console.log('Testing the same PDF with different methods...\n')

  const perfTestPdf = await readFile('static/examples/2105.10461v2_cropped.pdf')
  const methods = [
    { env: { PDF_DIRECT_EXTRACTION: 'true', PDF_USE_WASM_FALLBACK: 'false' }, name: 'Direct only' },
    { env: { PDF_USE_NAPI_CANVAS: 'true', PDF_DIRECT_EXTRACTION: 'false' }, name: '@napi-rs/canvas' },
    { env: { PDF_DIRECT_EXTRACTION: 'false', PDF_USE_WASM_FALLBACK: 'true' }, name: 'WASM' }
  ]

  for (const method of methods) {
    Object.assign(process.env, method.env)
    
    try {
      const startTime = Date.now()
      const result = await extractPdfRegionAndUploadHybrid({
        pdfBuffer: Buffer.from(perfTestPdf),
        documentId: '00000000-0000-0000-0000-000000000005',
        pageNumber: 1,
        elementId: `perf-test-${method.name.toLowerCase().replace(/\s+/g, '-')}`,
        bbox: { x1: 0.2, y1: 0.3, x2: 0.8, y2: 0.7 },
        outputFormat: 'jpeg',
        quality: 0.85,
        scale: 1
      })
      const duration = Date.now() - startTime

      console.log(`${method.name.padEnd(20)} : ${duration}ms (${result.method})`)
    } catch (error) {
      console.log(`${method.name.padEnd(20)} : Failed - ${error instanceof Error ? error.message : String(error)}`)
    }

    // Reset environment
    for (const key of Object.keys(method.env)) {
      delete process.env[key]
    }
  }
}

// Run the test
testHybridExtraction().then(() => {
  console.log('\n✅ All hybrid extraction tests completed!')
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})