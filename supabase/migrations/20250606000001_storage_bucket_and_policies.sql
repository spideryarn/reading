-- Create documents storage bucket and RLS policies
-- Migration: 20250606000001_storage_bucket_and_policies.sql

-- Create the documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents', 
  false,  -- Private bucket
  52428800,  -- 50MB in bytes
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html', 'text/plain']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS on storage.objects is already enabled by default in Supabase
-- Storage policies need to be created through the dashboard or client library
-- for local development due to permission restrictions

-- TODO: Create storage policies through Supabase Studio:
-- 1. Allow authenticated users to upload/view their own documents
-- 2. Allow public access to documents marked as public
-- 3. Allow system user full access during development

-- For now, we'll handle access control through the application layer