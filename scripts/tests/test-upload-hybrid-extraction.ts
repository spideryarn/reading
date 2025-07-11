#!/usr/bin/env npx tsx
/**
 * Test script to reproduce the upload flow with hybrid PDF extraction
 * 
 * This simulates what happens when a user:
 * 1. Goes to /upload
 * 2. Selects the v3 pipeline (Mistral OCR)
 * 3. Selects Auto (Hybrid) extraction method
 * 4. Uploads the test PDF
 * 
 * Expected to reproduce: "All PDF extraction methods failed. Last error: Failed to load native binding"
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { processWithMistralOcr } from '@/lib/services/mistral-ocr-pdf-processor'
import { generateCorrelationId } from '@/lib/services/logger'
import { randomUUID } from 'crypto'

async function main() {
  console.log('=== Upload Flow Test with Hybrid Extraction ===\n')
  
  const testPdfPath = join(process.cwd(), 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf')
  const correlationId = generateCorrelationId()
  
  console.log('Test configuration:')
  console.log('- PDF:', testPdfPath)
  console.log('- Pipeline: v3 (Mistral OCR)')
  console.log('- Extraction method: auto (Hybrid)')
  console.log('- Correlation ID:', correlationId)
  console.log('')
  
  try {
    // Load the test PDF
    console.log('Loading PDF...')
    const pdfBuffer = await readFile(testPdfPath)
    console.log(`PDF loaded: ${pdfBuffer.length} bytes`)
    console.log('')
    
    // Simulate the upload processing
    console.log('Processing with Mistral OCR (hybrid extraction)...')
    const startTime = Date.now()
    
    const result = await processWithMistralOcr({
      pdfBuffer,
      fileName: '2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf',
      correlationId,
      singlePageOnly: true, // Match the test PDF which is single page
      documentId: randomUUID(), // Generate valid UUID
      imageExtractionEnabled: true,
      extractionMethod: 'auto' // This should trigger the hybrid extractor
    })
    
    const duration = Date.now() - startTime
    
    console.log('\n✅ Success!')
    console.log(`Processing time: ${duration}ms`)
    console.log(`Extracted images: ${result.extractedImages.length}`)
    console.log(`HTML length: ${result.html.length} chars`)
    console.log(`Warnings: ${result.warnings.length}`)
    
    if (result.extractedImages.length > 0) {
      console.log('\nExtracted images:')
      result.extractedImages.forEach((img, i) => {
        console.log(`  ${i + 1}. ${img.elementId}`)
        console.log(`     Bbox: [${img.bbox.x1}, ${img.bbox.y1}, ${img.bbox.x2}, ${img.bbox.y2}]`)
        console.log(`     Storage: ${img.storagePath}`)
        console.log(`     Size: ${img.fileSize} bytes`)
      })
    }
    
  } catch (error) {
    console.error('\n❌ Error occurred:')
    console.error('Message:', error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    
    // Check if it's the expected native binding error
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('native binding') || errorMessage.includes('NODE_MODULE_VERSION')) {
      console.error('\n⚠️  This is the expected native binding error!')
      console.error('The hybrid extractor is attempting to load a native module.')
    }
    
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)