/**
 * Test the actual upload endpoint to reproduce the canvas NODE_MODULE_VERSION error.
 * This makes a real HTTP request to the local dev server.
 * 
 * Prerequisites:
 * - Dev server must be running (npm run dev:daemon)
 * - Valid auth token in .env.local (or modify to use email/password auth)
 * 
 * Usage:
 *   npx tsx scripts/tests/repro-upload-endpoint.ts
 */

import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const PORT = process.env.PORT || '3000'
const BASE_URL = `http://localhost:${PORT}`

async function getAuthToken(): Promise<string | null> {
  // Try to get a test bearer token from environment
  if (process.env.TEST_BEARER_TOKEN) {
    console.log('✓ Using TEST_BEARER_TOKEN from environment')
    return process.env.TEST_BEARER_TOKEN
  }
  
  // Try to create a session using service role key (for testing)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✓ Using SUPABASE_SERVICE_ROLE_KEY to create test session')
    // For now, we'll skip this complexity and ask user to provide token
  }
  
  console.log('⚠️  No authentication token available')
  console.log('   Please set TEST_BEARER_TOKEN in .env.local or authenticate manually')
  return null
}

async function testUploadEndpoint() {
  console.log(`🔍 Testing upload endpoint at ${BASE_URL}/api/upload-pdf\n`)
  
  // Get auth token
  const authToken = await getAuthToken()
  
  // Load a test PDF
  const pdfPath = path.join(process.cwd(), 'static/examples/2009_Book_TheElementsOfStatisticalLearning_single_page_image.pdf')
  const pdfBuffer = await fs.readFile(pdfPath)
  
  console.log(`\n📄 Loaded test PDF: ${path.basename(pdfPath)}`)
  console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`)
  
  // Create form data
  const formData = new FormData()
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
  formData.append('pdf', pdfBlob, 'test.pdf')
  formData.append('provider', 'mistral') // Use Mistral which triggers image extraction
  formData.append('title', 'Canvas Error Test')
  formData.append('isPublic', 'false')
  
  console.log('\n📤 Sending request to upload endpoint...')
  console.log('   Provider: mistral (triggers image extraction)')
  console.log('   Image extraction: enabled')
  console.log(`   Auth: ${authToken ? 'Bearer token' : 'None'}\n`)
  
  try {
    // First check if server is running
    try {
      await fetch(`${BASE_URL}/api/healthz`)
    } catch (e) {
      console.error('❌ Dev server is not running!')
      console.error('   Please run: npm run dev:daemon')
      process.exit(1)
    }
    
    // Prepare headers
    const headers: Record<string, string> = {}
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    
    // Make the upload request
    const response = await fetch(`${BASE_URL}/api/upload-pdf`, {
      method: 'POST',
      headers,
      body: formData,
    })
    
    const responseText = await response.text()
    let responseData: any
    
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText)
      return
    }
    
    console.log(`Response status: ${response.status}`)
    console.log('Response data:', JSON.stringify(responseData, null, 2))
    
    // Check if it's the canvas error
    if (responseData.detail && responseData.detail.includes('NODE_MODULE_VERSION')) {
      console.log('\n✅ Successfully reproduced the NODE_MODULE_VERSION error!')
      console.log('\nError details from the response:')
      console.log(`- Type: ${responseData.type}`)
      console.log(`- Title: ${responseData.title}`)
      console.log(`- Detail: ${responseData.detail}`)
      console.log(`- Correlation ID: ${responseData.correlationId}`)
      
      // Extract version info
      const match = responseData.detail.match(/NODE_MODULE_VERSION (\d+).*NODE_MODULE_VERSION (\d+)/)
      if (match) {
        console.log(`\n- Canvas compiled for: NODE_MODULE_VERSION ${match[1]}`)
        console.log(`- Next.js requires: NODE_MODULE_VERSION ${match[2]}`)
      }
    } else if (response.status === 401 || (response.status === 500 && responseData.detail === 'Authentication required')) {
      console.log('\n⚠️  Got authentication error')
      console.log('To reproduce the canvas error, you need to:')
      console.log('1. Login to the app at http://localhost:3001')
      console.log('2. Open browser DevTools, go to Application > Cookies')
      console.log('3. Copy the sb-access-token value')
      console.log('4. Add to .env.local: TEST_BEARER_TOKEN=<token>')
      console.log('5. Run this test again')
    } else {
      console.log('\n❓ Got a different error than expected')
      
      // If it's a different processing error, it might still be canvas-related
      if (response.status === 500 && responseData.type === 'https://spideryarn.com/problems/PROCESSING_ERROR') {
        console.log('\n💡 This could be the canvas error wrapped in a generic processing error')
        console.log('Check the server logs for the actual error details')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error)
  }
}

async function main() {
  console.log('Canvas NODE_MODULE_VERSION Error Reproduction Test')
  console.log('='.repeat(50))
  
  await testUploadEndpoint()
  
  console.log('\n' + '='.repeat(50))
  console.log('Test complete.')
  
  console.log('\n💡 TIP: Check the dev server logs (tail dev.log) for detailed error messages')
}

main().catch((err) => {
  console.error('\n💥 Test failed:', err)
  process.exit(1)
}) 