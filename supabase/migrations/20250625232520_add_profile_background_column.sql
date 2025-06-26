-- Add background column to profiles table
-- This column stores free-text user background information about their interests and expertise
-- for AI personalisation features

-- Add background column to profiles table
ALTER TABLE profiles ADD COLUMN background TEXT NOT NULL DEFAULT '';

-- Add comment to document the column purpose
COMMENT ON COLUMN profiles.background IS 'Free-text user background information about their interests and expertise for AI personalisation features';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Profiles background column added at %', NOW();
  RAISE NOTICE 'Added background TEXT column with NOT NULL DEFAULT empty string constraint';
END $$;

-- Verification query to confirm column was added:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'background';