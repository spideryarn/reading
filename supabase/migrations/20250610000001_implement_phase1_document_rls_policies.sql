-- Phase 1 Document RLS Security Implementation
-- Replace permissive development policies with user-scoped access control
-- Planning doc: planning/250108a_document_rls_security_phase1_implementation.md

-- =====================================================
-- DROP EXISTING DEVELOPMENT POLICIES
-- =====================================================

-- Documents table - remove permissive policies
DROP POLICY IF EXISTS "Allow all read documents" ON documents;
DROP POLICY IF EXISTS "Allow all insert documents" ON documents;
DROP POLICY IF EXISTS "Allow all update documents" ON documents;
DROP POLICY IF EXISTS "Allow all delete documents" ON documents;

-- Document Enhancements table - remove permissive policies
DROP POLICY IF EXISTS "Allow all read document_enhancements" ON document_enhancements;
DROP POLICY IF EXISTS "Allow all insert document_enhancements" ON document_enhancements;
DROP POLICY IF EXISTS "Allow all update document_enhancements" ON document_enhancements;
DROP POLICY IF EXISTS "Allow all delete document_enhancements" ON document_enhancements;

-- AI Calls table - remove permissive policies
DROP POLICY IF EXISTS "Allow all read ai_calls" ON ai_calls;
DROP POLICY IF EXISTS "Allow all insert ai_calls" ON ai_calls;
DROP POLICY IF EXISTS "Allow all update ai_calls" ON ai_calls;

-- Chat Threads table - remove permissive policies
DROP POLICY IF EXISTS "Allow all read chat_threads" ON chat_threads;
DROP POLICY IF EXISTS "Allow all insert chat_threads" ON chat_threads;
DROP POLICY IF EXISTS "Allow all update chat_threads" ON chat_threads;
DROP POLICY IF EXISTS "Allow all delete chat_threads" ON chat_threads;

-- Chat Messages table - remove permissive policies
DROP POLICY IF EXISTS "Allow all read chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all insert chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all update chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all delete chat_messages" ON chat_messages;

-- Profiles table - remove permissive policies
DROP POLICY IF EXISTS "Allow all read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all update profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all delete profiles" ON profiles;

-- =====================================================
-- PHASE 1: USER-SCOPED RLS POLICIES
-- =====================================================

-- Documents: Users can only access documents they own
CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL TO authenticated
  USING (auth.uid() = created_by);

-- Document Enhancements: Users can access enhancements for documents they own
CREATE POLICY "Users can access enhancements for owned documents" ON document_enhancements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id 
      AND documents.created_by = auth.uid()
    )
  );

-- AI Calls: Users can access AI calls for documents they own
CREATE POLICY "Users can access AI calls for owned documents" ON ai_calls
  FOR ALL TO authenticated
  USING (
    document_id IS NULL OR -- Allow document-independent calls
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = ai_calls.document_id 
      AND documents.created_by = auth.uid()
    )
  );

-- Chat Threads: Users can access chat threads for documents they own
CREATE POLICY "Users can access chat for owned documents" ON chat_threads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = chat_threads.document_id 
      AND documents.created_by = auth.uid()
    )
  );

-- Chat Messages: Users can access messages for threads they can access
CREATE POLICY "Users can access messages for accessible threads" ON chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads 
      JOIN documents ON documents.id = chat_threads.document_id
      WHERE chat_threads.id = chat_messages.thread_id 
      AND documents.created_by = auth.uid()
    )
  );

-- Profiles: Users can manage their own profile
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- AI MODELS TABLE POLICY (READ-ONLY FOR ALL)
-- =====================================================
-- AI Models should remain readable by all authenticated users
CREATE POLICY "Authenticated users can read ai_models" ON ai_models
  FOR SELECT TO authenticated
  USING (true);

-- =====================================================
-- INDEXES FOR RLS PERFORMANCE
-- =====================================================
-- Add indexes to support efficient RLS policy evaluation

-- Ensure we have indexes for user lookups on foreign key relationships
-- Note: These may already exist from the original schema migration

-- Index for documents.created_by lookups (should already exist)
-- Note: created_by is already UUID type, no casting needed
CREATE INDEX IF NOT EXISTS idx_documents_created_by_uuid ON documents(created_by);

-- Index for ai_calls.document_id lookups (should already exist)
CREATE INDEX IF NOT EXISTS idx_ai_calls_document_id ON ai_calls(document_id);

-- Index for document_enhancements.document_id lookups (should already exist)
CREATE INDEX IF NOT EXISTS idx_document_enhancements_document_id ON document_enhancements(document_id);

-- Index for chat_threads.document_id lookups (should already exist)
CREATE INDEX IF NOT EXISTS idx_chat_threads_document_id ON chat_threads(document_id);

-- Index for chat_messages.thread_id lookups (should already exist)
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);

-- Index for profiles.user_id lookups (should already exist)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- These queries can be used to verify RLS is working correctly

-- Check that policies are created
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- Test user isolation (run as different users):
-- SELECT id, title, created_by FROM documents; -- Should only show user's own documents

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

COMMENT ON POLICY "Users can manage own documents" ON documents IS 
'Phase 1 RLS: Users can only CRUD documents they created. Foundation for future public/sharing features.';

COMMENT ON POLICY "Users can access enhancements for owned documents" ON document_enhancements IS 
'Phase 1 RLS: AI enhancements follow document ownership. Supports centaur-sourcing model where enhancements are shared but billing tracked.';

COMMENT ON POLICY "Users can access AI calls for owned documents" ON ai_calls IS 
'Phase 1 RLS: AI call access tied to document ownership. Maintains billing traceability while enforcing access control.';

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 Document RLS policies successfully implemented at %', NOW();
  RAISE NOTICE 'All document operations now require authentication and enforce user ownership';
  RAISE NOTICE 'Anonymous access to documents is blocked until Phase 2 public document support';
END $$;