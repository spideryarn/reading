# Database Schema Reference

> ✅ **UPDATED** - This documentation reflects the current database schema as of January 2025.

## Overview

This document provides concise descriptions of all tables in the Spideryarn Reading database. The schema evolved from an element-decomposition approach to single-row document storage with separate AI enhancements, based on practical considerations about data complexity and query patterns.

**Key Design Decisions:**
- **Single-row documents**: Store full HTML + plaintext rather than decomposing into elements
- **Comprehensive AI tracking**: Full token usage, latency, and response metadata
- **Flexible enhancements**: JSONB storage for AI-generated content with type-specific structures
- **Real-time ready**: Optimised for live updates on document enhancements and chat

## Schema Locations

The database schema is defined and represented in several places:

1. **SQL Migration** (Source of Truth):
   - `supabase/migrations/20250531235026_comprehensive_storage_schema.sql` - Initial comprehensive schema
   - `supabase/migrations/20250608120000_add_upload_metadata_fields.sql` - Upload metadata tracking fields
   - Contains CREATE TABLE statements, indexes, triggers, and initial data

2. **TypeScript Types** (Auto-generated):
   - `lib/types/database.ts`
   - Generated from Supabase schema using `npm run db:types`
   - Provides type-safe interfaces for all tables

3. **Service Layer** (Database API):
   - `lib/services/database/` - Clean API for database operations
   - Each table has a corresponding service class with CRUD methods

📖 **Related Documentation:**
- [DATABASE_OVERVIEW.md](DATABASE_OVERVIEW.md) - High-level database guide
- [DATABASE_SUPABASE_STORAGE_REFERENCE.md](DATABASE_SUPABASE_STORAGE_REFERENCE.md) - File storage integration and patterns
- [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) - Migration workflow
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Design decisions
- [LLM_TRACKING_TOKEN_USAGE_LOGGING.md](LLM_TRACKING_TOKEN_USAGE_LOGGING.md) - Comprehensive token usage tracking and cost management
- [planning/250531a_database_storage_implementation.md](../planning/250531a_database_storage_implementation.md) - Implementation details

## Table Schemas

### **`ai_models`** - AI Provider Models

**Purpose**: Reference table for AI models with capabilities and pricing

**Key Fields**:
- `provider`: AI provider (anthropic, google, openai)
- `model_id` + `version`: Unique model identifier and release version
- `context_window`, `max_output_tokens`: Token limits
- `supports_thinking`: Whether model supports reasoning tokens
- Cost fields: `input_cost_per_1k`, `output_cost_per_1k` (basic pricing only)
- `extra`: JSONB for provider-specific metadata

**Tier Key Architecture**:
- **Config-based resolution**: Tier keys (e.g., 'google-cheap', 'anthropic-balanced') are managed in `lib/config.ts`
- **Database storage**: Only stores provider+model_id combinations for tracking and metadata
- **API flow**: Routes resolve tier keys to provider+model_id using config, then look up model UUID in database
- **Benefits**: Single source of truth for tier management, eliminates redundancy, easier model configuration

**Design Notes**: 
- Pre-seeded with known models, unique on (provider, model_id, version)
- Tier information removed from database - now managed purely in config
- Pricing intentionally simplified - complex caching/reasoning costs handled elsewhere
- Designed to be extended rather than comprehensive

### **`documents`** - Document Storage

**Purpose**: Single-row document storage with full HTML and searchable plaintext

**Key Fields**:
- `title`: Document title
- `html_content`: Full HTML for display
- `plaintext_content`: Extracted text for search and AI processing
- `storage_path`: Reference to original file in Supabase Storage (nullable)
- `original_file_type`: MIME type of uploaded file (e.g., 'application/pdf')
- `source_url`: Original URL if imported from web
- `language_code`: 2-letter language code (default 'en')
- `word_count`: Calculated word count
- `is_public`: Privacy flag for multi-user support
- `created_by`: Links to auth.users
- `upload_metadata`: JSONB for upload-related metadata (extraction method, provider, processing time, file size, etc.)
- `upload_ai_call_id`: Foreign key to ai_calls table linking to the AI call that processed this document during upload
- `metadata`: JSONB for flexible document properties

**Indexes**: GIN index on plaintext_content for full-text search

**Design Notes**: 
- Moved from element-decomposition to single-row for simplicity
- HTML stored in database rather than Supabase Storage for easier querying
- Plaintext extraction enables both search and AI processing
- Original files (PDFs, etc.) stored in Supabase Storage with path references
- Upload metadata tracks processing details for debugging and analytics
- Upload AI call linking provides full traceability from document to generating model and processing parameters

### **`ai_calls`** - AI API Call Tracking

**Purpose**: Comprehensive tracking of all AI API calls with usage analytics

**Key Fields**:
- `model_id`: References ai_models table
- `document_id`: Optional document context
- `prompt_type`: Operation type (chat, summarise, glossary, headings, tweet-thread, other)
- `prompt_template`: Template name (e.g., 'summarise')
- `prompt_input`: Full input text sent to AI
- `response_text`: AI response content
- `status`: Call status (pending, success, failed, timeout)

**Token Tracking** (based on Vercel AI SDK):
- `prompt_tokens`: Input tokens
- `completion_tokens`: Output tokens  
- `total_tokens`: Combined total
- `reasoning_tokens`: Thinking mode tokens (nullable)

**Performance & Debugging**:
- `latency_ms`: Call duration
- `finish_reason`: How the call completed
- `error_message`, `error_code`: Failure details
- `extra`: JSONB for provider-specific metadata

**Indexes**: Optimised for document lookups, model analysis, and time-series queries

**Design Notes**: 
- Stores extracted fields rather than raw API response (avoids serialisation issues)
- Token fields align with Vercel AI SDK structure
- Real-time updates for call status tracking

### **`document_enhancements`** - AI-Generated Content

**Purpose**: Flexible storage for all AI-generated document enhancements

**Key Fields**:
- `document_id`: Parent document
- `ai_call_id`: Links to generating AI call (and thus model)
- `type`: Enhancement category (summary, glossary, headings, tweet-thread, other)
- `subtype`: Further classification (e.g., 'paragraph' vs 'sentence' summaries)
- `content`: JSONB with type-specific structure
- `extra`: Additional metadata

**Unique Constraint**: (document_id, type, subtype) - one enhancement per type/subtype per document

**Content Structure Examples**:

**Summary**: `{ text, keyPoints, metadata }`  
**Glossary**: `{ entries: [{ term, definition, category, aliases }] }`  
**Headings**: `{ items: [{ id, text, level, parentId, elementId }] }`  
**Tweet Thread**: `{ tweets: [{ text, order }] }`

**Design Notes**: 
- JSONB enables type-specific structures without schema changes
- No versioning/history - overwrites on regeneration
- Real-time subscriptions enable live enhancement updates
- Links to ai_call provide full traceability to generating model

### **`chat_threads`** - Conversation Threads

**Purpose**: Organise conversations about specific documents

**Key Fields**:
- `document_id`: Document being discussed
- `model_id`: AI model for this conversation
- `title`: Thread title (default 'New Chat')
- `created_by`: Thread creator
- `extra`: JSONB for thread metadata

**Design Notes**: 
- Each thread tied to one document and one AI model
- Permanent lifecycle (no auto-expiry)
- Real-time updates for multi-tab chat sync

### **`chat_messages`** - Individual Messages

**Purpose**: Store chronological messages within chat threads

**Key Fields**:
- `thread_id`: Parent conversation thread
- `ai_call_id`: Links assistant messages to generating AI call
- `role`: Message sender (user, assistant, system)
- `content`: Message text
- `sequence_number`: Ordering within thread
- `extra`: JSONB for message metadata

**Unique Constraint**: (thread_id, sequence_number) - ensures correct ordering

**Design Notes**: 
- Assistant messages link to ai_calls for full traceability
- Sequence numbering prevents race conditions
- Real-time subscriptions for live chat updates

### **`profiles`** - User Profiles

**Purpose**: Future expansion for user preferences and settings

**Key Fields**:
- `user_id`: 1:1 relationship with auth.users
- `preferences`: JSONB for flexible user settings

**Design Notes**: 
- Minimal implementation for future user features
- JSONB preferences enable schema-free expansion
- Unique constraint on user_id ensures 1:1 relationship

## TypeScript Integration

All schemas are automatically converted to TypeScript types via Supabase CLI:

```bash
npm run db:types    # Generate types from current schema
npm run db:reset    # Reset DB and regenerate types
```

**Generated Types**: `lib/types/database.ts` provides full type safety for all tables, including helper types for inserts, updates, and enums.

## Automatic Timestamps & Metadata

**Timestamps**: All tables include `created_at` and `updated_at` fields with automatic updates via MODDATETIME triggers

**UUIDs**: All primary keys use `gen_random_uuid()` for globally unique identifiers

**JSONB Fields**: `extra` and `metadata` fields provide schema-free expansion without migrations

## Security & Permissions

**Row Level Security**: Enabled on all tables with development policies (currently permissive for anonymous access)

**Future Authentication**: Schema ready for user-scoped policies via `created_by` fields linking to `auth.users`

## Real-time Features

**Optimised Tables**: 
- `document_enhancements` - Live AI generation progress
- `chat_messages` - Multi-tab conversation sync  
- `documents` - Live title/metadata updates

**Subscription Patterns**: By document_id for scoped updates

## Performance & Scaling Notes

**Indexes**: Comprehensive indexing on foreign keys, timestamps, and search patterns

**Full-text Search**: GIN index on plaintext_content for document search

**JSONB**: Flexible storage with option for specific indexes as needed

**Cleanup**: Cascade deletes ensure referential integrity; no automated archival (manual cleanup for old ai_calls if needed)

## Schema Evolution

**Design Philosophy**: Moved from element-decomposition to single-row documents based on practical experience - simpler queries, better performance, easier maintenance.

**Key Decisions**: 
- Store HTML in database rather than Supabase Storage (enables SQL queries)
- Extract AI response fields rather than store raw responses (avoid serialisation issues)
- JSONB for flexible enhancement content (no schema changes for new AI features)
- Comprehensive token tracking for cost analysis and debugging
- Real-time ready architecture for live updates

**Implementation**: January 2025 - comprehensive schema with AI tracking, chat, and enhancement storage