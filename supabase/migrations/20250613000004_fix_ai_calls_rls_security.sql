-- Fix AI Calls RLS Policy Security Vulnerability
-- This migration fixes a critical security vulnerability where document-independent
-- AI calls (document_id = NULL) could be accessed by any authenticated user.
-- The vulnerability allowed cross-user data access, violating user isolation.

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Owners and admins can access AI calls" ON ai_calls;

-- Create secure policy that enforces creator ownership for document-independent calls
CREATE POLICY "Owners and admins can access AI calls" ON ai_calls
  FOR ALL TO authenticated
  USING (
    -- For document-independent calls, enforce creator ownership
    -- For document-linked calls, check document ownership
    -- Admin users can access all calls
    auth.uid() = created_by AND (
      document_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = ai_calls.document_id 
        AND documents.created_by::uuid = auth.uid()
      )
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );