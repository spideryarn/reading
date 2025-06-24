/**
 * Stripe customer management utilities
 * Handles customer creation, retrieval, and Supabase integration
 */

import Stripe from 'stripe'
import { stripe } from './client'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'
import { logger, generateCorrelationId, createTimer } from '../logger'

// Create Stripe-specific logger
const stripeLogger = logger.child({ component: 'stripe-customers' })

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

/**
 * Create a Stripe customer for a new user
 */
export async function createStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<{ customer: Stripe.Customer | null; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'createStripeCustomer')
  
  stripeLogger.info({
    operation: 'createStripeCustomer',
    userId,
    email,
    hasName: !!name,
    correlationId
  }, 'Starting Stripe customer creation')
  
  try {
    // Create customer in Stripe
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        supabase_user_id: userId,
      },
    })

    stripeLogger.info({
      operation: 'createStripeCustomer',
      userId,
      customerId: customer.id,
      correlationId
    }, 'Stripe customer created successfully')

    // Update user profile with Stripe customer ID
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('user_id', userId)

    if (updateError) {
      stripeLogger.error({
        operation: 'createStripeCustomer',
        userId,
        customerId: customer.id,
        error: updateError.message,
        correlationId
      }, 'Failed to update profile with customer ID')
      
      console.error('Failed to update profile with customer ID:', updateError)
      return { customer, error: 'Failed to link customer to profile' }
    }

    const duration = timer.end({
      userId,
      customerId: customer.id,
      correlationId
    })

    stripeLogger.info({
      operation: 'createStripeCustomer',
      userId,
      customerId: customer.id,
      duration,
      correlationId
    }, 'Stripe customer creation completed successfully')

    return { customer }
  } catch (error) {
    stripeLogger.error({
      operation: 'createStripeCustomer',
      userId,
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error creating Stripe customer')
    
    console.error('Error creating Stripe customer:', error)
    return { 
      customer: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<{ customer: Stripe.Customer | null; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'getOrCreateStripeCustomer')
  
  stripeLogger.info({
    operation: 'getOrCreateStripeCustomer',
    userId,
    email,
    hasName: !!name,
    correlationId
  }, 'Starting get or create Stripe customer')
  
  try {
    const supabase = createClient()
    
    // Check if user already has a Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      stripeLogger.error({
        operation: 'getOrCreateStripeCustomer',
        userId,
        error: profileError.message,
        correlationId
      }, 'Error fetching user profile')
      
      console.error('Error fetching user profile:', profileError)
      return { customer: null, error: 'Failed to fetch user profile' }
    }

    // If customer exists, retrieve from Stripe
    if (profile.stripe_customer_id) {
      stripeLogger.info({
        operation: 'getOrCreateStripeCustomer',
        userId,
        existingCustomerId: profile.stripe_customer_id,
        correlationId
      }, 'Found existing customer ID, retrieving from Stripe')
      
      try {
        const customer = await stripe.customers.retrieve(profile.stripe_customer_id)
        if (customer && !customer.deleted) {
          const duration = timer.end({
            userId,
            customerId: customer.id,
            action: 'retrieved_existing',
            correlationId
          })
          
          stripeLogger.info({
            operation: 'getOrCreateStripeCustomer',
            userId,
            customerId: customer.id,
            action: 'retrieved_existing',
            duration,
            correlationId
          }, 'Successfully retrieved existing Stripe customer')
          
          return { customer }
        }
      } catch (error) {
        stripeLogger.warn({
          operation: 'getOrCreateStripeCustomer',
          userId,
          existingCustomerId: profile.stripe_customer_id,
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId
        }, 'Error retrieving existing customer, will create new one')
        
        console.error('Error retrieving existing customer:', error)
        // Fall through to create new customer
      }
    }

    stripeLogger.info({
      operation: 'getOrCreateStripeCustomer',
      userId,
      action: 'creating_new',
      correlationId
    }, 'Creating new Stripe customer')

    // Create new customer
    const result = await createStripeCustomer(userId, email, name)
    
    const duration = timer.end({
      userId,
      customerId: result.customer?.id,
      action: 'created_new',
      success: !result.error,
      correlationId
    })
    
    if (result.error) {
      stripeLogger.error({
        operation: 'getOrCreateStripeCustomer',
        userId,
        action: 'created_new',
        error: result.error,
        duration,
        correlationId
      }, 'Failed to create new Stripe customer')
    } else {
      stripeLogger.info({
        operation: 'getOrCreateStripeCustomer',
        userId,
        customerId: result.customer?.id,
        action: 'created_new',
        duration,
        correlationId
      }, 'Successfully created new Stripe customer')
    }
    
    return result
  } catch (error) {
    stripeLogger.error({
      operation: 'getOrCreateStripeCustomer',
      userId,
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error in getOrCreateStripeCustomer')
    
    console.error('Error in getOrCreateStripeCustomer:', error)
    return { 
      customer: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Update subscription status in user profile
 */
export async function updateUserSubscriptionStatus(
  stripeCustomerId: string,
  subscriptionData: {
    status: string
    plan?: string
    endsAt?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'updateUserSubscriptionStatus')
  
  stripeLogger.info({
    operation: 'updateUserSubscriptionStatus',
    stripeCustomerId,
    subscriptionStatus: subscriptionData.status,
    hasPlan: !!subscriptionData.plan,
    hasEndsAt: !!subscriptionData.endsAt,
    correlationId
  }, 'Starting subscription status update')
  
  try {
    const supabase = createClient()
    
    const updateData: ProfileUpdate = {
      subscription_status: subscriptionData.status,
      updated_at: new Date().toISOString(),
    }

    if (subscriptionData.plan) {
      updateData.subscription_plan = subscriptionData.plan
    }

    if (subscriptionData.endsAt) {
      updateData.subscription_ends_at = subscriptionData.endsAt
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('stripe_customer_id', stripeCustomerId)

    if (error) {
      stripeLogger.error({
        operation: 'updateUserSubscriptionStatus',
        stripeCustomerId,
        subscriptionStatus: subscriptionData.status,
        error: error.message,
        correlationId
      }, 'Error updating subscription status in database')
      
      console.error('Error updating subscription status:', error)
      return { success: false, error: error.message }
    }

    const duration = timer.end({
      stripeCustomerId,
      subscriptionStatus: subscriptionData.status,
      correlationId
    })

    stripeLogger.info({
      operation: 'updateUserSubscriptionStatus',
      stripeCustomerId,
      subscriptionStatus: subscriptionData.status,
      plan: subscriptionData.plan,
      endsAt: subscriptionData.endsAt,
      duration,
      correlationId
    }, 'Subscription status updated successfully')

    return { success: true }
  } catch (error) {
    stripeLogger.error({
      operation: 'updateUserSubscriptionStatus',
      stripeCustomerId,
      subscriptionStatus: subscriptionData.status,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error in updateUserSubscriptionStatus')
    
    console.error('Error in updateUserSubscriptionStatus:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get user's current subscription status from database
 */
export async function getUserSubscriptionStatus(
  userId: string
): Promise<{ 
  profile: Profile | null
  hasActiveSubscription: boolean
  error?: string 
}> {
  const correlationId = generateCorrelationId()
  const timer = createTimer(stripeLogger, 'getUserSubscriptionStatus')
  
  stripeLogger.info({
    operation: 'getUserSubscriptionStatus',
    userId,
    correlationId
  }, 'Fetching user subscription status')
  
  try {
    const supabase = createClient()
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      stripeLogger.error({
        operation: 'getUserSubscriptionStatus',
        userId,
        error: error.message,
        correlationId
      }, 'Error fetching user subscription status from database')
      
      console.error('Error fetching user subscription status:', error)
      return { 
        profile: null, 
        hasActiveSubscription: false, 
        error: error.message 
      }
    }

    const hasActiveSubscription = profile.subscription_status === 'active' || 
                                 profile.subscription_status === 'trialing'

    const duration = timer.end({
      userId,
      subscriptionStatus: profile.subscription_status,
      hasActiveSubscription,
      correlationId
    })

    stripeLogger.info({
      operation: 'getUserSubscriptionStatus',
      userId,
      subscriptionStatus: profile.subscription_status,
      subscriptionPlan: profile.subscription_plan,
      hasActiveSubscription,
      duration,
      correlationId
    }, 'User subscription status retrieved successfully')

    return { 
      profile, 
      hasActiveSubscription 
    }
  } catch (error) {
    stripeLogger.error({
      operation: 'getUserSubscriptionStatus',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId
    }, 'Error in getUserSubscriptionStatus')
    
    console.error('Error in getUserSubscriptionStatus:', error)
    return { 
      profile: null, 
      hasActiveSubscription: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}