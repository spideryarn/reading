#!/usr/bin/env npx tsx
/**
 * Direct test of the hybrid PDF extractor without going through API/auth
 * 
 * This test directly imports and calls the hybrid extractor to isolate
 * where the native module loading error occurs.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

// Set environment variables to control extraction method
process.env.PDF_DIRECT_EXTRACTION = 'true'
process.env.PDF_USE_NAPI_CANVAS = 'true'
process.env.PDF_USE_WASM_FALLBACK = 'true'

async function main() {
  console.log('=== Direct Hybrid Extractor Test ===\n')
  
  const testPdfPath = join(process.cwd(), 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf')
  
  console.log('Environment:')
  console.log('- PDF_DIRECT_EXTRACTION:', process.env.PDF_DIRECT_EXTRACTION)
  console.log('- PDF_USE_NAPI_CANVAS:', process.env.PDF_USE_NAPI_CANVAS)
  console.log('- PDF_USE_WASM_FALLBACK:', process.env.PDF_USE_WASM_FALLBACK)
  console.log('')
  
  try {
    // Load the test PDF
    console.log('Loading PDF...')
    const pdfBuffer = await readFile(testPdfPath)
    console.log(`PDF loaded: ${pdfBuffer.length} bytes\n`)
    
    // Import the hybrid extractor
    console.log('Importing hybrid extractor...')
    const { extractPdfRegionAndUpload } = await import('@/lib/services/pdf-image-extractor-hybrid')
    console.log('Import successful\n')
    
    // Test bounding box
    const testBbox = {
      x1: 0.1,
      y1: 0.1,
      x2: 0.4,
      y2: 0.4
    }
    
    // Try to extract
    console.log('Attempting extraction...')
    const result = await extractPdfRegionAndUpload({
      pdfBuffer,
      pageNumber: 1,
      bbox: testBbox,
      documentId: randomUUID(),
      elementId: 'test-element',
      outputFormat: 'png',
      quality: 0.95,
      scale: 2
    })
    
    console.log('\n✅ Extraction succeeded!')
    console.log('Result:', {
      width: result.width,
      height: result.height,
      size: result.size,
      storagePath: result.storagePath ? 'Generated' : 'None'
    })
    
  } catch (error) {
    console.error('\n❌ Error occurred:')
    console.error('Message:', error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    
    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('native binding') || errorMessage.includes('NODE_MODULE_VERSION')) {
      console.error('\n⚠️  This is the native binding error we\'re looking for!')
      console.error('The hybrid extractor is attempting to load a native module.')
      
      // Try to identify which module
      if (errorMessage.includes('canvas')) {
        console.error('Error is related to canvas module')
      } else if (errorMessage.includes('imagescript')) {
        console.error('Error is related to imagescript module')
      } else if (errorMessage.includes('unpdf')) {
        console.error('Error is related to unpdf module')
      }
    }
    
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)