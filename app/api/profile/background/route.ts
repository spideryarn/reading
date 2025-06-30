import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server-auth'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProfileService } from '@/lib/services/database/profiles'
import { z } from 'zod'

const updateBackgroundSchema = z.object({
  background: z.string().max(5000, 'Background must be less than 5000 characters').optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user } = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validatedData = updateBackgroundSchema.parse(body)

    // Create ProfileService instance
    const supabase = await getSupabaseServerClient(request)
    const profileService = new ProfileService(supabase)

    // Update background
    const updatedProfile = await profileService.updateBackground(
      user.id,
      validatedData.background || ''
    )

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    })

  } catch (error) {
    console.error('[API] Background update error:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update background' },
      { status: 500 }
    )
  }
}