/**
 * Stripe services entry point
 * Exports all Stripe-related utilities and functions
 */

// Client configuration
export {
  stripe,
  getStripe,
  STRIPE_CONFIG,
  isActiveSubscriptionStatus,
  validateStripeConfig,
} from './client'

// Customer management
export {
  createStripeCustomer,
  getOrCreateStripeCustomer,
  updateUserSubscriptionStatus,
  getUserSubscriptionStatus,
} from './customers'

// Subscription management
export {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionDetails,
  cancelSubscription,
  processSubscriptionWebhook,
  getCustomerSubscriptions,
} from './subscriptions'