#!/usr/bin/env tsx

/**
 * Supabase Storage Setup Script
 * 
 * Sets up the documents bucket and RLS policies for PDF storage integration.
 * Run with: npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage for PDF documents...\n')

  try {
    // 1. Check if documents bucket already exists
    console.log('📋 Checking existing buckets...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`)
    }

    const documentsBucket = buckets.find(bucket => bucket.name === 'documents')
    
    if (documentsBucket) {
      console.log('✅ Documents bucket already exists')
    } else {
      // 2. Create documents bucket
      console.log('🪣 Creating documents bucket...')
      const { data: bucket, error: createError } = await supabase.storage.createBucket('documents', {
        public: false,  // Private bucket for security
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/html',
          'text/plain'
        ],
        fileSizeLimit: 50 * 1024 * 1024  // 50MB limit
      })

      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`)
      }

      console.log('✅ Documents bucket created successfully')
    }

    // 3. Set up RLS policies
    console.log('🔒 Setting up Row Level Security policies...')

    // Check existing policies first
    const { data: existingPolicies, error: policiesError } = await supabase
      .rpc('get_storage_policies', { bucket_name: 'documents' })

    if (policiesError && !policiesError.message.includes('does not exist')) {
      console.warn(`⚠️  Could not check existing policies: ${policiesError.message}`)
    }

    // Policy 1: Allow mock system user full access during development
    try {
      await supabase.rpc('create_storage_policy', {
        policy_name: 'System user document access',
        bucket_name: 'documents',
        operation: 'ALL',
        target_role: 'authenticated',
        using_expression: `bucket_id = 'documents' AND auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid`
      })
      console.log('✅ System user policy created')
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('✅ System user policy already exists')
      } else {
        console.warn(`⚠️  System user policy: ${error.message}`)
      }
    }

    // Policy 2: Allow authenticated users to upload their own documents
    try {
      await supabase.rpc('create_storage_policy', {
        policy_name: 'Users can upload documents',
        bucket_name: 'documents', 
        operation: 'INSERT',
        target_role: 'authenticated',
        with_check: `bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]`
      })
      console.log('✅ User upload policy created')
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('✅ User upload policy already exists')
      } else {
        console.warn(`⚠️  User upload policy: ${error.message}`)
      }
    }

    // Policy 3: Allow users to view their own documents
    try {
      await supabase.rpc('create_storage_policy', {
        policy_name: 'Users can view own documents',
        bucket_name: 'documents',
        operation: 'SELECT', 
        target_role: 'authenticated',
        using_expression: `bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]`
      })
      console.log('✅ User view policy created')
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('✅ User view policy already exists')
      } else {
        console.warn(`⚠️  User view policy: ${error.message}`)
      }
    }

    // Policy 4: Public document access based on documents.is_public
    try {
      await supabase.rpc('create_storage_policy', {
        policy_name: 'Public document access',
        bucket_name: 'documents',
        operation: 'SELECT',
        target_role: 'anon, authenticated',
        using_expression: `bucket_id = 'documents' AND EXISTS (
          SELECT 1 FROM documents 
          WHERE documents.storage_path = name 
          AND documents.is_public = true
        )`
      })
      console.log('✅ Public access policy created')
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('✅ Public access policy already exists')
      } else {
        console.warn(`⚠️  Public access policy: ${error.message}`)
      }
    }

    // 4. Test bucket access
    console.log('\n🧪 Testing bucket access...')
    
    // Test basic bucket access
    const { data: testList, error: testError } = await supabase.storage
      .from('documents')
      .list()

    if (testError) {
      throw new Error(`Bucket access test failed: ${testError.message}`)
    }

    console.log('✅ Bucket access test successful')

    // 5. Display configuration summary
    console.log('\n📊 Storage Configuration Summary:')
    console.log('   Bucket Name: documents')
    console.log('   Privacy: Private (requires authentication)')
    console.log('   File Size Limit: 50MB')
    console.log('   Allowed Types: PDF, DOC, DOCX, HTML, TXT')
    console.log('   Path Format: {document-uuid}/original/{filename}')
    console.log('   CDN: Enabled (automatic caching)')
    
    console.log('\n🎉 Supabase Storage setup completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Create storage utility functions')
    console.log('2. Update document service layer')
    console.log('3. Integrate with PDF upload pipeline')
    
  } catch (error: any) {
    console.error('\n❌ Storage setup failed:', error.message)
    console.error('\nTroubleshooting:')
    console.error('1. Ensure Supabase is running: npx supabase start')
    console.error('2. Check environment variables in .env.local')
    console.error('3. Verify service role key has admin permissions')
    process.exit(1)
  }
}

// Run setup if called directly
if (require.main === module) {
  setupStorage()
}

export { setupStorage }