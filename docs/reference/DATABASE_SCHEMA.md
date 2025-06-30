# Database Schema Reference

> ✅ **UPDATED** - This documentation reflects the current database schema as of June 2025 (last updated: January 2025).

## Overview

This document provides concise descriptions of all tables in the Spideryarn Reading database. The schema evolved from an element-decomposition approach to single-row document storage with separate AI enhancements, based on practical considerations about data complexity and query patterns.

**Key Design Decisions:**
- **Single-row documents**: Store full HTML + plaintext rather than decomposing into elements
- **Comprehensive AI tracking**: Full token usage, latency, and response metadata with direct model string storage
- **Flexible enhancements**: JSONB storage for AI-generated content with type-specific structures
- **Real-time ready**: Optimised for live updates on document enhancements and chat
- **Model string approach**: Direct model identification without database dependencies (as of June 2025)

## Schema Locations

The database schema is defined and represented in several places:

1. **SQL Migration** (Source of Truth):
   - `supabase/migrations/20250531235026_comprehensive_storage_schema.sql` - Initial comprehensive schema
   - `supabase/migrations/20250608120000_add_upload_metadata_fields.sql` - Upload metadata tracking fields
   - `supabase/migrations/20250612223724_add_admin_support.sql` - Admin functionality with is_admin timestamp field
   - `supabase/migrations/20250612235719_add_stripe_subscription_fields.sql` - Stripe subscription management fields
   - `supabase/migrations/20250615023410_add_model_string_column.sql` - Add model_string column to ai_calls
   - `supabase/migrations/20250615023551_populate_model_string_data.sql` - Populate model_string from legacy data
   - `supabase/migrations/20250615120000_finalize_model_string_migration.sql` - Complete migration to model_string system
   - `supabase/migrations/20250616161300_migrate_chat_threads_to_model_string.sql` - Migrate chat_threads to model_string
   - `supabase/migrations/20250616161430_drop_ai_models_table.sql` - Remove legacy ai_models table
   - `supabase/migrations/20250625232520_add_profile_background_column.sql` - Profile background for AI personalisation
   - `supabase/migrations/20250625235000_add_document_users_table.sql` - User-document relationships table
   - Contains CREATE TABLE statements, indexes, triggers, and initial data

2. **TypeScript Types** (Auto-generated):
   - `lib/types/database.ts`
   - Generated from Supabase schema using `npm run db:types`
   - Provides type-safe interfaces for all tables
   - Updated to reflect model_string system (no ai_models table)
   - Includes admin support, document_users, and profile customization types

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

### **`ai_models`** - ❌ REMOVED (June 2025)

**Status**: This table has been completely removed as of June 2025. Model configuration is now handled entirely through configuration files using the model string system.

**Migration Complete**: The system has successfully transitioned from UUID-based model lookups to direct model string storage. All existing data was migrated with 100% data integrity.

**Legacy Purpose**: Previously stored AI provider models with capabilities and pricing, but this created unnecessary database dependencies and maintenance overhead.

## Model String System

**Current Approach** (as of June 2025): The system now uses direct model string storage instead of database lookups.

**Model String Format**: `provider:model:version[:thinking]`

**Examples**:
- `anthropic:claude-3-5-haiku:20241022`
- `anthropic:claude-sonnet-4:20250514:thinking`
- `google:gemini-2.0-flash:latest`

**Benefits**:
- **Performance**: Eliminates database lookups on every AI call
- **Debugging**: Human-readable model identifiers in SQL queries
- **Maintenance**: All model configuration in version-controlled files
- **Flexibility**: Easy to add new models without database migrations

**Configuration**:
- **Model metadata**: Defined in `lib/config/models.ts`
- **Environment variables**: `LLM_MODEL` supports both tier keys and direct model strings
- **Backwards compatibility**: Tier keys like `anthropic-cheap` still work during transition

**Implementation**:
- Model strings stored directly in `ai_calls.model_string` column
- No foreign key dependencies on model tables
- Format validation enforced at database level
- Indexed for query performance

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
- `is_draft`: TIMESTAMPTZ, **nullable** — when a document upload starts we insert a draft row and set this to `NOW()`. When the upload is successfully finalised the column is set back to `NULL`. Any non-null value therefore marks the document as "draft / upload in progress".
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
- `model_string`: Direct model identifier (format: `provider:model:version[:thinking]`)
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
- Model strings provide direct identification without database joins

### **`document_enhancements`** - AI-Generated Content

**Purpose**: Flexible storage for all AI-generated document enhancements

**Key Fields**:
- `document_id`: Parent document
- `ai_call_id`: Links to generating AI call (contains model_string for traceability)
- `type`: Enhancement category (summary, glossary, headings, tweet-thread, other)
- `subtype`: Further classification (e.g., 'paragraph' vs 'sentence' summaries)
- `content`: JSONB with type-specific structure
- `extra`: Additional metadata

**Unique Constraint**: (document_id, type, subtype) - one enhancement per type/subtype per document

**Content Structure Examples**:

**Summary**: `{ text, keyPoints, metadata }`  
**Glossary**: `{ entries: [{ term, definition, category, aliases }] }`  
**Headings**: `{ operations: [{ action: 'insert'|'replace'|'remove', insertNewBeforeExistingId?, targetId?, content?: { tag_name: 'h1-h6', content: string } }], iteration_metadata: { iteration_count, total_operations, last_changes, more_changes_required, last_updated } }`  
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
- `model_string`: AI model used for this thread (format: `provider:model:version[:thinking]`)
- `title`: Thread title (default 'New Chat')
- `created_by`: Thread creator
- `extra`: JSONB for thread metadata

**Design Notes**: 
- Each thread tied to one document and one AI model
- Permanent lifecycle (no auto-expiry)
- Real-time updates for multi-tab chat sync
- Uses model_string system for consistent model identification

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

**Purpose**: User profiles with preferences, admin support, and subscription management

**Key Fields**:
- `user_id`: 1:1 relationship with auth.users
- `preferences`: JSONB for flexible user settings
- `is_admin`: TIMESTAMPTZ for admin access (NULL for regular users, timestamp for admins)
- `background`: TEXT field for user background/interests for AI personalisation (default '')
- `stripe_customer_id`: TEXT for Stripe payment integration
- `subscription_status`: TEXT with check constraint (active, inactive, trialing, past_due, canceled, unpaid)
- `subscription_plan`: TEXT for current subscription plan identifier
- `subscription_ends_at`: TIMESTAMPTZ for subscription period end date

**Indexes**:
- `idx_profiles_admin_lookup`: Composite index on (user_id, is_admin) for RLS policy performance
- `idx_profiles_stripe_customer_id`: For efficient Stripe customer lookups
- `idx_profiles_subscription_status`: For subscription status queries

**Design Notes**: 
- Admin access granted via timestamp in `is_admin` field (non-null = admin)
- Background field supports AI personalisation features
- Stripe integration fields support subscription management
- Helper function `has_active_subscription(user_uuid)` checks subscription status
- Unique constraint on user_id ensures 1:1 relationship
- See `planning/250612b_integrate_stripe_subscriptions.md` for subscription feature implementation planning

### **`document_users`** - User-Document Relationships

**Purpose**: Junction table storing user-specific context and reading intent for documents

**Key Fields**:
- `user_id`: References auth.users (part of composite primary key)
- `document_id`: References documents (part of composite primary key)
- `background`: TEXT for user intent/context for this specific document (default '')
- `extra`: JSONB for additional metadata and future extensibility (default '{}')
- `created_at`: TIMESTAMPTZ with automatic default
- `updated_at`: TIMESTAMPTZ with automatic update trigger

**Primary Key**: Composite (user_id, document_id)

**Indexes**:
- `idx_document_users_user_id`: For efficient user-based queries
- `idx_document_users_document_id`: For efficient document-based queries

**RLS Policies**:
- Users can manage their own document relationships
- Admin override available (users with non-null `is_admin` can access all relationships)

**Design Notes**: 
- Enables user-specific document context (e.g., "I want to understand X", "Research for project Y")
- Junction table pattern allows many-to-many relationships
- Background field supports personalised AI interactions per document
- Extra JSONB field provides extensibility without schema changes
- Automatic timestamp updates via moddatetime trigger

## TypeScript Integration

All schemas are automatically converted to TypeScript types via Supabase CLI:

```bash
npm run db:types    # Generate types from current schema
npm run db:reset:DANGEROUS    # Reset DB and regenerate types
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

**Implementation**: 
- January 2025 - comprehensive schema with AI tracking, chat, and enhancement storage
- June 2025 - model string migration completed, ai_models table removed, direct model identification system