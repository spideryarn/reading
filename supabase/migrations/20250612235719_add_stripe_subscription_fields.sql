-- Add Stripe subscription tracking fields to profiles table
-- This migration extends the existing profiles table with Stripe customer and subscription information

-- Add Stripe-related columns to the profiles table
ALTER TABLE profiles 
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN subscription_status TEXT CHECK (subscription_status IN ('active', 'inactive', 'trialing', 'past_due', 'canceled', 'unpaid')),
ADD COLUMN subscription_plan TEXT,
ADD COLUMN subscription_ends_at TIMESTAMPTZ;

-- Add indexes for efficient querying
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_subscription_status ON profiles(subscription_status);

-- Add comments for documentation
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN profiles.subscription_status IS 'Current subscription status from Stripe webhooks';
COMMENT ON COLUMN profiles.subscription_plan IS 'Current subscription plan identifier';
COMMENT ON COLUMN profiles.subscription_ends_at IS 'When current subscription period ends (for trial/billing cycles)';

-- Create a helper function to check if a user has an active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub_status TEXT;
BEGIN
  SELECT subscription_status 
  INTO sub_status
  FROM profiles 
  WHERE user_id = user_uuid;
  
  -- Consider 'active' and 'trialing' as having access
  RETURN sub_status IN ('active', 'trialing');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION has_active_subscription(UUID) TO authenticated;