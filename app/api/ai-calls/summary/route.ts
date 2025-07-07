import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/server-auth'
import { AIResponseInspectionService } from '@/lib/services/ai-response-inspection'

export async function GET(request: NextRequest) {
  // Allow only authenticated users – further restrict to admin if needed
  const user = await requireAuth({ request, allowBearer: true })

  // Optional admin check – if non-admin, refuse.
  const supabase = await getSupabaseServerClient(request, { allowBearer: true })
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!profile || !profile.is_admin) {
    return NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 })
  }

  const url = new URL(request.url)
  const hoursParam = url.searchParams.get('hours')
  const hours = hoursParam ? Math.max(1, Math.min(168, parseInt(hoursParam))) : 24 // cap 1–168 hours

  const inspectionService = new AIResponseInspectionService(supabase)
  const summary = await inspectionService.getRecentSummary(hours)

  return NextResponse.json(summary, { status: 200 })
} 