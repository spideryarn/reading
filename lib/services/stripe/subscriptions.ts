/**
 * Stripe subscription management utilities
 * Handles subscription creation, updates, and status checks
 */

import Stripe from 'stripe'
import { stripe, STRIPE_CONFIG } from './client'
import { updateUserSubscriptionStatus } from './customers'
import { logger, generateCorrelationId, createTimer } from '../logger'

// Create Stripe-specific logger for subscriptions
const stripeLogger = logger.child({ component: 'stripe-subscriptions' })

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<{ sessionId: string | null; url: string | null; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'createCheckoutSession')
  
  stripeLogger.info({
    operation: 'createCheckoutSession',
    customerId,
    hasCustomSuccessUrl: !!successUrl,
    hasCustomCancelUrl: !!cancelUrl,
    correlationId
  }, 'Creating Stripe checkout session')
  
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || STRIPE_CONFIG.SUCCESS_URL,
      cancel_url: cancelUrl || STRIPE_CONFIG.CANCEL_URL,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        customer_id: customerId,
      },
    })

    const duration = timer.end({
      customerId,
      sessionId: session.id,
      correlationId
    })

    stripeLogger.info({
      operation: 'createCheckoutSession',
      customerId,
      sessionId: session.id,
      hasUrl: !!session.url,
      duration,
      correlationId
    }, 'Stripe checkout session created successfully')

    return {
      sessionId: session.id,
      url: session.url,
    }
  } catch (error) {
    stripeLogger.error({
      operation: 'createCheckoutSession',
      customerId,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error creating checkout session')
    
    console.error('Error creating checkout session:', error)
    return {
      sessionId: null,
      url: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl?: string
): Promise<{ url: string | null; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'createPortalSession')
  
  stripeLogger.info({
    operation: 'createPortalSession',
    customerId,
    hasCustomReturnUrl: !!returnUrl,
    correlationId
  }, 'Creating Stripe customer portal session')
  
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || STRIPE_CONFIG.PORTAL_RETURN_URL,
    })

    const duration = timer.end({
      customerId,
      correlationId
    })

    stripeLogger.info({
      operation: 'createPortalSession',
      customerId,
      hasUrl: !!session.url,
      duration,
      correlationId
    }, 'Stripe customer portal session created successfully')

    return { url: session.url }
  } catch (error) {
    stripeLogger.error({
      operation: 'createPortalSession',
      customerId,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error creating portal session')
    
    console.error('Error creating portal session:', error)
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscriptionDetails(
  subscriptionId: string
): Promise<{ subscription: Stripe.Subscription | null; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'getSubscriptionDetails')
  
  stripeLogger.info({
    operation: 'getSubscriptionDetails',
    subscriptionId,
    correlationId
  }, 'Retrieving subscription details from Stripe')
  
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    const duration = timer.end({
      subscriptionId,
      subscriptionStatus: subscription.status,
      correlationId
    })

    stripeLogger.info({
      operation: 'getSubscriptionDetails',
      subscriptionId,
      subscriptionStatus: subscription.status,
      customerId: subscription.customer,
      duration,
      correlationId
    }, 'Subscription details retrieved successfully')
    
    return { subscription }
  } catch (error) {
    stripeLogger.error({
      operation: 'getSubscriptionDetails',
      subscriptionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error retrieving subscription')
    
    console.error('Error retrieving subscription:', error)
    return {
      subscription: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Cancel a subscription immediately
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<{ subscription: Stripe.Subscription | null; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'cancelSubscription')
  
  stripeLogger.info({
    operation: 'cancelSubscription',
    subscriptionId,
    correlationId
  }, 'Canceling subscription in Stripe')
  
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    
    const duration = timer.end({
      subscriptionId,
      newStatus: subscription.status,
      correlationId
    })

    stripeLogger.info({
      operation: 'cancelSubscription',
      subscriptionId,
      oldStatus: 'active', // Assumption - only active subscriptions can be canceled
      newStatus: subscription.status,
      customerId: subscription.customer,
      duration,
      correlationId
    }, 'Subscription canceled successfully')
    
    return { subscription }
  } catch (error) {
    stripeLogger.error({
      operation: 'cancelSubscription',
      subscriptionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error canceling subscription')
    
    console.error('Error canceling subscription:', error)
    return {
      subscription: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process subscription webhook event
 */
export async function processSubscriptionWebhook(
  event: Stripe.Event
): Promise<{ success: boolean; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'processSubscriptionWebhook')
  
  const subscription = event.data.object as Stripe.Subscription
  const subscriptionId = subscription.id
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  
  stripeLogger.info({
    operation: 'processSubscriptionWebhook',
    eventType: event.type,
    subscriptionId,
    customerId,
    stripeStatus: subscription.status,
    correlationId
  }, 'Processing subscription webhook event')
  
  try {
    let status: string
    let planId: string | undefined
    let endsAt: string | undefined

    // Map Stripe subscription status to our internal status
    switch (subscription.status) {
      case 'active':
        status = 'active'
        break
      case 'trialing':
        status = 'trialing'
        break
      case 'past_due':
        status = 'past_due'
        break
      case 'canceled':
        status = 'canceled'
        break
      case 'unpaid':
        status = 'unpaid'
        break
      default:
        status = 'inactive'
    }

    // Extract plan information
    if (subscription.items?.data?.[0]?.price) {
      planId = subscription.items.data[0].price.id
    }

    // Extract end date
    if ('current_period_end' in subscription && subscription.current_period_end) {
      const periodEnd = subscription.current_period_end as number
      endsAt = new Date(periodEnd * 1000).toISOString()
    }

    stripeLogger.info({
      operation: 'processSubscriptionWebhook',
      subscriptionId,
      customerId,
      stripeStatus: subscription.status,
      mappedStatus: status,
      planId,
      endsAt,
      correlationId
    }, 'Webhook data processed, updating database')

    // Update user's subscription status in database
    const result = await updateUserSubscriptionStatus(customerId, {
      status,
      ...(planId && { plan: planId }),
      ...(endsAt && { endsAt }),
    })

    if (!result.success) {
      stripeLogger.error({
        operation: 'processSubscriptionWebhook',
        subscriptionId,
        customerId,
        status,
        error: result.error,
        correlationId
      }, 'Failed to update subscription status in database')
      
      return { success: false, error: result.error || 'Unknown error' }
    }

    const duration = timer.end({
      subscriptionId,
      customerId,
      status,
      eventType: event.type,
      correlationId
    })

    stripeLogger.info({
      operation: 'processSubscriptionWebhook',
      subscriptionId,
      customerId,
      eventType: event.type,
      stripeStatus: subscription.status,
      mappedStatus: status,
      duration,
      correlationId
    }, 'Subscription webhook processed successfully')

    console.log(`Subscription ${subscription.id} status updated to ${status}`)
    return { success: true }
  } catch (error) {
    stripeLogger.error({
      operation: 'processSubscriptionWebhook',
      subscriptionId,
      customerId,
      eventType: event.type,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error processing subscription webhook')
    
    console.error('Error processing subscription webhook:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get all subscriptions for a customer
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<{ subscriptions: Stripe.Subscription[]; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'getCustomerSubscriptions')
  
  stripeLogger.info({
    operation: 'getCustomerSubscriptions',
    customerId,
    correlationId
  }, 'Fetching customer subscriptions from Stripe')
  
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    })

    const duration = timer.end({
      customerId,
      subscriptionCount: subscriptions.data.length,
      correlationId
    })

    stripeLogger.info({
      operation: 'getCustomerSubscriptions',
      customerId,
      subscriptionCount: subscriptions.data.length,
      subscriptionStatuses: subscriptions.data.map(sub => sub.status),
      duration,
      correlationId
    }, 'Customer subscriptions retrieved successfully')

    return { subscriptions: subscriptions.data }
  } catch (error) {
    stripeLogger.error({
      operation: 'getCustomerSubscriptions',
      customerId,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error fetching customer subscriptions')
    
    console.error('Error fetching customer subscriptions:', error)
    return {
      subscriptions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}