/**
 * Stripe client configuration and initialization
 * Handles both server-side and client-side Stripe instances
 */

import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe client (for API calls)
// Use a dummy key if not configured to avoid build errors
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_for_build'

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
})

// Client-side Stripe instance (for frontend payment flows)
let stripePromise: ReturnType<typeof loadStripe>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

/**
 * Stripe configuration constants
 */
export const STRIPE_CONFIG = {
  // Standard monthly subscription price ID (to be set in environment)
  MONTHLY_PRICE_ID: process.env.STRIPE_PRICE_ID!,
  
  // Success and cancel URLs for Stripe Checkout
  SUCCESS_URL: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription/success`,
  CANCEL_URL: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscription/cancel`,
  
  // Customer portal return URL
  PORTAL_RETURN_URL: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/settings`,
} as const

/**
 * Subscription status type guard
 */
export function isActiveSubscriptionStatus(status: string | null): boolean {
  return status === 'active' || status === 'trialing'
}

/**
 * Validate Stripe configuration
 */
export function validateStripeConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY is required')
  }
  
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required')
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET is required')
  }
  
  if (!process.env.STRIPE_PRICE_ID) {
    errors.push('STRIPE_PRICE_ID is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}