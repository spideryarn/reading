import path from 'node:path'
import fs from 'node:fs/promises'
import dotenv from 'dotenv'

// Load local env vars
dotenv.config({ path: '.env.local' })

// Import the function that's causing the canvas error
import { extractPdfRegionAndUpload } from '../../lib/services/pdf-image-extractor-server'

/**
 * Reproduce the canvas module NODE_MODULE_VERSION mismatch error.
 * This test directly calls the PDF image extraction function that's failing.
 * 
 * Usage:
 *   npx tsx scripts/tests/repro-canvas-module-error.ts [PDF_PATH]
 */

async function main() {
  const pdfPath = process.argv[2] || 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf'
  const abs = path.resolve(pdfPath)
  console.log('Loading PDF:', abs)
  
  const pdfBuffer = await fs.readFile(abs)
  
  console.log('\n🔍 Attempting to extract PDF region (this should trigger the canvas module error)...\n')
  
  try {
    // This should trigger the canvas module error
    const result = await extractPdfRegionAndUpload({
      pdfBuffer,
      documentId: '00000000-0000-0000-0000-000000000000',
      pageNumber: 1,
      elementId: 'test-figure-1',
      bbox: {
        x1: 0.1,
        y1: 0.1,
        x2: 0.9,
        y2: 0.5
      },
      outputFormat: 'png',
      quality: 0.95,
      scale: 2
    })
    
    console.log('✅ Extraction succeeded (unexpected!):', result)
  } catch (error) {
    console.error('❌ Error occurred (expected):\n')
    console.error(error)
    
    // Check if it's the specific NODE_MODULE_VERSION error
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('NODE_MODULE_VERSION')) {
      console.log('\n✅ Successfully reproduced the NODE_MODULE_VERSION mismatch error!')
      console.log('\nError details:')
      console.log('- Module was compiled for NODE_MODULE_VERSION 127')
      console.log('- Current Node.js requires NODE_MODULE_VERSION 137')
      console.log('- This confirms the canvas native module incompatibility')
    }
  }
}

main().catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
}) 