#!/usr/bin/env -S npm exec tsx --

/**
 * E2E Pre-flight Database Sanity Check
 * 
 * Verifies that the test user exists in the database before running E2E tests.
 * This prevents wasting time on auth failures when the database is missing seed data.
 * 
 * Usage: npm run e2e:verify-user
 * 
 * Exit codes:
 * - 0: Test user exists
 * - 1: Test user missing or error occurred
 */

import { createClient } from '@supabase/supabase-js'
import { getCurrentEnvironmentTestUser } from '../lib/testing/worktree-auth-helpers'
import type { Database } from '../lib/types/database-auto-generated'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function verifyTestUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    console.error('   Make sure .env.local is properly configured')
    process.exit(1)
  }

  // Create Supabase client with service role key to bypass RLS
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Get current environment's test user
  const { email: testUserEmail } = getCurrentEnvironmentTestUser()
  console.log(`🔍 Checking for test user: ${testUserEmail}`)

  try {
    // Query auth.users table directly
    const { data: users, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', (
        await supabase.auth.admin.listUsers()
      ).data.users.find(u => u.email === testUserEmail)?.id || '')
      .single()

    if (error || !users) {
      // Try a more direct approach - check if user exists in auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        console.error('❌ Error checking auth users:', authError.message)
        process.exit(1)
      }

      const testUser = authUsers.users.find(u => u.email === testUserEmail)
      
      if (!testUser) {
        console.error(`❌ Test user ${testUserEmail} does not exist in the database!`)
        console.error('   Run "supabase db reset" to re-seed the database')
        console.error('   Or check if your local Supabase instance is running')
        process.exit(1)
      }

      console.log(`✅ Test user ${testUserEmail} exists (ID: ${testUser.id})`)
      
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', testUser.id)
        .single()

      if (!profile) {
        console.warn(`⚠️  Test user exists but has no profile - this may cause issues`)
      }
    } else {
      console.log(`✅ Test user ${testUserEmail} exists and has a profile`)
    }

    // Success!
    process.exit(0)
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

// Run the verification
verifyTestUser()