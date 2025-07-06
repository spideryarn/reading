#!/usr/bin/env tsx

/**
 * Script to verify AI response logging implementation
 * 
 * Checks that recent AI calls have the new raw_api_response field populated
 * and that latency is being captured correctly.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/types/database-auto-generated'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function verifyAIResponseLogging() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment')
    process.exit(1)
  }

  // Create admin client to bypass RLS
  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  console.log('🔍 Checking AI response logging implementation...\n')

  // 1. Check if we can query with the new column (will fail if migration not applied)
  const { data: testQuery, error: testError } = await supabase
    .from('ai_calls')
    .select('id, raw_api_response')
    .limit(1)

  if (testError && testError.message.includes('raw_api_response')) {
    console.error('❌ Migration not applied - raw_api_response column missing')
    console.error(testError)
    process.exit(1)
  }

  console.log('✅ raw_api_response column exists')

  // 2. Check recent AI calls for populated data
  const { data: recentCalls, error: callsError } = await supabase
    .from('ai_calls')
    .select('id, created_at, model_string, prompt_type, latency_ms, raw_api_response')
    .order('created_at', { ascending: false })
    .limit(10)

  if (callsError) {
    console.error('❌ Failed to fetch recent AI calls:', callsError)
    process.exit(1)
  }

  console.log(`\n📊 Found ${recentCalls?.length || 0} recent AI calls`)

  if (!recentCalls || recentCalls.length === 0) {
    console.log('\n⚠️  No AI calls found - run some AI operations first')
    return
  }

  // 3. Analyze the calls
  let callsWithRawResponse = 0
  let callsWithLatency = 0
  let callsWithUsageData = 0

  for (const call of recentCalls) {
    if (call.raw_api_response) {
      callsWithRawResponse++
      
      // Check for usage data in raw response
      if (call.raw_api_response.usage) {
        callsWithUsageData++
      }
    }
    
    if (call.latency_ms !== null) {
      callsWithLatency++
    }
  }

  console.log(`\n📈 Analysis of recent calls:`)
  console.log(`- Calls with raw_api_response: ${callsWithRawResponse}/${recentCalls.length}`)
  console.log(`- Calls with latency_ms: ${callsWithLatency}/${recentCalls.length}`)
  console.log(`- Calls with usage data: ${callsWithUsageData}/${recentCalls.length}`)

  // 4. Show a sample of the data
  const sampleCall = recentCalls.find(c => c.raw_api_response)
  if (sampleCall && sampleCall.raw_api_response) {
    console.log('\n📝 Sample raw_api_response structure:')
    console.log(JSON.stringify({
      text: sampleCall.raw_api_response.text?.substring(0, 50) + '...',
      usage: sampleCall.raw_api_response.usage,
      finishReason: sampleCall.raw_api_response.finishReason,
      hasTimestamps: !!(sampleCall.raw_api_response.startTimestamp || sampleCall.raw_api_response.finishTimestamp),
      hasProviderMetadata: !!sampleCall.raw_api_response.experimental_providerMetadata,
      timestamp: sampleCall.raw_api_response.timestamp
    }, null, 2))
    
    if (sampleCall.latency_ms) {
      console.log(`\n⏱️  Latency: ${sampleCall.latency_ms}ms`)
    }
  }

  // 5. Summary
  console.log('\n✨ Summary:')
  if (callsWithRawResponse === recentCalls.length) {
    console.log('✅ All recent calls have raw API responses logged')
  } else if (callsWithRawResponse > 0) {
    console.log(`⚠️  Only ${callsWithRawResponse}/${recentCalls.length} calls have raw responses - migration in progress`)
  } else {
    console.log('❌ No calls have raw API responses - implementation may not be working')
  }
}

// Run the verification
verifyAIResponseLogging().catch(console.error)