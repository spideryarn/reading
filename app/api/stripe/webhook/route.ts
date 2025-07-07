/**
 * Stripe webhook handler
 * Processes subscription events and updates user subscription status
 */

import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/services/stripe/client'
import { processSubscriptionWebhook } from '@/lib/services/stripe/subscriptions'
import { createRequestLogger, generateCorrelationId } from '@/lib/services/logger'
import { createProblemDetail } from '@/lib/api/error-utils'

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  const requestLogger = createRequestLogger('/api/stripe/webhook', correlationId)
  
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  requestLogger.info({
    method: 'POST',
    hasSignature: !!signature,
    bodyLength: body.length
  }, 'Processing Stripe webhook request')

  // Check if Stripe webhook secret is configured
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
  if (!webhookSecret) {
    requestLogger.error({
      error: 'STRIPE_WEBHOOK_SECRET not configured'
    }, 'Webhook secret not configured')
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/webhook-secret-missing',
      title: 'Webhook configuration error',
      status: 503,
      detail: 'Stripe webhook secret not configured',
      correlationId,
      retryable: false,
    })
  }

  if (!signature) {
    // Legacy console.error for transition period
    console.error('Missing Stripe signature')
    
    requestLogger.error({
      error: 'Missing Stripe signature'
    }, 'Webhook signature validation failed - missing signature header')
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/signature-missing',
      title: 'Missing Stripe signature',
      status: 400,
      detail: 'Stripe signature header is missing',
      correlationId,
      retryable: false,
    })
  }

  let event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )
    
    requestLogger.info({
      eventType: event.type,
      eventId: event.id
    }, 'Stripe webhook signature verified successfully')
    
  } catch (error) {
    // Legacy console.error for transition period
    console.error('Webhook signature verification failed:', error)
    
    requestLogger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    }, 'Webhook signature verification failed')
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/invalid-signature',
      title: 'Invalid signature',
      status: 400,
      detail: 'Stripe signature verification failed',
      correlationId,
      retryable: false,
    })
  }

  // Legacy console.log for transition period
  console.log(`Received webhook event: ${event.type}`)

  requestLogger.info({
    eventType: event.type,
    eventId: event.id,
    livemode: event.livemode,
    apiVersion: event.api_version
  }, `Processing webhook event: ${event.type}`)

  try {
    // Handle different webhook events
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        requestLogger.info({
          eventType: event.type,
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status
        }, `Processing subscription webhook: ${event.type}`)
        
        const result = await processSubscriptionWebhook(event)
        
        if (!result.success) {
          // Legacy console.error for transition period
          console.error('Failed to process subscription webhook:', result.error)
          
          requestLogger.error({
            eventType: event.type,
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            error: result.error
          }, 'Failed to process subscription webhook')
          
          return createProblemDetail({
            type: 'https://www.spideryarn.com/probs/processing-failed',
            title: 'Webhook processing failed',
            status: 500,
            detail: 'Failed to process subscription webhook',
            correlationId,
            retryable: true,
          })
        }
        
        requestLogger.info({
          eventType: event.type,
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status
        }, `Successfully processed subscription webhook: ${event.type}`)
        
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Legacy console.log for transition period
        console.log(`Payment succeeded for customer ${invoice.customer}`)
        
        requestLogger.info({
          eventType: event.type,
          customerId: invoice.customer,
          invoiceId: invoice.id,
          subscriptionId: 'subscription' in invoice ? invoice.subscription as string | undefined : undefined,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency
        }, 'Payment succeeded for customer')
        
        // If this is a subscription invoice, the subscription.updated event
        // will handle the status update, so we don't need to do anything here
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Legacy console.log for transition period
        console.log(`Payment failed for customer ${invoice.customer}`)
        
        requestLogger.warn({
          eventType: event.type,
          customerId: invoice.customer,
          invoiceId: invoice.id,
          subscriptionId: 'subscription' in invoice ? invoice.subscription as string | undefined : undefined,
          attemptCount: invoice.attempt_count,
          currency: invoice.currency,
          amountDue: invoice.amount_due
        }, 'Payment failed for customer')
        
        // The subscription.updated event will handle status changes
        // You might want to send notification emails here
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object
        
        // Legacy console.log for transition period
        console.log(`Trial ending soon for customer ${subscription.customer}`)
        
        requestLogger.info({
          eventType: event.type,
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          trialEnd: subscription.trial_end,
          subscriptionStatus: subscription.status
        }, 'Trial ending soon for customer')
        
        // You might want to send notification emails here
        break
      }

      default:
        // Legacy console.log for transition period
        console.log(`Unhandled webhook event type: ${event.type}`)
        
        requestLogger.info({
          eventType: event.type,
          eventId: event.id,
          livemode: event.livemode
        }, `Unhandled webhook event type: ${event.type}`)
    }

    requestLogger.info({
      eventType: event.type,
      eventId: event.id
    }, 'Webhook processed successfully')
    
    const successResponse = NextResponse.json({ received: true })
    successResponse.headers.set('x-spideryarn-correlation-id', correlationId)
    return successResponse
  } catch (error) {
    // Legacy console.error for transition period
    console.error('Error processing webhook:', error)
    
    requestLogger.error({
      eventType: event?.type,
      eventId: event?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Critical error processing webhook')
    
    return createProblemDetail({
      type: 'https://www.spideryarn.com/probs/webhook-processing-failed',
      title: 'Webhook processing error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Unknown error',
      correlationId,
      retryable: true,
    })
  }
}