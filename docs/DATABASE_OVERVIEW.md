# Database Guide

> ✅ **UPDATED** - This documentation reflects the current database implementation as of January 2025.

## Overview

Spideryarn Reading uses PostgreSQL via Supabase for persistent storage. The database stores documents, AI model usage, document enhancements, chat conversations, and user profiles.

**Architecture**: Single-row document storage with AI enhancements stored separately  
**Real-time**: Supports live updates via Supabase Realtime subscriptions  
**Type Safety**: Full TypeScript type generation from database schema

📖 **Related Documentation:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - Database design decisions
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Detailed table descriptions
- [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) - Migration workflow
- [SETUP.md](SETUP.md) - How to start Supabase locally
- [planning/250531a_database_storage_implementation.md](../planning/250531a_database_storage_implementation.md) - Implementation details

## Current Schema

### **Core Tables**

1. **`ai_models`** - Pre-seeded AI provider models (Anthropic, Google)
   - Tracks model versions, context windows, pricing
   - Referenced by AI calls and chat threads

2. **`documents`** - Document storage with full HTML and plaintext
   - Stores content inline (not decomposed into elements)
   - Includes metadata: title, URL, language, word count
   - Full-text search enabled on plaintext content

3. **`ai_calls`** - Comprehensive AI API call tracking
   - Links to model and document
   - Tracks token usage: prompt, completion, reasoning
   - Performance metrics: latency, status, errors

4. **`document_enhancements`** - AI-generated content storage
   - Types: summary, glossary, headings, tweet-thread
   - JSONB content field for flexible structure
   - Unique per (document_id, type, subtype)

5. **`chat_threads`** and **`chat_messages`** - Conversation management
   - Threads link to documents and AI models
   - Messages have sequential numbering
   - Supports user/assistant/system roles

6. **`profiles`** - User preferences (future expansion)
   - Placeholder for multi-user support
   - JSONB preferences field

### **Key Features**
- **MODDATETIME triggers**: Automatic updated_at timestamps
- **Foreign key cascades**: Proper cleanup on deletion
- **Row Level Security**: Enabled with development policies
- **Indexes**: Optimised for common queries and full-text search

## Command-Line Access

### **Connect to Local Database**

```bash
# Start Supabase first
npx supabase start

# Connect via psql (custom port 54342)
psql postgres://postgres:postgres@localhost:54342/postgres

# Alternative: use Supabase CLI
npx supabase db shell
```

### **TypeScript Integration**

The project includes generated TypeScript types for database operations:

```bash
# Generate/update types from current schema
npm run db:types

# Reset database and regenerate types
npm run db:reset
```

**Type Safety**: All database queries use generated types from `lib/types/database.ts`, providing compile-time validation and autocomplete for table schemas, column types, and relationships.

### **Useful Commands**

```bash
# Configure psql for better experience
\pset pager off        # Disable pager to avoid getting stuck in shell
\x auto               # Auto-format wide results

# View schema
\dt                    # List tables
\d+ documents         # Describe table structure

# Check migrations
SELECT * FROM supabase_migrations.schema_migrations;

# Sample queries
SELECT COUNT(*) FROM documents;
SELECT title, source_url FROM documents LIMIT 5;
```

### **Database URLs**

| Service | URL | Usage |
|---------|-----|-------|
| **Database** | `postgres://postgres:postgres@localhost:54342/postgres` | psql, SQL clients |
| **API** | `http://localhost:54341` | REST API calls |
| **Studio** | `http://localhost:54343` | Web UI for browsing data |

## Data Flow

### **Current Implementation**
```
HTML Document
    ↓ (Store as single row)
documents table (with full HTML/plaintext)
    ↓ (AI processing via API routes)
ai_calls table (token tracking)
    ↓ (Store results)
document_enhancements table (JSONB content)
    ↓ (Real-time updates)
UI components with live enhancements
```

### **Service Layer Architecture**
```typescript
// Database services provide clean API
DocumentService     → documents table
AiCallService      → ai_calls table
EnhancementService → document_enhancements table
ChatService        → chat_threads/messages tables

// Real-time subscriptions
subscribeToDocumentEnhancements()
subscribeToDocuments()
subscribeToChatMessages()
```

## Security Summary

**Current Status**: Development mode
- **RLS enabled** but with permissive policies for anonymous access
- **Future**: User-scoped policies when authentication is added

## Development Workflow

### **Type-Safe Database Operations**

1. **Make schema changes**: Create migrations using `npx supabase migration new feature_name`
2. **Apply and generate types**: Run `npm run db:reset` to apply migrations and update TypeScript types
3. **Use generated types**: Import and use types from `lib/types/database.ts` in your code
4. **Commit both**: Include migration files and updated types in git commits

### **Available Helper Types**

The generated types include convenient helper types:

```typescript
import type { Document, DocumentInsert, AiCall, EnhancementType } from '@/lib/types/database'

// Use for database queries, inserts, and type-safe operations
const doc: Document = await supabase.from('documents').select('*').single()
```

## Database Services

### **Error Handling**

The database service layer propagates errors instead of silently failing to improve debugging:
- Methods throw descriptive errors with context
- "Not found" cases (error code PGRST116) return null instead of throwing
- Invalid UUIDs are validated before database calls
- No more `console.error` + `return null` patterns

### **Available Services**

The codebase provides type-safe database services in `lib/services/database/`:

```typescript
import { DocumentService, AiCallService, EnhancementService, ChatService } from '@/lib/services/database'

// Example usage
const documentService = new DocumentService(supabase)
const doc = await documentService.create({
  title: 'My Document',
  html_content: '<p>Content</p>',
  plaintext_content: 'Content'
})

// Track AI usage
const aiCallService = new AiCallService(supabase)
const call = await aiCallService.startCall({
  documentId: doc.id,
  modelId: 'model-id',
  promptType: 'summarise',
  promptInput: 'Summarise this...'
})

// Store enhancements
const enhancementService = new EnhancementService(supabase)
await enhancementService.storeSummary(doc.id, call.id, {
  text: 'Document summary',
  keyPoints: ['Point 1', 'Point 2']
})
```

### **Real-time Subscriptions**

Enable live updates in your components:

```typescript
import { subscribeToDocumentEnhancements } from '@/lib/supabase/realtime'

// Subscribe to enhancement updates
const subscription = subscribeToDocumentEnhancements(
  supabase,
  documentId,
  (payload) => {
    console.log('Enhancement updated:', payload)
  }
)

// Clean up when done
subscription.unsubscribe()
```

## Migration History

**January 2025**: Completed migration from decomposed element storage to single-row document storage with separate enhancements table. Added comprehensive tracking for AI usage, chat conversations, and real-time updates.

see `planning/250531a_database_storage_implementation.md` for implementation details