-- Fix infinite recursion in profiles admin access policy
-- The previous policy created infinite recursion by checking profiles table within profiles policy

-- =====================================================
-- CREATE SECURITY DEFINER FUNCTION FOR ADMIN CHECK
-- =====================================================

-- Create a SECURITY DEFINER function that runs with elevated privileges
-- This avoids the recursion issue by bypassing RLS for the admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Return true if the current user has non-null is_admin timestamp
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin IS NOT NULL
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_admin() IS 
'Security definer function to check if current user is admin. Avoids RLS recursion by running with elevated privileges.';

-- =====================================================
-- UPDATE PROFILES POLICY TO USE NEW FUNCTION
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can access own profile" ON profiles;

-- Create fixed policy using the security definer function
CREATE POLICY "Users can access own profile" ON profiles
  FOR ALL TO authenticated
  USING (
    -- Users can access their own profile
    user_id = auth.uid() OR
    -- Admins can access all profiles (using security definer function)
    public.is_admin()
  );

-- =====================================================
-- UPDATE OTHER POLICIES TO USE NEW FUNCTION
-- =====================================================

-- Update documents policies
DROP POLICY IF EXISTS "Anyone can view public documents" ON documents;
DROP POLICY IF EXISTS "Owners and admins can update documents" ON documents;
DROP POLICY IF EXISTS "Owners and admins can delete documents" ON documents;

CREATE POLICY "Anyone can view public documents" ON documents
  FOR SELECT TO authenticated, anon
  USING (
    created_by::uuid = auth.uid() OR
    is_public = true OR
    public.is_admin()
  );

CREATE POLICY "Owners and admins can update documents" ON documents
  FOR UPDATE TO authenticated
  USING (
    created_by::uuid = auth.uid() OR
    public.is_admin()
  );

CREATE POLICY "Owners and admins can delete documents" ON documents
  FOR DELETE TO authenticated
  USING (
    created_by::uuid = auth.uid() OR
    public.is_admin()
  );

-- Update document_enhancements policies
DROP POLICY IF EXISTS "Access based on document visibility" ON document_enhancements;
DROP POLICY IF EXISTS "Owners and admins can modify enhancements" ON document_enhancements;
DROP POLICY IF EXISTS "Owners and admins can update enhancements" ON document_enhancements;
DROP POLICY IF EXISTS "Owners and admins can delete enhancements" ON document_enhancements;

CREATE POLICY "Access based on document visibility" ON document_enhancements
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id
      AND (
        documents.created_by::uuid = auth.uid() OR
        documents.is_public = true OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "Owners and admins can modify enhancements" ON document_enhancements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id
      AND (
        documents.created_by::uuid = auth.uid() OR
        public.is_admin()
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
        public.is_admin()
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
        public.is_admin()
      )
    )
  );

-- Update ai_calls policy
DROP POLICY IF EXISTS "Owners and admins can access AI calls" ON ai_calls;

CREATE POLICY "Owners and admins can access AI calls" ON ai_calls
  FOR ALL TO authenticated
  USING (
    (
      auth.uid() = created_by AND (
        document_id IS NULL OR 
        EXISTS (
          SELECT 1 FROM documents 
          WHERE documents.id = ai_calls.document_id 
          AND documents.created_by = auth.uid()
        )
      )
    ) OR
    public.is_admin()
  );

-- Update chat policies
DROP POLICY IF EXISTS "Owners and admins can access chat threads" ON chat_threads;
DROP POLICY IF EXISTS "Owners and admins can access chat messages" ON chat_messages;

CREATE POLICY "Owners and admins can access chat threads" ON chat_threads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = chat_threads.document_id 
      AND documents.created_by::uuid = auth.uid()
    ) OR
    public.is_admin()
  );

CREATE POLICY "Owners and admins can access chat messages" ON chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads 
      JOIN documents ON documents.id = chat_threads.document_id
      WHERE chat_threads.id = chat_messages.thread_id 
      AND documents.created_by::uuid = auth.uid()
    ) OR
    public.is_admin()
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Fixed profiles admin recursion issue at %', NOW();
  RAISE NOTICE 'Created public.is_admin() security definer function';
  RAISE NOTICE 'Updated all RLS policies to use the new function';
  RAISE NOTICE 'Admin access should now work correctly without recursion';
END $$;

-- Test queries:
-- SELECT public.is_admin(); -- Should return true/false based on current user
-- SELECT * FROM profiles; -- Admin should see all profiles now