import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error signing out:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(`${requestUrl.origin}/`, {
    status: 302,
  })
}