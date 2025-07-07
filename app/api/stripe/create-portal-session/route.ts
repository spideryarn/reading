/**
 * Create Stripe Customer Portal session API route
 * Allows users to manage their subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createPortalSession } from '@/lib/services/stripe/subscriptions'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'
import { createProblemDetail } from '@/lib/api/error-utils'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/stripe/create-portal-session', correlationId)
  
  try {
    requestLogger.info({
      method: 'POST',
      correlationId
    }, 'Stripe portal session creation request initiated')
    
    // Check if Stripe is properly configured (development check)
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    if (!stripeKey || stripeKey.includes('placeholder')) {
      requestLogger.warn({
        correlationId
      }, 'Stripe not configured for portal session')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/stripe-not-configured',
        title: 'Stripe not configured',
        status: 503,
        detail: 'Stripe keys are missing or placeholder. Please configure Stripe.'
      })
    }

    // Get the authenticated user
    const supabase = await getSupabaseServerClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/auth-required',
        title: 'Authentication required',
        status: 401,
        detail: 'Please sign in to access the customer portal.'
      })
    }

    // Get user's Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      requestLogger.warn({
        correlationId,
        userId: user.id,
        profileError: profileError?.message
      }, 'No subscription found for portal session')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/subscription-not-found',
        title: 'No subscription found',
        status: 404,
        detail: 'No subscription associated with this account.'
      })
    }
    
    requestLogger.info({
      correlationId,
      userId: user.id,
      customerId: profile.stripe_customer_id
    }, 'Found Stripe customer for portal session')

    // Parse request body for custom return URL (optional)
    const { returnUrl } = await request.json().catch(() => ({}))

    // Create portal session
    const { url, error: portalError } = await createPortalSession(
      profile.stripe_customer_id,
      returnUrl
    )

    if (portalError || !url) {
      console.error('Failed to create portal session:', portalError)
      
      requestLogger.error({
        correlationId,
        customerId: profile.stripe_customer_id,
        portalError
      }, 'Failed to create portal session')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/stripe-portal-failed',
        title: 'Failed to create portal session',
        status: 500,
        detail: 'Unable to create Stripe customer portal session.',
        correlationId
      })
    }
    
    requestLogger.info({
      correlationId,
      customerId: profile.stripe_customer_id,
      userId: user.id
    }, 'Portal session created successfully')

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error in create-portal-session:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error in create-portal-session')
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/internal-server-error',
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred while accessing the customer portal.',
      correlationId
    })
  }
}