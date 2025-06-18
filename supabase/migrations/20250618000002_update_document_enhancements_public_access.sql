-- Update document enhancements RLS policy to support public document visibility
-- This migration allows anonymous users to view enhancements for public documents
-- while maintaining ownership-based access for private documents

-- =====================================================
-- UPDATE DOCUMENT ENHANCEMENTS RLS POLICY
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Owners and admins can access enhancements" ON document_enhancements;

-- Create new policy that includes public document support
CREATE POLICY "Access based on document visibility" ON document_enhancements
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id
      AND (
        -- Document owner can see enhancements
        documents.created_by::uuid = auth.uid() OR
        -- Document is public (anyone can see enhancements)
        documents.is_public = true OR
        -- User is admin (can see all enhancements)
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
      )
    )
  );

-- Create separate policies for modification operations (authenticated only)
CREATE POLICY "Owners and admins can modify enhancements" ON document_enhancements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id
      AND (
        documents.created_by::uuid = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
      )
    )
  );

CREATE POLICY "Owners and admins can update enhancements" ON document_enhancements
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id
      AND (
        documents.created_by::uuid = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
      )
    )
  );

CREATE POLICY "Owners and admins can delete enhancements" ON document_enhancements
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id
      AND (
        documents.created_by::uuid = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
      )
    )
  );

-- Add comments explaining the policies
COMMENT ON POLICY "Access based on document visibility" ON document_enhancements IS 
'Allows viewing enhancements based on document visibility: owners, public documents, and admins. Anonymous users can view enhancements for public documents.';

COMMENT ON POLICY "Owners and admins can modify enhancements" ON document_enhancements IS 
'Only document owners and admins can create new enhancements. No anonymous creation allowed.';

-- =====================================================
-- UPDATE DOCUMENTS TABLE FOR PUBLIC ACCESS (Phase 2)
-- =====================================================

-- Also need to update documents table to allow anonymous read of public documents
DROP POLICY IF EXISTS "Owners and admins can manage documents" ON documents;

-- Create separate policies for different operations
CREATE POLICY "Anyone can view public documents" ON documents
  FOR SELECT TO authenticated, anon
  USING (
    -- Owner can see their documents
    created_by::uuid = auth.uid() OR
    -- Anyone can see public documents
    is_public = true OR
    -- Admins can see all documents
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

-- Only authenticated users can create/modify documents
CREATE POLICY "Authenticated users can create documents" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Users can only create documents they own
    created_by::uuid = auth.uid()
  );

CREATE POLICY "Owners and admins can update documents" ON documents
  FOR UPDATE TO authenticated
  USING (
    created_by::uuid = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

CREATE POLICY "Owners and admins can delete documents" ON documents
  FOR DELETE TO authenticated
  USING (
    created_by::uuid = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Document enhancements RLS policy updated at %', NOW();
  RAISE NOTICE 'Added public document support - anonymous users can view enhancements for public documents';
  RAISE NOTICE 'Updated documents table to support public access (Phase 2)';
  RAISE NOTICE 'Maintained separate policies for read vs write operations';
END $$;

-- Verification queries:
-- Check public document visibility:
-- SELECT d.id, d.title, d.is_public, de.type, de.content
-- FROM documents d
-- JOIN document_enhancements de ON d.id = de.document_id
-- WHERE d.is_public = true;

-- Test enhancement access patterns:
-- As anonymous: Should see public document enhancements only
-- As authenticated: Should see owned + public document enhancements
-- As admin: Should see all enhancements