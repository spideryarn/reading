-- Add admin support to profiles table
-- This migration adds admin functionality by adding an is_admin timestamp field
-- to the profiles table and updating RLS policies to grant admin access.

-- Add admin timestamp field to profiles table
ALTER TABLE profiles ADD COLUMN is_admin TIMESTAMPTZ NULL;

-- Add index for RLS policy performance
CREATE INDEX idx_profiles_admin_lookup ON profiles(user_id, is_admin) WHERE is_admin IS NOT NULL;

-- Update RLS policies to include admin access

-- Documents table: Allow owners and admins to manage documents
DROP POLICY IF EXISTS "Users can manage own documents" ON documents;

CREATE POLICY "Owners and admins can manage documents" ON documents
  FOR ALL TO authenticated
  USING (
    auth.uid() = created_by::uuid OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

-- Document enhancements: Allow owners and admins to access enhancements
DROP POLICY IF EXISTS "Users can access enhancements for owned documents" ON document_enhancements;

CREATE POLICY "Owners and admins can access enhancements" ON document_enhancements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_enhancements.document_id 
      AND documents.created_by::uuid = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

-- AI calls: Allow owners and admins to access AI calls
DROP POLICY IF EXISTS "Users can access AI calls for owned documents" ON ai_calls;

CREATE POLICY "Owners and admins can access AI calls" ON ai_calls
  FOR ALL TO authenticated
  USING (
    document_id IS NULL OR -- Allow document-independent calls for creator
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = ai_calls.document_id 
      AND documents.created_by::uuid = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

-- Chat threads: Allow owners and admins to access chat threads
DROP POLICY IF EXISTS "Users can access chat for owned documents" ON chat_threads;

CREATE POLICY "Owners and admins can access chat threads" ON chat_threads
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = chat_threads.document_id 
      AND documents.created_by::uuid = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );

-- Chat messages: Allow owners and admins to access chat messages
DROP POLICY IF EXISTS "Users can access messages for accessible threads" ON chat_messages;

CREATE POLICY "Owners and admins can access chat messages" ON chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads 
      JOIN documents ON documents.id = chat_threads.document_id
      WHERE chat_threads.id = chat_messages.thread_id 
      AND documents.created_by::uuid = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
  );