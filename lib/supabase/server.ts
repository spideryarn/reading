import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// Helper to create a Supabase server client. `cookies()` is asynchronous, so
// we keep this helper `async` and always `await createClient()` at call-sites.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Create a Supabase server client with optional Bearer token support.
 * 
 * This function provides a unified way to create Supabase clients that can work
 * with both cookie-based authentication (default) and Bearer token authentication
 * (explicit opt-in for testing scenarios).
 * 
 * @param request - The incoming request object for Bearer token extraction
 * @param opts - Configuration options
 * @param opts.allowBearer - Allow Bearer token authentication (explicit opt-in only)
 * @returns Promise<SupabaseClient> - Configured Supabase client
 * 
 * @example
 * ```typescript
 * // Default cookie-based authentication
 * const supabase = await getSupabaseServerClient(request)
 * 
 * // Bearer token authentication for testing
 * const supabase = await getSupabaseServerClient(request, { allowBearer: true })
 * ```
 */
export async function getSupabaseServerClient(
  request: Request,
  opts?: { allowBearer?: boolean }
): Promise<SupabaseClient> {
  // If Bearer token is explicitly allowed, check for Authorization header
  if (opts?.allowBearer) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const jwt = authHeader.slice(7)
      
      // Create a header-authenticated client (no caching for security)
      return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              'Authorization': `Bearer ${jwt}`
            }
          }
        }
      )
    }
  }
  
  // Fall back to standard cookie-based server client
  return await createClient()
}

// Re-export for backwards compatibility
export { createServerClient }