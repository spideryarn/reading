# Database Schema Reference

> ✅ **UPDATED** - This documentation reflects the current database schema as of January 2025.

## Overview

This document provides detailed descriptions of all tables in the Spideryarn Reading database. The schema supports document storage, AI model tracking, enhancement storage, chat conversations, and user profiles.

📖 **Related Documentation:**
- [DATABASE_OVERVIEW.md](DATABASE_OVERVIEW.md) - High-level database guide
- [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) - Migration workflow
- [ARCHITECTURE.md](ARCHITECTURE.md) - Design decisions
- [planning/250531a_database_storage_implementation.md](../planning/250531a_database_storage_implementation.md) - Implementation details

## Table Schemas

### **`ai_models`** - AI Provider Models
```sql
CREATE TABLE ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'google', 'openai')),
  model_id TEXT NOT NULL,
  version TEXT NOT NULL,
  display_name TEXT NOT NULL,
  context_window INT NOT NULL,
  max_output_tokens INT NOT NULL,
  supports_images BOOLEAN DEFAULT false,
  supports_tools BOOLEAN DEFAULT false,
  supports_thinking BOOLEAN DEFAULT false,
  input_cost_per_1k DECIMAL(10,6),
  output_cost_per_1k DECIMAL(10,6),
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model_id, version)
);
```

**Purpose**: Pre-seeded reference table for AI models with capabilities and pricing  
**Key Fields**:
- `provider`: AI provider (anthropic, google, openai)
- `model_id`: Provider's model identifier
- `context_window`: Maximum tokens the model can process
- `supports_thinking`: Whether model supports thinking/reasoning tokens
- `extra`: Provider-specific metadata

### **`documents`** - Document Storage
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plaintext_content TEXT NOT NULL,
  source_url TEXT,
  language_code TEXT DEFAULT 'en',
  word_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search on plaintext content
CREATE INDEX idx_documents_plaintext_fts ON documents 
  USING gin(to_tsvector('english', plaintext_content));
```

**Purpose**: Store documents with full HTML and plaintext versions  
**Key Fields**:
- `html_content`: Original HTML content
- `plaintext_content`: Extracted text for search and AI processing
- `metadata`: Flexible storage for document properties
- `is_public`: Privacy flag for future multi-user support

### **`ai_calls`** - AI API Call Tracking
```sql
CREATE TABLE ai_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE RESTRICT,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN (
    'chat', 'summarise', 'glossary', 'headings', 'tweet-thread', 'other'
  )),
  prompt_template TEXT,
  prompt_input TEXT NOT NULL,
  response_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'success', 'failed', 'timeout'
  )),
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  reasoning_tokens INT,
  latency_ms INT,
  finish_reason TEXT,
  error_message TEXT,
  error_code TEXT,
  extra JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_ai_calls_document_id ON ai_calls(document_id);
CREATE INDEX idx_ai_calls_model_id ON ai_calls(model_id);
CREATE INDEX idx_ai_calls_prompt_type_status ON ai_calls(prompt_type, status);
CREATE INDEX idx_ai_calls_created_at ON ai_calls(created_at DESC);
```

**Purpose**: Comprehensive tracking of all AI API calls with token usage  
**Key Fields**:
- `prompt_type`: Type of AI operation
- `status`: Call status (pending, success, failed, timeout)
- Token tracking: `prompt_tokens`, `completion_tokens`, `reasoning_tokens`
- `latency_ms`: Performance metrics
- `extra`: Provider-specific response metadata

### **`document_enhancements`** - AI-Generated Content
```sql
CREATE TABLE document_enhancements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ai_call_id UUID REFERENCES ai_calls(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'summary', 'glossary', 'headings', 'tweet-thread', 'other'
  )),
  subtype TEXT,
  content JSONB NOT NULL,
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, type, subtype)
);

-- Indexes
CREATE INDEX idx_document_enhancements_document_id ON document_enhancements(document_id);
CREATE INDEX idx_document_enhancements_type ON document_enhancements(type);
CREATE INDEX idx_document_enhancements_created_at ON document_enhancements(created_at DESC);
```

**Purpose**: Store all AI-generated enhancements with flexible JSONB structure  
**Key Fields**:
- `type`: Enhancement type (summary, glossary, etc.)
- `subtype`: Further classification (e.g., 'paragraph', 'sentence' for summaries)
- `content`: JSONB field with type-specific structure
- `ai_call_id`: Links to the AI call that generated this content

**Content Examples**:
```jsonb
-- Summary
{
  "text": "Document summary text",
  "keyPoints": ["Point 1", "Point 2"],
  "metadata": { "confidence": 0.95 }
}

-- Glossary
{
  "entries": [
    {
      "term": "API",
      "definition": "Application Programming Interface",
      "category": "Technical",
      "aliases": ["Application Interface"]
    }
  ]
}

-- Headings
{
  "items": [
    {
      "id": "h1",
      "text": "Introduction",
      "level": 1,
      "parentId": null,
      "elementId": "intro"
    }
  ]
}
```

### **`chat_threads`** - Conversation Threads
```sql
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE RESTRICT,
  title TEXT DEFAULT 'New Chat',
  created_by UUID REFERENCES auth.users(id),
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_threads_document_id ON chat_threads(document_id);
CREATE INDEX idx_chat_threads_created_by ON chat_threads(created_by);
CREATE INDEX idx_chat_threads_updated_at ON chat_threads(updated_at DESC);
```

**Purpose**: Manage conversation threads linked to documents

### **`chat_messages`** - Individual Messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  ai_call_id UUID REFERENCES ai_calls(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sequence_number INT NOT NULL,
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, sequence_number)
);

-- Indexes
CREATE INDEX idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX idx_chat_messages_sequence ON chat_messages(thread_id, sequence_number);
```

**Purpose**: Store individual messages within chat threads  
**Key Fields**:
- `sequence_number`: Ensures correct message ordering
- `ai_call_id`: Links assistant messages to their AI calls
- `role`: Message sender (user, assistant, system)

### **`profiles`** - User Profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

**Purpose**: Store user preferences and settings (future expansion)

## TypeScript Types

All schemas are automatically converted to TypeScript types:

```bash
# Regenerate types after schema changes
npm run db:types

# Types are available in:
lib/types/database.ts
```

**Key Types**:
```typescript
// Table types
export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type AiCall = Database['public']['Tables']['ai_calls']['Row']
export type DocumentEnhancement = Database['public']['Tables']['document_enhancements']['Row']

// Enums
export type PromptType = 'chat' | 'summarise' | 'glossary' | 'headings' | 'tweet-thread' | 'other'
export type EnhancementType = 'summary' | 'glossary' | 'headings' | 'tweet-thread' | 'other'
export type CallStatus = 'pending' | 'success' | 'failed' | 'timeout'
export type MessageRole = 'user' | 'assistant' | 'system'
```

## Automatic Timestamps

All tables use the MODDATETIME extension for automatic `updated_at` timestamps:

```sql
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON [table_name]
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

## Row Level Security

All tables have RLS enabled with development policies:

```sql
-- Example for documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read" ON documents 
  FOR SELECT USING (true);
  
CREATE POLICY "Allow anonymous insert" ON documents 
  FOR INSERT WITH CHECK (true);
```

Future: User-scoped policies when authentication is implemented

## Real-time Subscriptions

Tables optimised for real-time updates:
- `document_enhancements` - Live AI generation updates
- `documents` - Title/metadata changes
- `chat_messages` - Multi-tab conversation sync

## Performance Considerations

1. **Indexes**: All foreign keys and common query patterns are indexed
2. **Full-text Search**: GIN index on `documents.plaintext_content`
3. **JSONB Indexing**: Can be added for specific JSONB queries if needed
4. **Cascade Deletes**: Proper cleanup when parent records are deleted
5. **Archival**: No auto-deletion; consider archival strategy for old AI calls

## Migration History

**January 2025**: Initial comprehensive schema implementation
- Migrated from decomposed element storage to single-row documents
- Added AI call tracking with token usage
- Implemented flexible enhancement storage
- Added chat functionality
- Prepared for multi-user support