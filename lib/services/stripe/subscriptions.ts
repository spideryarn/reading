/**
 * Stripe subscription management utilities
 * Handles subscription creation, updates, and status checks
 */

import { stripe, STRIPE_CONFIG } from './client'
import { updateUserSubscriptionStatus } from './customers'

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<{ sessionId: string | null; url: string | null; error?: string }> {
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

    return {
      sessionId: session.id,
      url: session.url,
    }
  } catch (error) {
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
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || STRIPE_CONFIG.PORTAL_RETURN_URL,
    })

    return { url: session.url }
  } catch (error) {
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
): Promise<{ subscription: any; error?: string }> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return { subscription }
  } catch (error) {
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
): Promise<{ subscription: any; error?: string }> {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return { subscription }
  } catch (error) {
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
  event: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscription = event.data.object
    const customerId = subscription.customer
    
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
      case 'cancelled':
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
    if (subscription.current_period_end) {
      endsAt = new Date(subscription.current_period_end * 1000).toISOString()
    }

    // Update user's subscription status in database
    const result = await updateUserSubscriptionStatus(customerId, {
      status,
      plan: planId,
      endsAt,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    console.log(`Subscription ${subscription.id} status updated to ${status}`)
    return { success: true }
  } catch (error) {
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
): Promise<{ subscriptions: any[]; error?: string }> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    })

    return { subscriptions: subscriptions.data }
  } catch (error) {
    console.error('Error fetching customer subscriptions:', error)
    return {
      subscriptions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}