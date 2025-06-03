-- Add Mock System User Migration
-- This migration creates a mock system user to satisfy foreign key constraints
-- during development while avoiding authentication complexity

-- =====================================================
-- Create Mock System User
-- =====================================================

-- Use a deterministic UUID for the system user
-- This ensures consistency across different environments
DO $$
BEGIN
  -- Check if the system user already exists to make migration idempotent
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    -- Insert directly into auth.users table
    -- Using INSERT rather than Supabase auth admin functions for simplicity
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'system@spideryarn.internal',
      -- Empty encrypted password (user cannot log in)
      '',
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "System User", "description": "Mock user for development foreign key constraints"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Created system user with ID: 00000000-0000-0000-0000-000000000001';
  ELSE
    RAISE NOTICE 'System user already exists, skipping creation';
  END IF;
END $$;

-- =====================================================
-- Create System User Profile
-- =====================================================

-- Create a profile for the system user
-- This satisfies any potential foreign key requirements in profiles table
INSERT INTO profiles (
  user_id,
  preferences
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '{"type": "system", "description": "Mock system user for development"}'::jsonb
) ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- Update Existing Documents
-- =====================================================

-- Update any existing documents to reference the system user
-- This ensures all documents have a valid created_by reference
UPDATE documents 
SET created_by = '00000000-0000-0000-0000-000000000001'::uuid
WHERE created_by IS NULL;

-- =====================================================
-- Update Database Schema (Optional Enhancement)
-- =====================================================

-- Add a comment to document the system user approach
COMMENT ON COLUMN documents.created_by IS 'Reference to auth.users(id). Uses system user (00000000-0000-0000-0000-000000000001) during development';
COMMENT ON COLUMN ai_calls.created_by IS 'Reference to auth.users(id). Uses system user (00000000-0000-0000-0000-000000000001) during development';
COMMENT ON COLUMN chat_threads.created_by IS 'Reference to auth.users(id). Uses system user (00000000-0000-0000-0000-000000000001) during development';

-- =====================================================
-- Verification
-- =====================================================

-- Verify the system user was created successfully
DO $$
DECLARE
  user_count INTEGER;
  document_count INTEGER;
BEGIN
  -- Check system user exists
  SELECT COUNT(*) INTO user_count 
  FROM auth.users 
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  -- Check documents are linked to system user
  SELECT COUNT(*) INTO document_count 
  FROM documents 
  WHERE created_by = '00000000-0000-0000-0000-000000000001';
  
  RAISE NOTICE 'System user exists: % | Documents linked to system user: %', 
    (user_count > 0), document_count;
END $$;