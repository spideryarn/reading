import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateCorrelationId } from '@/lib/services/logger'

export async function middleware(request: NextRequest) {
  // --- Correlation ID handling (Quick-Wins error-handling overhaul) ---
  const CORRELATION_HEADER = 'x-spideryarn-correlation-id'
  const correlationId =
    request.headers.get(CORRELATION_HEADER) ?? generateCorrelationId()

  // Clone request headers so we can inject the correlation ID for downstream route handlers
  const modifiedRequestHeaders = new Headers(request.headers)
  modifiedRequestHeaders.set(CORRELATION_HEADER, correlationId)

  // Initialise response with modified request (must occur before Supabase client for cookie handling)
  let response = NextResponse.next({ request: { headers: modifiedRequestHeaders } })
  
  // --- Existing Supabase auth initialisation ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value))
          // Re-create response to include new cookies *and* preserve correlation header
          response = NextResponse.next({ request: { headers: modifiedRequestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()

  // Ensure outgoing response carries the correlation ID
  response.headers.set(CORRELATION_HEADER, correlationId)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}