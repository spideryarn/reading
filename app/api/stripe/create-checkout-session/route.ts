/**
 * Create Stripe Checkout session API route
 * Handles subscription checkout flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateStripeCustomer } from '@/lib/services/stripe/customers'
import { createCheckoutSession } from '@/lib/services/stripe/subscriptions'

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body for custom URLs (optional)
    const { successUrl, cancelUrl } = await request.json().catch(() => ({}))

    // Get or create Stripe customer
    const { customer, error: customerError } = await getOrCreateStripeCustomer(
      user.id,
      user.email!,
      user.user_metadata?.full_name
    )

    if (customerError || !customer) {
      console.error('Failed to create/retrieve customer:', customerError)
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      )
    }

    // Create checkout session
    const { sessionId, url, error: sessionError } = await createCheckoutSession(
      customer.id,
      successUrl,
      cancelUrl
    )

    if (sessionError || !url) {
      console.error('Failed to create checkout session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      sessionId, 
      url,
      customerId: customer.id 
    })
  } catch (error) {
    console.error('Error in create-checkout-session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}