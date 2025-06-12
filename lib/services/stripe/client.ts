/**
 * Stripe client configuration and initialization
 * Handles both server-side and client-side Stripe instances
 */

import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe client (for API calls)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

// Client-side Stripe instance (for frontend payment flows)
let stripePromise: Promise<any>

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