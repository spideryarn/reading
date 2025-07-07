import { NextRequest, NextResponse } from 'next/server'
import { createProblemDetail } from '@/lib/api/error-utils'
import { generateCorrelationId } from '@/lib/services/logger'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/server-auth'
import { AIResponseInspectionService } from '@/lib/services/ai-response-inspection'

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId()

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
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'Admin access required',
      correlationId,
    })
  }

  const url = new URL(request.url)
  const hoursParam = url.searchParams.get('hours')
  const hours = hoursParam ? Math.max(1, Math.min(168, parseInt(hoursParam))) : 24 // cap 1–168 hours

  const inspectionService = new AIResponseInspectionService(supabase)
  const summary = await inspectionService.getRecentSummary(hours)

  const successResponse = NextResponse.json(summary, { status: 200 })
  successResponse.headers.set('x-spideryarn-correlation-id', correlationId)
  return successResponse
} 