/**
 * Stripe customer management utilities
 * Handles customer creation, retrieval, and Supabase integration
 */

import { stripe } from './client'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

/**
 * Create a Stripe customer for a new user
 */
export async function createStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<{ customer: any; error?: string }> {
  try {
    // Create customer in Stripe
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        supabase_user_id: userId,
      },
    })

    // Update user profile with Stripe customer ID
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Failed to update profile with customer ID:', updateError)
      return { customer, error: 'Failed to link customer to profile' }
    }

    return { customer }
  } catch (error) {
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
): Promise<{ customer: any; error?: string }> {
  try {
    const supabase = createClient()
    
    // Check if user already has a Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return { customer: null, error: 'Failed to fetch user profile' }
    }

    // If customer exists, retrieve from Stripe
    if (profile.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(profile.stripe_customer_id)
        if (!customer.deleted) {
          return { customer }
        }
      } catch (error) {
        console.error('Error retrieving existing customer:', error)
        // Fall through to create new customer
      }
    }

    // Create new customer
    return await createStripeCustomer(userId, email, name)
  } catch (error) {
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
      console.error('Error updating subscription status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
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
  try {
    const supabase = createClient()
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user subscription status:', error)
      return { 
        profile: null, 
        hasActiveSubscription: false, 
        error: error.message 
      }
    }

    const hasActiveSubscription = profile.subscription_status === 'active' || 
                                 profile.subscription_status === 'trialing'

    return { 
      profile, 
      hasActiveSubscription 
    }
  } catch (error) {
    console.error('Error in getUserSubscriptionStatus:', error)
    return { 
      profile: null, 
      hasActiveSubscription: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}