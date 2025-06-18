-- Update storage RLS policies to support public document access
-- This migration adds support for anonymous users to view files for public documents

-- =====================================================
-- UPDATE STORAGE RLS POLICIES FOR PUBLIC DOCUMENTS
-- =====================================================

-- Detect if we're running locally (presence of supabase_admin role indicates local dev)
DO $$
DECLARE
  is_local_env BOOLEAN;
BEGIN
  -- Check if supabase_admin role exists (only present in local development)
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') INTO is_local_env;
  
  -- Update SELECT policy to allow anonymous access to public document files
  BEGIN
    -- Drop the existing SELECT policy
    DROP POLICY IF EXISTS "Users can access files for owned documents" ON storage.objects;
    
    -- Create new policy that includes public document support
    CREATE POLICY "Users can access files for owned documents" ON storage.objects
      FOR SELECT TO authenticated, anon
      USING (
        bucket_id = 'documents' AND
        EXISTS (
          SELECT 1 FROM documents 
          WHERE documents.id::text = split_part(name, '/', 1)
          AND (
            -- Owner can access their files
            documents.created_by = auth.uid() OR
            -- Anyone can access files for public documents
            documents.is_public = true OR
            -- Admins can access all files
            EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
          )
        )
      );
  EXCEPTION
    WHEN insufficient_privilege THEN
      IF is_local_env THEN
        RAISE WARNING 'Storage RLS policy update failed (local env): %. This is expected in local development.', SQLERRM;
      ELSE
        -- Re-raise the error in production
        RAISE;
      END IF;
  END;

  -- Keep INSERT/UPDATE/DELETE policies for authenticated users only
  -- (no changes needed - anonymous users shouldn't modify files)

  -- Add comment on updated policy
  BEGIN
    COMMENT ON POLICY "Users can access files for owned documents" ON storage.objects IS 
    'Allows authenticated users to download/view files for documents they own, anonymous users to view files for public documents, and admins to access all files.';
  EXCEPTION
    WHEN undefined_object OR insufficient_privilege THEN
      IF is_local_env THEN
        RAISE WARNING 'Could not add comment to storage policy (local env). This is expected in local development.';
      ELSE
        RAISE;
      END IF;
  END;

  -- Log migration status
  IF is_local_env THEN
    RAISE NOTICE 'Storage RLS public document support attempted (local environment) at %', NOW();
    RAISE NOTICE 'Note: Storage RLS policy update may not have succeeded due to local permission limitations';
    RAISE NOTICE 'This is expected behavior and does not affect local development';
  ELSE
    RAISE NOTICE 'Storage RLS policies successfully updated for public document support at %', NOW();
    RAISE NOTICE 'Anonymous users can now view files for public documents';
    RAISE NOTICE 'Authenticated users maintain full access to their own files';
    RAISE NOTICE 'Admin support still pending for storage policies';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check storage policies:
-- SELECT policyname, cmd, permissive, roles, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- ORDER BY policyname;

-- Test public document file access:
-- 1. Create a public document with storage_path
-- 2. As anonymous user, try to access the file
-- 3. Should succeed for public documents, fail for private