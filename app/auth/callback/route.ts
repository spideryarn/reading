import { createClient } from '@/lib/supabase/server'
import { getOrCreateStripeCustomer } from '@/lib/services/stripe/customers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()
  const next = requestUrl.searchParams.get('next')?.toString()

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Create Stripe customer for OAuth users (both new and existing)
      // The function is idempotent, so it's safe to call for existing users
      try {
        await getOrCreateStripeCustomer(
          data.user.id,
          data.user.email!,
          data.user.user_metadata?.full_name
        )
      } catch (stripeError) {
        console.error('Failed to create Stripe customer for OAuth user:', stripeError)
        // Don't block the OAuth flow if Stripe customer creation fails
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      // Prioritize next parameter for OAuth flow, fallback to redirectTo
      const finalRedirect = next ?? redirectTo ?? '/'
      
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${finalRedirect}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${finalRedirect}`)
      } else {
        return NextResponse.redirect(`${origin}${finalRedirect}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}