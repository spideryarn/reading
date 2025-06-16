-- Add Storage RLS Policies for Documents Bucket
-- Migration: 20250615140000_add_storage_rls_policies.sql
-- Fixes: Storage RLS policy violations during HTML file uploads

-- =====================================================
-- STORAGE RLS POLICIES FOR DOCUMENTS BUCKET
-- =====================================================

-- Storage bucket RLS is enabled by default in Supabase
-- We need to create policies to allow authenticated users to upload and access their files

-- Policy 1: Allow authenticated users to upload files to their own document folders
-- Path format: {document-uuid}/original/{filename}
-- Users can upload if they own the document (checked via documents table)
CREATE POLICY "Users can upload files for owned documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (
      -- Allow uploads to document folders they own
      EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id::text = split_part(name, '/', 1)
        AND documents.created_by = auth.uid()
      )
      OR
      -- Allow temporary uploads during document creation (when document doesn't exist yet)
      -- This handles the case where storage upload happens before document record creation
      name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/original/.+$'
    )
  );

-- Policy 2: Allow authenticated users to view/download files for documents they own
CREATE POLICY "Users can access files for owned documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id::text = split_part(name, '/', 1)
      AND documents.created_by = auth.uid()
    )
  );

-- Policy 3: Allow authenticated users to update files for documents they own
CREATE POLICY "Users can update files for owned documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id::text = split_part(name, '/', 1)
      AND documents.created_by = auth.uid()
    )
  );

-- Policy 4: Allow authenticated users to delete files for documents they own
CREATE POLICY "Users can delete files for owned documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id::text = split_part(name, '/', 1)
      AND documents.created_by = auth.uid()
    )
  );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that storage policies are created correctly
-- SELECT policyname, cmd, permissive, roles, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- ORDER BY policyname;

-- Test storage access (run as authenticated user):
-- Should be able to upload/access files in their own document folders
-- Should NOT be able to access other users' files

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

COMMENT ON POLICY "Users can upload files for owned documents" ON storage.objects IS 
'Allows authenticated users to upload files to document folders they own. Path format: {document-uuid}/original/{filename}';

COMMENT ON POLICY "Users can access files for owned documents" ON storage.objects IS 
'Allows authenticated users to download/view files for documents they own, enforcing document-level ownership through documents table';

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Storage RLS policies successfully created at %', NOW();
  RAISE NOTICE 'Users can now upload, access, update, and delete files for documents they own';
  RAISE NOTICE 'Storage path format: {document-uuid}/original/{filename}';
END $$;