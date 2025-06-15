-- Fix duplicate RLS policies and security vulnerabilities
-- This migration removes duplicate policies that were causing user isolation failures
-- and fixes the security vulnerability in AI calls policy

-- =====================================================
-- FIX 1: Remove duplicate AI calls policy
-- =====================================================
-- The "Users can access AI calls for owned documents" policy was recreated
-- after the admin migration, causing duplicate policies that break isolation
DROP POLICY IF EXISTS "Users can access AI calls for owned documents" ON ai_calls;

-- =====================================================
-- FIX 2: Fix security vulnerability in admin AI calls policy
-- =====================================================
-- The current policy allows ANY authenticated user to access document-independent
-- AI calls. We need to properly check creator ownership.
DROP POLICY IF EXISTS "Owners and admins can access AI calls" ON ai_calls;

CREATE POLICY "Owners and admins can access AI calls" ON ai_calls
  FOR ALL TO authenticated
  USING (
    -- For document-independent calls, enforce creator ownership
    -- For document-linked calls, check document ownership
    -- Admin users can access all calls
    (
      -- User owns the AI call AND either:
      auth.uid() = created_by AND (
        -- It's a document-independent call, OR
        document_id IS NULL OR 
        -- It's linked to a document they own
        EXISTS (
          SELECT 1 FROM documents 
          WHERE documents.id = ai_calls.document_id 
          AND documents.created_by = auth.uid()
        )
      )
    ) OR
    -- User is an admin
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

-- =====================================================
-- VERIFICATION: Check for any other duplicate policies
-- =====================================================
-- This comment documents what we expect after this migration:
-- - documents: "Owners and admins can manage documents"
-- - document_enhancements: "Owners and admins can access enhancements"
-- - ai_calls: "Owners and admins can access AI calls" (fixed version)
-- - chat_threads: "Owners and admins can access chat threads"
-- - chat_messages: "Owners and admins can access chat messages"
-- - profiles: "Users can manage own profile"
-- - ai_models: "Authenticated users can read ai_models" + legacy public policy

COMMENT ON POLICY "Owners and admins can access AI calls" ON ai_calls IS 
'Fixed policy: Properly enforces creator ownership for document-independent AI calls and document ownership for document-linked calls. Admins can access all calls.';

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'RLS policy fixes applied at %', NOW();
  RAISE NOTICE 'Removed duplicate AI calls policy that was breaking user isolation';
  RAISE NOTICE 'Fixed security vulnerability where any user could access document-independent AI calls';
END $$;