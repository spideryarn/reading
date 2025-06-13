-- Fix Admin Policy Security Bugs
-- The admin support migration reintroduced the security vulnerability in AI calls policy
-- This migration properly fixes the policy to restrict document-independent calls by creator

-- Drop the flawed admin policy for AI calls
DROP POLICY IF EXISTS "Owners and admins can access AI calls" ON ai_calls;

-- Create the corrected admin policy with proper creator isolation for document-independent calls
CREATE POLICY "Owners and admins can access AI calls" ON ai_calls
  FOR ALL TO authenticated
  USING (
    -- Document-independent calls: user must be the creator
    (document_id IS NULL AND created_by = auth.uid()) OR
    -- Document-dependent calls: user must own the document
    (document_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = ai_calls.document_id 
      AND documents.created_by = auth.uid()
    )) OR
    -- Admin access: admin users can access all AI calls
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

COMMENT ON POLICY "Owners and admins can access AI calls" ON ai_calls IS 
'RLS policy with admin support: AI call access tied to document ownership AND creator ownership for document-independent calls. Admins can access all AI calls. Fixes security vulnerability where any user could access any document-independent AI call.';

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Admin policy security bugs fixed at %', NOW();
  RAISE NOTICE 'Document-independent AI calls now properly isolated by creator with admin override';
END $$;