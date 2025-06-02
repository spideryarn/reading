import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | null
  const next = requestUrl.searchParams.get('next') ?? '/'

  const redirectTo = requestUrl.origin + next

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(requestUrl.origin + '/auth/auth-code-error')
}