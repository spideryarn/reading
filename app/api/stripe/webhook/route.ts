/**
 * Stripe webhook handler
 * Processes subscription events and updates user subscription status
 */

import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/services/stripe/client'
import { processSubscriptionWebhook } from '@/lib/services/stripe/subscriptions'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    console.error('Missing Stripe signature')
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    )
  }

  let event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  console.log(`Received webhook event: ${event.type}`)

  try {
    // Handle different webhook events
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const result = await processSubscriptionWebhook(event)
        
        if (!result.success) {
          console.error('Failed to process subscription webhook:', result.error)
          return NextResponse.json(
            { error: 'Failed to process webhook' },
            { status: 500 }
          )
        }
        
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        console.log(`Payment succeeded for customer ${invoice.customer}`)
        
        // If this is a subscription invoice, the subscription.updated event
        // will handle the status update, so we don't need to do anything here
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.log(`Payment failed for customer ${invoice.customer}`)
        
        // The subscription.updated event will handle status changes
        // You might want to send notification emails here
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object
        console.log(`Trial ending soon for customer ${subscription.customer}`)
        
        // You might want to send notification emails here
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}