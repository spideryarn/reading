-- Fix document_assets RLS policies to use public.is_admin() function
-- This corrects the original migration which used direct profile table queries that can cause RLS recursion

-- Drop existing policies
DROP POLICY IF EXISTS "Users and admins can view document assets" ON document_assets;
DROP POLICY IF EXISTS "Authenticated users and admins can manage document assets" ON document_assets;

-- Recreate policies using public.is_admin() function to prevent RLS recursion
CREATE POLICY "Users and admins can view document assets" ON document_assets
    FOR SELECT TO authenticated, anon
    USING (
        -- User has access to the parent document (follows document access patterns)
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_assets.document_id 
            AND (
                documents.is_public = true OR
                documents.created_by = auth.uid() OR
                public.is_admin()
            )
        )
    );

-- Only authenticated users can insert/update/delete assets for documents they own or if admin
CREATE POLICY "Authenticated users and admins can manage document assets" ON document_assets
    FOR ALL TO authenticated
    USING (
        -- User owns the parent document OR is admin
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_assets.document_id 
            AND (
                documents.created_by = auth.uid() OR
                public.is_admin()
            )
        )
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log successful policy update
DO $$
BEGIN
  RAISE NOTICE 'Document_assets RLS policies updated at %', NOW();
  RAISE NOTICE 'Replaced direct profile table queries with public.is_admin() function calls';
  RAISE NOTICE 'This prevents RLS recursion issues and aligns with established security patterns';
END $$;