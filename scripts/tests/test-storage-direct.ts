#!/usr/bin/env npx tsx
/**
 * Test Supabase storage directly to isolate the issue
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Create a service role client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54341'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false
  }
})

async function testStorageUpload() {
  console.log('=== Direct Storage Test ===\n')
  console.log('Supabase URL:', supabaseUrl)
  console.log('')

  try {
    // Create a simple test image (1x1 PNG)
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )

    const documentId = randomUUID()
    const filename = 'test-image.png'
    const path = `${documentId}/assets/${filename}`

    console.log('Uploading to path:', path)
    console.log('File size:', pngData.length, 'bytes')
    console.log('MIME type: image/png')
    console.log('')

    // Try to upload
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, pngData, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('❌ Upload failed!')
      console.error('Error:', error.message)
      console.error('Full error:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Upload successful!')
      console.log('Path:', data.path)
      console.log('Full path:', data.fullPath)
      console.log('ID:', data.id)
    }

    // Try to get a signed URL
    if (data) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 3600)

      if (urlError) {
        console.error('\n❌ Failed to get signed URL:', urlError.message)
      } else {
        console.log('\n✅ Signed URL created:', urlData.signedUrl.substring(0, 100) + '...')
      }
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:')
    console.error(error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
  }
}

// Run the test
testStorageUpload().catch(console.error)