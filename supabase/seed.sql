-- Seed data for testing
-- This file is optional and will be run after migrations during `supabase db reset`

-- Insert auth users
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 'system@spideryarn.internal', '2025-06-03T23:00:04.287Z', '2025-06-03T23:00:04.287Z', '2025-06-03T23:00:04.287Z'),
('7bfcabea-690c-4754-936d-1a194f4244c2', 'greg@gregdetre.com', '2025-06-03T23:18:01.600Z', '2025-06-03T23:18:01.590Z', '2025-06-03T23:18:01.603Z');

-- Insert user profiles
INSERT INTO public.profiles (id, user_id, preferences, created_at, updated_at) VALUES
('810bee17-f993-4aa4-9a9c-c318e2c242b1', '00000000-0000-0000-0000-000000000001', '{"type": "system", "description": "Mock system user for development"}', '2025-06-03T23:00:04.287Z', '2025-06-03T23:00:04.287Z'),
('1cecbe4f-8eb7-4007-bb89-f2c37a761dbe', '7bfcabea-690c-4754-936d-1a194f4244c2', '{}', '2025-06-03T23:18:01.590Z', '2025-06-03T23:18:01.590Z');

-- Insert AI models (based on lib/config.ts)
INSERT INTO public.ai_models (provider, model_id, version, display_name, description, context_window, max_output_tokens, supports_thinking, extra) VALUES
-- Anthropic models
('anthropic', 'claude-3-5-haiku-20241022', '3.5', 'Claude 3.5 Haiku', 'Fast and cost-effective', 200000, 8192, false, '{"tier": "cheap", "provider_tier_key": "anthropic-cheap"}'),
('anthropic', 'claude-sonnet-4-20250514', '4.0', 'Claude Sonnet 4', 'Balanced performance and cost', 200000, 8192, false, '{"tier": "balanced", "provider_tier_key": "anthropic-balanced"}'),
('anthropic', 'claude-sonnet-4-20250514', '4.0-thinking', 'Claude Sonnet 4 (Thinking)', 'Advanced reasoning with thinking mode', 200000, 8192, true, '{"tier": "balanced", "provider_tier_key": "anthropic-balanced-thinking", "thinking_mode": true}'),
('anthropic', 'claude-opus-4-20250514', '4.0', 'Claude Opus 4', 'Highest capability', 200000, 8192, false, '{"tier": "expensive", "provider_tier_key": "anthropic-expensive"}'),
-- Google models
('google', 'gemini-2.0-flash', '2.0', 'Gemini 2.0 Flash', 'Fast and cost-effective (stable)', 1000000, 8192, false, '{"tier": "cheap", "provider_tier_key": "google-cheap"}'),
('google', 'gemini-2.5-pro', '2.5', 'Gemini 2.5 Pro', 'Balanced performance', 1000000, 8192, false, '{"tier": "balanced", "provider_tier_key": "google-balanced"}'),
('google', 'gemini-2.5-pro', '2.5', 'Gemini 2.5 Pro (Expensive)', 'Same as balanced tier', 1000000, 8192, false, '{"tier": "expensive", "provider_tier_key": "google-expensive"}');

-- Insert test document for database integration testing
INSERT INTO documents (title, slug, html_content, plaintext_content, created_by, is_public) VALUES (
  'Test Document - Database Integration', 
  'test-document-database-integration',
  '<h1>Test Document - Database Integration</h1><p>This is a test document created to test the database integration for AI summarization features.</p><p>The document contains multiple paragraphs to provide sufficient content for meaningful summarization. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>',
  'Test Document - Database Integration. This is a test document created to test the database integration for AI summarization features. The document contains multiple paragraphs to provide sufficient content for meaningful summarization. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  '00000000-0000-0000-0000-000000000001',
  true
);

-- Additional documents imported from static/examples
INSERT INTO documents (id, title, slug, html_content, plaintext_content, created_by, is_public, word_count, language_code) VALUES 
('df1772a7-2f73-4c81-a267-07497557388a', 'Chalmers (1995) - Facing Up to the Problem of Consciousness cropped', 'chalmers-1995-facing-up-to-the-problem-of-consciousness-cropped', '', 'Chalmers (1995) - Facing Up to the Problem of Consciousness cropped', '00000000-0000-0000-0000-000000000001', true, 3822, 'en'),
('cb6177c5-194e-4b44-b5f8-0918f5650f27', 'Chalmers (1995) - Facing Up to the Problem of Consciousness', 'chalmers-1995-facing-up-to-the-problem-of-consciousness', '', 'Chalmers (1995) - Facing Up to the Problem of Consciousness', '00000000-0000-0000-0000-000000000001', true, 12043, 'en'),
('73535a9b-2f55-4c9c-a22d-8a268d0acf25', 'Rhizome - 1000 Plateaus introduction - Lambert says yes 231210', 'rhizome-1000-plateaus-introduction-lambert-says-yes-231210', '', 'Rhizome - 1000 Plateaus introduction - Lambert says yes 231210', '00000000-0000-0000-0000-000000000001', true, 11150, 'en'),
('ccc08694-7634-48ba-a4ba-7977c7fe03c9', 'The Bitter Lesson (original)', 'the-bitter-lesson-original', '', 'The Bitter Lesson (original)', '00000000-0000-0000-0000-000000000001', true, 1132, 'en');