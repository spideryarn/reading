-- Remove admin privileges from system test user for RLS testing
-- The system user (00000000-0000-0000-0000-000000000001) was inadvertently
-- given admin privileges in seed.sql, which breaks RLS isolation tests

-- Remove admin privileges from the system user
UPDATE profiles 
SET is_admin = NULL 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Removed admin privileges from system test user at %', NOW();
  RAISE NOTICE 'This ensures RLS tests properly validate user isolation';
END $$;