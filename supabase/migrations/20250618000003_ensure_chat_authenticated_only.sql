-- Ensure chat threads and messages require authentication
-- This migration explicitly documents that chat functionality is NEVER available 
-- for public documents - all chat access requires authentication

-- =====================================================
-- VERIFY AND DOCUMENT CHAT AUTHENTICATION REQUIREMENT
-- =====================================================

-- The existing policies already restrict to authenticated users only
-- This migration adds explicit documentation to prevent future confusion

-- Update policy comments for chat_threads
COMMENT ON POLICY "Owners and admins can access chat threads" ON chat_threads IS 
'Chat threads require authentication - NO anonymous access even for public documents. Access is based on document ownership or admin status. This ensures private conversations remain private.';

-- Update policy comments for chat_messages  
COMMENT ON POLICY "Owners and admins can access chat messages" ON chat_messages IS 
'Chat messages require authentication - NO anonymous access even for public documents. Access is cascaded through thread ownership which is based on document ownership. This ensures private conversations remain private.';

-- =====================================================
-- ADD CONSTRAINT TO ENSURE CHAT INTEGRITY
-- =====================================================

-- Add check constraint to ensure chat threads always have a created_by user
ALTER TABLE chat_threads
ADD CONSTRAINT chat_threads_require_creator
CHECK (created_by IS NOT NULL);

-- Add check constraint to ensure chat messages always have a role
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_require_role
CHECK (role IS NOT NULL);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify no anonymous access is possible
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies that allow 'anon' role on chat tables
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename IN ('chat_threads', 'chat_messages')
  AND 'anon' = ANY(roles);
  
  IF policy_count > 0 THEN
    RAISE EXCEPTION 'Found % policies allowing anonymous access to chat tables!', policy_count;
  END IF;
  
  RAISE NOTICE 'Chat authentication requirement verified at %', NOW();
  RAISE NOTICE 'No anonymous access to chat threads or messages';
  RAISE NOTICE 'Chat remains private even for public documents';
END $$;

-- Verification queries:
-- Check that no anon policies exist:
-- SELECT tablename, policyname, roles 
-- FROM pg_policies 
-- WHERE tablename IN ('chat_threads', 'chat_messages')
-- ORDER BY tablename, policyname;

-- Test access patterns:
-- As anonymous user: Should get empty results for any chat queries
-- As authenticated user: Should only see chats for owned documents
-- As admin: Should see all chats