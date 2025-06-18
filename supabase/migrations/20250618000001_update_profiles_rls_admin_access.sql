-- Update profiles RLS policy to allow admin access
-- This migration updates the profiles policy to allow admins to view all profiles
-- while maintaining user-only access for non-admins

-- =====================================================
-- UPDATE PROFILES RLS POLICY
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

-- Create new policy that includes admin access
CREATE POLICY "Users can access own profile" ON profiles
  FOR ALL TO authenticated
  USING (
    -- Users can access their own profile
    user_id = auth.uid() OR
    -- Admins can access all profiles
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Users can access own profile" ON profiles IS 
'Users can only access their own profile. Admin users (identified by non-null is_admin timestamp) can access all profiles for administrative purposes.';

-- =====================================================
-- ADD INDEX FOR ADMIN LOOKUPS
-- =====================================================

-- Create partial index for admin lookups (only indexes rows where is_admin is not null)
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(user_id, is_admin) 
WHERE is_admin IS NOT NULL;

-- This index optimizes the admin check subquery by quickly finding admin users

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Profiles RLS policy updated at %', NOW();
  RAISE NOTICE 'Added admin access to all profiles while maintaining user isolation';
  RAISE NOTICE 'Created partial index for efficient admin lookups';
END $$;

-- Verification queries:
-- Check policy definition:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';

-- Test as regular user (should only see own profile):
-- SELECT user_id, email FROM profiles;

-- Test as admin (should see all profiles):
-- SELECT user_id, email FROM profiles; -- when is_admin IS NOT NULL