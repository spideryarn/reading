-- Comprehensive Storage Schema Migration
-- This migration creates the complete database schema for Spideryarn Reading
-- including document storage, AI model tracking, enhancements, and chat functionality

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Drop existing tables from old migration (if they exist)
-- Note: CASCADE will drop dependent objects
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS document_elements CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- =====================================================
-- AI Models Table
-- =====================================================
-- Tracks AI providers and model versions with metadata
CREATE TABLE ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'google', 'openai')),
  model_id TEXT NOT NULL,
  version TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  context_window INTEGER NOT NULL,
  max_output_tokens INTEGER NOT NULL,
  supports_thinking BOOLEAN DEFAULT false,
  -- Pricing placeholders (to be updated with real data)
  input_token_cost DECIMAL(10,6),
  output_token_cost DECIMAL(10,6),
  -- Metadata
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure no duplicate models
  UNIQUE(provider, model_id, version)
);

-- =====================================================
-- Documents Table  
-- =====================================================
-- Stores complete documents with HTML and plaintext versions
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Core fields
  title TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plaintext_content TEXT NOT NULL,
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_url TEXT,
  original_file_type TEXT,
  language_code CHAR(2) DEFAULT 'en',
  word_count INTEGER,
  is_public BOOLEAN DEFAULT false,
  -- Storage reference (for future use)
  storage_path TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AI Calls Table
-- =====================================================
-- Comprehensive tracking of all LLM API calls
CREATE TABLE ai_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- References
  model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE RESTRICT,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Request details
  prompt_type TEXT NOT NULL, -- 'chat', 'summarise', 'glossary', 'headings', 'tweet-thread'
  prompt_template TEXT,
  prompt_input TEXT NOT NULL,
  -- Response details
  response_text TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'timeout')),
  error_message TEXT,
  error_code TEXT,
  -- Token usage tracking
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  reasoning_tokens INTEGER, -- For Anthropic thinking mode
  -- Performance metrics
  latency_ms INTEGER,
  finish_reason TEXT, -- 'stop', 'length', 'content-filter'
  -- Additional metadata
  extra JSONB DEFAULT '{}', -- For provider-specific data
  extra_usage JSONB DEFAULT '{}', -- For additional token types
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- Document Enhancements Table
-- =====================================================
-- Stores AI-generated content associated with documents
CREATE TABLE document_enhancements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- References
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ai_call_id UUID REFERENCES ai_calls(id) ON DELETE SET NULL,
  -- Enhancement details
  type TEXT NOT NULL, -- 'summary', 'glossary', 'headings', 'tweet-thread'
  subtype TEXT, -- For granular types like 'summary-paragraph', 'summary-sentence'
  content JSONB NOT NULL, -- Flexible storage for different enhancement structures
  -- Metadata
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one enhancement per type/subtype combination
  UNIQUE(document_id, type, subtype)
);

-- =====================================================
-- Chat Threads Table
-- =====================================================
-- Manages conversation threads
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- References
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  model_id UUID REFERENCES ai_models(id) ON DELETE RESTRICT,
  -- Thread details
  title TEXT,
  -- Metadata
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Chat Messages Table
-- =====================================================
-- Individual messages within chat threads
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- References
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  ai_call_id UUID REFERENCES ai_calls(id) ON DELETE SET NULL,
  -- Message details
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  -- Metadata
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure unique sequence per thread
  UNIQUE(thread_id, sequence_number)
);

-- =====================================================
-- Profiles Table
-- =====================================================
-- User profiles for future preferences and settings
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Placeholder for future user preferences
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One profile per user
  UNIQUE(user_id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- AI Models
CREATE INDEX idx_ai_models_provider ON ai_models(provider);
CREATE INDEX idx_ai_models_model_id ON ai_models(model_id);

-- Documents
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_is_public ON documents(is_public);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
-- Full-text search index on plaintext content
CREATE INDEX idx_documents_plaintext_fts ON documents USING gin(to_tsvector('english', plaintext_content));

-- AI Calls
CREATE INDEX idx_ai_calls_model_id ON ai_calls(model_id);
CREATE INDEX idx_ai_calls_document_id ON ai_calls(document_id);
CREATE INDEX idx_ai_calls_created_by ON ai_calls(created_by);
CREATE INDEX idx_ai_calls_prompt_type ON ai_calls(prompt_type);
CREATE INDEX idx_ai_calls_status ON ai_calls(status);
CREATE INDEX idx_ai_calls_created_at ON ai_calls(created_at DESC);

-- Document Enhancements
CREATE INDEX idx_document_enhancements_document_id ON document_enhancements(document_id);
CREATE INDEX idx_document_enhancements_ai_call_id ON document_enhancements(ai_call_id);
CREATE INDEX idx_document_enhancements_type ON document_enhancements(type);
CREATE INDEX idx_document_enhancements_document_type ON document_enhancements(document_id, type);

-- Chat Threads
CREATE INDEX idx_chat_threads_document_id ON chat_threads(document_id);
CREATE INDEX idx_chat_threads_created_by ON chat_threads(created_by);
CREATE INDEX idx_chat_threads_created_at ON chat_threads(created_at DESC);

-- Chat Messages  
CREATE INDEX idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX idx_chat_messages_ai_call_id ON chat_messages(ai_call_id);
CREATE INDEX idx_chat_messages_thread_sequence ON chat_messages(thread_id, sequence_number);

-- Profiles
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- =====================================================
-- Automatic Updated Timestamps
-- =====================================================

-- Create triggers for automatic updated_at timestamps
CREATE TRIGGER handle_ai_models_updated_at BEFORE UPDATE ON ai_models
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER handle_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER handle_document_enhancements_updated_at BEFORE UPDATE ON document_enhancements
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER handle_chat_threads_updated_at BEFORE UPDATE ON chat_threads
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- =====================================================
-- Row Level Security
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_enhancements ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Development Policies (Permissive)
-- =====================================================
-- These policies allow anonymous access during development
-- They should be replaced with proper user-scoped policies for production

-- AI Models (read-only for everyone)
CREATE POLICY "Allow all read ai_models" ON ai_models FOR SELECT USING (true);

-- Documents (full access for development)
CREATE POLICY "Allow all read documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Allow all insert documents" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update documents" ON documents FOR UPDATE USING (true);
CREATE POLICY "Allow all delete documents" ON documents FOR DELETE USING (true);

-- AI Calls (full access for development)
CREATE POLICY "Allow all read ai_calls" ON ai_calls FOR SELECT USING (true);
CREATE POLICY "Allow all insert ai_calls" ON ai_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update ai_calls" ON ai_calls FOR UPDATE USING (true);

-- Document Enhancements (full access for development)
CREATE POLICY "Allow all read document_enhancements" ON document_enhancements FOR SELECT USING (true);
CREATE POLICY "Allow all insert document_enhancements" ON document_enhancements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update document_enhancements" ON document_enhancements FOR UPDATE USING (true);
CREATE POLICY "Allow all delete document_enhancements" ON document_enhancements FOR DELETE USING (true);

-- Chat Threads (full access for development)
CREATE POLICY "Allow all read chat_threads" ON chat_threads FOR SELECT USING (true);
CREATE POLICY "Allow all insert chat_threads" ON chat_threads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update chat_threads" ON chat_threads FOR UPDATE USING (true);
CREATE POLICY "Allow all delete chat_threads" ON chat_threads FOR DELETE USING (true);

-- Chat Messages (full access for development)
CREATE POLICY "Allow all read chat_messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow all insert chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update chat_messages" ON chat_messages FOR UPDATE USING (true);
CREATE POLICY "Allow all delete chat_messages" ON chat_messages FOR DELETE USING (true);

-- Profiles (full access for development)
CREATE POLICY "Allow all read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update profiles" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Allow all delete profiles" ON profiles FOR DELETE USING (true);

-- =====================================================
-- Initial AI Model Data
-- =====================================================
-- Insert known AI models with metadata

-- Anthropic Models
INSERT INTO ai_models (provider, model_id, version, display_name, description, context_window, max_output_tokens, supports_thinking)
VALUES 
  ('anthropic', 'claude-3-5-haiku-20241022', '20241022', 'Claude 3.5 Haiku', 'Fast and cost-effective', 200000, 8192, false),
  ('anthropic', 'claude-sonnet-4-20250514', '20250514', 'Claude Sonnet 4', 'Balanced performance and cost', 200000, 8192, false),
  ('anthropic', 'claude-sonnet-4-20250514', '20250514-thinking', 'Claude Sonnet 4 (Thinking)', 'Advanced reasoning mode', 200000, 8192, true),
  ('anthropic', 'claude-opus-4-20250514', '20250514', 'Claude Opus 4', 'Highest capability', 200000, 8192, false);

-- Google Models
INSERT INTO ai_models (provider, model_id, version, display_name, description, context_window, max_output_tokens)
VALUES
  ('google', 'gemini-2.0-flash', 'latest', 'Gemini 2.0 Flash', 'Fast and cost-effective (stable)', 1000000, 8192),
  ('google', 'gemini-2.5-pro', 'latest', 'Gemini 2.5 Pro', 'Balanced performance', 1000000, 8192);

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE documents IS 'Stores complete documents with HTML and plaintext versions for reading and analysis';
COMMENT ON TABLE ai_models IS 'Registry of available AI models with their capabilities and metadata';
COMMENT ON TABLE ai_calls IS 'Comprehensive tracking of all LLM API calls including token usage and performance metrics';
COMMENT ON TABLE document_enhancements IS 'AI-generated content associated with documents (summaries, glossaries, etc)';
COMMENT ON TABLE chat_threads IS 'Conversation threads linked to documents';
COMMENT ON TABLE chat_messages IS 'Individual messages within chat conversations';
COMMENT ON TABLE profiles IS 'User profiles for storing preferences and settings';

COMMENT ON COLUMN documents.plaintext_content IS 'Plain text version of document for full-text search';
COMMENT ON COLUMN ai_calls.reasoning_tokens IS 'Token count for thinking/reasoning steps (Anthropic models only)';
COMMENT ON COLUMN document_enhancements.subtype IS 'Granular type specification, e.g., summary-sentence, summary-paragraph';
COMMENT ON COLUMN chat_messages.sequence_number IS 'Order of messages within a thread, starting from 1';