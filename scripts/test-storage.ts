#!/usr/bin/env npx tsx

/**
 * Storage Setup Test Script
 * 
 * Tests the Supabase Storage setup and utility functions
 * Run with: npx tsx scripts/test-storage.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as crypto from 'crypto'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testStorageSetup() {
  console.log('🧪 Testing Supabase Storage setup...\n')

  try {
    // Test 1: Check bucket exists
    console.log('1️⃣ Testing bucket access...')
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      throw new Error(`Bucket list failed: ${bucketError.message}`)
    }

    const documentsBucket = buckets.find(b => b.name === 'documents')
    if (!documentsBucket) {
      throw new Error('Documents bucket not found')
    }

    console.log('✅ Documents bucket found')
    console.log(`   - Public: ${documentsBucket.public}`)
    console.log(`   - File size limit: ${documentsBucket.file_size_limit} bytes`)
    console.log(`   - Allowed MIME types: ${documentsBucket.allowed_mime_types?.join(', ') || 'All types'}`)

    // Test 2: Test basic bucket operations
    console.log('\n2️⃣ Testing basic bucket operations...')
    const { data: files, error: listError } = await supabase.storage
      .from('documents')
      .list('')

    if (listError) {
      throw new Error(`File list failed: ${listError.message}`)
    }

    console.log(`✅ Bucket list successful (${files.length} existing files)`)

    // Test 3: Test upload with a small test file
    console.log('\n3️⃣ Testing file upload...')
    const testDocumentId = crypto.randomUUID()
    const testContent = 'Test PDF content for storage verification'
    const testFile = new Blob([testContent], { type: 'application/pdf' })
    const testPath = `${testDocumentId}/original/test-file.pdf`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testPath, testFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    console.log('✅ File upload successful')
    console.log(`   - Path: ${uploadData.path}`)
    console.log(`   - Full path: ${uploadData.fullPath}`)

    // Test 4: Test download
    console.log('\n4️⃣ Testing file download...')
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(testPath)

    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`)
    }

    const downloadedContent = await downloadData.text()
    if (downloadedContent !== testContent) {
      throw new Error('Downloaded content does not match uploaded content')
    }

    console.log('✅ File download successful')
    console.log(`   - Size: ${downloadData.size} bytes`)
    console.log(`   - Type: ${downloadData.type}`)

    // Test 5: Test signed URL generation
    console.log('\n5️⃣ Testing signed URL generation...')
    const { data: signedData, error: signedError } = await supabase.storage
      .from('documents')
      .createSignedUrl(testPath, 3600)

    if (signedError) {
      throw new Error(`Signed URL failed: ${signedError.message}`)
    }

    console.log('✅ Signed URL generation successful')
    console.log(`   - URL: ${signedData.signedUrl.substring(0, 80)}...`)

    // Test 6: Clean up test file
    console.log('\n6️⃣ Cleaning up test file...')
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([testPath])

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`)
    }

    console.log('✅ Test file cleanup successful')

    // Test summary
    console.log('\n🎉 All storage tests passed!')
    console.log('\n📋 Test Summary:')
    console.log('   ✅ Bucket access and configuration')
    console.log('   ✅ File upload functionality')
    console.log('   ✅ File download functionality')
    console.log('   ✅ Signed URL generation')
    console.log('   ✅ File deletion and cleanup')
    
    console.log('\n✨ Storage setup is ready for PDF integration!')

  } catch (error: any) {
    console.error('\n❌ Storage test failed:', error.message)
    console.error('\nDebugging steps:')
    console.error('1. Check that Supabase is running: npx supabase status')
    console.error('2. Verify environment variables in .env.local')
    console.error('3. Check if bucket was created properly')
    console.error('4. Review RLS policies if permission errors occur')
    process.exit(1)
  }
}

// Run test if called directly
if (require.main === module) {
  testStorageSetup()
}