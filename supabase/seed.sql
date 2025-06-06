-- Seed data for testing and development
-- This file is run after migrations during `supabase db reset`

-- Create system user for development (used for documents created without auth)
DO $$
BEGIN
  -- Check if the system user already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    -- Insert system user
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
      '', -- Empty password (user cannot log in)
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
  END IF;
END $$;

-- Create system user profile
INSERT INTO profiles (user_id, preferences) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '{"type": "system", "description": "Mock system user for development"}'::jsonb
) ON CONFLICT (user_id) DO NOTHING;

-- Insert additional test user (greg@gregdetre.com)
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at) VALUES
('7bfcabea-690c-4754-936d-1a194f4244c2', 'greg@gregdetre.com', '2025-06-03T23:18:01.600Z', '2025-06-03T23:18:01.590Z', '2025-06-03T23:18:01.603Z')
ON CONFLICT (id) DO NOTHING;

-- Insert user profile for test user
INSERT INTO public.profiles (id, user_id, preferences, created_at, updated_at) VALUES
('1cecbe4f-8eb7-4007-bb89-f2c37a761dbe', '7bfcabea-690c-4754-936d-1a194f4244c2', '{}', '2025-06-03T23:18:01.590Z', '2025-06-03T23:18:01.590Z')
ON CONFLICT (user_id) DO NOTHING;

-- Insert AI models (based on lib/config.ts)
-- Tier keys are now managed in lib/config.ts, not stored in database
INSERT INTO public.ai_models (provider, model_id, version, display_name, description, context_window, max_output_tokens, supports_thinking, extra) VALUES
-- Anthropic models
('anthropic', 'claude-3-5-haiku-20241022', '20241022', 'Claude 3.5 Haiku', 'Fast and cost-effective', 200000, 8192, false, '{}'),
('anthropic', 'claude-sonnet-4-20250514', '20250514', 'Claude Sonnet 4', 'Balanced performance and cost', 200000, 8192, false, '{}'),
('anthropic', 'claude-sonnet-4-20250514', '20250514-thinking', 'Claude Sonnet 4 (Thinking)', 'Advanced reasoning mode', 200000, 8192, true, '{}'),
('anthropic', 'claude-opus-4-20250514', '20250514', 'Claude Opus 4', 'Highest capability', 200000, 8192, false, '{}'),
-- Google models
('google', 'gemini-2.0-flash', 'latest', 'Gemini 2.0 Flash', 'Fast and cost-effective (stable)', 1000000, 8192, false, '{}'),
('google', 'gemini-2.5-pro', 'latest', 'Gemini 2.5 Pro', 'Balanced performance', 1000000, 8192, false, '{}')
ON CONFLICT (provider, model_id, version) DO NOTHING;

-- Insert test document for database integration testing
INSERT INTO documents (title, slug, html_content, plaintext_content, created_by, is_public) VALUES (
  'Test Document - Database Integration', 
  'test-document-database-integration',
  '<h1>Test Document - Database Integration</h1><p>This is a test document created to test the database integration for AI summarization features.</p><p>The document contains multiple paragraphs to provide sufficient content for meaningful summarization. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>',
  'Test Document - Database Integration. This is a test document created to test the database integration for AI summarization features. The document contains multiple paragraphs to provide sufficient content for meaningful summarization. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  '00000000-0000-0000-0000-000000000001',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Additional documents imported from static/examples
INSERT INTO documents (id, title, slug, html_content, plaintext_content, created_by, is_public, word_count, language_code) VALUES 
('df1772a7-2f73-4c81-a267-07497557388a', 'Chalmers (1995) - Facing Up to the Problem of Consciousness cropped', 'chalmers-1995-facing-up-to-the-problem-of-consciousness-cropped', '', 'Chalmers (1995) - Facing Up to the Problem of Consciousness cropped', '00000000-0000-0000-0000-000000000001', true, 3822, 'en'),
('cb6177c5-194e-4b44-b5f8-0918f5650f27', 'Chalmers (1995) - Facing Up to the Problem of Consciousness', 'chalmers-1995-facing-up-to-the-problem-of-consciousness', '', 'Chalmers (1995) - Facing Up to the Problem of Consciousness', '00000000-0000-0000-0000-000000000001', true, 12043, 'en'),
('73535a9b-2f55-4c9c-a22d-8a268d0acf25', 'Rhizome - 1000 Plateaus introduction - Lambert says yes 231210', 'rhizome-1000-plateaus-introduction-lambert-says-yes-231210', '', 'Rhizome - 1000 Plateaus introduction - Lambert says yes 231210', '00000000-0000-0000-0000-000000000001', true, 11150, 'en'),
('ccc08694-7634-48ba-a4ba-7977c7fe03c9', 'The Bitter Lesson (original)', 'the-bitter-lesson-original', '', 'The Bitter Lesson (original)', '00000000-0000-0000-0000-000000000001', true, 1132, 'en')
ON CONFLICT (id) DO NOTHING;