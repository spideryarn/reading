/**
 * Create Stripe Customer Portal session API route
 * Allows users to manage their subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPortalSession } from '@/lib/services/stripe/subscriptions'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is properly configured (development check)
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
      return NextResponse.json(
        { error: 'Stripe not configured - using placeholder keys' },
        { status: 503 }
      )
    }

    // Get the authenticated user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Parse request body for custom return URL (optional)
    const { returnUrl } = await request.json().catch(() => ({}))

    // Create portal session
    const { url, error: portalError } = await createPortalSession(
      profile.stripe_customer_id,
      returnUrl
    )

    if (portalError || !url) {
      console.error('Failed to create portal session:', portalError)
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error in create-portal-session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}