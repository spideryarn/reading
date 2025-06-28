/**
 * Create Stripe Checkout session API route
 * Handles subscription checkout flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateStripeCustomer } from '@/lib/services/stripe/customers'
import { createCheckoutSession } from '@/lib/services/stripe/subscriptions'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/stripe/create-checkout-session', correlationId)
  
  try {
    requestLogger.info({
      method: 'POST',
      correlationId
    }, 'Stripe checkout session creation request initiated')
    
    // Check if Stripe is properly configured (development check)
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    if (!stripeKey || stripeKey.includes('placeholder')) {
      requestLogger.warn({
        correlationId
      }, 'Stripe not configured - using placeholder keys')
      
      return NextResponse.json(
        { error: 'Stripe not configured - using placeholder keys' },
        { status: 503 }
      )
    }

    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      requestLogger.warn({
        correlationId,
        authError: authError?.message
      }, 'Authentication failed for checkout session')
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    requestLogger.info({
      correlationId,
      userId: user.id,
      userEmail: user.email
    }, 'User authenticated for checkout session')

    // Parse request body for URLs
    const { successUrl, cancelUrl } = await request.json().catch(() => ({}))
    
    // Get or create Stripe customer
    const { customer, error: customerError } = await getOrCreateStripeCustomer(
      user.id,
      user.email!,
      user.user_metadata?.full_name
    )
    if (customerError || !customer) {
      console.error('Failed to create/retrieve customer:', customerError)
      
      requestLogger.error({
        correlationId,
        userId: user.id,
        customerError
      }, 'Failed to create/retrieve Stripe customer')
      
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      )
    }
    
    requestLogger.info({
      correlationId,
      customerId: customer.id, // Stripe customer ID is safe to log
      userId: user.id
    }, 'Stripe customer created/retrieved successfully')

    // Create checkout session
    const { sessionId, url, error: sessionError } = await createCheckoutSession(
      customer.id,
      successUrl,
      cancelUrl
    )

    if (sessionError || !url) {
      console.error('Failed to create checkout session:', sessionError)
      
      requestLogger.error({
        correlationId,
        customerId: customer.id,
        sessionError
      }, 'Failed to create checkout session')
      
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    requestLogger.info({
      correlationId,
      sessionId,
      customerId: customer.id,
      userId: user.id
    }, 'Checkout session created successfully')

    return NextResponse.json({ 
      sessionId, 
      url,
      customerId: customer.id 
    })
  } catch (error) {
    console.error('Error in create-checkout-session:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error in create-checkout-session')
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}