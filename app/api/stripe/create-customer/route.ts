/**
 * Create Stripe customer API route
 * Used during user signup to create Stripe customers
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateStripeCustomer } from '@/lib/services/stripe/customers'

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

    // Parse optional full name from request body
    const { fullName } = await request.json().catch(() => ({}))

    // Create or get existing Stripe customer
    const { customer, error: customerError } = await getOrCreateStripeCustomer(
      user.id,
      user.email!,
      fullName
    )

    if (customerError || !customer) {
      console.error('Failed to create/retrieve customer:', customerError)
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      customerId: customer.id,
      success: true 
    })
  } catch (error) {
    console.error('Error in create-customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}