/**
 * Create Stripe customer API route
 * Used during user signup to create Stripe customers
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getOrCreateStripeCustomer } from '@/lib/services/stripe/customers'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'
import { createProblemDetail } from '@/lib/api/error-utils'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/stripe/create-customer', correlationId)
  
  try {
    requestLogger.info({
      method: 'POST',
      correlationId
    }, 'Stripe customer creation request initiated')
    
    // Check if Stripe is properly configured (development check)
    const stripeKey = process.env.STRIPE_SECRET_KEY || ''
    if (!stripeKey || stripeKey.includes('placeholder')) {
      requestLogger.warn({
        correlationId
      }, 'Stripe not configured for customer creation')
      
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
      requestLogger.warn({
        correlationId,
        authError: authError?.message
      }, 'Authentication failed for customer creation')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/auth-required',
        title: 'Authentication required',
        status: 401,
        detail: 'Please sign in to create a customer.'
      })
    }
    
    requestLogger.info({
      correlationId,
      userId: user.id,
      userEmail: user.email
    }, 'User authenticated for customer creation')

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
      
      requestLogger.error({
        correlationId,
        userId: user.id,
        customerError
      }, 'Failed to create/retrieve Stripe customer')
      
      return createProblemDetail({
        type: 'https://www.spideryarn.com/probs/stripe-customer-failed',
        title: 'Failed to create customer',
        status: 500,
        detail: 'Unable to create or retrieve Stripe customer.',
        correlationId
      })
    }
    
    requestLogger.info({
      correlationId,
      customerId: customer.id,
      userId: user.id
    }, 'Stripe customer created/retrieved successfully')

    return NextResponse.json({ 
      customerId: customer.id,
      success: true 
    })
  } catch (error) {
    console.error('Error in create-customer:', error)
    
    requestLogger.error({
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error in create-customer')
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/internal-server-error',
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred while creating the customer.',
      correlationId
    })
  }
}