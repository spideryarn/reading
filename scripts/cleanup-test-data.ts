#!/usr/bin/env node

/**
 * Cleanup script for test data in shared database
 * 
 * This script removes test data that is older than 24 hours to prevent
 * the development database from accumulating stale test records.
 * 
 * Usage:
 *   npm run cleanup:test-data
 *   
 * Safety features:
 * - Only deletes data with test_namespace metadata
 * - Only deletes data older than 24 hours
 * - Dry run mode by default (use --execute to actually delete)
 * - Shows summary before deletion
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = !args.includes('--execute')
const verbose = args.includes('--verbose')

interface CleanupStats {
  profiles: number
  documents: number
  documentEnhancements: number
  aiCalls: number
  chatMessages: number
  chatThreads: number
  total: number
}

async function getStaleTestData(): Promise<CleanupStats> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  const stats: CleanupStats = {
    profiles: 0,
    documents: 0,
    documentEnhancements: 0,
    aiCalls: 0,
    chatMessages: 0,
    chatThreads: 0,
    total: 0
  }

  // Count stale test profiles
  const { count: profileCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  stats.profiles = profileCount || 0

  // Count stale test documents
  const { count: documentCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  stats.documents = documentCount || 0

  // Count stale test document enhancements
  const { count: enhancementCount } = await supabase
    .from('document_enhancements')
    .select('*', { count: 'exact', head: true })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  stats.documentEnhancements = enhancementCount || 0

  // Count stale test AI calls
  const { count: aiCallCount } = await supabase
    .from('ai_calls')
    .select('*', { count: 'exact', head: true })
    .not('extra->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  stats.aiCalls = aiCallCount || 0

  // Count stale test chat messages
  const { count: messageCount } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  stats.chatMessages = messageCount || 0

  // Count stale test chat threads
  const { count: threadCount } = await supabase
    .from('chat_threads')
    .select('*', { count: 'exact', head: true })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  stats.chatThreads = threadCount || 0

  stats.total = stats.profiles + stats.documents + stats.documentEnhancements + 
                stats.aiCalls + stats.chatMessages + stats.chatThreads

  return stats
}

async function deleteStaleTestData(): Promise<CleanupStats> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const deletedStats: CleanupStats = {
    profiles: 0,
    documents: 0,
    documentEnhancements: 0,
    aiCalls: 0,
    chatMessages: 0,
    chatThreads: 0,
    total: 0
  }

  // Delete in reverse dependency order

  // Delete stale test chat messages
  const { count: deletedMessages } = await supabase
    .from('chat_messages')
    .delete({ count: 'exact' })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  deletedStats.chatMessages = deletedMessages || 0

  // Delete stale test document enhancements
  const { count: deletedEnhancements } = await supabase
    .from('document_enhancements')
    .delete({ count: 'exact' })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  deletedStats.documentEnhancements = deletedEnhancements || 0

  // Delete stale test AI calls
  const { count: deletedAiCalls } = await supabase
    .from('ai_calls')
    .delete({ count: 'exact' })
    .not('extra->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  deletedStats.aiCalls = deletedAiCalls || 0

  // Delete stale test chat threads
  const { count: deletedThreads } = await supabase
    .from('chat_threads')
    .delete({ count: 'exact' })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  deletedStats.chatThreads = deletedThreads || 0

  // Delete stale test documents
  const { count: deletedDocuments } = await supabase
    .from('documents')
    .delete({ count: 'exact' })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  deletedStats.documents = deletedDocuments || 0

  // Delete stale test profiles
  const { count: deletedProfiles } = await supabase
    .from('profiles')
    .delete({ count: 'exact' })
    .not('metadata->test_namespace', 'is', null)
    .lt('created_at', twentyFourHoursAgo)
  
  deletedStats.profiles = deletedProfiles || 0

  deletedStats.total = deletedStats.profiles + deletedStats.documents + 
                      deletedStats.documentEnhancements + deletedStats.aiCalls + 
                      deletedStats.chatMessages + deletedStats.chatThreads

  return deletedStats
}

async function main() {
  console.log('🧹 Test Data Cleanup Utility')
  console.log('===========================')
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`)
  console.log(`Time threshold: 24 hours`)
  console.log('')

  try {
    // Get counts of stale data
    console.log('Scanning for stale test data...')
    const stats = await getStaleTestData()

    if (stats.total === 0) {
      console.log('✅ No stale test data found. Database is clean!')
      return
    }

    // Display summary
    console.log('\n📊 Stale Test Data Summary:')
    console.log(`   Profiles: ${stats.profiles}`)
    console.log(`   Documents: ${stats.documents}`)
    console.log(`   Document Enhancements: ${stats.documentEnhancements}`)
    console.log(`   AI Calls: ${stats.aiCalls}`)
    console.log(`   Chat Messages: ${stats.chatMessages}`)
    console.log(`   Chat Threads: ${stats.chatThreads}`)
    console.log(`   -------------------------`)
    console.log(`   Total: ${stats.total} records`)

    if (isDryRun) {
      console.log('\n⚠️  This is a DRY RUN. No data will be deleted.')
      console.log('To actually delete the data, run with --execute flag:')
      console.log('  npm run cleanup:test-data -- --execute')
    } else {
      console.log('\n🗑️  Deleting stale test data...')
      const deletedStats = await deleteStaleTestData()
      
      console.log('\n✅ Cleanup Complete!')
      console.log(`   Deleted ${deletedStats.total} records:`)
      if (deletedStats.profiles > 0) console.log(`   - ${deletedStats.profiles} profiles`)
      if (deletedStats.documents > 0) console.log(`   - ${deletedStats.documents} documents`)
      if (deletedStats.documentEnhancements > 0) console.log(`   - ${deletedStats.documentEnhancements} enhancements`)
      if (deletedStats.aiCalls > 0) console.log(`   - ${deletedStats.aiCalls} AI calls`)
      if (deletedStats.chatMessages > 0) console.log(`   - ${deletedStats.chatMessages} chat messages`)
      if (deletedStats.chatThreads > 0) console.log(`   - ${deletedStats.chatThreads} chat threads`)
    }

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error)
    process.exit(1)
  }
}

// Run the cleanup
main()