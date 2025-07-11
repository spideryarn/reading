#!/usr/bin/env npx tsx
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Command-line test script that reproduces the upload flow
 * 
 * Simulates:
 * - Going to /upload
 * - Selecting v3 pipeline (Mistral OCR)
 * - Selecting Auto (Hybrid) extraction
 * - Using static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf
 * 
 * This script calls the test endpoint which runs in proper Next.js context
 */

import { readFile } from 'fs/promises'
import { join } from 'path'

async function main() {
  console.log('=== Upload Flow Reproduction Script ===\n')
  
  const pdfPath = join(process.cwd(), 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf')
  const apiUrl = `http://localhost:${process.env.PORT || 3001}/api/test-pdf-wasm`
  
  console.log('Configuration:')
  console.log('- PDF:', pdfPath)
  console.log('- Pipeline: v3 (Mistral OCR)')
  console.log('- Extraction method: auto (Hybrid)')
  console.log('')
  
  try {
    // Verify PDF exists
    const pdfBuffer = await readFile(pdfPath)
    console.log(`PDF found: ${pdfBuffer.length} bytes\n`)
    
    // Call the test endpoint
    console.log('Calling test endpoint...')
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testType: 'simple',
        method: 'auto'
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('\n✅ Success!')
      console.log('Result:', JSON.stringify(result, null, 2))
    } else {
      console.error('\n❌ Error reproduced!')
      console.error('Status:', response.status)
      console.error('Error:', result.error)
      console.error('Correlation ID:', result.correlationId)
      
      // Check error type
      if (result.error.includes('native binding')) {
        console.error('\n⚠️  Native binding error detected!')
        console.error('This is the error we were trying to reproduce.')
      } else if (result.error.includes('mime type')) {
        console.error('\n⚠️  Storage error detected!')
        console.error('The native binding issue appears to be fixed.')
        console.error('Now encountering a storage/mime type issue.')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)