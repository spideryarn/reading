-- Fix AI Calls RLS Security Bug
-- The current policy allows any authenticated user to access any document-independent AI call
-- This is a security vulnerability that should be fixed

-- Drop the current flawed policy
DROP POLICY IF EXISTS "Users can access AI calls for owned documents" ON ai_calls;

-- Create the corrected policy that properly isolates document-independent AI calls
CREATE POLICY "Users can access AI calls for owned documents" ON ai_calls
  FOR ALL TO authenticated
  USING (
    -- Document-independent calls: user must be the creator
    (document_id IS NULL AND created_by = auth.uid()) OR
    -- Document-dependent calls: user must own the document
    (document_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = ai_calls.document_id 
      AND documents.created_by = auth.uid()
    ))
  );

COMMENT ON POLICY "Users can access AI calls for owned documents" ON ai_calls IS 
'Phase 1 RLS: AI call access tied to document ownership AND creator ownership for document-independent calls. Fixes security vulnerability where any user could access any document-independent AI call.';

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'AI calls RLS security bug fixed at %', NOW();
  RAISE NOTICE 'Document-independent AI calls now properly isolated by creator';
END $$;