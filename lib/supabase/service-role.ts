import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client authenticated with the service-role key.
 *
 * This should only be used from trusted server-side contexts – **never** expose the
 * service-role key to the browser.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required for service-role operations')
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        // Explicitly pass the service-role key so that storage/download bypasses RLS
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  })
} 