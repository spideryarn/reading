#!/usr/bin/env npx tsx
/**
 * Test script that calls the upload API endpoint directly
 * 
 * This simulates the actual upload flow through the API, which should
 * properly handle the request context needed for cookies.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'

async function main() {
  console.log('=== Upload API Test with Hybrid Extraction ===\n')
  
  const testPdfPath = join(process.cwd(), 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf')
  const apiUrl = `http://localhost:${process.env.PORT || 3001}/api/upload-pdf`
  
  console.log('Test configuration:')
  console.log('- PDF:', testPdfPath)
  console.log('- API URL:', apiUrl)
  console.log('- Processing method: mistral')
  console.log('- Extraction method: auto')
  console.log('')
  
  try {
    // Load the test PDF
    console.log('Loading PDF...')
    const pdfBuffer = await readFile(testPdfPath)
    console.log(`PDF loaded: ${pdfBuffer.length} bytes`)
    
    // Create form data
    const formData = new FormData()
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
    formData.append('file', blob, '2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf')
    formData.append('provider', 'mistral')
    formData.append('extractionMethod', 'auto')
    formData.append('isPublic', 'false')
    
    // Make the API request
    console.log('\nCalling upload API...')
    const startTime = Date.now()
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let fetch set it with boundary for multipart
      }
    })
    
    const duration = Date.now() - startTime
    
    const responseText = await response.text()
    let responseData: any
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }
    
    console.log(`\nResponse status: ${response.status}`)
    console.log(`Response time: ${duration}ms`)
    
    if (response.ok) {
      console.log('\n✅ Upload succeeded!')
      console.log('Response:', JSON.stringify(responseData, null, 2))
    } else {
      console.error('\n❌ Upload failed!')
      console.error('Response:', JSON.stringify(responseData, null, 2))
      
      // Check for specific errors
      if (typeof responseData === 'object' && responseData.detail) {
        const detail = responseData.detail
        if (detail.includes('native binding') || detail.includes('NODE_MODULE_VERSION')) {
          console.error('\n⚠️  This is the expected native binding error!')
          console.error('The hybrid extractor is attempting to load a native module.')
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:')
    console.error('Message:', error instanceof Error ? error.message : String(error))
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)