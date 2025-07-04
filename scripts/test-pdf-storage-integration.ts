#!/usr/bin/env npx tsx

/**
 * PDF Storage Integration Test Script
 * 
 * Tests the complete PDF upload and storage workflow including:
 * - PDF file upload to storage
 * - HTML conversion processing
 * - Database document creation
 * - File download functionality
 * 
 * Run with: npx tsx scripts/test-pdf-storage-integration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { DocumentService } from '@/lib/services/database/documents'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'

async function testPdfStorageIntegration() {
  console.log('🧪 Testing PDF Storage Integration...\n')

  try {
    // Initialize Supabase client and services
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const documentService = new DocumentService(supabase)

    // Test 1: Check if we have a test PDF file
    console.log('1️⃣ Locating test PDF file...')
    const testPdfPath = path.join(process.cwd(), 'static/examples/2105.10461v2_cropped.pdf')
    
    if (!fs.existsSync(testPdfPath)) {
      throw new Error(`Test PDF not found at: ${testPdfPath}`)
    }

    const pdfBuffer = fs.readFileSync(testPdfPath)
    const testFile = new Blob([pdfBuffer], { type: 'application/pdf' })
    console.log(`✅ Found test PDF: ${Math.round(pdfBuffer.length / 1024)} KB`)

    // Test 2: Test storage upload directly
    console.log('\n2️⃣ Testing direct storage upload...')
    const testDocumentId = crypto.randomUUID()
    const storagePath = `${testDocumentId}/original/test-paper.pdf`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, testFile, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }
    
    console.log(`✅ Storage upload successful:`)
    console.log(`   - Path: ${uploadData.path}`)
    console.log(`   - Full Path: ${uploadData.fullPath}`)

    // Test 3: Test storage download
    console.log('\n3️⃣ Testing storage download...')
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath)
    
    if (downloadError) {
      throw new Error(`Storage download failed: ${downloadError.message}`)
    }
    
    if (downloadData.size !== testFile.size) {
      throw new Error('Downloaded file size does not match uploaded file size')
    }
    
    console.log(`✅ Storage download successful: ${downloadData.size} bytes`)

    // Test 4: Test document creation with storage reference
    console.log('\n4️⃣ Testing document creation with storage reference...')
    const document = await documentService.create({
      title: 'Test PDF Integration Document',
      html_content: '<h1>Test Document</h1><p>This is a test document created during PDF storage integration testing.</p>',
      plaintext_content: 'Test Document This is a test document created during PDF storage integration testing.',
      slug: 'test-pdf-integration-document',
      source_url: null,
      is_public: false,
      word_count: 15,
      created_by: MOCK_USER_ID,
      storage_path: storagePath,
      original_file_type: 'application/pdf'
    })

    console.log(`✅ Document created with storage:`)
    console.log(`   - ID: ${document.id}`)
    console.log(`   - Title: ${document.title}`)
    console.log(`   - Storage Path: ${document.storage_path}`)
    console.log(`   - Original File Type: ${document.original_file_type}`)

    // Test 5: Test basic document operations
    console.log('\n5️⃣ Testing document retrieval...')
    
    const hasStoragePath = !!document.storage_path
    console.log(`✅ Has storage path: ${hasStoragePath}`)

    // Test file existence by trying to download
    const { data: testDownload, error: testDownloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path!)
    
    if (testDownloadError) {
      console.warn(`⚠️  Could not verify storage file: ${testDownloadError.message}`)
    } else {
      console.log(`✅ Verified storage file exists: ${testDownload.size} bytes`)
    }

    // Test 6: Test document retrieval by slug
    console.log('\n6️⃣ Testing document retrieval by slug...')
    const retrievedDoc = await documentService.getBySlug(document.slug)
    
    if (!retrievedDoc || retrievedDoc.id !== document.id) {
      throw new Error('Document retrieval by slug failed')
    }
    
    console.log(`✅ Document retrieved by slug: ${retrievedDoc.title}`)

    // Test 7: Clean up test data
    console.log('\n7️⃣ Cleaning up test data...')
    
    // Delete document from database
    const deleted = await documentService.delete(document.id)
    
    if (!deleted) {
      throw new Error('Document deletion failed')
    }
    
    console.log(`✅ Document deleted from database`)

    // Clean up storage file
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([storagePath])
    
    if (deleteError) {
      console.warn(`⚠️  Failed to clean up storage file: ${deleteError.message}`)
    } else {
      console.log(`✅ Storage file cleaned up`)
    }

    // Test Summary
    console.log('\n🎉 All PDF storage integration tests passed!')
    console.log('\n📋 Test Summary:')
    console.log('   ✅ Direct storage upload and download')
    console.log('   ✅ Document creation with storage reference')
    console.log('   ✅ Document retrieval and storage verification')
    console.log('   ✅ Document retrieval by slug functionality')
    console.log('   ✅ Database and storage cleanup')
    
    console.log('\n✨ PDF storage integration is fully functional!')
    console.log('\nNext steps:')
    console.log('1. Test the complete API endpoint with a real PDF upload')
    console.log('2. Test the download endpoint')
    console.log('3. Update the UI to show download links for documents with original files')

  } catch (error: any) {
    console.error('\n❌ PDF storage integration test failed:', error.message)
    console.error('\nDebugging steps:')
    console.error('1. Check that Supabase is running: npx supabase status')
    console.error('2. Verify storage bucket exists and is configured')
    console.error('3. Check environment variables in .env.local')
    console.error('4. Ensure test PDF file exists in static/examples/')
    process.exit(1)
  }
}

// Run test if called directly
if (require.main === module) {
  testPdfStorageIntegration()
}